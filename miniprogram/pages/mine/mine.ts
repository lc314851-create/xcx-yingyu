// pages/mine/mine.ts
// 2026-08-31：学习提醒与每周周报均已下线（微信一次性订阅机制体验繁琐），相关代码以注释保留
import { getStats, doCheckIn, getHeatmapData, getLocalProfile, saveLocalProfile, updateUserProfile, syncStatsToCloud, restoreStatsFromCloud, getCurrentBookId, getReviewPlan, getTodayLearnedWords } from '../../utils/store';
import { getBuilderCount } from '../../utils/wordReport';
import { collectTodayRows, showExportSheet, TodayRow } from '../../utils/todayExport';

interface Badge {
  name: string;
  icon: string;
  desc: string;
  unlocked: boolean;
  cur: number;      // 当前进度值
  goal: number;     // 目标值
  unit: string;     // 单位：天/个
  basis: 'streak' | 'total' | 'today'; // 进度来源
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
    showAchievements: false, // 成就区开关（当前渲染异常，先关闭；修复后改 true 即可恢复）
    // 热力图
    heatmap: [] as Array<{ date: string; count: number; level: number }>,
    planSummary: '',
    heatmapWeekLabels: [] as string[],
    heatmapTotalDays: 0,
    // 学习提醒（已下线 2026-08-31）
    // reminderOn: false,
    // weeklyOn: false // 每周学习周报已下线（2026-08-31）
    // 词库共建人（纠错上报次数）
    builderCount: 0,
    // 今日学过词数（今日复盘入口用）
    todayWordCount: 0
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

  // 复习计划入口摘要（onShow 刷新，刚复习完返回时数字变化）
  loadPlanSummary() {
    const plan = getReviewPlan(getCurrentBookId());
    const summary = plan.dueToday > 0
      ? `今天有 ${plan.dueToday} 个词等着复习`
      : '今天的复习都完成啦，安排几个新词吧';
    this.setData({ planSummary: summary });
  },

  goPlan() {
    wx.navigateTo({ url: '/pages/plan/plan' });
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
    this.setData({ todayWordCount: getTodayLearnedWords().length });
    this.loadPlanSummary();
    this.setData({ builderCount: getBuilderCount() });
  },

