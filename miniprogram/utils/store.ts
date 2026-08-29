// utils/store.ts
// 本地存储管理：学习进度 / 间隔记忆（SM-2 变体）/ 打卡 / 词书选择
// 统一 key 命名空间前缀 "bc_"（补词），避免与其他小程序数据冲突

// ─── 类型 ─────────────────────────────────────────────────────
// 单个单词的掌握状态（SM-2 变体间隔记忆）
// rep=连续答对次数、ease=个人难度系数、interval=当前间隔天数 → 三者驱动下次复习时间
// box 是 rep 的展示映射（1~7，box>=5 ⇔ 连续答对>=4 次 ⇔ 已掌握），
// 保留该字段让统计/排行榜/搜索等既有消费者零改动兼容
export interface WordProgress {
  word: string;        // 单词
  status: 'new' | 'learning' | 'review' | 'mastered'; // 状态（用于统计展示）
  box: number;          // 展示用盒子等级 1~7（7=长期记忆），由 rep 推导
  knownCount: number;  // 累计认识次数
  unknownCount: number;// 累计不认识次数
  nextReview: number;  // 下次复习时间戳（ms）
  lastSeen: number;    // 上次学习时间戳
  // ─── SM-2 调度字段（可选；旧 Leitner 数据缺失时按 box 回填） ───
  ease?: number;       // 个人难度系数 1.3~2.5：答对 +0.05 / 答错 -0.2
  rep?: number;        // 连续答对次数（答错归零）
  interval?: number;   // 当前复习间隔（天）
}

// 学习统计
export interface StudyStats {
  learnedToday: number;
  streakDays: number;
  totalWords: number;
  checkedIn: boolean;
  lastStudyDate: string; // 'YYYY-MM-DD'
  weeklyLearned: number; // 本周已学
  weeklyStart: string;   // 本周起始日期
}

// 默认统计
function defaultStats(): StudyStats {
  return {
    learnedToday: 0,
    streakDays: 0,
    totalWords: 0,
    checkedIn: false,
    lastStudyDate: '',
    weeklyLearned: 0,
    weeklyStart: ''
  };
}

// ─── 日期工具 ──────────────────────────────────────────────────
// 格式化日期为 'YYYY-MM-DD'
export function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 获取今天日期字符串
export function todayStr(): string {
  return formatDate(new Date());
}

// 获取本周一日期字符串（以周一为一周起始）
export function mondayStr(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay() || 7; // 周日是 0，转为 7
  const monday = new Date(date);
  monday.setDate(date.getDate() - day + 1);
  return formatDate(monday);
}

// 判断两个日期是否是连续的（昨天 → 今天）
function isConsecutive(prev: string, cur: string): boolean {
  const prevDate = new Date(prev + 'T00:00:00');
  const curDate = new Date(cur + 'T00:00:00');
  const diff = (curDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
  return diff === 1;
}

// ─── 每日学习记录（用于热力图） ────────────────────────────────
const DAILY_HISTORY_KEY = 'bc_daily_history';

// 获取每日学习历史（Record<'YYYY-MM-DD', count>）
export function getDailyHistory(): Record<string, number> {
  return wx.getStorageSync(DAILY_HISTORY_KEY) || {};
}

// 记录每日学习量
export function recordDailyHistory(count: number = 1): void {
  const history = getDailyHistory();
  const today = todayStr();
  history[today] = (history[today] || 0) + count;
  saveDailyHistory(history);
}

// 保存每日学习历史（供云端同步后写回）
export function saveDailyHistory(history: Record<string, number>): void {
  // 清理超过 90 天的旧数据，避免无限增长
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 90);
  const cutoffStr = formatDate(cutoff);
  for (const key of Object.keys(history)) {
    if (key < cutoffStr) delete history[key];
  }
  wx.setStorageSync(DAILY_HISTORY_KEY, history);
}

// 合并两份每日历史（同一天取较大值，绝不相加，防重复累计）
export function mergeDailyHistory(a: Record<string, number>, b: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const k of Object.keys(a || {})) out[k] = a[k] || 0;
  for (const k of Object.keys(b || {})) out[k] = Math.max(out[k] || 0, b[k] || 0);
  return out;
}

// 获取最近 N 天的热力图数据
export function getHeatmapData(days: number = 30): Array<{ date: string; count: number; level: number }> {
  const history = getDailyHistory();
  const result: Array<{ date: string; count: number; level: number }> = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = formatDate(d);
    const count = history[dateStr] || 0;
    // 分级：0=未学习, 1=1-5, 2=6-15, 3=16-30, 4=30+
    let level = 0;
    if (count >= 30) level = 4;
    else if (count >= 16) level = 3;
    else if (count >= 6) level = 2;
    else if (count >= 1) level = 1;
    result.push({ date: dateStr, count, level });
  }
  return result;
}

