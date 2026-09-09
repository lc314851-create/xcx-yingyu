"use strict";
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
exports.getTodayLearnedWords = getTodayLearnedWords;
exports.toConcreteMode = toConcreteMode;
exports.getPracticeMode = getPracticeMode;
exports.setPracticeMode = setPracticeMode;
exports.getOrderMode = getOrderMode;
exports.setOrderMode = setOrderMode;
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
function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}
function todayStr() {
    return formatDate(new Date());
}
function mondayStr(d = new Date()) {
    const date = new Date(d);
    const day = date.getDay() || 7;
    const monday = new Date(date);
    monday.setDate(date.getDate() - day + 1);
    return formatDate(monday);
}
function isConsecutive(prev, cur) {
    const prevDate = new Date(prev + 'T00:00:00');
    const curDate = new Date(cur + 'T00:00:00');
    const diff = (curDate.getTime() - prevDate.getTime()) / (24 * 60 * 60 * 1000);
    return diff === 1;
}
const DAILY_HISTORY_KEY = 'bc_daily_history';
function getDailyHistory() {
    return wx.getStorageSync(DAILY_HISTORY_KEY) || {};
}
function recordDailyHistory(count = 1) {
    const history = getDailyHistory();
    const today = todayStr();
    history[today] = (history[today] || 0) + count;
    saveDailyHistory(history);
}
function saveDailyHistory(history) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffStr = formatDate(cutoff);
    for (const key of Object.keys(history)) {
        if (key < cutoffStr)
            delete history[key];
    }
    wx.setStorageSync(DAILY_HISTORY_KEY, history);
}
function mergeDailyHistory(a, b) {
    const out = {};
    for (const k of Object.keys(a || {}))
        out[k] = a[k] || 0;
    for (const k of Object.keys(b || {}))
        out[k] = Math.max(out[k] || 0, b[k] || 0);
    return out;
}
function getHeatmapData(days = 30) {
    const history = getDailyHistory();
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = formatDate(d);
        const count = history[dateStr] || 0;
        let level = 0;
        if (count >= 30)
            level = 4;
        else if (count >= 16)
            level = 3;
        else if (count >= 6)
            level = 2;
        else if (count >= 1)
            level = 1;
        result.push({ date: dateStr, count, level });
    }
    return result;
}
const STATS_KEY = 'bc_stats';
function getStats() {
    const s = wx.getStorageSync(STATS_KEY);
    if (!s)
        return defaultStats();
    return { ...defaultStats(), ...s };
}
function saveStats(s) {
    wx.setStorageSync(STATS_KEY, s);
}
function recordStudy(count = 1, isNewWord = true) {
    const stats = getStats();
    const today = todayStr();
    const monday = mondayStr();
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
function mergeStats(local, cloud) {
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
const PROFILE_KEY = 'bc_profile';
function getLocalProfile() {
    return wx.getStorageSync(PROFILE_KEY) || { nickname: '', avatarUrl: '' };
}
function saveLocalProfile(p) {
    wx.setStorageSync(PROFILE_KEY, p);
}
function callSyncUser(event) {
    if (!wx.cloud)
        return Promise.resolve(null);
    return new Promise((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('syncUser timeout')), 10000);
        wx.cloud
            .callFunction({ name: 'syncUser', data: event })
            .then((res) => { clearTimeout(t); resolve(res); }, (e) => { clearTimeout(t); reject(e); });
    }).then((res) => (res && res.result) || null)
        .catch((err) => {
        console.error('syncUser 失败', err);
        return null;
    });
}
function syncStatsToCloud(stats) {
    return callSyncUser({ stats, history: getDailyHistory(), today: todayStr() }).then(res => {
        if (res && res.stats) {
            const merged = mergeStats(getStats(), res.stats);
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
let restorePending = null;
function restoreStatsFromCloud() {
    if (restorePending)
        return restorePending;
    if (!wx.cloud)
        return Promise.resolve();
    restorePending = callSyncUser({ today: todayStr() }).then(res => {
        if (res) {
            if (res.stats)
                saveStats(mergeStats(getStats(), res.stats));
            if (res.history)
                saveDailyHistory(mergeDailyHistory(getDailyHistory(), res.history));
            if (res.profile)
                saveLocalProfile(res.profile);
        }
    }).then(() => { restorePending = null; });
    return restorePending;
}
function updateUserProfile(nickname, avatarUrl) {
    return callSyncUser({ nickname, avatarUrl, today: todayStr() }).then(res => {
        if (res && res.profile) {
            saveLocalProfile(res.profile);
            return res.profile;
        }
        return null;
    });
}
function doCheckIn() {
    const stats = getStats();
    const today = todayStr();
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
const BOOK_KEY = 'bc_current_book';
const BOOK_CHOSEN_KEY = 'bc_book_chosen';
function hasSelectedBook() {
    return wx.getStorageSync(BOOK_CHOSEN_KEY) === true;
}
function getCurrentBookId() {
    return wx.getStorageSync(BOOK_KEY) || 'junior';
}
function setCurrentBookId(id) {
    wx.setStorageSync(BOOK_KEY, id);
    wx.setStorageSync(BOOK_CHOSEN_KEY, true);
    restoreProgressFromCloud(id).catch(() => { });
}
const BATCH_SIZE_KEY = 'bc_batch_size';
function getBatchSize() {
    return wx.getStorageSync(BATCH_SIZE_KEY) || 10;
}
function setBatchSize(n) {
    wx.setStorageSync(BATCH_SIZE_KEY, n);
}
const STUDY_MODE_KEY = 'bc_study_mode';
function getStudyMode() {
    const v = wx.getStorageSync(STUDY_MODE_KEY);
    return (v === 'highFreq' || v === 'func' || v === 'content') ? v : 'all';
}
function setStudyMode(mode) {
    wx.setStorageSync(STUDY_MODE_KEY, mode);
}
function getTodayLearnedWords() {
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const out = [];
    try {
        const info = wx.getStorageInfoSync();
        for (const key of info.keys) {
            if (!key.startsWith('bc_progress_'))
                continue;
            const bookId = key.slice('bc_progress_'.length);
            const all = wx.getStorageSync(key) || {};
            for (const w of Object.values(all)) {
                if (w && w.lastSeen && w.lastSeen >= dayStart) {
                    out.push({ word: w.word, bookId, known: (w.knownCount || 0) >= (w.unknownCount || 0) });
                }
            }
        }
    }
    catch (e) {
        console.error('[导出] 今日学习词聚合失败', e);
    }
    out.sort((a, b) => a.word.localeCompare(b.word));
    return out;
}
const PRACTICE_MODE_KEY = 'bc_practice_mode';
function toConcreteMode(mode) {
    if (mode === 'mix') {
        const pool = ['card', 'choice', 'spell'];
        return pool[Math.floor(Math.random() * pool.length)];
    }
    return mode;
}
function getPracticeMode() {
    const saved = wx.getStorageSync(PRACTICE_MODE_KEY);
    if (saved === 'list')
        return 'quick';
    return saved || 'card';
}
function setPracticeMode(mode) {
    wx.setStorageSync(PRACTICE_MODE_KEY, mode);
}
const ORDER_MODE_KEY = 'bc_order_mode';
function getOrderMode() {
    const v = wx.getStorageSync(ORDER_MODE_KEY);
    return v === 'sequential' ? 'sequential' : 'random';
}
function setOrderMode(mode) {
    wx.setStorageSync(ORDER_MODE_KEY, mode);
}
const ACCENT_KEY = 'bc_accent';
function getAccent() {
    return wx.getStorageSync(ACCENT_KEY) || 'us';
}
function setAccent(accent) {
    wx.setStorageSync(ACCENT_KEY, accent);
}
function getProgressKey(bookId) {
    return `bc_progress_${bookId}`;
}
function getAllProgress(bookId) {
    return wx.getStorageSync(getProgressKey(bookId)) || {};
}
function saveAllProgress(bookId, data) {
    wx.setStorageSync(getProgressKey(bookId), data);
}
exports.SM2_DEFAULT_EASE = 2.5;
exports.SM2_MIN_EASE = 1.3;
exports.SM2_MAX_EASE = 2.5;
exports.DAY_MS = 24 * 60 * 60 * 1000;
exports.BOX_INTERVAL_DAYS = {
    1: 0,
    2: 1,
    3: 2,
    4: 4,
    5: 7,
    6: 15,
    7: 30
};
const SM2_INITIAL_INTERVALS = [1, 2, 4, 7];
function boxFromRep(rep) {
    return Math.max(1, Math.min(7, rep + 1));
}
function sm2NextInterval(rep, ease, prevInterval) {
    if (rep >= 1 && rep <= SM2_INITIAL_INTERVALS.length) {
        return SM2_INITIAL_INTERVALS[rep - 1];
    }
    return Math.max(prevInterval + 1, Math.round(prevInterval * ease));
}
function normalizeLegacy(p) {
    if (p.rep === undefined || p.interval === undefined || p.ease === undefined) {
        const legacyRep = p.box && p.box >= 2 ? Math.min(p.box - 1, 6) : 0;
        p.rep = legacyRep;
        p.interval = exports.BOX_INTERVAL_DAYS[p.box] || 0;
        p.ease = exports.SM2_DEFAULT_EASE;
    }
}
function recordWordProgress(bookId, word, known) {
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
        p.rep = 0;
        p.interval = 0;
        p.ease = Math.max(exports.SM2_MIN_EASE, (p.ease || exports.SM2_DEFAULT_EASE) - 0.2);
        p.box = 1;
        p.status = 'learning';
        p.nextReview = now;
    }
    else {
        const ease = p.ease || exports.SM2_DEFAULT_EASE;
        p.rep = (p.rep || 0) + 1;
        const interval = sm2NextInterval(p.rep, ease, p.interval || 0);
        p.interval = interval;
        p.ease = Math.min(exports.SM2_MAX_EASE, ease + 0.05);
        p.box = boxFromRep(p.rep);
        if (p.box >= 5) {
            p.status = 'mastered';
        }
        else if (p.box >= 3) {
            p.status = 'review';
        }
        else {
            p.status = 'learning';
        }
        p.nextReview = now + interval * exports.DAY_MS;
    }
    all[word] = p;
    saveAllProgress(bookId, all);
    queueProgressSync(bookId);
    return p;
}
function getBookProgressStats(bookId) {
    const all = getAllProgress(bookId);
    const words = Object.values(all);
    let newCount = 0;
    let learningCount = 0;
    let reviewCount = 0;
    let masteredCount = 0;
    let knownCount = 0;
    let dueCount = 0;
    const now = Date.now();
    for (const p of words) {
        const box = p.box || 1;
        if (box >= 5) {
            masteredCount++;
        }
        else if (box >= 3) {
            reviewCount++;
        }
        else {
            learningCount++;
        }
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
        knownCount,
        dueCount
    };
}
function mergeProgress(local, cloud) {
    const out = {};
    const keys = new Set([...Object.keys(local || {}), ...Object.keys(cloud || {})]);
    for (const k of keys) {
        const l = local && local[k];
        const c = cloud && cloud[k];
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
        const lScore = (l.rep || 0) * 1000 + (l.interval || 0);
        const cScore = (c.rep || 0) * 1000 + (c.interval || 0);
        let better;
        if (lScore !== cScore) {
            better = cScore > lScore ? c : l;
        }
        else {
            better = (c.lastSeen || 0) >= (l.lastSeen || 0) ? c : l;
        }
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
function syncProgressToCloud(bookId) {
    const data = getAllProgress(bookId);
    if (!Object.keys(data).length)
        return Promise.resolve();
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
let restoreProgressPending = null;
let restoreProgressBookId = '';
function restoreProgressFromCloud(bookId) {
    if (restoreProgressPending && restoreProgressBookId === bookId)
        return restoreProgressPending;
    if (!wx.cloud)
        return Promise.resolve();
    restoreProgressBookId = bookId;
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
let progressSyncTimer = null;
function queueProgressSync(bookId) {
    if (!wx.cloud)
        return;
    if (progressSyncTimer)
        clearTimeout(progressSyncTimer);
    progressSyncTimer = setTimeout(() => {
        progressSyncTimer = null;
        syncProgressToCloud(bookId).catch(() => { });
    }, 8000);
}
const WRONG_BOOK_KEY = 'bc_wrong_book';
function getWrongBook() {
    return wx.getStorageSync(WRONG_BOOK_KEY) || [];
}
function addToWrongBook(word, meaning, bookId) {
    const list = getWrongBook();
    if (list.some(item => item.word === word))
        return;
    list.push({ word, meaning, bookId, addedAt: Date.now() });
    wx.setStorageSync(WRONG_BOOK_KEY, list);
    queueWrongBookSync();
}
function removeFromWrongBook(word) {
    const list = getWrongBook().filter(item => item.word !== word);
    wx.setStorageSync(WRONG_BOOK_KEY, list);
    queueWrongBookSync();
}
function clearWrongBook() {
    wx.setStorageSync(WRONG_BOOK_KEY, []);
    queueWrongBookSync();
}
function mergeWrongBook(local, cloud) {
    const out = new Map();
    for (const it of [...(local || []), ...(cloud || [])]) {
        const prev = out.get(it.word);
        if (!prev || (it.addedAt || 0) >= (prev.addedAt || 0))
            out.set(it.word, it);
    }
    return Array.from(out.values());
}
function syncWrongBookToCloud() {
    if (!wx.cloud)
        return Promise.resolve();
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
let wrongBookSyncTimer = null;
function queueWrongBookSync() {
    if (!wx.cloud)
        return;
    if (wrongBookSyncTimer)
        clearTimeout(wrongBookSyncTimer);
    wrongBookSyncTimer = setTimeout(() => {
        wrongBookSyncTimer = null;
        syncWrongBookToCloud().catch(() => { });
    }, 8000);
}
let restoreWrongBookPending = null;
function restoreWrongBookFromCloud() {
    if (restoreWrongBookPending)
        return restoreWrongBookPending;
    if (!wx.cloud)
        return Promise.resolve();
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
exports.WEEKLY_TEMPLATE_ID = 'HKofr7-lr1w8swoa-p7M-pyNRPMRXxbSuSSWrIjKl-I';
const PLAN_BOX_LABELS = {
    1: { label: '第1盒 · 起步', intervalDesc: '当天内再次出现' },
    2: { label: '第2盒', intervalDesc: '隔1天复习' },
    3: { label: '第3盒', intervalDesc: '隔2天复习' },
    4: { label: '第4盒', intervalDesc: '隔4天复习' },
    5: { label: '第5盒 · 巩固', intervalDesc: '隔7天复习' },
    6: { label: '第6盒', intervalDesc: '隔15天以上（按个人节奏）' },
    7: { label: '第7盒 · 长期', intervalDesc: '隔30天以上 · 长期记忆' }
};
const DAY_MS2 = 24 * 60 * 60 * 1000;
function daysBetween(from, to) {
    return Math.floor((to - from) / DAY_MS2);
}
function getReviewPlan(bookId) {
    const all = getAllProgress(bookId);
    const now = Date.now();
    const boxCounts = {};
    const dueList = [];
    const forecast = Array.from({ length: 8 }, () => 0);
    let masteredCount = 0;
    let totalLearned = 0;
    for (const p of Object.values(all)) {
        const box = p.box || 1;
        boxCounts[box] = (boxCounts[box] || 0) + 1;
        if (box >= 2)
            totalLearned++;
        if (box >= 5) {
            masteredCount++;
        }
        const meta = PLAN_BOX_LABELS[box] || PLAN_BOX_LABELS[1];
        const isMasteredZone = box >= 5;
        if (p.nextReview > 0 && p.nextReview <= now && !isMasteredZone) {
            const overDays = daysBetween(p.nextReview, now);
            const intervalDays = p.interval || exports.BOX_INTERVAL_DAYS[box] || 0;
            let reason;
            if (box === 1 && p.unknownCount > 0 && p.knownCount === 0) {
                reason = '上次没答对，已回到起步盒，今天就再认一次';
            }
            else if (box === 1) {
                reason = '在巩固盒里重新出发，今天再见面加深印象';
            }
            else if (overDays > 0) {
                reason = `已进入${meta.label}（本次间隔 ${intervalDays} 天），比计划晚了 ${overDays} 天，优先安排`;
            }
            else {
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
        }
        else if (!isMasteredZone && p.nextReview > now) {
            const d = daysBetween(now, p.nextReview);
            if (d >= 1 && d <= 7)
                forecast[d]++;
        }
    }
    dueList.sort((a, b) => b.overdueDays - a.overdueDays || b.box - a.box ||
        a.word.localeCompare(b.word));
    const boxDist = [];
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFpREEsZ0NBS0M7QUFHRCw0QkFFQztBQUdELDhCQU1DO0FBY0QsMENBRUM7QUFHRCxnREFLQztBQUdELDRDQVNDO0FBR0QsOENBS0M7QUFHRCx3Q0FrQkM7QUFLRCw0QkFJQztBQUVELDhCQUVDO0FBS0Qsa0NBcUNDO0FBT0QsZ0NBcUJDO0FBVUQsMENBRUM7QUFDRCw0Q0FFQztBQWdDRCw0Q0FXQztBQUtELHNEQWFDO0FBR0QsOENBUUM7QUFHRCw4QkF1QkM7QUFPRCwwQ0FFQztBQUVELDRDQUVDO0FBRUQsNENBTUM7QUFJRCxvQ0FFQztBQUNELG9DQUVDO0FBTUQsb0NBR0M7QUFFRCxvQ0FFQztBQWFELG9EQXFCQztBQVVELHdDQU1DO0FBRUQsMENBS0M7QUFFRCwwQ0FFQztBQU9ELG9DQUdDO0FBRUQsb0NBRUM7QUFPRCw4QkFFQztBQUVELDhCQUVDO0FBSUQsd0NBRUM7QUFHRCx3Q0FFQztBQUdELDBDQUVDO0FBZ0NELGdDQUVDO0FBSUQsMENBS0M7QUFZRCxnREFrRUM7QUFHRCxvREFxQ0M7QUFTRCxzQ0ErQkM7QUFJRCxrREFhQztBQUtELDREQWVDO0FBSUQsOENBT0M7QUFjRCxvQ0FFQztBQUdELHdDQU1DO0FBR0Qsa0RBSUM7QUFHRCx3Q0FHQztBQUlELHdDQVVDO0FBSUQsb0RBV0M7QUFlRCw4REFlQztBQXlJRCxzQ0E2RUM7QUF6K0JELFNBQVMsWUFBWTtJQUNuQixPQUFPO1FBQ0wsWUFBWSxFQUFFLENBQUM7UUFDZixVQUFVLEVBQUUsQ0FBQztRQUNiLFVBQVUsRUFBRSxDQUFDO1FBQ2IsU0FBUyxFQUFFLEtBQUs7UUFDaEIsYUFBYSxFQUFFLEVBQUU7UUFDakIsYUFBYSxFQUFFLENBQUM7UUFDaEIsV0FBVyxFQUFFLEVBQUU7S0FDaEIsQ0FBQztBQUNKLENBQUM7QUFJRCxTQUFnQixVQUFVLENBQUMsQ0FBTztJ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LGFBQWE7UUFDYixPQUFPO1FBQ1AsT0FBTyxFQUFFLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztRQUM3QixRQUFRLEVBQUUsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNoRCxLQUFLLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJO1lBQzlDLEtBQUs7U0FDTixDQUFDLENBQUM7S0FDSixDQUFDO0FBQ0osQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHV0aWxzL3N0b3JlLnRzXG4vLyDmnKzlnLDlrZjlgqjnrqHnkIbvvJrlrabkuaDov5vluqYgLyDpl7TpmpTorrDlv4bvvIhTTS0yIOWPmOS9k++8iS8g5omT5Y2hIC8g6K+N5Lmm6YCJ5oupXG4vLyDnu5/kuIAga2V5IOWRveWQjeepuumXtOWJjee8gCBcImJjX1wi77yI6KGl6K+N77yJ77yM6YG/5YWN5LiO5YW25LuW5bCP56iL5bqP5pWw5o2u5Yay56qBXG5cbi8vIOKUgOKUgOKUgCDnsbvlnosg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4vLyDljZXkuKrljZXor43nmoTmjozmj6HnirbmgIHvvIhTTS0yIOWPmOS9k+mXtOmalOiusOW/hu+8iVxuLy8gcmVwPei/nue7reetlOWvueasoeaVsOOAgWVhc2U95Liq5Lq66Zq+5bqm57O75pWw44CBaW50ZXJ2YWw95b2T5YmN6Ze06ZqU5aSp5pWwIOKGkiDkuInogIXpqbHliqjkuIvmrKHlpI3kuaDml7bpl7Rcbi8vIGJveCDmmK8gcmVwIOeahOWxleekuuaYoOWwhO+8iDF+N++8jGJveD49NSDih5Qg6L+e57ut562U5a+5Pj00IOasoSDih5Qg5bey5o6M5o+h77yJ77yMXG4vLyDkv53nlZnor6XlrZfmrrXorqnnu5/orqEv5o6S6KGM5qacL+aQnOe0ouetieaXouaciea2iOi0ueiAhembtuaUueWKqOWFvOWuuVxuZXhwb3J0IGludGVyZmFjZSBXb3JkUHJvZ3Jlc3Mge1xuICB3b3JkOiBzdHJpbmc7ICAgICAgICAvLyDljZXor41cbiAgc3RhdHVzOiAnbmV3JyB8ICdsZWFybmluZycgfCAncmV2aWV3JyB8ICdtYXN0ZXJlZCc7IC8vIOeKtuaAge+8iOeUqOS6jue7n+iuoeWxleekuu+8iVxuICBib3g6IG51bWJlcjsgICAgICAgICAgLy8g5bGV56S655So55uS5a2Q562J57qnIDF+N++8iDc96ZW/5pyf6K6w5b+G77yJ77yM55SxIHJlcCDmjqjlr7xcbiAga25vd25Db3VudDogbnVtYmVyOyAgLy8g57Sv6K6h6K6k6K+G5qyh5pWwXG4gIHVua25vd25Db3VudDogbnVtYmVyOy8vIOe0r+iuoeS4jeiupOivhuasoeaVsFxuICBuZXh0UmV2aWV3OiBudW1iZXI7ICAvLyDkuIvmrKHlpI3kuaDml7bpl7TmiLPvvIhtc++8iVxuICBsYXN0U2VlbjogbnVtYmVyOyAgICAvLyDkuIrmrKHlrabkuaDml7bpl7TmiLNcbiAgLy8g4pSA4pSA4pSAIFNNLTIg6LCD5bqm5a2X5q6177yI5Y+v6YCJ77yb5penIExlaXRuZXIg5pWw5o2u57y65aSx5pe25oyJIGJveCDlm57loavvvIkg4pSA4pSA4pSAXG4gIGVhc2U/OiBudW1iZXI7ICAgICAgIC8vIOS4quS6uumavuW6puezu+aVsCAxLjN+Mi4177ya562U5a+5ICswLjA1IC8g562U6ZSZIC0wLjJcbiAgcmVwPzogbnVtYmVyOyAgICAgICAgLy8g6L+e57ut562U5a+55qyh5pWw77yI562U6ZSZ5b2S6Zu277yJXG4gIGludGVydmFsPzogbnVtYmVyOyAgIC8vIOW9k+WJjeWkjeS5oOmXtOmalO+8iOWkqe+8iVxufVxuXG4vLyDlrabkuaDnu5/orqFcbmV4cG9ydCBpbnRlcmZhY2UgU3R1ZHlTdGF0cyB7XG4gIGxlYXJuZWRUb2RheTogbnVtYmVyO1xuICBzdHJlYWtEYXlzOiBudW1iZXI7XG4gIHRvdGFsV29yZHM6IG51bWJlcjtcbiAgY2hlY2tlZEluOiBib29sZWFuO1xuICBsYXN0U3R1ZHlEYXRlOiBzdHJpbmc7IC8vICdZWVlZLU1NLUREJ1xuICB3ZWVrbHlMZWFybmVkOiBudW1iZXI7IC8vIOacrOWRqOW3suWtplxuICB3ZWVrbHlTdGFydDogc3RyaW5nOyAgIC8vIOacrOWRqOi1t+Wni+aXpeacn1xufVxuXG4vLyDpu5jorqTnu5/orqFcbmZ1bmN0aW9uIGRlZmF1bHRTdGF0cygpOiBTdHVkeVN0YXRzIHtcbiAgcmV0dXJuIHtcbiAgICBsZWFybmVkVG9kYXk6IDAsXG4gICAgc3RyZWFrRGF5czogMCxcbiAgICB0b3RhbFdvcmRzOiAwLFxuICAgIGNoZWNrZWRJbjogZmFsc2UsXG4gICAgbGFzdFN0dWR5RGF0ZTogJycsXG4gICAgd2Vla2x5TGVhcm5lZDogMCxcbiAgICB3ZWVrbHlTdGFydDogJydcbiAgfTtcbn1cblxuLy8g4pSA4pSA4pSAIOaXpeacn+W3peWFtyDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbi8vIOagvOW8j+WMluaXpeacn+S4uiAnWVlZWS1NTS1ERCdcbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXREYXRlKGQ6IERhdGUpOiBzdHJpbmcge1xuICBjb25zdCB5ID0gZC5nZXRGdWxsWWVhcigpO1xuICBjb25zdCBtID0gU3RyaW5nKGQuZ2V0TW9udGgoKSArIDEpLnBhZFN0YXJ0KDIsICcwJyk7XG4gIGNvbnN0IGRheSA9IFN0cmluZyhkLmdldERhdGUoKSkucGFkU3RhcnQoMiwgJzAnKTtcbiAgcmV0dXJuIGAke3l9LSR7bX0tJHtkYXl9YDtcbn1cblxuLy8g6I635Y+W5LuK5aSp5pel5pyf5a2X56ym5LiyXG5leHBvcnQgZnVuY3Rpb24gdG9kYXlTdHIoKTogc3RyaW5nIHtcbiAgcmV0dXJuIGZvcm1hdERhdGUobmV3IERhdGUoKSk7XG59XG5cbi8vIOiOt+WPluacrOWRqOS4gOaXpeacn+Wtl+espuS4su+8iOS7peWRqOS4gOS4uuS4gOWRqOi1t+Wni++8iVxuZXhwb3J0IGZ1bmN0aW9uIG1vbmRheVN0cihkOiBEYXRlID0gbmV3IERhdGUoKSk6IHN0cmluZyB7XG4gIGNvbnN0IGRhdGUgPSBuZXcgRGF0ZShkKTtcbiAgY29uc3QgZGF5ID0gZGF0ZS5nZXREYXkoKSB8fCA3OyAvLyDlkajml6XmmK8gMO+8jOi9rOS4uiA3XG4gIGNvbnN0IG1vbmRheSA9IG5ldyBEYXRlKGRhdGUpO1xuICBtb25kYXkuc2V0RGF0ZShkYXRlLmdldERhdGUoKSAtIGRheSArIDEpO1xuICByZXR1cm4gZm9ybWF0RGF0ZShtb25kYXkpO1xufVxuXG4vLyDliKTmlq3kuKTkuKrml6XmnJ/mmK/lkKbmmK/ov57nu63nmoTvvIjmmKjlpKkg4oaSIOS7iuWkqe+8iVxuZnVuY3Rpb24gaXNDb25zZWN1dGl2ZShwcmV2OiBzdHJpbmcsIGN1cjogc3RyaW5nKTogYm9vbGVhbiB7XG4gIGNvbnN0IHByZXZEYXRlID0gbmV3IERhdGUocHJldiArICdUMDA6MDA6MDAnKTtcbiAgY29uc3QgY3VyRGF0ZSA9IG5ldyBEYXRlKGN1ciArICdUMDA6MDA6MDAnKTtcbiAgY29uc3QgZGlmZiA9IChjdXJEYXRlLmdldFRpbWUoKSAtIHByZXZEYXRlLmdldFRpbWUoKSkgLyAoMjQgKiA2MCAqIDYwICogMTAwMCk7XG4gIHJldHVybiBkaWZmID09PSAxO1xufVxuXG4vLyDilIDilIDilIAg5q+P5pel5a2m5Lmg6K6w5b2V77yI55So5LqO54Ot5Yqb5Zu+77yJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3QgREFJTFlfSElTVE9SWV9LRVkgPSAnYmNfZGFpbHlfaGlzdG9yeSc7XG5cbi8vIOiOt+WPluavj+aXpeWtpuS5oOWOhuWPsu+8iFJlY29yZDwnWVlZWS1NTS1ERCcsIGNvdW50Pu+8iVxuZXhwb3J0IGZ1bmN0aW9uIGdldERhaWx5SGlzdG9yeSgpOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+IHtcbiAgcmV0dXJuIHd4LmdldFN0b3JhZ2VTeW5jKERBSUxZX0hJU1RPUllfS0VZKSB8fCB7fTtcbn1cblxuLy8g6K6w5b2V5q+P5pel5a2m5Lmg6YePXG5leHBvcnQgZnVuY3Rpb24gcmVjb3JkRGFpbHlIaXN0b3J5KGNvdW50OiBudW1iZXIgPSAxKTogdm9pZCB7XG4gIGNvbnN0IGhpc3RvcnkgPSBnZXREYWlseUhpc3RvcnkoKTtcbiAgY29uc3QgdG9kYXkgPSB0b2RheVN0cigpO1xuICBoaXN0b3J5W3RvZGF5XSA9IChoaXN0b3J5W3RvZGF5XSB8fCAwKSArIGNvdW50O1xuICBzYXZlRGFpbHlIaXN0b3J5KGhpc3RvcnkpO1xufVxuXG4vLyDkv53lrZjmr4/ml6XlrabkuaDljoblj7LvvIjkvpvkupHnq6/lkIzmraXlkI7lhpnlm57vvIlcbmV4cG9ydCBmdW5jdGlvbiBzYXZlRGFpbHlIaXN0b3J5KGhpc3Rvcnk6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4pOiB2b2lkIHtcbiAgLy8g5riF55CG6LaF6L+HIDkwIOWkqeeahOaXp+aVsOaNru+8jOmBv+WFjeaXoOmZkOWinumVv1xuICBjb25zdCBjdXRvZmYgPSBuZXcgRGF0ZSgpO1xuICBjdXRvZmYuc2V0RGF0ZShjdXRvZmYuZ2V0RGF0ZSgpIC0gOTApO1xuICBjb25zdCBjdXRvZmZTdHIgPSBmb3JtYXREYXRlKGN1dG9mZik7XG4gIGZvciAoY29uc3Qga2V5IG9mIE9iamVjdC5rZXlzKGhpc3RvcnkpKSB7XG4gICAgaWYgKGtleSA8IGN1dG9mZlN0cikgZGVsZXRlIGhpc3Rvcnlba2V5XTtcbiAgfVxuICB3eC5zZXRTdG9yYWdlU3luYyhEQUlMWV9ISVNUT1JZX0tFWSwgaGlzdG9yeSk7XG59XG5cbi8vIOWQiOW5tuS4pOS7veavj+aXpeWOhuWPsu+8iOWQjOS4gOWkqeWPlui+g+Wkp+WAvO+8jOe7neS4jeebuOWKoO+8jOmYsumHjeWkjee0r+iuoe+8iVxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlRGFpbHlIaXN0b3J5KGE6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4sIGI6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4pOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+IHtcbiAgY29uc3Qgb3V0OiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge307XG4gIGZvciAoY29uc3QgayBvZiBPYmplY3Qua2V5cyhhIHx8IHt9KSkgb3V0W2tdID0gYVtrXSB8fCAwO1xuICBmb3IgKGNvbnN0IGsgb2YgT2JqZWN0LmtleXMoYiB8fCB7fSkpIG91dFtrXSA9IE1hdGgubWF4KG91dFtrXSB8fCAwLCBiW2tdIHx8IDApO1xuICByZXR1cm4gb3V0O1xufVxuXG4vLyDojrflj5bmnIDov5EgTiDlpKnnmoTng63lipvlm77mlbDmja5cbmV4cG9ydCBmdW5jdGlvbiBnZXRIZWF0bWFwRGF0YShkYXlzOiBudW1iZXIgPSAzMCk6IEFycmF5PHsgZGF0ZTogc3RyaW5nOyBjb3VudDogbnVtYmVyOyBsZXZlbDogbnVtYmVyIH0+IHtcbiAgY29uc3QgaGlzdG9yeSA9IGdldERhaWx5SGlzdG9yeSgpO1xuICBjb25zdCByZXN1bHQ6IEFycmF5PHsgZGF0ZTogc3RyaW5nOyBjb3VudDogbnVtYmVyOyBsZXZlbDogbnVtYmVyIH0+ID0gW107XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGZvciAobGV0IGkgPSBkYXlzIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBjb25zdCBkID0gbmV3IERhdGUobm93KTtcbiAgICBkLnNldERhdGUoZC5nZXREYXRlKCkgLSBpKTtcbiAgICBjb25zdCBkYXRlU3RyID0gZm9ybWF0RGF0ZShkKTtcbiAgICBjb25zdCBjb3VudCA9IGhpc3RvcnlbZGF0ZVN0cl0gfHwgMDtcbiAgICAvLyDliIbnuqfvvJowPeacquWtpuS5oCwgMT0xLTUsIDI9Ni0xNSwgMz0xNi0zMCwgND0zMCtcbiAgICBsZXQgbGV2ZWwgPSAwO1xuICAgIGlmIChjb3VudCA+PSAzMCkgbGV2ZWwgPSA0O1xuICAgIGVsc2UgaWYgKGNvdW50ID49IDE2KSBsZXZlbCA9IDM7XG4gICAgZWxzZSBpZiAoY291bnQgPj0gNikgbGV2ZWwgPSAyO1xuICAgIGVsc2UgaWYgKGNvdW50ID49IDEpIGxldmVsID0gMTtcbiAgICByZXN1bHQucHVzaCh7IGRhdGU6IGRhdGVTdHIsIGNvdW50LCBsZXZlbCB9KTtcbiAgfVxuICByZXR1cm4gcmVzdWx0O1xufVxuXG4vLyDilIDilIDilIAg57uf6K6hIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3QgU1RBVFNfS0VZID0gJ2JjX3N0YXRzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFN0YXRzKCk6IFN0dWR5U3RhdHMge1xuICBjb25zdCBzID0gd3guZ2V0U3RvcmFnZVN5bmMoU1RBVFNfS0VZKTtcbiAgaWYgKCFzKSByZXR1cm4gZGVmYXVsdFN0YXRzKCk7XG4gIHJldHVybiB7IC4uLmRlZmF1bHRTdGF0cygpLCAuLi5zIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzYXZlU3RhdHMoczogU3R1ZHlTdGF0cyk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhTVEFUU19LRVksIHMpO1xufVxuXG4vLyDlvZPnlKjmiLflrabkuaDkuIDkuKror43ml7bvvIzmm7TmlrDnu5/orqFcbi8vIGlzTmV3V29yZO+8muaYr+WQpummluasoeWtpueahOaWsOivjeOAguS7heaWsOivjeiuoeWFpeKAnOe0r+iuoeWNleivjSB0b3RhbFdvcmRz4oCd77ybXG4vLyDlpI3kuaAv5bep5Zu6L+aMkeaImC/nu4PkuaDnrYnph43lpI3lrabkuaDlj6rorqHlhaXku4rml6Uv5pys5ZGo5a2m5Lmg6YeP5LiO5omT5Y2h77yM5LiN6K6h57Sv6K6h5Y2V6K+N44CCXG5leHBvcnQgZnVuY3Rpb24gcmVjb3JkU3R1ZHkoY291bnQ6IG51bWJlciA9IDEsIGlzTmV3V29yZDogYm9vbGVhbiA9IHRydWUpOiBTdHVkeVN0YXRzIHtcbiAgY29uc3Qgc3RhdHMgPSBnZXRTdGF0cygpO1xuICBjb25zdCB0b2RheSA9IHRvZGF5U3RyKCk7XG4gIGNvbnN0IG1vbmRheSA9IG1vbmRheVN0cigpO1xuXG4gIC8vIOWmguaenOaYr+aWsOeahOS4gOWkqVxuICBpZiAoc3RhdHMubGFzdFN0dWR5RGF0ZSAhPT0gdG9kYXkpIHtcbiAgICAvLyDmo4Dmn6XmmK/lkKbov57nu61cbiAgICBpZiAoc3RhdHMubGFzdFN0dWR5RGF0ZSAmJiBpc0NvbnNlY3V0aXZlKHN0YXRzLmxhc3RTdHVkeURhdGUsIHRvZGF5KSkge1xuICAgICAgc3RhdHMuc3RyZWFrRGF5cyArPSAxO1xuICAgIH0gZWxzZSBpZiAoIXN0YXRzLmxhc3RTdHVkeURhdGUpIHtcbiAgICAgIC8vIOmmluasoeWtpuS5oFxuICAgICAgc3RhdHMuc3RyZWFrRGF5cyA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIOaWreS6hu+8jOmHjeaWsOiuoeaVsFxuICAgICAgc3RhdHMuc3RyZWFrRGF5cyA9IDE7XG4gICAgfVxuICAgIC8vIOmHjee9ruS7iuaXpeWtpuS5oOaVsFxuICAgIHN0YXRzLmxlYXJuZWRUb2RheSA9IDA7XG4gICAgc3RhdHMuY2hlY2tlZEluID0gZmFsc2U7XG4gICAgc3RhdHMubGFzdFN0dWR5RGF0ZSA9IHRvZGF5O1xuICB9XG5cbiAgLy8g5aaC5p6c5piv5paw55qE5LiA5ZGoXG4gIGlmIChzdGF0cy53ZWVrbHlTdGFydCAhPT0gbW9uZGF5KSB7XG4gICAgc3RhdHMud2Vla2x5TGVhcm5lZCA9IDA7XG4gICAgc3RhdHMud2Vla2x5U3RhcnQgPSBtb25kYXk7XG4gIH1cblxuICBzdGF0cy5sZWFybmVkVG9kYXkgKz0gY291bnQ7XG4gIHN0YXRzLndlZWtseUxlYXJuZWQgKz0gY291bnQ7XG4gIGlmIChpc05ld1dvcmQpIHtcbiAgICBzdGF0cy50b3RhbFdvcmRzICs9IGNvdW50O1xuICB9XG4gIHNhdmVTdGF0cyhzdGF0cyk7XG4gIHJlY29yZERhaWx5SGlzdG9yeShjb3VudCk7XG4gIHJldHVybiBzdGF0cztcbn1cblxuLy8g5ZCI5bm25pys5Zyw5LiO5LqR56uv55qE57uf6K6h77yI6Ziy5Lii5aSx77yJ77yaXG4vLyAgIC0g57Sv6K6h5YC877yIdG90YWxXb3Jkcy9zdHJlYWtEYXlz77yJ5Y+W6L6D5aSn5YC877yM6YG/5YWN5riF57yT5a2Y5ZCO5oqK5Y6G5Y+y5Yay5bCPXG4vLyAgIC0g5LuK5pelL+acrOWRqOS7peacrOWcsOS4uuWHhu+8iOacrOWcsOS7iuWkqeWtpui/h+WwseaYr+acgOaWsO+8ie+8jOmYsuimhuebllxuLy8gICAtIOaXpeacn+Wtl+auteWPlui+g+aWsOeahFxuLy8g57ud5LiN55u45Yqg77yM5p2c57ud6YeN5aSN57Sv6K6h44CCXG5leHBvcnQgZnVuY3Rpb24gbWVyZ2VTdGF0cyhsb2NhbDogU3R1ZHlTdGF0cywgY2xvdWQ6IFN0dWR5U3RhdHMpOiBTdHVkeVN0YXRzIHtcbiAgY29uc3QgdG9kYXkgPSB0b2RheVN0cigpO1xuICByZXR1cm4ge1xuICAgIC4uLmRlZmF1bHRTdGF0cygpLFxuICAgIC4uLmxvY2FsLFxuICAgIHRvdGFsV29yZHM6IE1hdGgubWF4KGxvY2FsLnRvdGFsV29yZHMgfHwgMCwgY2xvdWQudG90YWxXb3JkcyB8fCAwKSxcbiAgICBzdHJlYWtEYXlzOiBNYXRoLm1heChsb2NhbC5zdHJlYWtEYXlzIHx8IDAsIGNsb3VkLnN0cmVha0RheXMgfHwgMCksXG4gICAgbGVhcm5lZFRvZGF5OiBsb2NhbC5sYXN0U3R1ZHlEYXRlID09PSB0b2RheVxuICAgICAgPyBsb2NhbC5sZWFybmVkVG9kYXlcbiAgICAgIDogKGNsb3VkLmxhc3RTdHVkeURhdGUgPT09IHRvZGF5ID8gKGNsb3VkLmxlYXJuZWRUb2RheSB8fCAwKSA6IDApLFxuICAgIHdlZWtseUxlYXJuZWQ6IGxvY2FsLmxhc3RTdHVkeURhdGUgPT09IHRvZGF5XG4gICAgICA/IGxvY2FsLndlZWtseUxlYXJuZWRcbiAgICAgIDogTWF0aC5tYXgobG9jYWwud2Vla2x5TGVhcm5lZCB8fCAwLCBjbG91ZC53ZWVrbHlMZWFybmVkIHx8IDApLFxuICAgIGNoZWNrZWRJbjogbG9jYWwubGFzdFN0dWR5RGF0ZSA9PT0gdG9kYXlcbiAgICAgID8gbG9jYWwuY2hlY2tlZEluXG4gICAgICA6IChjbG91ZC5sYXN0U3R1ZHlEYXRlID09PSB0b2RheSA/IGNsb3VkLmNoZWNrZWRJbiA6IGZhbHNlKSxcbiAgICBsYXN0U3R1ZHlEYXRlOiAobG9jYWwubGFzdFN0dWR5RGF0ZSB8fCAnJykgPj0gKGNsb3VkLmxhc3RTdHVkeURhdGUgfHwgJycpXG4gICAgICA/IGxvY2FsLmxhc3RTdHVkeURhdGVcbiAgICAgIDogY2xvdWQubGFzdFN0dWR5RGF0ZSxcbiAgICB3ZWVrbHlTdGFydDogbG9jYWwud2Vla2x5U3RhcnQgfHwgY2xvdWQud2Vla2x5U3RhcnQgfHwgJydcbiAgfTtcbn1cblxuLy8g4pSA4pSA4pSAIOS6keerr+WQjOatpe+8iOe7jyBzeW5jVXNlciDkupHlh73mlbDvvIzmnI3liqHnq6/mnYPpmZDvvIzlj6/or7vlhajph4/lubboh6rliqjljrvph43lkIjlubbvvIkg4pSA4pSA4pSAXG5cbi8vIOeUqOaIt+i1hOaWmVxuY29uc3QgUFJPRklMRV9LRVkgPSAnYmNfcHJvZmlsZSc7XG5leHBvcnQgaW50ZXJmYWNlIFVzZXJQcm9maWxlIHtcbiAgbmlja25hbWU6IHN0cmluZztcbiAgYXZhdGFyVXJsOiBzdHJpbmc7IC8vIOS6keWtmOWCqCBmaWxlSURcbn1cbmV4cG9ydCBmdW5jdGlvbiBnZXRMb2NhbFByb2ZpbGUoKTogVXNlclByb2ZpbGUge1xuICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoUFJPRklMRV9LRVkpIHx8IHsgbmlja25hbWU6ICcnLCBhdmF0YXJVcmw6ICcnIH07XG59XG5leHBvcnQgZnVuY3Rpb24gc2F2ZUxvY2FsUHJvZmlsZShwOiBVc2VyUHJvZmlsZSk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhQUk9GSUxFX0tFWSwgcCk7XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgU3luY1VzZXJSZXN1bHQge1xuICBvcGVuaWQ/OiBzdHJpbmc7XG4gIHByb2ZpbGU/OiBVc2VyUHJvZmlsZTtcbiAgc3RhdHM/OiBTdHVkeVN0YXRzO1xuICBoaXN0b3J5PzogUmVjb3JkPHN0cmluZywgbnVtYmVyPjtcbiAgcHJvZ3Jlc3M/OiBSZWNvcmQ8c3RyaW5nLCBXb3JkUHJvZ3Jlc3M+O1xuICB3cm9uZ0Jvb2s/OiBXcm9uZ0Jvb2tJdGVtW107XG4gIGlzTmV3PzogYm9vbGVhbjtcbn1cblxuLy8g6LCDIHN5bmNVc2VyIOS6keWHveaVsO+8iOacjeWKoeerr+WQiOW5tue7n+iuoSvotYTmlpnjgIHoh6rliqjljrvph43vvIlcbmZ1bmN0aW9uIGNhbGxTeW5jVXNlcihldmVudDogYW55KTogUHJvbWlzZTxTeW5jVXNlclJlc3VsdCB8IG51bGw+IHtcbiAgaWYgKCF3eC5jbG91ZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTtcbiAgLy8g5Yqg6LaF5pe277ya5LqR5Ye95pWw5oyC6LW35pe25LiN6IO95rC45LmFIHBlbmRpbmfvvIzlkKbliJnov5vluqbmgaLlpI0v5ZCM5q2l5rC46L+c5LiN5a6M5oiQXG4gIHJldHVybiBuZXcgUHJvbWlzZTxhbnk+KChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBjb25zdCB0ID0gc2V0VGltZW91dCgoKSA9PiByZWplY3QobmV3IEVycm9yKCdzeW5jVXNlciB0aW1lb3V0JykpLCAxMDAwMCk7XG4gICAgd3guY2xvdWRcbiAgICAgIC5jYWxsRnVuY3Rpb24oeyBuYW1lOiAnc3luY1VzZXInLCBkYXRhOiBldmVudCB9KVxuICAgICAgLnRoZW4oXG4gICAgICAgIChyZXM6IGFueSkgPT4geyBjbGVhclRpbWVvdXQodCk7IHJlc29sdmUocmVzKTsgfSxcbiAgICAgICAgKGU6IGFueSkgPT4geyBjbGVhclRpbWVvdXQodCk7IHJlamVjdChlKTsgfVxuICAgICAgKTtcbiAgfSkudGhlbigocmVzOiBhbnkpID0+IChyZXMgJiYgcmVzLnJlc3VsdCkgfHwgbnVsbClcbiAgICAuY2F0Y2goKGVycjogYW55KSA9PiB7XG4gICAgICBjb25zb2xlLmVycm9yKCdzeW5jVXNlciDlpLHotKUnLCBlcnIpO1xuICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSk7XG59XG5cbi8vIOS4iuS8oOe7n+iuoeS4juWtpuS5oOaXpeWOhuWIsOS6keerr++8iOacjeWKoeerr+WQiOW5tuWPlui+g+Wkp+WAvO+8jOW5tuaKiuWQiOW5tue7k+aenOWQjOatpeWbnuacrOWcsO+8iVxuZXhwb3J0IGZ1bmN0aW9uIHN5bmNTdGF0c1RvQ2xvdWQoc3RhdHM6IFN0dWR5U3RhdHMpOiBQcm9taXNlPFN0dWR5U3RhdHMgfCBudWxsPiB7XG4gIHJldHVybiBjYWxsU3luY1VzZXIoeyBzdGF0cywgaGlzdG9yeTogZ2V0RGFpbHlIaXN0b3J5KCksIHRvZGF5OiB0b2RheVN0cigpIH0pLnRoZW4ocmVzID0+IHtcbiAgICBpZiAocmVzICYmIHJlcy5zdGF0cykge1xuICAgICAgY29uc3QgbWVyZ2VkID0gbWVyZ2VTdGF0cyhnZXRTdGF0cygpLCByZXMuc3RhdHMpO1xuICAgICAgc2F2ZVN0YXRzKG1lcmdlZCk7XG4gICAgICBpZiAocmVzLmhpc3RvcnkpIHNhdmVEYWlseUhpc3RvcnkocmVzLmhpc3RvcnkpO1xuICAgICAgaWYgKHJlcy5wcm9maWxlKSBzYXZlTG9jYWxQcm9maWxlKHJlcy5wcm9maWxlKTtcbiAgICAgIHJldHVybiBtZXJnZWQ7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xuICB9KTtcbn1cblxuLy8g5LuO5LqR56uv5ouJ5Y+W57uf6K6h5LiO6LWE5paZ5bm25ZCI5bm25Zue5pys5Zyw77yI6Z2Z6buY77yM5aSx6LSl5LiN5omT5omw77yJXG4vLyDljZXkvovplIHvvJrpmLLmraLpppbpobUv5oiR55qE6aG15bm25Y+R6Kem5Y+R5aSa5qyh5ouJ5Y+WXG5sZXQgcmVzdG9yZVBlbmRpbmc6IFByb21pc2U8dm9pZD4gfCBudWxsID0gbnVsbDtcbmV4cG9ydCBmdW5jdGlvbiByZXN0b3JlU3RhdHNGcm9tQ2xvdWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChyZXN0b3JlUGVuZGluZykgcmV0dXJuIHJlc3RvcmVQZW5kaW5nO1xuICBpZiAoIXd4LmNsb3VkKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgcmVzdG9yZVBlbmRpbmcgPSBjYWxsU3luY1VzZXIoeyB0b2RheTogdG9kYXlTdHIoKSB9KS50aGVuKHJlcyA9PiB7XG4gICAgaWYgKHJlcykge1xuICAgICAgaWYgKHJlcy5zdGF0cykgc2F2ZVN0YXRzKG1lcmdlU3RhdHMoZ2V0U3RhdHMoKSwgcmVzLnN0YXRzKSk7XG4gICAgICBpZiAocmVzLmhpc3RvcnkpIHNhdmVEYWlseUhpc3RvcnkobWVyZ2VEYWlseUhpc3RvcnkoZ2V0RGFpbHlIaXN0b3J5KCksIHJlcy5oaXN0b3J5KSk7XG4gICAgICBpZiAocmVzLnByb2ZpbGUpIHNhdmVMb2NhbFByb2ZpbGUocmVzLnByb2ZpbGUpO1xuICAgIH1cbiAgfSkudGhlbigoKSA9PiB7IHJlc3RvcmVQZW5kaW5nID0gbnVsbDsgfSk7XG5cbiAgcmV0dXJuIHJlc3RvcmVQZW5kaW5nO1xufVxuXG4vLyDkv53lrZjnlKjmiLfotYTmlpnvvIjlpLTlg4/pnIDlhYjnlLHosIPnlKjmlrnkuIrkvKDkuLrkupHlrZjlgqggZmlsZUlE77yJXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlVXNlclByb2ZpbGUobmlja25hbWU6IHN0cmluZywgYXZhdGFyVXJsOiBzdHJpbmcpOiBQcm9taXNlPFVzZXJQcm9maWxlIHwgbnVsbD4ge1xuICByZXR1cm4gY2FsbFN5bmNVc2VyKHsgbmlja25hbWUsIGF2YXRhclVybCwgdG9kYXk6IHRvZGF5U3RyKCkgfSkudGhlbihyZXMgPT4ge1xuICAgIGlmIChyZXMgJiYgcmVzLnByb2ZpbGUpIHtcbiAgICAgIHNhdmVMb2NhbFByb2ZpbGUocmVzLnByb2ZpbGUpO1xuICAgICAgcmV0dXJuIHJlcy5wcm9maWxlO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSk7XG59XG5cbi8vIOKUgOKUgOKUgCDmiZPljaEg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5leHBvcnQgZnVuY3Rpb24gZG9DaGVja0luKCk6IFN0dWR5U3RhdHMge1xuICBjb25zdCBzdGF0cyA9IGdldFN0YXRzKCk7XG4gIGNvbnN0IHRvZGF5ID0gdG9kYXlTdHIoKTtcblxuICAvLyDlpoLmnpzmmK/mlrDnmoTkuIDlpKnvvIzph43nva7miZPljaHnirbmgIFcbiAgaWYgKHN0YXRzLmxhc3RTdHVkeURhdGUgIT09IHRvZGF5KSB7XG4gICAgaWYgKHN0YXRzLmxhc3RTdHVkeURhdGUgJiYgaXNDb25zZWN1dGl2ZShzdGF0cy5sYXN0U3R1ZHlEYXRlLCB0b2RheSkpIHtcbiAgICAgIHN0YXRzLnN0cmVha0RheXMgKz0gMTtcbiAgICB9IGVsc2UgaWYgKCFzdGF0cy5sYXN0U3R1ZHlEYXRlKSB7XG4gICAgICBzdGF0cy5zdHJlYWtEYXlzID0gMTtcbiAgICB9IGVsc2Uge1xuICAgICAgc3RhdHMuc3RyZWFrRGF5cyA9IDE7XG4gICAgfVxuICAgIHN0YXRzLmxlYXJuZWRUb2RheSA9IDA7XG4gICAgc3RhdHMuY2hlY2tlZEluID0gZmFsc2U7XG4gICAgc3RhdHMubGFzdFN0dWR5RGF0ZSA9IHRvZGF5O1xuICB9XG5cbiAgaWYgKCFzdGF0cy5jaGVja2VkSW4pIHtcbiAgICBzdGF0cy5jaGVja2VkSW4gPSB0cnVlO1xuICAgIHNhdmVTdGF0cyhzdGF0cyk7XG4gIH1cbiAgcmV0dXJuIHN0YXRzO1xufVxuXG4vLyDilIDilIDilIAg6K+N5Lmm6YCJ5oupIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3QgQk9PS19LRVkgPSAnYmNfY3VycmVudF9ib29rJztcbmNvbnN0IEJPT0tfQ0hPU0VOX0tFWSA9ICdiY19ib29rX2Nob3Nlbic7XG5cbi8vIOeUqOaIt+aYr+WQpuW3sue7j+S4u+WKqOmAiei/h+ivjeS5pu+8iOWMuuWIhlwi6buY6K6k5Yid5LitXCLlkoxcIueUqOaIt+S4u+WKqOmAieS6huWIneS4rVwi77yJXG5leHBvcnQgZnVuY3Rpb24gaGFzU2VsZWN0ZWRCb29rKCk6IGJvb2xlYW4ge1xuICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoQk9PS19DSE9TRU5fS0VZKSA9PT0gdHJ1ZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEN1cnJlbnRCb29rSWQoKTogc3RyaW5nIHtcbiAgcmV0dXJuIHd4LmdldFN0b3JhZ2VTeW5jKEJPT0tfS0VZKSB8fCAnanVuaW9yJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEN1cnJlbnRCb29rSWQoaWQ6IHN0cmluZyk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhCT09LX0tFWSwgaWQpO1xuICB3eC5zZXRTdG9yYWdlU3luYyhCT09LX0NIT1NFTl9LRVksIHRydWUpO1xuICAvLyDliIfkuabljbPmi4nlj5bor6Xor43kuabnmoTkupHnq6/ov5vluqblubblkIjlubbliLDmnKzlnLDvvJpcbiAgLy8g5riF57yT5a2Y5ZCO5b2T5YmN6K+N5Lmm5Lya6YeN572u77yM5ZCv5Yqo5pe25Y+q5oGi5aSN5LqG6buY6K6k6K+N5Lmm77yM6L+Z6YeM5L+d6K+B5o2i5Yiw5ZOq5pys5bCx5oGi5aSN5ZOq5pysXG4gIHJlc3RvcmVQcm9ncmVzc0Zyb21DbG91ZChpZCkuY2F0Y2goKCkgPT4ge30pO1xufVxuXG4vLyDilIDilIDilIAg5a2m5Lmg5qih5byP77yI6auY6aKR6K+NIC8g5a6M5pW077yJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3QgQkFUQ0hfU0laRV9LRVkgPSAnYmNfYmF0Y2hfc2l6ZSc7XG5leHBvcnQgZnVuY3Rpb24gZ2V0QmF0Y2hTaXplKCk6IG51bWJlciB7XG4gIHJldHVybiB3eC5nZXRTdG9yYWdlU3luYyhCQVRDSF9TSVpFX0tFWSkgfHwgMTA7XG59XG5leHBvcnQgZnVuY3Rpb24gc2V0QmF0Y2hTaXplKG46IG51bWJlcik6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhCQVRDSF9TSVpFX0tFWSwgbik7XG59XG5cbmNvbnN0IFNUVURZX01PREVfS0VZID0gJ2JjX3N0dWR5X21vZGUnO1xuXG5leHBvcnQgdHlwZSBTdHVkeU1vZGUgPSAnYWxsJyB8ICdoaWdoRnJlcScgfCAnZnVuYycgfCAnY29udGVudCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdHVkeU1vZGUoKTogU3R1ZHlNb2RlIHtcbiAgY29uc3QgdiA9IHd4LmdldFN0b3JhZ2VTeW5jKFNUVURZX01PREVfS0VZKTtcbiAgcmV0dXJuICh2ID09PSAnaGlnaEZyZXEnIHx8IHYgPT09ICdmdW5jJyB8fCB2ID09PSAnY29udGVudCcpID8gdiA6ICdhbGwnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0U3R1ZHlNb2RlKG1vZGU6IFN0dWR5TW9kZSk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhTVFVEWV9NT0RFX0tFWSwgbW9kZSk7XG59XG5cbi8vIOKUgOKUgOKUgCDku4rml6XlrabkuaDljZXor43ogZrlkIjvvIjnlKjkuo7lr7zlh7rkuK3oi7Hlr7nnhafooajvvInilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmV4cG9ydCBpbnRlcmZhY2UgVG9kYXlXb3JkIHtcbiAgd29yZDogc3RyaW5nOyAgIC8vIOWNleivjVxuICBib29rSWQ6IHN0cmluZzsgLy8g5omA5bGe6K+N5LmmXG4gIGtub3duOiBib29sZWFuOyAvLyDku4rml6XmnIDlkI7kuIDmrKHmmK/lkKborqTor4Zcbn1cblxuLyoqXG4gKiDmiavmj4/miYDmnInor43kuabnmoTmnKzlnLDov5vluqbvvIzogZrlkIjku4rlpKnvvIjoh6rnhLbml6XvvInlrabov4fnmoTljZXor43jgIJcbiAqIOavj+S4quivjeWPliBsYXN0U2VlbiDmnIDmlrDnmoTkuIDmnaHorrDlvZXliKTmlq3lr7nplJnjgIJcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFRvZGF5TGVhcm5lZFdvcmRzKCk6IFRvZGF5V29yZFtdIHtcbiAgY29uc3Qgbm93ID0gbmV3IERhdGUoKTtcbiAgY29uc3QgZGF5U3RhcnQgPSBuZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSwgbm93LmdldE1vbnRoKCksIG5vdy5nZXREYXRlKCkpLmdldFRpbWUoKTtcbiAgY29uc3Qgb3V0OiBUb2RheVdvcmRbXSA9IFtdO1xuICB0cnkge1xuICAgIGNvbnN0IGluZm8gPSB3eC5nZXRTdG9yYWdlSW5mb1N5bmMoKTtcbiAgICBmb3IgKGNvbnN0IGtleSBvZiBpbmZvLmtleXMpIHtcbiAgICAgIGlmICgha2V5LnN0YXJ0c1dpdGgoJ2JjX3Byb2dyZXNzXycpKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGJvb2tJZCA9IGtleS5zbGljZSgnYmNfcHJvZ3Jlc3NfJy5sZW5ndGgpO1xuICAgICAgY29uc3QgYWxsOiBSZWNvcmQ8c3RyaW5nLCBhbnk+ID0gd3guZ2V0U3RvcmFnZVN5bmMoa2V5KSB8fCB7fTtcbiAgICAgIGZvciAoY29uc3QgdyBvZiBPYmplY3QudmFsdWVzKGFsbCkpIHtcbiAgICAgICAgaWYgKHcgJiYgdy5sYXN0U2VlbiAmJiB3Lmxhc3RTZWVuID49IGRheVN0YXJ0KSB7XG4gICAgICAgICAgb3V0LnB1c2goeyB3b3JkOiB3LndvcmQsIGJvb2tJZCwga25vd246ICh3Lmtub3duQ291bnQgfHwgMCkgPj0gKHcudW5rbm93bkNvdW50IHx8IDApIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9IGNhdGNoIChlKSB7XG4gICAgY29uc29sZS5lcnJvcignW+WvvOWHul0g5LuK5pel5a2m5Lmg6K+N6IGa5ZCI5aSx6LSlJywgZSk7XG4gIH1cbiAgb3V0LnNvcnQoKGEsIGIpID0+IGEud29yZC5sb2NhbGVDb21wYXJlKGIud29yZCkpO1xuICByZXR1cm4gb3V0O1xufVxuXG4vLyDilIDilIDilIAg57uD5Lmg5qih5byP77yI5Y2h54mH57+76Z2iIC8g5Zub6YCJ5LiAIC8g5ou85YaZ77yJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3QgUFJBQ1RJQ0VfTU9ERV9LRVkgPSAnYmNfcHJhY3RpY2VfbW9kZSc7XG5cbmV4cG9ydCB0eXBlIFByYWN0aWNlTW9kZSA9ICdjYXJkJyB8ICdjaG9pY2UnIHwgJ3NwZWxsJyB8ICdtaXgnIHwgJ3F1aWNrJztcblxuLy8g5YW35L2T5Ye66aKY5pa55byP77yIbWl4IOS8muWcqOavj+S4quivjemaj+acuuaYoOWwhOS4uuS7peS4i+S5i+S4gO+8m3F1aWNrIOWtpuS5oOmYtuauteS4uuebtOaOpeaooeW8j+S4jei1sOaYoOWwhO+8iVxuZXhwb3J0IHR5cGUgQ29uY3JldGVQcmFjdGljZU1vZGUgPSAnY2FyZCcgfCAnY2hvaWNlJyB8ICdzcGVsbCcgfCAncXVpY2snO1xuXG5leHBvcnQgZnVuY3Rpb24gdG9Db25jcmV0ZU1vZGUobW9kZTogUHJhY3RpY2VNb2RlKTogQ29uY3JldGVQcmFjdGljZU1vZGUge1xuICBpZiAobW9kZSA9PT0gJ21peCcpIHtcbiAgICBjb25zdCBwb29sOiBDb25jcmV0ZVByYWN0aWNlTW9kZVtdID0gWydjYXJkJywgJ2Nob2ljZScsICdzcGVsbCddO1xuICAgIHJldHVybiBwb29sW01hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHBvb2wubGVuZ3RoKV07XG4gIH1cbiAgcmV0dXJuIG1vZGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRQcmFjdGljZU1vZGUoKTogUHJhY3RpY2VNb2RlIHtcbiAgLy8g5pen54mI5pys5a2Y6L+HICdsaXN0J++8jOe7n+S4gOinhuS4uuaWsOeJiOOAjOW/q+mAn+OAjVxuICBjb25zdCBzYXZlZCA9IHd4LmdldFN0b3JhZ2VTeW5jKFBSQUNUSUNFX01PREVfS0VZKTtcbiAgaWYgKHNhdmVkID09PSAnbGlzdCcpIHJldHVybiAncXVpY2snO1xuICByZXR1cm4gc2F2ZWQgfHwgJ2NhcmQnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJhY3RpY2VNb2RlKG1vZGU6IFByYWN0aWNlTW9kZSk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhQUkFDVElDRV9NT0RFX0tFWSwgbW9kZSk7XG59XG5cbi8vIOKUgOKUgOKUgCDlh7rpopjpobrluo/vvIjpobrluo8gLyDpmo/mnLrvvIkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5jb25zdCBPUkRFUl9NT0RFX0tFWSA9ICdiY19vcmRlcl9tb2RlJztcblxuZXhwb3J0IHR5cGUgT3JkZXJNb2RlID0gJ3JhbmRvbScgfCAnc2VxdWVudGlhbCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRPcmRlck1vZGUoKTogT3JkZXJNb2RlIHtcbiAgY29uc3QgdiA9IHd4LmdldFN0b3JhZ2VTeW5jKE9SREVSX01PREVfS0VZKTtcbiAgcmV0dXJuIHYgPT09ICdzZXF1ZW50aWFsJyA/ICdzZXF1ZW50aWFsJyA6ICdyYW5kb20nOyAvLyDpu5jorqTpmo/mnLrvvIzpgb/lhY3mjInpppblrZfmr43pobrluo/kuqfnlJ/ljozlgKZcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldE9yZGVyTW9kZShtb2RlOiBPcmRlck1vZGUpOiB2b2lkIHtcbiAgd3guc2V0U3RvcmFnZVN5bmMoT1JERVJfTU9ERV9LRVksIG1vZGUpO1xufVxuXG4vLyDilIDilIDilIAg5Y+R6Z+z5YGP5aW977yI6Iux6Z+zIC8g576O6Z+z77yJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3QgQUNDRU5UX0tFWSA9ICdiY19hY2NlbnQnO1xuXG5leHBvcnQgdHlwZSBBY2NlbnQgPSAndWsnIHwgJ3VzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFjY2VudCgpOiBBY2NlbnQge1xuICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoQUNDRU5UX0tFWSkgfHwgJ3VzJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEFjY2VudChhY2NlbnQ6IEFjY2VudCk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhBQ0NFTlRfS0VZLCBhY2NlbnQpO1xufVxuXG4vLyDilIDilIDilIAg5Y2V6K+N6L+b5bqm77yI6Ze06ZqU6K6w5b+G77yJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8g5q+P5Liq6K+N5Lmm5pyJ54us56uL55qE6L+b5bqmIGtleVxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2dyZXNzS2V5KGJvb2tJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBiY19wcm9ncmVzc18ke2Jvb2tJZH1gO1xufVxuXG4vLyDojrflj5bmn5Dor43kuabnmoTlhajpg6jov5vluqZcbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxQcm9ncmVzcyhib29rSWQ6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIFdvcmRQcm9ncmVzcz4ge1xuICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoZ2V0UHJvZ3Jlc3NLZXkoYm9va0lkKSkgfHwge307XG59XG5cbi8vIOS/neWtmOafkOivjeS5puWFqOmDqOi/m+W6plxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVBbGxQcm9ncmVzcyhib29rSWQ6IHN0cmluZywgZGF0YTogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPik6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhnZXRQcm9ncmVzc0tleShib29rSWQpLCBkYXRhKTtcbn1cblxuLy8g6K6w5b2V5Y2V6K+N5a2m5Lmg54q25oCB77yM5pu05paw6Ze06ZqU6K6w5b+G77yIU00tMiDlj5jkvZPvvIlcbi8vIGtub3duOiB0cnVlPeiupOivhiwgZmFsc2U95LiN6K6k6K+GXG4vL1xuLy8gU00tMiDosIPluqbop4TliJnvvJpcbi8vICAgLSDliY0gNCDmrKHov57nu63nrZTlr7nvvJrpl7TpmpQgMeWkqSDihpIgMuWkqSDihpIgNOWkqSDihpIgN+Wkqe+8iOS4juOAjOi/nue7reetlOWvuTTmrKE95bey5o6M5o+h44CN5a6j5Lyg5LiA6Ie077yJXG4vLyAgIC0g56ysIDUg5qyh6LW377ya6Ze06ZqUID0gcm91bmQo5LiK6Ze06ZqUIMOXIOS4quS6uumavuW6puezu+aVsCBlYXNlKe+8jOmaj+aOjOaPoeW6pumAkOatpeaLiemVv1xuLy8gICAtIGVhc2Ug5Liq5Lq65YyW77ya562U5a+5ICswLjA177yI5LiK6ZmQIDIuNe+8jOivjei2iuWuueaYk+mXtOmalOaLieW+l+i2iumVv++8ie+8jOetlOmUmSAtMC4y77yI5LiL6ZmQIDEuM++8iVxuLy8gICAtIOetlOmUme+8mnJlcCDlvZLpm7bjgIHpl7TpmpTlvZLpm7bjgIHnq4vljbPlj6/lpI3kuaDvvIjku4rlpKnlhoXlho3lh7rnjrDvvIlcbi8vICAgLSDlsZXnpLrnlKggYm94ID0gcmVwICsgMe+8iDF+N++8ie+8jGJveD49NSDih5QgcmVwPj00IOKHlCDlt7Lmjozmj6HvvIzlhbzlrrnml6fnu5/orqHpgLvovpFcbmV4cG9ydCBjb25zdCBTTTJfREVGQVVMVF9FQVNFID0gMi41O1xuZXhwb3J0IGNvbnN0IFNNMl9NSU5fRUFTRSA9IDEuMztcbmV4cG9ydCBjb25zdCBTTTJfTUFYX0VBU0UgPSAyLjU7XG5cbmV4cG9ydCBjb25zdCBEQVlfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwO1xuXG4vLyDml6cgTGVpdG5lciDnm5LlrZAg4oaSIOWkjeS5oOmXtOmalO+8iOWkqe+8ie+8jOiAgeaVsOaNruWbnuWhq+S4juaWsOaOkueoi+WFseeUqFxuZXhwb3J0IGNvbnN0IEJPWF9JTlRFUlZBTF9EQVlTOiBSZWNvcmQ8bnVtYmVyLCBudW1iZXI+ID0ge1xuICAxOiAwLFxuICAyOiAxLFxuICAzOiAyLFxuICA0OiA0LFxuICA1OiA3LFxuICA2OiAxNSxcbiAgNzogMzBcbn07XG5cbi8vIOWJjSA0IOasoei/nue7reetlOWvueeahOWbuuWumumXtOmalO+8iOWkqe+8iVxuY29uc3QgU00yX0lOSVRJQUxfSU5URVJWQUxTID0gWzEsIDIsIDQsIDddO1xuXG4vLyDov57nu63nrZTlr7nmrKHmlbAg4oaSIOWxleekuueUqOebkuWtkO+8iDF+N++8iVxuZXhwb3J0IGZ1bmN0aW9uIGJveEZyb21SZXAocmVwOiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gTWF0aC5tYXgoMSwgTWF0aC5taW4oNywgcmVwICsgMSkpO1xufVxuXG4vLyDmoLnmja7ov57nu63nrZTlr7nmrKHmlbDkuI7kuKrkurrpmr7luqbns7vmlbDorqHnrpfkuIvkuIDmrKHlpI3kuaDpl7TpmpTvvIjlpKnvvIlcbi8vIHJlcD0xLi40IOi1sOWbuuWumumXtOmalO+8m3JlcD49NSDotbfmjIkgZWFzZSDkuZjnrpfmi4nplb/vvIjoh7PlsJHmr5TkuIrmrKHlpJogMSDlpKnvvIlcbmV4cG9ydCBmdW5jdGlvbiBzbTJOZXh0SW50ZXJ2YWwocmVwOiBudW1iZXIsIGVhc2U6IG51bWJlciwgcHJldkludGVydmFsOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAocmVwID49IDEgJiYgcmVwIDw9IFNNMl9JTklUSUFMX0lOVEVSVkFMUy5sZW5ndGgpIHtcbiAgICByZXR1cm4gU00yX0lOSVRJQUxfSU5URVJWQUxTW3JlcCAtIDFdO1xuICB9XG4gIHJldHVybiBNYXRoLm1heChwcmV2SW50ZXJ2YWwgKyAxLCBNYXRoLnJvdW5kKHByZXZJbnRlcnZhbCAqIGVhc2UpKTtcbn1cblxuLy8g5pen5pWw5o2u5YW85a6577ya5Y+q5pyJIGJveCDnmoQgTGVpdG5lciDorrDlvZXooaXpvZAgU00tMiDlrZfmrrXvvIjkuI3mlLnliqjlt7LmnInosIPluqbml7bpl7TvvIlcbmZ1bmN0aW9uIG5vcm1hbGl6ZUxlZ2FjeShwOiBXb3JkUHJvZ3Jlc3MpOiB2b2lkIHtcbiAgaWYgKHAucmVwID09PSB1bmRlZmluZWQgfHwgcC5pbnRlcnZhbCA9PT0gdW5kZWZpbmVkIHx8IHAuZWFzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbGVnYWN5UmVwID0gcC5ib3ggJiYgcC5ib3ggPj0gMiA/IE1hdGgubWluKHAuYm94IC0gMSwgNikgOiAwO1xuICAgIHAucmVwID0gbGVnYWN5UmVwO1xuICAgIHAuaW50ZXJ2YWwgPSBCT1hfSU5URVJWQUxfREFZU1twLmJveF0gfHwgMDtcbiAgICBwLmVhc2UgPSBTTTJfREVGQVVMVF9FQVNFO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWNvcmRXb3JkUHJvZ3Jlc3MoXG4gIGJvb2tJZDogc3RyaW5nLFxuICB3b3JkOiBzdHJpbmcsXG4gIGtub3duOiBib29sZWFuXG4pOiBXb3JkUHJvZ3Jlc3Mge1xuICBjb25zdCBhbGwgPSBnZXRBbGxQcm9ncmVzcyhib29rSWQpO1xuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICBsZXQgcCA9IGFsbFt3b3JkXTtcblxuICBpZiAoIXApIHtcbiAgICBwID0ge1xuICAgICAgd29yZCxcbiAgICAgIHN0YXR1czogJ2xlYXJuaW5nJyxcbiAgICAgIGJveDogMSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICBuZXh0UmV2aWV3OiAwLFxuICAgICAgbGFzdFNlZW46IDAsXG4gICAgICBlYXNlOiBTTTJfREVGQVVMVF9FQVNFLFxuICAgICAgcmVwOiAwLFxuICAgICAgaW50ZXJ2YWw6IDBcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIG5vcm1hbGl6ZUxlZ2FjeShwKTtcbiAgfVxuXG4gIGlmIChrbm93bikge1xuICAgIHAua25vd25Db3VudCArPSAxO1xuICB9IGVsc2Uge1xuICAgIHAudW5rbm93bkNvdW50ICs9IDE7XG4gIH1cbiAgcC5sYXN0U2VlbiA9IG5vdztcblxuICBpZiAoIWtub3duKSB7XG4gICAgLy8g4pSA4pSA4pSAIOS4jeiupOivhu+8muWFqOmdoumHjee9ru+8jOeri+WNs+WPr+WkjeS5oCDilIDilIDilIBcbiAgICBwLnJlcCA9IDA7XG4gICAgcC5pbnRlcnZhbCA9IDA7XG4gICAgcC5lYXNlID0gTWF0aC5tYXgoU00yX01JTl9FQVNFLCAocC5lYXNlIHx8IFNNMl9ERUZBVUxUX0VBU0UpIC0gMC4yKTtcbiAgICBwLmJveCA9IDE7XG4gICAgcC5zdGF0dXMgPSAnbGVhcm5pbmcnO1xuICAgIHAubmV4dFJldmlldyA9IG5vdztcbiAgfSBlbHNlIHtcbiAgICAvLyDilIDilIDilIAg6K6k6K+G77yaU00tMiDmjpLnqIsg4pSA4pSA4pSAXG4gICAgY29uc3QgZWFzZSA9IHAuZWFzZSB8fCBTTTJfREVGQVVMVF9FQVNFO1xuICAgIHAucmVwID0gKHAucmVwIHx8IDApICsgMTtcbiAgICBjb25zdCBpbnRlcnZhbCA9IHNtMk5leHRJbnRlcnZhbChwLnJlcCwgZWFzZSwgcC5pbnRlcnZhbCB8fCAwKTtcbiAgICBwLmludGVydmFsID0gaW50ZXJ2YWw7XG4gICAgcC5lYXNlID0gTWF0aC5taW4oU00yX01BWF9FQVNFLCBlYXNlICsgMC4wNSk7XG4gICAgcC5ib3ggPSBib3hGcm9tUmVwKHAucmVwKTtcblxuICAgIC8vIOabtOaWsOWxleekuueKtuaAge+8iGJveCA+PSA1IOWNs+eulyBtYXN0ZXJlZO+8iVxuICAgIGlmIChwLmJveCA+PSA1KSB7XG4gICAgICBwLnN0YXR1cyA9ICdtYXN0ZXJlZCc7XG4gICAgfSBlbHNlIGlmIChwLmJveCA+PSAzKSB7XG4gICAgICBwLnN0YXR1cyA9ICdyZXZpZXcnO1xuICAgIH0gZWxzZSB7XG4gICAgICBwLnN0YXR1cyA9ICdsZWFybmluZyc7XG4gICAgfVxuXG4gICAgcC5uZXh0UmV2aWV3ID0gbm93ICsgaW50ZXJ2YWwgKiBEQVlfTVM7XG4gIH1cblxuICBhbGxbd29yZF0gPSBwO1xuICBzYXZlQWxsUHJvZ3Jlc3MoYm9va0lkLCBhbGwpO1xuICBxdWV1ZVByb2dyZXNzU3luYyhib29rSWQpOyAvLyDpnZnpu5jmjpLpmJ/kuIrkupHvvIzmjaLmnLov5riF57yT5a2Y5LiN5Lii6L+b5bqmXG4gIHJldHVybiBwO1xufVxuXG4vLyDojrflj5bmn5Dor43kuabnmoTlrabkuaDov5vluqbnu5/orqFcbmV4cG9ydCBmdW5jdGlvbiBnZXRCb29rUHJvZ3Jlc3NTdGF0cyhib29rSWQ6IHN0cmluZykge1xuICBjb25zdCBhbGwgPSBnZXRBbGxQcm9ncmVzcyhib29rSWQpO1xuICBjb25zdCB3b3JkcyA9IE9iamVjdC52YWx1ZXMoYWxsKTtcbiAgbGV0IG5ld0NvdW50ID0gMDtcbiAgbGV0IGxlYXJuaW5nQ291bnQgPSAwO1xuICBsZXQgcmV2aWV3Q291bnQgPSAwO1xuICBsZXQgbWFzdGVyZWRDb3VudCA9IDA7XG4gIGxldCBrbm93bkNvdW50ID0gMDsgICAgICAvLyDlt7Llrabov4fnmoTvvIhib3ggPj0gMu+8jOWNs+iHs+WwkeetlOWvuei/h+S4gOasoe+8iVxuICBsZXQgZHVlQ291bnQgPSAwO1xuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICBmb3IgKGNvbnN0IHAgb2Ygd29yZHMpIHtcbiAgICAvLyDln7rkuo4gYm94IOetiee6p+e7n+iuoe+8iGJveCA+PSA1IOWNs+eulyBtYXN0ZXJlZO+8iVxuICAgIGNvbnN0IGJveCA9IHAuYm94IHx8IDE7XG4gICAgaWYgKGJveCA+PSA1KSB7XG4gICAgICBtYXN0ZXJlZENvdW50Kys7XG4gICAgfSBlbHNlIGlmIChib3ggPj0gMykge1xuICAgICAgcmV2aWV3Q291bnQrKztcbiAgICB9IGVsc2Uge1xuICAgICAgbGVhcm5pbmdDb3VudCsrO1xuICAgIH1cbiAgICAvLyDlt7Llrabov4cgPSDoh7PlsJHnrZTlr7nov4fkuIDmrKHvvIhib3ggPj0gMu+8iVxuICAgIGlmIChib3ggPj0gMikge1xuICAgICAga25vd25Db3VudCsrO1xuICAgIH1cbiAgICBpZiAocC5uZXh0UmV2aWV3ID4gMCAmJiBwLm5leHRSZXZpZXcgPD0gbm93ICYmIGJveCA8IDUpIHtcbiAgICAgIGR1ZUNvdW50Kys7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgdG90YWw6IHdvcmRzLmxlbmd0aCxcbiAgICBuZXdDb3VudCxcbiAgICBsZWFybmluZ0NvdW50LFxuICAgIHJldmlld0NvdW50LFxuICAgIG1hc3RlcmVkQ291bnQsXG4gICAga25vd25Db3VudCwgICAvLyDlt7Llrabov4fvvIjoh7PlsJHnrZTlr7nov4fkuIDmrKHvvIlcbiAgICBkdWVDb3VudFxuICB9O1xufVxuXG4vLyDilIDilIDilIAg6L+b5bqm5LqR56uv5ZCM5q2lIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8g5ZCI5bm25Lik5Lu95Y2V6K+N6L+b5bqm77yI5oyJ6K+N5Y+W5pu05LyY6K6w5b2V77yMU00tMiDlj5jkvZPvvInvvJpcbi8vICAgLSDlrabkuaDmt7Hluqbmm7TlpKfogIXog5zvvJrov57nu63nrZTlr7nmrKHmlbAgcmVwIOS8mOWFiO+8jOWFtuasoeWkjeS5oOmXtOmalCBpbnRlcnZhbO+8iOWkqe+8iVxuLy8gICAtIOa3seW6puebuOWQjOWImeWPliBsYXN0U2VlbiDovoPmlrDogIXvvJvml6cgTGVpdG5lciDorrDlvZXmjIkgYm94IOWbnuWhq+WQjuWQjOinhOWImeavlOi+g1xuLy8gICAtIGtub3duL3Vua25vd24g57Sv6K6h5Y+W6L6D5aSn5YC877yM6Ziy5q2i5riF57yT5a2Y5ZCO5Zue6YCAXG4vLyAgIC0g5ZCI5bm257uT5p6c5b2S5LiA5YyW77yaYm94L3N0YXR1cyDnlLEgcmVwIOaOqOWvvO+8jOS/neivgeWxleekuuS4gOiHtFxuLy8g5rOo5oSP77yaY2xvdWRmdW5jdGlvbnMvc3luY1VzZXIvaW5kZXguanMg55qEIG1lcmdlV29yZFByb2dyZXNzIOW/hemhu+S4jui/memHjOS/neaMgeWQjOS4gOetlueVpVxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlUHJvZ3Jlc3MoXG4gIGxvY2FsOiBSZWNvcmQ8c3RyaW5nLCBXb3JkUHJvZ3Jlc3M+LFxuICBjbG91ZDogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPlxuKTogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPiB7XG4gIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPiA9IHt9O1xuICBjb25zdCBrZXlzID0gbmV3IFNldChbLi4uT2JqZWN0LmtleXMobG9jYWwgfHwge30pLCAuLi5PYmplY3Qua2V5cyhjbG91ZCB8fCB7fSldKTtcbiAgZm9yIChjb25zdCBrIG9mIGtleXMpIHtcbiAgICBjb25zdCBsID0gbG9jYWwgJiYgbG9jYWxba107XG4gICAgY29uc3QgYyA9IGNsb3VkICYmIGNsb3VkW2tdO1xuICAgIGlmICghbCkgeyBvdXRba10gPSBjITsgY29udGludWU7IH1cbiAgICBpZiAoIWMpIHsgb3V0W2tdID0gbDsgY29udGludWU7IH1cbiAgICBub3JtYWxpemVMZWdhY3kobCk7XG4gICAgbm9ybWFsaXplTGVnYWN5KGMpO1xuICAgIGNvbnN0IGxTY29yZSA9IChsLnJlcCB8fCAwKSAqIDEwMDAgKyAobC5pbnRlcnZhbCB8fCAwKTtcbiAgICBjb25zdCBjU2NvcmUgPSAoYy5yZXAgfHwgMCkgKiAxMDAwICsgKGMuaW50ZXJ2YWwgfHwgMCk7XG4gICAgbGV0IGJldHRlcjogV29yZFByb2dyZXNzO1xuICAgIGlmIChsU2NvcmUgIT09IGNTY29yZSkge1xuICAgICAgYmV0dGVyID0gY1Njb3JlID4gbFNjb3JlID8gYyA6IGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJldHRlciA9IChjLmxhc3RTZWVuIHx8IDApID49IChsLmxhc3RTZWVuIHx8IDApID8gYyA6IGw7XG4gICAgfVxuICAgIC8vIOW9kuS4gOWMluWxleekuuWtl+aute+8mmJveC9zdGF0dXMg55SxIHJlcCDmjqjlr7xcbiAgICBiZXR0ZXIuYm94ID0gYm94RnJvbVJlcChiZXR0ZXIucmVwIHx8IDApO1xuICAgIGJldHRlci5zdGF0dXMgPSBiZXR0ZXIuYm94ID49IDUgPyAnbWFzdGVyZWQnIDogKGJldHRlci5ib3ggPj0gMyA/ICdyZXZpZXcnIDogJ2xlYXJuaW5nJyk7XG4gICAgb3V0W2tdID0ge1xuICAgICAgLi4uYmV0dGVyLFxuICAgICAga25vd25Db3VudDogTWF0aC5tYXgobC5rbm93bkNvdW50IHx8IDAsIGMua25vd25Db3VudCB8fCAwKSxcbiAgICAgIHVua25vd25Db3VudDogTWF0aC5tYXgobC51bmtub3duQ291bnQgfHwgMCwgYy51bmtub3duQ291bnQgfHwgMClcbiAgICB9O1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIOS4iuS8oOafkOivjeS5pui/m+W6puWIsOS6keerr++8iOacjeWKoeerr+aMieWQjOinhOWImeWQiOW5tu+8jOi/lOWbnuWQiOW5tue7k+aenOWQjuWGmeWbnuacrOWcsO+8iVxuLy8g5aSx6LSl6Z2Z6buY77ya5pys5Zyw5rC46L+c5piv5pyA5Y+v55So55qE5pWw5o2u5rqQ77yM5ZCM5q2l5Y+q5piv5aKe5by6XG5leHBvcnQgZnVuY3Rpb24gc3luY1Byb2dyZXNzVG9DbG91ZChib29rSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBkYXRhID0gZ2V0QWxsUHJvZ3Jlc3MoYm9va0lkKTtcbiAgLy8g5rKh5pyJ5Lu75L2V6L+b5bqm5bCx5LiN5LiK5Lyg77yI5paw55So5oi36Ziy6K+v5YaZ77yJXG4gIGlmICghT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIHJldHVybiBjYWxsU3luY1VzZXIoe1xuICAgIHRvZGF5OiB0b2RheVN0cigpLFxuICAgIHByb2dyZXNzQm9va0lkOiBib29rSWQsXG4gICAgcHJvZ3Jlc3M6IGRhdGFcbiAgfSkudGhlbihyZXMgPT4ge1xuICAgIGlmIChyZXMgJiYgcmVzLnByb2dyZXNzICYmIE9iamVjdC5rZXlzKHJlcy5wcm9ncmVzcykubGVuZ3RoKSB7XG4gICAgICBzYXZlQWxsUHJvZ3Jlc3MoYm9va0lkLCBtZXJnZVByb2dyZXNzKGdldEFsbFByb2dyZXNzKGJvb2tJZCksIHJlcy5wcm9ncmVzcykpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIOS7juS6keerr+aLieWPluafkOivjeS5pui/m+W6puW5tuWQiOW5tuWIsOacrOWcsO+8iOmdmem7mO+8jOWksei0peS4jeaJk+aJsO+8iVxubGV0IHJlc3RvcmVQcm9ncmVzc1BlbmRpbmc6IFByb21pc2U8dm9pZD4gfCBudWxsID0gbnVsbDtcbmxldCByZXN0b3JlUHJvZ3Jlc3NCb29rSWQgPSAnJzsgLy8g5b2T5YmN5Zyo5ouJ55qE6K+N5Lmm77yM6YG/5YWN5YiH5Lmm5pe25paw6K+35rGC6KKr5pen6K+35rGC55qE6ZSB5oyh5o6JXG5leHBvcnQgZnVuY3Rpb24gcmVzdG9yZVByb2dyZXNzRnJvbUNsb3VkKGJvb2tJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChyZXN0b3JlUHJvZ3Jlc3NQZW5kaW5nICYmIHJlc3RvcmVQcm9ncmVzc0Jvb2tJZCA9PT0gYm9va0lkKSByZXR1cm4gcmVzdG9yZVByb2dyZXNzUGVuZGluZztcbiAgaWYgKCF3eC5jbG91ZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIHJlc3RvcmVQcm9ncmVzc0Jvb2tJZCA9IGJvb2tJZDtcbiAgcmVzdG9yZVByb2dyZXNzUGVuZGluZyA9IGNhbGxTeW5jVXNlcih7XG4gICAgdG9kYXk6IHRvZGF5U3RyKCksXG4gICAgcHJvZ3Jlc3NSZXF1ZXN0Qm9va0lkOiBib29rSWRcbiAgfSkudGhlbihyZXMgPT4ge1xuICAgIGlmIChyZXMgJiYgcmVzLnByb2dyZXNzICYmIE9iamVjdC5rZXlzKHJlcy5wcm9ncmVzcykubGVuZ3RoKSB7XG4gICAgICBzYXZlQWxsUHJvZ3Jlc3MoYm9va0lkLCBtZXJnZVByb2dyZXNzKGdldEFsbFByb2dyZXNzKGJvb2tJZCksIHJlcy5wcm9ncmVzcykpO1xuICAgIH1cbiAgfSkudGhlbigoKSA9PiB7IHJlc3RvcmVQcm9ncmVzc1BlbmRpbmcgPSBudWxsOyB9KTtcblxuICByZXR1cm4gcmVzdG9yZVByb2dyZXNzUGVuZGluZztcbn1cblxuLy8g5a2m5Lmg6L+H56iL5Lit6Ieq5Yqo5o6S6Zif5ZCM5q2l77yaOCDnp5LljrvmipbvvIzpgb/lhY3mr4/nrZTkuIDpopjlsLHosIPkuIDmrKHkupHlh73mlbBcbmxldCBwcm9ncmVzc1N5bmNUaW1lcjogYW55ID0gbnVsbDtcbmV4cG9ydCBmdW5jdGlvbiBxdWV1ZVByb2dyZXNzU3luYyhib29rSWQ6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXd4LmNsb3VkKSByZXR1cm47XG4gIGlmIChwcm9ncmVzc1N5bmNUaW1lcikgY2xlYXJUaW1lb3V0KHByb2dyZXNzU3luY1RpbWVyKTtcbiAgcHJvZ3Jlc3NTeW5jVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBwcm9ncmVzc1N5bmNUaW1lciA9IG51bGw7XG4gICAgc3luY1Byb2dyZXNzVG9DbG91ZChib29rSWQpLmNhdGNoKCgpID0+IHt9KTtcbiAgfSwgODAwMCk7XG59XG5cbi8vIOKUgOKUgOKUgCDnlJ/or43mnKwg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5jb25zdCBXUk9OR19CT09LX0tFWSA9ICdiY193cm9uZ19ib29rJztcblxuLy8g55Sf6K+N5pys5p2h55uuXG5leHBvcnQgaW50ZXJmYWNlIFdyb25nQm9va0l0ZW0ge1xuICB3b3JkOiBzdHJpbmc7XG4gIG1lYW5pbmc6IHN0cmluZztcbiAgYm9va0lkOiBzdHJpbmc7ICAgICAvLyDmnaXmupDor43kuaZcbiAgYWRkZWRBdDogbnVtYmVyOyAgICAvLyDmt7vliqDml7bpl7TmiLNcbn1cblxuLy8g6I635Y+W55Sf6K+N5pysXG5leHBvcnQgZnVuY3Rpb24gZ2V0V3JvbmdCb29rKCk6IFdyb25nQm9va0l0ZW1bXSB7XG4gIHJldHVybiB3eC5nZXRTdG9yYWdlU3luYyhXUk9OR19CT09LX0tFWSkgfHwgW107XG59XG5cbi8vIOa3u+WKoOeUn+ivjeWIsOeUn+ivjeacrO+8iOWOu+mHje+8iVxuZXhwb3J0IGZ1bmN0aW9uIGFkZFRvV3JvbmdCb29rKHdvcmQ6IHN0cmluZywgbWVhbmluZzogc3RyaW5nLCBib29rSWQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBsaXN0ID0gZ2V0V3JvbmdCb29rKCk7XG4gIGlmIChsaXN0LnNvbWUoaXRlbSA9PiBpdGVtLndvcmQgPT09IHdvcmQpKSByZXR1cm47XG4gIGxpc3QucHVzaCh7IHdvcmQsIG1lYW5pbmcsIGJvb2tJZCwgYWRkZWRBdDogRGF0ZS5ub3coKSB9KTtcbiAgd3guc2V0U3RvcmFnZVN5bmMoV1JPTkdfQk9PS19LRVksIGxpc3QpO1xuICBxdWV1ZVdyb25nQm9va1N5bmMoKTtcbn1cblxuLy8g5LuO55Sf6K+N5pys56e76ZmkXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlRnJvbVdyb25nQm9vayh3b3JkOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgbGlzdCA9IGdldFdyb25nQm9vaygpLmZpbHRlcihpdGVtID0+IGl0ZW0ud29yZCAhPT0gd29yZCk7XG4gIHd4LnNldFN0b3JhZ2VTeW5jKFdST05HX0JPT0tfS0VZLCBsaXN0KTtcbiAgcXVldWVXcm9uZ0Jvb2tTeW5jKCk7XG59XG5cbi8vIOa4heepuueUn+ivjeacrFxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyV3JvbmdCb29rKCk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhXUk9OR19CT09LX0tFWSwgW10pO1xuICBxdWV1ZVdyb25nQm9va1N5bmMoKTsgLy8g56m65YiX6KGo5Lmf5Lya5LiK5Lyg77yM5LqR56uv5ZCM5q2l5riF56m6XG59XG5cbi8vIOKUgOKUgOKUgCDnlJ/or43mnKzkupHnq6/lkIzmraXvvIjkuI7ov5vluqblkIzmraXlkIzmqKHlvI/vvInilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbi8vIOWQiOW5tuetlueVpe+8muaMiSB3b3JkIOWPluW5tumbhu+8jOWQjOS4gOivjeWPliBhZGRlZEF0IOi+g+aWsOeahOS4gOadoVxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlV3JvbmdCb29rKFxuICBsb2NhbDogV3JvbmdCb29rSXRlbVtdLFxuICBjbG91ZDogV3JvbmdCb29rSXRlbVtdXG4pOiBXcm9uZ0Jvb2tJdGVtW10ge1xuICBjb25zdCBvdXQgPSBuZXcgTWFwPHN0cmluZywgV3JvbmdCb29rSXRlbT4oKTtcbiAgZm9yIChjb25zdCBpdCBvZiBbLi4uKGxvY2FsIHx8IFtdKSwgLi4uKGNsb3VkIHx8IFtdKV0pIHtcbiAgICBjb25zdCBwcmV2ID0gb3V0LmdldChpdC53b3JkKTtcbiAgICBpZiAoIXByZXYgfHwgKGl0LmFkZGVkQXQgfHwgMCkgPj0gKHByZXYuYWRkZWRBdCB8fCAwKSkgb3V0LnNldChpdC53b3JkLCBpdCk7XG4gIH1cbiAgcmV0dXJuIEFycmF5LmZyb20ob3V0LnZhbHVlcygpKTtcbn1cblxuLy8g5LiK5Lyg5pW05Lu955Sf6K+N5pys5Yiw5LqR56uv77yM6L+U5Zue5LqR56uv5bey5pyJ5YaF5a655L6b5pys5Zyw5bm26ZuG5ZCI5bm2XG4vLyDph4fnlKjmlbTooajopobnm5blvI/lhpnlm57vvJrnp7vpmaQv5riF56m65omN6IO95q2j56Gu5ZCM5q2l5Yiw5LqR56uvXG5leHBvcnQgZnVuY3Rpb24gc3luY1dyb25nQm9va1RvQ2xvdWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghd3guY2xvdWQpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgcmV0dXJuIGNhbGxTeW5jVXNlcih7XG4gICAgdG9kYXk6IHRvZGF5U3RyKCksXG4gICAgd3JvbmdCb29rOiBnZXRXcm9uZ0Jvb2soKVxuICB9KS50aGVuKHJlcyA9PiB7XG4gICAgaWYgKHJlcyAmJiBBcnJheS5pc0FycmF5KHJlcy53cm9uZ0Jvb2spKSB7XG4gICAgICBjb25zdCBtZXJnZWQgPSBtZXJnZVdyb25nQm9vayhnZXRXcm9uZ0Jvb2soKSwgcmVzLndyb25nQm9vayk7XG4gICAgICB3eC5zZXRTdG9yYWdlU3luYyhXUk9OR19CT09LX0tFWSwgbWVyZ2VkKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyDlrabkuaDkuK3pnZnpu5jmjpLpmJ/lkIzmraXvvJrljrvmipbvvIzpgb/lhY3popHnuYHosIPkupHlh73mlbBcbmxldCB3cm9uZ0Jvb2tTeW5jVGltZXI6IGFueSA9IG51bGw7XG5mdW5jdGlvbiBxdWV1ZVdyb25nQm9va1N5bmMoKTogdm9pZCB7XG4gIGlmICghd3guY2xvdWQpIHJldHVybjtcbiAgaWYgKHdyb25nQm9va1N5bmNUaW1lcikgY2xlYXJUaW1lb3V0KHdyb25nQm9va1N5bmNUaW1lcik7XG4gIHdyb25nQm9va1N5bmNUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHdyb25nQm9va1N5bmNUaW1lciA9IG51bGw7XG4gICAgc3luY1dyb25nQm9va1RvQ2xvdWQoKS5jYXRjaCgoKSA9PiB7fSk7XG4gIH0sIDgwMDApO1xufVxuXG4vLyDku47kupHnq6/mi4nlj5bnlJ/or43mnKzlubblkIjlubbliLDmnKzlnLDvvIjlkK/liqjml7bosIPnlKjvvJvlpLHotKXpnZnpu5jvvIlcbmxldCByZXN0b3JlV3JvbmdCb29rUGVuZGluZzogUHJvbWlzZTx2b2lkPiB8IG51bGwgPSBudWxsO1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3RvcmVXcm9uZ0Jvb2tGcm9tQ2xvdWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChyZXN0b3JlV3JvbmdCb29rUGVuZGluZykgcmV0dXJuIHJlc3RvcmVXcm9uZ0Jvb2tQZW5kaW5nO1xuICBpZiAoIXd4LmNsb3VkKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgcmVzdG9yZVdyb25nQm9va1BlbmRpbmcgPSBjYWxsU3luY1VzZXIoe1xuICAgIHRvZGF5OiB0b2RheVN0cigpLFxuICAgIHdyb25nQm9va1JlcXVlc3Q6IHRydWVcbiAgfSkudGhlbihyZXMgPT4ge1xuICAgIGlmIChyZXMgJiYgQXJyYXkuaXNBcnJheShyZXMud3JvbmdCb29rKSAmJiByZXMud3JvbmdCb29rLmxlbmd0aCkge1xuICAgICAgY29uc3QgbWVyZ2VkID0gbWVyZ2VXcm9uZ0Jvb2soZ2V0V3JvbmdCb29rKCksIHJlcy53cm9uZ0Jvb2spO1xuICAgICAgd3guc2V0U3RvcmFnZVN5bmMoV1JPTkdfQk9PS19LRVksIG1lcmdlZCk7XG4gICAgfVxuICB9KS50aGVuKCgpID0+IHsgcmVzdG9yZVdyb25nQm9va1BlbmRpbmcgPSBudWxsOyB9KTtcblxuICByZXR1cm4gcmVzdG9yZVdyb25nQm9va1BlbmRpbmc7XG59XG5cbi8vIOKUgOKUgOKUgCDlrabkuaDmj5DphpLlt7LkuIvnur/vvIgyMDI2LTA4LTMx77ya5b6u5L+h5LiA5qyh5oCn6K6i6ZiF5py65Yi277yM6ZyA5q+P5qyh5a2m5a6M6YeN5aSN5o6I5p2D77yM5L2T6aqM57mB55CQ77yb5Luj56CB5rOo6YeK5L+d55WZ77yM6ZqP5pe25Y+v5oGi5aSN77yJIOKUgOKUgOKUgFxuLy8gY29uc3QgU1VCU0NSSUJFX0tFWSA9ICdiY19yZW1pbmRlcl9zdWJzY3JpYmVkJztcbi8vXG4vLyAvLyDimqDvuI8g5pu/5o2i5Li65L2g6Ieq5bex5Zyo5b6u5L+h5YWs5LyX5bmz5Y+w5Yib5bu655qE6K6i6ZiF5raI5oGv5qih5p2/IElEXG4vLyBleHBvcnQgY29uc3QgUkVNSU5ERVJfVEVNUExBVEVfSUQgPSAnX05iSmVlQnVXc25NbnZORGxqUTdmUzRXWlNlcHhDOVRIQ1F4NHplbzMtQSc7XG4vL1xuLy8gLy8g55So5oi35piv5ZCm5bey5o6I5p2D6K6i6ZiF5a2m5Lmg5o+Q6YaSXG4vLyBleHBvcnQgZnVuY3Rpb24gaXNSZW1pbmRlclN1YnNjcmliZWQoKTogYm9vbGVhbiB7XG4vLyAgIHJldHVybiB3eC5nZXRTdG9yYWdlU3luYyhTVUJTQ1JJQkVfS0VZKSA9PT0gdHJ1ZTtcbi8vIH1cbi8vXG4vLyAvLyDmoIforrDnlKjmiLflt7LmjojmnYPorqLpmIVcbi8vIGV4cG9ydCBmdW5jdGlvbiBzZXRSZW1pbmRlclN1YnNjcmliZWQodmFsOiBib29sZWFuKTogdm9pZCB7XG4vLyAgIHd4LnNldFN0b3JhZ2VTeW5jKFNVQlNDUklCRV9LRVksIHZhbCk7XG4vLyB9XG4vL1xuLy8gLy8g6K+35rGC55So5oi35o6I5p2D6K6i6ZiF5a2m5Lmg5o+Q6YaSXG4vLyBleHBvcnQgZnVuY3Rpb24gcmVxdWVzdFJlbWluZGVyU3Vic2NyaWJlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuLy8gICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbi8vICAgICBpZiAoIXd4LnJlcXVlc3RTdWJzY3JpYmVNZXNzYWdlKSB7XG4vLyAgICAgICAvLyDkvY7niYjmnKzkuI3mlK/mjIFcbi8vICAgICAgIHJlc29sdmUoZmFsc2UpO1xuLy8gICAgICAgcmV0dXJuO1xuLy8gICAgIH1cbi8vICAgICB3eC5yZXF1ZXN0U3Vic2NyaWJlTWVzc2FnZSh7XG4vLyAgICAgICB0bXBsSWRzOiBbUkVNSU5ERVJfVEVNUExBVEVfSURdLFxuLy8gICAgICAgc3VjY2VzczogKHJlczogYW55KSA9PiB7XG4vLyAgICAgICAgIGNvbnN0IGFjY2VwdGVkID0gcmVzW1JFTUlOREVSX1RFTVBMQVRFX0lEXSA9PT0gJ2FjY2VwdCc7XG4vLyAgICAgICAgIHNldFJlbWluZGVyU3Vic2NyaWJlZChhY2NlcHRlZCk7XG4vLyAgICAgICAgIC8vIOWQjOatpeS6keerr++8iHNlbmRSZW1pbmRlciDmr4/ml6Xmiavmj4/kvp3mja7vvInvvIzpnZnpu5jlpLHotKVcbi8vICAgICAgICAgc2V0UmVtaW5kZXJTdWJzY3JpYmVkQ2xvdWQoYWNjZXB0ZWQpO1xuLy8gICAgICAgICByZXNvbHZlKGFjY2VwdGVkKTtcbi8vICAgICAgIH0sXG4vLyAgICAgICBmYWlsOiAoKSA9PiB7XG4vLyAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xuLy8gICAgICAgfVxuLy8gICAgIH0pO1xuLy8gICB9KTtcbi8vIH1cbi8vXG4vLyAvLyDkupHnq6/orrDlvZXmr4/ml6Xmj5DphpLorqLpmIXnirbmgIHvvIjnu48gc3luY1VzZXIg5YaZ5YWlIHVzZXJzIOaWh+aho++8jHNlbmRSZW1pbmRlciDmr4/ml6Xmiavmj4/nlKjvvIlcbi8vIGV4cG9ydCBmdW5jdGlvbiBzZXRSZW1pbmRlclN1YnNjcmliZWRDbG91ZCh2YWw6IGJvb2xlYW4pOiB2b2lkIHtcbi8vICAgaWYgKCF3eC5jbG91ZCkgcmV0dXJuO1xuLy8gICBjYWxsU3luY1VzZXIoeyByZW1pbmRlclN1YnNjcmliZWQ6IHZhbCwgdG9kYXk6IHRvZGF5U3RyKCkgfSkuY2F0Y2goKCkgPT4ge30pO1xuLy8gfVxuXG4vLyDimqDvuI8g5q+P5ZGo5a2m5Lmg5ZGo5oql5qih5p2/IElE77yI5b6u5L+h5YWs5LyX5bmz5Y+w44CM6K6i6ZiF5raI5oGv44CN5Y2V54us55Sz6K+377yJXG4vLyAgICDkuKrkurrkuLvkvZPlj6/pgInjgIzlrabkuaAv5pWZ6IKy44CN55u45YWz5qih5p2/77yb5a2X5q615ZCN5Lul5L2g55Sz6K+35Yiw55qE5qih5p2/5Li65YeGXG5leHBvcnQgY29uc3QgV0VFS0xZX1RFTVBMQVRFX0lEID0gJ0hLb2ZyNy1scjF3OHN3b2EtcDdNLXB5TlJQTVJYeGJTdVNTV3JJaktsLUknO1xuXG4vLyDilIDilIDilIAg5q+P5ZGo5a2m5Lmg5ZGo5oql5bey5LiL57q/77yIMjAyNi0wOC0zMe+8muaooeadv+S9k+mqjOS4jeS9s++8m+S7o+eggeazqOmHiuS/neeVme+8jOaooeadv+WPr+eUqOWQjuaBouWkje+8iSDilIDilIDilIBcbi8vIGNvbnN0IFdFRUtMWV9TVUJTQ1JJQkVfS0VZID0gJ2JjX3dlZWtseV9zdWJzY3JpYmVkJztcbi8vXG4vLyBleHBvcnQgZnVuY3Rpb24gaXNXZWVrbHlTdWJzY3JpYmVkKCk6IGJvb2xlYW4ge1xuLy8gICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoV0VFS0xZX1NVQlNDUklCRV9LRVkpID09PSB0cnVlO1xuLy8gfVxuLy9cbi8vIGV4cG9ydCBmdW5jdGlvbiBzZXRXZWVrbHlTdWJzY3JpYmVkKHZhbDogYm9vbGVhbik6IHZvaWQge1xuLy8gICB3eC5zZXRTdG9yYWdlU3luYyhXRUVLTFlfU1VCU0NSSUJFX0tFWSwgdmFsKTtcbi8vIH1cbi8vXG4vLyAvLyDor7fmsYLmjojmnYPmr4/lkajlkajmiqXvvJvmjojmnYPmiJDlip/lkI7kupHnq6/orrDlvZXvvIhzZW5kUmVtaW5kZXIg5ZGo5oql5omr5o+P55So77yJXG4vLyBleHBvcnQgZnVuY3Rpb24gcmVxdWVzdFdlZWtseVN1YnNjcmliZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbi8vICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4vLyAgICAgaWYgKCF3eC5yZXF1ZXN0U3Vic2NyaWJlTWVzc2FnZSkge1xuLy8gICAgICAgcmVzb2x2ZShmYWxzZSk7XG4vLyAgICAgICByZXR1cm47XG4vLyAgICAgfVxuLy8gICAgIHd4LnJlcXVlc3RTdWJzY3JpYmVNZXNzYWdlKHtcbi8vICAgICAgIHRtcGxJZHM6IFtXRUVLTFlfVEVNUExBVEVfSURdLFxuLy8gICAgICAgc3VjY2VzczogKHJlczogYW55KSA9PiB7XG4vLyAgICAgICAgIGNvbnN0IGFjY2VwdGVkID0gcmVzW1dFRUtMWV9URU1QTEFURV9JRF0gPT09ICdhY2NlcHQnO1xuLy8gICAgICAgICBzZXRXZWVrbHlTdWJzY3JpYmVkKGFjY2VwdGVkKTtcbi8vICAgICAgICAgaWYgKGFjY2VwdGVkKSBzZXRXZWVrbHlTdWJzY3JpYmVkQ2xvdWQodHJ1ZSk7XG4vLyAgICAgICAgIHJlc29sdmUoYWNjZXB0ZWQpO1xuLy8gICAgICAgfSxcbi8vICAgICAgIGZhaWw6ICgpID0+IHtcbi8vICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XG4vLyAgICAgICB9XG4vLyAgICAgfSk7XG4vLyAgIH0pO1xuLy8gfVxuLy9cbi8vIC8vIOS6keerr+iusOW9leiuoumYheeKtuaAge+8iOe7jyBzeW5jVXNlciDlhpnlhaUgdXNlcnMg5paH5qGj77yM6Z2Z6buY5aSx6LSl77yJXG4vLyBleHBvcnQgZnVuY3Rpb24gc2V0V2Vla2x5U3Vic2NyaWJlZENsb3VkKHZhbDogYm9vbGVhbik6IHZvaWQge1xuLy8gICBpZiAoIXd4LmNsb3VkKSByZXR1cm47XG4vLyAgIGNhbGxTeW5jVXNlcih7IHdlZWtseVN1YnNjcmliZWQ6IHZhbCwgdG9kYXk6IHRvZGF5U3RyKCkgfSkuY2F0Y2goKCkgPT4ge30pO1xuLy8gfVxuXG4vLyDilIDilIDilIAg5LuK5pel5aSN5Lmg6K6h5YiS77yIU00tMiDmjpLnqIvlj6/op4bljJbvvIkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4vLyDmiorpl7TpmpTorrDlv4bnrpfms5Xlj5jmiJDnlKjmiLflj6/mhJ/nn6XnmoTjgIzkuLrku4DkuYjku4rlpKnlpI3kuaDov5nkupvor43jgI1cbi8vIOWkjeS5oOeQhueUseebtOaOpeW8leeUqOavj+S4quivjeeahOecn+WunuaOkueoi+mXtOmalO+8iGludGVydmFs77yJ77yM6ICM6Z2e5Zu65a6a55uS5a2Q5pig5bCEXG5cbmV4cG9ydCBpbnRlcmZhY2UgUmV2aWV3UGxhbkl0ZW0ge1xuICB3b3JkOiBzdHJpbmc7XG4gIGJveDogbnVtYmVyO1xuICBsYXN0U2VlbjogbnVtYmVyO1xuICBvdmVyZHVlRGF5czogbnVtYmVyOyAvLyDlt7LpgL7mnJ/lpKnmlbDvvIgwPeacqumAvuacn++8jOS7iuWkqeWIsOacn++8iVxuICBpbnRlcnZhbDogbnVtYmVyOyAgICAvLyDlvZPliY3lpI3kuaDpl7TpmpTvvIjlpKnvvIlcbiAgcmVhc29uOiBzdHJpbmc7ICAgICAgLy8g5Li65LuA5LmI5LuK5aSp5aSN5Lmg5a6DXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm94U3RhdCB7XG4gIGJveDogbnVtYmVyO1xuICBsYWJlbDogc3RyaW5nOyAgICAgICAgLy8g55uS5a2Q5ZCN56ew77yI6LW35q2l55uSL+W3qeWbuuS4rS4uLu+8iVxuICBpbnRlcnZhbERlc2M6IHN0cmluZzsgLy8g6K+l55uS5a+55bqU5aSN5Lmg6Ze06ZqU6K+05piOXG4gIGNvdW50OiBudW1iZXI7XG4gIG1hc3RlcmVkOiBib29sZWFuOyAgICAvLyDor6Xnm5LmmK/lkKbnrpflt7Lmjozmj6HljLrvvIhib3g+PTXvvIlcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXZpZXdQbGFuIHtcbiAgdG90YWxMZWFybmVkOiBudW1iZXI7ICAgLy8g6K+l6K+N5Lmm5bey5a2m6K+N5pWw77yIYm94Pj0yIOaIluacieiusOW9le+8iVxuICBkdWVUb2RheTogbnVtYmVyOyAgICAgICAvLyDku4rlpKnliLDmnJ/pnIDlpI3kuaDmlbBcbiAgbWFzdGVyZWRDb3VudDogbnVtYmVyOyAgLy8g5bey5o6M5o+h5pWw77yIYm94Pj0177yJXG4gIGJveERpc3Q6IEJveFN0YXRbXTsgICAgIC8vIOWQhOebkuWtkOWIhuW4g1xuICBkdWVMaXN0OiBSZXZpZXdQbGFuSXRlbVtdOyAvLyDku4rml6XliLDmnJ/or43vvIjmnIDlpJo1MOS4qu+8jOmAvuacn+WkmueahOS8mOWFiO+8iVxuICBmb3JlY2FzdDogeyBsYWJlbDogc3RyaW5nOyBjb3VudDogbnVtYmVyIH1bXTsgLy8g5pyq5p2lN+Wkqeavj+aXpemihOiuoeWIsOacn+aVsFxufVxuXG5jb25zdCBQTEFOX0JPWF9MQUJFTFM6IFJlY29yZDxudW1iZXIsIHsgbGFiZWw6IHN0cmluZzsgaW50ZXJ2YWxEZXNjOiBzdHJpbmcgfT4gPSB7XG4gIDE6IHsgbGFiZWw6ICfnrKwx55uSIMK3IOi1t+atpScsIGludGVydmFsRGVzYzogJ+W9k+WkqeWGheWGjeasoeWHuueOsCcgfSxcbiAgMjogeyBsYWJlbDogJ+esrDLnm5InLCBpbnRlcnZhbERlc2M6ICfpmpQx5aSp5aSN5LmgJyB9LFxuICAzOiB7IGxhYmVsOiAn56ysM+ebkicsIGludGVydmFsRGVzYzogJ+malDLlpKnlpI3kuaAnIH0sXG4gIDQ6IHsgbGFiZWw6ICfnrKw055uSJywgaW50ZXJ2YWxEZXNjOiAn6ZqUNOWkqeWkjeS5oCcgfSxcbiAgNTogeyBsYWJlbDogJ+esrDXnm5Igwrcg5bep5Zu6JywgaW50ZXJ2YWxEZXNjOiAn6ZqUN+WkqeWkjeS5oCcgfSxcbiAgNjogeyBsYWJlbDogJ+esrDbnm5InLCBpbnRlcnZhbERlc2M6ICfpmpQxNeWkqeS7peS4iu+8iOaMieS4quS6uuiKguWlj++8iScgfSxcbiAgNzogeyBsYWJlbDogJ+esrDfnm5Igwrcg6ZW/5pyfJywgaW50ZXJ2YWxEZXNjOiAn6ZqUMzDlpKnku6XkuIogwrcg6ZW/5pyf6K6w5b+GJyB9XG59O1xuXG5jb25zdCBEQVlfTVMyID0gMjQgKiA2MCAqIDYwICogMTAwMDtcblxuZnVuY3Rpb24gZGF5c0JldHdlZW4oZnJvbTogbnVtYmVyLCB0bzogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoKHRvIC0gZnJvbSkgLyBEQVlfTVMyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJldmlld1BsYW4oYm9va0lkOiBzdHJpbmcpOiBSZXZpZXdQbGFuIHtcbiAgY29uc3QgYWxsID0gZ2V0QWxsUHJvZ3Jlc3MoYm9va0lkKTtcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICBjb25zdCBib3hDb3VudHM6IFJlY29yZDxudW1iZXIsIG51bWJlcj4gPSB7fTtcbiAgY29uc3QgZHVlTGlzdDogUmV2aWV3UGxhbkl0ZW1bXSA9IFtdO1xuICBjb25zdCBmb3JlY2FzdCA9IEFycmF5LmZyb20oeyBsZW5ndGg6IDggfSwgKCkgPT4gMCk7IC8vIFswXT3ku4rml6UsIFsxLi43XT3mnKrmnaU35aSpXG4gIGxldCBtYXN0ZXJlZENvdW50ID0gMDtcbiAgbGV0IHRvdGFsTGVhcm5lZCA9IDA7XG5cbiAgZm9yIChjb25zdCBwIG9mIE9iamVjdC52YWx1ZXMoYWxsKSkge1xuICAgIGNvbnN0IGJveCA9IHAuYm94IHx8IDE7XG4gICAgYm94Q291bnRzW2JveF0gPSAoYm94Q291bnRzW2JveF0gfHwgMCkgKyAxO1xuICAgIGlmIChib3ggPj0gMikgdG90YWxMZWFybmVkKys7XG4gICAgaWYgKGJveCA+PSA1KSB7IG1hc3RlcmVkQ291bnQrKzsgfVxuXG4gICAgY29uc3QgbWV0YSA9IFBMQU5fQk9YX0xBQkVMU1tib3hdIHx8IFBMQU5fQk9YX0xBQkVMU1sxXTtcbiAgICBjb25zdCBpc01hc3RlcmVkWm9uZSA9IGJveCA+PSA1O1xuXG4gICAgaWYgKHAubmV4dFJldmlldyA+IDAgJiYgcC5uZXh0UmV2aWV3IDw9IG5vdyAmJiAhaXNNYXN0ZXJlZFpvbmUpIHtcbiAgICAgIC8vIOWIsOacn++8mueUn+aIkOWkjeS5oOeQhueUse+8iOW8leeUqOecn+WunuaOkueoi+mXtOmalO+8iVxuICAgICAgY29uc3Qgb3ZlckRheXMgPSBkYXlzQmV0d2VlbihwLm5leHRSZXZpZXcsIG5vdyk7XG4gICAgICBjb25zdCBpbnRlcnZhbERheXMgPSBwLmludGVydmFsIHx8IEJPWF9JTlRFUlZBTF9EQVlTW2JveF0gfHwgMDtcbiAgICAgIGxldCByZWFzb246IHN0cmluZztcbiAgICAgIGlmIChib3ggPT09IDEgJiYgcC51bmtub3duQ291bnQgPiAwICYmIHAua25vd25Db3VudCA9PT0gMCkge1xuICAgICAgICByZWFzb24gPSAn5LiK5qyh5rKh562U5a+577yM5bey5Zue5Yiw6LW35q2l55uS77yM5LuK5aSp5bCx5YaN6K6k5LiA5qyhJztcbiAgICAgIH0gZWxzZSBpZiAoYm94ID09PSAxKSB7XG4gICAgICAgIHJlYXNvbiA9ICflnKjlt6nlm7rnm5Lph4zph43mlrDlh7rlj5HvvIzku4rlpKnlho3op4HpnaLliqDmt7HljbDosaEnO1xuICAgICAgfSBlbHNlIGlmIChvdmVyRGF5cyA+IDApIHtcbiAgICAgICAgcmVhc29uID0gYOW3sui/m+WFpSR7bWV0YS5sYWJlbH3vvIjmnKzmrKHpl7TpmpQgJHtpbnRlcnZhbERheXN9IOWkqe+8ie+8jOavlOiuoeWIkuaZmuS6hiAke292ZXJEYXlzfSDlpKnvvIzkvJjlhYjlronmjpJgO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVhc29uID0gYOW3sui/m+WFpSR7bWV0YS5sYWJlbH3vvIjmnKzmrKHpl7TpmpQgJHtpbnRlcnZhbERheXN9IOWkqe+8ie+8jOS7iuWkqeato+WlveWIsOacn2A7XG4gICAgICB9XG4gICAgICBkdWVMaXN0LnB1c2goe1xuICAgICAgICB3b3JkOiBwLndvcmQsXG4gICAgICAgIGJveCxcbiAgICAgICAgbGFzdFNlZW46IHAubGFzdFNlZW4gfHwgMCxcbiAgICAgICAgb3ZlcmR1ZURheXM6IE1hdGgubWF4KG92ZXJEYXlzLCAwKSxcbiAgICAgICAgaW50ZXJ2YWw6IGludGVydmFsRGF5cyxcbiAgICAgICAgcmVhc29uXG4gICAgICB9KTtcbiAgICAgIGZvcmVjYXN0WzBdKys7XG4gICAgfSBlbHNlIGlmICghaXNNYXN0ZXJlZFpvbmUgJiYgcC5uZXh0UmV2aWV3ID4gbm93KSB7XG4gICAgICBjb25zdCBkID0gZGF5c0JldHdlZW4obm93LCBwLm5leHRSZXZpZXcpO1xuICAgICAgaWYgKGQgPj0gMSAmJiBkIDw9IDcpIGZvcmVjYXN0W2RdKys7XG4gICAgfVxuICB9XG5cbiAgLy8g5o6S5bqP77ya6YC+5pyf5aSa55qE5Zyo5YmN77yM5YW25qyh55uS5a2Q6auY55qE77yI5o6l6L+R5o6M5o+h55qE5YWI5bep5Zu677yJXG4gIGR1ZUxpc3Quc29ydCgoYSwgYikgPT5cbiAgICBiLm92ZXJkdWVEYXlzIC0gYS5vdmVyZHVlRGF5cyB8fCBiLmJveCAtIGEuYm94IHx8XG4gICAgYS53b3JkLmxvY2FsZUNvbXBhcmUoYi53b3JkKVxuICApO1xuXG4gIGNvbnN0IGJveERpc3Q6IEJveFN0YXRbXSA9IFtdO1xuICBmb3IgKGxldCBiID0gMTsgYiA8PSA3OyBiKyspIHtcbiAgICBjb25zdCBtZXRhID0gUExBTl9CT1hfTEFCRUxTW2JdO1xuICAgIGJveERpc3QucHVzaCh7XG4gICAgICBib3g6IGIsXG4gICAgICAuLi5tZXRhLFxuICAgICAgY291bnQ6IGJveENvdW50c1tiXSB8fCAwLFxuICAgICAgbWFzdGVyZWQ6IGIgPj0gNVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZGF5TGFiZWxzID0gWyfku4rlpKknLCAn5piO5aSpJywgJ+WQjuWkqSddO1xuICByZXR1cm4ge1xuICAgIHRvdGFsTGVhcm5lZCxcbiAgICBkdWVUb2RheTogZm9yZWNhc3RbMF0sXG4gICAgbWFzdGVyZWRDb3VudCxcbiAgICBib3hEaXN0LFxuICAgIGR1ZUxpc3Q6IGR1ZUxpc3Quc2xpY2UoMCwgNTApLFxuICAgIGZvcmVjYXN0OiBmb3JlY2FzdC5zbGljZSgxLCA4KS5tYXAoKGNvdW50LCBpKSA9PiAoe1xuICAgICAgbGFiZWw6IGkgPCAyID8gZGF5TGFiZWxzW2kgKyAxXSA6IGAke2kgKyAxfeWkqeWQjmAsXG4gICAgICBjb3VudFxuICAgIH0pKVxuICB9O1xufVxuIl19