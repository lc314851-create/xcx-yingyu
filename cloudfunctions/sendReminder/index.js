// cloudfunctions/sendReminder/index.js
// 订阅消息提醒：向已授权的用户发送学习提醒
// 需要在微信公众平台「订阅消息」中创建模板，将 template_id 填入下方
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ⚠️ 替换为你自己在微信公众平台创建的订阅消息模板 ID
const TEMPLATE_ID = 'your_template_id_here';

exports.main = async (event, context) => {
  const { openid } = event;

  if (!openid) {
    return { success: false, msg: '缺少 openid' };
  }

  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: TEMPLATE_ID,
      // 模板参数，根据你的模板内容填写
      data: {
        thing1: { value: '英语补词达人' },
        thing2: { value: '今天的单词还没学完哦' },
        date3: { value: new Date().toLocaleDateString('zh-CN') }
      },
      miniprogramState: 'developer'
    });

    return { success: true, result };
  } catch (err) {
    console.error('发送订阅消息失败:', err);
    return { success: false, error: err.errMsg || String(err) };
  }
};
