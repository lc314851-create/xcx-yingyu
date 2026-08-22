// app.ts - 全局入口
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
