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
    return wx.getStorageSync(PRACTICE_MODE_KEY) || 'card';
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RvcmUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdG9yZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFpREEsZ0NBS0M7QUFHRCw0QkFFQztBQUdELDhCQU1DO0FBY0QsMENBRUM7QUFHRCxnREFLQztBQUdELDRDQVNDO0FBR0QsOENBS0M7QUFHRCx3Q0FrQkM7QUFLRCw0QkFJQztBQUVELDhCQUVDO0FBS0Qsa0NBcUNDO0FBT0QsZ0NBcUJDO0FBVUQsMENBRUM7QUFDRCw0Q0FFQztBQWdDRCw0Q0FXQztBQUtELHNEQWFDO0FBR0QsOENBUUM7QUFHRCw4QkF1QkM7QUFPRCwwQ0FFQztBQUVELDRDQUVDO0FBRUQsNENBTUM7QUFJRCxvQ0FFQztBQUNELG9DQUVDO0FBTUQsb0NBR0M7QUFFRCxvQ0FFQztBQWFELG9EQXFCQztBQVVELHdDQU1DO0FBRUQsMENBRUM7QUFFRCwwQ0FFQztBQU9ELG9DQUdDO0FBRUQsb0NBRUM7QUFPRCw4QkFFQztBQUVELDhCQUVDO0FBSUQsd0NBRUM7QUFHRCx3Q0FFQztBQUdELDBDQUVDO0FBZ0NELGdDQUVDO0FBSUQsMENBS0M7QUFZRCxnREFrRUM7QUFHRCxvREFxQ0M7QUFTRCxzQ0ErQkM7QUFJRCxrREFhQztBQUtELDREQWVDO0FBSUQsOENBT0M7QUFjRCxvQ0FFQztBQUdELHdDQU1DO0FBR0Qsa0RBSUM7QUFHRCx3Q0FHQztBQUlELHdDQVVDO0FBSUQsb0RBV0M7QUFlRCw4REFlQztBQXlJRCxzQ0E2RUM7QUF0K0JELFNBQVMsWUFBWTtJQUNuQixPQUFPO1FBQ0wsWUFBWSxFQUFFLENBQUM7UUFDZixVQUFVLEVBQUUsQ0FBQztRQUNiLFVBQVUsRUFBRSxDQUFDO1FBQ2IsU0FBUyxFQUFFLEtBQUs7UUFDaEIsYUFBYSxFQUFFLEVBQUU7UUFDakIsYUFBYSxFQUFFLENBQUM7UUFDaEIsV0FBVyxFQUFFLEVBQUU7S0FDaEIsQ0FBQztBQUNKLENBQUM7QUFJRCxTQUFnQixVQUFVLENBQUMsQ0FBTztJ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UUFBUSxFQUFFLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7WUFDaEQsS0FBSyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsSUFBSTtZQUM5QyxLQUFLO1NBQ04sQ0FBQyxDQUFDO0tBQ0osQ0FBQztBQUNKLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyB1dGlscy9zdG9yZS50c1xuLy8g5pys5Zyw5a2Y5YKo566h55CG77ya5a2m5Lmg6L+b5bqmIC8g6Ze06ZqU6K6w5b+G77yIU00tMiDlj5jkvZPvvIkvIOaJk+WNoSAvIOivjeS5pumAieaLqVxuLy8g57uf5LiAIGtleSDlkb3lkI3nqbrpl7TliY3nvIAgXCJiY19cIu+8iOihpeivje+8ie+8jOmBv+WFjeS4juWFtuS7luWwj+eoi+W6j+aVsOaNruWGsueqgVxuXG4vLyDilIDilIDilIAg57G75Z6LIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8g5Y2V5Liq5Y2V6K+N55qE5o6M5o+h54q25oCB77yIU00tMiDlj5jkvZPpl7TpmpTorrDlv4bvvIlcbi8vIHJlcD3ov57nu63nrZTlr7nmrKHmlbDjgIFlYXNlPeS4quS6uumavuW6puezu+aVsOOAgWludGVydmFsPeW9k+WJjemXtOmalOWkqeaVsCDihpIg5LiJ6ICF6amx5Yqo5LiL5qyh5aSN5Lmg5pe26Ze0XG4vLyBib3gg5pivIHJlcCDnmoTlsZXnpLrmmKDlsITvvIgxfjfvvIxib3g+PTUg4oeUIOi/nue7reetlOWvuT49NCDmrKEg4oeUIOW3suaOjOaPoe+8ie+8jFxuLy8g5L+d55WZ6K+l5a2X5q616K6p57uf6K6hL+aOkuihjOamnC/mkJzntKLnrYnml6LmnInmtojotLnogIXpm7bmlLnliqjlhbzlrrlcbmV4cG9ydCBpbnRlcmZhY2UgV29yZFByb2dyZXNzIHtcbiAgd29yZDogc3RyaW5nOyAgICAgICAgLy8g5Y2V6K+NXG4gIHN0YXR1czogJ25ldycgfCAnbGVhcm5pbmcnIHwgJ3JldmlldycgfCAnbWFzdGVyZWQnOyAvLyDnirbmgIHvvIjnlKjkuo7nu5/orqHlsZXnpLrvvIlcbiAgYm94OiBudW1iZXI7ICAgICAgICAgIC8vIOWxleekuueUqOebkuWtkOetiee6pyAxfjfvvIg3PemVv+acn+iusOW/hu+8ie+8jOeUsSByZXAg5o6o5a+8XG4gIGtub3duQ291bnQ6IG51bWJlcjsgIC8vIOe0r+iuoeiupOivhuasoeaVsFxuICB1bmtub3duQ291bnQ6IG51bWJlcjsvLyDntK/orqHkuI3orqTor4bmrKHmlbBcbiAgbmV4dFJldmlldzogbnVtYmVyOyAgLy8g5LiL5qyh5aSN5Lmg5pe26Ze05oiz77yIbXPvvIlcbiAgbGFzdFNlZW46IG51bWJlcjsgICAgLy8g5LiK5qyh5a2m5Lmg5pe26Ze05oizXG4gIC8vIOKUgOKUgOKUgCBTTS0yIOiwg+W6puWtl+aute+8iOWPr+mAie+8m+aXpyBMZWl0bmVyIOaVsOaNrue8uuWkseaXtuaMiSBib3gg5Zue5aGr77yJIOKUgOKUgOKUgFxuICBlYXNlPzogbnVtYmVyOyAgICAgICAvLyDkuKrkurrpmr7luqbns7vmlbAgMS4zfjIuNe+8muetlOWvuSArMC4wNSAvIOetlOmUmSAtMC4yXG4gIHJlcD86IG51bWJlcjsgICAgICAgIC8vIOi/nue7reetlOWvueasoeaVsO+8iOetlOmUmeW9kumbtu+8iVxuICBpbnRlcnZhbD86IG51bWJlcjsgICAvLyDlvZPliY3lpI3kuaDpl7TpmpTvvIjlpKnvvIlcbn1cblxuLy8g5a2m5Lmg57uf6K6hXG5leHBvcnQgaW50ZXJmYWNlIFN0dWR5U3RhdHMge1xuICBsZWFybmVkVG9kYXk6IG51bWJlcjtcbiAgc3RyZWFrRGF5czogbnVtYmVyO1xuICB0b3RhbFdvcmRzOiBudW1iZXI7XG4gIGNoZWNrZWRJbjogYm9vbGVhbjtcbiAgbGFzdFN0dWR5RGF0ZTogc3RyaW5nOyAvLyAnWVlZWS1NTS1ERCdcbiAgd2Vla2x5TGVhcm5lZDogbnVtYmVyOyAvLyDmnKzlkajlt7LlraZcbiAgd2Vla2x5U3RhcnQ6IHN0cmluZzsgICAvLyDmnKzlkajotbflp4vml6XmnJ9cbn1cblxuLy8g6buY6K6k57uf6K6hXG5mdW5jdGlvbiBkZWZhdWx0U3RhdHMoKTogU3R1ZHlTdGF0cyB7XG4gIHJldHVybiB7XG4gICAgbGVhcm5lZFRvZGF5OiAwLFxuICAgIHN0cmVha0RheXM6IDAsXG4gICAgdG90YWxXb3JkczogMCxcbiAgICBjaGVja2VkSW46IGZhbHNlLFxuICAgIGxhc3RTdHVkeURhdGU6ICcnLFxuICAgIHdlZWtseUxlYXJuZWQ6IDAsXG4gICAgd2Vla2x5U3RhcnQ6ICcnXG4gIH07XG59XG5cbi8vIOKUgOKUgOKUgCDml6XmnJ/lt6Xlhbcg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4vLyDmoLzlvI/ljJbml6XmnJ/kuLogJ1lZWVktTU0tREQnXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RGF0ZShkOiBEYXRlKTogc3RyaW5nIHtcbiAgY29uc3QgeSA9IGQuZ2V0RnVsbFllYXIoKTtcbiAgY29uc3QgbSA9IFN0cmluZyhkLmdldE1vbnRoKCkgKyAxKS5wYWRTdGFydCgyLCAnMCcpO1xuICBjb25zdCBkYXkgPSBTdHJpbmcoZC5nZXREYXRlKCkpLnBhZFN0YXJ0KDIsICcwJyk7XG4gIHJldHVybiBgJHt5fS0ke219LSR7ZGF5fWA7XG59XG5cbi8vIOiOt+WPluS7iuWkqeaXpeacn+Wtl+espuS4slxuZXhwb3J0IGZ1bmN0aW9uIHRvZGF5U3RyKCk6IHN0cmluZyB7XG4gIHJldHVybiBmb3JtYXREYXRlKG5ldyBEYXRlKCkpO1xufVxuXG4vLyDojrflj5bmnKzlkajkuIDml6XmnJ/lrZfnrKbkuLLvvIjku6XlkajkuIDkuLrkuIDlkajotbflp4vvvIlcbmV4cG9ydCBmdW5jdGlvbiBtb25kYXlTdHIoZDogRGF0ZSA9IG5ldyBEYXRlKCkpOiBzdHJpbmcge1xuICBjb25zdCBkYXRlID0gbmV3IERhdGUoZCk7XG4gIGNvbnN0IGRheSA9IGRhdGUuZ2V0RGF5KCkgfHwgNzsgLy8g5ZGo5pel5pivIDDvvIzovazkuLogN1xuICBjb25zdCBtb25kYXkgPSBuZXcgRGF0ZShkYXRlKTtcbiAgbW9uZGF5LnNldERhdGUoZGF0ZS5nZXREYXRlKCkgLSBkYXkgKyAxKTtcbiAgcmV0dXJuIGZvcm1hdERhdGUobW9uZGF5KTtcbn1cblxuLy8g5Yik5pat5Lik5Liq5pel5pyf5piv5ZCm5piv6L+e57ut55qE77yI5pio5aSpIOKGkiDku4rlpKnvvIlcbmZ1bmN0aW9uIGlzQ29uc2VjdXRpdmUocHJldjogc3RyaW5nLCBjdXI6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBjb25zdCBwcmV2RGF0ZSA9IG5ldyBEYXRlKHByZXYgKyAnVDAwOjAwOjAwJyk7XG4gIGNvbnN0IGN1ckRhdGUgPSBuZXcgRGF0ZShjdXIgKyAnVDAwOjAwOjAwJyk7XG4gIGNvbnN0IGRpZmYgPSAoY3VyRGF0ZS5nZXRUaW1lKCkgLSBwcmV2RGF0ZS5nZXRUaW1lKCkpIC8gKDI0ICogNjAgKiA2MCAqIDEwMDApO1xuICByZXR1cm4gZGlmZiA9PT0gMTtcbn1cblxuLy8g4pSA4pSA4pSAIOavj+aXpeWtpuS5oOiusOW9le+8iOeUqOS6jueDreWKm+Wbvu+8iSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmNvbnN0IERBSUxZX0hJU1RPUllfS0VZID0gJ2JjX2RhaWx5X2hpc3RvcnknO1xuXG4vLyDojrflj5bmr4/ml6XlrabkuaDljoblj7LvvIhSZWNvcmQ8J1lZWVktTU0tREQnLCBjb3VudD7vvIlcbmV4cG9ydCBmdW5jdGlvbiBnZXREYWlseUhpc3RvcnkoKTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiB7XG4gIHJldHVybiB3eC5nZXRTdG9yYWdlU3luYyhEQUlMWV9ISVNUT1JZX0tFWSkgfHwge307XG59XG5cbi8vIOiusOW9leavj+aXpeWtpuS5oOmHj1xuZXhwb3J0IGZ1bmN0aW9uIHJlY29yZERhaWx5SGlzdG9yeShjb3VudDogbnVtYmVyID0gMSk6IHZvaWQge1xuICBjb25zdCBoaXN0b3J5ID0gZ2V0RGFpbHlIaXN0b3J5KCk7XG4gIGNvbnN0IHRvZGF5ID0gdG9kYXlTdHIoKTtcbiAgaGlzdG9yeVt0b2RheV0gPSAoaGlzdG9yeVt0b2RheV0gfHwgMCkgKyBjb3VudDtcbiAgc2F2ZURhaWx5SGlzdG9yeShoaXN0b3J5KTtcbn1cblxuLy8g5L+d5a2Y5q+P5pel5a2m5Lmg5Y6G5Y+y77yI5L6b5LqR56uv5ZCM5q2l5ZCO5YaZ5Zue77yJXG5leHBvcnQgZnVuY3Rpb24gc2F2ZURhaWx5SGlzdG9yeShoaXN0b3J5OiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KTogdm9pZCB7XG4gIC8vIOa4heeQhui2hei/hyA5MCDlpKnnmoTml6fmlbDmja7vvIzpgb/lhY3ml6DpmZDlop7plb9cbiAgY29uc3QgY3V0b2ZmID0gbmV3IERhdGUoKTtcbiAgY3V0b2ZmLnNldERhdGUoY3V0b2ZmLmdldERhdGUoKSAtIDkwKTtcbiAgY29uc3QgY3V0b2ZmU3RyID0gZm9ybWF0RGF0ZShjdXRvZmYpO1xuICBmb3IgKGNvbnN0IGtleSBvZiBPYmplY3Qua2V5cyhoaXN0b3J5KSkge1xuICAgIGlmIChrZXkgPCBjdXRvZmZTdHIpIGRlbGV0ZSBoaXN0b3J5W2tleV07XG4gIH1cbiAgd3guc2V0U3RvcmFnZVN5bmMoREFJTFlfSElTVE9SWV9LRVksIGhpc3RvcnkpO1xufVxuXG4vLyDlkIjlubbkuKTku73mr4/ml6Xljoblj7LvvIjlkIzkuIDlpKnlj5bovoPlpKflgLzvvIznu53kuI3nm7jliqDvvIzpmLLph43lpI3ntK/orqHvvIlcbmV4cG9ydCBmdW5jdGlvbiBtZXJnZURhaWx5SGlzdG9yeShhOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+LCBiOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+KTogUmVjb3JkPHN0cmluZywgbnVtYmVyPiB7XG4gIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHt9O1xuICBmb3IgKGNvbnN0IGsgb2YgT2JqZWN0LmtleXMoYSB8fCB7fSkpIG91dFtrXSA9IGFba10gfHwgMDtcbiAgZm9yIChjb25zdCBrIG9mIE9iamVjdC5rZXlzKGIgfHwge30pKSBvdXRba10gPSBNYXRoLm1heChvdXRba10gfHwgMCwgYltrXSB8fCAwKTtcbiAgcmV0dXJuIG91dDtcbn1cblxuLy8g6I635Y+W5pyA6L+RIE4g5aSp55qE54Ot5Yqb5Zu+5pWw5o2uXG5leHBvcnQgZnVuY3Rpb24gZ2V0SGVhdG1hcERhdGEoZGF5czogbnVtYmVyID0gMzApOiBBcnJheTx7IGRhdGU6IHN0cmluZzsgY291bnQ6IG51bWJlcjsgbGV2ZWw6IG51bWJlciB9PiB7XG4gIGNvbnN0IGhpc3RvcnkgPSBnZXREYWlseUhpc3RvcnkoKTtcbiAgY29uc3QgcmVzdWx0OiBBcnJheTx7IGRhdGU6IHN0cmluZzsgY291bnQ6IG51bWJlcjsgbGV2ZWw6IG51bWJlciB9PiA9IFtdO1xuICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpO1xuICBmb3IgKGxldCBpID0gZGF5cyAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgY29uc3QgZCA9IG5ldyBEYXRlKG5vdyk7XG4gICAgZC5zZXREYXRlKGQuZ2V0RGF0ZSgpIC0gaSk7XG4gICAgY29uc3QgZGF0ZVN0ciA9IGZvcm1hdERhdGUoZCk7XG4gICAgY29uc3QgY291bnQgPSBoaXN0b3J5W2RhdGVTdHJdIHx8IDA7XG4gICAgLy8g5YiG57qn77yaMD3mnKrlrabkuaAsIDE9MS01LCAyPTYtMTUsIDM9MTYtMzAsIDQ9MzArXG4gICAgbGV0IGxldmVsID0gMDtcbiAgICBpZiAoY291bnQgPj0gMzApIGxldmVsID0gNDtcbiAgICBlbHNlIGlmIChjb3VudCA+PSAxNikgbGV2ZWwgPSAzO1xuICAgIGVsc2UgaWYgKGNvdW50ID49IDYpIGxldmVsID0gMjtcbiAgICBlbHNlIGlmIChjb3VudCA+PSAxKSBsZXZlbCA9IDE7XG4gICAgcmVzdWx0LnB1c2goeyBkYXRlOiBkYXRlU3RyLCBjb3VudCwgbGV2ZWwgfSk7XG4gIH1cbiAgcmV0dXJuIHJlc3VsdDtcbn1cblxuLy8g4pSA4pSA4pSAIOe7n+iuoSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmNvbnN0IFNUQVRTX0tFWSA9ICdiY19zdGF0cyc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRTdGF0cygpOiBTdHVkeVN0YXRzIHtcbiAgY29uc3QgcyA9IHd4LmdldFN0b3JhZ2VTeW5jKFNUQVRTX0tFWSk7XG4gIGlmICghcykgcmV0dXJuIGRlZmF1bHRTdGF0cygpO1xuICByZXR1cm4geyAuLi5kZWZhdWx0U3RhdHMoKSwgLi4ucyB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2F2ZVN0YXRzKHM6IFN0dWR5U3RhdHMpOiB2b2lkIHtcbiAgd3guc2V0U3RvcmFnZVN5bmMoU1RBVFNfS0VZLCBzKTtcbn1cblxuLy8g5b2T55So5oi35a2m5Lmg5LiA5Liq6K+N5pe277yM5pu05paw57uf6K6hXG4vLyBpc05ld1dvcmTvvJrmmK/lkKbpppbmrKHlrabnmoTmlrDor43jgILku4XmlrDor43orqHlhaXigJzntK/orqHljZXor40gdG90YWxXb3Jkc+KAne+8m1xuLy8g5aSN5LmgL+W3qeWbui/mjJHmiJgv57uD5Lmg562J6YeN5aSN5a2m5Lmg5Y+q6K6h5YWl5LuK5pelL+acrOWRqOWtpuS5oOmHj+S4juaJk+WNoe+8jOS4jeiuoee0r+iuoeWNleivjeOAglxuZXhwb3J0IGZ1bmN0aW9uIHJlY29yZFN0dWR5KGNvdW50OiBudW1iZXIgPSAxLCBpc05ld1dvcmQ6IGJvb2xlYW4gPSB0cnVlKTogU3R1ZHlTdGF0cyB7XG4gIGNvbnN0IHN0YXRzID0gZ2V0U3RhdHMoKTtcbiAgY29uc3QgdG9kYXkgPSB0b2RheVN0cigpO1xuICBjb25zdCBtb25kYXkgPSBtb25kYXlTdHIoKTtcblxuICAvLyDlpoLmnpzmmK/mlrDnmoTkuIDlpKlcbiAgaWYgKHN0YXRzLmxhc3RTdHVkeURhdGUgIT09IHRvZGF5KSB7XG4gICAgLy8g5qOA5p+l5piv5ZCm6L+e57utXG4gICAgaWYgKHN0YXRzLmxhc3RTdHVkeURhdGUgJiYgaXNDb25zZWN1dGl2ZShzdGF0cy5sYXN0U3R1ZHlEYXRlLCB0b2RheSkpIHtcbiAgICAgIHN0YXRzLnN0cmVha0RheXMgKz0gMTtcbiAgICB9IGVsc2UgaWYgKCFzdGF0cy5sYXN0U3R1ZHlEYXRlKSB7XG4gICAgICAvLyDpppbmrKHlrabkuaBcbiAgICAgIHN0YXRzLnN0cmVha0RheXMgPSAxO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyDmlq3kuobvvIzph43mlrDorqHmlbBcbiAgICAgIHN0YXRzLnN0cmVha0RheXMgPSAxO1xuICAgIH1cbiAgICAvLyDph43nva7ku4rml6XlrabkuaDmlbBcbiAgICBzdGF0cy5sZWFybmVkVG9kYXkgPSAwO1xuICAgIHN0YXRzLmNoZWNrZWRJbiA9IGZhbHNlO1xuICAgIHN0YXRzLmxhc3RTdHVkeURhdGUgPSB0b2RheTtcbiAgfVxuXG4gIC8vIOWmguaenOaYr+aWsOeahOS4gOWRqFxuICBpZiAoc3RhdHMud2Vla2x5U3RhcnQgIT09IG1vbmRheSkge1xuICAgIHN0YXRzLndlZWtseUxlYXJuZWQgPSAwO1xuICAgIHN0YXRzLndlZWtseVN0YXJ0ID0gbW9uZGF5O1xuICB9XG5cbiAgc3RhdHMubGVhcm5lZFRvZGF5ICs9IGNvdW50O1xuICBzdGF0cy53ZWVrbHlMZWFybmVkICs9IGNvdW50O1xuICBpZiAoaXNOZXdXb3JkKSB7XG4gICAgc3RhdHMudG90YWxXb3JkcyArPSBjb3VudDtcbiAgfVxuICBzYXZlU3RhdHMoc3RhdHMpO1xuICByZWNvcmREYWlseUhpc3RvcnkoY291bnQpO1xuICByZXR1cm4gc3RhdHM7XG59XG5cbi8vIOWQiOW5tuacrOWcsOS4juS6keerr+eahOe7n+iuoe+8iOmYsuS4ouWkse+8ie+8mlxuLy8gICAtIOe0r+iuoeWAvO+8iHRvdGFsV29yZHMvc3RyZWFrRGF5c++8ieWPlui+g+Wkp+WAvO+8jOmBv+WFjea4hee8k+WtmOWQjuaKiuWOhuWPsuWGsuWwj1xuLy8gICAtIOS7iuaXpS/mnKzlkajku6XmnKzlnLDkuLrlh4bvvIjmnKzlnLDku4rlpKnlrabov4flsLHmmK/mnIDmlrDvvInvvIzpmLLopobnm5Zcbi8vICAgLSDml6XmnJ/lrZfmrrXlj5bovoPmlrDnmoRcbi8vIOe7neS4jeebuOWKoO+8jOadnOe7nemHjeWkjee0r+iuoeOAglxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlU3RhdHMobG9jYWw6IFN0dWR5U3RhdHMsIGNsb3VkOiBTdHVkeVN0YXRzKTogU3R1ZHlTdGF0cyB7XG4gIGNvbnN0IHRvZGF5ID0gdG9kYXlTdHIoKTtcbiAgcmV0dXJuIHtcbiAgICAuLi5kZWZhdWx0U3RhdHMoKSxcbiAgICAuLi5sb2NhbCxcbiAgICB0b3RhbFdvcmRzOiBNYXRoLm1heChsb2NhbC50b3RhbFdvcmRzIHx8IDAsIGNsb3VkLnRvdGFsV29yZHMgfHwgMCksXG4gICAgc3RyZWFrRGF5czogTWF0aC5tYXgobG9jYWwuc3RyZWFrRGF5cyB8fCAwLCBjbG91ZC5zdHJlYWtEYXlzIHx8IDApLFxuICAgIGxlYXJuZWRUb2RheTogbG9jYWwubGFzdFN0dWR5RGF0ZSA9PT0gdG9kYXlcbiAgICAgID8gbG9jYWwubGVhcm5lZFRvZGF5XG4gICAgICA6IChjbG91ZC5sYXN0U3R1ZHlEYXRlID09PSB0b2RheSA/IChjbG91ZC5sZWFybmVkVG9kYXkgfHwgMCkgOiAwKSxcbiAgICB3ZWVrbHlMZWFybmVkOiBsb2NhbC5sYXN0U3R1ZHlEYXRlID09PSB0b2RheVxuICAgICAgPyBsb2NhbC53ZWVrbHlMZWFybmVkXG4gICAgICA6IE1hdGgubWF4KGxvY2FsLndlZWtseUxlYXJuZWQgfHwgMCwgY2xvdWQud2Vla2x5TGVhcm5lZCB8fCAwKSxcbiAgICBjaGVja2VkSW46IGxvY2FsLmxhc3RTdHVkeURhdGUgPT09IHRvZGF5XG4gICAgICA/IGxvY2FsLmNoZWNrZWRJblxuICAgICAgOiAoY2xvdWQubGFzdFN0dWR5RGF0ZSA9PT0gdG9kYXkgPyBjbG91ZC5jaGVja2VkSW4gOiBmYWxzZSksXG4gICAgbGFzdFN0dWR5RGF0ZTogKGxvY2FsLmxhc3RTdHVkeURhdGUgfHwgJycpID49IChjbG91ZC5sYXN0U3R1ZHlEYXRlIHx8ICcnKVxuICAgICAgPyBsb2NhbC5sYXN0U3R1ZHlEYXRlXG4gICAgICA6IGNsb3VkLmxhc3RTdHVkeURhdGUsXG4gICAgd2Vla2x5U3RhcnQ6IGxvY2FsLndlZWtseVN0YXJ0IHx8IGNsb3VkLndlZWtseVN0YXJ0IHx8ICcnXG4gIH07XG59XG5cbi8vIOKUgOKUgOKUgCDkupHnq6/lkIzmraXvvIjnu48gc3luY1VzZXIg5LqR5Ye95pWw77yM5pyN5Yqh56uv5p2D6ZmQ77yM5Y+v6K+75YWo6YeP5bm26Ieq5Yqo5Y676YeN5ZCI5bm277yJIOKUgOKUgOKUgFxuXG4vLyDnlKjmiLfotYTmlplcbmNvbnN0IFBST0ZJTEVfS0VZID0gJ2JjX3Byb2ZpbGUnO1xuZXhwb3J0IGludGVyZmFjZSBVc2VyUHJvZmlsZSB7XG4gIG5pY2tuYW1lOiBzdHJpbmc7XG4gIGF2YXRhclVybDogc3RyaW5nOyAvLyDkupHlrZjlgqggZmlsZUlEXG59XG5leHBvcnQgZnVuY3Rpb24gZ2V0TG9jYWxQcm9maWxlKCk6IFVzZXJQcm9maWxlIHtcbiAgcmV0dXJuIHd4LmdldFN0b3JhZ2VTeW5jKFBST0ZJTEVfS0VZKSB8fCB7IG5pY2tuYW1lOiAnJywgYXZhdGFyVXJsOiAnJyB9O1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVMb2NhbFByb2ZpbGUocDogVXNlclByb2ZpbGUpOiB2b2lkIHtcbiAgd3guc2V0U3RvcmFnZVN5bmMoUFJPRklMRV9LRVksIHApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIFN5bmNVc2VyUmVzdWx0IHtcbiAgb3BlbmlkPzogc3RyaW5nO1xuICBwcm9maWxlPzogVXNlclByb2ZpbGU7XG4gIHN0YXRzPzogU3R1ZHlTdGF0cztcbiAgaGlzdG9yeT86IFJlY29yZDxzdHJpbmcsIG51bWJlcj47XG4gIHByb2dyZXNzPzogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPjtcbiAgd3JvbmdCb29rPzogV3JvbmdCb29rSXRlbVtdO1xuICBpc05ldz86IGJvb2xlYW47XG59XG5cbi8vIOiwgyBzeW5jVXNlciDkupHlh73mlbDvvIjmnI3liqHnq6/lkIjlubbnu5/orqEr6LWE5paZ44CB6Ieq5Yqo5Y676YeN77yJXG5mdW5jdGlvbiBjYWxsU3luY1VzZXIoZXZlbnQ6IGFueSk6IFByb21pc2U8U3luY1VzZXJSZXN1bHQgfCBudWxsPiB7XG4gIGlmICghd3guY2xvdWQpIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XG4gIC8vIOWKoOi2heaXtu+8muS6keWHveaVsOaMgui1t+aXtuS4jeiDveawuOS5hSBwZW5kaW5n77yM5ZCm5YiZ6L+b5bqm5oGi5aSNL+WQjOatpeawuOi/nOS4jeWujOaIkFxuICByZXR1cm4gbmV3IFByb21pc2U8YW55PigocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgY29uc3QgdCA9IHNldFRpbWVvdXQoKCkgPT4gcmVqZWN0KG5ldyBFcnJvcignc3luY1VzZXIgdGltZW91dCcpKSwgMTAwMDApO1xuICAgIHd4LmNsb3VkXG4gICAgICAuY2FsbEZ1bmN0aW9uKHsgbmFtZTogJ3N5bmNVc2VyJywgZGF0YTogZXZlbnQgfSlcbiAgICAgIC50aGVuKFxuICAgICAgICAocmVzOiBhbnkpID0+IHsgY2xlYXJUaW1lb3V0KHQpOyByZXNvbHZlKHJlcyk7IH0sXG4gICAgICAgIChlOiBhbnkpID0+IHsgY2xlYXJUaW1lb3V0KHQpOyByZWplY3QoZSk7IH1cbiAgICAgICk7XG4gIH0pLnRoZW4oKHJlczogYW55KSA9PiAocmVzICYmIHJlcy5yZXN1bHQpIHx8IG51bGwpXG4gICAgLmNhdGNoKChlcnI6IGFueSkgPT4ge1xuICAgICAgY29uc29sZS5lcnJvcignc3luY1VzZXIg5aSx6LSlJywgZXJyKTtcbiAgICAgIHJldHVybiBudWxsO1xuICAgIH0pO1xufVxuXG4vLyDkuIrkvKDnu5/orqHkuI7lrabkuaDml6XljobliLDkupHnq6/vvIjmnI3liqHnq6/lkIjlubblj5bovoPlpKflgLzvvIzlubbmiorlkIjlubbnu5PmnpzlkIzmraXlm57mnKzlnLDvvIlcbmV4cG9ydCBmdW5jdGlvbiBzeW5jU3RhdHNUb0Nsb3VkKHN0YXRzOiBTdHVkeVN0YXRzKTogUHJvbWlzZTxTdHVkeVN0YXRzIHwgbnVsbD4ge1xuICByZXR1cm4gY2FsbFN5bmNVc2VyKHsgc3RhdHMsIGhpc3Rvcnk6IGdldERhaWx5SGlzdG9yeSgpLCB0b2RheTogdG9kYXlTdHIoKSB9KS50aGVuKHJlcyA9PiB7XG4gICAgaWYgKHJlcyAmJiByZXMuc3RhdHMpIHtcbiAgICAgIGNvbnN0IG1lcmdlZCA9IG1lcmdlU3RhdHMoZ2V0U3RhdHMoKSwgcmVzLnN0YXRzKTtcbiAgICAgIHNhdmVTdGF0cyhtZXJnZWQpO1xuICAgICAgaWYgKHJlcy5oaXN0b3J5KSBzYXZlRGFpbHlIaXN0b3J5KHJlcy5oaXN0b3J5KTtcbiAgICAgIGlmIChyZXMucHJvZmlsZSkgc2F2ZUxvY2FsUHJvZmlsZShyZXMucHJvZmlsZSk7XG4gICAgICByZXR1cm4gbWVyZ2VkO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbiAgfSk7XG59XG5cbi8vIOS7juS6keerr+aLieWPlue7n+iuoeS4jui1hOaWmeW5tuWQiOW5tuWbnuacrOWcsO+8iOmdmem7mO+8jOWksei0peS4jeaJk+aJsO+8iVxuLy8g5Y2V5L6L6ZSB77ya6Ziy5q2i6aaW6aG1L+aIkeeahOmhteW5tuWPkeinpuWPkeWkmuasoeaLieWPllxubGV0IHJlc3RvcmVQZW5kaW5nOiBQcm9taXNlPHZvaWQ+IHwgbnVsbCA9IG51bGw7XG5leHBvcnQgZnVuY3Rpb24gcmVzdG9yZVN0YXRzRnJvbUNsb3VkKCk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAocmVzdG9yZVBlbmRpbmcpIHJldHVybiByZXN0b3JlUGVuZGluZztcbiAgaWYgKCF3eC5jbG91ZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIHJlc3RvcmVQZW5kaW5nID0gY2FsbFN5bmNVc2VyKHsgdG9kYXk6IHRvZGF5U3RyKCkgfSkudGhlbihyZXMgPT4ge1xuICAgIGlmIChyZXMpIHtcbiAgICAgIGlmIChyZXMuc3RhdHMpIHNhdmVTdGF0cyhtZXJnZVN0YXRzKGdldFN0YXRzKCksIHJlcy5zdGF0cykpO1xuICAgICAgaWYgKHJlcy5oaXN0b3J5KSBzYXZlRGFpbHlIaXN0b3J5KG1lcmdlRGFpbHlIaXN0b3J5KGdldERhaWx5SGlzdG9yeSgpLCByZXMuaGlzdG9yeSkpO1xuICAgICAgaWYgKHJlcy5wcm9maWxlKSBzYXZlTG9jYWxQcm9maWxlKHJlcy5wcm9maWxlKTtcbiAgICB9XG4gIH0pLnRoZW4oKCkgPT4geyByZXN0b3JlUGVuZGluZyA9IG51bGw7IH0pO1xuXG4gIHJldHVybiByZXN0b3JlUGVuZGluZztcbn1cblxuLy8g5L+d5a2Y55So5oi36LWE5paZ77yI5aS05YOP6ZyA5YWI55Sx6LCD55So5pa55LiK5Lyg5Li65LqR5a2Y5YKoIGZpbGVJRO+8iVxuZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVzZXJQcm9maWxlKG5pY2tuYW1lOiBzdHJpbmcsIGF2YXRhclVybDogc3RyaW5nKTogUHJvbWlzZTxVc2VyUHJvZmlsZSB8IG51bGw+IHtcbiAgcmV0dXJuIGNhbGxTeW5jVXNlcih7IG5pY2tuYW1lLCBhdmF0YXJVcmwsIHRvZGF5OiB0b2RheVN0cigpIH0pLnRoZW4ocmVzID0+IHtcbiAgICBpZiAocmVzICYmIHJlcy5wcm9maWxlKSB7XG4gICAgICBzYXZlTG9jYWxQcm9maWxlKHJlcy5wcm9maWxlKTtcbiAgICAgIHJldHVybiByZXMucHJvZmlsZTtcbiAgICB9XG4gICAgcmV0dXJuIG51bGw7XG4gIH0pO1xufVxuXG4vLyDilIDilIDilIAg5omT5Y2hIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuZXhwb3J0IGZ1bmN0aW9uIGRvQ2hlY2tJbigpOiBTdHVkeVN0YXRzIHtcbiAgY29uc3Qgc3RhdHMgPSBnZXRTdGF0cygpO1xuICBjb25zdCB0b2RheSA9IHRvZGF5U3RyKCk7XG5cbiAgLy8g5aaC5p6c5piv5paw55qE5LiA5aSp77yM6YeN572u5omT5Y2h54q25oCBXG4gIGlmIChzdGF0cy5sYXN0U3R1ZHlEYXRlICE9PSB0b2RheSkge1xuICAgIGlmIChzdGF0cy5sYXN0U3R1ZHlEYXRlICYmIGlzQ29uc2VjdXRpdmUoc3RhdHMubGFzdFN0dWR5RGF0ZSwgdG9kYXkpKSB7XG4gICAgICBzdGF0cy5zdHJlYWtEYXlzICs9IDE7XG4gICAgfSBlbHNlIGlmICghc3RhdHMubGFzdFN0dWR5RGF0ZSkge1xuICAgICAgc3RhdHMuc3RyZWFrRGF5cyA9IDE7XG4gICAgfSBlbHNlIHtcbiAgICAgIHN0YXRzLnN0cmVha0RheXMgPSAxO1xuICAgIH1cbiAgICBzdGF0cy5sZWFybmVkVG9kYXkgPSAwO1xuICAgIHN0YXRzLmNoZWNrZWRJbiA9IGZhbHNlO1xuICAgIHN0YXRzLmxhc3RTdHVkeURhdGUgPSB0b2RheTtcbiAgfVxuXG4gIGlmICghc3RhdHMuY2hlY2tlZEluKSB7XG4gICAgc3RhdHMuY2hlY2tlZEluID0gdHJ1ZTtcbiAgICBzYXZlU3RhdHMoc3RhdHMpO1xuICB9XG4gIHJldHVybiBzdGF0cztcbn1cblxuLy8g4pSA4pSA4pSAIOivjeS5pumAieaLqSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmNvbnN0IEJPT0tfS0VZID0gJ2JjX2N1cnJlbnRfYm9vayc7XG5jb25zdCBCT09LX0NIT1NFTl9LRVkgPSAnYmNfYm9va19jaG9zZW4nO1xuXG4vLyDnlKjmiLfmmK/lkKblt7Lnu4/kuLvliqjpgInov4for43kuabvvIjljLrliIZcIum7mOiupOWIneS4rVwi5ZKMXCLnlKjmiLfkuLvliqjpgInkuobliJ3kuK1cIu+8iVxuZXhwb3J0IGZ1bmN0aW9uIGhhc1NlbGVjdGVkQm9vaygpOiBib29sZWFuIHtcbiAgcmV0dXJuIHd4LmdldFN0b3JhZ2VTeW5jKEJPT0tfQ0hPU0VOX0tFWSkgPT09IHRydWU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50Qm9va0lkKCk6IHN0cmluZyB7XG4gIHJldHVybiB3eC5nZXRTdG9yYWdlU3luYyhCT09LX0tFWSkgfHwgJ2p1bmlvcic7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzZXRDdXJyZW50Qm9va0lkKGlkOiBzdHJpbmcpOiB2b2lkIHtcbiAgd3guc2V0U3RvcmFnZVN5bmMoQk9PS19LRVksIGlkKTtcbiAgd3guc2V0U3RvcmFnZVN5bmMoQk9PS19DSE9TRU5fS0VZLCB0cnVlKTtcbiAgLy8g5YiH5Lmm5Y2z5ouJ5Y+W6K+l6K+N5Lmm55qE5LqR56uv6L+b5bqm5bm25ZCI5bm25Yiw5pys5Zyw77yaXG4gIC8vIOa4hee8k+WtmOWQjuW9k+WJjeivjeS5puS8mumHjee9ru+8jOWQr+WKqOaXtuWPquaBouWkjeS6hum7mOiupOivjeS5pu+8jOi/memHjOS/neivgeaNouWIsOWTquacrOWwseaBouWkjeWTquacrFxuICByZXN0b3JlUHJvZ3Jlc3NGcm9tQ2xvdWQoaWQpLmNhdGNoKCgpID0+IHt9KTtcbn1cblxuLy8g4pSA4pSA4pSAIOWtpuS5oOaooeW8j++8iOmrmOmikeivjSAvIOWujOaVtO+8iSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmNvbnN0IEJBVENIX1NJWkVfS0VZID0gJ2JjX2JhdGNoX3NpemUnO1xuZXhwb3J0IGZ1bmN0aW9uIGdldEJhdGNoU2l6ZSgpOiBudW1iZXIge1xuICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoQkFUQ0hfU0laRV9LRVkpIHx8IDEwO1xufVxuZXhwb3J0IGZ1bmN0aW9uIHNldEJhdGNoU2l6ZShuOiBudW1iZXIpOiB2b2lkIHtcbiAgd3guc2V0U3RvcmFnZVN5bmMoQkFUQ0hfU0laRV9LRVksIG4pO1xufVxuXG5jb25zdCBTVFVEWV9NT0RFX0tFWSA9ICdiY19zdHVkeV9tb2RlJztcblxuZXhwb3J0IHR5cGUgU3R1ZHlNb2RlID0gJ2FsbCcgfCAnaGlnaEZyZXEnIHwgJ2Z1bmMnIHwgJ2NvbnRlbnQnO1xuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U3R1ZHlNb2RlKCk6IFN0dWR5TW9kZSB7XG4gIGNvbnN0IHYgPSB3eC5nZXRTdG9yYWdlU3luYyhTVFVEWV9NT0RFX0tFWSk7XG4gIHJldHVybiAodiA9PT0gJ2hpZ2hGcmVxJyB8fCB2ID09PSAnZnVuYycgfHwgdiA9PT0gJ2NvbnRlbnQnKSA/IHYgOiAnYWxsJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldFN0dWR5TW9kZShtb2RlOiBTdHVkeU1vZGUpOiB2b2lkIHtcbiAgd3guc2V0U3RvcmFnZVN5bmMoU1RVRFlfTU9ERV9LRVksIG1vZGUpO1xufVxuXG4vLyDilIDilIDilIAg5LuK5pel5a2m5Lmg5Y2V6K+N6IGa5ZCI77yI55So5LqO5a+85Ye65Lit6Iux5a+554Wn6KGo77yJ4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5leHBvcnQgaW50ZXJmYWNlIFRvZGF5V29yZCB7XG4gIHdvcmQ6IHN0cmluZzsgICAvLyDljZXor41cbiAgYm9va0lkOiBzdHJpbmc7IC8vIOaJgOWxnuivjeS5plxuICBrbm93bjogYm9vbGVhbjsgLy8g5LuK5pel5pyA5ZCO5LiA5qyh5piv5ZCm6K6k6K+GXG59XG5cbi8qKlxuICog5omr5o+P5omA5pyJ6K+N5Lmm55qE5pys5Zyw6L+b5bqm77yM6IGa5ZCI5LuK5aSp77yI6Ieq54S25pel77yJ5a2m6L+H55qE5Y2V6K+N44CCXG4gKiDmr4/kuKror43lj5YgbGFzdFNlZW4g5pyA5paw55qE5LiA5p2h6K6w5b2V5Yik5pat5a+56ZSZ44CCXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRUb2RheUxlYXJuZWRXb3JkcygpOiBUb2RheVdvcmRbXSB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGRheVN0YXJ0ID0gbmV3IERhdGUobm93LmdldEZ1bGxZZWFyKCksIG5vdy5nZXRNb250aCgpLCBub3cuZ2V0RGF0ZSgpKS5nZXRUaW1lKCk7XG4gIGNvbnN0IG91dDogVG9kYXlXb3JkW10gPSBbXTtcbiAgdHJ5IHtcbiAgICBjb25zdCBpbmZvID0gd3guZ2V0U3RvcmFnZUluZm9TeW5jKCk7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgaW5mby5rZXlzKSB7XG4gICAgICBpZiAoIWtleS5zdGFydHNXaXRoKCdiY19wcm9ncmVzc18nKSkgY29udGludWU7XG4gICAgICBjb25zdCBib29rSWQgPSBrZXkuc2xpY2UoJ2JjX3Byb2dyZXNzXycubGVuZ3RoKTtcbiAgICAgIGNvbnN0IGFsbDogUmVjb3JkPHN0cmluZywgYW55PiA9IHd4LmdldFN0b3JhZ2VTeW5jKGtleSkgfHwge307XG4gICAgICBmb3IgKGNvbnN0IHcgb2YgT2JqZWN0LnZhbHVlcyhhbGwpKSB7XG4gICAgICAgIGlmICh3ICYmIHcubGFzdFNlZW4gJiYgdy5sYXN0U2VlbiA+PSBkYXlTdGFydCkge1xuICAgICAgICAgIG91dC5wdXNoKHsgd29yZDogdy53b3JkLCBib29rSWQsIGtub3duOiAody5rbm93bkNvdW50IHx8IDApID49ICh3LnVua25vd25Db3VudCB8fCAwKSB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1vlr7zlh7pdIOS7iuaXpeWtpuS5oOivjeiBmuWQiOWksei0pScsIGUpO1xuICB9XG4gIG91dC5zb3J0KChhLCBiKSA9PiBhLndvcmQubG9jYWxlQ29tcGFyZShiLndvcmQpKTtcbiAgcmV0dXJuIG91dDtcbn1cblxuLy8g4pSA4pSA4pSAIOe7g+S5oOaooeW8j++8iOWNoeeJh+e/u+mdoiAvIOWbm+mAieS4gCAvIOaLvOWGme+8iSDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmNvbnN0IFBSQUNUSUNFX01PREVfS0VZID0gJ2JjX3ByYWN0aWNlX21vZGUnO1xuXG5leHBvcnQgdHlwZSBQcmFjdGljZU1vZGUgPSAnY2FyZCcgfCAnY2hvaWNlJyB8ICdzcGVsbCcgfCAnbWl4JyB8ICdsaXN0JztcblxuLy8g5YW35L2T5Ye66aKY5pa55byP77yIbWl4IOS8muWcqOavj+S4quivjemaj+acuuaYoOWwhOS4uuS7peS4i+S5i+S4gO+8m2xpc3Qg5Li655u05o6l5qih5byP5LiN6LWw5pig5bCE77yJXG5leHBvcnQgdHlwZSBDb25jcmV0ZVByYWN0aWNlTW9kZSA9ICdjYXJkJyB8ICdjaG9pY2UnIHwgJ3NwZWxsJyB8ICdsaXN0JztcblxuZXhwb3J0IGZ1bmN0aW9uIHRvQ29uY3JldGVNb2RlKG1vZGU6IFByYWN0aWNlTW9kZSk6IENvbmNyZXRlUHJhY3RpY2VNb2RlIHtcbiAgaWYgKG1vZGUgPT09ICdtaXgnKSB7XG4gICAgY29uc3QgcG9vbDogQ29uY3JldGVQcmFjdGljZU1vZGVbXSA9IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnXTtcbiAgICByZXR1cm4gcG9vbFtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBwb29sLmxlbmd0aCldO1xuICB9XG4gIHJldHVybiBtb2RlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJhY3RpY2VNb2RlKCk6IFByYWN0aWNlTW9kZSB7XG4gIHJldHVybiB3eC5nZXRTdG9yYWdlU3luYyhQUkFDVElDRV9NT0RFX0tFWSkgfHwgJ2NhcmQnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gc2V0UHJhY3RpY2VNb2RlKG1vZGU6IFByYWN0aWNlTW9kZSk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhQUkFDVElDRV9NT0RFX0tFWSwgbW9kZSk7XG59XG5cbi8vIOKUgOKUgOKUgCDlh7rpopjpobrluo/vvIjpobrluo8gLyDpmo/mnLrvvIkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5jb25zdCBPUkRFUl9NT0RFX0tFWSA9ICdiY19vcmRlcl9tb2RlJztcblxuZXhwb3J0IHR5cGUgT3JkZXJNb2RlID0gJ3JhbmRvbScgfCAnc2VxdWVudGlhbCc7XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRPcmRlck1vZGUoKTogT3JkZXJNb2RlIHtcbiAgY29uc3QgdiA9IHd4LmdldFN0b3JhZ2VTeW5jKE9SREVSX01PREVfS0VZKTtcbiAgcmV0dXJuIHYgPT09ICdzZXF1ZW50aWFsJyA/ICdzZXF1ZW50aWFsJyA6ICdyYW5kb20nOyAvLyDpu5jorqTpmo/mnLrvvIzpgb/lhY3mjInpppblrZfmr43pobrluo/kuqfnlJ/ljozlgKZcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldE9yZGVyTW9kZShtb2RlOiBPcmRlck1vZGUpOiB2b2lkIHtcbiAgd3guc2V0U3RvcmFnZVN5bmMoT1JERVJfTU9ERV9LRVksIG1vZGUpO1xufVxuXG4vLyDilIDilIDilIAg5Y+R6Z+z5YGP5aW977yI6Iux6Z+zIC8g576O6Z+z77yJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuY29uc3QgQUNDRU5UX0tFWSA9ICdiY19hY2NlbnQnO1xuXG5leHBvcnQgdHlwZSBBY2NlbnQgPSAndWsnIHwgJ3VzJztcblxuZXhwb3J0IGZ1bmN0aW9uIGdldEFjY2VudCgpOiBBY2NlbnQge1xuICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoQUNDRU5UX0tFWSkgfHwgJ3VzJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNldEFjY2VudChhY2NlbnQ6IEFjY2VudCk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhBQ0NFTlRfS0VZLCBhY2NlbnQpO1xufVxuXG4vLyDilIDilIDilIAg5Y2V6K+N6L+b5bqm77yI6Ze06ZqU6K6w5b+G77yJIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8g5q+P5Liq6K+N5Lmm5pyJ54us56uL55qE6L+b5bqmIGtleVxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2dyZXNzS2V5KGJvb2tJZDogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIGBiY19wcm9ncmVzc18ke2Jvb2tJZH1gO1xufVxuXG4vLyDojrflj5bmn5Dor43kuabnmoTlhajpg6jov5vluqZcbmV4cG9ydCBmdW5jdGlvbiBnZXRBbGxQcm9ncmVzcyhib29rSWQ6IHN0cmluZyk6IFJlY29yZDxzdHJpbmcsIFdvcmRQcm9ncmVzcz4ge1xuICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoZ2V0UHJvZ3Jlc3NLZXkoYm9va0lkKSkgfHwge307XG59XG5cbi8vIOS/neWtmOafkOivjeS5puWFqOmDqOi/m+W6plxuZXhwb3J0IGZ1bmN0aW9uIHNhdmVBbGxQcm9ncmVzcyhib29rSWQ6IHN0cmluZywgZGF0YTogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPik6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhnZXRQcm9ncmVzc0tleShib29rSWQpLCBkYXRhKTtcbn1cblxuLy8g6K6w5b2V5Y2V6K+N5a2m5Lmg54q25oCB77yM5pu05paw6Ze06ZqU6K6w5b+G77yIU00tMiDlj5jkvZPvvIlcbi8vIGtub3duOiB0cnVlPeiupOivhiwgZmFsc2U95LiN6K6k6K+GXG4vL1xuLy8gU00tMiDosIPluqbop4TliJnvvJpcbi8vICAgLSDliY0gNCDmrKHov57nu63nrZTlr7nvvJrpl7TpmpQgMeWkqSDihpIgMuWkqSDihpIgNOWkqSDihpIgN+Wkqe+8iOS4juOAjOi/nue7reetlOWvuTTmrKE95bey5o6M5o+h44CN5a6j5Lyg5LiA6Ie077yJXG4vLyAgIC0g56ysIDUg5qyh6LW377ya6Ze06ZqUID0gcm91bmQo5LiK6Ze06ZqUIMOXIOS4quS6uumavuW6puezu+aVsCBlYXNlKe+8jOmaj+aOjOaPoeW6pumAkOatpeaLiemVv1xuLy8gICAtIGVhc2Ug5Liq5Lq65YyW77ya562U5a+5ICswLjA177yI5LiK6ZmQIDIuNe+8jOivjei2iuWuueaYk+mXtOmalOaLieW+l+i2iumVv++8ie+8jOetlOmUmSAtMC4y77yI5LiL6ZmQIDEuM++8iVxuLy8gICAtIOetlOmUme+8mnJlcCDlvZLpm7bjgIHpl7TpmpTlvZLpm7bjgIHnq4vljbPlj6/lpI3kuaDvvIjku4rlpKnlhoXlho3lh7rnjrDvvIlcbi8vICAgLSDlsZXnpLrnlKggYm94ID0gcmVwICsgMe+8iDF+N++8ie+8jGJveD49NSDih5QgcmVwPj00IOKHlCDlt7Lmjozmj6HvvIzlhbzlrrnml6fnu5/orqHpgLvovpFcbmV4cG9ydCBjb25zdCBTTTJfREVGQVVMVF9FQVNFID0gMi41O1xuZXhwb3J0IGNvbnN0IFNNMl9NSU5fRUFTRSA9IDEuMztcbmV4cG9ydCBjb25zdCBTTTJfTUFYX0VBU0UgPSAyLjU7XG5cbmV4cG9ydCBjb25zdCBEQVlfTVMgPSAyNCAqIDYwICogNjAgKiAxMDAwO1xuXG4vLyDml6cgTGVpdG5lciDnm5LlrZAg4oaSIOWkjeS5oOmXtOmalO+8iOWkqe+8ie+8jOiAgeaVsOaNruWbnuWhq+S4juaWsOaOkueoi+WFseeUqFxuZXhwb3J0IGNvbnN0IEJPWF9JTlRFUlZBTF9EQVlTOiBSZWNvcmQ8bnVtYmVyLCBudW1iZXI+ID0ge1xuICAxOiAwLFxuICAyOiAxLFxuICAzOiAyLFxuICA0OiA0LFxuICA1OiA3LFxuICA2OiAxNSxcbiAgNzogMzBcbn07XG5cbi8vIOWJjSA0IOasoei/nue7reetlOWvueeahOWbuuWumumXtOmalO+8iOWkqe+8iVxuY29uc3QgU00yX0lOSVRJQUxfSU5URVJWQUxTID0gWzEsIDIsIDQsIDddO1xuXG4vLyDov57nu63nrZTlr7nmrKHmlbAg4oaSIOWxleekuueUqOebkuWtkO+8iDF+N++8iVxuZXhwb3J0IGZ1bmN0aW9uIGJveEZyb21SZXAocmVwOiBudW1iZXIpOiBudW1iZXIge1xuICByZXR1cm4gTWF0aC5tYXgoMSwgTWF0aC5taW4oNywgcmVwICsgMSkpO1xufVxuXG4vLyDmoLnmja7ov57nu63nrZTlr7nmrKHmlbDkuI7kuKrkurrpmr7luqbns7vmlbDorqHnrpfkuIvkuIDmrKHlpI3kuaDpl7TpmpTvvIjlpKnvvIlcbi8vIHJlcD0xLi40IOi1sOWbuuWumumXtOmalO+8m3JlcD49NSDotbfmjIkgZWFzZSDkuZjnrpfmi4nplb/vvIjoh7PlsJHmr5TkuIrmrKHlpJogMSDlpKnvvIlcbmV4cG9ydCBmdW5jdGlvbiBzbTJOZXh0SW50ZXJ2YWwocmVwOiBudW1iZXIsIGVhc2U6IG51bWJlciwgcHJldkludGVydmFsOiBudW1iZXIpOiBudW1iZXIge1xuICBpZiAocmVwID49IDEgJiYgcmVwIDw9IFNNMl9JTklUSUFMX0lOVEVSVkFMUy5sZW5ndGgpIHtcbiAgICByZXR1cm4gU00yX0lOSVRJQUxfSU5URVJWQUxTW3JlcCAtIDFdO1xuICB9XG4gIHJldHVybiBNYXRoLm1heChwcmV2SW50ZXJ2YWwgKyAxLCBNYXRoLnJvdW5kKHByZXZJbnRlcnZhbCAqIGVhc2UpKTtcbn1cblxuLy8g5pen5pWw5o2u5YW85a6577ya5Y+q5pyJIGJveCDnmoQgTGVpdG5lciDorrDlvZXooaXpvZAgU00tMiDlrZfmrrXvvIjkuI3mlLnliqjlt7LmnInosIPluqbml7bpl7TvvIlcbmZ1bmN0aW9uIG5vcm1hbGl6ZUxlZ2FjeShwOiBXb3JkUHJvZ3Jlc3MpOiB2b2lkIHtcbiAgaWYgKHAucmVwID09PSB1bmRlZmluZWQgfHwgcC5pbnRlcnZhbCA9PT0gdW5kZWZpbmVkIHx8IHAuZWFzZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgY29uc3QgbGVnYWN5UmVwID0gcC5ib3ggJiYgcC5ib3ggPj0gMiA/IE1hdGgubWluKHAuYm94IC0gMSwgNikgOiAwO1xuICAgIHAucmVwID0gbGVnYWN5UmVwO1xuICAgIHAuaW50ZXJ2YWwgPSBCT1hfSU5URVJWQUxfREFZU1twLmJveF0gfHwgMDtcbiAgICBwLmVhc2UgPSBTTTJfREVGQVVMVF9FQVNFO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZWNvcmRXb3JkUHJvZ3Jlc3MoXG4gIGJvb2tJZDogc3RyaW5nLFxuICB3b3JkOiBzdHJpbmcsXG4gIGtub3duOiBib29sZWFuXG4pOiBXb3JkUHJvZ3Jlc3Mge1xuICBjb25zdCBhbGwgPSBnZXRBbGxQcm9ncmVzcyhib29rSWQpO1xuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICBsZXQgcCA9IGFsbFt3b3JkXTtcblxuICBpZiAoIXApIHtcbiAgICBwID0ge1xuICAgICAgd29yZCxcbiAgICAgIHN0YXR1czogJ2xlYXJuaW5nJyxcbiAgICAgIGJveDogMSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICBuZXh0UmV2aWV3OiAwLFxuICAgICAgbGFzdFNlZW46IDAsXG4gICAgICBlYXNlOiBTTTJfREVGQVVMVF9FQVNFLFxuICAgICAgcmVwOiAwLFxuICAgICAgaW50ZXJ2YWw6IDBcbiAgICB9O1xuICB9IGVsc2Uge1xuICAgIG5vcm1hbGl6ZUxlZ2FjeShwKTtcbiAgfVxuXG4gIGlmIChrbm93bikge1xuICAgIHAua25vd25Db3VudCArPSAxO1xuICB9IGVsc2Uge1xuICAgIHAudW5rbm93bkNvdW50ICs9IDE7XG4gIH1cbiAgcC5sYXN0U2VlbiA9IG5vdztcblxuICBpZiAoIWtub3duKSB7XG4gICAgLy8g4pSA4pSA4pSAIOS4jeiupOivhu+8muWFqOmdoumHjee9ru+8jOeri+WNs+WPr+WkjeS5oCDilIDilIDilIBcbiAgICBwLnJlcCA9IDA7XG4gICAgcC5pbnRlcnZhbCA9IDA7XG4gICAgcC5lYXNlID0gTWF0aC5tYXgoU00yX01JTl9FQVNFLCAocC5lYXNlIHx8IFNNMl9ERUZBVUxUX0VBU0UpIC0gMC4yKTtcbiAgICBwLmJveCA9IDE7XG4gICAgcC5zdGF0dXMgPSAnbGVhcm5pbmcnO1xuICAgIHAubmV4dFJldmlldyA9IG5vdztcbiAgfSBlbHNlIHtcbiAgICAvLyDilIDilIDilIAg6K6k6K+G77yaU00tMiDmjpLnqIsg4pSA4pSA4pSAXG4gICAgY29uc3QgZWFzZSA9IHAuZWFzZSB8fCBTTTJfREVGQVVMVF9FQVNFO1xuICAgIHAucmVwID0gKHAucmVwIHx8IDApICsgMTtcbiAgICBjb25zdCBpbnRlcnZhbCA9IHNtMk5leHRJbnRlcnZhbChwLnJlcCwgZWFzZSwgcC5pbnRlcnZhbCB8fCAwKTtcbiAgICBwLmludGVydmFsID0gaW50ZXJ2YWw7XG4gICAgcC5lYXNlID0gTWF0aC5taW4oU00yX01BWF9FQVNFLCBlYXNlICsgMC4wNSk7XG4gICAgcC5ib3ggPSBib3hGcm9tUmVwKHAucmVwKTtcblxuICAgIC8vIOabtOaWsOWxleekuueKtuaAge+8iGJveCA+PSA1IOWNs+eulyBtYXN0ZXJlZO+8iVxuICAgIGlmIChwLmJveCA+PSA1KSB7XG4gICAgICBwLnN0YXR1cyA9ICdtYXN0ZXJlZCc7XG4gICAgfSBlbHNlIGlmIChwLmJveCA+PSAzKSB7XG4gICAgICBwLnN0YXR1cyA9ICdyZXZpZXcnO1xuICAgIH0gZWxzZSB7XG4gICAgICBwLnN0YXR1cyA9ICdsZWFybmluZyc7XG4gICAgfVxuXG4gICAgcC5uZXh0UmV2aWV3ID0gbm93ICsgaW50ZXJ2YWwgKiBEQVlfTVM7XG4gIH1cblxuICBhbGxbd29yZF0gPSBwO1xuICBzYXZlQWxsUHJvZ3Jlc3MoYm9va0lkLCBhbGwpO1xuICBxdWV1ZVByb2dyZXNzU3luYyhib29rSWQpOyAvLyDpnZnpu5jmjpLpmJ/kuIrkupHvvIzmjaLmnLov5riF57yT5a2Y5LiN5Lii6L+b5bqmXG4gIHJldHVybiBwO1xufVxuXG4vLyDojrflj5bmn5Dor43kuabnmoTlrabkuaDov5vluqbnu5/orqFcbmV4cG9ydCBmdW5jdGlvbiBnZXRCb29rUHJvZ3Jlc3NTdGF0cyhib29rSWQ6IHN0cmluZykge1xuICBjb25zdCBhbGwgPSBnZXRBbGxQcm9ncmVzcyhib29rSWQpO1xuICBjb25zdCB3b3JkcyA9IE9iamVjdC52YWx1ZXMoYWxsKTtcbiAgbGV0IG5ld0NvdW50ID0gMDtcbiAgbGV0IGxlYXJuaW5nQ291bnQgPSAwO1xuICBsZXQgcmV2aWV3Q291bnQgPSAwO1xuICBsZXQgbWFzdGVyZWRDb3VudCA9IDA7XG4gIGxldCBrbm93bkNvdW50ID0gMDsgICAgICAvLyDlt7Llrabov4fnmoTvvIhib3ggPj0gMu+8jOWNs+iHs+WwkeetlOWvuei/h+S4gOasoe+8iVxuICBsZXQgZHVlQ291bnQgPSAwO1xuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICBmb3IgKGNvbnN0IHAgb2Ygd29yZHMpIHtcbiAgICAvLyDln7rkuo4gYm94IOetiee6p+e7n+iuoe+8iGJveCA+PSA1IOWNs+eulyBtYXN0ZXJlZO+8iVxuICAgIGNvbnN0IGJveCA9IHAuYm94IHx8IDE7XG4gICAgaWYgKGJveCA+PSA1KSB7XG4gICAgICBtYXN0ZXJlZENvdW50Kys7XG4gICAgfSBlbHNlIGlmIChib3ggPj0gMykge1xuICAgICAgcmV2aWV3Q291bnQrKztcbiAgICB9IGVsc2Uge1xuICAgICAgbGVhcm5pbmdDb3VudCsrO1xuICAgIH1cbiAgICAvLyDlt7Llrabov4cgPSDoh7PlsJHnrZTlr7nov4fkuIDmrKHvvIhib3ggPj0gMu+8iVxuICAgIGlmIChib3ggPj0gMikge1xuICAgICAga25vd25Db3VudCsrO1xuICAgIH1cbiAgICBpZiAocC5uZXh0UmV2aWV3ID4gMCAmJiBwLm5leHRSZXZpZXcgPD0gbm93ICYmIGJveCA8IDUpIHtcbiAgICAgIGR1ZUNvdW50Kys7XG4gICAgfVxuICB9XG4gIHJldHVybiB7XG4gICAgdG90YWw6IHdvcmRzLmxlbmd0aCxcbiAgICBuZXdDb3VudCxcbiAgICBsZWFybmluZ0NvdW50LFxuICAgIHJldmlld0NvdW50LFxuICAgIG1hc3RlcmVkQ291bnQsXG4gICAga25vd25Db3VudCwgICAvLyDlt7Llrabov4fvvIjoh7PlsJHnrZTlr7nov4fkuIDmrKHvvIlcbiAgICBkdWVDb3VudFxuICB9O1xufVxuXG4vLyDilIDilIDilIAg6L+b5bqm5LqR56uv5ZCM5q2lIOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8g5ZCI5bm25Lik5Lu95Y2V6K+N6L+b5bqm77yI5oyJ6K+N5Y+W5pu05LyY6K6w5b2V77yMU00tMiDlj5jkvZPvvInvvJpcbi8vICAgLSDlrabkuaDmt7Hluqbmm7TlpKfogIXog5zvvJrov57nu63nrZTlr7nmrKHmlbAgcmVwIOS8mOWFiO+8jOWFtuasoeWkjeS5oOmXtOmalCBpbnRlcnZhbO+8iOWkqe+8iVxuLy8gICAtIOa3seW6puebuOWQjOWImeWPliBsYXN0U2VlbiDovoPmlrDogIXvvJvml6cgTGVpdG5lciDorrDlvZXmjIkgYm94IOWbnuWhq+WQjuWQjOinhOWImeavlOi+g1xuLy8gICAtIGtub3duL3Vua25vd24g57Sv6K6h5Y+W6L6D5aSn5YC877yM6Ziy5q2i5riF57yT5a2Y5ZCO5Zue6YCAXG4vLyAgIC0g5ZCI5bm257uT5p6c5b2S5LiA5YyW77yaYm94L3N0YXR1cyDnlLEgcmVwIOaOqOWvvO+8jOS/neivgeWxleekuuS4gOiHtFxuLy8g5rOo5oSP77yaY2xvdWRmdW5jdGlvbnMvc3luY1VzZXIvaW5kZXguanMg55qEIG1lcmdlV29yZFByb2dyZXNzIOW/hemhu+S4jui/memHjOS/neaMgeWQjOS4gOetlueVpVxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlUHJvZ3Jlc3MoXG4gIGxvY2FsOiBSZWNvcmQ8c3RyaW5nLCBXb3JkUHJvZ3Jlc3M+LFxuICBjbG91ZDogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPlxuKTogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPiB7XG4gIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgV29yZFByb2dyZXNzPiA9IHt9O1xuICBjb25zdCBrZXlzID0gbmV3IFNldChbLi4uT2JqZWN0LmtleXMobG9jYWwgfHwge30pLCAuLi5PYmplY3Qua2V5cyhjbG91ZCB8fCB7fSldKTtcbiAgZm9yIChjb25zdCBrIG9mIGtleXMpIHtcbiAgICBjb25zdCBsID0gbG9jYWwgJiYgbG9jYWxba107XG4gICAgY29uc3QgYyA9IGNsb3VkICYmIGNsb3VkW2tdO1xuICAgIGlmICghbCkgeyBvdXRba10gPSBjITsgY29udGludWU7IH1cbiAgICBpZiAoIWMpIHsgb3V0W2tdID0gbDsgY29udGludWU7IH1cbiAgICBub3JtYWxpemVMZWdhY3kobCk7XG4gICAgbm9ybWFsaXplTGVnYWN5KGMpO1xuICAgIGNvbnN0IGxTY29yZSA9IChsLnJlcCB8fCAwKSAqIDEwMDAgKyAobC5pbnRlcnZhbCB8fCAwKTtcbiAgICBjb25zdCBjU2NvcmUgPSAoYy5yZXAgfHwgMCkgKiAxMDAwICsgKGMuaW50ZXJ2YWwgfHwgMCk7XG4gICAgbGV0IGJldHRlcjogV29yZFByb2dyZXNzO1xuICAgIGlmIChsU2NvcmUgIT09IGNTY29yZSkge1xuICAgICAgYmV0dGVyID0gY1Njb3JlID4gbFNjb3JlID8gYyA6IGw7XG4gICAgfSBlbHNlIHtcbiAgICAgIGJldHRlciA9IChjLmxhc3RTZWVuIHx8IDApID49IChsLmxhc3RTZWVuIHx8IDApID8gYyA6IGw7XG4gICAgfVxuICAgIC8vIOW9kuS4gOWMluWxleekuuWtl+aute+8mmJveC9zdGF0dXMg55SxIHJlcCDmjqjlr7xcbiAgICBiZXR0ZXIuYm94ID0gYm94RnJvbVJlcChiZXR0ZXIucmVwIHx8IDApO1xuICAgIGJldHRlci5zdGF0dXMgPSBiZXR0ZXIuYm94ID49IDUgPyAnbWFzdGVyZWQnIDogKGJldHRlci5ib3ggPj0gMyA/ICdyZXZpZXcnIDogJ2xlYXJuaW5nJyk7XG4gICAgb3V0W2tdID0ge1xuICAgICAgLi4uYmV0dGVyLFxuICAgICAga25vd25Db3VudDogTWF0aC5tYXgobC5rbm93bkNvdW50IHx8IDAsIGMua25vd25Db3VudCB8fCAwKSxcbiAgICAgIHVua25vd25Db3VudDogTWF0aC5tYXgobC51bmtub3duQ291bnQgfHwgMCwgYy51bmtub3duQ291bnQgfHwgMClcbiAgICB9O1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbi8vIOS4iuS8oOafkOivjeS5pui/m+W6puWIsOS6keerr++8iOacjeWKoeerr+aMieWQjOinhOWImeWQiOW5tu+8jOi/lOWbnuWQiOW5tue7k+aenOWQjuWGmeWbnuacrOWcsO+8iVxuLy8g5aSx6LSl6Z2Z6buY77ya5pys5Zyw5rC46L+c5piv5pyA5Y+v55So55qE5pWw5o2u5rqQ77yM5ZCM5q2l5Y+q5piv5aKe5by6XG5leHBvcnQgZnVuY3Rpb24gc3luY1Byb2dyZXNzVG9DbG91ZChib29rSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xuICBjb25zdCBkYXRhID0gZ2V0QWxsUHJvZ3Jlc3MoYm9va0lkKTtcbiAgLy8g5rKh5pyJ5Lu75L2V6L+b5bqm5bCx5LiN5LiK5Lyg77yI5paw55So5oi36Ziy6K+v5YaZ77yJXG4gIGlmICghT2JqZWN0LmtleXMoZGF0YSkubGVuZ3RoKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG4gIHJldHVybiBjYWxsU3luY1VzZXIoe1xuICAgIHRvZGF5OiB0b2RheVN0cigpLFxuICAgIHByb2dyZXNzQm9va0lkOiBib29rSWQsXG4gICAgcHJvZ3Jlc3M6IGRhdGFcbiAgfSkudGhlbihyZXMgPT4ge1xuICAgIGlmIChyZXMgJiYgcmVzLnByb2dyZXNzICYmIE9iamVjdC5rZXlzKHJlcy5wcm9ncmVzcykubGVuZ3RoKSB7XG4gICAgICBzYXZlQWxsUHJvZ3Jlc3MoYm9va0lkLCBtZXJnZVByb2dyZXNzKGdldEFsbFByb2dyZXNzKGJvb2tJZCksIHJlcy5wcm9ncmVzcykpO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIOS7juS6keerr+aLieWPluafkOivjeS5pui/m+W6puW5tuWQiOW5tuWIsOacrOWcsO+8iOmdmem7mO+8jOWksei0peS4jeaJk+aJsO+8iVxubGV0IHJlc3RvcmVQcm9ncmVzc1BlbmRpbmc6IFByb21pc2U8dm9pZD4gfCBudWxsID0gbnVsbDtcbmxldCByZXN0b3JlUHJvZ3Jlc3NCb29rSWQgPSAnJzsgLy8g5b2T5YmN5Zyo5ouJ55qE6K+N5Lmm77yM6YG/5YWN5YiH5Lmm5pe25paw6K+35rGC6KKr5pen6K+35rGC55qE6ZSB5oyh5o6JXG5leHBvcnQgZnVuY3Rpb24gcmVzdG9yZVByb2dyZXNzRnJvbUNsb3VkKGJvb2tJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChyZXN0b3JlUHJvZ3Jlc3NQZW5kaW5nICYmIHJlc3RvcmVQcm9ncmVzc0Jvb2tJZCA9PT0gYm9va0lkKSByZXR1cm4gcmVzdG9yZVByb2dyZXNzUGVuZGluZztcbiAgaWYgKCF3eC5jbG91ZCkgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xuXG4gIHJlc3RvcmVQcm9ncmVzc0Jvb2tJZCA9IGJvb2tJZDtcbiAgcmVzdG9yZVByb2dyZXNzUGVuZGluZyA9IGNhbGxTeW5jVXNlcih7XG4gICAgdG9kYXk6IHRvZGF5U3RyKCksXG4gICAgcHJvZ3Jlc3NSZXF1ZXN0Qm9va0lkOiBib29rSWRcbiAgfSkudGhlbihyZXMgPT4ge1xuICAgIGlmIChyZXMgJiYgcmVzLnByb2dyZXNzICYmIE9iamVjdC5rZXlzKHJlcy5wcm9ncmVzcykubGVuZ3RoKSB7XG4gICAgICBzYXZlQWxsUHJvZ3Jlc3MoYm9va0lkLCBtZXJnZVByb2dyZXNzKGdldEFsbFByb2dyZXNzKGJvb2tJZCksIHJlcy5wcm9ncmVzcykpO1xuICAgIH1cbiAgfSkudGhlbigoKSA9PiB7IHJlc3RvcmVQcm9ncmVzc1BlbmRpbmcgPSBudWxsOyB9KTtcblxuICByZXR1cm4gcmVzdG9yZVByb2dyZXNzUGVuZGluZztcbn1cblxuLy8g5a2m5Lmg6L+H56iL5Lit6Ieq5Yqo5o6S6Zif5ZCM5q2l77yaOCDnp5LljrvmipbvvIzpgb/lhY3mr4/nrZTkuIDpopjlsLHosIPkuIDmrKHkupHlh73mlbBcbmxldCBwcm9ncmVzc1N5bmNUaW1lcjogYW55ID0gbnVsbDtcbmV4cG9ydCBmdW5jdGlvbiBxdWV1ZVByb2dyZXNzU3luYyhib29rSWQ6IHN0cmluZyk6IHZvaWQge1xuICBpZiAoIXd4LmNsb3VkKSByZXR1cm47XG4gIGlmIChwcm9ncmVzc1N5bmNUaW1lcikgY2xlYXJUaW1lb3V0KHByb2dyZXNzU3luY1RpbWVyKTtcbiAgcHJvZ3Jlc3NTeW5jVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICBwcm9ncmVzc1N5bmNUaW1lciA9IG51bGw7XG4gICAgc3luY1Byb2dyZXNzVG9DbG91ZChib29rSWQpLmNhdGNoKCgpID0+IHt9KTtcbiAgfSwgODAwMCk7XG59XG5cbi8vIOKUgOKUgOKUgCDnlJ/or43mnKwg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG5jb25zdCBXUk9OR19CT09LX0tFWSA9ICdiY193cm9uZ19ib29rJztcblxuLy8g55Sf6K+N5pys5p2h55uuXG5leHBvcnQgaW50ZXJmYWNlIFdyb25nQm9va0l0ZW0ge1xuICB3b3JkOiBzdHJpbmc7XG4gIG1lYW5pbmc6IHN0cmluZztcbiAgYm9va0lkOiBzdHJpbmc7ICAgICAvLyDmnaXmupDor43kuaZcbiAgYWRkZWRBdDogbnVtYmVyOyAgICAvLyDmt7vliqDml7bpl7TmiLNcbn1cblxuLy8g6I635Y+W55Sf6K+N5pysXG5leHBvcnQgZnVuY3Rpb24gZ2V0V3JvbmdCb29rKCk6IFdyb25nQm9va0l0ZW1bXSB7XG4gIHJldHVybiB3eC5nZXRTdG9yYWdlU3luYyhXUk9OR19CT09LX0tFWSkgfHwgW107XG59XG5cbi8vIOa3u+WKoOeUn+ivjeWIsOeUn+ivjeacrO+8iOWOu+mHje+8iVxuZXhwb3J0IGZ1bmN0aW9uIGFkZFRvV3JvbmdCb29rKHdvcmQ6IHN0cmluZywgbWVhbmluZzogc3RyaW5nLCBib29rSWQ6IHN0cmluZyk6IHZvaWQge1xuICBjb25zdCBsaXN0ID0gZ2V0V3JvbmdCb29rKCk7XG4gIGlmIChsaXN0LnNvbWUoaXRlbSA9PiBpdGVtLndvcmQgPT09IHdvcmQpKSByZXR1cm47XG4gIGxpc3QucHVzaCh7IHdvcmQsIG1lYW5pbmcsIGJvb2tJZCwgYWRkZWRBdDogRGF0ZS5ub3coKSB9KTtcbiAgd3guc2V0U3RvcmFnZVN5bmMoV1JPTkdfQk9PS19LRVksIGxpc3QpO1xuICBxdWV1ZVdyb25nQm9va1N5bmMoKTtcbn1cblxuLy8g5LuO55Sf6K+N5pys56e76ZmkXG5leHBvcnQgZnVuY3Rpb24gcmVtb3ZlRnJvbVdyb25nQm9vayh3b3JkOiBzdHJpbmcpOiB2b2lkIHtcbiAgY29uc3QgbGlzdCA9IGdldFdyb25nQm9vaygpLmZpbHRlcihpdGVtID0+IGl0ZW0ud29yZCAhPT0gd29yZCk7XG4gIHd4LnNldFN0b3JhZ2VTeW5jKFdST05HX0JPT0tfS0VZLCBsaXN0KTtcbiAgcXVldWVXcm9uZ0Jvb2tTeW5jKCk7XG59XG5cbi8vIOa4heepuueUn+ivjeacrFxuZXhwb3J0IGZ1bmN0aW9uIGNsZWFyV3JvbmdCb29rKCk6IHZvaWQge1xuICB3eC5zZXRTdG9yYWdlU3luYyhXUk9OR19CT09LX0tFWSwgW10pO1xuICBxdWV1ZVdyb25nQm9va1N5bmMoKTsgLy8g56m65YiX6KGo5Lmf5Lya5LiK5Lyg77yM5LqR56uv5ZCM5q2l5riF56m6XG59XG5cbi8vIOKUgOKUgOKUgCDnlJ/or43mnKzkupHnq6/lkIzmraXvvIjkuI7ov5vluqblkIzmraXlkIzmqKHlvI/vvInilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbi8vIOWQiOW5tuetlueVpe+8muaMiSB3b3JkIOWPluW5tumbhu+8jOWQjOS4gOivjeWPliBhZGRlZEF0IOi+g+aWsOeahOS4gOadoVxuZXhwb3J0IGZ1bmN0aW9uIG1lcmdlV3JvbmdCb29rKFxuICBsb2NhbDogV3JvbmdCb29rSXRlbVtdLFxuICBjbG91ZDogV3JvbmdCb29rSXRlbVtdXG4pOiBXcm9uZ0Jvb2tJdGVtW10ge1xuICBjb25zdCBvdXQgPSBuZXcgTWFwPHN0cmluZywgV3JvbmdCb29rSXRlbT4oKTtcbiAgZm9yIChjb25zdCBpdCBvZiBbLi4uKGxvY2FsIHx8IFtdKSwgLi4uKGNsb3VkIHx8IFtdKV0pIHtcbiAgICBjb25zdCBwcmV2ID0gb3V0LmdldChpdC53b3JkKTtcbiAgICBpZiAoIXByZXYgfHwgKGl0LmFkZGVkQXQgfHwgMCkgPj0gKHByZXYuYWRkZWRBdCB8fCAwKSkgb3V0LnNldChpdC53b3JkLCBpdCk7XG4gIH1cbiAgcmV0dXJuIEFycmF5LmZyb20ob3V0LnZhbHVlcygpKTtcbn1cblxuLy8g5LiK5Lyg5pW05Lu955Sf6K+N5pys5Yiw5LqR56uv77yM6L+U5Zue5LqR56uv5bey5pyJ5YaF5a655L6b5pys5Zyw5bm26ZuG5ZCI5bm2XG4vLyDph4fnlKjmlbTooajopobnm5blvI/lhpnlm57vvJrnp7vpmaQv5riF56m65omN6IO95q2j56Gu5ZCM5q2l5Yiw5LqR56uvXG5leHBvcnQgZnVuY3Rpb24gc3luY1dyb25nQm9va1RvQ2xvdWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmICghd3guY2xvdWQpIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgcmV0dXJuIGNhbGxTeW5jVXNlcih7XG4gICAgdG9kYXk6IHRvZGF5U3RyKCksXG4gICAgd3JvbmdCb29rOiBnZXRXcm9uZ0Jvb2soKVxuICB9KS50aGVuKHJlcyA9PiB7XG4gICAgaWYgKHJlcyAmJiBBcnJheS5pc0FycmF5KHJlcy53cm9uZ0Jvb2spKSB7XG4gICAgICBjb25zdCBtZXJnZWQgPSBtZXJnZVdyb25nQm9vayhnZXRXcm9uZ0Jvb2soKSwgcmVzLndyb25nQm9vayk7XG4gICAgICB3eC5zZXRTdG9yYWdlU3luYyhXUk9OR19CT09LX0tFWSwgbWVyZ2VkKTtcbiAgICB9XG4gIH0pO1xufVxuXG4vLyDlrabkuaDkuK3pnZnpu5jmjpLpmJ/lkIzmraXvvJrljrvmipbvvIzpgb/lhY3popHnuYHosIPkupHlh73mlbBcbmxldCB3cm9uZ0Jvb2tTeW5jVGltZXI6IGFueSA9IG51bGw7XG5mdW5jdGlvbiBxdWV1ZVdyb25nQm9va1N5bmMoKTogdm9pZCB7XG4gIGlmICghd3guY2xvdWQpIHJldHVybjtcbiAgaWYgKHdyb25nQm9va1N5bmNUaW1lcikgY2xlYXJUaW1lb3V0KHdyb25nQm9va1N5bmNUaW1lcik7XG4gIHdyb25nQm9va1N5bmNUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgIHdyb25nQm9va1N5bmNUaW1lciA9IG51bGw7XG4gICAgc3luY1dyb25nQm9va1RvQ2xvdWQoKS5jYXRjaCgoKSA9PiB7fSk7XG4gIH0sIDgwMDApO1xufVxuXG4vLyDku47kupHnq6/mi4nlj5bnlJ/or43mnKzlubblkIjlubbliLDmnKzlnLDvvIjlkK/liqjml7bosIPnlKjvvJvlpLHotKXpnZnpu5jvvIlcbmxldCByZXN0b3JlV3JvbmdCb29rUGVuZGluZzogUHJvbWlzZTx2b2lkPiB8IG51bGwgPSBudWxsO1xuZXhwb3J0IGZ1bmN0aW9uIHJlc3RvcmVXcm9uZ0Jvb2tGcm9tQ2xvdWQoKTogUHJvbWlzZTx2b2lkPiB7XG4gIGlmIChyZXN0b3JlV3JvbmdCb29rUGVuZGluZykgcmV0dXJuIHJlc3RvcmVXcm9uZ0Jvb2tQZW5kaW5nO1xuICBpZiAoIXd4LmNsb3VkKSByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKCk7XG5cbiAgcmVzdG9yZVdyb25nQm9va1BlbmRpbmcgPSBjYWxsU3luY1VzZXIoe1xuICAgIHRvZGF5OiB0b2RheVN0cigpLFxuICAgIHdyb25nQm9va1JlcXVlc3Q6IHRydWVcbiAgfSkudGhlbihyZXMgPT4ge1xuICAgIGlmIChyZXMgJiYgQXJyYXkuaXNBcnJheShyZXMud3JvbmdCb29rKSAmJiByZXMud3JvbmdCb29rLmxlbmd0aCkge1xuICAgICAgY29uc3QgbWVyZ2VkID0gbWVyZ2VXcm9uZ0Jvb2soZ2V0V3JvbmdCb29rKCksIHJlcy53cm9uZ0Jvb2spO1xuICAgICAgd3guc2V0U3RvcmFnZVN5bmMoV1JPTkdfQk9PS19LRVksIG1lcmdlZCk7XG4gICAgfVxuICB9KS50aGVuKCgpID0+IHsgcmVzdG9yZVdyb25nQm9va1BlbmRpbmcgPSBudWxsOyB9KTtcblxuICByZXR1cm4gcmVzdG9yZVdyb25nQm9va1BlbmRpbmc7XG59XG5cbi8vIOKUgOKUgOKUgCDlrabkuaDmj5DphpLlt7LkuIvnur/vvIgyMDI2LTA4LTMx77ya5b6u5L+h5LiA5qyh5oCn6K6i6ZiF5py65Yi277yM6ZyA5q+P5qyh5a2m5a6M6YeN5aSN5o6I5p2D77yM5L2T6aqM57mB55CQ77yb5Luj56CB5rOo6YeK5L+d55WZ77yM6ZqP5pe25Y+v5oGi5aSN77yJIOKUgOKUgOKUgFxuLy8gY29uc3QgU1VCU0NSSUJFX0tFWSA9ICdiY19yZW1pbmRlcl9zdWJzY3JpYmVkJztcbi8vXG4vLyAvLyDimqDvuI8g5pu/5o2i5Li65L2g6Ieq5bex5Zyo5b6u5L+h5YWs5LyX5bmz5Y+w5Yib5bu655qE6K6i6ZiF5raI5oGv5qih5p2/IElEXG4vLyBleHBvcnQgY29uc3QgUkVNSU5ERVJfVEVNUExBVEVfSUQgPSAnX05iSmVlQnVXc25NbnZORGxqUTdmUzRXWlNlcHhDOVRIQ1F4NHplbzMtQSc7XG4vL1xuLy8gLy8g55So5oi35piv5ZCm5bey5o6I5p2D6K6i6ZiF5a2m5Lmg5o+Q6YaSXG4vLyBleHBvcnQgZnVuY3Rpb24gaXNSZW1pbmRlclN1YnNjcmliZWQoKTogYm9vbGVhbiB7XG4vLyAgIHJldHVybiB3eC5nZXRTdG9yYWdlU3luYyhTVUJTQ1JJQkVfS0VZKSA9PT0gdHJ1ZTtcbi8vIH1cbi8vXG4vLyAvLyDmoIforrDnlKjmiLflt7LmjojmnYPorqLpmIVcbi8vIGV4cG9ydCBmdW5jdGlvbiBzZXRSZW1pbmRlclN1YnNjcmliZWQodmFsOiBib29sZWFuKTogdm9pZCB7XG4vLyAgIHd4LnNldFN0b3JhZ2VTeW5jKFNVQlNDUklCRV9LRVksIHZhbCk7XG4vLyB9XG4vL1xuLy8gLy8g6K+35rGC55So5oi35o6I5p2D6K6i6ZiF5a2m5Lmg5o+Q6YaSXG4vLyBleHBvcnQgZnVuY3Rpb24gcmVxdWVzdFJlbWluZGVyU3Vic2NyaWJlKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuLy8gICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUpID0+IHtcbi8vICAgICBpZiAoIXd4LnJlcXVlc3RTdWJzY3JpYmVNZXNzYWdlKSB7XG4vLyAgICAgICAvLyDkvY7niYjmnKzkuI3mlK/mjIFcbi8vICAgICAgIHJlc29sdmUoZmFsc2UpO1xuLy8gICAgICAgcmV0dXJuO1xuLy8gICAgIH1cbi8vICAgICB3eC5yZXF1ZXN0U3Vic2NyaWJlTWVzc2FnZSh7XG4vLyAgICAgICB0bXBsSWRzOiBbUkVNSU5ERVJfVEVNUExBVEVfSURdLFxuLy8gICAgICAgc3VjY2VzczogKHJlczogYW55KSA9PiB7XG4vLyAgICAgICAgIGNvbnN0IGFjY2VwdGVkID0gcmVzW1JFTUlOREVSX1RFTVBMQVRFX0lEXSA9PT0gJ2FjY2VwdCc7XG4vLyAgICAgICAgIHNldFJlbWluZGVyU3Vic2NyaWJlZChhY2NlcHRlZCk7XG4vLyAgICAgICAgIC8vIOWQjOatpeS6keerr++8iHNlbmRSZW1pbmRlciDmr4/ml6Xmiavmj4/kvp3mja7vvInvvIzpnZnpu5jlpLHotKVcbi8vICAgICAgICAgc2V0UmVtaW5kZXJTdWJzY3JpYmVkQ2xvdWQoYWNjZXB0ZWQpO1xuLy8gICAgICAgICByZXNvbHZlKGFjY2VwdGVkKTtcbi8vICAgICAgIH0sXG4vLyAgICAgICBmYWlsOiAoKSA9PiB7XG4vLyAgICAgICAgIHJlc29sdmUoZmFsc2UpO1xuLy8gICAgICAgfVxuLy8gICAgIH0pO1xuLy8gICB9KTtcbi8vIH1cbi8vXG4vLyAvLyDkupHnq6/orrDlvZXmr4/ml6Xmj5DphpLorqLpmIXnirbmgIHvvIjnu48gc3luY1VzZXIg5YaZ5YWlIHVzZXJzIOaWh+aho++8jHNlbmRSZW1pbmRlciDmr4/ml6Xmiavmj4/nlKjvvIlcbi8vIGV4cG9ydCBmdW5jdGlvbiBzZXRSZW1pbmRlclN1YnNjcmliZWRDbG91ZCh2YWw6IGJvb2xlYW4pOiB2b2lkIHtcbi8vICAgaWYgKCF3eC5jbG91ZCkgcmV0dXJuO1xuLy8gICBjYWxsU3luY1VzZXIoeyByZW1pbmRlclN1YnNjcmliZWQ6IHZhbCwgdG9kYXk6IHRvZGF5U3RyKCkgfSkuY2F0Y2goKCkgPT4ge30pO1xuLy8gfVxuXG4vLyDimqDvuI8g5q+P5ZGo5a2m5Lmg5ZGo5oql5qih5p2/IElE77yI5b6u5L+h5YWs5LyX5bmz5Y+w44CM6K6i6ZiF5raI5oGv44CN5Y2V54us55Sz6K+377yJXG4vLyAgICDkuKrkurrkuLvkvZPlj6/pgInjgIzlrabkuaAv5pWZ6IKy44CN55u45YWz5qih5p2/77yb5a2X5q615ZCN5Lul5L2g55Sz6K+35Yiw55qE5qih5p2/5Li65YeGXG5leHBvcnQgY29uc3QgV0VFS0xZX1RFTVBMQVRFX0lEID0gJ0hLb2ZyNy1scjF3OHN3b2EtcDdNLXB5TlJQTVJYeGJTdVNTV3JJaktsLUknO1xuXG4vLyDilIDilIDilIAg5q+P5ZGo5a2m5Lmg5ZGo5oql5bey5LiL57q/77yIMjAyNi0wOC0zMe+8muaooeadv+S9k+mqjOS4jeS9s++8m+S7o+eggeazqOmHiuS/neeVme+8jOaooeadv+WPr+eUqOWQjuaBouWkje+8iSDilIDilIDilIBcbi8vIGNvbnN0IFdFRUtMWV9TVUJTQ1JJQkVfS0VZID0gJ2JjX3dlZWtseV9zdWJzY3JpYmVkJztcbi8vXG4vLyBleHBvcnQgZnVuY3Rpb24gaXNXZWVrbHlTdWJzY3JpYmVkKCk6IGJvb2xlYW4ge1xuLy8gICByZXR1cm4gd3guZ2V0U3RvcmFnZVN5bmMoV0VFS0xZX1NVQlNDUklCRV9LRVkpID09PSB0cnVlO1xuLy8gfVxuLy9cbi8vIGV4cG9ydCBmdW5jdGlvbiBzZXRXZWVrbHlTdWJzY3JpYmVkKHZhbDogYm9vbGVhbik6IHZvaWQge1xuLy8gICB3eC5zZXRTdG9yYWdlU3luYyhXRUVLTFlfU1VCU0NSSUJFX0tFWSwgdmFsKTtcbi8vIH1cbi8vXG4vLyAvLyDor7fmsYLmjojmnYPmr4/lkajlkajmiqXvvJvmjojmnYPmiJDlip/lkI7kupHnq6/orrDlvZXvvIhzZW5kUmVtaW5kZXIg5ZGo5oql5omr5o+P55So77yJXG4vLyBleHBvcnQgZnVuY3Rpb24gcmVxdWVzdFdlZWtseVN1YnNjcmliZSgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbi8vICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlKSA9PiB7XG4vLyAgICAgaWYgKCF3eC5yZXF1ZXN0U3Vic2NyaWJlTWVzc2FnZSkge1xuLy8gICAgICAgcmVzb2x2ZShmYWxzZSk7XG4vLyAgICAgICByZXR1cm47XG4vLyAgICAgfVxuLy8gICAgIHd4LnJlcXVlc3RTdWJzY3JpYmVNZXNzYWdlKHtcbi8vICAgICAgIHRtcGxJZHM6IFtXRUVLTFlfVEVNUExBVEVfSURdLFxuLy8gICAgICAgc3VjY2VzczogKHJlczogYW55KSA9PiB7XG4vLyAgICAgICAgIGNvbnN0IGFjY2VwdGVkID0gcmVzW1dFRUtMWV9URU1QTEFURV9JRF0gPT09ICdhY2NlcHQnO1xuLy8gICAgICAgICBzZXRXZWVrbHlTdWJzY3JpYmVkKGFjY2VwdGVkKTtcbi8vICAgICAgICAgaWYgKGFjY2VwdGVkKSBzZXRXZWVrbHlTdWJzY3JpYmVkQ2xvdWQodHJ1ZSk7XG4vLyAgICAgICAgIHJlc29sdmUoYWNjZXB0ZWQpO1xuLy8gICAgICAgfSxcbi8vICAgICAgIGZhaWw6ICgpID0+IHtcbi8vICAgICAgICAgcmVzb2x2ZShmYWxzZSk7XG4vLyAgICAgICB9XG4vLyAgICAgfSk7XG4vLyAgIH0pO1xuLy8gfVxuLy9cbi8vIC8vIOS6keerr+iusOW9leiuoumYheeKtuaAge+8iOe7jyBzeW5jVXNlciDlhpnlhaUgdXNlcnMg5paH5qGj77yM6Z2Z6buY5aSx6LSl77yJXG4vLyBleHBvcnQgZnVuY3Rpb24gc2V0V2Vla2x5U3Vic2NyaWJlZENsb3VkKHZhbDogYm9vbGVhbik6IHZvaWQge1xuLy8gICBpZiAoIXd4LmNsb3VkKSByZXR1cm47XG4vLyAgIGNhbGxTeW5jVXNlcih7IHdlZWtseVN1YnNjcmliZWQ6IHZhbCwgdG9kYXk6IHRvZGF5U3RyKCkgfSkuY2F0Y2goKCkgPT4ge30pO1xuLy8gfVxuXG4vLyDilIDilIDilIAg5LuK5pel5aSN5Lmg6K6h5YiS77yIU00tMiDmjpLnqIvlj6/op4bljJbvvIkg4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSA4pSAXG4vLyDmiorpl7TpmpTorrDlv4bnrpfms5Xlj5jmiJDnlKjmiLflj6/mhJ/nn6XnmoTjgIzkuLrku4DkuYjku4rlpKnlpI3kuaDov5nkupvor43jgI1cbi8vIOWkjeS5oOeQhueUseebtOaOpeW8leeUqOavj+S4quivjeeahOecn+WunuaOkueoi+mXtOmalO+8iGludGVydmFs77yJ77yM6ICM6Z2e5Zu65a6a55uS5a2Q5pig5bCEXG5cbmV4cG9ydCBpbnRlcmZhY2UgUmV2aWV3UGxhbkl0ZW0ge1xuICB3b3JkOiBzdHJpbmc7XG4gIGJveDogbnVtYmVyO1xuICBsYXN0U2VlbjogbnVtYmVyO1xuICBvdmVyZHVlRGF5czogbnVtYmVyOyAvLyDlt7LpgL7mnJ/lpKnmlbDvvIgwPeacqumAvuacn++8jOS7iuWkqeWIsOacn++8iVxuICBpbnRlcnZhbDogbnVtYmVyOyAgICAvLyDlvZPliY3lpI3kuaDpl7TpmpTvvIjlpKnvvIlcbiAgcmVhc29uOiBzdHJpbmc7ICAgICAgLy8g5Li65LuA5LmI5LuK5aSp5aSN5Lmg5a6DXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQm94U3RhdCB7XG4gIGJveDogbnVtYmVyO1xuICBsYWJlbDogc3RyaW5nOyAgICAgICAgLy8g55uS5a2Q5ZCN56ew77yI6LW35q2l55uSL+W3qeWbuuS4rS4uLu+8iVxuICBpbnRlcnZhbERlc2M6IHN0cmluZzsgLy8g6K+l55uS5a+55bqU5aSN5Lmg6Ze06ZqU6K+05piOXG4gIGNvdW50OiBudW1iZXI7XG4gIG1hc3RlcmVkOiBib29sZWFuOyAgICAvLyDor6Xnm5LmmK/lkKbnrpflt7Lmjozmj6HljLrvvIhib3g+PTXvvIlcbn1cblxuZXhwb3J0IGludGVyZmFjZSBSZXZpZXdQbGFuIHtcbiAgdG90YWxMZWFybmVkOiBudW1iZXI7ICAgLy8g6K+l6K+N5Lmm5bey5a2m6K+N5pWw77yIYm94Pj0yIOaIluacieiusOW9le+8iVxuICBkdWVUb2RheTogbnVtYmVyOyAgICAgICAvLyDku4rlpKnliLDmnJ/pnIDlpI3kuaDmlbBcbiAgbWFzdGVyZWRDb3VudDogbnVtYmVyOyAgLy8g5bey5o6M5o+h5pWw77yIYm94Pj0177yJXG4gIGJveERpc3Q6IEJveFN0YXRbXTsgICAgIC8vIOWQhOebkuWtkOWIhuW4g1xuICBkdWVMaXN0OiBSZXZpZXdQbGFuSXRlbVtdOyAvLyDku4rml6XliLDmnJ/or43vvIjmnIDlpJo1MOS4qu+8jOmAvuacn+WkmueahOS8mOWFiO+8iVxuICBmb3JlY2FzdDogeyBsYWJlbDogc3RyaW5nOyBjb3VudDogbnVtYmVyIH1bXTsgLy8g5pyq5p2lN+Wkqeavj+aXpemihOiuoeWIsOacn+aVsFxufVxuXG5jb25zdCBQTEFOX0JPWF9MQUJFTFM6IFJlY29yZDxudW1iZXIsIHsgbGFiZWw6IHN0cmluZzsgaW50ZXJ2YWxEZXNjOiBzdHJpbmcgfT4gPSB7XG4gIDE6IHsgbGFiZWw6ICfnrKwx55uSIMK3IOi1t+atpScsIGludGVydmFsRGVzYzogJ+W9k+WkqeWGheWGjeasoeWHuueOsCcgfSxcbiAgMjogeyBsYWJlbDogJ+esrDLnm5InLCBpbnRlcnZhbERlc2M6ICfpmpQx5aSp5aSN5LmgJyB9LFxuICAzOiB7IGxhYmVsOiAn56ysM+ebkicsIGludGVydmFsRGVzYzogJ+malDLlpKnlpI3kuaAnIH0sXG4gIDQ6IHsgbGFiZWw6ICfnrKw055uSJywgaW50ZXJ2YWxEZXNjOiAn6ZqUNOWkqeWkjeS5oCcgfSxcbiAgNTogeyBsYWJlbDogJ+esrDXnm5Igwrcg5bep5Zu6JywgaW50ZXJ2YWxEZXNjOiAn6ZqUN+WkqeWkjeS5oCcgfSxcbiAgNjogeyBsYWJlbDogJ+esrDbnm5InLCBpbnRlcnZhbERlc2M6ICfpmpQxNeWkqeS7peS4iu+8iOaMieS4quS6uuiKguWlj++8iScgfSxcbiAgNzogeyBsYWJlbDogJ+esrDfnm5Igwrcg6ZW/5pyfJywgaW50ZXJ2YWxEZXNjOiAn6ZqUMzDlpKnku6XkuIogwrcg6ZW/5pyf6K6w5b+GJyB9XG59O1xuXG5jb25zdCBEQVlfTVMyID0gMjQgKiA2MCAqIDYwICogMTAwMDtcblxuZnVuY3Rpb24gZGF5c0JldHdlZW4oZnJvbTogbnVtYmVyLCB0bzogbnVtYmVyKTogbnVtYmVyIHtcbiAgcmV0dXJuIE1hdGguZmxvb3IoKHRvIC0gZnJvbSkgLyBEQVlfTVMyKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFJldmlld1BsYW4oYm9va0lkOiBzdHJpbmcpOiBSZXZpZXdQbGFuIHtcbiAgY29uc3QgYWxsID0gZ2V0QWxsUHJvZ3Jlc3MoYm9va0lkKTtcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICBjb25zdCBib3hDb3VudHM6IFJlY29yZDxudW1iZXIsIG51bWJlcj4gPSB7fTtcbiAgY29uc3QgZHVlTGlzdDogUmV2aWV3UGxhbkl0ZW1bXSA9IFtdO1xuICBjb25zdCBmb3JlY2FzdCA9IEFycmF5LmZyb20oeyBsZW5ndGg6IDggfSwgKCkgPT4gMCk7IC8vIFswXT3ku4rml6UsIFsxLi43XT3mnKrmnaU35aSpXG4gIGxldCBtYXN0ZXJlZENvdW50ID0gMDtcbiAgbGV0IHRvdGFsTGVhcm5lZCA9IDA7XG5cbiAgZm9yIChjb25zdCBwIG9mIE9iamVjdC52YWx1ZXMoYWxsKSkge1xuICAgIGNvbnN0IGJveCA9IHAuYm94IHx8IDE7XG4gICAgYm94Q291bnRzW2JveF0gPSAoYm94Q291bnRzW2JveF0gfHwgMCkgKyAxO1xuICAgIGlmIChib3ggPj0gMikgdG90YWxMZWFybmVkKys7XG4gICAgaWYgKGJveCA+PSA1KSB7IG1hc3RlcmVkQ291bnQrKzsgfVxuXG4gICAgY29uc3QgbWV0YSA9IFBMQU5fQk9YX0xBQkVMU1tib3hdIHx8IFBMQU5fQk9YX0xBQkVMU1sxXTtcbiAgICBjb25zdCBpc01hc3RlcmVkWm9uZSA9IGJveCA+PSA1O1xuXG4gICAgaWYgKHAubmV4dFJldmlldyA+IDAgJiYgcC5uZXh0UmV2aWV3IDw9IG5vdyAmJiAhaXNNYXN0ZXJlZFpvbmUpIHtcbiAgICAgIC8vIOWIsOacn++8mueUn+aIkOWkjeS5oOeQhueUse+8iOW8leeUqOecn+WunuaOkueoi+mXtOmalO+8iVxuICAgICAgY29uc3Qgb3ZlckRheXMgPSBkYXlzQmV0d2VlbihwLm5leHRSZXZpZXcsIG5vdyk7XG4gICAgICBjb25zdCBpbnRlcnZhbERheXMgPSBwLmludGVydmFsIHx8IEJPWF9JTlRFUlZBTF9EQVlTW2JveF0gfHwgMDtcbiAgICAgIGxldCByZWFzb246IHN0cmluZztcbiAgICAgIGlmIChib3ggPT09IDEgJiYgcC51bmtub3duQ291bnQgPiAwICYmIHAua25vd25Db3VudCA9PT0gMCkge1xuICAgICAgICByZWFzb24gPSAn5LiK5qyh5rKh562U5a+577yM5bey5Zue5Yiw6LW35q2l55uS77yM5LuK5aSp5bCx5YaN6K6k5LiA5qyhJztcbiAgICAgIH0gZWxzZSBpZiAoYm94ID09PSAxKSB7XG4gICAgICAgIHJlYXNvbiA9ICflnKjlt6nlm7rnm5Lph4zph43mlrDlh7rlj5HvvIzku4rlpKnlho3op4HpnaLliqDmt7HljbDosaEnO1xuICAgICAgfSBlbHNlIGlmIChvdmVyRGF5cyA+IDApIHtcbiAgICAgICAgcmVhc29uID0gYOW3sui/m+WFpSR7bWV0YS5sYWJlbH3vvIjmnKzmrKHpl7TpmpQgJHtpbnRlcnZhbERheXN9IOWkqe+8ie+8jOavlOiuoeWIkuaZmuS6hiAke292ZXJEYXlzfSDlpKnvvIzkvJjlhYjlronmjpJgO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVhc29uID0gYOW3sui/m+WFpSR7bWV0YS5sYWJlbH3vvIjmnKzmrKHpl7TpmpQgJHtpbnRlcnZhbERheXN9IOWkqe+8ie+8jOS7iuWkqeato+WlveWIsOacn2A7XG4gICAgICB9XG4gICAgICBkdWVMaXN0LnB1c2goe1xuICAgICAgICB3b3JkOiBwLndvcmQsXG4gICAgICAgIGJveCxcbiAgICAgICAgbGFzdFNlZW46IHAubGFzdFNlZW4gfHwgMCxcbiAgICAgICAgb3ZlcmR1ZURheXM6IE1hdGgubWF4KG92ZXJEYXlzLCAwKSxcbiAgICAgICAgaW50ZXJ2YWw6IGludGVydmFsRGF5cyxcbiAgICAgICAgcmVhc29uXG4gICAgICB9KTtcbiAgICAgIGZvcmVjYXN0WzBdKys7XG4gICAgfSBlbHNlIGlmICghaXNNYXN0ZXJlZFpvbmUgJiYgcC5uZXh0UmV2aWV3ID4gbm93KSB7XG4gICAgICBjb25zdCBkID0gZGF5c0JldHdlZW4obm93LCBwLm5leHRSZXZpZXcpO1xuICAgICAgaWYgKGQgPj0gMSAmJiBkIDw9IDcpIGZvcmVjYXN0W2RdKys7XG4gICAgfVxuICB9XG5cbiAgLy8g5o6S5bqP77ya6YC+5pyf5aSa55qE5Zyo5YmN77yM5YW25qyh55uS5a2Q6auY55qE77yI5o6l6L+R5o6M5o+h55qE5YWI5bep5Zu677yJXG4gIGR1ZUxpc3Quc29ydCgoYSwgYikgPT5cbiAgICBiLm92ZXJkdWVEYXlzIC0gYS5vdmVyZHVlRGF5cyB8fCBiLmJveCAtIGEuYm94IHx8XG4gICAgYS53b3JkLmxvY2FsZUNvbXBhcmUoYi53b3JkKVxuICApO1xuXG4gIGNvbnN0IGJveERpc3Q6IEJveFN0YXRbXSA9IFtdO1xuICBmb3IgKGxldCBiID0gMTsgYiA8PSA3OyBiKyspIHtcbiAgICBjb25zdCBtZXRhID0gUExBTl9CT1hfTEFCRUxTW2JdO1xuICAgIGJveERpc3QucHVzaCh7XG4gICAgICBib3g6IGIsXG4gICAgICAuLi5tZXRhLFxuICAgICAgY291bnQ6IGJveENvdW50c1tiXSB8fCAwLFxuICAgICAgbWFzdGVyZWQ6IGIgPj0gNVxuICAgIH0pO1xuICB9XG5cbiAgY29uc3QgZGF5TGFiZWxzID0gWyfku4rlpKknLCAn5piO5aSpJywgJ+WQjuWkqSddO1xuICByZXR1cm4ge1xuICAgIHRvdGFsTGVhcm5lZCxcbiAgICBkdWVUb2RheTogZm9yZWNhc3RbMF0sXG4gICAgbWFzdGVyZWRDb3VudCxcbiAgICBib3hEaXN0LFxuICAgIGR1ZUxpc3Q6IGR1ZUxpc3Quc2xpY2UoMCwgNTApLFxuICAgIGZvcmVjYXN0OiBmb3JlY2FzdC5zbGljZSgxLCA4KS5tYXAoKGNvdW50LCBpKSA9PiAoe1xuICAgICAgbGFiZWw6IGkgPCAyID8gZGF5TGFiZWxzW2kgKyAxXSA6IGAke2kgKyAxfeWkqeWQjmAsXG4gICAgICBjb3VudFxuICAgIH0pKVxuICB9O1xufVxuIl19