// ─── 统计 ──────────────────────────────────────────────────────
const STATS_KEY = 'bc_stats';

export function getStats(): StudyStats {
  const s = wx.getStorageSync(STATS_KEY);
  if (!s) return defaultStats();
  return { ...defaultStats(), ...s };
}

export function saveStats(s: StudyStats): void {
  wx.setStorageSync(STATS_KEY, s);
}

// 当用户学习一个词时，更新统计
// isNewWord：是否首次学的新词。仅新词计入“累计单词 totalWords”；
// 复习/巩固/挑战/练习等重复学习只计入今日/本周学习量与打卡，不计累计单词。
export function recordStudy(count: number = 1, isNewWord: boolean = true): StudyStats {
  const stats = getStats();
  const today = todayStr();
  const monday = mondayStr();

  // 如果是新的一天
  if (stats.lastStudyDate !== today) {
    // 检查是否连续
    if (stats.lastStudyDate && isConsecutive(stats.lastStudyDate, today)) {
      stats.streakDays += 1;
    } else if (!stats.lastStudyDate) {
      // 首次学习
      stats.streakDays = 1;
    } else {
      // 断了，重新计数
      stats.streakDays = 1;
    }
    // 重置今日学习数
    stats.learnedToday = 0;
    stats.checkedIn = false;
    stats.lastStudyDate = today;
  }

  // 如果是新的一周
  if (stats.weeklyStart !== monday) {
    stats.weeklyLearned = 0;
    stats.weeklyStart = monday;
  }

  stats.learnedToday += count;
  stats.weeklyLearned += count;
  if (isNewWord) {
    stats.totalWords += count;
  }
  saveStats(stats);
  recordDailyHistory(count);
  return stats;
}

// 合并本地与云端的统计（防丢失）：
//   - 累计值（totalWords/streakDays）取较大值，避免清缓存后把历史冲小
//   - 今日/本周以本地为准（本地今天学过就是最新），防覆盖
//   - 日期字段取较新的
// 绝不相加，杜绝重复累计。
export function mergeStats(local: StudyStats, cloud: StudyStats): StudyStats {
  const today = todayStr();
  return {
    ...defaultStats(),
    ...local,
    totalWords: Math.max(local.totalWords || 0, cloud.totalWords || 0),
    streakDays: Math.max(local.streakDays || 0, cloud.streakDays || 0),
    learnedToday: local.lastStudyDate === today
      ? local.learnedToday
      : (cloud.lastStudyDate === today ? (cloud.learnedToday || 0) : 0),
    weeklyLearned: local.lastStudyDate === today
      ? local.weeklyLearned
      : Math.max(local.weeklyLearned || 0, cloud.weeklyLearned || 0),
    checkedIn: local.lastStudyDate === today
      ? local.checkedIn
      : (cloud.lastStudyDate === today ? cloud.checkedIn : false),
    lastStudyDate: (local.lastStudyDate || '') >= (cloud.lastStudyDate || '')
      ? local.lastStudyDate
      : cloud.lastStudyDate,
    weeklyStart: local.weeklyStart || cloud.weeklyStart || ''
  };
}

// ─── 云端同步（经 syncUser 云函数，服务端权限，可读全量并自动去重合并） ───

// 用户资料
const PROFILE_KEY = 'bc_profile';
export interface UserProfile {
  nickname: string;
  avatarUrl: string; // 云存储 fileID
}
export function getLocalProfile(): UserProfile {
  return wx.getStorageSync(PROFILE_KEY) || { nickname: '', avatarUrl: '' };
}
export function saveLocalProfile(p: UserProfile): void {
  wx.setStorageSync(PROFILE_KEY, p);
}

export interface SyncUserResult {
  openid?: string;
  profile?: UserProfile;
  stats?: StudyStats;
  history?: Record<string, number>;
  progress?: Record<string, WordProgress>;
  wrongBook?: WrongBookItem[];
  isNew?: boolean;
}

// 调 syncUser 云函数（服务端合并统计+资料、自动去重）
function callSyncUser(event: any): Promise<SyncUserResult | null> {
  if (!wx.cloud) return Promise.resolve(null);
  return wx.cloud
    .callFunction({ name: 'syncUser', data: event })
    .then((res: any) => (res && res.result) || null)
    .catch((err: any) => {
      console.error('syncUser 失败', err);
      return null;
    });
}

