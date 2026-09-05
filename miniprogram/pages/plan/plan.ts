// pages/plan/plan.ts
// 今日复习计划：把 SM-2 间隔记忆排程可视化成用户能看懂的复习安排
import {
  getReviewPlan,
  getCurrentBookId
} from '../../utils/store';
import { getBookById } from '../../utils/wordService';

const REVIEW_MODE_KEY = 'bc_review_mode';

Page({
  data: {
    bookName: '',
    plan: null as any,
    maxBoxCount: 1,
    maxForecast: 1,
    duePreview: [] as any[]
  },

  onLoad() {
    this.refresh();
  },

  onShow() {
    // 从复习页返回后刷新数据（刚复习完，数字应减少）
    this.refresh();
  },

  refresh() {
    const bookId = getCurrentBookId();
    getBookById(bookId).then(book => {
      const plan = getReviewPlan(bookId);
      // 到期词补上释义/音标（进度里只存了单词本身）
      const dict = new Map<string, { meaning: string; phonetic: string }>();
      (book?.words || []).forEach(w => {
        if (!dict.has(w.word)) {
          dict.set(w.word, { meaning: w.meaning, phonetic: w.phonetic });
        }
      });
      const duePreview = plan.dueList.slice(0, 20).map(item => ({
        ...item,
        meaning: dict.get(item.word)?.meaning || '',
        phonetic: dict.get(item.word)?.phonetic || '',
        lastSeenText: item.lastSeen > 0 ? this.formatDate(item.lastSeen) : ''
      }));

      const maxBoxCount = Math.max(1, ...plan.boxDist.map(b => b.count));
      const maxForecast = Math.max(1, ...plan.forecast.map(f => f.count));

      this.setData({
        bookName: book?.name || '当前词书',
        plan,
        maxBoxCount,
        maxForecast,
        duePreview
      });
    });
  },

  formatDate(ts: number): string {
    const d = new Date(ts);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  },

  startReview() {
    if (!this.data.plan || this.data.plan.dueToday <= 0) {
      wx.showToast({ title: '今天的复习都完成啦，去学点新词吧', icon: 'none' });
      return;
    }
    wx.setStorageSync(REVIEW_MODE_KEY, 1);
    // words 是 tabBar 页面，只能用 switchTab 跳转
    wx.switchTab({ url: '/pages/words/words' });
  },

  goWordList() {
    // 与首页「学新词」一致：写入新轮标志，让 words 页强制重建队列，
    // 否则会被其「设置未变跳过重建」守卫拦住，仍显示上一轮的复习词
    wx.setStorageSync('bc_new_round', 1);
    wx.switchTab({ url: '/pages/words/words' });
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '我的今日复习计划 · 按遗忘曲线科学背词',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '我的今日复习计划 · 按遗忘曲线科学背词'
    };
  },
});
