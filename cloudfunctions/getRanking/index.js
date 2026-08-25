// cloudfunctions/getRanking/index.js
// 学习排行榜（服务端聚合）：返回本周榜/总榜 Top50 + 我的排名
// 服务端查询全部用户，规避客户端默认权限「只能读到自己文档」的限制
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

exports.main = async () => {
  const { OPENID } = cloud.getWXContext();
  const db = cloud.database();
  const _ = db.command;
  const col = db.collection('users');

  const [weeklyRes, totalRes, myRes] = await Promise.all([
    col.where({ 'stats.weeklyLearned': _.gt(0) })
      .orderBy('stats.weeklyLearned', 'desc')
      .limit(50)
      .get(),
    col.where({ 'stats.totalWords': _.gt(0) })
      .orderBy('stats.totalWords', 'desc')
      .limit(50)
      .get(),
    col.where({ _openid: OPENID }).limit(1).get()
  ]);

  const fmt = (list, key) => (list || []).map(it => {
    const s = it.stats || {};
    return {
      openid: it._openid,
      nickname: it.nickname || '',
      avatarUrl: it.avatarUrl || '',
      count: s[key] || 0
    };
  });

  const weekly = fmt(weeklyRes.data, 'weeklyLearned');
  const total = fmt(totalRes.data, 'totalWords');

  const myStats = (myRes.data && myRes.data[0] && myRes.data[0].stats) || {};

  const rankOf = (list, key) => {
    const idx = list.findIndex(x => x.openid === OPENID);
    if (idx >= 0) return idx + 1;
    // 不在前50内：统计比我多的人数
    return col.where({ [`stats.${key}`]: _.gt(myStats[key] || 0) })
      .count()
      .then(r => (r.total || 0) + 1);
  };

  const [myWeeklyRank, myTotalRank] = await Promise.all([
    rankOf(weekly, 'weeklyLearned'),
    rankOf(total, 'totalWords')
  ]);

  return {
    weekly,
    total,
    myWeekly: myStats.weeklyLearned || 0,
    myTotal: myStats.totalWords || 0,
    myWeeklyRank,
    myTotalRank,
    openid: OPENID
  };
};
