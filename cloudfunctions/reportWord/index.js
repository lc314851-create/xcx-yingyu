// cloudfunctions/reportWord/index.js
// 词条纠错上报：
//   1) 写入 wordReports 集合（每用户每词每类型去重，防刷）
//   2) users 文档累计 wordReportCount，作为「词库共建人」激励
//
// 调用：wx.cloud.callFunction({ name: 'reportWord', data: { word, bookId, type, description } })
// 返回：{ ok, already?, total? }
//   ok=true 已受理（total=累计共建次数）
//   ok=false, already=true 该用户对同一词同一类型已上报过
//
// 处理方式：管理端在云开发控制台按 status='pending' 筛选，修完改 status='fixed'

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const REPORT_TYPES = ['meaning', 'phonetic', 'example', 'other'];

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'no openid' };

  const { word, bookId, type, description } = event || {};
  if (!word || !REPORT_TYPES.includes(type)) {
    return { ok: false, error: 'invalid params' };
  }

  const db = cloud.database();
  const reports = db.collection('wordReports');

  // 去重：同一用户对同一词同一类型只报一次（防刷）
  const dup = await reports
    .where({ _openid: OPENID, word, type })
    .limit(1)
    .get();
  if (dup.data && dup.data.length > 0) {
    return { ok: false, already: true };
  }

  await reports.add({
    data: {
      word,
      bookId: bookId || '',
      type,
      description: (description || '').slice(0, 200),
      status: 'pending', // pending / fixed / ignored
      createTime: db.serverDate()
    }
  });

  // users 文档累计共建次数（无文档则建档，避免 read 权限问题）
  const users = db.collection('users');
  let total = 1;
  try {
    const found = await users.where({ _openid: OPENID }).limit(1).get();
    if (found.data && found.data.length > 0) {
      const doc = found.data[0];
      total = (doc.wordReportCount || 0) + 1;
      await users.doc(doc._id).update({
        data: { wordReportCount: total, updateTime: db.serverDate() }
      });
    } else {
      await users.add({
        data: { _openid: OPENID, wordReportCount: 1, createTime: db.serverDate() }
      });
    }
  } catch (err) {
    console.error('累计共建次数失败（不影响上报成功）', err);
    total = 0;
  }

  return { ok: true, total };
};