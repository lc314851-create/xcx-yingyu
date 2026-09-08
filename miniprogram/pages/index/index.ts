// pages/index/index.ts
import { getStats, getCurrentBookId, hasSelectedBook, getBookProgressStats, getReviewPlan, restoreStatsFromCloud, getTodayLearnedWords } from '../../utils/store';
import { getBookById } from '../../utils/wordService';

// 本地种子词库（兑底）
import { wordBooks as localBooks } from '../../data/index';
import { getDailyQuote, Quote } from '../../data/quotes';

Page({
  data: {
    // Hero 问候
    greetingText: '',
    heroTitle: '今天也要加油学英语！',
    heroSub: '与课本同步 · 词根记忆 × 个人遗忘曲线',
    learnedToday: 0,
    streakDays: 0,
    totalWords: 0,
    checkedIn: false,
    currentBookName: '初中词汇',
    currentBookTotal: 0,
    masteredCount: 0,
    knownCount: 0,
    dueCount: 0,
    currentBookId: 'junior',
    // 今日复习计划卡片
    showPlanCard: false,
    // 今日学过词数（今日复盘轻量卡）
    todayWordCount: 0,
    planDueToday: 0,
    planForecast: [] as { label: string; count: number }[],
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
    // 首次使用不再强制跳选书页：先让用户浏览首页，点具体功能时再引导选书
    this.updateGreeting();
    this.setData({
      currentBookId: getCurrentBookId(),
      showPlanCard: hasSelectedBook(),
      todayWordCount: getTodayLearnedWords().length
    });
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
      checkedIn: stats.checkedIn,
      currentBookName: bookName,
      currentBookTotal: bookTotal,
      masteredCount: progressStats.masteredCount,
      knownCount: progressStats.knownCount,
      dueCount: progressStats.dueCount
    });

    // 今日复习计划（SM-2 到期聚合，本地同步计算）
    this.refreshPlan();
  },

  // 刷新首页「今日复习计划」卡片
  refreshPlan() {
    const bookId = getCurrentBookId();
    const plan = getReviewPlan(bookId);
    const forecast = [
      { label: '今天', count: plan.dueToday },
      ...plan.forecast.slice(0, 2) // 明天 / 后天
    ];
    this.setData({
      planDueToday: plan.dueToday,
      planForecast: forecast
    });
  },

  // 计划卡点击：有到期词直接开复习轮，否则去学新词
  onPlanTap() {
    if (!hasSelectedBook()) {
      wx.navigateTo({ url: '/pages/booklist/booklist' });
      return;
    }
    if (this.data.planDueToday > 0) {
      this.goReview();
    } else {
      this.goWords();
    }
  },

  // 今日复盘：本轮只重刷今天学过的词
  goTodayReview() {
    wx.setStorageSync('bc_today_review', 1);
    wx.switchTab({ url: '/pages/words/words' });
  },

  // 查看完整复习计划页
  goPlan() {
    wx.navigateTo({ url: '/pages/plan/plan' });
  },

  // 切换词书：进入词书选择页（当前词书推荐卡 + 考试/教材分组列表）
  changeBook() {
    wx.navigateTo({ url: '/pages/booklist/booklist' });
  },

  goWords() {
    // 未选词书：先引导选书（延迟到用户实际需要时）
    if (!hasSelectedBook()) {
      wx.navigateTo({ url: '/pages/booklist/booklist' });
      return;
    }
    // 主动点“学新词”：通知 words 页开新的一轮（跳过其“数据未变跳过重建”守卫）
    wx.setStorageSync('bc_new_round', 1);
    wx.switchTab({
      url: '/pages/words/words'
    });
  },

  // 直达“待复习”：只复习到期待复习词
  goReview() {
    // 与"今日复习计划"卡片同一数据源（SM-2 到期），避免两套口径打架：
    // 卡片显示 3 个待复习，点进来却说没有词
    const due = this.data.planDueToday || this.data.dueCount;
    if (!due || due <= 0) {
      wx.showToast({ title: '这会儿没有要复习的词，去学新词吧', icon: 'none' });
      return;
    }
    wx.setStorageSync('bc_review_mode', 1);
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

  // 跳转词根星系
  goGalaxy() {
    wx.navigateTo({
      url: '/pages/galaxy/galaxy'
    });
  },

  // 跳转记忆体检
  goMemory() {
    wx.navigateTo({
      url: '/pages/memory/memory'
    });
  },

  // 更多玩法已撤销（2026-08-31 收敛后仅剩 2 项，直接放出到首页宫格）
  // 跳转生词本
  goWrongBook() {
    wx.navigateTo({
      url: '/pages/wrongbook/wrongbook'
    });
  },

  // 跳转词汇量测试
  goVocabTest() {
    wx.navigateTo({
      url: '/pages/vocabtest/vocabtest'
    });
  },

  // 跳转教材同步专区（直达词书页的教材 Tab）
  goTextbook() {
    wx.navigateTo({
      url: '/pages/booklist/booklist?tab=textbook'
    });
  },

  // 跳转金句集（更多金句）
  goQuotes() {
    wx.navigateTo({
      url: '/pages/quotes/quotes'
    });
  },

  // 加载今日金句
  loadQuote() {
    const q = getDailyQuote();
    this.setData({
      quote: q,
      quoteWords: q.words
    });
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '英语补词达人 · 与课本同步的背单词神器',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '英语补词达人 · 与课本同步的背单词神器'
    };
  },
});
