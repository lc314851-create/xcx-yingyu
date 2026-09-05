// app.ts - 全局入口
import {
  restoreProgressFromCloud,
  syncProgressToCloud,
  restoreWrongBookFromCloud,
  syncWrongBookToCloud,
  getCurrentBookId
} from './utils/store';
import { getBookWords } from './utils/wordService';

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

    // 版本更新检测：新版包下载完后弹窗询问，用户确认才应用（官方推荐模式，不强制）
    this.checkUpdate();

    // 自动登录获取 openid
    this.login().finally(() => {
      // 预热当前词书：必须在拿到 openid 之后再下载，否则云存储读权限校验失败（报 empty download url）
      // 命中本地文件缓存时无网络请求，不受影响
      getBookWords(getCurrentBookId()).catch(() => {});
    });

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

  // 版本更新检测：有新版本时提示用户重启应用（可取消，不强制）
  checkUpdate() {
    if (!wx.getUpdateManager) return; // 基础库过低则跳过
    const um = wx.getUpdateManager();
    um.onUpdateReady(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本已经准备好，是否重启应用？',
        confirmText: '立即重启',
        cancelText: '稍后再说',
        success: (res) => {
          if (res.confirm) um.applyUpdate();
        }
      });
    });
    um.onUpdateFailed(() => {
      wx.showModal({
        title: '更新提示',
        content: '新版本下载失败，请检查网络后重进小程序',
        showCancel: false
      });
    });
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
