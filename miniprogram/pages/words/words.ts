// pages/words/words.ts
import { WordItem } from '../../data/types';
import {
  getCurrentBookId,
  setCurrentBookId,
  getAllProgress,
  recordWordProgress,
  recordStudy,
  getBookProgressStats,
  getStats,
  hasSelectedBook,
  getStudyMode,
  setStudyMode,
  getPracticeMode,
  setPracticeMode,
  getAccent,
  setAccent,
  addToWrongBook,
  isReminderSubscribed,
  requestReminderSubscribe
} from '../../utils/store';
import type { PracticeMode, Accent } from '../../utils/store';
import { getBookById, clearWordCache } from '../../utils/wordService';
import { wordBooks as localBooks } from '../../data/index';
import { playAudio } from '../../utils/audio';

// 每轮学习单词数量
const BATCH_SIZE = 10;

// 词书元数据（本地兜底）
const FALLBACK_BOOKS = [
  { id: 'junior', name: '初中词汇' },
  { id: 'senior', name: '高中词汇' },
  { id: 'cet4', name: '四级词汇' },
  { id: 'cet6', name: '六级词汇' },
  { id: 'postgrad', name: '考研词汇' },
  { id: 'ielts', name: '雅思词汇' },
  { id: 'toefl', name: '托福词汇' },
  { id: 'gre', name: 'GRE词汇' }
];

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
    // 高频词数量
    highFreqCount: 0,
    // 词书选择弹窗
    showBookPicker: false,
    pickerBooks: FALLBACK_BOOKS,
    currentBookId: 'junior',
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
    _wordBookWords: [] as WordItem[]
  },

  onLoad() {
    this.initBatch();
  },

  onShow() {
    // 首次使用：跳转词书选择页
    if (!hasSelectedBook()) {
      wx.navigateTo({ url: '/pages/booklist/booklist' });
      return;
    }
    this.setData({
      currentBookId: getCurrentBookId(),
      practiceMode: getPracticeMode(),
      accent: getAccent()
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
    this.setData({ loading: true, studyMode, practiceMode, accent });

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
        wx.showToast({ title: '词库加载中，请稍后', icon: 'none' });
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
      wx.showToast({ title: '该词书暂无高频词', icon: 'none' });
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

    // 合并队列：优先复习，再学新词
    const queue = [...dueWords, ...newWords].slice(0, BATCH_SIZE);

    // 如果队列为空（没有待复习也没有新词），取已掌握的词复习
    let finalQueue = queue;
    if (queue.length === 0) {
      const masteredWords = wordList.filter((w) => {
        const p = allProgress[w.word];
        return p && p.status === 'mastered';
      });
      finalQueue = masteredWords.slice(0, BATCH_SIZE);
    }

    const progressStats = getBookProgressStats(bookId);

    let statusLabel = '新词';
    if (dueWords.length > 0 && queue.length > 0) {
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
      hasMore: finalQueue.length >= BATCH_SIZE,
      loading: false,
      showResult: false,
      spellInput: '',
      spellFeedback: 'none',
      choiceSelected: -1
    }, () => {
      // 如果是四选一模式，生成第一题的选项
      if (finalQueue.length > 0 && practiceMode === 'choice') {
        this.generateChoiceOptions(finalQueue[0]);
      }
      // 如果是卡片模式，自动播放第一个词的发音
      if (finalQueue.length > 0 && practiceMode === 'card') {
        playAudio(finalQueue[0].word, accent);
      }
    });
  },

  // 弹出词书选择弹窗
  showBookPicker() {
    this.setData({
      showBookPicker: true,
      pickerBooks: FALLBACK_BOOKS,
      currentBookId: getCurrentBookId()
    });
  },

  // 关闭词书选择弹窗
  closeBookPicker() {
    this.setData({ showBookPicker: false });
  },

  // 选择词书
  onSelectBook(e: any) {
    const id = e.currentTarget.dataset.id as string;
    const name = e.currentTarget.dataset.name as string;
    setCurrentBookId(id);
    clearWordCache();
    this.setData({ showBookPicker: false, currentBookId: id, bookName: name });
    this.initBatch();
    wx.showToast({ title: `已切换到${name}`, icon: 'success' });
  },

  // 切换词书（跳转到词书选择页）
  changeBook() {
    wx.navigateTo({
      url: '/pages/booklist/booklist'
    });
  },

  // ─── 卡片翻面模式 ───
  flipCard() {
    const flipped = !this.data.isFlipped;
    this.setData({
      isFlipped: flipped,
      showMeaning: flipped
    });
    // 翻到背面时自动播放发音
    if (flipped) {
      const word = this.data.queue[this.data.currentIndex];
      if (word) playAudio(word.word, this.data.accent);
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
    recordStudy(1);
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
    recordStudy(1);
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
    recordStudy(1);

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
    recordStudy(1);
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
    });

    // 学完引导订阅学习提醒（仅第一次）
    if (!isReminderSubscribed()) {
      setTimeout(() => {
        requestReminderSubscribe().then((accepted) => {
          if (accepted) {
            wx.showToast({ title: '已开启学习提醒', icon: 'success' });
          }
        });
      }, 1500);
    }
  },

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
    this.setData({ showResult: false });
    wx.navigateTo({
      url: `/pages/poster/poster?rate=${this.data.resultRate}`
    });
  },

  // 同步学习统计到云端
  syncToCloud() {
    const app = getApp() as any;
    const openid = app.globalData.openid;
    if (!openid || !wx.cloud) return;

    const db = wx.cloud.database();
    const stats = getStats();
    db.collection('users')
      .where({ _openid: openid })
      .get()
      .then((res: any) => {
        if (res.data && res.data.length > 0) {
          db.collection('users')
            .doc(res.data[0]._id)
            .update({
              data: { stats, updateTime: db.serverDate() }
            });
        } else {
          db.collection('users').add({
            data: { stats, createTime: db.serverDate() }
          });
        }
      })
      .catch(() => {});
  }
});
