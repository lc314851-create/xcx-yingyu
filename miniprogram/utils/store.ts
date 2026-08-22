// utils/store.ts
// 本地存储管理：学习进度 / 间隔记忆 / 打卡 / 词书选择
// 统一 key 命名空间前缀 "bc_"（补词），避免与其他小程序数据冲突

// ─── 类型 ─────────────────────────────────────────────────────
// 单个单词的掌握状态（Leitner 盒子间隔记忆系统）
// box 1~6 对应复习间隔：0(立即) / 1天 / 2天 / 4天 / 7天 / 15天 / 30天(mastered)
export interface WordProgress {
  word: string;        // 单词
  status: 'new' | 'learning' | 'review' | 'mastered'; // 状态（用于统计展示）
  box: number;          // Leitner 盒子等级 1~6（6=mastered）
  knownCount: number;  // 累计认识次数
  unknownCount: number;// 累计不认识次数
  nextReview: number;  // 下次复习时间戳（ms）
  lastSeen: number;    // 上次学习时间戳
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
  // 清理超过 60 天的旧数据，避免无限增长
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = formatDate(cutoff);
  for (const key of Object.keys(history)) {
    if (key < cutoffStr) delete history[key];
  }
  wx.setStorageSync(DAILY_HISTORY_KEY, history);
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
export function recordStudy(count: number = 1): StudyStats {
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
  stats.totalWords += count;
  saveStats(stats);
  recordDailyHistory(count);
  return stats;
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

// 记录单词学习状态，更新间隔记忆
// known: true=认识, false=不认识
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
      lastSeen: 0
    };
  }

  if (known) {
    p.knownCount += 1;
  } else {
    p.unknownCount += 1;
  }
  p.lastSeen = now;

  // ─── Leitner 盒子系统 ──────────────────────────────────
  // 盒子 → 复习间隔（ms）
  //   1 → 0（立即/今天内再出现）
  //   2 → 1天
  //   3 → 2天
  //   4 → 4天
  //   5 → 7天  ← box >= 5 即算 mastered（连续答对 4 次跨度 7 天）
  //   6 → 15天（mastered 巩固期）
  //   7 → 30天（长期巩固）
  const DAY = 24 * 60 * 60 * 1000;
  const BOX_INTERVALS: Record<number, number> = {
    1: 0,
    2: 1 * DAY,
    3: 2 * DAY,
    4: 4 * DAY,
    5: 7 * DAY,
    6: 15 * DAY,
    7: 30 * DAY
  };

  if (!known) {
    // 不认识：退回盒子1，立即可复习
    p.box = 1;
    p.status = 'learning';
    p.nextReview = now; // 立即可复习
  } else {
    // 认识：升一级盒子
    if (!p.box || p.box < 1) p.box = 1;
    p.box = Math.min(p.box + 1, 7);

    // 更新展示状态（box >= 5 即算 mastered）
    if (p.box >= 5) {
      p.status = 'mastered';
    } else if (p.box >= 3) {
      p.status = 'review';
    } else {
      p.status = 'learning';
    }

    const interval = BOX_INTERVALS[p.box] || 0;
    p.nextReview = interval > 0 ? now + interval : now;
  }

  all[word] = p;
  saveAllProgress(bookId, all);
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
}

// 从生词本移除
export function removeFromWrongBook(word: string): void {
  const list = getWrongBook().filter(item => item.word !== word);
  wx.setStorageSync(WRONG_BOOK_KEY, list);
}

// 清空生词本
export function clearWrongBook(): void {
  wx.setStorageSync(WRONG_BOOK_KEY, []);
}

// ─── 订阅消息提醒 ─────────────────────────────────────────────
const SUBSCRIBE_KEY = 'bc_reminder_subscribed';

// ⚠️ 替换为你自己在微信公众平台创建的订阅消息模板 ID
export const REMINDER_TEMPLATE_ID = 'your_template_id_here';

// 用户是否已授权订阅学习提醒
export function isReminderSubscribed(): boolean {
  return wx.getStorageSync(SUBSCRIBE_KEY) === true;
}

// 标记用户已授权订阅
export function setReminderSubscribed(val: boolean): void {
  wx.setStorageSync(SUBSCRIBE_KEY, val);
}

// 请求用户授权订阅学习提醒
export function requestReminderSubscribe(): Promise<boolean> {
  return new Promise((resolve) => {
    if (!wx.requestSubscribeMessage) {
      // 低版本不支持
      resolve(false);
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: [REMINDER_TEMPLATE_ID],
      success: (res: any) => {
        const accepted = res[REMINDER_TEMPLATE_ID] === 'accept';
        setReminderSubscribed(accepted);
        resolve(accepted);
      },
      fail: () => {
        resolve(false);
      }
    });
  });
}
