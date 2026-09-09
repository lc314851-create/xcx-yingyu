// pages/words/words.ts
import { WordItem } from '../../data/types';
import {
  getCurrentBookId,
  getAllProgress,
  recordWordProgress,
  recordStudy,
  getBookProgressStats,
  getStats,
  syncStatsToCloud,
  hasSelectedBook,
  getStudyMode,
  setStudyMode,
  getBatchSize,
  setBatchSize,
  getPracticeMode,
  setPracticeMode,
  getOrderMode,
  setOrderMode,
  getTodayLearnedWords,
  getAccent,
  setAccent,
  addToWrongBook
} from '../../utils/store';
import type { PracticeMode, ConcretePracticeMode, Accent, StudyMode } from '../../utils/store';
import { toConcreteMode } from '../../utils/store';
import { getBookById } from '../../utils/wordService';
import { wordBooks as localBooks } from '../../data/index';
import { playAudio, preloadAudio } from '../../utils/audio';
import { reportWord, isWordReported, ReportType } from '../../utils/wordReport';
import { collectTodayRows, showExportSheet, TodayRow } from '../../utils/todayExport';

// 复习模式一次性入口标志（首页“待复习”点击时写入，words 页 onShow 消费）
const REVIEW_MODE_KEY = 'bc_review_mode';

// 记忆体检高危词一轮式入口标志（memory 页「立即复习这些词」写入，words 页 onShow 消费）
// 值：{ bookId: string, words: string[] }，与本词书匹配才生效
const MEMORY_WORDS_KEY = 'bc_memory_words';
// 首页“学新词”入口标志（一次性）：强制开新一轮，不走“数据未变跳过重建”守卫
const NEW_ROUND_KEY = 'bc_new_round';

// “今日复盘”入口标志（一次性）：本轮只复盘今天学过的词（我的页/首页写入）
const TODAY_REVIEW_KEY = 'bc_today_review';

// 四选一选项接口
interface ChoiceOption {
  meaning: string;
  isCorrect: boolean;
}

