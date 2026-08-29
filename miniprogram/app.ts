// app.ts - 全局入口
import {
  restoreProgressFromCloud,
  syncProgressToCloud,
  restoreWrongBookFromCloud,
  syncWrongBookToCloud,
  getCurrentBookId
} from './utils/store';

App({
  globalData: {
    // 云开发环境 ID（创建云环境后填入）
    cloudEnv: 'cloudbase-d0g1vselq28a99d40',
    userInfo: null as any,
    openid: ''
  },

  onLaunch() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      return;
    }
    wx.cloud.init({
      env: this.globalData.cloudEnv || undefined,
      traceUser: true
    });

    // 自动登录获取 openid
    this.login();

    // 登录失败时也尝试用缓存的 openid 恢复进度（尽力而为）
    const cachedOpenid = wx.getStorageSync('bc_openid');
    if (cachedOpenid && wx.cloud) {
      setTimeout(() => {
        restoreProgressFromCloud(getCurrentBookId());
        restoreWrongBookFromCloud(); // 拉取云端生词本并集到本地
      }, 3000);
    }
  },

  // 退后台：把去抖队列里的进度同步立即落云，避免杀进程丢失最后几分钟的学习
  onHide() {
    const bookId = getCurrentBookId();
    syncProgressToCloud(bookId).catch(() => {});
    syncWrongBookToCloud().catch(() => {}); // 生词本去抖队列立即落云，防杀进程丢失
  },

  // 云开发登录
  login() {
    if (this.globalData.openid) {
      return Promise.resolve(this.globalData.openid);
    }
    return wx.cloud
      .callFunction({
        name: 'login',
        data: {}
      })
      .then((res: any) => {
        const openid = res.result.openid;
        if (openid) {
          this.globalData.openid = openid;
          // 缓存到本地
          wx.setStorageSync('bc_openid', openid);
          // 登录成功后：静默拉取云端单词进度与生词本并合并到本地（换机/清缓存不丢）
          restoreProgressFromCloud(getCurrentBookId());
          restoreWrongBookFromCloud();
        }
        // 缓存用户资料（昵称/头像）
        const profile = (res.result && res.result.profile) || {};
        if (profile.nickname || profile.avatarUrl) {
          this.globalData.userInfo = profile;
          wx.setStorageSync('bc_profile', profile);
        }
        return openid;
      })
      .catch((err: any) => {
        console.error('登录失败', err);
        // 尝试从本地缓存读取
        const cached = wx.getStorageSync('bc_openid');
        if (cached) this.globalData.openid = cached;
        return cached || '';
      });
  }
});
