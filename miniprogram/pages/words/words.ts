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
  getAccent,
  setAccent,
  addToWrongBook
} from '../../utils/store';
import type { PracticeMode, Accent } from '../../utils/store';
import { getBookById } from '../../utils/wordService';
import { wordBooks as localBooks } from '../../data/index';
import { playAudio, preloadAudio } from '../../utils/audio';
import { reportWord, isWordReported, ReportType } from '../../utils/wordReport';

// 复习模式一次性入口标志（首页“待复习”点击时写入，words 页 onShow 消费）
const REVIEW_MODE_KEY = 'bc_review_mode';

// 记忆体检高危词一轮式入口标志（memory 页「立即复习这些词」写入，words 页 onShow 消费）
// 值：{ bookId: string, words: string[] }，与本词书匹配才生效
const MEMORY_WORDS_KEY = 'bc_memory_words';

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
    // 学习模式（高频词/完整）
    studyMode: 'all' as 'highFreq' | 'all',
    // 每轮学习单词数（顶部按钮可调）
    batchSize: 10,
    // 高频词数量
    highFreqCount: 0,
    currentBookId: 'junior',
    // reminderSubscribed: false, // 学习提醒已下线（2026-08-31）
    // ─── 阶段一新增 ───
    // 练习模式：卡片翻面 / 四选一 / 拼写
    practiceMode: 'card' as PracticeMode,
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
    // 上一题对错（用于结果页判断是否记录）
    _wordBookWords: [] as WordItem[],
    // ─── 纠错上报 ───
    showReport: false,
    reportType: '' as ReportType | '',
    reportDesc: '',
    reportedMap: {} as Record<string, boolean> // 已上报词（word → true）
  },

  onLoad() {},

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
    // 首次使用：跳转词书选择页
    if (!hasSelectedBook()) {
      wx.navigateTo({ url: '/pages/booklist/booklist' });
      return;
    }
    this.setData({
      currentBookId: getCurrentBookId(),
      practiceMode: getPracticeMode(),
      accent: getAccent()
      // reminderSubscribed: isReminderSubscribed() // 学习提醒已下线（2026-08-31）
    });
    this.initBatch();
  },

  onUnload() {
    // 页面卸载时清理音频上下文（如果有）
  },

  async initBatch() {
    const bookId = getCurrentBookId();
    const studyMode = getStudyMode();
    const practiceMode = getPracticeMode();
    const accent = getAccent();
    const batchSize = getBatchSize();
    this.setData({ loading: true, studyMode, practiceMode, accent, batchSize });

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

    // 根据学习模式过滤
    const highFreqCount = book.words.filter(w => w.isHighFreq).length;
    const wordList = studyMode === 'highFreq'
      ? book.words.filter(w => w.isHighFreq)
      : book.words;

    if (wordList.length === 0) {
      this.setData({ loading: false, queue: [], highFreqCount });
      wx.showToast({ title: '这本词书没有标注高频词', icon: 'none' });
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

    let statusLabel = '新词';
    if (memActive) {
      statusLabel = '高危词';
    } else if (dueWords.length > 0 && queue.length > 0) {
      statusLabel = '复习';
    } else if (finalQueue.length > 0 && queue.length === 0) {
      statusLabel = '巩固';
    }

    this.setData({
      bookName: book.name,
      bookTotal: wordList.length,
      highFreqCount,
      queue: finalQueue,
      _wordBookWords: wordList,
      currentIndex: 0,
      showMeaning: false,
      isFlipped: false,
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
      reportedMap
    }, () => {
      // 如果是四选一模式，生成第一题的选项
      if (finalQueue.length > 0 && practiceMode === 'choice') {
        this.generateChoiceOptions(finalQueue[0]);
      }
      // 如果是卡片模式，自动播放第一个词的发音
      if (finalQueue.length > 0 && practiceMode === 'card') {
        playAudio(finalQueue[0].word, accent);
      }
      // 预加载第二个词，翻页时秒出声
      if (finalQueue.length > 1) {
        preloadAudio(finalQueue[1].word, accent);
      }
    });
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

  // ─── 四选一模式 ───
  // 生成四选一选项（给单词选释义）
  generateChoiceOptions(currentWord: WordItem) {
    const allWords = this.data._wordBookWords;
    if (allWords.length < 4) {
      // 词书词数不够 4 个，无法出干扰项，降级为卡片模式
      this.setData({ practiceMode: 'card' });
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

    // 延迟 1 秒进入下一题
    setTimeout(() => {
      this.nextWord();
    }, 1000);
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

    // 延迟 1.2 秒进入下一题
    setTimeout(() => {
      this.nextWord();
    }, 1200);
  },

  // ─── 练习模式切换 ───
  onPracticeModeChange(e: any) {
    const mode = e.currentTarget.dataset.mode as PracticeMode;
    if (mode === this.data.practiceMode) return;

    setPracticeMode(mode);
    this.setData({
      practiceMode: mode,
      isFlipped: false,
      showMeaning: false,
      spellInput: '',
      spellFeedback: 'none',
      choiceSelected: -1
    });

    // 如果切换到四选一，生成当前词的选项
    if (mode === 'choice' && this.data.queue.length > 0) {
      this.generateChoiceOptions(this.data.queue[this.data.currentIndex]);
    }

    const labels: Record<string, string> = { card: '卡片模式', choice: '选择模式', spell: '拼写模式' };
    wx.showToast({ title: labels[mode] || '', icon: 'none' });
  },

  // 当前词是否为首次学习的新词（仅新词计入“累计单词”）
  _isNewWord(word: string): boolean {
    return !!this._newWordSet && this._newWordSet.has(word.toLowerCase());
  },

  // 设置每轮学习单词数（顶部按钮）
  onChangeBatchSize() {
    const options = [5, 10, 15, 20];
    wx.showActionSheet({
      itemList: options.map(n => n + ' 个/轮'),
      success: (res: any) => {
        const n = options[res.tapIndex];
        if (!n || n === this.data.batchSize) return;
        setBatchSize(n);
        wx.showToast({ title: '每轮 ' + n + ' 个单词', icon: 'none' });
        this.initBatch();
      }
    });
  },

  // 切换学习模式（高频词/完整）
  toggleStudyMode() {
    const newMode = this.data.studyMode === 'highFreq' ? 'all' : 'highFreq';
    setStudyMode(newMode);
    wx.showToast({
      title: newMode === 'highFreq' ? '已切换高频词模式' : '已切换完整模式',
      icon: 'none'
    });
    this.initBatch();
  },

  // ─── 卡片模式认识/不认识 ───
  markKnown() {
    if (this.data.currentIndex >= this.data.queue.length) return;
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
    const word = this.data.queue[this.data.currentIndex];
    const bookId = getCurrentBookId();
    recordWordProgress(bookId, word.word, false);
    recordStudy(1, this._isNewWord(word.word));
    addToWrongBook(word.word, word.meaning, bookId);

    this.setData({
      unknownCount: this.data.unknownCount + 1
    });
    this.nextWord();
  },

  nextWord() {
    const next = this.data.currentIndex + 1;
    if (next >= this.data.queue.length) {
      this.finishRound();
      return;
    }
    this.setData({
      currentIndex: next,
      isFlipped: false,
      showMeaning: false,
      spellInput: '',
      spellFeedback: 'none',
      choiceSelected: -1
    }, () => {
      // 四选一模式：生成下一题选项
      if (this.data.practiceMode === 'choice') {
        this.generateChoiceOptions(this.data.queue[next]);
      }
      // 卡片模式：自动播放发音
      if (this.data.practiceMode === 'card') {
        playAudio(this.data.queue[next].word, this.data.accent);
      }
      // 预加载下下个词
      const afterNext = this.data.queue[next + 1];
      if (afterNext) preloadAudio(afterNext.word, this.data.accent);
    });
  },

  finishRound() {
    const total = this.data.totalCount;
    const known = this.data.knownCount;
    const rate = total > 0 ? Math.round((known / total) * 100) : 0;
    let praise = '继续加油！';
    if (rate >= 90) praise = '太棒了，几乎全部掌握！';
    else if (rate >= 70) praise = '不错哦，继续保持！';
    else if (rate >= 50) praise = '还需多复习几遍';

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
      path: '/pages/words/words'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '我在用词根记忆法背单词，一起来！'
    };
  },
});