Page({
  data: {
    // 当前词书信息
    bookName: '初中词汇',
    bookTotal: 0,
    // 本轮单词队列
    queue: [] as WordItem[],
    currentIndex: 0,
    // 是否显示释义（卡片模式用）
    showMeaning: false,
    // 本轮学习进度
    knownCount: 0,
    unknownCount: 0,
    totalCount: 0,
    // 待复习数
    dueCount: 0,
    masteredCount: 0,
    // 状态标签
    statusLabel: '新词',
    // 是否还有更多
    hasMore: true,
    // 加载状态
    loading: true,
    // 学习范围筛选（全部/高频/虚词/实词）
    studyMode: 'all' as StudyMode,
    // 每轮学习单词数（顶部按钮可调）
    batchSize: 10,
    // 高频词数量
    highFreqCount: 0,
    // 虚词/实词数量
    funcCount: 0,
    contentCount: 0,
    // 学习范围标签（wxml 展示）
    wordClassLabel: '全部',
    currentBookId: 'junior',
    // reminderSubscribed: false, // 学习提醒已下线（2026-08-31）
    // ─── 阶段一新增 ───
    // 练习模式：卡片翻面 / 四选一 / 拼写 / 混合（mix）
    practiceMode: 'card' as PracticeMode,
    // 当前词实际渲染的出题方式（mix 模式下每个词随机，其余与 practiceMode 一致）
    activeMode: 'card' as ConcretePracticeMode,
    // 四选一选项
    choiceOptions: [] as ChoiceOption[],
    // 四选一是否已选
    choiceSelected: -1,
    // 四选一是否答对
    choiceCorrect: false,
    // 拼写模式输入值
    spellInput: '',
    // 拼写反馈状态：none / correct / wrong
    spellFeedback: 'none',
    // 发音口音偏好
    accent: 'us' as Accent,
    // 结果页
    showResult: false,
    resultRate: 0,
    resultPraise: '',
    // 翻面动画状态
    isFlipped: false,
    // 卡片模式「不认识」揭示答案状态（true 时展示「下一个」按钮并锁定翻面）
    revealAfterUnknown: false,
    // 上一题对错（用于结果页判断是否记录）
    _wordBookWords: [] as WordItem[],
    // 快速模式：标记为不认识的词（word → true），未标记默认认识
    quickUnknown: {} as Record<string, boolean>,
    // 快速模式阶段开关：true=快速学习（列表浏览），false=检测阶段（四选一模式）
    quickLearning: false,
    // 出题顺序：随机 / 顺序
    orderMode: 'random' as 'random' | 'sequential',
    // ─── 出题模式下拉框 ───
    modeLabels: ['卡片', '选择', '拼写', '混合', '快速'] as string[],
    modeIndex: 0,
    // ─── 自定义选择弹框 ───
    showSheet: false,
    sheetTitle: '',
    sheetOptions: [] as Array<{ label: string; active: boolean }>,
    sheetType: '' as string,
    // ─── 纠错上报 ───
    showReport: false,
    reportType: '' as ReportType | '',
    reportDesc: '',
    reportedMap: {} as Record<string, boolean> // 已上报词（word → true）
  },

  onLoad() {},

  // 本轮已作答的下标集合（修复切模式后同一词重复计数的 bug）
  _answeredSet: new Set<number>() as Set<number>,

  onShow() {
    // 从分享海报页返回：保留当前一轮结果，不重新加载新的一轮
    if (this._skipInitOnShow) {
      this._skipInitOnShow = false;
      if (this._restoreResultOnShow) {
        this.setData({ showResult: true });
      }
      this._restoreResultOnShow = false;
      return;
    }
    // 消费首页“待复习”入口标志：本轮仅复习到期待复习词（一次性）
    if (wx.getStorageSync(REVIEW_MODE_KEY) === 1) {
      wx.removeStorageSync(REVIEW_MODE_KEY);
      this._reviewMode = true;
    } else {
      this._reviewMode = false;
    }
    // 消费记忆体检入口标志：本轮只复习体检清单里的高危词（一次性，跨词书丢弃）
    const memFlag = wx.getStorageSync(MEMORY_WORDS_KEY) as { bookId: string; words: string[] } | '';
    wx.removeStorageSync(MEMORY_WORDS_KEY);
    if (
      memFlag && typeof memFlag === 'object' &&
      memFlag.bookId === getCurrentBookId() &&
      Array.isArray(memFlag.words) && memFlag.words.length > 0
    ) {
      this._memoryWords = memFlag.words;
    } else {
      this._memoryWords = null;
    }
    // 首页主动点“学新词”：强制开新一轮（清掉重建守卫的 key）
    if (wx.getStorageSync(NEW_ROUND_KEY) === 1) {
      wx.removeStorageSync(NEW_ROUND_KEY);
      this._loadedKey = '';
    }

    // 消费“今日复盘”入口标志：本轮只复盘今天学过的词（一次性）
    if (wx.getStorageSync(TODAY_REVIEW_KEY) === 1) {
      wx.removeStorageSync(TODAY_REVIEW_KEY);
      this._todayReviewMode = true;
      this._loadedKey = '';
    } else {
      this._todayReviewMode = false;
    }

    // 首次使用：跳转词书选择页
    if (!hasSelectedBook()) {
      wx.navigateTo({ url: '/pages/booklist/booklist' });
      return;
    }
    this.setData({
      currentBookId: getCurrentBookId(),
      practiceMode: getPracticeMode(),
      modeIndex: ['card', 'choice', 'spell', 'mix', 'quick'].indexOf(getPracticeMode()),
      accent: getAccent(),
      orderMode: getOrderMode()
      // reminderSubscribed: isReminderSubscribed() // 学习提醒已下线（2026-08-31）
    });
    this.initBatch();
  },

  onUnload() {
    // 页面卸载时清理音频上下文（如果有）
    this._clearRevealTimer();
  },

  async initBatch() {
    // 今日复盘轮：队列 = 今天学过的词（跨词书），不走常规排程
    if (this._todayReviewMode) {
      this._todayReviewMode = false;
      const ok = await this._initTodayBatch();
      if (!ok) await this._initNormalBatch();
      return;
    }
    return this._initNormalBatch();
  },

  // 今日复盘轮：把今天学过的词重刷一遍（不认识的排前面）
  async _initTodayBatch(): Promise<boolean> {
    const todays = getTodayLearnedWords();
    if (todays.length === 0) {
      wx.showToast({ title: '今天还没有学习记录，先学几个词吧', icon: 'none' });
      return false;
    }
    // 按 bookId 分组拉词书，映射回完整词条（拿释义/音标/词根）
    const byBook = new Map<string, string[]>();
    for (const t of todays) {
      const arr = byBook.get(t.bookId) || [];
      arr.push(t.word);
      byBook.set(t.bookId, arr);
    }
    const queue: WordItem[] = [];
    const allWords: WordItem[] = [];
    const unknownSet = new Set(
      todays.filter(t => !t.known).map(t => t.word.toLowerCase())
    );
    for (const [bid, words] of byBook) {
      try {
        const book = await getBookById(bid);
        if (!book) continue;
        allWords.push(...book.words);
        const wset = new Set(words.map(w => w.toLowerCase()));
        for (const w of book.words) {
          if (wset.has(w.word.toLowerCase())) queue.push(w);
        }
      } catch (e) {
        console.error('[今日复盘] 词书加载失败', bid, e);
      }
    }
    if (queue.length === 0) return false;
    // 不认识的排前面，答漏的优先补
    queue.sort((a, b) =>
      (unknownSet.has(b.word.toLowerCase()) ? 1 : 0) - (unknownSet.has(a.word.toLowerCase()) ? 1 : 0)
    );

    this._clearRevealTimer();
    this._answeredSet = new Set<number>();
    this._newWordSet = new Set<string>(); // 复盘不计入累计新词
    const reportedMap: Record<string, boolean> = {};
    for (const w of queue) {
      if (isWordReported(w.word)) reportedMap[w.word] = true;
    }
    const progressStats = getBookProgressStats(getCurrentBookId());
    this.setData({
      bookName: '今日复盘',
      queue,
      _wordBookWords: allWords,
      currentIndex: 0,
      quickLearning: this.data.practiceMode === 'quick',
      showMeaning: false,
      isFlipped: false,
      revealAfterUnknown: false,
      knownCount: 0,
      unknownCount: 0,
      totalCount: queue.length,
      dueCount: progressStats.dueCount,
      masteredCount: progressStats.masteredCount,
      statusLabel: '复盘',
      hasMore: false,
      loading: false,
      showResult: false,
      spellInput: '',
      spellFeedback: 'none',
      choiceSelected: -1,
      quickUnknown: {},
      reportedMap
    }, () => {
      this._applyModeForCurrent();
    });
    return true;
  },

  async _initNormalBatch() {
    const bookId = getCurrentBookId();
    const studyMode = getStudyMode();
    const practiceMode = getPracticeMode();
    const accent = getAccent();
    const batchSize = getBatchSize();

    // 页面已有数据且词书/设置都没变时，跳过重建，避免 onShow 重复进入时整页闪一次"重新加载"
    const orderMode = getOrderMode();
    const wordClassLabels: Record<string, string> = { all: '全部', highFreq: '高频词', func: '虚词', content: '实词' };
    const settingsKey = [bookId, studyMode, practiceMode, accent, batchSize, orderMode].join('|');
    if (
      this.data.queue.length > 0 && !this.data.showResult &&
      !this._reviewMode && !this._memoryWords &&
      this._loadedKey === settingsKey
    ) {
      return;
    }
    this._loadedKey = settingsKey;
    this._clearRevealTimer();

    // 页面已有内容（换书/开新轮）：不进 loading 态，保持旧卡片可见，
    // 队列就绪后一次性替换，实现"平稳换轮"无闪动；仅首次进入才显示加载动画
    if (this.data.queue.length === 0) {
      this.setData({ loading: true, studyMode, practiceMode, accent, batchSize, orderMode, wordClassLabel: wordClassLabels[studyMode] || '全部' });
    } else {
      this.setData({ studyMode, practiceMode, accent, batchSize, orderMode, wordClassLabel: wordClassLabels[studyMode] || '全部' });
    }

    let book;
    try {
      book = await getBookById(bookId);
    } catch (e) {
      console.error('获取词书失败', e);
    }

    if (!book || !book.words || book.words.length === 0) {
      // 云端拉取失败，尝试本地种子词库兜底
      const localBook = localBooks.find(b => b.id === bookId);
      if (localBook && localBook.words.length > 0) {
        book = localBook;
      } else {
        this.setData({ loading: false, queue: [] });
        wx.showToast({ title: '词库加载中，马上就好', icon: 'none' });
        return;
      }
    }

    // 复习/记忆体检模式绕过词性筛选：待复习的词不该被“范围:虚词”等过滤掉，
    // 否则计划里 43 个待复习词 ∩ 虚词 = 0 时会出现“词书已全部掌握”的假象
    const bypassFilter = this._reviewMode || !!this._memoryWords;

    // 根据学习范围筛选（全部/高频/虚词/实词）
    const highFreqCount = book.words.filter(w => w.isHighFreq).length;
    const funcCount = book.words.filter(w => w.posTag === 'func').length;
    const contentCount = book.words.filter(w => w.posTag !== 'func').length;
    let wordList: WordItem[];
    let emptyTip = '';
    if (bypassFilter) {
      wordList = book.words;
    } else if (studyMode === 'highFreq') {
      wordList = book.words.filter(w => w.isHighFreq);
      emptyTip = '这本词书没有标注高频词';
    } else if (studyMode === 'func') {
      wordList = book.words.filter(w => w.posTag === 'func');
      // 词条完全没有 posTag 字段 = 词书数据是旧版（云端未更新/走了种子兜底/缓存未失效）
      if (!book.words.some(w => 'posTag' in w)) {
        emptyTip = '词书数据未包含词性标注，请更新词库后重试';
      } else {
        emptyTip = '这本词书暂无虚词标注';
      }
    } else if (studyMode === 'content') {
      wordList = book.words.filter(w => w.posTag !== 'func');
      if (!book.words.some(w => 'posTag' in w)) {
        emptyTip = '词书数据未包含词性标注，请更新词库后重试';
      } else {
        emptyTip = '这本词书暂无实词标注';
      }
    } else {
      wordList = book.words;
    }

    if (wordList.length === 0) {
      this.setData({ loading: false, queue: [], highFreqCount, funcCount, contentCount });
      wx.showToast({ title: emptyTip, icon: 'none' });
      return;
    }

    const allProgress = getAllProgress(bookId);
    const now = Date.now();

    // 构建学习队列：
    // 1. 优先取待复习的词（nextReview <= now 且不是 mastered）
    // 2. 取未学过的新词
    const dueWords: WordItem[] = [];
    const newWords: WordItem[] = [];

    for (const w of wordList) {
      const p = allProgress[w.word];
      if (!p) {
        newWords.push(w);
      } else if (p.status !== 'mastered' && p.nextReview > 0 && p.nextReview <= now) {
        dueWords.push(w);
      }
    }

    // 考频排序：新词按 ECDICT 词频降序（常见词先学），优先学会考试里出现最多的词
    newWords.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));

    // 合并队列：默认优先复习，再学新词；复习模式下仅复习到期待复习词
    // 随机模式下：新词从词书全部未学词中随机抽取（而不是按词频取前 N 个，
    // 避免连续几轮遇到的都是同一批词），复习词仍优先占位
    let queue;
    if (this._reviewMode) {
      if (dueWords.length === 0) {
        // 没有到期待复习词：切回常规学习，避免空轮
        this._reviewMode = false;
        wx.showToast({ title: '已全部复习完，切回常规学习', icon: 'none' });
        queue = [...dueWords, ...newWords].slice(0, batchSize);
      } else {
        queue = dueWords.slice(0, batchSize);
      }
    } else if (orderMode === 'random') {
      // 复习词同样从全部到期词中随机抽取（而不是按词表顺序取前 N 个）
      const due: WordItem[] = [];
      if (dueWords.length > 0) {
        const pool = [...dueWords];
        const take = Math.min(batchSize, pool.length);
        for (let i = 0; i < take; i++) {
          const j = i + Math.floor(Math.random() * (pool.length - i));
          const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
          due.push(pool[i]);
        }
      }
      const remaining = batchSize - due.length;
      const sampledNew: WordItem[] = [];
      if (remaining > 0 && newWords.length > 0) {
        const pool = [...newWords];
        const take = Math.min(remaining, pool.length);
        for (let i = 0; i < take; i++) {
          const j = i + Math.floor(Math.random() * (pool.length - i));
          const t = pool[i]; pool[i] = pool[j]; pool[j] = t;
          sampledNew.push(pool[i]);
        }
      }
      queue = [...due, ...sampledNew];
    } else {
      queue = [...dueWords, ...newWords].slice(0, batchSize);
    }

    // 如果队列为空（没有待复习也没有新词），取已掌握的词复习
    let finalQueue = queue;
    if (queue.length === 0) {
      const masteredWords = wordList.filter((w) => {
        const p = allProgress[w.word];
        return p && p.status === 'mastered';
      });
      finalQueue = masteredWords.slice(0, batchSize);
    }

    // ─── 记忆体检高危词轮次：覆盖队列为体检清单（保持体检里的危险顺序，最危险在前） ───
    // 用全量词表匹配（不走 studyMode 高频过滤，否则清单词可能全军覆没而静默回退成常规轮次）
    let memActive = false;
    if (this._memoryWords && (this._memoryWords as string[]).length > 0) {
      const memLen = (this._memoryWords as string[]).length;
      const memSet = new Set<string>();
      for (const w of this._memoryWords as string[]) memSet.add(w.toLowerCase());
      const matched = book.words.filter(w => memSet.has(w.word.toLowerCase()));
      if (matched.length > 0) {
        finalQueue = (this._memoryWords as string[])
          .map((w: string) => matched.find((m: WordItem) => m.word.toLowerCase() === w.toLowerCase()))
          .filter((x: WordItem | undefined): x is WordItem => !!x);
        memActive = true;
        if (finalQueue.length < memLen) {
          // 清单里有词不在当前词表（如词库更新过）：如实提示，缺失的不补别的词
          wx.showToast({ title: `清单中 ${memLen - finalQueue.length} 个词不在词书，已跳过`, icon: 'none' });
        }
      } else {
        // 全部匹配不上（极少见）：不静默回退，明确告知
        wx.showToast({ title: '这几个词不在当前词书里，已切回常规学习', icon: 'none' });
      }
      this._memoryWords = null; // 一次性，用后即弃
    }

    // 出题顺序：随机模式打乱队列（复习优先/巩固队列在组内打乱，不改变优先级；
    // 记忆体检轮保持危险顺序不乱序）
    if (orderMode === 'random' && !memActive && finalQueue.length > 1) {
      for (let i = finalQueue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const t = finalQueue[i];
        finalQueue[i] = finalQueue[j];
        finalQueue[j] = t;
      }
    }

    // 记录本轮哪些是首次学习的新词（复习/巩固不计入“累计单词”）
    this._newWordSet = new Set<string>();
    for (const w of finalQueue) {
      if (newWords.indexOf(w) > -1) this._newWordSet.add(w.word.toLowerCase());
    }

    // 已上报词标记（卡片背面显示「已上报」）
    const reportedMap: Record<string, boolean> = {};
    for (const w of finalQueue) {
      if (isWordReported(w.word)) reportedMap[w.word] = true;
    }

    const progressStats = getBookProgressStats(bookId);

    // 新一轮开始，清空已作答标记（修复切模式后同一词重复计数的 bug）
    this._answeredSet = new Set<number>();

    // 状态标签按本轮队列实际构成判定：全部为到期词才是「复习」，
    // 混入新词（复习词优先占位+新词补齐）时标「新词」，避免 1 个复习词+9 个新词误标成复习
    const dueWordSet = new Set(dueWords.map(w => w.word));
    const dueInQueue = finalQueue.filter(w => dueWordSet.has(w.word)).length;
    let statusLabel = '新词';
    if (memActive) {
      statusLabel = '高危词';
    } else if (finalQueue.length > 0 && dueInQueue === finalQueue.length) {
      statusLabel = '复习';
    } else if (dueInQueue === 0 && dueWords.length === 0 && newWords.length === 0 && finalQueue.length > 0) {
      statusLabel = '巩固';
    }

    this.setData({
      bookName: book.name,
      bookTotal: wordList.length,
      highFreqCount,
      funcCount,
      contentCount,
      queue: finalQueue,
      _wordBookWords: wordList,
      currentIndex: 0,
      quickLearning: practiceMode === 'quick',
      showMeaning: false,
      isFlipped: false,
      revealAfterUnknown: false,
      knownCount: 0,
      unknownCount: 0,
      totalCount: finalQueue.length,
      dueCount: progressStats.dueCount,
      masteredCount: progressStats.masteredCount,
      statusLabel,
      hasMore: finalQueue.length >= batchSize,
      loading: false,
      showResult: false,
      spellInput: '',
      spellFeedback: 'none',
      choiceSelected: -1,
      quickUnknown: {},
      reportedMap
    }, () => {
      if (finalQueue.length > 0) {
        this._applyModeForCurrent();
        // 预加载第二个词，翻页时秒出声
        if (finalQueue.length > 1) {
          preloadAudio(finalQueue[1].word, accent);
        }
      }
    });
  },

  // 当前词是否已作答过（防切模式后重复计数）
  _checkAnswered(): boolean {
    if (this._answeredSet.has(this.data.currentIndex)) return true;
    this._answeredSet.add(this.data.currentIndex);
    return false;
  },



  // 切换词书：进入词书选择页（推荐卡 + 考试/教材分组列表）
  changeBook() {
    wx.navigateTo({ url: '/pages/booklist/booklist' });
  },

  // ─── 卡片翻面模式 ───
  // 漫游词族：带着当前词跳转到词根星系
  goGalaxy() {
    const w = this.data.queue[this.data.currentIndex];
    if (!w) return;
    wx.navigateTo({
      url: `/pages/galaxy/galaxy?word=${encodeURIComponent(w.word)}`
    });
  },

  // ─── 纠错上报 ───
  openReport() {
    const w = this.data.queue[this.data.currentIndex];
    if (!w) return;
    this.setData({ showReport: true, reportType: '', reportDesc: '' });
  },

  closeReport() {
    this.setData({ showReport: false });
  },

  onReportType(e: any) {
    this.setData({ reportType: e.currentTarget.dataset.type as ReportType });
  },

  onReportDesc(e: any) {
    this.setData({ reportDesc: e.detail.value });
  },

  submitReport() {
    const w = this.data.queue[this.data.currentIndex];
    if (!w) return;
    if (!this.data.reportType) {
      wx.showToast({ title: '请先选择问题类型', icon: 'none' });
      return;
    }
    const bookId = getCurrentBookId();
    reportWord(w.word, bookId, this.data.reportType as ReportType, this.data.reportDesc).then((r) => {
      if (r.already) {
        wx.showToast({ title: '这个问题已有人报过啦', icon: 'none' });
      } else if (r.ok) {
        const reportedMap = { ...this.data.reportedMap, [w.word]: true };
        this.setData({ showReport: false, reportedMap });
        wx.showToast({ title: '已受理，感谢共建！', icon: 'success' });
      } else {
        wx.showToast({ title: '提交失败，请检查网络', icon: 'none' });
      }
    });
  },

  flipCard() {
    // 「不认识」揭示答案后也允许自由翻面（可翻回正面再看单词），流程由「下一个」按钮推进
    const flipped = !this.data.isFlipped;
    this.setData({
      isFlipped: flipped,
      showMeaning: flipped
    });
    // 翻到背面时自动播放发音，并预加载下一个词
    if (flipped) {
      const word = this.data.queue[this.data.currentIndex];
      const next = this.data.queue[this.data.currentIndex + 1];
      if (word) playAudio(word.word, this.data.accent);
      if (next) preloadAudio(next.word, this.data.accent);
    }
  },

  // ─── 发音 ───
  onPlayAudio() {
    const word = this.data.queue[this.data.currentIndex];
    if (word) playAudio(word.word, this.data.accent);
  },

  // 切换口音
  onToggleAccent() {
    const newAccent: Accent = this.data.accent === 'us' ? 'uk' : 'us';
    setAccent(newAccent);
    this.setData({ accent: newAccent });
    wx.showToast({
      title: newAccent === 'uk' ? '英音模式' : '美音模式',
      icon: 'none'
    });
    // 切换后立即播放当前词
    const word = this.data.queue[this.data.currentIndex];
    if (word) playAudio(word.word, newAccent);
  },

  // ─── 出题方式应用（含混合模式随机映射） ───
  // 为当前词确定实际出题方式并重置答题状态；卡片模式保留翻面延续（释义面朝上切词）
  _applyModeForCurrent() {
    const mode = toConcreteMode(this.data.practiceMode);
    const keepFlip = this.data.isFlipped && this.data.practiceMode === 'card';
    const word = this.data.queue[this.data.currentIndex];
    // 切词补一次真实翻面：先短暂回正面，下一帧再翻回释义面，
    // 消除“换词时卡片像没翻过来”的困惑（保留切词保持释义面的设计）
    this._clearRevealTimer(); // 切模式/切词时取消“不认识自动跳”定时器，防跳词竞态
    const flipBase = keepFlip ? { isFlipped: false, showMeaning: false } : {};
    const flipBack = () => {
      if (!keepFlip) return;
      wx.nextTick(() => {
        this.setData({ isFlipped: true, showMeaning: true });
      });
    };
    // 快速模式：进入学习阶段，恢复队列头指针与计数（同一批词重学重测）
    if (mode === 'quick') {
      this.setData({
        activeMode: 'quick',
        quickLearning: true,
        currentIndex: 0,
        revealAfterUnknown: false,
        spellInput: '',
        spellFeedback: 'none',
        choiceSelected: -1
      });
      return;
    }
    this.setData({
      activeMode: mode,
      quickLearning: false, // 切到非快速模式时退出学习阶段，防止列表残留
      ...flipBase,
      revealAfterUnknown: false,
      spellInput: '',
      spellFeedback: 'none',
      choiceSelected: -1
    }, () => {
      flipBack();
      if (!word) return;
      if (mode === 'choice') {
        this.generateChoiceOptions(word);
      } else if (mode === 'card') {
        playAudio(word.word, this.data.accent);
      }
    });
  },

  // ─── 四选一模式 ───
  // 生成四选一选项（给单词选释义）
  generateChoiceOptions(currentWord: WordItem) {
    const allWords = this.data._wordBookWords;
    if (allWords.length < 4) {
      // 词书词数不够 4 个，无法出干扰项，降级为卡片出题
      this.setData({ activeMode: 'card' });
      return;
    }

    // 从词书随机取 3 个干扰项
    const distractors: WordItem[] = [];
    const used = new Set([currentWord.word]);
    let attempts = 0;
    while (distractors.length < 3 && attempts < 100) {
      const idx = Math.floor(Math.random() * allWords.length);
      const w = allWords[idx];
      if (!used.has(w.word) && w.meaning !== currentWord.meaning) {
        distractors.push(w);
        used.add(w.word);
      }
      attempts++;
    }

    // 组合 + 随机打乱
    const options: ChoiceOption[] = [
      { meaning: currentWord.meaning, isCorrect: true },
      ...distractors.map(d => ({ meaning: d.meaning, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    this.setData({
      choiceOptions: options,
      choiceSelected: -1,
      choiceCorrect: false
    });
  },

  // 四选一：点击选项
  onChoiceSelect(e: any) {
    if (this.data.choiceSelected !== -1) return; // 已选过
    if (this._checkAnswered()) return; // 切模式后同一词不重复计数

    const idx = e.currentTarget.dataset.idx as number;
    const option = this.data.choiceOptions[idx];
    const isCorrect = option.isCorrect;

    this.setData({
      choiceSelected: idx,
      choiceCorrect: isCorrect
    });

    // 播放单词发音
    const word = this.data.queue[this.data.currentIndex];
    if (word) playAudio(word.word, this.data.accent);

    // 记录进度
    const bookId = getCurrentBookId();
    recordWordProgress(bookId, word.word, isCorrect);
    recordStudy(1, this._isNewWord(word.word));
    if (!isCorrect) {
      addToWrongBook(word.word, word.meaning, bookId);
    }

    if (isCorrect) {
      this.setData({ knownCount: this.data.knownCount + 1 });
    } else {
      this.setData({ unknownCount: this.data.unknownCount + 1 });
    }

    // 答对停 1 秒；答错停 2.5 秒，留时间看清正确答案
    setTimeout(() => {
      this.nextWord();
    }, isCorrect ? 1000 : 2500);
  },

  // 四选一：点「不认识」（不猜了，直接揭示正确答案，按答错记录）
  onChoiceDontKnow() {
    if (this.data.choiceSelected !== -1) return; // 已作答/已揭示
    if (this._checkAnswered()) return; // 切模式后同一词不重复计数

    // choiceSelected 置为 -2：不命中任何选项（不标红错误项），但触发正确项高亮
    this.setData({ choiceSelected: -2, choiceCorrect: false });

    const word = this.data.queue[this.data.currentIndex];
    if (word) playAudio(word.word, this.data.accent);

    const bookId = getCurrentBookId();
    recordWordProgress(bookId, word.word, false);
    recordStudy(1, this._isNewWord(word.word));
    addToWrongBook(word.word, word.meaning, bookId);

    this.setData({ unknownCount: this.data.unknownCount + 1 });

    // 不自动跳转：展示正确答案后出「下一个」按钮，给用户时间记住这个词
  },

  // 选择模式「不认识」揭示答案后，点「下一个」继续
  onChoiceNext() {
    if (this.data.choiceSelected !== -2) return; // 仅限「不认识」揭示状态
    this.setData({ choiceSelected: -1 });
    this.nextWord();
  },

  // ─── 拼写模式 ───
  onSpellInput(e: any) {
    this.setData({ spellInput: e.detail.value });
  },

  onSpellSubmit() {
    const input = this.data.spellInput.trim().toLowerCase();
    if (!input) return;

    const word = this.data.queue[this.data.currentIndex];
    if (!word) return;
    if (this._checkAnswered()) return; // 切模式后同一词不重复计数


    const isCorrect = input === word.word.toLowerCase();

    this.setData({
      spellFeedback: isCorrect ? 'correct' : 'wrong'
    });

    // 播放发音
    playAudio(word.word, this.data.accent);

    // 记录进度
    const bookId = getCurrentBookId();
    recordWordProgress(bookId, word.word, isCorrect);
    recordStudy(1, this._isNewWord(word.word));
    if (!isCorrect) {
      addToWrongBook(word.word, word.meaning, bookId);
    }

    if (isCorrect) {
      this.setData({ knownCount: this.data.knownCount + 1 });
    } else {
      this.setData({ unknownCount: this.data.unknownCount + 1 });
    }

    // 拼对停 1.2 秒；拼错停 3 秒，留时间记住正确拼写
    setTimeout(() => {
      this.nextWord();
    }, isCorrect ? 1200 : 3000);
  },

  // ─── 练习模式切换（切换不换词不跳词，当前词按新方式重新出题） ───
  // ─── 自定义选择弹框（模式/范围/每轮个数统一用） ───
  _openSheet(type: string, title: string, options: Array<{ label: string; active: boolean }>) {
    this.setData({ showSheet: true, sheetType: type, sheetTitle: title, sheetOptions: options });
  },

  closeSheet() {
    this.setData({ showSheet: false });
  },

  onSheetSelect(e: any) {
    const idx = e.currentTarget.dataset.index as number;
    const type = e.currentTarget.dataset.type as string;
    this.setData({ showSheet: false });

    if (type === 'mode') {
      const modes: PracticeMode[] = ['card', 'choice', 'spell', 'mix', 'quick'];
      const mode = modes[idx] as PracticeMode;
      if (!mode || mode === this.data.practiceMode) return;
      setPracticeMode(mode);
      // 切到快速：从学习阶段开始（现有队列直接变学习列表）
      if (mode === 'quick') {
        this.setData({
          practiceMode: mode,
          modeIndex: idx,
          activeMode: 'quick', // 学习视图渲染要求 activeMode==='quick'，与答题视图互斥
          quickLearning: true,
          currentIndex: 0,
          knownCount: 0,
          unknownCount: 0,
          revealAfterUnknown: false,
          showMeaning: false,
          isFlipped: false,
          spellInput: '',
          spellFeedback: 'none',
          choiceSelected: -1,
          quickUnknown: {}
        });
        this._answeredSet = new Set<number>();
        this._clearRevealTimer();
        return;
      }
      this.setData({ practiceMode: mode, modeIndex: idx });
      if (this.data.queue.length > 0) {
        this._applyModeForCurrent();
      }
    } else if (type === 'scope') {
      const modes: StudyMode[] = ['all', 'highFreq', 'func', 'content'];
      const newMode = modes[idx];
      if (!newMode || newMode === this.data.studyMode) return;
      setStudyMode(newMode);
      this.setData({ wordClassLabel: this.WORD_CLASS_LABELS[newMode] || '全部' });
      this.initBatch();
    } else if (type === 'batch') {
      const options = [5, 10, 15, 20];
      const n = options[idx];
      if (!n || n === this.data.batchSize) return;
      setBatchSize(n);
      this.setData({ batchSize: n });
      wx.showToast({ title: '每轮 ' + n + ' 个单词', icon: 'none' });
      this.initBatch();
    }
  },

  onModeTap() {
    const modes: PracticeMode[] = ['card', 'choice', 'spell', 'mix', 'quick'];
    this._openSheet(
      'mode',
      '学习模式',
      modes.map((m, i) => ({ label: this.data.modeLabels[i], active: m === this.data.practiceMode }))
    );
  },

  // ─── 快速模式 · 学习阶段 ───
  // 点 × 标记不认识（再点一次取消，恢复默认认识）；点行其它区域发声
  onQuickMark(e: any) {
    const word = e.currentTarget.dataset.word as string;
    if (!word) return;
    playAudio(word, this.data.accent);
    const quickUnknown = { ...this.data.quickUnknown };
    if (quickUnknown[word]) {
      delete quickUnknown[word];
    } else {
      quickUnknown[word] = true;
    }
    this.setData({ quickUnknown });
  },

  // 批量记录本轮标记：未标记默认认识；返回不认识数
  _recordQuickRound(): number {
    const bookId = getCurrentBookId();
    const queue = this.data.queue;
    const unknownSet = this.data.quickUnknown;
    let unknownCount = 0;
    for (const w of queue) {
      const known = !unknownSet[w.word];
      if (!known) {
        unknownCount += 1;
        addToWrongBook(w.word, w.meaning, bookId);
      }
      recordWordProgress(bookId, w.word, known);
      recordStudy(1, this._isNewWord(w.word));
    }
    this.setData({ knownCount: queue.length - unknownCount, unknownCount });
    this.syncToCloud();
    return unknownCount;
  },

  // 继续：批量记录后直接开下一轮（不认识的词复习排程会尽快再安排）
  onNextRound() {
    const unknownCount = this._recordQuickRound();
    wx.showToast({
      title: unknownCount > 0 ? '已记录，不认识的词会尽快再安排' : '全部认识，太棒了！',
      icon: 'none'
    });
    this.initBatch();
  },

  // 完成：批量记录后进结果页（看本轮认识率，可复习本轮/再来一轮）
  onQuickFinish() {
    this._recordQuickRound();
    this.finishRound();
  },

  onPracticeModeChange(e: any) {
    const mode = e.currentTarget.dataset.mode as PracticeMode;
    if (mode === this.data.practiceMode) return;

    setPracticeMode(mode);
    this.setData({ practiceMode: mode });
    if (this.data.queue.length > 0) {
      this._applyModeForCurrent();
    }

    const labels: Record<string, string> = { card: '卡片模式', choice: '选择模式', spell: '拼写模式', mix: '混合模式', quick: '快速学习' };
    wx.showToast({ title: labels[mode] || '', icon: 'none' });
  },

  // 切换出题顺序（随机 / 顺序）
  onToggleOrderMode() {
    const newMode = this.data.orderMode === 'random' ? 'sequential' : 'random';
    setOrderMode(newMode);
    wx.showToast({
      title: newMode === 'random' ? '已切换随机出词' : '已切换顺序出词',
      icon: 'none'
    });
    this.initBatch();
  },

  // 当前词是否为首次学习的新词（仅新词计入“累计单词”）
  _isNewWord(word: string): boolean {
    return !!this._newWordSet && this._newWordSet.has(word.toLowerCase());
  },

  // 设置每轮学习单词数（顶部按钮）
  onChangeBatchSize() {
    const options = [5, 10, 15, 20];
    this._openSheet(
      'batch',
      '每轮个数',
      options.map(n => ({ label: n + ' 个/轮', active: n === this.data.batchSize }))
    );
  },

  // 切换学习范围（全部/高频/虚词/实词）
  WORD_CLASS_LABELS: { all: '全部', highFreq: '高频词', func: '虚词', content: '实词' } as Record<string, string>,

  onSelectWordClass() {
    const modes: StudyMode[] = ['all', 'highFreq', 'func', 'content'];
    this._openSheet(
      'scope',
      '词书范围',
      modes.map(m => ({ label: this.WORD_CLASS_LABELS[m], active: m === this.data.studyMode }))
    );
  },

  // 兼容旧入口
  toggleStudyMode() {
    this.onSelectWordClass();
  },

  // ─── 导出今日单词表 ───
  _todayRows: null as TodayRow[] | null,

  onExportToday() {
    wx.showLoading({ title: '整理单词中...' });
    collectTodayRows().then((rows) => {
      wx.hideLoading();
      this._todayRows = rows;
      showExportSheet(rows, () => this._getExportCanvas());
    }).catch(() => {
      wx.hideLoading();
      wx.showToast({ title: '整理失败，请重试', icon: 'none' });
    });
  },

  _getExportCanvas(): Promise<any> {
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery().in(this)
        .select('#exportCanvas')
        .fields({ node: true })
        .exec((res: any) => {
          if (res && res[0] && res[0].node) resolve(res[0].node);
          else reject(new Error('canvas 未就绪'));
        });
    });
  },

  // ─── 卡片模式认识/不认识 ───
  markKnown() {
    if (this.data.currentIndex >= this.data.queue.length) return;
    if (this._checkAnswered()) return; // 切模式后同一词不重复计数
    const word = this.data.queue[this.data.currentIndex];
    const bookId = getCurrentBookId();
    recordWordProgress(bookId, word.word, true);
    recordStudy(1, this._isNewWord(word.word));

    this.setData({
      knownCount: this.data.knownCount + 1
    });
    this.nextWord();
  },

  markUnknown() {
    if (this.data.currentIndex >= this.data.queue.length) return;
    if (this.data.revealAfterUnknown) return; // 已揭示，等待用户点「下一个」
    if (this._checkAnswered()) return; // 切模式后同一词不重复计数
    const word = this.data.queue[this.data.currentIndex];
    const bookId = getCurrentBookId();
    recordWordProgress(bookId, word.word, false);
    recordStudy(1, this._isNewWord(word.word));
    addToWrongBook(word.word, word.meaning, bookId);

    // 不认识：正面（只看到单词）则翻面看释义；已经在释义面则保持不动，
    // 由用户主动点「下一个」走
    const needFlip = !this.data.isFlipped;
    this.setData({
      unknownCount: this.data.unknownCount + 1,
      revealAfterUnknown: true,
      isFlipped: needFlip ? true : this.data.isFlipped,
      showMeaning: needFlip ? true : this.data.showMeaning
    });
    // 自动播放发音，加深记忆
    playAudio(word.word, this.data.accent);
  },

  _revealTimer: null as any,

  _clearRevealTimer() {
    if (this._revealTimer) {
      clearTimeout(this._revealTimer);
      this._revealTimer = null;
    }
  },

  // ─── 快速模式 · 学习阶段 ───
  // 点单词行：发声（纯浏览，不记数据）
  onListTap(e: any) {
    const word = e.currentTarget.dataset.word as string;
    if (word) playAudio(word, this.data.accent);
  },

  // 「不认识」揭示答案后，点「下一个」继续
  onRevealNext() {
    this._clearRevealTimer();
    this.setData({ revealAfterUnknown: false, isFlipped: false, showMeaning: false });
    this.nextWord();
  },

  nextWord() {
    // 防御：队列异常（空队列/下标越界）时直接重开一轮，避免白屏卡死
    if (!this.data.queue || this.data.queue.length === 0) {
      this.initBatch();
      return;
    }
    const next = this.data.currentIndex + 1;
    if (next >= this.data.queue.length) {
      this.finishRound();
      return;
    }
    this.setData({
      currentIndex: next
    }, () => {
      // 为新词确定出题方式（mix 模式下每个词随机卡片/选择/拼写），并重置答题状态
      this._applyModeForCurrent();
      // 预加载下下个词
      const afterNext = this.data.queue[next + 1];
      if (afterNext) preloadAudio(afterNext.word, this.data.accent);
    });
  },

  finishRound() {
    // 本轮已结束：清掉重建守卫的 key，确保下次进入页面（从首页点“背单词”/切 tab 回来）
    // 不会命中“数据未变跳过重建”而卡在最后一个词（此时 _answeredSet 已满，按钮全无反应）
    this._loadedKey = '';
    const total = this.data.totalCount;
    const known = this.data.knownCount;
    const rate = total > 0 ? Math.round((known / total) * 100) : 0;
    let praise = '继续加油！';
    if (rate >= 90) praise = '太棒了，几乎全部掌握！';
    else if (rate >= 70) praise = '不错哦，继续保持！';
    else if (rate >= 50) praise = '还需多复习几遍';

    // 记住本轮队列，供「复习本轮」原样重刷（不换词）
    this._lastRoundQueue = this.data.queue.slice();

    // 同步学习数据到云端
    this.syncToCloud();

    // 显示全屏结果页
    this.setData({
      showResult: true,
      resultRate: rate,
      resultPraise: praise
      // reminderSubscribed: isReminderSubscribed() // 学习提醒已下线（2026-08-31）
    });
  },

  // 结果页：开启学习提醒（已下线 2026-08-31：一次性订阅需重复授权，体验繁琐）
  // onSubscribeReminder() {
  //   if (isReminderSubscribed()) return;
  //   requestReminderSubscribe().then((accepted) => {
  //     this.setData({ reminderSubscribed: accepted });
  //     if (accepted) {
  //       wx.showToast({ title: '已开启学习提醒', icon: 'success' });
  //     }
  //   });
  // },

  // 结果页：再来一轮
  onResultRestart() {
    this.setData({ showResult: false });
    this.initBatch();
  },

  // 结果页：复习本轮（用刚考完的原队列重刷一遍，不计入累计新词）
  _lastRoundQueue: [] as WordItem[],

  onResultReviewRound() {
    const last = this._lastRoundQueue;
    if (!last || last.length === 0) {
      wx.showToast({ title: '本轮队列已不在，试试再来一轮', icon: 'none' });
      return;
    }
    this._clearRevealTimer();
    this._loadedKey = ''; // 绕过“数据未变跳过重建”守卫
    this._answeredSet = new Set<number>();
    // 复习轮不计入累计新词：清空新词集合（_isNewWord 返回 false）
    this._newWordSet = new Set<string>();
    const reportedMap: Record<string, boolean> = {};
    for (const w of last) {
      if (isWordReported(w.word)) reportedMap[w.word] = true;
    }
    this.setData({
      showResult: false,
      queue: last,
      _wordBookWords: this.data._wordBookWords,
      currentIndex: 0,
      showMeaning: false,
      isFlipped: false,
      revealAfterUnknown: false,
      knownCount: 0,
      unknownCount: 0,
      totalCount: last.length,
      statusLabel: '复习',
      quickLearning: this.data.practiceMode === 'quick',
      quickUnknown: {},
      spellInput: '',
      spellFeedback: 'none',
      choiceSelected: -1,
      reportedMap
    }, () => {
      this._applyModeForCurrent();
    });
  },

  // 结果页：返回
  onResultBack() {
    this.setData({ showResult: false });
    wx.switchTab({ url: '/pages/index/index' });
  },

  // 结果页：分享打卡海报
  onSharePoster() {
    // 记录“从海报页返回时不重开新一轮”，并记住返回后是否要恢复结果页
    this._skipInitOnShow = true;
    this._restoreResultOnShow = this.data.showResult;
    this.setData({ showResult: false });
    wx.navigateTo({
      url: `/pages/poster/poster?rate=${this.data.resultRate}`
    });
  },

  // 同步学习统计到云端（经 syncUser 云函数：服务端合并取较大值，防历史被冲小）
  syncToCloud() {
    syncStatsToCloud(getStats());
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '我在用词根记忆法背单词，一起来！',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '我在用词根记忆法背单词，一起来！'
    };
  },
});
