// pages/privacy/privacy.ts
Page({
  data: {},

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '英语补词达人 · 隐私政策',
      path: '/pages/privacy/privacy'
    };
  },
});
