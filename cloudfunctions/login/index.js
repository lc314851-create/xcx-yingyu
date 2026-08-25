// cloudfunctions/login/index.js
// 登录：静默获取 openid + 返回用户已完善的资料（昵称/头像）
// 服务端读取 users 集合，规避客户端默认权限只能读自己文档的限制
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openid = wxContext.OPENID;
  const db = cloud.database();

  let profile = { nickname: '', avatarUrl: '' };
  try {
    const found = await db.collection('users')
      .where({ _openid: openid })
      .limit(1)
      .get();
    if (found.data && found.data.length > 0) {
      const u = found.data[0];
      profile = {
        nickname: u.nickname || '',
        avatarUrl: u.avatarUrl || ''
      };
    }
  } catch (e) {
    // 集合不存在等异常：返回空资料即可
  }

  return {
    openid,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    profile
  };
};
