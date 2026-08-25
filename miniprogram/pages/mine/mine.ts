// pages/mine/mine.ts
import { getStats, doCheckIn, saveStats, mergeStats, pickBestCloudStats, getHeatmapData, isReminderSubscribed, requestReminderSubscribe, todayStr } from '../../utils/store';

interface Badge {
  name: string;
  icon: string;
  desc: string;
  unlocked: boolean;
}

Page({
  data: {
    nickname: '同学',
    avatarUrl: '',
    isLogin: false,
    stats: {
      learnedToday: 0,
      streakDays: 0,
      totalWords: 0,
      weeklyLearned: 0,
      checkedIn: false
    },
    badges: [] as Badge[],
    badgesUnlocked: 0,
    // 热力图
    heatmap: [] as Array<{ date: string; count: number; level: number }>,
    heatmapWeekLabels: [] as string[],
    heatmapTotalDays: 0,
    // 学习提醒
    reminderOn: false
  },

  onLoad() {
    // 检查本地是否已有登录信息
    const app = getApp() as any;
    if (app.globalData.openid) {
      this.setData({ isLogin: true });
      // 尝试从云端拉取用户数据
      this.syncFromCloud();
    }
  },

  onShow() {
    this.loadStats();
  },

  loadStats() {
    const stats = getStats();
    const badges = this.computeBadges(stats);
    const badgesUnlocked = badges.filter(b => b.unlocked).length;
    const heatmap = getHeatmapData(30);
    // 统计有学习的天数
    const heatmapTotalDays = heatmap.filter(d => d.count > 0).length;
    // 周标签（仅取第1天所在周的周一日期文本）
    const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];
    this.setData({
      stats: {
        learnedToday: stats.learnedToday,
        streakDays: stats.streakDays,
        totalWords: stats.totalWords,
        weeklyLearned: stats.weeklyLearned,
        checkedIn: stats.checkedIn
      },
      badges,
      badgesUnlocked,
      heatmap,
      heatmapWeekLabels: weekLabels,
      heatmapTotalDays,
      reminderOn: isReminderSubscribed()
    });
  },

  // 徽章解锁逻辑
  computeBadges(stats: { totalWords: number; streakDays: number; learnedToday: number }): Badge[] {
    const badges: Badge[] = [
      { name: '初次打卡', icon: '🌱', desc: '完成第一次打卡', unlocked: false },
      { name: '坚持3天', icon: '⭐', desc: '连续打卡3天', unlocked: false },
      { name: '坚持7天', icon: '🔥', desc: '连续打卡7天', unlocked: false },
      { name: '坚持30天', icon: '💎', desc: '连续打卡30天', unlocked: false },
      { name: '单词50个', icon: '📚', desc: '累计学习50个单词', unlocked: false },
      { name: '单词200个', icon: '🎓', desc: '累计学习200个单词', unlocked: false },
      { name: '单词500个', icon: '🏆', desc: '累计学习500个单词', unlocked: false },
      { name: '今日达人', icon: '⚡', desc: '今日学习20个单词', unlocked: false }
    ];
    if (stats.streakDays >= 1) badges[0].unlocked = true;
    if (stats.streakDays >= 3) badges[1].unlocked = true;
    if (stats.streakDays >= 7) badges[2].unlocked = true;
    if (stats.streakDays >= 30) badges[3].unlocked = true;
    if (stats.totalWords >= 50) badges[4].unlocked = true;
    if (stats.totalWords >= 200) badges[5].unlocked = true;
    if (stats.totalWords >= 500) badges[6].unlocked = true;
    if (stats.learnedToday >= 20) badges[7].unlocked = true;
    return badges;
  },

  // 微信登录
  login() {
    const app = getApp() as any;
    app.login().then((openid: string) => {
      if (openid) {
        this.setData({ isLogin: true });
        this.syncFromCloud();
      } else {
        wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
      }
    });
  },

  // 从云端同步用户数据
  syncFromCloud() {
    const app = getApp() as any;
    const openid = app.globalData.openid;
    if (!openid || !wx.cloud) return;

    const db = wx.cloud.database();
    db.collection('users')
      .where({ _openid: openid })
      .get()
      .then((res: any) => {
        if (res.data && res.data.length > 0) {
          // 云端可能有多条重复文档，取统计最大的那条，避免空文档覆盖历史
          const cloud = pickBestCloudStats(res.data);
          const localStats = getStats();

          if (cloud) {
            // 统一合并策略（累计取较大值、今日以本地为准，绝不相加）
            saveStats(mergeStats(localStats, cloud));
            this.loadStats();
            // 同步合并后的数据回云端
            this.uploadToCloud();
          }
        } else {
          // 云端无数据，上传本地
          this.uploadToCloud();
        }
      })
      .catch((err: any) => {
        console.error('同步失败', err);
      });
  },

  // 上传数据到云端
  uploadToCloud() {
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
          // 已有记录，更新
          db.collection('users')
            .doc(res.data[0]._id)
            .update({
              data: {
                stats,
                updateTime: db.serverDate()
              }
            });
        } else {
          // 新用户，添加
          db.collection('users').add({
            data: {
              stats,
              createTime: db.serverDate()
            }
          });
        }
      })
      .catch(() => {});
  },

  // 打卡
  checkIn() {
    if (this.data.stats.checkedIn) {
      wx.showToast({ title: '今天已经打过卡啦', icon: 'none' });
      return;
    }
    doCheckIn();
    this.loadStats();
    // 同步到云端
    this.uploadToCloud();
    wx.showToast({ title: '打卡成功 🎉', icon: 'success' });
  },

  // 跳转隐私声明
  goPrivacy() {
    wx.navigateTo({
      url: '/pages/privacy/privacy'
    });
  },

  // 跳转生词本
  goWrongBook() {
    wx.navigateTo({
      url: '/pages/wrongbook/wrongbook'
    });
  },

  // 跳转打卡海报
  goPoster() {
    wx.navigateTo({
      url: '/pages/poster/poster'
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

  // 手动切换学习提醒
  onToggleReminder() {
    if (isReminderSubscribed()) {
      wx.showModal({
        title: '学习提醒',
        content: '学习提醒已开启，每次授权仅可推送一条消息。如需继续接收提醒，请在下次学完后再次确认授权。',
        showCancel: false,
        confirmText: '知道了'
      });
      return;
    }
    requestReminderSubscribe().then((accepted) => {
      this.setData({ reminderOn: accepted });
      if (accepted) {
        wx.showToast({ title: '已开启学习提醒', icon: 'success' });
      }
    });
  }
});