// 上传统计与学习日历到云端（服务端合并取较大值，并把合并结果同步回本地）
export function syncStatsToCloud(stats: StudyStats): Promise<StudyStats | null> {
  return callSyncUser({ stats, history: getDailyHistory(), today: todayStr() }).then(res => {
    if (res && res.stats) {
      const merged = mergeStats(getStats(), res.stats);
      saveStats(merged);
      if (res.history) saveDailyHistory(res.history);
      if (res.profile) saveLocalProfile(res.profile);
      return merged;
    }
    return null;
  });
}

// 从云端拉取统计与资料并合并回本地（静默，失败不打扰）
// 单例锁：防止首页/我的页并发触发多次拉取
let restorePending: Promise<void> | null = null;
export function restoreStatsFromCloud(): Promise<void> {
  if (restorePending) return restorePending;
  if (!wx.cloud) return Promise.resolve();

  restorePending = callSyncUser({ today: todayStr() }).then(res => {
    if (res) {
      if (res.stats) saveStats(mergeStats(getStats(), res.stats));
      if (res.history) saveDailyHistory(mergeDailyHistory(getDailyHistory(), res.history));
      if (res.profile) saveLocalProfile(res.profile);
    }
  }).then(() => { restorePending = null; });

  return restorePending;
}

// 保存用户资料（头像需先由调用方上传为云存储 fileID）
export function updateUserProfile(nickname: string, avatarUrl: string): Promise<UserProfile | null> {
  return callSyncUser({ nickname, avatarUrl, today: todayStr() }).then(res => {
    if (res && res.profile) {
      saveLocalProfile(res.profile);
      return res.profile;
    }
    return null;
  });
}

// ─── 打卡 ──────────────────────────────────────────────────────
export function doCheckIn(): StudyStats {
  const stats = getStats();
  const today = todayStr();

  // 如果是新的一天，重置打卡状态
  if (stats.lastStudyDate !== today) {
    if (stats.lastStudyDate && isConsecutive(stats.lastStudyDate, today)) {
      stats.streakDays += 1;
    } else if (!stats.lastStudyDate) {
      stats.streakDays = 1;
    } else {
      stats.streakDays = 1;
    }
    stats.learnedToday = 0;
    stats.checkedIn = false;
    stats.lastStudyDate = today;
  }

  if (!stats.checkedIn) {
    stats.checkedIn = true;
    saveStats(stats);
  }
  return stats;
}

// ─── 词书选择 ──────────────────────────────────────────────────
const BOOK_KEY = 'bc_current_book';
const BOOK_CHOSEN_KEY = 'bc_book_chosen';

// 用户是否已经主动选过词书（区分"默认初中"和"用户主动选了初中"）
export function hasSelectedBook(): boolean {
  return wx.getStorageSync(BOOK_CHOSEN_KEY) === true;
}

export function getCurrentBookId(): string {
  return wx.getStorageSync(BOOK_KEY) || 'junior';
}

export function setCurrentBookId(id: string): void {
  wx.setStorageSync(BOOK_KEY, id);
  wx.setStorageSync(BOOK_CHOSEN_KEY, true);
}

// ─── 学习模式（高频词 / 完整） ─────────────────────────────────
const BATCH_SIZE_KEY = 'bc_batch_size';
export function getBatchSize(): number {
  return wx.getStorageSync(BATCH_SIZE_KEY) || 10;
}
export function setBatchSize(n: number): void {
  wx.setStorageSync(BATCH_SIZE_KEY, n);
}

const STUDY_MODE_KEY = 'bc_study_mode';

export function getStudyMode(): 'highFreq' | 'all' {
  return wx.getStorageSync(STUDY_MODE_KEY) || 'all';
}

export function setStudyMode(mode: 'highFreq' | 'all'): void {
  wx.setStorageSync(STUDY_MODE_KEY, mode);
}

// ─── 练习模式（卡片翻面 / 四选一 / 拼写） ──────────────────────
const PRACTICE_MODE_KEY = 'bc_practice_mode';

export type PracticeMode = 'card' | 'choice' | 'spell';

export function getPracticeMode(): PracticeMode {
  return wx.getStorageSync(PRACTICE_MODE_KEY) || 'card';
}

export function setPracticeMode(mode: PracticeMode): void {
  wx.setStorageSync(PRACTICE_MODE_KEY, mode);
}

// ─── 发音偏好（英音 / 美音） ───────────────────────────────────
const ACCENT_KEY = 'bc_accent';

