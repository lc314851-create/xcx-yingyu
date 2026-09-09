"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../../utils/store");
const store_2 = require("../../utils/store");
const wordService_1 = require("../../utils/wordService");
const index_1 = require("../../data/index");
const audio_1 = require("../../utils/audio");
const wordReport_1 = require("../../utils/wordReport");
const todayExport_1 = require("../../utils/todayExport");
const REVIEW_MODE_KEY = 'bc_review_mode';
const MEMORY_WORDS_KEY = 'bc_memory_words';
const NEW_ROUND_KEY = 'bc_new_round';
const TODAY_REVIEW_KEY = 'bc_today_review';
Page({
    data: {
        bookName: '初中词汇',
        bookTotal: 0,
        queue: [],
        currentIndex: 0,
        showMeaning: false,
        knownCount: 0,
        unknownCount: 0,
        totalCount: 0,
        dueCount: 0,
        masteredCount: 0,
        statusLabel: '新词',
        hasMore: true,
        loading: true,
        studyMode: 'all',
        batchSize: 10,
        highFreqCount: 0,
        funcCount: 0,
        contentCount: 0,
        wordClassLabel: '全部',
        currentBookId: 'junior',
        practiceMode: 'card',
        activeMode: 'card',
        choiceOptions: [],
        choiceSelected: -1,
        choiceCorrect: false,
        spellInput: '',
        spellFeedback: 'none',
        accent: 'us',
        showResult: false,
        resultRate: 0,
        resultPraise: '',
        isFlipped: false,
        revealAfterUnknown: false,
        _wordBookWords: [],
        quickUnknown: {},
        quickLearning: false,
        orderMode: 'random',
        modeLabels: ['卡片', '选择', '拼写', '混合', '快速'],
        modeIndex: 0,
        showSheet: false,
        sheetTitle: '',
        sheetOptions: [],
        sheetType: '',
        showReport: false,
        reportType: '',
        reportDesc: '',
        reportedMap: {}
    },
    onLoad() { },
    _answeredSet: new Set(),
    onShow() {
        if (this._skipInitOnShow) {
            this._skipInitOnShow = false;
            if (this._restoreResultOnShow) {
                this.setData({ showResult: true });
            }
            this._restoreResultOnShow = false;
            return;
        }
        if (wx.getStorageSync(REVIEW_MODE_KEY) === 1) {
            wx.removeStorageSync(REVIEW_MODE_KEY);
            this._reviewMode = true;
        }
        else {
            this._reviewMode = false;
        }
        const memFlag = wx.getStorageSync(MEMORY_WORDS_KEY);
        wx.removeStorageSync(MEMORY_WORDS_KEY);
        if (memFlag && typeof memFlag === 'object' &&
            memFlag.bookId === (0, store_1.getCurrentBookId)() &&
            Array.isArray(memFlag.words) && memFlag.words.length > 0) {
            this._memoryWords = memFlag.words;
        }
        else {
            this._memoryWords = null;
        }
        if (wx.getStorageSync(NEW_ROUND_KEY) === 1) {
            wx.removeStorageSync(NEW_ROUND_KEY);
            this._loadedKey = '';
        }
        if (wx.getStorageSync(TODAY_REVIEW_KEY) === 1) {
            wx.removeStorageSync(TODAY_REVIEW_KEY);
            this._todayReviewMode = true;
            this._loadedKey = '';
        }
        else {
            this._todayReviewMode = false;
        }
        if (!(0, store_1.hasSelectedBook)()) {
            wx.navigateTo({ url: '/pages/booklist/booklist' });
            return;
        }
        this.setData({
            currentBookId: (0, store_1.getCurrentBookId)(),
            practiceMode: (0, store_1.getPracticeMode)(),
            modeIndex: ['card', 'choice', 'spell', 'mix', 'quick'].indexOf((0, store_1.getPracticeMode)()),
            accent: (0, store_1.getAccent)(),
            orderMode: (0, store_1.getOrderMode)()
        });
        this.initBatch();
    },
    onUnload() {
        this._clearRevealTimer();
    },
    async initBatch() {
        if (this._todayReviewMode) {
            this._todayReviewMode = false;
            const ok = await this._initTodayBatch();
            if (!ok)
                await this._initNormalBatch();
            return;
        }
        return this._initNormalBatch();
    },
    async _initTodayBatch() {
        const todays = (0, store_1.getTodayLearnedWords)();
        if (todays.length === 0) {
            wx.showToast({ title: '今天还没有学习记录，先学几个词吧', icon: 'none' });
            return false;
        }
        const byBook = new Map();
        for (const t of todays) {
            const arr = byBook.get(t.bookId) || [];
            arr.push(t.word);
            byBook.set(t.bookId, arr);
        }
        const queue = [];
        const allWords = [];
        const unknownSet = new Set(todays.filter(t => !t.known).map(t => t.word.toLowerCase()));
        for (const [bid, words] of byBook) {
            try {
                const book = await (0, wordService_1.getBookById)(bid);
                if (!book)
                    continue;
                allWords.push(...book.words);
                const wset = new Set(words.map(w => w.toLowerCase()));
                for (const w of book.words) {
                    if (wset.has(w.word.toLowerCase()))
                        queue.push(w);
                }
            }
            catch (e) {
                console.error('[今日复盘] 词书加载失败', bid, e);
            }
        }
        if (queue.length === 0)
            return false;
        queue.sort((a, b) => (unknownSet.has(b.word.toLowerCase()) ? 1 : 0) - (unknownSet.has(a.word.toLowerCase()) ? 1 : 0));
        this._clearRevealTimer();
        this._answeredSet = new Set();
        this._newWordSet = new Set();
        const reportedMap = {};
        for (const w of queue) {
            if ((0, wordReport_1.isWordReported)(w.word))
                reportedMap[w.word] = true;
        }
        const progressStats = (0, store_1.getBookProgressStats)((0, store_1.getCurrentBookId)());
        this.setData({
            bookName: '今日复盘',
            queue,
            _wordBookWords: allWords,
            currentIndex: 0,
            quickLearning: this.data.practiceMode === 'quick',
            showMeaning: false,
            isFlipped: false,
            revealAfterUnknown: false,
            knownCount: 0,
            unknownCount: 0,
            totalCount: queue.length,
            dueCount: progressStats.dueCount,
            masteredCount: progressStats.masteredCount,
            statusLabel: '复盘',
            hasMore: false,
            loading: false,
            showResult: false,
            spellInput: '',
            spellFeedback: 'none',
            choiceSelected: -1,
            quickUnknown: {},
            reportedMap
        }, () => {
            this._applyModeForCurrent();
        });
        return true;
    },
    async _initNormalBatch() {
        const bookId = (0, store_1.getCurrentBookId)();
        const studyMode = (0, store_1.getStudyMode)();
        const practiceMode = (0, store_1.getPracticeMode)();
        const accent = (0, store_1.getAccent)();
        const batchSize = (0, store_1.getBatchSize)();
        const orderMode = (0, store_1.getOrderMode)();
        const wordClassLabels = { all: '全部', highFreq: '高频词', func: '虚词', content: '实词' };
        const settingsKey = [bookId, studyMode, practiceMode, accent, batchSize, orderMode].join('|');
        if (this.data.queue.length > 0 && !this.data.showResult &&
            !this._reviewMode && !this._memoryWords &&
            this._loadedKey === settingsKey) {
            return;
        }
        this._loadedKey = settingsKey;
        this._clearRevealTimer();
        if (this.data.queue.length === 0) {
            this.setData({ loading: true, studyMode, practiceMode, accent, batchSize, orderMode, wordClassLabel: wordClassLabels[studyMode] || '全部' });
        }
        else {
            this.setData({ studyMode, practiceMode, accent, batchSize, orderMode, wordClassLabel: wordClassLabels[studyMode] || '全部' });
        }
        let book;
        try {
            book = await (0, wordService_1.getBookById)(bookId);
        }
        catch (e) {
            console.error('获取词书失败', e);
        }
        if (!book || !book.words || book.words.length === 0) {
            const localBook = index_1.wordBooks.find(b => b.id === bookId);
            if (localBook && localBook.words.length > 0) {
                book = localBook;
            }
            else {
                this.setData({ loading: false, queue: [] });
                wx.showToast({ title: '词库加载中，马上就好', icon: 'none' });
                return;
            }
        }
        const bypassFilter = this._reviewMode || !!this._memoryWords;
        const highFreqCount = book.words.filter(w => w.isHighFreq).length;
        const funcCount = book.words.filter(w => w.posTag === 'func').length;
        const contentCount = book.words.filter(w => w.posTag !== 'func').length;
        let wordList;
        let emptyTip = '';
        if (bypassFilter) {
            wordList = book.words;
        }
        else if (studyMode === 'highFreq') {
            wordList = book.words.filter(w => w.isHighFreq);
            emptyTip = '这本词书没有标注高频词';
        }
        else if (studyMode === 'func') {
            wordList = book.words.filter(w => w.posTag === 'func');
            if (!book.words.some(w => 'posTag' in w)) {
                emptyTip = '词书数据未包含词性标注，请更新词库后重试';
            }
            else {
                emptyTip = '这本词书暂无虚词标注';
            }
        }
        else if (studyMode === 'content') {
            wordList = book.words.filter(w => w.posTag !== 'func');
            if (!book.words.some(w => 'posTag' in w)) {
                emptyTip = '词书数据未包含词性标注，请更新词库后重试';
            }
            else {
                emptyTip = '这本词书暂无实词标注';
            }
        }
        else {
            wordList = book.words;
        }
        if (wordList.length === 0) {
            this.setData({ loading: false, queue: [], highFreqCount, funcCount, contentCount });
            wx.showToast({ title: emptyTip, icon: 'none' });
            return;
        }
        const allProgress = (0, store_1.getAllProgress)(bookId);
        const now = Date.now();
        const dueWords = [];
        const newWords = [];
        for (const w of wordList) {
            const p = allProgress[w.word];
            if (!p) {
                newWords.push(w);
            }
            else if (p.status !== 'mastered' && p.nextReview > 0 && p.nextReview <= now) {
                dueWords.push(w);
            }
        }
        newWords.sort((a, b) => (b.frequency || 0) - (a.frequency || 0));
        let queue;
        if (this._reviewMode) {
            if (dueWords.length === 0) {
                this._reviewMode = false;
                wx.showToast({ title: '已全部复习完，切回常规学习', icon: 'none' });
                queue = [...dueWords, ...newWords].slice(0, batchSize);
            }
            else {
                queue = dueWords.slice(0, batchSize);
            }
        }
        else if (orderMode === 'random') {
            const due = [];
            if (dueWords.length > 0) {
                const pool = [...dueWords];
                const take = Math.min(batchSize, pool.length);
                for (let i = 0; i < take; i++) {
                    const j = i + Math.floor(Math.random() * (pool.length - i));
                    const t = pool[i];
                    pool[i] = pool[j];
                    pool[j] = t;
                    due.push(pool[i]);
                }
            }
            const remaining = batchSize - due.length;
            const sampledNew = [];
            if (remaining > 0 && newWords.length > 0) {
                const pool = [...newWords];
                const take = Math.min(remaining, pool.length);
                for (let i = 0; i < take; i++) {
                    const j = i + Math.floor(Math.random() * (pool.length - i));
                    const t = pool[i];
                    pool[i] = pool[j];
                    pool[j] = t;
                    sampledNew.push(pool[i]);
                }
            }
            queue = [...due, ...sampledNew];
        }
        else {
            queue = [...dueWords, ...newWords].slice(0, batchSize);
        }
        let finalQueue = queue;
        if (queue.length === 0) {
            const masteredWords = wordList.filter((w) => {
                const p = allProgress[w.word];
                return p && p.status === 'mastered';
            });
            finalQueue = masteredWords.slice(0, batchSize);
        }
        let memActive = false;
        if (this._memoryWords && this._memoryWords.length > 0) {
            const memLen = this._memoryWords.length;
            const memSet = new Set();
            for (const w of this._memoryWords)
                memSet.add(w.toLowerCase());
            const matched = book.words.filter(w => memSet.has(w.word.toLowerCase()));
            if (matched.length > 0) {
                finalQueue = this._memoryWords
                    .map((w) => matched.find((m) => m.word.toLowerCase() === w.toLowerCase()))
                    .filter((x) => !!x);
                memActive = true;
                if (finalQueue.length < memLen) {
                    wx.showToast({ title: `清单中 ${memLen - finalQueue.length} 个词不在词书，已跳过`, icon: 'none' });
                }
            }
            else {
                wx.showToast({ title: '这几个词不在当前词书里，已切回常规学习', icon: 'none' });
            }
            this._memoryWords = null;
        }
        if (orderMode === 'random' && !memActive && finalQueue.length > 1) {
            for (let i = finalQueue.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                const t = finalQueue[i];
                finalQueue[i] = finalQueue[j];
                finalQueue[j] = t;
            }
        }
        this._newWordSet = new Set();
        for (const w of finalQueue) {
            if (newWords.indexOf(w) > -1)
                this._newWordSet.add(w.word.toLowerCase());
        }
        const reportedMap = {};
        for (const w of finalQueue) {
            if ((0, wordReport_1.isWordReported)(w.word))
                reportedMap[w.word] = true;
        }
        const progressStats = (0, store_1.getBookProgressStats)(bookId);
        this._answeredSet = new Set();
        const dueWordSet = new Set(dueWords.map(w => w.word));
        const dueInQueue = finalQueue.filter(w => dueWordSet.has(w.word)).length;
        let statusLabel = '新词';
        if (memActive) {
            statusLabel = '高危词';
        }
        else if (finalQueue.length > 0 && dueInQueue === finalQueue.length) {
            statusLabel = '复习';
        }
        else if (dueInQueue === 0 && dueWords.length === 0 && newWords.length === 0 && finalQueue.length > 0) {
            statusLabel = '巩固';
        }
        this.setData({
            bookName: book.name,
            bookTotal: wordList.length,
            highFreqCount,
            funcCount,
            contentCount,
            queue: finalQueue,
            _wordBookWords: wordList,
            currentIndex: 0,
            quickLearning: practiceMode === 'quick',
            showMeaning: false,
            isFlipped: false,
            revealAfterUnknown: false,
            knownCount: 0,
            unknownCount: 0,
            totalCount: finalQueue.length,
            dueCount: progressStats.dueCount,
            masteredCount: progressStats.masteredCount,
            statusLabel,
            hasMore: finalQueue.length >= batchSize,
            loading: false,
            showResult: false,
            spellInput: '',
            spellFeedback: 'none',
            choiceSelected: -1,
            quickUnknown: {},
            reportedMap
        }, () => {
            if (finalQueue.length > 0) {
                this._applyModeForCurrent();
                if (finalQueue.length > 1) {
                    (0, audio_1.preloadAudio)(finalQueue[1].word, accent);
                }
            }
        });
    },
    _checkAnswered() {
        if (this._answeredSet.has(this.data.currentIndex))
            return true;
        this._answeredSet.add(this.data.currentIndex);
        return false;
    },
    changeBook() {
        wx.navigateTo({ url: '/pages/booklist/booklist' });
    },
    goGalaxy() {
        const w = this.data.queue[this.data.currentIndex];
        if (!w)
            return;
        wx.navigateTo({
            url: `/pages/galaxy/galaxy?word=${encodeURIComponent(w.word)}`
        });
    },
    openReport() {
        const w = this.data.queue[this.data.currentIndex];
        if (!w)
            return;
        this.setData({ showReport: true, reportType: '', reportDesc: '' });
    },
    closeReport() {
        this.setData({ showReport: false });
    },
    onReportType(e) {
        this.setData({ reportType: e.currentTarget.dataset.type });
    },
    onReportDesc(e) {
        this.setData({ reportDesc: e.detail.value });
    },
    submitReport() {
        const w = this.data.queue[this.data.currentIndex];
        if (!w)
            return;
        if (!this.data.reportType) {
            wx.showToast({ title: '请先选择问题类型', icon: 'none' });
            return;
        }
        const bookId = (0, store_1.getCurrentBookId)();
        (0, wordReport_1.reportWord)(w.word, bookId, this.data.reportType, this.data.reportDesc).then((r) => {
            if (r.already) {
                wx.showToast({ title: '这个问题已有人报过啦', icon: 'none' });
            }
            else if (r.ok) {
                const reportedMap = { ...this.data.reportedMap, [w.word]: true };
                this.setData({ showReport: false, reportedMap });
                wx.showToast({ title: '已受理，感谢共建！', icon: 'success' });
            }
            else {
                wx.showToast({ title: '提交失败，请检查网络', icon: 'none' });
            }
        });
    },
    flipCard() {
        const flipped = !this.data.isFlipped;
        this.setData({
            isFlipped: flipped,
            showMeaning: flipped
        });
        if (flipped) {
            const word = this.data.queue[this.data.currentIndex];
            const next = this.data.queue[this.data.currentIndex + 1];
            if (word)
                (0, audio_1.playAudio)(word.word, this.data.accent);
            if (next)
                (0, audio_1.preloadAudio)(next.word, this.data.accent);
        }
    },
    onPlayAudio() {
        const word = this.data.queue[this.data.currentIndex];
        if (word)
            (0, audio_1.playAudio)(word.word, this.data.accent);
    },
    onToggleAccent() {
        const newAccent = this.data.accent === 'us' ? 'uk' : 'us';
        (0, store_1.setAccent)(newAccent);
        this.setData({ accent: newAccent });
        wx.showToast({
            title: newAccent === 'uk' ? '英音模式' : '美音模式',
            icon: 'none'
        });
        const word = this.data.queue[this.data.currentIndex];
        if (word)
            (0, audio_1.playAudio)(word.word, newAccent);
    },
    _applyModeForCurrent() {
        const mode = (0, store_2.toConcreteMode)(this.data.practiceMode);
        const keepFlip = this.data.isFlipped && this.data.practiceMode === 'card';
        const word = this.data.queue[this.data.currentIndex];
        this._clearRevealTimer();
        const flipBase = keepFlip ? { isFlipped: false, showMeaning: false } : {};
        const flipBack = () => {
            if (!keepFlip)
                return;
            wx.nextTick(() => {
                this.setData({ isFlipped: true, showMeaning: true });
            });
        };
        if (mode === 'quick') {
            this.setData({
                activeMode: 'quick',
                quickLearning: true,
                currentIndex: 0,
                revealAfterUnknown: false,
                spellInput: '',
                spellFeedback: 'none',
                choiceSelected: -1
            });
            return;
        }
        this.setData({
            activeMode: mode,
            quickLearning: false,
            ...flipBase,
            revealAfterUnknown: false,
            spellInput: '',
            spellFeedback: 'none',
            choiceSelected: -1
        }, () => {
            flipBack();
            if (!word)
                return;
            if (mode === 'choice') {
                this.generateChoiceOptions(word);
            }
            else if (mode === 'card') {
                (0, audio_1.playAudio)(word.word, this.data.accent);
            }
        });
    },
    generateChoiceOptions(currentWord) {
        const allWords = this.data._wordBookWords;
        if (allWords.length < 4) {
            this.setData({ activeMode: 'card' });
            return;
        }
        const distractors = [];
        const used = new Set([currentWord.word]);
        let attempts = 0;
        while (distractors.length < 3 && attempts < 100) {
            const idx = Math.floor(Math.random() * allWords.length);
            const w = allWords[idx];
            if (!used.has(w.word) && w.meaning !== currentWord.meaning) {
                distractors.push(w);
                used.add(w.word);
            }
            attempts++;
        }
        const options = [
            { meaning: currentWord.meaning, isCorrect: true },
            ...distractors.map(d => ({ meaning: d.meaning, isCorrect: false }))
        ].sort(() => Math.random() - 0.5);
        this.setData({
            choiceOptions: options,
            choiceSelected: -1,
            choiceCorrect: false
        });
    },
    onChoiceSelect(e) {
        if (this.data.choiceSelected !== -1)
            return;
        if (this._checkAnswered())
            return;
        const idx = e.currentTarget.dataset.idx;
        const option = this.data.choiceOptions[idx];
        const isCorrect = option.isCorrect;
        this.setData({
            choiceSelected: idx,
            choiceCorrect: isCorrect
        });
        const word = this.data.queue[this.data.currentIndex];
        if (word)
            (0, audio_1.playAudio)(word.word, this.data.accent);
        const bookId = (0, store_1.getCurrentBookId)();
        (0, store_1.recordWordProgress)(bookId, word.word, isCorrect);
        (0, store_1.recordStudy)(1, this._isNewWord(word.word));
        if (!isCorrect) {
            (0, store_1.addToWrongBook)(word.word, word.meaning, bookId);
        }
        if (isCorrect) {
            this.setData({ knownCount: this.data.knownCount + 1 });
        }
        else {
            this.setData({ unknownCount: this.data.unknownCount + 1 });
        }
        setTimeout(() => {
            this.nextWord();
        }, isCorrect ? 1000 : 2500);
    },
    onChoiceDontKnow() {
        if (this.data.choiceSelected !== -1)
            return;
        if (this._checkAnswered())
            return;
        this.setData({ choiceSelected: -2, choiceCorrect: false });
        const word = this.data.queue[this.data.currentIndex];
        if (word)
            (0, audio_1.playAudio)(word.word, this.data.accent);
        const bookId = (0, store_1.getCurrentBookId)();
        (0, store_1.recordWordProgress)(bookId, word.word, false);
        (0, store_1.recordStudy)(1, this._isNewWord(word.word));
        (0, store_1.addToWrongBook)(word.word, word.meaning, bookId);
        this.setData({ unknownCount: this.data.unknownCount + 1 });
    },
    onChoiceNext() {
        if (this.data.choiceSelected !== -2)
            return;
        this.setData({ choiceSelected: -1 });
        this.nextWord();
    },
    onSpellInput(e) {
        this.setData({ spellInput: e.detail.value });
    },
    onSpellSubmit() {
        const input = this.data.spellInput.trim().toLowerCase();
        if (!input)
            return;
        const word = this.data.queue[this.data.currentIndex];
        if (!word)
            return;
        if (this._checkAnswered())
            return;
        const isCorrect = input === word.word.toLowerCase();
        this.setData({
            spellFeedback: isCorrect ? 'correct' : 'wrong'
        });
        (0, audio_1.playAudio)(word.word, this.data.accent);
        const bookId = (0, store_1.getCurrentBookId)();
        (0, store_1.recordWordProgress)(bookId, word.word, isCorrect);
        (0, store_1.recordStudy)(1, this._isNewWord(word.word));
        if (!isCorrect) {
            (0, store_1.addToWrongBook)(word.word, word.meaning, bookId);
        }
        if (isCorrect) {
            this.setData({ knownCount: this.data.knownCount + 1 });
        }
        else {
            this.setData({ unknownCount: this.data.unknownCount + 1 });
        }
        setTimeout(() => {
            this.nextWord();
        }, isCorrect ? 1200 : 3000);
    },
    _openSheet(type, title, options) {
        this.setData({ showSheet: true, sheetType: type, sheetTitle: title, sheetOptions: options });
    },
    closeSheet() {
        this.setData({ showSheet: false });
    },
    onSheetSelect(e) {
        const idx = e.currentTarget.dataset.index;
        const type = e.currentTarget.dataset.type;
        this.setData({ showSheet: false });
        if (type === 'mode') {
            const modes = ['card', 'choice', 'spell', 'mix', 'quick'];
            const mode = modes[idx];
            if (!mode || mode === this.data.practiceMode)
                return;
            (0, store_1.setPracticeMode)(mode);
            if (mode === 'quick') {
                this.setData({
                    practiceMode: mode,
                    modeIndex: idx,
                    activeMode: 'quick',
                    quickLearning: true,
                    currentIndex: 0,
                    knownCount: 0,
                    unknownCount: 0,
                    revealAfterUnknown: false,
                    showMeaning: false,
                    isFlipped: false,
                    spellInput: '',
                    spellFeedback: 'none',
                    choiceSelected: -1,
                    quickUnknown: {}
                });
                this._answeredSet = new Set();
                this._clearRevealTimer();
                return;
            }
            this.setData({ practiceMode: mode, modeIndex: idx });
            if (this.data.queue.length > 0) {
                this._applyModeForCurrent();
            }
        }
        else if (type === 'scope') {
            const modes = ['all', 'highFreq', 'func', 'content'];
            const newMode = modes[idx];
            if (!newMode || newMode === this.data.studyMode)
                return;
            (0, store_1.setStudyMode)(newMode);
            this.setData({ wordClassLabel: this.WORD_CLASS_LABELS[newMode] || '全部' });
            this.initBatch();
        }
        else if (type === 'batch') {
            const options = [5, 10, 15, 20];
            const n = options[idx];
            if (!n || n === this.data.batchSize)
                return;
            (0, store_1.setBatchSize)(n);
            this.setData({ batchSize: n });
            wx.showToast({ title: '每轮 ' + n + ' 个单词', icon: 'none' });
            this.initBatch();
        }
    },
    onModeTap() {
        const modes = ['card', 'choice', 'spell', 'mix', 'quick'];
        this._openSheet('mode', '学习模式', modes.map((m, i) => ({ label: this.data.modeLabels[i], active: m === this.data.practiceMode })));
    },
    onQuickMark(e) {
        const word = e.currentTarget.dataset.word;
        if (!word)
            return;
        (0, audio_1.playAudio)(word, this.data.accent);
        const quickUnknown = { ...this.data.quickUnknown };
        if (quickUnknown[word]) {
            delete quickUnknown[word];
        }
        else {
            quickUnknown[word] = true;
        }
        this.setData({ quickUnknown });
    },
    _recordQuickRound() {
        const bookId = (0, store_1.getCurrentBookId)();
        const queue = this.data.queue;
        const unknownSet = this.data.quickUnknown;
        let unknownCount = 0;
        for (const w of queue) {
            const known = !unknownSet[w.word];
            if (!known) {
                unknownCount += 1;
                (0, store_1.addToWrongBook)(w.word, w.meaning, bookId);
            }
            (0, store_1.recordWordProgress)(bookId, w.word, known);
            (0, store_1.recordStudy)(1, this._isNewWord(w.word));
        }
        this.setData({ knownCount: queue.length - unknownCount, unknownCount });
        this.syncToCloud();
        return unknownCount;
    },
    onNextRound() {
        const unknownCount = this._recordQuickRound();
        wx.showToast({
            title: unknownCount > 0 ? '已记录，不认识的词会尽快再安排' : '全部认识，太棒了！',
            icon: 'none'
        });
        this.initBatch();
    },
    onQuickFinish() {
        this._recordQuickRound();
        this.finishRound();
    },
    onPracticeModeChange(e) {
        const mode = e.currentTarget.dataset.mode;
        if (mode === this.data.practiceMode)
            return;
        (0, store_1.setPracticeMode)(mode);
        this.setData({ practiceMode: mode });
        if (this.data.queue.length > 0) {
            this._applyModeForCurrent();
        }
        const labels = { card: '卡片模式', choice: '选择模式', spell: '拼写模式', mix: '混合模式', quick: '快速学习' };
        wx.showToast({ title: labels[mode] || '', icon: 'none' });
    },
    onToggleOrderMode() {
        const newMode = this.data.orderMode === 'random' ? 'sequential' : 'random';
        (0, store_1.setOrderMode)(newMode);
        wx.showToast({
            title: newMode === 'random' ? '已切换随机出词' : '已切换顺序出词',
            icon: 'none'
        });
        this.initBatch();
    },
    _isNewWord(word) {
        return !!this._newWordSet && this._newWordSet.has(word.toLowerCase());
    },
    onChangeBatchSize() {
        const options = [5, 10, 15, 20];
        this._openSheet('batch', '每轮个数', options.map(n => ({ label: n + ' 个/轮', active: n === this.data.batchSize })));
    },
    WORD_CLASS_LABELS: { all: '全部', highFreq: '高频词', func: '虚词', content: '实词' },
    onSelectWordClass() {
        const modes = ['all', 'highFreq', 'func', 'content'];
        this._openSheet('scope', '词书范围', modes.map(m => ({ label: this.WORD_CLASS_LABELS[m], active: m === this.data.studyMode })));
    },
    toggleStudyMode() {
        this.onSelectWordClass();
    },
    _todayRows: null,
    onExportToday() {
        wx.showLoading({ title: '整理单词中...' });
        (0, todayExport_1.collectTodayRows)().then((rows) => {
            wx.hideLoading();
            this._todayRows = rows;
            (0, todayExport_1.showExportSheet)(rows, () => this._getExportCanvas());
        }).catch(() => {
            wx.hideLoading();
            wx.showToast({ title: '整理失败，请重试', icon: 'none' });
        });
    },
    _getExportCanvas() {
        return new Promise((resolve, reject) => {
            wx.createSelectorQuery().in(this)
                .select('#exportCanvas')
                .fields({ node: true })
                .exec((res) => {
                if (res && res[0] && res[0].node)
                    resolve(res[0].node);
                else
                    reject(new Error('canvas 未就绪'));
            });
        });
    },
    markKnown() {
        if (this.data.currentIndex >= this.data.queue.length)
            return;
        if (this._checkAnswered())
            return;
        const word = this.data.queue[this.data.currentIndex];
        const bookId = (0, store_1.getCurrentBookId)();
        (0, store_1.recordWordProgress)(bookId, word.word, true);
        (0, store_1.recordStudy)(1, this._isNewWord(word.word));
        this.setData({
            knownCount: this.data.knownCount + 1
        });
        this.nextWord();
    },
    markUnknown() {
        if (this.data.currentIndex >= this.data.queue.length)
            return;
        if (this.data.revealAfterUnknown)
            return;
        if (this._checkAnswered())
            return;
        const word = this.data.queue[this.data.currentIndex];
        const bookId = (0, store_1.getCurrentBookId)();
        (0, store_1.recordWordProgress)(bookId, word.word, false);
        (0, store_1.recordStudy)(1, this._isNewWord(word.word));
        (0, store_1.addToWrongBook)(word.word, word.meaning, bookId);
        this.setData({
            unknownCount: this.data.unknownCount + 1,
            revealAfterUnknown: true,
            isFlipped: true,
            showMeaning: true
        });
        (0, audio_1.playAudio)(word.word, this.data.accent);
        this._clearRevealTimer();
        this._revealTimer = setTimeout(() => {
            this._revealTimer = null;
            if (this.data.revealAfterUnknown)
                this.onRevealNext();
        }, 4000);
    },
    _revealTimer: null,
    _clearRevealTimer() {
        if (this._revealTimer) {
            clearTimeout(this._revealTimer);
            this._revealTimer = null;
        }
    },
    onListTap(e) {
        const word = e.currentTarget.dataset.word;
        if (word)
            (0, audio_1.playAudio)(word, this.data.accent);
    },
    onRevealNext() {
        this._clearRevealTimer();
        this.setData({ revealAfterUnknown: false, isFlipped: false, showMeaning: false });
        this.nextWord();
    },
    nextWord() {
        if (!this.data.queue || this.data.queue.length === 0) {
            this.initBatch();
            return;
        }
        const next = this.data.currentIndex + 1;
        if (next >= this.data.queue.length) {
            this.finishRound();
            return;
        }
        this.setData({
            currentIndex: next
        }, () => {
            this._applyModeForCurrent();
            const afterNext = this.data.queue[next + 1];
            if (afterNext)
                (0, audio_1.preloadAudio)(afterNext.word, this.data.accent);
        });
    },
    finishRound() {
        this._loadedKey = '';
        const total = this.data.totalCount;
        const known = this.data.knownCount;
        const rate = total > 0 ? Math.round((known / total) * 100) : 0;
        let praise = '继续加油！';
        if (rate >= 90)
            praise = '太棒了，几乎全部掌握！';
        else if (rate >= 70)
            praise = '不错哦，继续保持！';
        else if (rate >= 50)
            praise = '还需多复习几遍';
        this._lastRoundQueue = this.data.queue.slice();
        this.syncToCloud();
        this.setData({
            showResult: true,
            resultRate: rate,
            resultPraise: praise
        });
    },
    onResultRestart() {
        this.setData({ showResult: false });
        this.initBatch();
    },
    _lastRoundQueue: [],
    onResultReviewRound() {
        const last = this._lastRoundQueue;
        if (!last || last.length === 0) {
            wx.showToast({ title: '本轮队列已不在，试试再来一轮', icon: 'none' });
            return;
        }
        this._clearRevealTimer();
        this._loadedKey = '';
        this._answeredSet = new Set();
        this._newWordSet = new Set();
        const reportedMap = {};
        for (const w of last) {
            if ((0, wordReport_1.isWordReported)(w.word))
                reportedMap[w.word] = true;
        }
        this.setData({
            showResult: false,
            queue: last,
            _wordBookWords: this.data._wordBookWords,
            currentIndex: 0,
            showMeaning: false,
            isFlipped: false,
            revealAfterUnknown: false,
            knownCount: 0,
            unknownCount: 0,
            totalCount: last.length,
            statusLabel: '复习',
            quickLearning: this.data.practiceMode === 'quick',
            quickUnknown: {},
            spellInput: '',
            spellFeedback: 'none',
            choiceSelected: -1,
            reportedMap
        }, () => {
            this._applyModeForCurrent();
        });
    },
    onResultBack() {
        this.setData({ showResult: false });
        wx.switchTab({ url: '/pages/index/index' });
    },
    onSharePoster() {
        this._skipInitOnShow = true;
        this._restoreResultOnShow = this.data.showResult;
        this.setData({ showResult: false });
        wx.navigateTo({
            url: `/pages/poster/poster?rate=${this.data.resultRate}`
        });
    },
    syncToCloud() {
        (0, store_1.syncStatsToCloud)((0, store_1.getStats)());
    },
    onShareAppMessage() {
        return {
            title: '我在用词根记忆法背单词，一起来！',
            path: '/pages/index/index'
        };
    },
    onShareTimeline() {
        return {
            title: '我在用词根记忆法背单词，一起来！'
        };
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3b3Jkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLDZDQXFCMkI7QUFFM0IsNkNBQW1EO0FBQ25ELHlEQUFzRDtBQUN0RCw0Q0FBMkQ7QUFDM0QsNkNBQTREO0FBQzVELHVEQUFnRjtBQUNoRix5REFBc0Y7QUFHdEYsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUM7QUFJekMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQUUzQyxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFHckMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQVEzQyxJQUFJLENBQUM7SUFDSCxJQUFJLEVBQUU7UUFFSixRQUFRLEVBQUUsTUFBTTtRQUNoQixTQUFTLEVBQUUsQ0FBQztRQUVaLEtBQUssRUFBRSxFQUFnQjtRQUN2QixZQUFZLEVBQUUsQ0FBQztRQUVmLFdBQVcsRUFBRSxLQUFLO1FBRWxCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLENBQUM7UUFDZixVQUFVLEVBQUUsQ0FBQztRQUViLFFBQVEsRUFBRSxDQUFDO1FBQ1gsYUFBYSxFQUFFLENBQUM7UUFFaEIsV0FBVyxFQUFFLElBQUk7UUFFakIsT0FBTyxFQUFFLElBQUk7UUFFYixPQUFPLEVBQUUsSUFBSTtRQUViLFNBQVMsRUFBRSxLQUFrQjtRQUU3QixTQUFTLEVBQUUsRUFBRTtRQUViLGFBQWEsRUFBRSxDQUFDO1FBRWhCLFNBQVMsRUFBRSxDQUFDO1FBQ1osWUFBWSxFQUFFLENBQUM7UUFFZixjQUFjLEVBQUUsSUFBSTtRQUNwQixhQUFhLEVBQUUsUUFBUTtRQUl2QixZQUFZLEVBQUUsTUFBc0I7UUFFcEMsVUFBVSxFQUFFLE1BQThCO1FBRTFDLGFBQWEsRUFBRSxFQUFvQjtRQUVuQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRWxCLGFBQWEsRUFBRSxLQUFLO1FBRXBCLFVBQVUsRUFBRSxFQUFFO1FBRWQs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aEIsVUFBVSxFQUFFLEVBQUU7WUFDZCxhQUFhLEVBQUUsTUFBTTtZQUNyQixjQUFjLEVBQUUsQ0FBQyxDQUFDO1lBQ2xCLFdBQVc7U0FDWixFQUFFLEdBQUcsRUFBRTtZQUNOLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzlCLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUdELFlBQVk7UUFDVixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDcEMsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUcsRUFBRSxvQkFBb0IsRUFBRSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUdELGFBQWE7UUFFWCxJQUFJLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztRQUM1QixJQUFJLENBQUMsb0JBQW9CLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7UUFDakQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLEVBQUUsQ0FBQyxVQUFVLENBQUM7WUFDWixHQUFHLEVBQUUsNkJBQTZCLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFO1NBQ3pELENBQUMsQ0FBQztJQUNMLENBQUM7SUFHRCxXQUFXO1FBQ1QsSUFBQSx3QkFBZ0IsRUFBQyxJQUFBLGdCQUFRLEdBQUUsQ0FBQyxDQUFDO0lBQy9CLENBQUM7SUFHRCxpQkFBaUI7UUFDZixPQUFPO1lBQ0wsS0FBSyxFQUFFLGtCQUFrQjtZQUN6QixJQUFJLEVBQUUsb0JBQW9CO1NBQzNCLENBQUM7SUFDSixDQUFDO0lBR0QsZUFBZTtRQUNiLE9BQU87WUFDTCxLQUFLLEVBQUUsa0JBQWtCO1NBQzFCLENBQUM7SUFDSixDQUFDO0NBQ0YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gcGFnZXMvd29yZHMvd29yZHMudHNcbmltcG9ydCB7IFdvcmRJdGVtIH0gZnJvbSAnLi4vLi4vZGF0YS90eXBlcyc7XG5pbXBvcnQge1xuICBnZXRDdXJyZW50Qm9va0lkLFxuICBnZXRBbGxQcm9ncmVzcyxcbiAgcmVjb3JkV29yZFByb2dyZXNzLFxuICByZWNvcmRTdHVkeSxcbiAgZ2V0Qm9va1Byb2dyZXNzU3RhdHMsXG4gIGdldFN0YXRzLFxuICBzeW5jU3RhdHNUb0Nsb3VkLFxuICBoYXNTZWxlY3RlZEJvb2ssXG4gIGdldFN0dWR5TW9kZSxcbiAgc2V0U3R1ZHlNb2RlLFxuICBnZXRCYXRjaFNpemUsXG4gIHNldEJhdGNoU2l6ZSxcbiAgZ2V0UHJhY3RpY2VNb2RlLFxuICBzZXRQcmFjdGljZU1vZGUsXG4gIGdldE9yZGVyTW9kZSxcbiAgc2V0T3JkZXJNb2RlLFxuICBnZXRUb2RheUxlYXJuZWRXb3JkcyxcbiAgZ2V0QWNjZW50LFxuICBzZXRBY2NlbnQsXG4gIGFkZFRvV3JvbmdCb29rXG59IGZyb20gJy4uLy4uL3V0aWxzL3N0b3JlJztcbmltcG9ydCB0eXBlIHsgUHJhY3RpY2VNb2RlLCBDb25jcmV0ZVByYWN0aWNlTW9kZSwgQWNjZW50LCBTdHVkeU1vZGUgfSBmcm9tICcuLi8uLi91dGlscy9zdG9yZSc7XG5pbXBvcnQgeyB0b0NvbmNyZXRlTW9kZSB9IGZyb20gJy4uLy4uL3V0aWxzL3N0b3JlJztcbmltcG9ydCB7IGdldEJvb2tCeUlkIH0gZnJvbSAnLi4vLi4vdXRpbHMvd29yZFNlcnZpY2UnO1xuaW1wb3J0IHsgd29yZEJvb2tzIGFzIGxvY2FsQm9va3MgfSBmcm9tICcuLi8uLi9kYXRhL2luZGV4JztcbmltcG9ydCB7IHBsYXlBdWRpbywgcHJlbG9hZEF1ZGlvIH0gZnJvbSAnLi4vLi4vdXRpbHMvYXVkaW8nO1xuaW1wb3J0IHsgcmVwb3J0V29yZCwgaXNXb3JkUmVwb3J0ZWQsIFJlcG9ydFR5cGUgfSBmcm9tICcuLi8uLi91dGlscy93b3JkUmVwb3J0JztcbmltcG9ydCB7IGNvbGxlY3RUb2RheVJvd3MsIHNob3dFeHBvcnRTaGVldCwgVG9kYXlSb3cgfSBmcm9tICcuLi8uLi91dGlscy90b2RheUV4cG9ydCc7XG5cbi8vIOWkjeS5oOaooeW8j+S4gOasoeaAp+WFpeWPo+agh+W/l++8iOmmlumhteKAnOW+heWkjeS5oOKAneeCueWHu+aXtuWGmeWFpe+8jHdvcmRzIOmhtSBvblNob3cg5raI6LS577yJXG5jb25zdCBSRVZJRVdfTU9ERV9LRVkgPSAnYmNfcmV2aWV3X21vZGUnO1xuXG4vLyDorrDlv4bkvZPmo4Dpq5jljbHor43kuIDova7lvI/lhaXlj6PmoIflv5fvvIhtZW1vcnkg6aG144CM56uL5Y2z5aSN5Lmg6L+Z5Lqb6K+N44CN5YaZ5YWl77yMd29yZHMg6aG1IG9uU2hvdyDmtojotLnvvIlcbi8vIOWAvO+8mnsgYm9va0lkOiBzdHJpbmcsIHdvcmRzOiBzdHJpbmdbXSB977yM5LiO5pys6K+N5Lmm5Yy56YWN5omN55Sf5pWIXG5jb25zdCBNRU1PUllfV09SRFNfS0VZID0gJ2JjX21lbW9yeV93b3Jkcyc7XG4vLyDpppbpobXigJzlrabmlrDor43igJ3lhaXlj6PmoIflv5fvvIjkuIDmrKHmgKfvvInvvJrlvLrliLblvIDmlrDkuIDova7vvIzkuI3otbDigJzmlbDmja7mnKrlj5jot7Pov4fph43lu7rigJ3lrojljatcbmNvbnN0IE5FV19ST1VORF9LRVkgPSAnYmNfbmV3X3JvdW5kJztcblxuLy8g4oCc5LuK5pel5aSN55uY4oCd5YWl5Y+j5qCH5b+X77yI5LiA5qyh5oCn77yJ77ya5pys6L2u5Y+q5aSN55uY5LuK5aSp5a2m6L+H55qE6K+N77yI5oiR55qE6aG1L+mmlumhteWGmeWFpe+8iVxuY29uc3QgVE9EQVlfUkVWSUVXX0tFWSA9ICdiY190b2RheV9yZXZpZXcnO1xuXG4vLyDlm5vpgInkuIDpgInpobnmjqXlj6NcbmludGVyZmFjZSBDaG9pY2VPcHRpb24ge1xuICBtZWFuaW5nOiBzdHJpbmc7XG4gIGlzQ29ycmVjdDogYm9vbGVhbjtcbn1cblxuUGFnZSh7XG4gIGRhdGE6IHtcbiAgICAvLyDlvZPliY3or43kuabkv6Hmga9cbiAgICBib29rTmFtZTogJ+WIneS4reivjeaxhycsXG4gICAgYm9va1RvdGFsOiAwLFxuICAgIC8vIOacrOi9ruWNleivjemYn+WIl1xuICAgIHF1ZXVlOiBbXSBhcyBXb3JkSXRlbVtdLFxuICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAvLyDmmK/lkKbmmL7npLrph4rkuYnvvIjljaHniYfmqKHlvI/nlKjvvIlcbiAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgLy8g5pys6L2u5a2m5Lmg6L+b5bqmXG4gICAga25vd25Db3VudDogMCxcbiAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgdG90YWxDb3VudDogMCxcbiAgICAvLyDlvoXlpI3kuaDmlbBcbiAgICBkdWVDb3VudDogMCxcbiAgICBtYXN0ZXJlZENvdW50OiAwLFxuICAgIC8vIOeKtuaAgeagh+etvlxuICAgIHN0YXR1c0xhYmVsOiAn5paw6K+NJyxcbiAgICAvLyDmmK/lkKbov5jmnInmm7TlpJpcbiAgICBoYXNNb3JlOiB0cnVlLFxuICAgIC8vIOWKoOi9veeKtuaAgVxuICAgIGxvYWRpbmc6IHRydWUsXG4gICAgLy8g5a2m5Lmg6IyD5Zu0562b6YCJ77yI5YWo6YOoL+mrmOmikS/omZror40v5a6e6K+N77yJXG4gICAgc3R1ZHlNb2RlOiAnYWxsJyBhcyBTdHVkeU1vZGUsXG4gICAgLy8g5q+P6L2u5a2m5Lmg5Y2V6K+N5pWw77yI6aG26YOo5oyJ6ZKu5Y+v6LCD77yJXG4gICAgYmF0Y2hTaXplOiAxMCxcbiAgICAvLyDpq5jpopHor43mlbDph49cbiAgICBoaWdoRnJlcUNvdW50OiAwLFxuICAgIC8vIOiZmuivjS/lrp7or43mlbDph49cbiAgICBmdW5jQ291bnQ6IDAsXG4gICAgY29udGVudENvdW50OiAwLFxuICAgIC8vIOWtpuS5oOiMg+WbtOagh+etvu+8iHd4bWwg5bGV56S677yJXG4gICAgd29yZENsYXNzTGFiZWw6ICflhajpg6gnLFxuICAgIGN1cnJlbnRCb29rSWQ6ICdqdW5pb3InLFxuICAgIC8vIHJlbWluZGVyU3Vic2NyaWJlZDogZmFsc2UsIC8vIOWtpuS5oOaPkOmGkuW3suS4i+e6v++8iDIwMjYtMDgtMzHvvIlcbiAgICAvLyDilIDilIDilIAg6Zi25q615LiA5paw5aKeIOKUgOKUgOKUgFxuICAgIC8vIOe7g+S5oOaooeW8j++8muWNoeeJh+e/u+mdoiAvIOWbm+mAieS4gCAvIOaLvOWGmSAvIOa3t+WQiO+8iG1peO+8iVxuICAgIHByYWN0aWNlTW9kZTogJ2NhcmQnIGFzIFByYWN0aWNlTW9kZSxcbiAgICAvLyDlvZPliY3or43lrp7pmYXmuLLmn5PnmoTlh7rpopjmlrnlvI/vvIhtaXgg5qih5byP5LiL5q+P5Liq6K+N6ZqP5py677yM5YW25L2Z5LiOIHByYWN0aWNlTW9kZSDkuIDoh7TvvIlcbiAgICBhY3RpdmVNb2RlOiAnY2FyZCcgYXMgQ29uY3JldGVQcmFjdGljZU1vZGUsXG4gICAgLy8g5Zub6YCJ5LiA6YCJ6aG5XG4gICAgY2hvaWNlT3B0aW9uczogW10gYXMgQ2hvaWNlT3B0aW9uW10sXG4gICAgLy8g5Zub6YCJ5LiA5piv5ZCm5bey6YCJXG4gICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgIC8vIOWbm+mAieS4gOaYr+WQpuetlOWvuVxuICAgIGNob2ljZUNvcnJlY3Q6IGZhbHNlLFxuICAgIC8vIOaLvOWGmeaooeW8j+i+k+WFpeWAvFxuICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgIC8vIOaLvOWGmeWPjemmiOeKtuaAge+8mm5vbmUgLyBjb3JyZWN0IC8gd3JvbmdcbiAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgLy8g5Y+R6Z+z5Y+j6Z+z5YGP5aW9XG4gICAgYWNjZW50OiAndXMnIGFzIEFjY2VudCxcbiAgICAvLyDnu5PmnpzpobVcbiAgICBzaG93UmVzdWx0OiBmYWxzZSxcbiAgICByZXN1bHRSYXRlOiAwLFxuICAgIHJlc3VsdFByYWlzZTogJycsXG4gICAgLy8g57+76Z2i5Yqo55S754q25oCBXG4gICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAvLyDljaHniYfmqKHlvI/jgIzkuI3orqTor4bjgI3mj63npLrnrZTmoYjnirbmgIHvvIh0cnVlIOaXtuWxleekuuOAjOS4i+S4gOS4quOAjeaMiemSruW5tumUgeWumue/u+mdou+8iVxuICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgLy8g5LiK5LiA6aKY5a+56ZSZ77yI55So5LqO57uT5p6c6aG15Yik5pat5piv5ZCm6K6w5b2V77yJXG4gICAgX3dvcmRCb29rV29yZHM6IFtdIGFzIFdvcmRJdGVtW10sXG4gICAgLy8g5b+r6YCf5qih5byP77ya5qCH6K6w5Li65LiN6K6k6K+G55qE6K+N77yId29yZCDihpIgdHJ1Ze+8ie+8jOacquagh+iusOm7mOiupOiupOivhlxuICAgIHF1aWNrVW5rbm93bjoge30gYXMgUmVjb3JkPHN0cmluZywgYm9vbGVhbj4sXG4gICAgLy8g5b+r6YCf5qih5byP6Zi25q615byA5YWz77yadHJ1ZT3lv6vpgJ/lrabkuaDvvIjliJfooajmtY/op4jvvInvvIxmYWxzZT3mo4DmtYvpmLbmrrXvvIjlm5vpgInkuIDmqKHlvI/vvIlcbiAgICBxdWlja0xlYXJuaW5nOiBmYWxzZSxcbiAgICAvLyDlh7rpopjpobrluo/vvJrpmo/mnLogLyDpobrluo9cbiAgICBvcmRlck1vZGU6ICdyYW5kb20nIGFzICdyYW5kb20nIHwgJ3NlcXVlbnRpYWwnLFxuICAgIC8vIOKUgOKUgOKUgCDlh7rpopjmqKHlvI/kuIvmi4nmoYYg4pSA4pSA4pSAXG4gICAgbW9kZUxhYmVsczogWyfljaHniYcnLCAn6YCJ5oupJywgJ+aLvOWGmScsICfmt7flkIgnLCAn5b+r6YCfJ10gYXMgc3RyaW5nW10sXG4gICAgbW9kZUluZGV4OiAwLFxuICAgIC8vIOKUgOKUgOKUgCDoh6rlrprkuYnpgInmi6nlvLnmoYYg4pSA4pSA4pSAXG4gICAgc2hvd1NoZWV0OiBmYWxzZSxcbiAgICBzaGVldFRpdGxlOiAnJyxcbiAgICBzaGVldE9wdGlvbnM6IFtdIGFzIEFycmF5PHsgbGFiZWw6IHN0cmluZzsgYWN0aXZlOiBib29sZWFuIH0+LFxuICAgIHNoZWV0VHlwZTogJycgYXMgc3RyaW5nLFxuICAgIC8vIOKUgOKUgOKUgCDnuqDplJnkuIrmiqUg4pSA4pSA4pSAXG4gICAgc2hvd1JlcG9ydDogZmFsc2UsXG4gICAgcmVwb3J0VHlwZTogJycgYXMgUmVwb3J0VHlwZSB8ICcnLFxuICAgIHJlcG9ydERlc2M6ICcnLFxuICAgIHJlcG9ydGVkTWFwOiB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiAvLyDlt7LkuIrmiqXor43vvIh3b3JkIOKGkiB0cnVl77yJXG4gIH0sXG5cbiAgb25Mb2FkKCkge30sXG5cbiAgLy8g5pys6L2u5bey5L2c562U55qE5LiL5qCH6ZuG5ZCI77yI5L+u5aSN5YiH5qih5byP5ZCO5ZCM5LiA6K+N6YeN5aSN6K6h5pWw55qEIGJ1Z++8iVxuICBfYW5zd2VyZWRTZXQ6IG5ldyBTZXQ8bnVtYmVyPigpIGFzIFNldDxudW1iZXI+LFxuXG4gIG9uU2hvdygpIHtcbiAgICAvLyDku47liIbkuqvmtbfmiqXpobXov5Tlm57vvJrkv53nlZnlvZPliY3kuIDova7nu5PmnpzvvIzkuI3ph43mlrDliqDovb3mlrDnmoTkuIDova5cbiAgICBpZiAodGhpcy5fc2tpcEluaXRPblNob3cpIHtcbiAgICAgIHRoaXMuX3NraXBJbml0T25TaG93ID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5fcmVzdG9yZVJlc3VsdE9uU2hvdykge1xuICAgICAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5fcmVzdG9yZVJlc3VsdE9uU2hvdyA9IGZhbHNlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyDmtojotLnpppbpobXigJzlvoXlpI3kuaDigJ3lhaXlj6PmoIflv5fvvJrmnKzova7ku4XlpI3kuaDliLDmnJ/lvoXlpI3kuaDor43vvIjkuIDmrKHmgKfvvIlcbiAgICBpZiAod3guZ2V0U3RvcmFnZVN5bmMoUkVWSUVXX01PREVfS0VZKSA9PT0gMSkge1xuICAgICAgd3gucmVtb3ZlU3RvcmFnZVN5bmMoUkVWSUVXX01PREVfS0VZKTtcbiAgICAgIHRoaXMuX3Jldmlld01vZGUgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9yZXZpZXdNb2RlID0gZmFsc2U7XG4gICAgfVxuICAgIC8vIOa2iOi0ueiusOW/huS9k+ajgOWFpeWPo+agh+W/l++8muacrOi9ruWPquWkjeS5oOS9k+ajgOa4heWNlemHjOeahOmrmOWNseivje+8iOS4gOasoeaAp++8jOi3qOivjeS5puS4ouW8g++8iVxuICAgIGNvbnN0IG1lbUZsYWcgPSB3eC5nZXRTdG9yYWdlU3luYyhNRU1PUllfV09SRFNfS0VZKSBhcyB7IGJvb2tJZDogc3RyaW5nOyB3b3Jkczogc3RyaW5nW10gfSB8ICcnO1xuICAgIHd4LnJlbW92ZVN0b3JhZ2VTeW5jKE1FTU9SWV9XT1JEU19LRVkpO1xuICAgIGlmIChcbiAgICAgIG1lbUZsYWcgJiYgdHlwZW9mIG1lbUZsYWcgPT09ICdvYmplY3QnICYmXG4gICAgICBtZW1GbGFnLmJvb2tJZCA9PT0gZ2V0Q3VycmVudEJvb2tJZCgpICYmXG4gICAgICBBcnJheS5pc0FycmF5KG1lbUZsYWcud29yZHMpICYmIG1lbUZsYWcud29yZHMubGVuZ3RoID4gMFxuICAgICkge1xuICAgICAgdGhpcy5fbWVtb3J5V29yZHMgPSBtZW1GbGFnLndvcmRzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9tZW1vcnlXb3JkcyA9IG51bGw7XG4gICAgfVxuICAgIC8vIOmmlumhteS4u+WKqOeCueKAnOWtpuaWsOivjeKAne+8muW8uuWItuW8gOaWsOS4gOi9ru+8iOa4heaOiemHjeW7uuWuiOWNq+eahCBrZXnvvIlcbiAgICBpZiAod3guZ2V0U3RvcmFnZVN5bmMoTkVXX1JPVU5EX0tFWSkgPT09IDEpIHtcbiAgICAgIHd4LnJlbW92ZVN0b3JhZ2VTeW5jKE5FV19ST1VORF9LRVkpO1xuICAgICAgdGhpcy5fbG9hZGVkS2V5ID0gJyc7XG4gICAgfVxuXG4gICAgLy8g5raI6LS54oCc5LuK5pel5aSN55uY4oCd5YWl5Y+j5qCH5b+X77ya5pys6L2u5Y+q5aSN55uY5LuK5aSp5a2m6L+H55qE6K+N77yI5LiA5qyh5oCn77yJXG4gICAgaWYgKHd4LmdldFN0b3JhZ2VTeW5jKFRPREFZX1JFVklFV19LRVkpID09PSAxKSB7XG4gICAgICB3eC5yZW1vdmVTdG9yYWdlU3luYyhUT0RBWV9SRVZJRVdfS0VZKTtcbiAgICAgIHRoaXMuX3RvZGF5UmV2aWV3TW9kZSA9IHRydWU7XG4gICAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdG9kYXlSZXZpZXdNb2RlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8g6aaW5qyh5L2/55So77ya6Lez6L2s6K+N5Lmm6YCJ5oup6aG1XG4gICAgaWYgKCFoYXNTZWxlY3RlZEJvb2soKSkge1xuICAgICAgd3gubmF2aWdhdGVUbyh7IHVybDogJy9wYWdlcy9ib29rbGlzdC9ib29rbGlzdCcgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjdXJyZW50Qm9va0lkOiBnZXRDdXJyZW50Qm9va0lkKCksXG4gICAgICBwcmFjdGljZU1vZGU6IGdldFByYWN0aWNlTW9kZSgpLFxuICAgICAgbW9kZUluZGV4OiBbJ2NhcmQnLCAnY2hvaWNlJywgJ3NwZWxsJywgJ21peCcsICdxdWljayddLmluZGV4T2YoZ2V0UHJhY3RpY2VNb2RlKCkpLFxuICAgICAgYWNjZW50OiBnZXRBY2NlbnQoKSxcbiAgICAgIG9yZGVyTW9kZTogZ2V0T3JkZXJNb2RlKClcbiAgICAgIC8vIHJlbWluZGVyU3Vic2NyaWJlZDogaXNSZW1pbmRlclN1YnNjcmliZWQoKSAvLyDlrabkuaDmj5DphpLlt7LkuIvnur/vvIgyMDI2LTA4LTMx77yJXG4gICAgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICBvblVubG9hZCgpIHtcbiAgICAvLyDpobXpnaLljbjovb3ml7bmuIXnkIbpn7PpopHkuIrkuIvmlofvvIjlpoLmnpzmnInvvIlcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG4gIH0sXG5cbiAgYXN5bmMgaW5pdEJhdGNoKCkge1xuICAgIC8vIOS7iuaXpeWkjeebmOi9ru+8mumYn+WIlyA9IOS7iuWkqeWtpui/h+eahOivje+8iOi3qOivjeS5pu+8ie+8jOS4jei1sOW4uOinhOaOkueoi1xuICAgIGlmICh0aGlzLl90b2RheVJldmlld01vZGUpIHtcbiAgICAgIHRoaXMuX3RvZGF5UmV2aWV3TW9kZSA9IGZhbHNlO1xuICAgICAgY29uc3Qgb2sgPSBhd2FpdCB0aGlzLl9pbml0VG9kYXlCYXRjaCgpO1xuICAgICAgaWYgKCFvaykgYXdhaXQgdGhpcy5faW5pdE5vcm1hbEJhdGNoKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pbml0Tm9ybWFsQmF0Y2goKTtcbiAgfSxcblxuICAvLyDku4rml6XlpI3nm5jova7vvJrmiorku4rlpKnlrabov4fnmoTor43ph43liLfkuIDpgY3vvIjkuI3orqTor4bnmoTmjpLliY3pnaLvvIlcbiAgYXN5bmMgX2luaXRUb2RheUJhdGNoKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHRvZGF5cyA9IGdldFRvZGF5TGVhcm5lZFdvcmRzKCk7XG4gICAgaWYgKHRvZGF5cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5LuK5aSp6L+Y5rKh5pyJ5a2m5Lmg6K6w5b2V77yM5YWI5a2m5Yeg5Liq6K+N5ZCnJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyDmjIkgYm9va0lkIOWIhue7hOaLieivjeS5pu+8jOaYoOWwhOWbnuWujOaVtOivjeadoe+8iOaLv+mHiuS5iS/pn7PmoIcv6K+N5qC577yJXG4gICAgY29uc3QgYnlCb29rID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuICAgIGZvciAoY29uc3QgdCBvZiB0b2RheXMpIHtcbiAgICAgIGNvbnN0IGFyciA9IGJ5Qm9vay5nZXQodC5ib29rSWQpIHx8IFtdO1xuICAgICAgYXJyLnB1c2godC53b3JkKTtcbiAgICAgIGJ5Qm9vay5zZXQodC5ib29rSWQsIGFycik7XG4gICAgfVxuICAgIGNvbnN0IHF1ZXVlOiBXb3JkSXRlbVtdID0gW107XG4gICAgY29uc3QgYWxsV29yZHM6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCB1bmtub3duU2V0ID0gbmV3IFNldChcbiAgICAgIHRvZGF5cy5maWx0ZXIodCA9PiAhdC5rbm93bikubWFwKHQgPT4gdC53b3JkLnRvTG93ZXJDYXNlKCkpXG4gICAgKTtcbiAgICBmb3IgKGNvbnN0IFtiaWQsIHdvcmRzXSBvZiBieUJvb2spIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJvb2sgPSBhd2FpdCBnZXRCb29rQnlJZChiaWQpO1xuICAgICAgICBpZiAoIWJvb2spIGNvbnRpbnVlO1xuICAgICAgICBhbGxXb3Jkcy5wdXNoKC4uLmJvb2sud29yZHMpO1xuICAgICAgICBjb25zdCB3c2V0ID0gbmV3IFNldCh3b3Jkcy5tYXAodyA9PiB3LnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgICAgZm9yIChjb25zdCB3IG9mIGJvb2sud29yZHMpIHtcbiAgICAgICAgICBpZiAod3NldC5oYXMody53b3JkLnRvTG93ZXJDYXNlKCkpKSBxdWV1ZS5wdXNoKHcpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1vku4rml6XlpI3nm5hdIOivjeS5puWKoOi9veWksei0pScsIGJpZCwgZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcbiAgICAvLyDkuI3orqTor4bnmoTmjpLliY3pnaLvvIznrZTmvI/nmoTkvJjlhYjooaVcbiAgICBxdWV1ZS5zb3J0KChhLCBiKSA9PlxuICAgICAgKHVua25vd25TZXQuaGFzKGIud29yZC50b0xvd2VyQ2FzZSgpKSA/IDEgOiAwKSAtICh1bmtub3duU2V0LmhhcyhhLndvcmQudG9Mb3dlckNhc2UoKSkgPyAxIDogMClcbiAgICApO1xuXG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgdGhpcy5fbmV3V29yZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpOyAvLyDlpI3nm5jkuI3orqHlhaXntK/orqHmlrDor41cbiAgICBjb25zdCByZXBvcnRlZE1hcDogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgcXVldWUpIHtcbiAgICAgIGlmIChpc1dvcmRSZXBvcnRlZCh3LndvcmQpKSByZXBvcnRlZE1hcFt3LndvcmRdID0gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgcHJvZ3Jlc3NTdGF0cyA9IGdldEJvb2tQcm9ncmVzc1N0YXRzKGdldEN1cnJlbnRCb29rSWQoKSk7XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGJvb2tOYW1lOiAn5LuK5pel5aSN55uYJyxcbiAgICAgIHF1ZXVlLFxuICAgICAgX3dvcmRCb29rV29yZHM6IGFsbFdvcmRzLFxuICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgcXVpY2tMZWFybmluZzogdGhpcy5kYXRhLnByYWN0aWNlTW9kZSA9PT0gJ3F1aWNrJyxcbiAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAga25vd25Db3VudDogMCxcbiAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgIHRvdGFsQ291bnQ6IHF1ZXVlLmxlbmd0aCxcbiAgICAgIGR1ZUNvdW50OiBwcm9ncmVzc1N0YXRzLmR1ZUNvdW50LFxuICAgICAgbWFzdGVyZWRDb3VudDogcHJvZ3Jlc3NTdGF0cy5tYXN0ZXJlZENvdW50LFxuICAgICAgc3RhdHVzTGFiZWw6ICflpI3nm5gnLFxuICAgICAgaGFzTW9yZTogZmFsc2UsXG4gICAgICBsb2FkaW5nOiBmYWxzZSxcbiAgICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICBxdWlja1Vua25vd246IHt9LFxuICAgICAgcmVwb3J0ZWRNYXBcbiAgICB9LCAoKSA9PiB7XG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgYXN5bmMgX2luaXROb3JtYWxCYXRjaCgpIHtcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgY29uc3Qgc3R1ZHlNb2RlID0gZ2V0U3R1ZHlNb2RlKCk7XG4gICAgY29uc3QgcHJhY3RpY2VNb2RlID0gZ2V0UHJhY3RpY2VNb2RlKCk7XG4gICAgY29uc3QgYWNjZW50ID0gZ2V0QWNjZW50KCk7XG4gICAgY29uc3QgYmF0Y2hTaXplID0gZ2V0QmF0Y2hTaXplKCk7XG5cbiAgICAvLyDpobXpnaLlt7LmnInmlbDmja7kuJTor43kuaYv6K6+572u6YO95rKh5Y+Y5pe277yM6Lez6L+H6YeN5bu677yM6YG/5YWNIG9uU2hvdyDph43lpI3ov5vlhaXml7bmlbTpobXpl6rkuIDmrKFcIumHjeaWsOWKoOi9vVwiXG4gICAgY29uc3Qgb3JkZXJNb2RlID0gZ2V0T3JkZXJNb2RlKCk7XG4gICAgY29uc3Qgd29yZENsYXNzTGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBhbGw6ICflhajpg6gnLCBoaWdoRnJlcTogJ+mrmOmikeivjScsIGZ1bmM6ICfomZror40nLCBjb250ZW50OiAn5a6e6K+NJyB9O1xuICAgIGNvbnN0IHNldHRpbmdzS2V5ID0gW2Jvb2tJZCwgc3R1ZHlNb2RlLCBwcmFjdGljZU1vZGUsIGFjY2VudCwgYmF0Y2hTaXplLCBvcmRlck1vZGVdLmpvaW4oJ3wnKTtcbiAgICBpZiAoXG4gICAgICB0aGlzLmRhdGEucXVldWUubGVuZ3RoID4gMCAmJiAhdGhpcy5kYXRhLnNob3dSZXN1bHQgJiZcbiAgICAgICF0aGlzLl9yZXZpZXdNb2RlICYmICF0aGlzLl9tZW1vcnlXb3JkcyAmJlxuICAgICAgdGhpcy5fbG9hZGVkS2V5ID09PSBzZXR0aW5nc0tleVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9sb2FkZWRLZXkgPSBzZXR0aW5nc0tleTtcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG5cbiAgICAvLyDpobXpnaLlt7LmnInlhoXlrrnvvIjmjaLkuaYv5byA5paw6L2u77yJ77ya5LiN6L+bIGxvYWRpbmcg5oCB77yM5L+d5oyB5pen5Y2h54mH5Y+v6KeB77yMXG4gICAgLy8g6Zif5YiX5bCx57uq5ZCO5LiA5qyh5oCn5pu/5o2i77yM5a6e546wXCLlubPnqLPmjaLova5cIuaXoOmXquWKqO+8m+S7hemmluasoei/m+WFpeaJjeaYvuekuuWKoOi9veWKqOeUu1xuICAgIGlmICh0aGlzLmRhdGEucXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBsb2FkaW5nOiB0cnVlLCBzdHVkeU1vZGUsIHByYWN0aWNlTW9kZSwgYWNjZW50LCBiYXRjaFNpemUsIG9yZGVyTW9kZSwgd29yZENsYXNzTGFiZWw6IHdvcmRDbGFzc0xhYmVsc1tzdHVkeU1vZGVdIHx8ICflhajpg6gnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBzdHVkeU1vZGUsIHByYWN0aWNlTW9kZSwgYWNjZW50LCBiYXRjaFNpemUsIG9yZGVyTW9kZSwgd29yZENsYXNzTGFiZWw6IHdvcmRDbGFzc0xhYmVsc1tzdHVkeU1vZGVdIHx8ICflhajpg6gnIH0pO1xuICAgIH1cblxuICAgIGxldCBib29rO1xuICAgIHRyeSB7XG4gICAgICBib29rID0gYXdhaXQgZ2V0Qm9va0J5SWQoYm9va0lkKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCfojrflj5bor43kuablpLHotKUnLCBlKTtcbiAgICB9XG5cbiAgICBpZiAoIWJvb2sgfHwgIWJvb2sud29yZHMgfHwgYm9vay53b3Jkcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIOS6keerr+aLieWPluWksei0pe+8jOWwneivleacrOWcsOenjeWtkOivjeW6k+WFnOW6lVxuICAgICAgY29uc3QgbG9jYWxCb29rID0gbG9jYWxCb29rcy5maW5kKGIgPT4gYi5pZCA9PT0gYm9va0lkKTtcbiAgICAgIGlmIChsb2NhbEJvb2sgJiYgbG9jYWxCb29rLndvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYm9vayA9IGxvY2FsQm9vaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7IGxvYWRpbmc6IGZhbHNlLCBxdWV1ZTogW10gfSk7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6K+N5bqT5Yqg6L295Lit77yM6ams5LiK5bCx5aW9JywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g5aSN5LmgL+iusOW/huS9k+ajgOaooeW8j+e7lei/h+ivjeaAp+etm+mAie+8muW+heWkjeS5oOeahOivjeS4jeivpeiiq+KAnOiMg+WbtDromZror43igJ3nrYnov4fmu6TmjonvvIxcbiAgICAvLyDlkKbliJnorqHliJLph4wgNDMg5Liq5b6F5aSN5Lmg6K+NIOKIqSDomZror40gPSAwIOaXtuS8muWHuueOsOKAnOivjeS5puW3suWFqOmDqOaOjOaPoeKAneeahOWBh+ixoVxuICAgIGNvbnN0IGJ5cGFzc0ZpbHRlciA9IHRoaXMuX3Jldmlld01vZGUgfHwgISF0aGlzLl9tZW1vcnlXb3JkcztcblxuICAgIC8vIOagueaNruWtpuS5oOiMg+WbtOetm+mAie+8iOWFqOmDqC/pq5jpopEv6Jma6K+NL+Wunuivje+8iVxuICAgIGNvbnN0IGhpZ2hGcmVxQ291bnQgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcuaXNIaWdoRnJlcSkubGVuZ3RoO1xuICAgIGNvbnN0IGZ1bmNDb3VudCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgPT09ICdmdW5jJykubGVuZ3RoO1xuICAgIGNvbnN0IGNvbnRlbnRDb3VudCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgIT09ICdmdW5jJykubGVuZ3RoO1xuICAgIGxldCB3b3JkTGlzdDogV29yZEl0ZW1bXTtcbiAgICBsZXQgZW1wdHlUaXAgPSAnJztcbiAgICBpZiAoYnlwYXNzRmlsdGVyKSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHM7XG4gICAgfSBlbHNlIGlmIChzdHVkeU1vZGUgPT09ICdoaWdoRnJlcScpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LmlzSGlnaEZyZXEpO1xuICAgICAgZW1wdHlUaXAgPSAn6L+Z5pys6K+N5Lmm5rKh5pyJ5qCH5rOo6auY6aKR6K+NJztcbiAgICB9IGVsc2UgaWYgKHN0dWR5TW9kZSA9PT0gJ2Z1bmMnKSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgPT09ICdmdW5jJyk7XG4gICAgICAvLyDor43mnaHlrozlhajmsqHmnIkgcG9zVGFnIOWtl+autSA9IOivjeS5puaVsOaNruaYr+aXp+eJiO+8iOS6keerr+acquabtOaWsC/otbDkuobnp43lrZDlhZzlupUv57yT5a2Y5pyq5aSx5pWI77yJXG4gICAgICBpZiAoIWJvb2sud29yZHMuc29tZSh3ID0+ICdwb3NUYWcnIGluIHcpKSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+ivjeS5puaVsOaNruacquWMheWQq+ivjeaAp+agh+azqO+8jOivt+abtOaWsOivjeW6k+WQjumHjeivlSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbXB0eVRpcCA9ICfov5nmnKzor43kuabmmoLml6DomZror43moIfms6gnO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc3R1ZHlNb2RlID09PSAnY29udGVudCcpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyAhPT0gJ2Z1bmMnKTtcbiAgICAgIGlmICghYm9vay53b3Jkcy5zb21lKHcgPT4gJ3Bvc1RhZycgaW4gdykpIHtcbiAgICAgICAgZW1wdHlUaXAgPSAn6K+N5Lmm5pWw5o2u5pyq5YyF5ZCr6K+N5oCn5qCH5rOo77yM6K+35pu05paw6K+N5bqT5ZCO6YeN6K+VJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+i/meacrOivjeS5puaaguaXoOWunuivjeagh+azqCc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3JkcztcbiAgICB9XG5cbiAgICBpZiAod29yZExpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBsb2FkaW5nOiBmYWxzZSwgcXVldWU6IFtdLCBoaWdoRnJlcUNvdW50LCBmdW5jQ291bnQsIGNvbnRlbnRDb3VudCB9KTtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBlbXB0eVRpcCwgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFsbFByb2dyZXNzID0gZ2V0QWxsUHJvZ3Jlc3MoYm9va0lkKTtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gICAgLy8g5p6E5bu65a2m5Lmg6Zif5YiX77yaXG4gICAgLy8gMS4g5LyY5YWI5Y+W5b6F5aSN5Lmg55qE6K+N77yIbmV4dFJldmlldyA8PSBub3cg5LiU5LiN5pivIG1hc3RlcmVk77yJXG4gICAgLy8gMi4g5Y+W5pyq5a2m6L+H55qE5paw6K+NXG4gICAgY29uc3QgZHVlV29yZHM6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCBuZXdXb3JkczogV29yZEl0ZW1bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB3IG9mIHdvcmRMaXN0KSB7XG4gICAgICBjb25zdCBwID0gYWxsUHJvZ3Jlc3Nbdy53b3JkXTtcbiAgICAgIGlmICghcCkge1xuICAgICAgICBuZXdXb3Jkcy5wdXNoKHcpO1xuICAgICAgfSBlbHNlIGlmIChwLnN0YXR1cyAhPT0gJ21hc3RlcmVkJyAmJiBwLm5leHRSZXZpZXcgPiAwICYmIHAubmV4dFJldmlldyA8PSBub3cpIHtcbiAgICAgICAgZHVlV29yZHMucHVzaCh3KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDogIPpopHmjpLluo/vvJrmlrDor43mjIkgRUNESUNUIOivjemikemZjeW6j++8iOW4uOingeivjeWFiOWtpu+8ie+8jOS8mOWFiOWtpuS8muiAg+ivlemHjOWHuueOsOacgOWkmueahOivjVxuICAgIG5ld1dvcmRzLnNvcnQoKGEsIGIpID0+IChiLmZyZXF1ZW5jeSB8fCAwKSAtIChhLmZyZXF1ZW5jeSB8fCAwKSk7XG5cbiAgICAvLyDlkIjlubbpmJ/liJfvvJrpu5jorqTkvJjlhYjlpI3kuaDvvIzlho3lrabmlrDor43vvJvlpI3kuaDmqKHlvI/kuIvku4XlpI3kuaDliLDmnJ/lvoXlpI3kuaDor41cbiAgICAvLyDpmo/mnLrmqKHlvI/kuIvvvJrmlrDor43ku47or43kuablhajpg6jmnKrlrabor43kuK3pmo/mnLrmir3lj5bvvIjogIzkuI3mmK/mjInor43popHlj5bliY0gTiDkuKrvvIxcbiAgICAvLyDpgb/lhY3ov57nu63lh6Dova7pgYfliLDnmoTpg73mmK/lkIzkuIDmibnor43vvInvvIzlpI3kuaDor43ku43kvJjlhYjljaDkvY1cbiAgICBsZXQgcXVldWU7XG4gICAgaWYgKHRoaXMuX3Jldmlld01vZGUpIHtcbiAgICAgIGlmIChkdWVXb3Jkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8g5rKh5pyJ5Yiw5pyf5b6F5aSN5Lmg6K+N77ya5YiH5Zue5bi46KeE5a2m5Lmg77yM6YG/5YWN56m66L2uXG4gICAgICAgIHRoaXMuX3Jldmlld01vZGUgPSBmYWxzZTtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7Llhajpg6jlpI3kuaDlrozvvIzliIflm57luLjop4TlrabkuaAnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICAgIHF1ZXVlID0gWy4uLmR1ZVdvcmRzLCAuLi5uZXdXb3Jkc10uc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlID0gZHVlV29yZHMuc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG9yZGVyTW9kZSA9PT0gJ3JhbmRvbScpIHtcbiAgICAgIC8vIOWkjeS5oOivjeWQjOagt+S7juWFqOmDqOWIsOacn+ivjeS4remaj+acuuaKveWPlu+8iOiAjOS4jeaYr+aMieivjeihqOmhuuW6j+WPluWJjSBOIOS4qu+8iVxuICAgICAgY29uc3QgZHVlOiBXb3JkSXRlbVtdID0gW107XG4gICAgICBpZiAoZHVlV29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBwb29sID0gWy4uLmR1ZVdvcmRzXTtcbiAgICAgICAgY29uc3QgdGFrZSA9IE1hdGgubWluKGJhdGNoU2l6ZSwgcG9vbC5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRha2U7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGogPSBpICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKHBvb2wubGVuZ3RoIC0gaSkpO1xuICAgICAgICAgIGNvbnN0IHQgPSBwb29sW2ldOyBwb29sW2ldID0gcG9vbFtqXTsgcG9vbFtqXSA9IHQ7XG4gICAgICAgICAgZHVlLnB1c2gocG9vbFtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlbWFpbmluZyA9IGJhdGNoU2l6ZSAtIGR1ZS5sZW5ndGg7XG4gICAgICBjb25zdCBzYW1wbGVkTmV3OiBXb3JkSXRlbVtdID0gW107XG4gICAgICBpZiAocmVtYWluaW5nID4gMCAmJiBuZXdXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHBvb2wgPSBbLi4ubmV3V29yZHNdO1xuICAgICAgICBjb25zdCB0YWtlID0gTWF0aC5taW4ocmVtYWluaW5nLCBwb29sLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGFrZTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgaiA9IGkgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAocG9vbC5sZW5ndGggLSBpKSk7XG4gICAgICAgICAgY29uc3QgdCA9IHBvb2xbaV07IHBvb2xbaV0gPSBwb29sW2pdOyBwb29sW2pdID0gdDtcbiAgICAgICAgICBzYW1wbGVkTmV3LnB1c2gocG9vbFtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHF1ZXVlID0gWy4uLmR1ZSwgLi4uc2FtcGxlZE5ld107XG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXVlID0gWy4uLmR1ZVdvcmRzLCAuLi5uZXdXb3Jkc10uc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICB9XG5cbiAgICAvLyDlpoLmnpzpmJ/liJfkuLrnqbrvvIjmsqHmnInlvoXlpI3kuaDkuZ/msqHmnInmlrDor43vvInvvIzlj5blt7Lmjozmj6HnmoTor43lpI3kuaBcbiAgICBsZXQgZmluYWxRdWV1ZSA9IHF1ZXVlO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IG1hc3RlcmVkV29yZHMgPSB3b3JkTGlzdC5maWx0ZXIoKHcpID0+IHtcbiAgICAgICAgY29uc3QgcCA9IGFsbFByb2dyZXNzW3cud29yZF07XG4gICAgICAgIHJldHVybiBwICYmIHAuc3RhdHVzID09PSAnbWFzdGVyZWQnO1xuICAgICAgfSk7XG4gICAgICBmaW5hbFF1ZXVlID0gbWFzdGVyZWRXb3Jkcy5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgOKUgCDorrDlv4bkvZPmo4Dpq5jljbHor43ova7mrKHvvJropobnm5bpmJ/liJfkuLrkvZPmo4DmuIXljZXvvIjkv53mjIHkvZPmo4Dph4znmoTljbHpmanpobrluo/vvIzmnIDljbHpmanlnKjliY3vvIkg4pSA4pSA4pSAXG4gICAgLy8g55So5YWo6YeP6K+N6KGo5Yy56YWN77yI5LiN6LWwIHN0dWR5TW9kZSDpq5jpopHov4fmu6TvvIzlkKbliJnmuIXljZXor43lj6/og73lhajlhpvopobmsqHogIzpnZnpu5jlm57pgIDmiJDluLjop4Tova7mrKHvvIlcbiAgICBsZXQgbWVtQWN0aXZlID0gZmFsc2U7XG4gICAgaWYgKHRoaXMuX21lbW9yeVdvcmRzICYmICh0aGlzLl9tZW1vcnlXb3JkcyBhcyBzdHJpbmdbXSkubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbWVtTGVuID0gKHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKS5sZW5ndGg7XG4gICAgICBjb25zdCBtZW1TZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB0aGlzLl9tZW1vcnlXb3JkcyBhcyBzdHJpbmdbXSkgbWVtU2V0LmFkZCh3LnRvTG93ZXJDYXNlKCkpO1xuICAgICAgY29uc3QgbWF0Y2hlZCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gbWVtU2V0Lmhhcyh3LndvcmQudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgaWYgKG1hdGNoZWQubGVuZ3RoID4gMCkge1xuICAgICAgICBmaW5hbFF1ZXVlID0gKHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKVxuICAgICAgICAgIC5tYXAoKHc6IHN0cmluZykgPT4gbWF0Y2hlZC5maW5kKChtOiBXb3JkSXRlbSkgPT4gbS53b3JkLnRvTG93ZXJDYXNlKCkgPT09IHcudG9Mb3dlckNhc2UoKSkpXG4gICAgICAgICAgLmZpbHRlcigoeDogV29yZEl0ZW0gfCB1bmRlZmluZWQpOiB4IGlzIFdvcmRJdGVtID0+ICEheCk7XG4gICAgICAgIG1lbUFjdGl2ZSA9IHRydWU7XG4gICAgICAgIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA8IG1lbUxlbikge1xuICAgICAgICAgIC8vIOa4heWNlemHjOacieivjeS4jeWcqOW9k+WJjeivjeihqO+8iOWmguivjeW6k+abtOaWsOi/h++8ie+8muWmguWunuaPkOekuu+8jOe8uuWkseeahOS4jeihpeWIq+eahOivjVxuICAgICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBg5riF5Y2V5LitICR7bWVtTGVuIC0gZmluYWxRdWV1ZS5sZW5ndGh9IOS4quivjeS4jeWcqOivjeS5pu+8jOW3sui3s+i/h2AsIGljb246ICdub25lJyB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8g5YWo6YOo5Yy56YWN5LiN5LiK77yI5p6B5bCR6KeB77yJ77ya5LiN6Z2Z6buY5Zue6YCA77yM5piO56Gu5ZGK55+lXG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6L+Z5Yeg5Liq6K+N5LiN5Zyo5b2T5YmN6K+N5Lmm6YeM77yM5bey5YiH5Zue5bi46KeE5a2m5LmgJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVtb3J5V29yZHMgPSBudWxsOyAvLyDkuIDmrKHmgKfvvIznlKjlkI7ljbPlvINcbiAgICB9XG5cbiAgICAvLyDlh7rpopjpobrluo/vvJrpmo/mnLrmqKHlvI/miZPkubHpmJ/liJfvvIjlpI3kuaDkvJjlhYgv5bep5Zu66Zif5YiX5Zyo57uE5YaF5omT5Lmx77yM5LiN5pS55Y+Y5LyY5YWI57qn77ybXG4gICAgLy8g6K6w5b+G5L2T5qOA6L2u5L+d5oyB5Y2x6Zmp6aG65bqP5LiN5Lmx5bqP77yJXG4gICAgaWYgKG9yZGVyTW9kZSA9PT0gJ3JhbmRvbScgJiYgIW1lbUFjdGl2ZSAmJiBmaW5hbFF1ZXVlLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZvciAobGV0IGkgPSBmaW5hbFF1ZXVlLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgY29uc3QgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xuICAgICAgICBjb25zdCB0ID0gZmluYWxRdWV1ZVtpXTtcbiAgICAgICAgZmluYWxRdWV1ZVtpXSA9IGZpbmFsUXVldWVbal07XG4gICAgICAgIGZpbmFsUXVldWVbal0gPSB0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOiusOW9leacrOi9ruWTquS6m+aYr+mmluasoeWtpuS5oOeahOaWsOivje+8iOWkjeS5oC/lt6nlm7rkuI3orqHlhaXigJzntK/orqHljZXor43igJ3vvIlcbiAgICB0aGlzLl9uZXdXb3JkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCB3IG9mIGZpbmFsUXVldWUpIHtcbiAgICAgIGlmIChuZXdXb3Jkcy5pbmRleE9mKHcpID4gLTEpIHRoaXMuX25ld1dvcmRTZXQuYWRkKHcud29yZC50b0xvd2VyQ2FzZSgpKTtcbiAgICB9XG5cbiAgICAvLyDlt7LkuIrmiqXor43moIforrDvvIjljaHniYfog4zpnaLmmL7npLrjgIzlt7LkuIrmiqXjgI3vvIlcbiAgICBjb25zdCByZXBvcnRlZE1hcDogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgZmluYWxRdWV1ZSkge1xuICAgICAgaWYgKGlzV29yZFJlcG9ydGVkKHcud29yZCkpIHJlcG9ydGVkTWFwW3cud29yZF0gPSB0cnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyZXNzU3RhdHMgPSBnZXRCb29rUHJvZ3Jlc3NTdGF0cyhib29rSWQpO1xuXG4gICAgLy8g5paw5LiA6L2u5byA5aeL77yM5riF56m65bey5L2c562U5qCH6K6w77yI5L+u5aSN5YiH5qih5byP5ZCO5ZCM5LiA6K+N6YeN5aSN6K6h5pWw55qEIGJ1Z++8iVxuICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG5cbiAgICAvLyDnirbmgIHmoIfnrb7mjInmnKzova7pmJ/liJflrp7pmYXmnoTmiJDliKTlrprvvJrlhajpg6jkuLrliLDmnJ/or43miY3mmK/jgIzlpI3kuaDjgI3vvIxcbiAgICAvLyDmt7flhaXmlrDor43vvIjlpI3kuaDor43kvJjlhYjljaDkvY0r5paw6K+N6KGl6b2Q77yJ5pe25qCH44CM5paw6K+N44CN77yM6YG/5YWNIDEg5Liq5aSN5Lmg6K+NKzkg5Liq5paw6K+N6K+v5qCH5oiQ5aSN5LmgXG4gICAgY29uc3QgZHVlV29yZFNldCA9IG5ldyBTZXQoZHVlV29yZHMubWFwKHcgPT4gdy53b3JkKSk7XG4gICAgY29uc3QgZHVlSW5RdWV1ZSA9IGZpbmFsUXVldWUuZmlsdGVyKHcgPT4gZHVlV29yZFNldC5oYXMody53b3JkKSkubGVuZ3RoO1xuICAgIGxldCBzdGF0dXNMYWJlbCA9ICfmlrDor40nO1xuICAgIGlmIChtZW1BY3RpdmUpIHtcbiAgICAgIHN0YXR1c0xhYmVsID0gJ+mrmOWNseivjSc7XG4gICAgfSBlbHNlIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA+IDAgJiYgZHVlSW5RdWV1ZSA9PT0gZmluYWxRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHN0YXR1c0xhYmVsID0gJ+WkjeS5oCc7XG4gICAgfSBlbHNlIGlmIChkdWVJblF1ZXVlID09PSAwICYmIGR1ZVdvcmRzLmxlbmd0aCA9PT0gMCAmJiBuZXdXb3Jkcy5sZW5ndGggPT09IDAgJiYgZmluYWxRdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICBzdGF0dXNMYWJlbCA9ICflt6nlm7onO1xuICAgIH1cblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBib29rTmFtZTogYm9vay5uYW1lLFxuICAgICAgYm9va1RvdGFsOiB3b3JkTGlzdC5sZW5ndGgsXG4gICAgICBoaWdoRnJlcUNvdW50LFxuICAgICAgZnVuY0NvdW50LFxuICAgICAgY29udGVudENvdW50LFxuICAgICAgcXVldWU6IGZpbmFsUXVldWUsXG4gICAgICBfd29yZEJvb2tXb3Jkczogd29yZExpc3QsXG4gICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICBxdWlja0xlYXJuaW5nOiBwcmFjdGljZU1vZGUgPT09ICdxdWljaycsXG4gICAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICB0b3RhbENvdW50OiBmaW5hbFF1ZXVlLmxlbmd0aCxcbiAgICAgIGR1ZUNvdW50OiBwcm9ncmVzc1N0YXRzLmR1ZUNvdW50LFxuICAgICAgbWFzdGVyZWRDb3VudDogcHJvZ3Jlc3NTdGF0cy5tYXN0ZXJlZENvdW50LFxuICAgICAgc3RhdHVzTGFiZWwsXG4gICAgICBoYXNNb3JlOiBmaW5hbFF1ZXVlLmxlbmd0aCA+PSBiYXRjaFNpemUsXG4gICAgICBsb2FkaW5nOiBmYWxzZSxcbiAgICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICBxdWlja1Vua25vd246IHt9LFxuICAgICAgcmVwb3J0ZWRNYXBcbiAgICB9LCAoKSA9PiB7XG4gICAgICBpZiAoZmluYWxRdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICAgICAgLy8g6aKE5Yqg6L2956ys5LqM5Liq6K+N77yM57+76aG15pe256eS5Ye65aOwXG4gICAgICAgIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBwcmVsb2FkQXVkaW8oZmluYWxRdWV1ZVsxXS53b3JkLCBhY2NlbnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5b2T5YmN6K+N5piv5ZCm5bey5L2c562U6L+H77yI6Ziy5YiH5qih5byP5ZCO6YeN5aSN6K6h5pWw77yJXG4gIF9jaGVja0Fuc3dlcmVkKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9hbnN3ZXJlZFNldC5oYXModGhpcy5kYXRhLmN1cnJlbnRJbmRleCkpIHJldHVybiB0cnVlO1xuICAgIHRoaXMuX2Fuc3dlcmVkU2V0LmFkZCh0aGlzLmRhdGEuY3VycmVudEluZGV4KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cblxuXG4gIC8vIOWIh+aNouivjeS5pu+8mui/m+WFpeivjeS5pumAieaLqemhte+8iOaOqOiNkOWNoSArIOiAg+ivlS/mlZnmnZDliIbnu4TliJfooajvvIlcbiAgY2hhbmdlQm9vaygpIHtcbiAgICB3eC5uYXZpZ2F0ZVRvKHsgdXJsOiAnL3BhZ2VzL2Jvb2tsaXN0L2Jvb2tsaXN0JyB9KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5Y2h54mH57+76Z2i5qih5byPIOKUgOKUgOKUgFxuICAvLyDmvKvmuLjor43ml4/vvJrluKbnnYDlvZPliY3or43ot7PovazliLDor43moLnmmJ/ns7tcbiAgZ29HYWxheHkoKSB7XG4gICAgY29uc3QgdyA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAoIXcpIHJldHVybjtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogYC9wYWdlcy9nYWxheHkvZ2FsYXh5P3dvcmQ9JHtlbmNvZGVVUklDb21wb25lbnQody53b3JkKX1gXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOe6oOmUmeS4iuaKpSDilIDilIDilIBcbiAgb3BlblJlcG9ydCgpIHtcbiAgICBjb25zdCB3ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghdykgcmV0dXJuO1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXBvcnQ6IHRydWUsIHJlcG9ydFR5cGU6ICcnLCByZXBvcnREZXNjOiAnJyB9KTtcbiAgfSxcblxuICBjbG9zZVJlcG9ydCgpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVwb3J0OiBmYWxzZSB9KTtcbiAgfSxcblxuICBvblJlcG9ydFR5cGUoZTogYW55KSB7XG4gICAgdGhpcy5zZXREYXRhKHsgcmVwb3J0VHlwZTogZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQudHlwZSBhcyBSZXBvcnRUeXBlIH0pO1xuICB9LFxuXG4gIG9uUmVwb3J0RGVzYyhlOiBhbnkpIHtcbiAgICB0aGlzLnNldERhdGEoeyByZXBvcnREZXNjOiBlLmRldGFpbC52YWx1ZSB9KTtcbiAgfSxcblxuICBzdWJtaXRSZXBvcnQoKSB7XG4gICAgY29uc3QgdyA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAoIXcpIHJldHVybjtcbiAgICBpZiAoIXRoaXMuZGF0YS5yZXBvcnRUeXBlKSB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+ivt+WFiOmAieaLqemXrumimOexu+WeiycsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlcG9ydFdvcmQody53b3JkLCBib29rSWQsIHRoaXMuZGF0YS5yZXBvcnRUeXBlIGFzIFJlcG9ydFR5cGUsIHRoaXMuZGF0YS5yZXBvcnREZXNjKS50aGVuKChyKSA9PiB7XG4gICAgICBpZiAoci5hbHJlYWR5KSB7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6L+Z5Liq6Zeu6aKY5bey5pyJ5Lq65oql6L+H5ZWmJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfSBlbHNlIGlmIChyLm9rKSB7XG4gICAgICAgIGNvbnN0IHJlcG9ydGVkTWFwID0geyAuLi50aGlzLmRhdGEucmVwb3J0ZWRNYXAsIFt3LndvcmRdOiB0cnVlIH07XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXBvcnQ6IGZhbHNlLCByZXBvcnRlZE1hcCB9KTtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7Llj5fnkIbvvIzmhJ/osKLlhbHlu7rvvIEnLCBpY29uOiAnc3VjY2VzcycgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+aPkOS6pOWksei0pe+8jOivt+ajgOafpee9kee7nCcsIGljb246ICdub25lJyB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBmbGlwQ2FyZCgpIHtcbiAgICAvLyDjgIzkuI3orqTor4bjgI3mj63npLrnrZTmoYjlkI7kuZ/lhYHorrjoh6rnlLHnv7vpnaLvvIjlj6/nv7vlm57mraPpnaLlho3nnIvljZXor43vvInvvIzmtYHnqIvnlLHjgIzkuIvkuIDkuKrjgI3mjInpkq7mjqjov5tcbiAgICBjb25zdCBmbGlwcGVkID0gIXRoaXMuZGF0YS5pc0ZsaXBwZWQ7XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGlzRmxpcHBlZDogZmxpcHBlZCxcbiAgICAgIHNob3dNZWFuaW5nOiBmbGlwcGVkXG4gICAgfSk7XG4gICAgLy8g57+75Yiw6IOM6Z2i5pe26Ieq5Yqo5pKt5pS+5Y+R6Z+z77yM5bm26aKE5Yqg6L295LiL5LiA5Liq6K+NXG4gICAgaWYgKGZsaXBwZWQpIHtcbiAgICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXggKyAxXTtcbiAgICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICAgIGlmIChuZXh0KSBwcmVsb2FkQXVkaW8obmV4dC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICB9XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWPkemfsyDilIDilIDilIBcbiAgb25QbGF5QXVkaW8oKSB7XG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gIH0sXG5cbiAgLy8g5YiH5o2i5Y+j6Z+zXG4gIG9uVG9nZ2xlQWNjZW50KCkge1xuICAgIGNvbnN0IG5ld0FjY2VudDogQWNjZW50ID0gdGhpcy5kYXRhLmFjY2VudCA9PT0gJ3VzJyA/ICd1aycgOiAndXMnO1xuICAgIHNldEFjY2VudChuZXdBY2NlbnQpO1xuICAgIHRoaXMuc2V0RGF0YSh7IGFjY2VudDogbmV3QWNjZW50IH0pO1xuICAgIHd4LnNob3dUb2FzdCh7XG4gICAgICB0aXRsZTogbmV3QWNjZW50ID09PSAndWsnID8gJ+iLsemfs+aooeW8jycgOiAn576O6Z+z5qih5byPJyxcbiAgICAgIGljb246ICdub25lJ1xuICAgIH0pO1xuICAgIC8vIOWIh+aNouWQjueri+WNs+aSreaUvuW9k+WJjeivjVxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIG5ld0FjY2VudCk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWHuumimOaWueW8j+W6lOeUqO+8iOWQq+a3t+WQiOaooeW8j+maj+acuuaYoOWwhO+8iSDilIDilIDilIBcbiAgLy8g5Li65b2T5YmN6K+N56Gu5a6a5a6e6ZmF5Ye66aKY5pa55byP5bm26YeN572u562U6aKY54q25oCB77yb5Y2h54mH5qih5byP5L+d55WZ57+76Z2i5bu257ut77yI6YeK5LmJ6Z2i5pyd5LiK5YiH6K+N77yJXG4gIF9hcHBseU1vZGVGb3JDdXJyZW50KCkge1xuICAgIGNvbnN0IG1vZGUgPSB0b0NvbmNyZXRlTW9kZSh0aGlzLmRhdGEucHJhY3RpY2VNb2RlKTtcbiAgICBjb25zdCBrZWVwRmxpcCA9IHRoaXMuZGF0YS5pc0ZsaXBwZWQgJiYgdGhpcy5kYXRhLnByYWN0aWNlTW9kZSA9PT0gJ2NhcmQnO1xuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgLy8g5YiH6K+N6KGl5LiA5qyh55yf5a6e57+76Z2i77ya5YWI55+t5pqC5Zue5q2j6Z2i77yM5LiL5LiA5bin5YaN57+75Zue6YeK5LmJ6Z2i77yMXG4gICAgLy8g5raI6Zmk4oCc5o2i6K+N5pe25Y2h54mH5YOP5rKh57+76L+H5p2l4oCd55qE5Zuw5oOR77yI5L+d55WZ5YiH6K+N5L+d5oyB6YeK5LmJ6Z2i55qE6K6+6K6h77yJXG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpOyAvLyDliIfmqKHlvI8v5YiH6K+N5pe25Y+W5raI4oCc5LiN6K6k6K+G6Ieq5Yqo6Lez4oCd5a6a5pe25Zmo77yM6Ziy6Lez6K+N56ue5oCBXG4gICAgY29uc3QgZmxpcEJhc2UgPSBrZWVwRmxpcCA/IHsgaXNGbGlwcGVkOiBmYWxzZSwgc2hvd01lYW5pbmc6IGZhbHNlIH0gOiB7fTtcbiAgICBjb25zdCBmbGlwQmFjayA9ICgpID0+IHtcbiAgICAgIGlmICgha2VlcEZsaXApIHJldHVybjtcbiAgICAgIHd4Lm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgaXNGbGlwcGVkOiB0cnVlLCBzaG93TWVhbmluZzogdHJ1ZSB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgLy8g5b+r6YCf5qih5byP77ya6L+b5YWl5a2m5Lmg6Zi25q6177yM5oGi5aSN6Zif5YiX5aS05oyH6ZKI5LiO6K6h5pWw77yI5ZCM5LiA5om56K+N6YeN5a2m6YeN5rWL77yJXG4gICAgaWYgKG1vZGUgPT09ICdxdWljaycpIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICAgIGFjdGl2ZU1vZGU6ICdxdWljaycsXG4gICAgICAgIHF1aWNrTGVhcm5pbmc6IHRydWUsXG4gICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGFjdGl2ZU1vZGU6IG1vZGUsXG4gICAgICBxdWlja0xlYXJuaW5nOiBmYWxzZSwgLy8g5YiH5Yiw6Z2e5b+r6YCf5qih5byP5pe26YCA5Ye65a2m5Lmg6Zi25q6177yM6Ziy5q2i5YiX6KGo5q6L55WZXG4gICAgICAuLi5mbGlwQmFzZSxcbiAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMVxuICAgIH0sICgpID0+IHtcbiAgICAgIGZsaXBCYWNrKCk7XG4gICAgICBpZiAoIXdvcmQpIHJldHVybjtcbiAgICAgIGlmIChtb2RlID09PSAnY2hvaWNlJykge1xuICAgICAgICB0aGlzLmdlbmVyYXRlQ2hvaWNlT3B0aW9ucyh3b3JkKTtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gJ2NhcmQnKSB7XG4gICAgICAgIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlm5vpgInkuIDmqKHlvI8g4pSA4pSA4pSAXG4gIC8vIOeUn+aIkOWbm+mAieS4gOmAiemhue+8iOe7meWNleivjemAiemHiuS5ie+8iVxuICBnZW5lcmF0ZUNob2ljZU9wdGlvbnMoY3VycmVudFdvcmQ6IFdvcmRJdGVtKSB7XG4gICAgY29uc3QgYWxsV29yZHMgPSB0aGlzLmRhdGEuX3dvcmRCb29rV29yZHM7XG4gICAgaWYgKGFsbFdvcmRzLmxlbmd0aCA8IDQpIHtcbiAgICAgIC8vIOivjeS5puivjeaVsOS4jeWknyA0IOS4qu+8jOaXoOazleWHuuW5suaJsOmhue+8jOmZjee6p+S4uuWNoeeJh+WHuumimFxuICAgICAgdGhpcy5zZXREYXRhKHsgYWN0aXZlTW9kZTogJ2NhcmQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIOS7juivjeS5pumaj+acuuWPliAzIOS4quW5suaJsOmhuVxuICAgIGNvbnN0IGRpc3RyYWN0b3JzOiBXb3JkSXRlbVtdID0gW107XG4gICAgY29uc3QgdXNlZCA9IG5ldyBTZXQoW2N1cnJlbnRXb3JkLndvcmRdKTtcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlIChkaXN0cmFjdG9ycy5sZW5ndGggPCAzICYmIGF0dGVtcHRzIDwgMTAwKSB7XG4gICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhbGxXb3Jkcy5sZW5ndGgpO1xuICAgICAgY29uc3QgdyA9IGFsbFdvcmRzW2lkeF07XG4gICAgICBpZiAoIXVzZWQuaGFzKHcud29yZCkgJiYgdy5tZWFuaW5nICE9PSBjdXJyZW50V29yZC5tZWFuaW5nKSB7XG4gICAgICAgIGRpc3RyYWN0b3JzLnB1c2godyk7XG4gICAgICAgIHVzZWQuYWRkKHcud29yZCk7XG4gICAgICB9XG4gICAgICBhdHRlbXB0cysrO1xuICAgIH1cblxuICAgIC8vIOe7hOWQiCArIOmaj+acuuaJk+S5sVxuICAgIGNvbnN0IG9wdGlvbnM6IENob2ljZU9wdGlvbltdID0gW1xuICAgICAgeyBtZWFuaW5nOiBjdXJyZW50V29yZC5tZWFuaW5nLCBpc0NvcnJlY3Q6IHRydWUgfSxcbiAgICAgIC4uLmRpc3RyYWN0b3JzLm1hcChkID0+ICh7IG1lYW5pbmc6IGQubWVhbmluZywgaXNDb3JyZWN0OiBmYWxzZSB9KSlcbiAgICBdLnNvcnQoKCkgPT4gTWF0aC5yYW5kb20oKSAtIDAuNSk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgY2hvaWNlT3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIGNob2ljZUNvcnJlY3Q6IGZhbHNlXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5Zub6YCJ5LiA77ya54K55Ye76YCJ6aG5XG4gIG9uQ2hvaWNlU2VsZWN0KGU6IGFueSkge1xuICAgIGlmICh0aGlzLmRhdGEuY2hvaWNlU2VsZWN0ZWQgIT09IC0xKSByZXR1cm47IC8vIOW3sumAiei/h1xuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG5cbiAgICBjb25zdCBpZHggPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC5pZHggYXMgbnVtYmVyO1xuICAgIGNvbnN0IG9wdGlvbiA9IHRoaXMuZGF0YS5jaG9pY2VPcHRpb25zW2lkeF07XG4gICAgY29uc3QgaXNDb3JyZWN0ID0gb3B0aW9uLmlzQ29ycmVjdDtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjaG9pY2VTZWxlY3RlZDogaWR4LFxuICAgICAgY2hvaWNlQ29ycmVjdDogaXNDb3JyZWN0XG4gICAgfSk7XG5cbiAgICAvLyDmkq3mlL7ljZXor43lj5Hpn7NcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcblxuICAgIC8vIOiusOW9lei/m+W6plxuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGlzQ29ycmVjdCk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGlmICghaXNDb3JyZWN0KSB7XG4gICAgICBhZGRUb1dyb25nQm9vayh3b3JkLndvcmQsIHdvcmQubWVhbmluZywgYm9va0lkKTtcbiAgICB9XG5cbiAgICBpZiAoaXNDb3JyZWN0KSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBrbm93bkNvdW50OiB0aGlzLmRhdGEua25vd25Db3VudCArIDEgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHVua25vd25Db3VudDogdGhpcy5kYXRhLnVua25vd25Db3VudCArIDEgfSk7XG4gICAgfVxuXG4gICAgLy8g562U5a+55YGcIDEg56eS77yb562U6ZSZ5YGcIDIuNSDnp5LvvIznlZnml7bpl7TnnIvmuIXmraPnoa7nrZTmoYhcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgICB9LCBpc0NvcnJlY3QgPyAxMDAwIDogMjUwMCk7XG4gIH0sXG5cbiAgLy8g5Zub6YCJ5LiA77ya54K544CM5LiN6K6k6K+G44CN77yI5LiN54yc5LqG77yM55u05o6l5o+t56S65q2j56Gu562U5qGI77yM5oyJ562U6ZSZ6K6w5b2V77yJXG4gIG9uQ2hvaWNlRG9udEtub3coKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jaG9pY2VTZWxlY3RlZCAhPT0gLTEpIHJldHVybjsgLy8g5bey5L2c562UL+W3suaPreekulxuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG5cbiAgICAvLyBjaG9pY2VTZWxlY3RlZCDnva7kuLogLTLvvJrkuI3lkb3kuK3ku7vkvZXpgInpobnvvIjkuI3moIfnuqLplJnor6/pobnvvInvvIzkvYbop6blj5HmraPnoa7pobnpq5jkuq5cbiAgICB0aGlzLnNldERhdGEoeyBjaG9pY2VTZWxlY3RlZDogLTIsIGNob2ljZUNvcnJlY3Q6IGZhbHNlIH0pO1xuXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG5cbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCBmYWxzZSk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuXG4gICAgdGhpcy5zZXREYXRhKHsgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSB9KTtcblxuICAgIC8vIOS4jeiHquWKqOi3s+i9rO+8muWxleekuuato+ehruetlOahiOWQjuWHuuOAjOS4i+S4gOS4quOAjeaMiemSru+8jOe7meeUqOaIt+aXtumXtOiusOS9j+i/meS4quivjVxuICB9LFxuXG4gIC8vIOmAieaLqeaooeW8j+OAjOS4jeiupOivhuOAjeaPreekuuetlOahiOWQju+8jOeCueOAjOS4i+S4gOS4quOAjee7p+e7rVxuICBvbkNob2ljZU5leHQoKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jaG9pY2VTZWxlY3RlZCAhPT0gLTIpIHJldHVybjsgLy8g5LuF6ZmQ44CM5LiN6K6k6K+G44CN5o+t56S654q25oCBXG4gICAgdGhpcy5zZXREYXRhKHsgY2hvaWNlU2VsZWN0ZWQ6IC0xIH0pO1xuICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5ou85YaZ5qih5byPIOKUgOKUgOKUgFxuICBvblNwZWxsSW5wdXQoZTogYW55KSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc3BlbGxJbnB1dDogZS5kZXRhaWwudmFsdWUgfSk7XG4gIH0sXG5cbiAgb25TcGVsbFN1Ym1pdCgpIHtcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuZGF0YS5zcGVsbElucHV0LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICghaW5wdXQpIHJldHVybjtcblxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKCF3b3JkKSByZXR1cm47XG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcblxuXG4gICAgY29uc3QgaXNDb3JyZWN0ID0gaW5wdXQgPT09IHdvcmQud29yZC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHNwZWxsRmVlZGJhY2s6IGlzQ29ycmVjdCA/ICdjb3JyZWN0JyA6ICd3cm9uZydcbiAgICB9KTtcblxuICAgIC8vIOaSreaUvuWPkemfs1xuICAgIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuXG4gICAgLy8g6K6w5b2V6L+b5bqmXG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgaXNDb3JyZWN0KTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgaWYgKCFpc0NvcnJlY3QpIHtcbiAgICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuICAgIH1cblxuICAgIGlmIChpc0NvcnJlY3QpIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGtub3duQ291bnQ6IHRoaXMuZGF0YS5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXREYXRhKHsgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9XG5cbiAgICAvLyDmi7zlr7nlgZwgMS4yIOenku+8m+aLvOmUmeWBnCAzIOenku+8jOeVmeaXtumXtOiusOS9j+ato+ehruaLvOWGmVxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5uZXh0V29yZCgpO1xuICAgIH0sIGlzQ29ycmVjdCA/IDEyMDAgOiAzMDAwKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg57uD5Lmg5qih5byP5YiH5o2i77yI5YiH5o2i5LiN5o2i6K+N5LiN6Lez6K+N77yM5b2T5YmN6K+N5oyJ5paw5pa55byP6YeN5paw5Ye66aKY77yJIOKUgOKUgOKUgFxuICAvLyDilIDilIDilIAg6Ieq5a6a5LmJ6YCJ5oup5by55qGG77yI5qih5byPL+iMg+WbtC/mr4/ova7kuKrmlbDnu5/kuIDnlKjvvIkg4pSA4pSA4pSAXG4gIF9vcGVuU2hlZXQodHlwZTogc3RyaW5nLCB0aXRsZTogc3RyaW5nLCBvcHRpb25zOiBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IGFjdGl2ZTogYm9vbGVhbiB9Pikge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dTaGVldDogdHJ1ZSwgc2hlZXRUeXBlOiB0eXBlLCBzaGVldFRpdGxlOiB0aXRsZSwgc2hlZXRPcHRpb25zOiBvcHRpb25zIH0pO1xuICB9LFxuXG4gIGNsb3NlU2hlZXQoKSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1NoZWV0OiBmYWxzZSB9KTtcbiAgfSxcblxuICBvblNoZWV0U2VsZWN0KGU6IGFueSkge1xuICAgIGNvbnN0IGlkeCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LmluZGV4IGFzIG51bWJlcjtcbiAgICBjb25zdCB0eXBlID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQudHlwZSBhcyBzdHJpbmc7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1NoZWV0OiBmYWxzZSB9KTtcblxuICAgIGlmICh0eXBlID09PSAnbW9kZScpIHtcbiAgICAgIGNvbnN0IG1vZGVzOiBQcmFjdGljZU1vZGVbXSA9IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4JywgJ3F1aWNrJ107XG4gICAgICBjb25zdCBtb2RlID0gbW9kZXNbaWR4XSBhcyBQcmFjdGljZU1vZGU7XG4gICAgICBpZiAoIW1vZGUgfHwgbW9kZSA9PT0gdGhpcy5kYXRhLnByYWN0aWNlTW9kZSkgcmV0dXJuO1xuICAgICAgc2V0UHJhY3RpY2VNb2RlKG1vZGUpO1xuICAgICAgLy8g5YiH5Yiw5b+r6YCf77ya5LuO5a2m5Lmg6Zi25q615byA5aeL77yI546w5pyJ6Zif5YiX55u05o6l5Y+Y5a2m5Lmg5YiX6KGo77yJXG4gICAgICBpZiAobW9kZSA9PT0gJ3F1aWNrJykge1xuICAgICAgICB0aGlzLnNldERhdGEoe1xuICAgICAgICAgIHByYWN0aWNlTW9kZTogbW9kZSxcbiAgICAgICAgICBtb2RlSW5kZXg6IGlkeCxcbiAgICAgICAgICBhY3RpdmVNb2RlOiAncXVpY2snLCAvLyDlrabkuaDop4blm77muLLmn5PopoHmsYIgYWN0aXZlTW9kZT09PSdxdWljayfvvIzkuI7nrZTpopjop4blm77kupLmlqVcbiAgICAgICAgICBxdWlja0xlYXJuaW5nOiB0cnVlLFxuICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICBrbm93bkNvdW50OiAwLFxuICAgICAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgICAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgICAgICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgICAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICAgICAgcXVpY2tVbmtub3duOiB7fVxuICAgICAgICB9KTtcbiAgICAgICAgdGhpcy5fYW5zd2VyZWRTZXQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICAgICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICB0aGlzLnNldERhdGEoeyBwcmFjdGljZU1vZGU6IG1vZGUsIG1vZGVJbmRleDogaWR4IH0pO1xuICAgICAgaWYgKHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdzY29wZScpIHtcbiAgICAgIGNvbnN0IG1vZGVzOiBTdHVkeU1vZGVbXSA9IFsnYWxsJywgJ2hpZ2hGcmVxJywgJ2Z1bmMnLCAnY29udGVudCddO1xuICAgICAgY29uc3QgbmV3TW9kZSA9IG1vZGVzW2lkeF07XG4gICAgICBpZiAoIW5ld01vZGUgfHwgbmV3TW9kZSA9PT0gdGhpcy5kYXRhLnN0dWR5TW9kZSkgcmV0dXJuO1xuICAgICAgc2V0U3R1ZHlNb2RlKG5ld01vZGUpO1xuICAgICAgdGhpcy5zZXREYXRhKHsgd29yZENsYXNzTGFiZWw6IHRoaXMuV09SRF9DTEFTU19MQUJFTFNbbmV3TW9kZV0gfHwgJ+WFqOmDqCcgfSk7XG4gICAgICB0aGlzLmluaXRCYXRjaCgpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ2JhdGNoJykge1xuICAgICAgY29uc3Qgb3B0aW9ucyA9IFs1LCAxMCwgMTUsIDIwXTtcbiAgICAgIGNvbnN0IG4gPSBvcHRpb25zW2lkeF07XG4gICAgICBpZiAoIW4gfHwgbiA9PT0gdGhpcy5kYXRhLmJhdGNoU2l6ZSkgcmV0dXJuO1xuICAgICAgc2V0QmF0Y2hTaXplKG4pO1xuICAgICAgdGhpcy5zZXREYXRhKHsgYmF0Y2hTaXplOiBuIH0pO1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfmr4/ova4gJyArIG4gKyAnIOS4quWNleivjScsIGljb246ICdub25lJyB9KTtcbiAgICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gICAgfVxuICB9LFxuXG4gIG9uTW9kZVRhcCgpIHtcbiAgICBjb25zdCBtb2RlczogUHJhY3RpY2VNb2RlW10gPSBbJ2NhcmQnLCAnY2hvaWNlJywgJ3NwZWxsJywgJ21peCcsICdxdWljayddO1xuICAgIHRoaXMuX29wZW5TaGVldChcbiAgICAgICdtb2RlJyxcbiAgICAgICflrabkuaDmqKHlvI8nLFxuICAgICAgbW9kZXMubWFwKChtLCBpKSA9PiAoeyBsYWJlbDogdGhpcy5kYXRhLm1vZGVMYWJlbHNbaV0sIGFjdGl2ZTogbSA9PT0gdGhpcy5kYXRhLnByYWN0aWNlTW9kZSB9KSlcbiAgICApO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlv6vpgJ/mqKHlvI8gwrcg5a2m5Lmg6Zi25q61IOKUgOKUgOKUgFxuICAvLyDngrkgw5cg5qCH6K6w5LiN6K6k6K+G77yI5YaN54K55LiA5qyh5Y+W5raI77yM5oGi5aSN6buY6K6k6K6k6K+G77yJ77yb54K56KGM5YW25a6D5Yy65Z+f5Y+R5aOwXG4gIG9uUXVpY2tNYXJrKGU6IGFueSkge1xuICAgIGNvbnN0IHdvcmQgPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC53b3JkIGFzIHN0cmluZztcbiAgICBpZiAoIXdvcmQpIHJldHVybjtcbiAgICBwbGF5QXVkaW8od29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gICAgY29uc3QgcXVpY2tVbmtub3duID0geyAuLi50aGlzLmRhdGEucXVpY2tVbmtub3duIH07XG4gICAgaWYgKHF1aWNrVW5rbm93blt3b3JkXSkge1xuICAgICAgZGVsZXRlIHF1aWNrVW5rbm93blt3b3JkXTtcbiAgICB9IGVsc2Uge1xuICAgICAgcXVpY2tVbmtub3duW3dvcmRdID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHsgcXVpY2tVbmtub3duIH0pO1xuICB9LFxuXG4gIC8vIOaJuemHj+iusOW9leacrOi9ruagh+iusO+8muacquagh+iusOm7mOiupOiupOivhu+8m+i/lOWbnuS4jeiupOivhuaVsFxuICBfcmVjb3JkUXVpY2tSb3VuZCgpOiBudW1iZXIge1xuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICBjb25zdCBxdWV1ZSA9IHRoaXMuZGF0YS5xdWV1ZTtcbiAgICBjb25zdCB1bmtub3duU2V0ID0gdGhpcy5kYXRhLnF1aWNrVW5rbm93bjtcbiAgICBsZXQgdW5rbm93bkNvdW50ID0gMDtcbiAgICBmb3IgKGNvbnN0IHcgb2YgcXVldWUpIHtcbiAgICAgIGNvbnN0IGtub3duID0gIXVua25vd25TZXRbdy53b3JkXTtcbiAgICAgIGlmICgha25vd24pIHtcbiAgICAgICAgdW5rbm93bkNvdW50ICs9IDE7XG4gICAgICAgIGFkZFRvV3JvbmdCb29rKHcud29yZCwgdy5tZWFuaW5nLCBib29rSWQpO1xuICAgICAgfVxuICAgICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgdy53b3JkLCBrbm93bik7XG4gICAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQody53b3JkKSk7XG4gICAgfVxuICAgIHRoaXMuc2V0RGF0YSh7IGtub3duQ291bnQ6IHF1ZXVlLmxlbmd0aCAtIHVua25vd25Db3VudCwgdW5rbm93bkNvdW50IH0pO1xuICAgIHRoaXMuc3luY1RvQ2xvdWQoKTtcbiAgICByZXR1cm4gdW5rbm93bkNvdW50O1xuICB9LFxuXG4gIC8vIOe7p+e7re+8muaJuemHj+iusOW9leWQjuebtOaOpeW8gOS4i+S4gOi9ru+8iOS4jeiupOivhueahOivjeWkjeS5oOaOkueoi+S8muWwveW/q+WGjeWuieaOku+8iVxuICBvbk5leHRSb3VuZCgpIHtcbiAgICBjb25zdCB1bmtub3duQ291bnQgPSB0aGlzLl9yZWNvcmRRdWlja1JvdW5kKCk7XG4gICAgd3guc2hvd1RvYXN0KHtcbiAgICAgIHRpdGxlOiB1bmtub3duQ291bnQgPiAwID8gJ+W3suiusOW9le+8jOS4jeiupOivhueahOivjeS8muWwveW/q+WGjeWuieaOkicgOiAn5YWo6YOo6K6k6K+G77yM5aSq5qOS5LqG77yBJyxcbiAgICAgIGljb246ICdub25lJ1xuICAgIH0pO1xuICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gIH0sXG5cbiAgLy8g5a6M5oiQ77ya5om56YeP6K6w5b2V5ZCO6L+b57uT5p6c6aG177yI55yL5pys6L2u6K6k6K+G546H77yM5Y+v5aSN5Lmg5pys6L2uL+WGjeadpeS4gOi9ru+8iVxuICBvblF1aWNrRmluaXNoKCkge1xuICAgIHRoaXMuX3JlY29yZFF1aWNrUm91bmQoKTtcbiAgICB0aGlzLmZpbmlzaFJvdW5kKCk7XG4gIH0sXG5cbiAgb25QcmFjdGljZU1vZGVDaGFuZ2UoZTogYW55KSB7XG4gICAgY29uc3QgbW9kZSA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0Lm1vZGUgYXMgUHJhY3RpY2VNb2RlO1xuICAgIGlmIChtb2RlID09PSB0aGlzLmRhdGEucHJhY3RpY2VNb2RlKSByZXR1cm47XG5cbiAgICBzZXRQcmFjdGljZU1vZGUobW9kZSk7XG4gICAgdGhpcy5zZXREYXRhKHsgcHJhY3RpY2VNb2RlOiBtb2RlIH0pO1xuICAgIGlmICh0aGlzLmRhdGEucXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgIH1cblxuICAgIGNvbnN0IGxhYmVsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgY2FyZDogJ+WNoeeJh+aooeW8jycsIGNob2ljZTogJ+mAieaLqeaooeW8jycsIHNwZWxsOiAn5ou85YaZ5qih5byPJywgbWl4OiAn5re35ZCI5qih5byPJywgcXVpY2s6ICflv6vpgJ/lrabkuaAnIH07XG4gICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6IGxhYmVsc1ttb2RlXSB8fCAnJywgaWNvbjogJ25vbmUnIH0pO1xuICB9LFxuXG4gIC8vIOWIh+aNouWHuumimOmhuuW6j++8iOmaj+acuiAvIOmhuuW6j++8iVxuICBvblRvZ2dsZU9yZGVyTW9kZSgpIHtcbiAgICBjb25zdCBuZXdNb2RlID0gdGhpcy5kYXRhLm9yZGVyTW9kZSA9PT0gJ3JhbmRvbScgPyAnc2VxdWVudGlhbCcgOiAncmFuZG9tJztcbiAgICBzZXRPcmRlck1vZGUobmV3TW9kZSk7XG4gICAgd3guc2hvd1RvYXN0KHtcbiAgICAgIHRpdGxlOiBuZXdNb2RlID09PSAncmFuZG9tJyA/ICflt7LliIfmjaLpmo/mnLrlh7ror40nIDogJ+W3suWIh+aNoumhuuW6j+WHuuivjScsXG4gICAgICBpY29uOiAnbm9uZSdcbiAgICB9KTtcbiAgICB0aGlzLmluaXRCYXRjaCgpO1xuICB9LFxuXG4gIC8vIOW9k+WJjeivjeaYr+WQpuS4uummluasoeWtpuS5oOeahOaWsOivje+8iOS7heaWsOivjeiuoeWFpeKAnOe0r+iuoeWNleivjeKAne+8iVxuICBfaXNOZXdXb3JkKHdvcmQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMuX25ld1dvcmRTZXQgJiYgdGhpcy5fbmV3V29yZFNldC5oYXMod29yZC50b0xvd2VyQ2FzZSgpKTtcbiAgfSxcblxuICAvLyDorr7nva7mr4/ova7lrabkuaDljZXor43mlbDvvIjpobbpg6jmjInpkq7vvIlcbiAgb25DaGFuZ2VCYXRjaFNpemUoKSB7XG4gICAgY29uc3Qgb3B0aW9ucyA9IFs1LCAxMCwgMTUsIDIwXTtcbiAgICB0aGlzLl9vcGVuU2hlZXQoXG4gICAgICAnYmF0Y2gnLFxuICAgICAgJ+avj+i9ruS4quaVsCcsXG4gICAgICBvcHRpb25zLm1hcChuID0+ICh7IGxhYmVsOiBuICsgJyDkuKov6L2uJywgYWN0aXZlOiBuID09PSB0aGlzLmRhdGEuYmF0Y2hTaXplIH0pKVxuICAgICk7XG4gIH0sXG5cbiAgLy8g5YiH5o2i5a2m5Lmg6IyD5Zu077yI5YWo6YOoL+mrmOmikS/omZror40v5a6e6K+N77yJXG4gIFdPUkRfQ0xBU1NfTEFCRUxTOiB7IGFsbDogJ+WFqOmDqCcsIGhpZ2hGcmVxOiAn6auY6aKR6K+NJywgZnVuYzogJ+iZmuivjScsIGNvbnRlbnQ6ICflrp7or40nIH0gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcblxuICBvblNlbGVjdFdvcmRDbGFzcygpIHtcbiAgICBjb25zdCBtb2RlczogU3R1ZHlNb2RlW10gPSBbJ2FsbCcsICdoaWdoRnJlcScsICdmdW5jJywgJ2NvbnRlbnQnXTtcbiAgICB0aGlzLl9vcGVuU2hlZXQoXG4gICAgICAnc2NvcGUnLFxuICAgICAgJ+ivjeS5puiMg+WbtCcsXG4gICAgICBtb2Rlcy5tYXAobSA9PiAoeyBsYWJlbDogdGhpcy5XT1JEX0NMQVNTX0xBQkVMU1ttXSwgYWN0aXZlOiBtID09PSB0aGlzLmRhdGEuc3R1ZHlNb2RlIH0pKVxuICAgICk7XG4gIH0sXG5cbiAgLy8g5YW85a655pen5YWl5Y+jXG4gIHRvZ2dsZVN0dWR5TW9kZSgpIHtcbiAgICB0aGlzLm9uU2VsZWN0V29yZENsYXNzKCk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWvvOWHuuS7iuaXpeWNleivjeihqCDilIDilIDilIBcbiAgX3RvZGF5Um93czogbnVsbCBhcyBUb2RheVJvd1tdIHwgbnVsbCxcblxuICBvbkV4cG9ydFRvZGF5KCkge1xuICAgIHd4LnNob3dMb2FkaW5nKHsgdGl0bGU6ICfmlbTnkIbljZXor43kuK0uLi4nIH0pO1xuICAgIGNvbGxlY3RUb2RheVJvd3MoKS50aGVuKChyb3dzKSA9PiB7XG4gICAgICB3eC5oaWRlTG9hZGluZygpO1xuICAgICAgdGhpcy5fdG9kYXlSb3dzID0gcm93cztcbiAgICAgIHNob3dFeHBvcnRTaGVldChyb3dzLCAoKSA9PiB0aGlzLl9nZXRFeHBvcnRDYW52YXMoKSk7XG4gICAgfSkuY2F0Y2goKCkgPT4ge1xuICAgICAgd3guaGlkZUxvYWRpbmcoKTtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5pW055CG5aSx6LSl77yM6K+36YeN6K+VJywgaWNvbjogJ25vbmUnIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIF9nZXRFeHBvcnRDYW52YXMoKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgd3guY3JlYXRlU2VsZWN0b3JRdWVyeSgpLmluKHRoaXMpXG4gICAgICAgIC5zZWxlY3QoJyNleHBvcnRDYW52YXMnKVxuICAgICAgICAuZmllbGRzKHsgbm9kZTogdHJ1ZSB9KVxuICAgICAgICAuZXhlYygocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICBpZiAocmVzICYmIHJlc1swXSAmJiByZXNbMF0ubm9kZSkgcmVzb2x2ZShyZXNbMF0ubm9kZSk7XG4gICAgICAgICAgZWxzZSByZWplY3QobmV3IEVycm9yKCdjYW52YXMg5pyq5bCx57uqJykpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5Y2h54mH5qih5byP6K6k6K+GL+S4jeiupOivhiDilIDilIDilIBcbiAgbWFya0tub3duKCkge1xuICAgIGlmICh0aGlzLmRhdGEuY3VycmVudEluZGV4ID49IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGgpIHJldHVybjtcbiAgICBpZiAodGhpcy5fY2hlY2tBbnN3ZXJlZCgpKSByZXR1cm47IC8vIOWIh+aooeW8j+WQjuWQjOS4gOivjeS4jemHjeWkjeiuoeaVsFxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgdHJ1ZSk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGtub3duQ291bnQ6IHRoaXMuZGF0YS5rbm93bkNvdW50ICsgMVxuICAgIH0pO1xuICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgfSxcblxuICBtYXJrVW5rbm93bigpIHtcbiAgICBpZiAodGhpcy5kYXRhLmN1cnJlbnRJbmRleCA+PSB0aGlzLmRhdGEucXVldWUubGVuZ3RoKSByZXR1cm47XG4gICAgaWYgKHRoaXMuZGF0YS5yZXZlYWxBZnRlclVua25vd24pIHJldHVybjsgLy8g5bey5o+t56S677yM562J5b6F55So5oi354K544CM5LiL5LiA5Liq44CNXG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGZhbHNlKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgYWRkVG9Xcm9uZ0Jvb2sod29yZC53b3JkLCB3b3JkLm1lYW5pbmcsIGJvb2tJZCk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSxcbiAgICAgIC8vIOS4jeiupOivhu+8muWFiOe/u+mdouWxleekuumHiuS5ie+8iOW9k+Wcuueci+WIsOato+ehruetlOahiO+8ie+8jDIuNSDnp5LlkI7oh6rliqjov5vlhaXkuIvkuIDkuKror41cbiAgICAgIC8vIO+8iOS5n+S/neeVmeOAjOS4i+S4gOS4quOAjeaMiemSru+8jOeUqOaIt+WPr+aPkOWJjeeCuei1sO+8iVxuICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiB0cnVlLFxuICAgICAgaXNGbGlwcGVkOiB0cnVlLFxuICAgICAgc2hvd01lYW5pbmc6IHRydWVcbiAgICB9KTtcbiAgICAvLyDoh6rliqjmkq3mlL7lj5Hpn7PvvIzliqDmt7HorrDlv4ZcbiAgICBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICAvLyDoh6rliqjot7PkuIvkuIDkuKrvvJrlsZXnpLrph4rkuYnlkI7lgZwgMi41IOenku+8m+acn+mXtOeCueOAjOS4i+S4gOS4quOAjeS8muWPlua2iOWumuaXtuWZqFxuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgICB0aGlzLl9yZXZlYWxUaW1lciA9IHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5fcmV2ZWFsVGltZXIgPSBudWxsO1xuICAgICAgaWYgKHRoaXMuZGF0YS5yZXZlYWxBZnRlclVua25vd24pIHRoaXMub25SZXZlYWxOZXh0KCk7XG4gICAgfSwgNDAwMCk7IC8vIDQg56eS77ya55WZ6Laz55yL6YeK5LmJ5ZKM6K+76Z+z55qE5pe26Ze077yM5pyf6Ze054K544CM5LiL5LiA5Liq44CN5Y+v56uL5Y2z6Lez6L+HXG4gIH0sXG5cbiAgX3JldmVhbFRpbWVyOiBudWxsIGFzIGFueSxcblxuICBfY2xlYXJSZXZlYWxUaW1lcigpIHtcbiAgICBpZiAodGhpcy5fcmV2ZWFsVGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9yZXZlYWxUaW1lcik7XG4gICAgICB0aGlzLl9yZXZlYWxUaW1lciA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlv6vpgJ/mqKHlvI8gwrcg5a2m5Lmg6Zi25q61IOKUgOKUgOKUgFxuICAvLyDngrnljZXor43ooYzvvJrlj5Hlo7DvvIjnuq/mtY/op4jvvIzkuI3orrDmlbDmja7vvIlcbiAgb25MaXN0VGFwKGU6IGFueSkge1xuICAgIGNvbnN0IHdvcmQgPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC53b3JkIGFzIHN0cmluZztcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICB9LFxuXG4gIC8vIOOAjOS4jeiupOivhuOAjeaPreekuuetlOahiOWQju+8jOeCueOAjOS4i+S4gOS4quOAjee7p+e7rVxuICBvblJldmVhbE5leHQoKSB7XG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgIHRoaXMuc2V0RGF0YSh7IHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsIGlzRmxpcHBlZDogZmFsc2UsIHNob3dNZWFuaW5nOiBmYWxzZSB9KTtcbiAgICB0aGlzLm5leHRXb3JkKCk7XG4gIH0sXG5cbiAgbmV4dFdvcmQoKSB7XG4gICAgLy8g6Ziy5b6h77ya6Zif5YiX5byC5bi477yI56m66Zif5YiXL+S4i+agh+i2iueVjO+8ieaXtuebtOaOpemHjeW8gOS4gOi9ru+8jOmBv+WFjeeZveWxj+WNoeatu1xuICAgIGlmICghdGhpcy5kYXRhLnF1ZXVlIHx8IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5leHQgPSB0aGlzLmRhdGEuY3VycmVudEluZGV4ICsgMTtcbiAgICBpZiAobmV4dCA+PSB0aGlzLmRhdGEucXVldWUubGVuZ3RoKSB7XG4gICAgICB0aGlzLmZpbmlzaFJvdW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjdXJyZW50SW5kZXg6IG5leHRcbiAgICB9LCAoKSA9PiB7XG4gICAgICAvLyDkuLrmlrDor43noa7lrprlh7rpopjmlrnlvI/vvIhtaXgg5qih5byP5LiL5q+P5Liq6K+N6ZqP5py65Y2h54mHL+mAieaLqS/mi7zlhpnvvInvvIzlubbph43nva7nrZTpopjnirbmgIFcbiAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICAgIC8vIOmihOWKoOi9veS4i+S4i+S4quivjVxuICAgICAgY29uc3QgYWZ0ZXJOZXh0ID0gdGhpcy5kYXRhLnF1ZXVlW25leHQgKyAxXTtcbiAgICAgIGlmIChhZnRlck5leHQpIHByZWxvYWRBdWRpbyhhZnRlck5leHQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgZmluaXNoUm91bmQoKSB7XG4gICAgLy8g5pys6L2u5bey57uT5p2f77ya5riF5o6J6YeN5bu65a6I5Y2r55qEIGtlee+8jOehruS/neS4i+asoei/m+WFpemhtemdou+8iOS7jummlumhteeCueKAnOiDjOWNleivjeKAnS/liIcgdGFiIOWbnuadpe+8iVxuICAgIC8vIOS4jeS8muWRveS4reKAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneiAjOWNoeWcqOacgOWQjuS4gOS4quivje+8iOatpOaXtiBfYW5zd2VyZWRTZXQg5bey5ruh77yM5oyJ6ZKu5YWo5peg5Y+N5bqU77yJXG4gICAgdGhpcy5fbG9hZGVkS2V5ID0gJyc7XG4gICAgY29uc3QgdG90YWwgPSB0aGlzLmRhdGEudG90YWxDb3VudDtcbiAgICBjb25zdCBrbm93biA9IHRoaXMuZGF0YS5rbm93bkNvdW50O1xuICAgIGNvbnN0IHJhdGUgPSB0b3RhbCA+IDAgPyBNYXRoLnJvdW5kKChrbm93biAvIHRvdGFsKSAqIDEwMCkgOiAwO1xuICAgIGxldCBwcmFpc2UgPSAn57un57ut5Yqg5rK577yBJztcbiAgICBpZiAocmF0ZSA+PSA5MCkgcHJhaXNlID0gJ+WkquajkuS6hu+8jOWHoOS5juWFqOmDqOaOjOaPoe+8gSc7XG4gICAgZWxzZSBpZiAocmF0ZSA+PSA3MCkgcHJhaXNlID0gJ+S4jemUmeWTpu+8jOe7p+e7reS/neaMge+8gSc7XG4gICAgZWxzZSBpZiAocmF0ZSA+PSA1MCkgcHJhaXNlID0gJ+i/mOmcgOWkmuWkjeS5oOWHoOmBjSc7XG5cbiAgICAvLyDorrDkvY/mnKzova7pmJ/liJfvvIzkvpvjgIzlpI3kuaDmnKzova7jgI3ljp/moLfph43liLfvvIjkuI3mjaLor43vvIlcbiAgICB0aGlzLl9sYXN0Um91bmRRdWV1ZSA9IHRoaXMuZGF0YS5xdWV1ZS5zbGljZSgpO1xuXG4gICAgLy8g5ZCM5q2l5a2m5Lmg5pWw5o2u5Yiw5LqR56uvXG4gICAgdGhpcy5zeW5jVG9DbG91ZCgpO1xuXG4gICAgLy8g5pi+56S65YWo5bGP57uT5p6c6aG1XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHNob3dSZXN1bHQ6IHRydWUsXG4gICAgICByZXN1bHRSYXRlOiByYXRlLFxuICAgICAgcmVzdWx0UHJhaXNlOiBwcmFpc2VcbiAgICAgIC8vIHJlbWluZGVyU3Vic2NyaWJlZDogaXNSZW1pbmRlclN1YnNjcmliZWQoKSAvLyDlrabkuaDmj5DphpLlt7LkuIvnur/vvIgyMDI2LTA4LTMx77yJXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5byA5ZCv5a2m5Lmg5o+Q6YaS77yI5bey5LiL57q/IDIwMjYtMDgtMzHvvJrkuIDmrKHmgKforqLpmIXpnIDph43lpI3mjojmnYPvvIzkvZPpqoznuYHnkJDvvIlcbiAgLy8gb25TdWJzY3JpYmVSZW1pbmRlcigpIHtcbiAgLy8gICBpZiAoaXNSZW1pbmRlclN1YnNjcmliZWQoKSkgcmV0dXJuO1xuICAvLyAgIHJlcXVlc3RSZW1pbmRlclN1YnNjcmliZSgpLnRoZW4oKGFjY2VwdGVkKSA9PiB7XG4gIC8vICAgICB0aGlzLnNldERhdGEoeyByZW1pbmRlclN1YnNjcmliZWQ6IGFjY2VwdGVkIH0pO1xuICAvLyAgICAgaWYgKGFjY2VwdGVkKSB7XG4gIC8vICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5bey5byA5ZCv5a2m5Lmg5o+Q6YaSJywgaWNvbjogJ3N1Y2Nlc3MnIH0pO1xuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuICAvLyB9LFxuXG4gIC8vIOe7k+aenOmhte+8muWGjeadpeS4gOi9rlxuICBvblJlc3VsdFJlc3RhcnQoKSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1Jlc3VsdDogZmFsc2UgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrlpI3kuaDmnKzova7vvIjnlKjliJrogIPlroznmoTljp/pmJ/liJfph43liLfkuIDpgY3vvIzkuI3orqHlhaXntK/orqHmlrDor43vvIlcbiAgX2xhc3RSb3VuZFF1ZXVlOiBbXSBhcyBXb3JkSXRlbVtdLFxuXG4gIG9uUmVzdWx0UmV2aWV3Um91bmQoKSB7XG4gICAgY29uc3QgbGFzdCA9IHRoaXMuX2xhc3RSb3VuZFF1ZXVlO1xuICAgIGlmICghbGFzdCB8fCBsYXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfmnKzova7pmJ/liJflt7LkuI3lnKjvvIzor5Xor5Xlho3mnaXkuIDova4nLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJzsgLy8g57uV6L+H4oCc5pWw5o2u5pyq5Y+Y6Lez6L+H6YeN5bu64oCd5a6I5Y2rXG4gICAgdGhpcy5fYW5zd2VyZWRTZXQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICAvLyDlpI3kuaDova7kuI3orqHlhaXntK/orqHmlrDor43vvJrmuIXnqbrmlrDor43pm4blkIjvvIhfaXNOZXdXb3JkIOi/lOWbniBmYWxzZe+8iVxuICAgIHRoaXMuX25ld1dvcmRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCByZXBvcnRlZE1hcDogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgbGFzdCkge1xuICAgICAgaWYgKGlzV29yZFJlcG9ydGVkKHcud29yZCkpIHJlcG9ydGVkTWFwW3cud29yZF0gPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgc2hvd1Jlc3VsdDogZmFsc2UsXG4gICAgICBxdWV1ZTogbGFzdCxcbiAgICAgIF93b3JkQm9va1dvcmRzOiB0aGlzLmRhdGEuX3dvcmRCb29rV29yZHMsXG4gICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICB0b3RhbENvdW50OiBsYXN0Lmxlbmd0aCxcbiAgICAgIHN0YXR1c0xhYmVsOiAn5aSN5LmgJyxcbiAgICAgIHF1aWNrTGVhcm5pbmc6IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUgPT09ICdxdWljaycsXG4gICAgICBxdWlja1Vua25vd246IHt9LFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrov5Tlm55cbiAgb25SZXN1bHRCYWNrKCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXN1bHQ6IGZhbHNlIH0pO1xuICAgIHd4LnN3aXRjaFRhYih7IHVybDogJy9wYWdlcy9pbmRleC9pbmRleCcgfSk7XG4gIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5YiG5Lqr5omT5Y2h5rW35oqlXG4gIG9uU2hhcmVQb3N0ZXIoKSB7XG4gICAgLy8g6K6w5b2V4oCc5LuO5rW35oql6aG16L+U5Zue5pe25LiN6YeN5byA5paw5LiA6L2u4oCd77yM5bm26K6w5L2P6L+U5Zue5ZCO5piv5ZCm6KaB5oGi5aSN57uT5p6c6aG1XG4gICAgdGhpcy5fc2tpcEluaXRPblNob3cgPSB0cnVlO1xuICAgIHRoaXMuX3Jlc3RvcmVSZXN1bHRPblNob3cgPSB0aGlzLmRhdGEuc2hvd1Jlc3VsdDtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiBmYWxzZSB9KTtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogYC9wYWdlcy9wb3N0ZXIvcG9zdGVyP3JhdGU9JHt0aGlzLmRhdGEucmVzdWx0UmF0ZX1gXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5ZCM5q2l5a2m5Lmg57uf6K6h5Yiw5LqR56uv77yI57uPIHN5bmNVc2VyIOS6keWHveaVsO+8muacjeWKoeerr+WQiOW5tuWPlui+g+Wkp+WAvO+8jOmYsuWOhuWPsuiiq+WGsuWwj++8iVxuICBzeW5jVG9DbG91ZCgpIHtcbiAgICBzeW5jU3RhdHNUb0Nsb3VkKGdldFN0YXRzKCkpO1xuICB9LFxuXG4gIC8vIOi9rOWPkee7meWlveWPi1xuICBvblNoYXJlQXBwTWVzc2FnZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6ICfmiJHlnKjnlKjor43moLnorrDlv4bms5Xog4zljZXor43vvIzkuIDotbfmnaXvvIEnLFxuICAgICAgcGF0aDogJy9wYWdlcy9pbmRleC9pbmRleCdcbiAgICB9O1xuICB9LFxuXG4gIC8vIOWIhuS6q+WIsOaci+WPi+WciO+8iOWNlemhteaooeW8j++8iVxuICBvblNoYXJlVGltZWxpbmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiAn5oiR5Zyo55So6K+N5qC56K6w5b+G5rOV6IOM5Y2V6K+N77yM5LiA6LW35p2l77yBJ1xuICAgIH07XG4gIH0sXG59KTtcbiJdfQ==