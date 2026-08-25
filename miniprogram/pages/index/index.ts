// pages/index/index.ts
import { getStats, getCurrentBookId, hasSelectedBook, setCurrentBookId, getBookProgressStats, restoreStatsFromCloud } from '../../utils/store';
import { getBookById, clearWordCache } from '../../utils/wordService';

// 本地种子词库（兑底）
import { wordBooks as localBooks } from '../../data/index';
import { getDailyQuote, Quote } from '../../data/quotes';

// 词书元数据（本地兜底，不依赖网络）
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

Page({
  data: {
    // Hero 问候
    greetingText: '',
    heroTitle: '今天也要加油学英语！',
    heroSub: '九层之台，起于垒土',
    learnedToday: 0,
    streakDays: 0,
    totalWords: 0,
    weeklyLearned: 0,
    checkedIn: false,
    currentBookName: '初中词汇',
    currentBookTotal: 0,
    masteredCount: 0,
    knownCount: 0,
    dueCount: 0,
    // 词书选择弹窗
    showBookPicker: false,
    pickerBooks: FALLBACK_BOOKS,
    currentBookId: 'junior',
    // 今日金句
    quote: null as Quote | null,
    quoteWords: [] as string[]
  },

  onLoad() {
    this.updateGreeting();
    this.loadStats();
    this.loadQuote();
  },

  onShow() {
    // 首次使用：跳转词书选择页
    if (!hasSelectedBook()) {
      wx.navigateTo({ url: '/pages/booklist/booklist' });
      return;
    }
    this.updateGreeting();
    this.setData({ currentBookId: getCurrentBookId() });
    this.loadStats();
    this.loadQuote();

    // 本地统计为空（如刚清缓存）：静默从云端恢复历史，避免首页出现 0 的假象
    if (!getStats().totalWords) {
      restoreStatsFromCloud().then(() => this.loadStats());
    }
  },

  // 根据时间更新问候语
  updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    let title = '';
    if (hour < 6) {
      greeting = '夜深了，注意休息';
      title = '坚持学习的人最耀眼';
    } else if (hour < 9) {
      greeting = '早上好';
      title = '新的一天，从单词开始';
    } else if (hour < 12) {
      greeting = '上午好';
      title = '今天也要加油学英语！';
    } else if (hour < 14) {
      greeting = '中午好';
      title = '午间小憩，温故知新';
    } else if (hour < 18) {
      greeting = '下午好';
      title = '继续努力，不要停下';
    } else if (hour < 22) {
      greeting = '晚上好';
      title = '晚间复习，记忆更深';
    } else {
      greeting = '夜深了';
      title = '坚持学习的人最耀眼';
    }
    this.setData({ greetingText: greeting, heroTitle: title });
  },

  async loadStats() {
    const stats = getStats();
    const bookId = getCurrentBookId();

    // 先从本地获取词书名称
    const localBook = localBooks.find(b => b.id === bookId);
    let bookName = localBook?.name || '初中词汇';
    let bookTotal = localBook?.words.length || 0;

    // 异步从云端获取准确数据
    try {
      const book = await getBookById(bookId);
      if (book && book.words.length > 0) {
        bookName = book.name;
        bookTotal = book.words.length;
      }
    } catch (e) {
      console.error('获取词书信息失败', e);
    }

    // 使用统一的统计函数，基于 Leitner box 等级
    const progressStats = getBookProgressStats(bookId);

    this.setData({
      learnedToday: stats.learnedToday,
      streakDays: stats.streakDays,
      totalWords: stats.totalWords,
      weeklyLearned: stats.weeklyLearned,
      checkedIn: stats.checkedIn,
      currentBookName: bookName,
      currentBookTotal: bookTotal,
      masteredCount: progressStats.masteredCount,
      knownCount: progressStats.knownCount,
      dueCount: progressStats.dueCount
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
    this.setData({ showBookPicker: false, currentBookId: id, currentBookName: name });
    this.loadStats();
    wx.showToast({ title: `已切换到${name}`, icon: 'success' });
  },

  // 切换词书（跳转到词书选择页）
  changeBook() {
    wx.navigateTo({
      url: '/pages/booklist/booklist'
    });
  },

  goWords() {
    wx.switchTab({
      url: '/pages/words/words'
    });
  },

  goMine() {
    wx.switchTab({
      url: '/pages/mine/mine'
    });
  },

  // 跳转搜单词
  goSearch() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  // 跳转名言填空
  goFillBlank() {
    wx.navigateTo({
      url: '/pages/fillblank/fillblank'
    });
  },

  // 跳转拼词练习
  goSpelling() {
    wx.navigateTo({
      url: '/pages/spelling/spelling'
    });
  },

  // 跳转挑战模式
  goChallenge() {
    wx.navigateTo({
      url: '/pages/challenge/challenge'
    });
  },

  // 跳转学习排行榜
  goLeaderboard() {
    wx.navigateTo({
      url: '/pages/leaderboard/leaderboard'
    });
  },

  // 跳转词根星系
  goGalaxy() {
    wx.navigateTo({
      url: '/pages/galaxy/galaxy'
    });
  },

  // 跳转情景剧本
  goScene() {
    wx.navigateTo({
      url: '/pages/scene/scene'
    });
  },

  // 跳转记忆体检
  goMemory() {
    wx.navigateTo({
      url: '/pages/memory/memory'
    });
  },

  // 跳转双语阅读
  goStory() {
    wx.navigateTo({
      url: '/pages/story/story'
    });
  },

  // 加载今日金句
  loadQuote() {
    const q = getDailyQuote();
    this.setData({
      quote: q,
      quoteWords: q.words
    });
  }
});