export type Accent = 'uk' | 'us';

export function getAccent(): Accent {
  return wx.getStorageSync(ACCENT_KEY) || 'us';
}

export function setAccent(accent: Accent): void {
  wx.setStorageSync(ACCENT_KEY, accent);
}

// ─── 单词进度（间隔记忆） ──────────────────────────────────────
// 每个词书有独立的进度 key
export function getProgressKey(bookId: string): string {
  return `bc_progress_${bookId}`;
}

// 获取某词书的全部进度
export function getAllProgress(bookId: string): Record<string, WordProgress> {
  return wx.getStorageSync(getProgressKey(bookId)) || {};
}

// 保存某词书全部进度
export function saveAllProgress(bookId: string, data: Record<string, WordProgress>): void {
  wx.setStorageSync(getProgressKey(bookId), data);
}

// 记录单词学习状态，更新间隔记忆（SM-2 变体）
// known: true=认识, false=不认识
//
// SM-2 调度规则：
//   - 前 4 次连续答对：间隔 1天 → 2天 → 4天 → 7天（与「连续答对4次=已掌握」宣传一致）
//   - 第 5 次起：间隔 = round(上间隔 × 个人难度系数 ease)，随掌握度逐步拉长
//   - ease 个人化：答对 +0.05（上限 2.5，词越容易间隔拉得越长），答错 -0.2（下限 1.3）
//   - 答错：rep 归零、间隔归零、立即可复习（今天内再出现）
//   - 展示用 box = rep + 1（1~7），box>=5 ⇔ rep>=4 ⇔ 已掌握，兼容旧统计逻辑
export const SM2_DEFAULT_EASE = 2.5;
export const SM2_MIN_EASE = 1.3;
export const SM2_MAX_EASE = 2.5;

export const DAY_MS = 24 * 60 * 60 * 1000;

// 旧 Leitner 盒子 → 复习间隔（天），老数据回填与新排程共用
export const BOX_INTERVAL_DAYS: Record<number, number> = {
  1: 0,
  2: 1,
  3: 2,
  4: 4,
  5: 7,
  6: 15,
  7: 30
};

// 前 4 次连续答对的固定间隔（天）
const SM2_INITIAL_INTERVALS = [1, 2, 4, 7];

// 连续答对次数 → 展示用盒子（1~7）
export function boxFromRep(rep: number): number {
  return Math.max(1, Math.min(7, rep + 1));
}

// 根据连续答对次数与个人难度系数计算下一次复习间隔（天）
// rep=1..4 走固定间隔；rep>=5 起按 ease 乘算拉长（至少比上次多 1 天）
export function sm2NextInterval(rep: number, ease: number, prevInterval: number): number {
  if (rep >= 1 && rep <= SM2_INITIAL_INTERVALS.length) {
    return SM2_INITIAL_INTERVALS[rep - 1];
  }
  return Math.max(prevInterval + 1, Math.round(prevInterval * ease));
}

// 旧数据兼容：只有 box 的 Leitner 记录补齐 SM-2 字段（不改动已有调度时间）
function normalizeLegacy(p: WordProgress): void {
  if (p.rep === undefined || p.interval === undefined || p.ease === undefined) {
    const legacyRep = p.box && p.box >= 2 ? Math.min(p.box - 1, 6) : 0;
    p.rep = legacyRep;
    p.interval = BOX_INTERVAL_DAYS[p.box] || 0;
    p.ease = SM2_DEFAULT_EASE;
  }
}

export function recordWordProgress(
  bookId: string,
  word: string,
  known: boolean
): WordProgress {
  const all = getAllProgress(bookId);
  const now = Date.now();
  let p = all[word];

  if (!p) {
    p = {
      word,
      status: 'learning',
      box: 1,
      knownCount: 0,
      unknownCount: 0,
      nextReview: 0,
      lastSeen: 0,
      ease: SM2_DEFAULT_EASE,
      rep: 0,
      interval: 0
    };
  } else {
    normalizeLegacy(p);
  }

  if (known) {
    p.knownCount += 1;
  } else {
    p.unknownCount += 1;
  }
  p.lastSeen = now;

  if (!known) {
    // ─── 不认识：全面重置，立即可复习 ───
    p.rep = 0;
    p.interval = 0;
    p.ease = Math.max(SM2_MIN_EASE, (p.ease || SM2_DEFAULT_EASE) - 0.2);
    p.box = 1;
    p.status = 'learning';
    p.nextReview = now;
  } else {
    // ─── 认识：SM-2 排程 ───
    const ease = p.ease || SM2_DEFAULT_EASE;
    p.rep = (p.rep || 0) + 1;
    const interval = sm2NextInterval(p.rep, ease, p.interval || 0);
    p.interval = interval;
    p.ease = Math.min(SM2_MAX_EASE, ease + 0.05);
    p.box = boxFromRep(p.rep);

    // 更新展示状态（box >= 5 即算 mastered）
    if (p.box >= 5) {
      p.status = 'mastered';
    } else if (p.box >= 3) {
      p.status = 'review';
    } else {
      p.status = 'learning';
    }

    p.nextReview = now + interval * DAY_MS;
  }

  all[word] = p;
  saveAllProgress(bookId, all);
  queueProgressSync(bookId); // 静默排队上云，换机/清缓存不丢进度
  return p;
}