  loadStats() {
    const stats = getStats();
    const badges = this.computeBadges(stats);
    const badgesUnlocked = badges.filter((b: any) => b.unlocked).length;
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
      heatmapTotalDays
      // reminderOn: isReminderSubscribed() // 学习提醒已下线（2026-08-31）
      // weeklyOn: isWeeklySubscribed() // 周报已下线（2026-08-31）
    });
  },

  // 徽章解锁逻辑（附带实时进度，未解锁也有可见的成长感）
  computeBadges(stats: { totalWords: number; streakDays: number; learnedToday: number }): Badge[] {
    const badges: Badge[] = [
      { name: '初次打卡', icon: '🌱', desc: '完成第一次学习', goal: 1, unit: '次', basis: 'streak', unlocked: false, cur: 0 },
      { name: '坚持3天', icon: '⭐', desc: '连续学习3天', goal: 3, unit: '天', basis: 'streak', unlocked: false, cur: 0 },
      { name: '坚持7天', icon: '🔥', desc: '连续学习7天', goal: 7, unit: '天', basis: 'streak', unlocked: false, cur: 0 },
      { name: '坚持30天', icon: '💎', desc: '连续学习30天', goal: 30, unit: '天', basis: 'streak', unlocked: false, cur: 0 },
      { name: '单词50个', icon: '📚', desc: '累计学习50个单词', goal: 50, unit: '个', basis: 'total', unlocked: false, cur: 0 },
      { name: '单词200个', icon: '🎓', desc: '累计学习200个单词', goal: 200, unit: '个', basis: 'total', unlocked: false, cur: 0 },
      { name: '单词500个', icon: '🏆', desc: '累计学习500个单词', goal: 500, unit: '个', basis: 'total', unlocked: false, cur: 0 },
      { name: '今日达人', icon: '⚡', desc: '今日学习20个单词', goal: 20, unit: '个', basis: 'today', unlocked: false, cur: 0 }
    ];
    for (let i = 0; i < badges.length; i++) {
      const b = badges[i];
      if (b.basis === 'streak') b.cur = stats.streakDays;
      else if (b.basis === 'total') b.cur = stats.totalWords;
      else b.cur = stats.learnedToday;
      if (b.cur >= b.goal) b.unlocked = true;
    }
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
    // 隐私授权前置检查：需要授权时先拉起官方弹窗，避免 chooseAvatar/nickname 静默失败
    if (wx.getPrivacySetting) {
      wx.getPrivacySetting({
        success: (res: any) => {
          if (res.needAuthorization && wx.requirePrivacyAuthorize) {
            wx.requirePrivacyAuthorize({
              success: () => this.showProfileEditModal(),
              fail: () => {
                wx.showToast({ title: '需同意隐私保护指引后才能登录哦', icon: 'none' });
              }
            });
          } else {
            this.showProfileEditModal();
          }
        },
        fail: () => this.showProfileEditModal()
      });
    } else {
      this.showProfileEditModal();
    }
  },

  showProfileEditModal() {
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
        wx.showToast({ title: '登录成功', icon: 'success' });
      } else {
        // 云端失败不阻塞用户：先落本地，后续 syncStatsToCloud 时再同步
        this.saveProfileLocally(nickname, avatarUrl);
      }
    } catch (err) {
      console.error('保存资料失败', err);
      this.saveProfileLocally(nickname, this.data.editAvatar || '');
    } finally {
      this.setData({ savingProfile: false });
    }
  },

  // 云端不可用时的本地兜底：资料写本地缓存，界面立即生效
  saveProfileLocally(nickname: string, avatarUrl: string) {
    const profile = { nickname, avatarUrl };
    saveLocalProfile(profile as any);
    this.setData({
      showProfileEdit: false,
      nickname,
      avatarUrl,
      hasProfile: true
    });
    wx.showToast({ title: '已保存，云端稍后自动同步', icon: 'none' });
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

  // 今日复盘：本轮只重刷今天学过的词
  goTodayReview() {
    if (this.data.todayWordCount === 0) {
      wx.showToast({ title: '今天还没有学习记录', icon: 'none' });
      return;
    }
    wx.setStorageSync('bc_today_review', 1);
    wx.switchTab({ url: '/pages/words/words' });
  },
  // ─── 导出今日单词表 ───
  onExportToday() {
    wx.showLoading({ title: '整理单词中...' });
    collectTodayRows().then((rows: TodayRow[]) => {
      wx.hideLoading();
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


  // ─── 学习提醒已下线（2026-08-31：一次性订阅需重复授权，体验繁琐；代码保留待恢复） ───
  // onToggleReminder() {
  //   if (isReminderSubscribed()) {
  //     wx.showModal({
  //       title: '学习提醒',
  //       content: '学习提醒已开启，每次授权仅可推送一条消息。如需继续接收提醒，请在下次学完后再次确认授权。',
  //       showCancel: false,
  //       confirmText: '知道了'
  //     });
  //     return;
  //   }
  //   requestReminderSubscribe().then((accepted) => {
  //     this.setData({ reminderOn: accepted });
  //     if (accepted) {
  //       wx.showToast({ title: '已开启学习提醒', icon: 'success' });
  //     }
  //   });
  // },

  // ─── 每周学习周报已下线（2026-08-31：订阅消息模板体验不佳，代码保留待模板可用后恢复） ───
  // onToggleWeekly() {
  //   if (isWeeklySubscribed()) {
  //     wx.showModal({
  //       title: '每周学习周报',
  //       content: '本周已订阅，周日会收到学习周报。一次性授权只能收一条，发完后需要再次授权。下次学完单词时系统会自动询问你是否继续订阅。',
  //       showCancel: false,
  //       confirmText: '知道了'
  //     });
  //     return;
  //   }
  //   wx.showModal({
  //     title: '订阅每周学习周报',
  //     content: '授权后每周日会收到一条学习周报（本周学习量、连续打卡天数）。一次性授权只能收一条，下周需要再次授权。',
  //     confirmText: '去订阅',
  //     cancelText: '暂不',
  //     success: (res) => {
  //       if (res.confirm) {
  //         requestWeeklySubscribe().then((accepted) => {
  //           this.setData({ weeklyOn: accepted });
  //           if (accepted) {
  //             wx.showToast({ title: '已订阅本周周报', icon: 'success' });
  //           }
  //         });
  //       }
  //     }
  //   });
  // }

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '英语补词达人 · 每天一句，补回落下的词',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '英语补词达人 · 每天一句，补回落下的词'
    };
  },
});
