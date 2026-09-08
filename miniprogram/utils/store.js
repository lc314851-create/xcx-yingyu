"use strict";
// utils/store.ts
// 本地存储管理：学习进度 / 间隔记忆（SM-2 变体）/ 打卡 / 词书选择
// 统一 key 命名空间前缀 "bc_"（补词），避免与其他小程序数据冲突
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WEEKLY_TEMPLATE_ID = exports.BOX_INTERVAL_DAYS = exports.DAY_MS = exports.SM2_MAX_EASE = exports.SM2_MIN_EASE = exports.SM2_DEFAULT_EASE = void 0;
exports.formatDate = formatDate;
exports.todayStr = todayStr;
exports.mondayStr = mondayStr;
exports.getDailyHistory = getDailyHistory;
exports.recordDailyHistory = recordDailyHistory;
exports.saveDailyHistory = saveDailyHistory;
exports.mergeDailyHistory = mergeDailyHistory;
exports.getHeatmapData = getHeatmapData;
exports.getStats = getStats;
exports.saveStats = saveStats;
exports.recordStudy = recordStudy;
exports.mergeStats = mergeStats;
exports.getLocalProfile = getLocalProfile;
exports.saveLocalProfile = saveLocalProfile;
exports.syncStatsToCloud = syncStatsToCloud;
exports.restoreStatsFromCloud = restoreStatsFromCloud;
exports.updateUserProfile = updateUserProfile;
exports.doCheckIn = doCheckIn;
exports.hasSelectedBook = hasSelectedBook;
exports.getCurrentBookId = getCurrentBookId;
exports.setCurrentBookId = setCurrentBookId;
exports.getBatchSize = getBatchSize;
exports.setBatchSize = setBatchSize;
exports.getStudyMode = getStudyMode;
exports.setStudyMode = setStudyMode;
exports.getPracticeMode = getPracticeMode;
exports.setPracticeMode = setPracticeMode;
exports.getAccent = getAccent;
exports.setAccent = setAccent;
exports.getProgressKey = getProgressKey;
exports.getAllProgress = getAllProgress;
exports.saveAllProgress = saveAllProgress;
exports.boxFromRep = boxFromRep;
exports.sm2NextInterval = sm2NextInterval;
exports.recordWordProgress = recordWordProgress;
exports.getBookProgressStats = getBookProgressStats;
exports.mergeProgress = mergeProgress;
exports.syncProgressToCloud = syncProgressToCloud;
exports.restoreProgressFromCloud = restoreProgressFromCloud;
exports.queueProgressSync = queueProgressSync;
exports.getWrongBook = getWrongBook;
exports.addToWrongBook = addToWrongBook;
exports.removeFromWrongBook = removeFromWrongBook;
exports.clearWrongBook = clearWrongBook;
exports.mergeWrongBook = mergeWrongBook;
exports.syncWrongBookToCloud = syncWrongBookToCloud;
exports.restoreWrongBookFromCloud = restoreWrongBookFromCloud;
exports.getReviewPlan = getReviewPlan;
// 默认统计
function defaultStats() {
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
function formatDate(d) {
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return "".concat(y, "-").concat(m, "-").concat(day);
}
// 获取今天日期字符串
function todayStr() {
    return formatDate(new Date());
}
// 获取本周一日期字符串（以周一为一周起始）
function mondayStr(d) {
    if (d === void 0) { d = new Date(); }
    var date = new Date(d);
    var day = date.getDay() || 7; // 周日是 0，转为 7
    var monday = new Date(date);
    monday.setDate(date.getDate() - day + 1);
    return formatDate(monday);
}
// 判断两个日期是否是连续的（昨天 → 今天）
function isConsecutive(prev, cur) {
    var prevDate = new Date(prev + 'T00:00:00');
    var curDate = new Date(cur + 'T00:00:00');
    var diff = (curDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
    return diff === 1;
}
// ─── 每日学习记录（用于热力图） ────────────────────────────────
var DAILY_HISTORY_KEY = 'bc_daily_history';
// 获取每日学习历史（Record<'YYYY-MM-DD', count>）
function getDailyHistory() {
    return wx.getStorageSync(DAILY_HISTORY_KEY) || {};
}
// 记录每日学习量
function recordDailyHistory(count) {
    if (count === void 0) { count = 1; }
    var history = getDailyHistory();
    var today = todayStr();
    history[today] = (history[today] || 0) + count;
    saveDailyHistory(history);
}
// 保存每日学习历史（供云端同步后写回）
function saveDailyHistory(history) {
    // 清理超过 90 天的旧数据，避免无限增长
    var cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    var cutoffStr = formatDate(cutoff);
    for (var _i = 0, _a = Object.keys(history); _i < _a.length; _i++) {
        var key = _a[_i];
        if (key < cutoffStr)
            delete history[key];
    }
    wx.setStorageSync(DAILY_HISTORY_KEY, history);
}
// 合并两份每日历史（同一天取较大值，绝不相加，防重复累计）
function mergeDailyHistory(a, b) {
    var out = {};
    for (var _i = 0, _a = Object.keys(a || {}); _i < _a.length; _i++) {
        var k = _a[_i];
        out[k] = a[k] || 0;
    }
    for (var _b = 0, _c = Object.keys(b || {}); _b < _c.length; _b++) {
        var k = _c[_b];
        out[k] = Math.max(out[k] || 0, b[k] || 0);
    }
    return out;
}
// 获取最近 N 天的热力图数据
function getHeatmapData(days) {
    if (days === void 0) { days = 30; }
    var history = getDailyHistory();
    var result = [];
    var now = new Date();
    for (var i = days - 1; i >= 0; i--) {
        var d = new Date(now);
        d.setDate(d.getDate() - i);
        var dateStr = formatDate(d);
        var count = history[dateStr] || 0;
        // 分级：0=未学习, 1=1-5, 2=6-15, 3=16-30, 4=30+
        var level = 0;
        if (count >= 30)
            level = 4;
        else if (count >= 16)
            level = 3;
        else if (count >= 6)
            level = 2;
        else if (count >= 1)
            level = 1;
        result.push({ date: dateStr, count: count, level: level });
    }
    return result;
}
// ─── 统计 ──────────────────────────────────────────────────────
var STATS_KEY = 'bc_stats';
function getStats() {
    var s = wx.getStorageSync(STATS_KEY);
    if (!s)
        return defaultStats();
    return __assign(__assign({}, defaultStats()), s);
}
function saveStats(s) {
    wx.setStorageSync(STATS_KEY, s);
}
// 当用户学习一个词时，更新统计
// isNewWord：是否首次学的新词。仅新词计入“累计单词 totalWords”；
// 复习/巩固/挑战/练习等重复学习只计入今日/本周学习量与打卡，不计累计单词。
function recordStudy(count, isNewWord) {
    if (count === void 0) { count = 1; }
    if (isNewWord === void 0) { isNewWord = true; }
    var stats = getStats();
    var today = todayStr();
    var monday = mondayStr();
    // 如果是新的一天
    if (stats.lastStudyDate !== today) {
        // 检查是否连续
        if (stats.lastStudyDate && isConsecutive(stats.lastStudyDate, today)) {
            stats.streakDays += 1;
        }
        else if (!stats.lastStudyDate) {
            // 首次学习
            stats.streakDays = 1;
        }
        else {
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
function mergeStats(local, cloud) {
    var today = todayStr();
    return __assign(__assign(__assign({}, defaultStats()), local), { totalWords: Math.max(local.totalWords || 0, cloud.totalWords || 0), streakDays: Math.max(local.streakDays || 0, cloud.streakDays || 0), learnedToday: local.lastStudyDate === today
            ? local.learnedToday
            : (cloud.lastStudyDate === today ? (cloud.learnedToday || 0) : 0), weeklyLearned: local.lastStudyDate === today
            ? local.weeklyLearned
            : Math.max(local.weeklyLearned || 0, cloud.weeklyLearned || 0), checkedIn: local.lastStudyDate === today
            ? local.checkedIn
            : (cloud.lastStudyDate === today ? cloud.checkedIn : false), lastStudyDate: (local.lastStudyDate || '') >= (cloud.lastStudyDate || '')
            ? local.lastStudyDate
            : cloud.lastStudyDate, weeklyStart: local.weeklyStart || cloud.weeklyStart || '' });
}
// ─── 云端同步（经 syncUser 云函数，服务端权限，可读全量并自动去重合并） ───
// 用户资料
var PROFILE_KEY = 'bc_profile';
function getLocalProfile() {
    return wx.getStorageSync(PROFILE_KEY) || { nickname: '', avatarUrl: '' };
}
function saveLocalProfile(p) {
    wx.setStorageSync(PROFILE_KEY, p);
}
// 调 syncUser 云函数（服务端合并统计+资料、自动去重）
function callSyncUser(event) {
    if (!wx.cloud)
        return Promise.resolve(null);
    return wx.cloud
        .callFunction({ name: 'syncUser', data: event })
        .then(function (res) { return (res && res.result) || null; })
        .catch(function (err) {
        console.error('syncUser 失败', err);
        return null;
    });
}
// 上传统计与学习日历到云端（服务端合并取较大值，并把合并结果同步回本地）
function syncStatsToCloud(stats) {
    return callSyncUser({ stats: stats, history: getDailyHistory(), today: todayStr() }).then(function (res) {
        if (res && res.stats) {
            var merged = mergeStats(getStats(), res.stats);
            saveStats(merged);
            if (res.history)
                saveDailyHistory(res.history);
            if (res.profile)
                saveLocalProfile(res.profile);
            return merged;
        }
        return null;
    });
}
// 从云端拉取统计与资料并合并回本地（静默，失败不打扰）
// 单例锁：防止首页/我的页并发触发多次拉取
var restorePending = null;
function restoreStatsFromCloud() {
    if (restorePending)
        return restorePending;
    if (!wx.cloud)
        return Promise.resolve();
    restorePending = callSyncUser({ today: todayStr() }).then(function (res) {
        if (res) {
            if (res.stats)
                saveStats(mergeStats(getStats(), res.stats));
            if (res.history)
                saveDailyHistory(mergeDailyHistory(getDailyHistory(), res.history));
            if (res.profile)
                saveLocalProfile(res.profile);
        }
    }).then(function () { restorePending = null; });
    return restorePending;
}
// 保存用户资料（头像需先由调用方上传为云存储 fileID）
function updateUserProfile(nickname, avatarUrl) {
    return callSyncUser({ nickname: nickname, avatarUrl: avatarUrl, today: todayStr() }).then(function (res) {
        if (res && res.profile) {
            saveLocalProfile(res.profile);
            return res.profile;
        }
        return null;
    });
}
// ─── 打卡 ──────────────────────────────────────────────────────
function doCheckIn() {
    var stats = getStats();
    var today = todayStr();
    // 如果是新的一天，重置打卡状态
    if (stats.lastStudyDate !== today) {
        if (stats.lastStudyDate && isConsecutive(stats.lastStudyDate, today)) {
            stats.streakDays += 1;
        }
        else if (!stats.lastStudyDate) {
            stats.streakDays = 1;
        }
        else {
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
var BOOK_KEY = 'bc_current_book';
var BOOK_CHOSEN_KEY = 'bc_book_chosen';
// 用户是否已经主动选过词书（区分"默认初中"和"用户主动选了初中"）
function hasSelectedBook() {
    return wx.getStorageSync(BOOK_CHOSEN_KEY) === true;
}
function getCurrentBookId() {
    return wx.getStorageSync(BOOK_KEY) || 'junior';
}
function setCurrentBookId(id) {
    wx.setStorageSync(BOOK_KEY, id);
    wx.setStorageSync(BOOK_CHOSEN_KEY, true);
}
// ─── 学习模式（高频词 / 完整） ─────────────────────────────────
var BATCH_SIZE_KEY = 'bc_batch_size';
function getBatchSize() {
    return wx.getStorageSync(BATCH_SIZE_KEY) || 10;
}
function setBatchSize(n) {
    wx.setStorageSync(BATCH_SIZE_KEY, n);
}
var STUDY_MODE_KEY = 'bc_study_mode';
function getStudyMode() {
    return wx.getStorageSync(STUDY_MODE_KEY) || 'all';
}
function setStudyMode(mode) {
    wx.setStorageSync(STUDY_MODE_KEY, mode);
}
// ─── 练习模式（卡片翻面 / 四选一 / 拼写） ──────────────────────
var PRACTICE_MODE_KEY = 'bc_practice_mode';
function getPracticeMode() {
    return wx.getStorageSync(PRACTICE_MODE_KEY) || 'card';
}
function setPracticeMode(mode) {
    wx.setStorageSync(PRACTICE_MODE_KEY, mode);
}
// ─── 发音偏好（英音 / 美音） ───────────────────────────────────
var ACCENT_KEY = 'bc_accent';
function getAccent() {
    return wx.getStorageSync(ACCENT_KEY) || 'us';
}
function setAccent(accent) {
    wx.setStorageSync(ACCENT_KEY, accent);
}
// ─── 单词进度（间隔记忆） ──────────────────────────────────────
// 每个词书有独立的进度 key
function getProgressKey(bookId) {
    return "bc_progress_".concat(bookId);
}
// 获取某词书的全部进度
function getAllProgress(bookId) {
    return wx.getStorageSync(getProgressKey(bookId)) || {};
}
// 保存某词书全部进度
function saveAllProgress(bookId, data) {
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
exports.SM2_DEFAULT_EASE = 2.5;
exports.SM2_MIN_EASE = 1.3;
exports.SM2_MAX_EASE = 2.5;
exports.DAY_MS = 24 * 60 * 60 * 1000;
// 旧 Leitner 盒子 → 复习间隔（天），老数据回填与新排程共用
exports.BOX_INTERVAL_DAYS = {
    1: 0,
    2: 1,
    3: 2,
    4: 4,
    5: 7,
    6: 15,
    7: 30
};
// 前 4 次连续答对的固定间隔（天）
var SM2_INITIAL_INTERVALS = [1, 2, 4, 7];
// 连续答对次数 → 展示用盒子（1~7）
function boxFromRep(rep) {
    return Math.max(1, Math.min(7, rep + 1));
}
// 根据连续答对次数与个人难度系数计算下一次复习间隔（天）
// rep=1..4 走固定间隔；rep>=5 起按 ease 乘算拉长（至少比上次多 1 天）
function sm2NextInterval(rep, ease, prevInterval) {
    if (rep >= 1 && rep <= SM2_INITIAL_INTERVALS.length) {
        return SM2_INITIAL_INTERVALS[rep - 1];
    }
    return Math.max(prevInterval + 1, Math.round(prevInterval * ease));
}
// 旧数据兼容：只有 box 的 Leitner 记录补齐 SM-2 字段（不改动已有调度时间）
function normalizeLegacy(p) {
    if (p.rep === undefined || p.interval === undefined || p.ease === undefined) {
        var legacyRep = p.box && p.box >= 2 ? Math.min(p.box - 1, 6) : 0;
        p.rep = legacyRep;
        p.interval = exports.BOX_INTERVAL_DAYS[p.box] || 0;
        p.ease = exports.SM2_DEFAULT_EASE;
    }
}
function recordWordProgress(bookId, word, known) {
    var all = getAllProgress(bookId);
    var now = Date.now();
    var p = all[word];
    if (!p) {
        p = {
            word: word,
            status: 'learning',
            box: 1,
            knownCount: 0,
            unknownCount: 0,
            nextReview: 0,
            lastSeen: 0,
            ease: exports.SM2_DEFAULT_EASE,
            rep: 0,
            interval: 0
        };
    }
    else {
        normalizeLegacy(p);
    }
    if (known) {
        p.knownCount += 1;
    }
    else {
        p.unknownCount += 1;
    }
    p.lastSeen = now;
    if (!known) {
        // ─── 不认识：全面重置，立即可复习 ───
        p.rep = 0;
        p.interval = 0;
        p.ease = Math.max(exports.SM2_MIN_EASE, (p.ease || exports.SM2_DEFAULT_EASE) - 0.2);
        p.box = 1;
        p.status = 'learning';
        p.nextReview = now;
    }
    else {
        // ─── 认识：SM-2 排程 ───
        var ease = p.ease || exports.SM2_DEFAULT_EASE;
        p.rep = (p.rep || 0) + 1;
        var interval = sm2NextInterval(p.rep, ease, p.interval || 0);
        p.interval = interval;
        p.ease = Math.min(exports.SM2_MAX_EASE, ease + 0.05);
        p.box = boxFromRep(p.rep);
        // 更新展示状态（box >= 5 即算 mastered）
        if (p.box >= 5) {
            p.status = 'mastered';
        }
        else if (p.box >= 3) {
            p.status = 'review';
        }
        else {
            p.status = 'learning';
        }
        // 排期锚定到自然日零点（而非答题时刻）：今天无论几点答对，
        // 明天 0 点起即到期。否则每天打卡时间有早晚波动时，
        // 每个复习周期会被实际拉长一天，导致“已掌握”迟迟无法达成
        var dayStart = new Date(now);
        dayStart.setHours(0, 0, 0, 0);
        p.nextReview = dayStart.getTime() + interval * exports.DAY_MS;
    }
    all[word] = p;
    saveAllProgress(bookId, all);
    queueProgressSync(bookId); // 静默排队上云，换机/清缓存不丢进度
    return p;
}
// 获取某词书的学习进度统计
function getBookProgressStats(bookId) {
    var all = getAllProgress(bookId);
    var words = Object.values(all);
    var newCount = 0;
    var learningCount = 0;
    var reviewCount = 0;
    var masteredCount = 0;
    var knownCount = 0; // 已学过的（box >= 2，即至少答对过一次）
    var dueCount = 0;
    var now = Date.now();
    for (var _i = 0, words_1 = words; _i < words_1.length; _i++) {
        var p = words_1[_i];
        // 基于 box 等级统计（box >= 5 即算 mastered）
        var box = p.box || 1;
        if (box >= 5) {
            masteredCount++;
        }
        else if (box >= 3) {
            reviewCount++;
        }
        else {
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
        newCount: newCount,
        learningCount: learningCount,
        reviewCount: reviewCount,
        masteredCount: masteredCount,
        knownCount: knownCount, // 已学过（至少答对过一次）
        dueCount: dueCount
    };
}
// ─── 进度云端同步 ─────────────────────────────────────────────
// 合并两份单词进度（按词取更优记录，SM-2 变体）：
//   - 学习深度更大者胜：连续答对次数 rep 优先，其次复习间隔 interval（天）
//   - 深度相同则取 lastSeen 较新者；旧 Leitner 记录按 box 回填后同规则比较
//   - known/unknown 累计取较大值，防止清缓存后回退
//   - 合并结果归一化：box/status 由 rep 推导，保证展示一致
// 注意：cloudfunctions/syncUser/index.js 的 mergeWordProgress 必须与这里保持同一策略
function mergeProgress(local, cloud) {
    var out = {};
    var keys = new Set(__spreadArray(__spreadArray([], Object.keys(local || {}), true), Object.keys(cloud || {}), true));
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var k = keys_1[_i];
        var l = local && local[k];
        var c = cloud && cloud[k];
        if (!l) {
            out[k] = c;
            continue;
        }
        if (!c) {
            out[k] = l;
            continue;
        }
        normalizeLegacy(l);
        normalizeLegacy(c);
        var lScore = (l.rep || 0) * 1000 + (l.interval || 0);
        var cScore = (c.rep || 0) * 1000 + (c.interval || 0);
        var better = void 0;
        if (lScore !== cScore) {
            better = cScore > lScore ? c : l;
        }
        else {
            better = (c.lastSeen || 0) >= (l.lastSeen || 0) ? c : l;
        }
        // 归一化展示字段：box/status 由 rep 推导
        better.box = boxFromRep(better.rep || 0);
        better.status = better.box >= 5 ? 'mastered' : (better.box >= 3 ? 'review' : 'learning');
        out[k] = __assign(__assign({}, better), { knownCount: Math.max(l.knownCount || 0, c.knownCount || 0), unknownCount: Math.max(l.unknownCount || 0, c.unknownCount || 0) });
    }
    return out;
}
// 上传某词书进度到云端（服务端按同规则合并，返回合并结果后写回本地）
// 失败静默：本地永远是最可用的数据源，同步只是增强
function syncProgressToCloud(bookId) {
    var data = getAllProgress(bookId);
    // 没有任何进度就不上传（新用户防误写）
    if (!Object.keys(data).length)
        return Promise.resolve();
    return callSyncUser({
        today: todayStr(),
        progressBookId: bookId,
        progress: data
    }).then(function (res) {
        if (res && res.progress && Object.keys(res.progress).length) {
            saveAllProgress(bookId, mergeProgress(getAllProgress(bookId), res.progress));
        }
    });
}
// 从云端拉取某词书进度并合并到本地（静默，失败不打扰）
var restoreProgressPending = null;
function restoreProgressFromCloud(bookId) {
    if (restoreProgressPending)
        return restoreProgressPending;
    if (!wx.cloud)
        return Promise.resolve();
    restoreProgressPending = callSyncUser({
        today: todayStr(),
        progressRequestBookId: bookId
    }).then(function (res) {
        if (res && res.progress && Object.keys(res.progress).length) {
            saveAllProgress(bookId, mergeProgress(getAllProgress(bookId), res.progress));
        }
    }).then(function () { restoreProgressPending = null; });
    return restoreProgressPending;
}
// 学习过程中自动排队同步：8 秒去抖，避免每答一题就调一次云函数
var progressSyncTimer = null;
function queueProgressSync(bookId) {
    if (!wx.cloud)
        return;
    if (progressSyncTimer)
        clearTimeout(progressSyncTimer);
    progressSyncTimer = setTimeout(function () {
        progressSyncTimer = null;
        syncProgressToCloud(bookId).catch(function () { });
    }, 8000);
}
// ─── 生词本 ──────────────────────────────────────────────────
var WRONG_BOOK_KEY = 'bc_wrong_book';
// 获取生词本
function getWrongBook() {
    return wx.getStorageSync(WRONG_BOOK_KEY) || [];
}
// 添加生词到生词本（去重）
function addToWrongBook(word, meaning, bookId) {
    var list = getWrongBook();
    if (list.some(function (item) { return item.word === word; }))
        return;
    list.push({ word: word, meaning: meaning, bookId: bookId, addedAt: Date.now() });
    wx.setStorageSync(WRONG_BOOK_KEY, list);
    queueWrongBookSync();
}
// 从生词本移除
function removeFromWrongBook(word) {
    var list = getWrongBook().filter(function (item) { return item.word !== word; });
    wx.setStorageSync(WRONG_BOOK_KEY, list);
    queueWrongBookSync();
}
// 清空生词本
function clearWrongBook() {
    wx.setStorageSync(WRONG_BOOK_KEY, []);
    queueWrongBookSync(); // 空列表也会上传，云端同步清空
}
// ─── 生词本云端同步（与进度同步同模式）───────────────────────────
// 合并策略：按 word 取并集，同一词取 addedAt 较新的一条
function mergeWrongBook(local, cloud) {
    var out = new Map();
    for (var _i = 0, _a = __spreadArray(__spreadArray([], (local || []), true), (cloud || []), true); _i < _a.length; _i++) {
        var it = _a[_i];
        var prev = out.get(it.word);
        if (!prev || (it.addedAt || 0) >= (prev.addedAt || 0))
            out.set(it.word, it);
    }
    return Array.from(out.values());
}
// 上传整份生词本到云端，返回云端已有内容供本地并集合并
// 采用整表覆盖式写回：移除/清空才能正确同步到云端
function syncWrongBookToCloud() {
    if (!wx.cloud)
        return Promise.resolve();
    return callSyncUser({
        today: todayStr(),
        wrongBook: getWrongBook()
    }).then(function (res) {
        if (res && Array.isArray(res.wrongBook)) {
            var merged = mergeWrongBook(getWrongBook(), res.wrongBook);
            wx.setStorageSync(WRONG_BOOK_KEY, merged);
        }
    });
}
// 学习中静默排队同步：去抖，避免频繁调云函数
var wrongBookSyncTimer = null;
function queueWrongBookSync() {
    if (!wx.cloud)
        return;
    if (wrongBookSyncTimer)
        clearTimeout(wrongBookSyncTimer);
    wrongBookSyncTimer = setTimeout(function () {
        wrongBookSyncTimer = null;
        syncWrongBookToCloud().catch(function () { });
    }, 8000);
}
// 从云端拉取生词本并合并到本地（启动时调用；失败静默）
var restoreWrongBookPending = null;
function restoreWrongBookFromCloud() {
    if (restoreWrongBookPending)
        return restoreWrongBookPending;
    if (!wx.cloud)
        return Promise.resolve();
    restoreWrongBookPending = callSyncUser({
        today: todayStr(),
        wrongBookRequest: true
    }).then(function (res) {
        if (res && Array.isArray(res.wrongBook) && res.wrongBook.length) {
            var merged = mergeWrongBook(getWrongBook(), res.wrongBook);
            wx.setStorageSync(WRONG_BOOK_KEY, merged);
        }
    }).then(function () { restoreWrongBookPending = null; });
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
exports.WEEKLY_TEMPLATE_ID = 'HKofr7-lr1w8swoa-p7M-pyNRPMRXxbSuSSWrIjKl-I';
var PLAN_BOX_LABELS = {
    1: { label: '第1盒 · 起步', intervalDesc: '当天内再次出现' },
    2: { label: '第2盒', intervalDesc: '隔1天复习' },
    3: { label: '第3盒', intervalDesc: '隔2天复习' },
    4: { label: '第4盒', intervalDesc: '隔4天复习' },
    5: { label: '第5盒 · 巩固', intervalDesc: '隔7天复习' },
    6: { label: '第6盒', intervalDesc: '隔15天以上（按个人节奏）' },
    7: { label: '第7盒 · 长期', intervalDesc: '隔30天以上 · 长期记忆' }
};
var DAY_MS2 = 24 * 60 * 60 * 1000;
function daysBetween(from, to) {
    return Math.floor((to - from) / DAY_MS2);
}
function getReviewPlan(bookId) {
    var all = getAllProgress(bookId);
    var now = Date.now();
    var boxCounts = {};
    var dueList = [];
    var forecast = Array.from({ length: 8 }, function () { return 0; }); // [0]=今日, [1..7]=未来7天
    var masteredCount = 0;
    var totalLearned = 0;
    for (var _i = 0, _a = Object.values(all); _i < _a.length; _i++) {
        var p = _a[_i];
        var box = p.box || 1;
        boxCounts[box] = (boxCounts[box] || 0) + 1;
        if (box >= 2)
            totalLearned++;
        if (box >= 5) {
            masteredCount++;
        }
        var meta = PLAN_BOX_LABELS[box] || PLAN_BOX_LABELS[1];
        var isMasteredZone = box >= 5;
        if (p.nextReview > 0 && p.nextReview <= now && !isMasteredZone) {
            // 到期：生成复习理由（引用真实排程间隔）
            var overDays = daysBetween(p.nextReview, now);
            var intervalDays = p.interval || exports.BOX_INTERVAL_DAYS[box] || 0;
            var reason = void 0;
            if (box === 1 && p.unknownCount > 0 && p.knownCount === 0) {
                reason = '上次没答对，已回到起步盒，今天就再认一次';
            }
            else if (box === 1) {
                reason = '在巩固盒里重新出发，今天再见面加深印象';
            }
            else if (overDays > 0) {
                reason = "\u5DF2\u8FDB\u5165".concat(meta.label, "\uFF08\u672C\u6B21\u95F4\u9694 ").concat(intervalDays, " \u5929\uFF09\uFF0C\u6BD4\u8BA1\u5212\u665A\u4E86 ").concat(overDays, " \u5929\uFF0C\u4F18\u5148\u5B89\u6392");
            }
            else {
                reason = "\u5DF2\u8FDB\u5165".concat(meta.label, "\uFF08\u672C\u6B21\u95F4\u9694 ").concat(intervalDays, " \u5929\uFF09\uFF0C\u4ECA\u5929\u6B63\u597D\u5230\u671F");
            }
            dueList.push({
                word: p.word,
                box: box,
                lastSeen: p.lastSeen || 0,
                overdueDays: Math.max(overDays, 0),
                interval: intervalDays,
                reason: reason
            });
            forecast[0]++;
        }
        else if (!isMasteredZone && p.nextReview > now) {
            var d = daysBetween(now, p.nextReview);
            if (d >= 1 && d <= 7)
                forecast[d]++;
        }
    }
    // 排序：逾期多的在前，其次盒子高的（接近掌握的先巩固）
    dueList.sort(function (a, b) {
        return b.overdueDays - a.overdueDays || b.box - a.box ||
            a.word.localeCompare(b.word);
    });
    var boxDist = [];
    for (var b = 1; b <= 7; b++) {
        var meta = PLAN_BOX_LABELS[b];
        boxDist.push(__assign(__assign({ box: b }, meta), { count: boxCounts[b] || 0, mastered: b >= 5 }));
    }
    var dayLabels = ['今天', '明天', '后天'];
    return {
        totalLearned: totalLearned,
        dueToday: forecast[0],
        masteredCount: masteredCount,
        boxDist: boxDist,
        dueList: dueList.slice(0, 50),
        forecast: forecast.slice(1, 8).map(function (count, i) { return ({
            label: i < 2 ? dayLabels[i + 1] : "".concat(i + 1, "\u5929\u540E"),
            count: count
        }); })
    };
}