// 获取某词书的学习进度统计
export function getBookProgressStats(bookId: string) {
  const all = getAllProgress(bookId);
  const words = Object.values(all);
  let newCount = 0;
  let learningCount = 0;
  let reviewCount = 0;
  let masteredCount = 0;
  let knownCount = 0;      // 已学过的（box >= 2，即至少答对过一次）
  let dueCount = 0;
  const now = Date.now();
  for (const p of words) {
    // 基于 box 等级统计（box >= 5 即算 mastered）
    const box = p.box || 1;
    if (box >= 5) {
      masteredCount++;
    } else if (box >= 3) {
      reviewCount++;
    } else {
      learningCount++;
    }
    // 已学过 = 至少答对过一次（box >= 2）
    if (box >= 2) {
      knownCount++;
    }
    if (p.nextReview > 0 && p.nextReview <= now && box < 5) {
      dueCount++;
    }
  }
  return {
    total: words.length,
    newCount,
    learningCount,
    reviewCount,
    masteredCount,
    knownCount,   // 已学过（至少答对过一次）
    dueCount
  };
}

// ─── 进度云端同步 ─────────────────────────────────────────────
// 合并两份单词进度（按词取更优记录，SM-2 变体）：
//   - 学习深度更大者胜：连续答对次数 rep 优先，其次复习间隔 interval（天）
//   - 深度相同则取 lastSeen 较新者；旧 Leitner 记录按 box 回填后同规则比较
//   - known/unknown 累计取较大值，防止清缓存后回退
//   - 合并结果归一化：box/status 由 rep 推导，保证展示一致
// 注意：cloudfunctions/syncUser/index.js 的 mergeWordProgress 必须与这里保持同一策略
export function mergeProgress(
  local: Record<string, WordProgress>,
  cloud: Record<string, WordProgress>
): Record<string, WordProgress> {
  const out: Record<string, WordProgress> = {};
  const keys = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})]);
  for (const k of keys) {
    const l = local && local[k];
    const c = cloud && cloud[k];
    if (!l) { out[k] = c!; continue; }
    if (!c) { out[k] = l; continue; }
    normalizeLegacy(l);
    normalizeLegacy(c);
    const lScore = (l.rep || 0) * 1000 + (l.interval || 0);
    const cScore = (c.rep || 0) * 1000 + (c.interval || 0);
    let better: WordProgress;
    if (lScore !== cScore) {
      better = cScore > lScore ? c : l;
    } else {
      better = (c.lastSeen || 0) >= (l.lastSeen || 0) ? c : l;
    }
    // 归一化展示字段：box/status 由 rep 推导
    better.box = boxFromRep(better.rep || 0);
    better.status = better.box >= 5 ? 'mastered' : (better.box >= 3 ? 'review' : 'learning');
    out[k] = {
      ...better,
      knownCount: Math.max(l.knownCount || 0, c.knownCount || 0),
      unknownCount: Math.max(l.unknownCount || 0, c.unknownCount || 0)
    };
  }
  return out;
}

// 上传某词书进度到云端（服务端按同规则合并，返回合并结果后写回本地）
// 失败静默：本地永远是最可用的数据源，同步只是增强
export function syncProgressToCloud(bookId: string): Promise<void> {
  const data = getAllProgress(bookId);
  // 没有任何进度就不上传（新用户防误写）
  if (!Object.keys(data).length) return Promise.resolve();
  return callSyncUser({
    today: todayStr(),
    progressBookId: bookId,
    progress: data
  }).then(res => {
    if (res && res.progress && Object.keys(res.progress).length) {
      saveAllProgress(bookId, mergeProgress(getAllProgress(bookId), res.progress));
    }
  });
}

