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

// 单词进度合并（与客户端 mergeProgress 同策略，SM-2 变体）：
//   旧 Leitner 记录先按 box 回填 rep/interval/ease；
//   学习深度更大者胜（连续答对 rep 优先，其次间隔 interval 天数）；
//   深度相同取 lastSeen 较新；累计次数取较大值；box/status 由 rep 归一化
function repOf(p) {
  if (!p) return 0;
  if (typeof p.rep === 'number') return p.rep;
  return p.box >= 2 ? Math.min(p.box - 1, 6) : 0;
}

function intervalOf(p) {
  if (!p) return 0;
  if (typeof p.interval === 'number') return p.interval;
  const BOX_INTERVAL_DAYS = { 1: 0, 2: 1, 3: 2, 4: 4, 5: 7, 6: 15, 7: 30 };
  return BOX_INTERVAL_DAYS[p.box] || 0;
}

// 学习深度评分：连续答对次数优先（×1000 放大），其次间隔天数
function depthOf(p) {
  return repOf(p) * 1000 + intervalOf(p);
}

function normalizeProgress(p) {
  const rep = repOf(p);
  const box = Math.max(1, Math.min(7, rep + 1));
  return Object.assign({}, p, {
    box,
    status: box >= 5 ? 'mastered' : (box >= 3 ? 'review' : 'learning')
  });
}

function mergeWordProgress(a, b) {
  const out = {};
  const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
  for (const k of keys) {
    const l = (a || {})[k];
    const c = (b || {})[k];
    if (!l) { out[k] = normalizeProgress(c); continue; }
    if (!c) { out[k] = normalizeProgress(l); continue; }
    let better;
    if (depthOf(c) !== depthOf(l)) {
      better = depthOf(c) > depthOf(l) ? c : l;
    } else {
      better = (c.lastSeen || 0) >= (l.lastSeen || 0) ? c : l;
    }
    out[k] = Object.assign({}, normalizeProgress(better), {
      knownCount: Math.max(l.knownCount || 0, c.knownCount || 0),
      unknownCount: Math.max(l.unknownCount || 0, c.unknownCount || 0)
    });
  }
  return out;
}

const PROGRESS_FIELD_PREFIX = 'progress_'; // 文档字段：progress_${bookId}
const WRONG_BOOK_FIELD = 'wrongBook';      // 文档字段：生词本整表

// 生词本合并（与客户端 mergeWrongBook 同策略）：按 word 取并集，同词取 addedAt 较新者
function mergeWrongBookList(a, b) {
  const out = new Map();
  for (const it of [...(a || []), ...(b || [])]) {
    const prev = out.get(it.word);
    if (!prev || (it.addedAt || 0) >= (prev.addedAt || 0)) out.set(it.word, it);
  }
  return Array.from(out.values());
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
  // 进度同步请求体：{ progressBookId, progress } 或 { progressRequestBookId }（仅拉取）
  const progressBookId = event.progressBookId || event.progressRequestBookId || '';
  const incomingProgress = event.progress;
  const incomingWrongBook = Array.isArray(event.wrongBook) ? event.wrongBook : null;
  const nickname = event.nickname;
  const avatarUrl = event.avatarUrl;
  const weeklySubscribed = event.weeklySubscribed; // 周报订阅状态（sendReminder 周报扫描用）
  const reminderSubscribed = event.reminderSubscribed; // 每日提醒订阅状态（sendReminder 每日扫描用）

  // 取出该 openid 下全部文档（历史可能有多条，合并时一起处理）
  const found = await col.where({ _openid: OPENID }).limit(100).get();
  const docs = found.data || [];

  // ─── 新用户：直接建档 ───
  if (docs.length === 0) {
    const data = { _openid: OPENID, createTime: db.serverDate(), updateTime: db.serverDate() };
    if (incomingStats) data.stats = incomingStats;
    if (incomingHistory) data.history = incomingHistory;
    // 新用户首次上传进度：直接建档，避免旧进度丢失
    if (progressBookId && incomingProgress && typeof incomingProgress === 'object') {
      data[PROGRESS_FIELD_PREFIX + progressBookId] = incomingProgress;
    }
    if (Array.isArray(event.wrongBook)) data[WRONG_BOOK_FIELD] = event.wrongBook;
    if (nickname !== undefined) data.nickname = nickname;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
    if (weeklySubscribed !== undefined) data.weeklySubscribed = !!weeklySubscribed;
    if (reminderSubscribed !== undefined) data.reminderSubscribed = !!reminderSubscribed;
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
    if (weeklySubscribed !== undefined) patch.weeklySubscribed = !!weeklySubscribed;
    if (reminderSubscribed !== undefined) patch.reminderSubscribed = !!reminderSubscribed;
    await col.doc(d._id).update({ data: patch });
  }

  // ─── 单词进度：在所有文档间先横向合并（去重多文档），再与传入的本地进度合并 ───
  let bestProgress = null;
  for (const d of docs) {
    const key = PROGRESS_FIELD_PREFIX + progressBookId;
    if (progressBookId && d[key]) {
      bestProgress = bestProgress
        ? mergeWordProgress(bestProgress, d[key])
        : d[key];
    }
  }
  if (incomingProgress && typeof incomingProgress === 'object') {
    bestProgress = bestProgress
      ? mergeWordProgress(bestProgress, incomingProgress)
      : incomingProgress;
  }

  // 上传模式：把合并后的进度回写到所有文档（含历史冗余文档，保持一致）
  // ─── 生词本：收集各文档已有的并集；上传模式用传入列表覆盖（保证移除/清空能同步）───
  let cloudWrongBook = null;
  for (const d of docs) {
    if (d[WRONG_BOOK_FIELD]) {
      cloudWrongBook = cloudWrongBook
        ? mergeWrongBookList(cloudWrongBook, d[WRONG_BOOK_FIELD])
        : d[WRONG_BOOK_FIELD];
    }
  }
  let finalWrongBook = cloudWrongBook || [];
  if (incomingWrongBook) {
    finalWrongBook = incomingWrongBook; // 整表覆盖：客户端以本地为准全量上报
    for (const d of docs) {
      await col.doc(d._id).update({ data: { [WRONG_BOOK_FIELD]: finalWrongBook, updateTime: db.serverDate() } });
    }
  }

  if (bestProgress && event.progressBookId) {
    const fieldKey = PROGRESS_FIELD_PREFIX + progressBookId;
    for (const d of docs) {
      await col.doc(d._id).update({ data: { [fieldKey]: bestProgress, updateTime: db.serverDate() } });
    }
  }

  // 仅拉取模式（progressRequestBookId）：不写回，只返回云端已有的合并结果
  return {
    openid: OPENID,
    profile: curProfile,
    stats: best,
    history: bestHistory,
    progress: bestProgress,
    wrongBook: finalWrongBook,
    isNew: false
  };
};
