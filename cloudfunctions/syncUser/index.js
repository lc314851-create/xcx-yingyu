// cloudfunctions/syncUser/index.js
// 用户数据统一同步入口（服务端权限，规避客户端读不到他人文档的限制）
//
// 职责：
//   1) stats 合并：累计值取较大值、今日/本周以「lastStudyDate 是今天」的一方为准，绝不相加
//   2) 资料写入：nickname / avatarUrl
//   3) 自动去重：同一 openid 的多条历史文档统一更新为同一份数据
//
// 调用：wx.cloud.callFunction({ name:'syncUser', data:{ stats?, nickname?, avatarUrl?, today? } })
// 返回：{ openid, profile:{nickname,avatarUrl}, stats:合并后的最优统计, isNew }

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 合并每日学习历史（同一天取较大值，绝不相加，防重复累计）
function mergeHistory(a, b) {
  const out = {};
  for (const k of Object.keys(a || {})) out[k] = a[k] || 0;
  for (const k of Object.keys(b || {})) out[k] = Math.max(out[k] || 0, b[k] || 0);
  return out;
}

// 与客户端 mergeStats 同策略的合并实现
function mergeStats(local, cloudStats, today) {
  const L = local || {};
  const C = cloudStats || {};
  const lToday = L.lastStudyDate === today;
  const cToday = C.lastStudyDate === today;
  return {
    totalWords: Math.max(L.totalWords || 0, C.totalWords || 0),
    streakDays: Math.max(L.streakDays || 0, C.streakDays || 0),
    learnedToday: lToday ? (L.learnedToday || 0) : (cToday ? (C.learnedToday || 0) : 0),
    weeklyLearned: lToday ? (L.weeklyLearned || 0) : Math.max(L.weeklyLearned || 0, C.weeklyLearned || 0),
    checkedIn: lToday ? !!L.checkedIn : (cToday ? !!C.checkedIn : false),
    lastStudyDate: (L.lastStudyDate || '') >= (C.lastStudyDate || '') ? L.lastStudyDate : C.lastStudyDate,
    weeklyStart: L.weeklyStart || C.weeklyStart || ''
  };
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { error: 'no openid' };

  const db = cloud.database();
  const col = db.collection('users');
  const today = event.today || '';
  const incomingStats = event.stats;
  const incomingHistory = event.history;
  const nickname = event.nickname;
  const avatarUrl = event.avatarUrl;

  // 取出该 openid 下全部文档（历史可能有多条，合并时一起处理）
  const found = await col.where({ _openid: OPENID }).limit(100).get();
  const docs = found.data || [];

  // ─── 新用户：直接建档 ───
  if (docs.length === 0) {
    const data = { _openid: OPENID, createTime: db.serverDate(), updateTime: db.serverDate() };
    if (incomingStats) data.stats = incomingStats;
    if (incomingHistory) data.history = incomingHistory;
    if (nickname !== undefined) data.nickname = nickname;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    await col.add({ data });
    return {
      openid: OPENID,
      profile: { nickname: nickname || '', avatarUrl: avatarUrl || '' },
      stats: incomingStats || null,
      history: incomingHistory || null,
      isNew: true
    };
  }

  // ─── 老用户：先在所有文档间取「最优统计」「最优日历」「已有资料」 ───
  let best = null;
  let bestHistory = null;
  let curProfile = { nickname: '', avatarUrl: '' };
  for (const d of docs) {
    if (d.stats) best = best ? mergeStats(best, d.stats, today) : { ...d.stats };
    if (d.history) bestHistory = bestHistory ? mergeHistory(bestHistory, d.history) : { ...d.history };
    if (!curProfile.nickname && d.nickname) curProfile.nickname = d.nickname;
    if (!curProfile.avatarUrl && d.avatarUrl) curProfile.avatarUrl = d.avatarUrl;
  }
  // 再与本次传入的本地统计/日历合并（同样取较大值）
  if (incomingStats) best = best ? mergeStats(best, incomingStats, today) : { ...incomingStats };
  if (incomingHistory) bestHistory = bestHistory ? mergeHistory(bestHistory, incomingHistory) : { ...incomingHistory };

  if (nickname !== undefined) curProfile.nickname = nickname;
  if (avatarUrl !== undefined) curProfile.avatarUrl = avatarUrl;

  // ─── 统一回写所有文档（顺带去重同步，避免某条旧文档数据不一致） ───
  for (const d of docs) {
    const patch = { updateTime: db.serverDate() };
    if (best) patch.stats = best;
    if (bestHistory) patch.history = bestHistory;
    if (nickname !== undefined) patch.nickname = nickname;
    if (avatarUrl !== undefined) patch.avatarUrl = avatarUrl;
    await col.doc(d._id).update({ data: patch });
  }

  return {
    openid: OPENID,
    profile: curProfile,
    stats: best,
    history: bestHistory,
    isNew: false
  };
};