// 从云端拉取某词书进度并合并到本地（静默，失败不打扰）
let restoreProgressPending: Promise<void> | null = null;
export function restoreProgressFromCloud(bookId: string): Promise<void> {
  if (restoreProgressPending) return restoreProgressPending;
  if (!wx.cloud) return Promise.resolve();

  restoreProgressPending = callSyncUser({
    today: todayStr(),
    progressRequestBookId: bookId
  }).then(res => {
    if (res && res.progress && Object.keys(res.progress).length) {
      saveAllProgress(bookId, mergeProgress(getAllProgress(bookId), res.progress));
    }
  }).then(() => { restoreProgressPending = null; });

  return restoreProgressPending;
}

// 学习过程中自动排队同步：8 秒去抖，避免每答一题就调一次云函数
let progressSyncTimer: any = null;
export function queueProgressSync(bookId: string): void {
  if (!wx.cloud) return;
  if (progressSyncTimer) clearTimeout(progressSyncTimer);
  progressSyncTimer = setTimeout(() => {
    progressSyncTimer = null;
    syncProgressToCloud(bookId).catch(() => {});
  }, 8000);
}

// ─── 生词本 ──────────────────────────────────────────────────
const WRONG_BOOK_KEY = 'bc_wrong_book';

// 生词本条目
export interface WrongBookItem {
  word: string;
  meaning: string;
  bookId: string;     // 来源词书
  addedAt: number;    // 添加时间戳
}

// 获取生词本
export function getWrongBook(): WrongBookItem[] {
  return wx.getStorageSync(WRONG_BOOK_KEY) || [];
}

// 添加生词到生词本（去重）
export function addToWrongBook(word: string, meaning: string, bookId: string): void {
  const list = getWrongBook();
  if (list.some(item => item.word === word)) return;
  list.push({ word, meaning, bookId, addedAt: Date.now() });
  wx.setStorageSync(WRONG_BOOK_KEY, list);
  queueWrongBookSync();
}

// 从生词本移除
export function removeFromWrongBook(word: string): void {
  const list = getWrongBook().filter(item => item.word !== word);
  wx.setStorageSync(WRONG_BOOK_KEY, list);
  queueWrongBookSync();
}

// 清空生词本
export function clearWrongBook(): void {
  wx.setStorageSync(WRONG_BOOK_KEY, []);
  queueWrongBookSync(); // 空列表也会上传，云端同步清空
}

// ─── 生词本云端同步（与进度同步同模式）───────────────────────────
// 合并策略：按 word 取并集，同一词取 addedAt 较新的一条
export function mergeWrongBook(
  local: WrongBookItem[],
  cloud: WrongBookItem[]
): WrongBookItem[] {
  const out = new Map<string, WrongBookItem>();
  for (const it of [...(local || []), ...(cloud || [])]) {
    const prev = out.get(it.word);
    if (!prev || (it.addedAt || 0) >= (prev.addedAt || 0)) out.set(it.word, it);
  }
  return Array.from(out.values());
}

// 上传整份生词本到云端，返回云端已有内容供本地并集合并
// 采用整表覆盖式写回：移除/清空才能正确同步到云端
export function syncWrongBookToCloud(): Promise<void> {
  if (!wx.cloud) return Promise.resolve();
  return callSyncUser({
    today: todayStr(),
    wrongBook: getWrongBook()
  }).then(res => {
    if (res && Array.isArray(res.wrongBook)) {
      const merged = mergeWrongBook(getWrongBook(), res.wrongBook);
      wx.setStorageSync(WRONG_BOOK_KEY, merged);
    }
  });
}

// 学习中静默排队同步：去抖，避免频繁调云函数
let wrongBookSyncTimer: any = null;
function queueWrongBookSync(): void {
  if (!wx.cloud) return;
  if (wrongBookSyncTimer) clearTimeout(wrongBookSyncTimer);
  wrongBookSyncTimer = setTimeout(() => {
    wrongBookSyncTimer = null;
    syncWrongBookToCloud().catch(() => {});
  }, 8000);
}

// 从云端拉取生词本并合并到本地（启动时调用；失败静默）
let restoreWrongBookPending: Promise<void> | null = null;
export function restoreWrongBookFromCloud(): Promise<void> {
  if (restoreWrongBookPending) return restoreWrongBookPending;
  if (!wx.cloud) return Promise.resolve();

  restoreWrongBookPending = callSyncUser({
    today: todayStr(),
    wrongBookRequest: true
  }).then(res => {
    if (res && Array.isArray(res.wrongBook) && res.wrongBook.length) {
      const merged = mergeWrongBook(getWrongBook(), res.wrongBook);
      wx.setStorageSync(WRONG_BOOK_KEY, merged);
    }
  }).then(() => { restoreWrongBookPending = null; });

  return restoreWrongBookPending;
}

