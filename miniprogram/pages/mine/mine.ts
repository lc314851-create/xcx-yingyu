// pages/mine/mine.ts
import { getStats, doCheckIn, getHeatmapData, getLocalProfile, updateUserProfile, syncStatsToCloud, restoreStatsFromCloud, isReminderSubscribed, requestReminderSubscribe } from '../../utils/store';

interface Badge {
  name: string;
  icon: string;
  desc: string;
  unlocked: boolean;
}

Page({
  data: {
    nickname: '',
    avatarUrl: '',
    isLogin: false,
    hasProfile: false,
    // 资料编辑弹窗
    showProfileEdit: false,
    editAvatar: '',
    editNickname: '',
    savingProfile: false,
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
      // 先展示本地缓存的资料，再尝试从云端拉取最新
      this.loadProfile();
      restoreStatsFromCloud().then(() => {
        this.loadProfile();
        this.loadStats();
      });
    } else {
      // 静默登录后补充资料
      app.login().then(() => {
        this.setData({ isLogin: true });
        this.loadProfile();
        restoreStatsFromCloud().then(() => this.loadStats());
      });
    }
  },

  // 读取资料（本地缓存优先，无则显示默认）
  loadProfile() {
    const app = getApp() as any;
    const profile = getLocalProfile() || (app.globalData && app.globalData.userInfo) || {};
    const nickname = profile.nickname || '同学';
    this.setData({
      nickname,
      avatarUrl: profile.avatarUrl || '',
      hasProfile: !!(profile.nickname || profile.avatarUrl)
    });
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

  // 头像/昵称区域点击：未登录则登录并弹面板，已登录直接改资料
  onHeaderTap() {
    if (!this.data.isLogin) {
      this.login();
      return;
    }
    this.openProfileEdit();
  },

  // 登录/完善资料：弹出资料编辑面板（头像 + 昵称）
  login() {
    const app = getApp() as any;
    app.login().then((openid: string) => {
      if (openid) {
        this.setData({ isLogin: true });
        this.openProfileEdit();
      } else {
        wx.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
      }
    });
  },

  // ─── 资料编辑面板 ───
  openProfileEdit() {
    this.setData({
      showProfileEdit: true,
      editAvatar: this.data.avatarUrl || '',
      editNickname: this.data.nickname === '同学' ? '' : this.data.nickname
    });
  },

  closeProfileEdit() {
    if (this.data.savingProfile) return;
    this.setData({ showProfileEdit: false });
  },

  noop() {},

  // 选择微信头像
  onChooseAvatar(e: any) {
    const temp = e.detail.avatarUrl;
    if (!temp) return;
    this.setData({ editAvatar: temp });
  },

  // 输入昵称
  onNicknameInput(e: any) {
    this.setData({ editNickname: e.detail.value });
  },

  // 保存资料：上传头像到云存储 → syncUser 云函数写入 users 集合
  async onSaveProfile() {
    const nickname = (this.data.editNickname || '').trim();
    if (!nickname) {
      wx.showToast({ title: '请先填写昵称', icon: 'none' });
      return;
    }
    if (this.data.savingProfile) return;
    this.setData({ savingProfile: true });

    try {
      let avatarUrl = this.data.editAvatar || '';
      // 临时头像路径需要上传为云存储 fileID 才能跨端显示
      if (avatarUrl && avatarUrl.indexOf('cloud://') !== 0) {
        const app = getApp() as any;
        const openid = app.globalData.openid || 'anon';
        const ext = avatarUrl.indexOf('.png') > -1 ? 'png' : 'jpg';
        const upload = await wx.cloud.uploadFile({
          cloudPath: `avatar/${openid}_${Date.now()}.${ext}`,
          filePath: avatarUrl
        });
        avatarUrl = upload.fileID;
      }

      const profile = await updateUserProfile(nickname, avatarUrl);
      if (profile) {
        this.setData({
          showProfileEdit: false,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          hasProfile: true
        });
        wx.showToast({ title: '已登录成功', icon: 'success' });
      } else {
        wx.showToast({ title: '保存失败，请重试', icon: 'none' });
      }
    } catch (err) {
      console.error('保存资料失败', err);
      wx.showToast({ title: '保存失败，请重试', icon: 'none' });
    } finally {
      this.setData({ savingProfile: false });
    }
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
    syncStatsToCloud(getStats());
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

  // 跳转双语阅读
  goStory() {
    wx.navigateTo({
      url: '/pages/story/story'
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