// ─── 学习提醒已下线（2026-08-31：微信一次性订阅机制，需每次学完重复授权，体验繁琐；代码注释保留，随时可恢复） ───
// const SUBSCRIBE_KEY = 'bc_reminder_subscribed';
//
// // ⚠️ 替换为你自己在微信公众平台创建的订阅消息模板 ID
// export const REMINDER_TEMPLATE_ID = '_NbJeeBuWsnMnvNDljQ7fS4WZSepxC9THCQx4zeo3-A';
//
// // 用户是否已授权订阅学习提醒
// export function isReminderSubscribed(): boolean {
//   return wx.getStorageSync(SUBSCRIBE_KEY) === true;
// }
//
// // 标记用户已授权订阅
// export function setReminderSubscribed(val: boolean): void {
//   wx.setStorageSync(SUBSCRIBE_KEY, val);
// }
//
// // 请求用户授权订阅学习提醒
// export function requestReminderSubscribe(): Promise<boolean> {
//   return new Promise((resolve) => {
//     if (!wx.requestSubscribeMessage) {
//       // 低版本不支持
//       resolve(false);
//       return;
//     }
//     wx.requestSubscribeMessage({
//       tmplIds: [REMINDER_TEMPLATE_ID],
//       success: (res: any) => {
//         const accepted = res[REMINDER_TEMPLATE_ID] === 'accept';
//         setReminderSubscribed(accepted);
//         // 同步云端（sendReminder 每日扫描依据），静默失败
//         setReminderSubscribedCloud(accepted);
//         resolve(accepted);
//       },
//       fail: () => {
//         resolve(false);
//       }
//     });
//   });
// }
//
// // 云端记录每日提醒订阅状态（经 syncUser 写入 users 文档，sendReminder 每日扫描用）
// export function setReminderSubscribedCloud(val: boolean): void {
//   if (!wx.cloud) return;
//   callSyncUser({ reminderSubscribed: val, today: todayStr() }).catch(() => {});
// }

// ⚠️ 每周学习周报模板 ID（微信公众平台「订阅消息」单独申请）
//    个人主体可选「学习/教育」相关模板；字段名以你申请到的模板为准
export const WEEKLY_TEMPLATE_ID = 'HKofr7-lr1w8swoa-p7M-pyNRPMRXxbSuSSWrIjKl-I';

// ─── 每周学习周报已下线（2026-08-31：模板体验不佳；代码注释保留，模板可用后恢复） ───
// const WEEKLY_SUBSCRIBE_KEY = 'bc_weekly_subscribed';
//
// export function isWeeklySubscribed(): boolean {
//   return wx.getStorageSync(WEEKLY_SUBSCRIBE_KEY) === true;
// }
//
// export function setWeeklySubscribed(val: boolean): void {
//   wx.setStorageSync(WEEKLY_SUBSCRIBE_KEY, val);
// }
//
// // 请求授权每周周报；授权成功后云端记录（sendReminder 周报扫描用）
// export function requestWeeklySubscribe(): Promise<boolean> {
//   return new Promise((resolve) => {
//     if (!wx.requestSubscribeMessage) {
//       resolve(false);
//       return;
//     }
//     wx.requestSubscribeMessage({
//       tmplIds: [WEEKLY_TEMPLATE_ID],
//       success: (res: any) => {
//         const accepted = res[WEEKLY_TEMPLATE_ID] === 'accept';
//         setWeeklySubscribed(accepted);
//         if (accepted) setWeeklySubscribedCloud(true);
//         resolve(accepted);
//       },
//       fail: () => {
//         resolve(false);
//       }
//     });
//   });
// }
//
// // 云端记录订阅状态（经 syncUser 写入 users 文档，静默失败）
// export function setWeeklySubscribedCloud(val: boolean): void {
//   if (!wx.cloud) return;
//   callSyncUser({ weeklySubscribed: val, today: todayStr() }).catch(() => {});
// }

// ─── 今日复习计划（SM-2 排程可视化） ──────────────────────
// 把间隔记忆算法变成用户可感知的「为什么今天复习这些词」
// 复习理由直接引用每个词的真实排程间隔（interval），而非固定盒子映射

export interface ReviewPlanItem {
  word: string;
  box: number;
  lastSeen: number;
  overdueDays: number; // 已逾期天数（0=未逾期，今天到期）
  interval: number;    // 当前复习间隔（天）
  reason: string;      // 为什么今天复习它
}

export interface BoxStat {
  box: number;
  label: string;        // 盒子名称（起步盒/巩固中...）
  intervalDesc: string; // 该盒对应复习间隔说明
  count: number;
  mastered: boolean;    // 该盒是否算已掌握区（box>=5）
}

export interface ReviewPlan {
  totalLearned: number;   // 该词书已学词数（box>=2 或有记录）
  dueToday: number;       // 今天到期需复习数
  masteredCount: number;  // 已掌握数（box>=5）
  boxDist: BoxStat[];     // 各盒子分布
  dueList: ReviewPlanItem[]; // 今日到期词（最多50个，逾期多的优先）
  forecast: { label: string; count: number }[]; // 未来7天每日预计到期数
}

const PLAN_BOX_LABELS: Record<number, { label: string; intervalDesc: string }> = {
  1: { label: '第1盒 · 起步', intervalDesc: '当天内再次出现' },
  2: { label: '第2盒', intervalDesc: '隔1天复习' },
  3: { label: '第3盒', intervalDesc: '隔2天复习' },
  4: { label: '第4盒', intervalDesc: '隔4天复习' },
  5: { label: '第5盒 · 巩固', intervalDesc: '隔7天复习' },
  6: { label: '第6盒', intervalDesc: '隔15天以上（按个人节奏）' },
  7: { label: '第7盒 · 长期', intervalDesc: '隔30天以上 · 长期记忆' }
};

const DAY_MS2 = 24 * 60 * 60 * 1000;

function daysBetween(from: number, to: number): number {
  return Math.floor((to - from) / DAY_MS2);
}

export function getReviewPlan(bookId: string): ReviewPlan {
  const all = getAllProgress(bookId);
  const now = Date.now();

  const boxCounts: Record<number, number> = {};
  const dueList: ReviewPlanItem[] = [];
  const forecast = Array.from({ length: 8 }, () => 0); // [0]=今日, [1..7]=未来7天
  let masteredCount = 0;
  let totalLearned = 0;

  for (const p of Object.values(all)) {
    const box = p.box || 1;
    boxCounts[box] = (boxCounts[box] || 0) + 1;
    if (box >= 2) totalLearned++;
    if (box >= 5) { masteredCount++; }

    const meta = PLAN_BOX_LABELS[box] || PLAN_BOX_LABELS[1];
    const isMasteredZone = box >= 5;

    if (p.nextReview > 0 && p.nextReview <= now && !isMasteredZone) {
      // 到期：生成复习理由（引用真实排程间隔）
      const overDays = daysBetween(p.nextReview, now);
      const intervalDays = p.interval || BOX_INTERVAL_DAYS[box] || 0;
      let reason: string;
      if (box === 1 && p.unknownCount > 0 && p.knownCount === 0) {
        reason = '上次没答对，已回到起步盒，今天就再认一次';
      } else if (box === 1) {
        reason = '在巩固盒里重新出发，今天再见面加深印象';
      } else if (overDays > 0) {
        reason = `已进入${meta.label}（本次间隔 ${intervalDays} 天），比计划晚了 ${overDays} 天，优先安排`;
      } else {
        reason = `已进入${meta.label}（本次间隔 ${intervalDays} 天），今天正好到期`;
      }
      dueList.push({
        word: p.word,
        box,
        lastSeen: p.lastSeen || 0,
        overdueDays: Math.max(overDays, 0),
        interval: intervalDays,
        reason
      });
      forecast[0]++;
    } else if (!isMasteredZone && p.nextReview > now) {
      const d = daysBetween(now, p.nextReview);
      if (d >= 1 && d <= 7) forecast[d]++;
    }
  }

  // 排序：逾期多的在前，其次盒子高的（接近掌握的先巩固）
  dueList.sort((a, b) =>
    b.overdueDays - a.overdueDays || b.box - a.box ||
    a.word.localeCompare(b.word)
  );

  const boxDist: BoxStat[] = [];
  for (let b = 1; b <= 7; b++) {
    const meta = PLAN_BOX_LABELS[b];
    boxDist.push({
      box: b,
      ...meta,
      count: boxCounts[b] || 0,
      mastered: b >= 5
    });
  }

  const dayLabels = ['今天', '明天', '后天'];
  return {
    totalLearned,
    dueToday: forecast[0],
    masteredCount,
    boxDist,
    dueList: dueList.slice(0, 50),
    forecast: forecast.slice(1, 8).map((count, i) => ({
      label: i < 2 ? dayLabels[i + 1] : `${i + 1}天后`,
      count
    }))
  };
}
