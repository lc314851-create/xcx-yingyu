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
        const needFlip = !this.data.isFlipped;
        this.setData({
            unknownCount: this.data.unknownCount + 1,
            revealAfterUnknown: true,
            isFlipped: needFlip ? true : this.data.isFlipped,
            showMeaning: needFlip ? true : this.data.showMeaning
        });
        (0, audio_1.playAudio)(word.word, this.data.accent);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3b3Jkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLDZDQXFCMkI7QUFFM0IsNkNBQW1EO0FBQ25ELHlEQUFzRDtBQUN0RCw0Q0FBMkQ7QUFDM0QsNkNBQTREO0FBQzVELHVEQUFnRjtBQUNoRix5REFBc0Y7QUFHdEYsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUM7QUFJekMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQUUzQyxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFHckMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQVEzQyxJQUFJLENBQUM7SUFDSCxJQUFJLEVBQUU7UUFFSixRQUFRLEVBQUUsTUFBTTtRQUNoQixTQUFTLEVBQUUsQ0FBQztRQUVaLEtBQUssRUFBRSxFQUFnQjtRQUN2QixZQUFZLEVBQUUsQ0FBQztRQUVmLFdBQVcsRUFBRSxLQUFLO1FBRWxCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLENBQUM7UUFDZixVQUFVLEVBQUUsQ0FBQztRQUViLFFBQVEsRUFBRSxDQUFDO1FBQ1gsYUFBYSxFQUFFLENBQUM7UUFFaEIsV0FBVyxFQUFFLElBQUk7UUFFakIsT0FBTyxFQUFFLElBQUk7UUFFYixPQUFPLEVBQUUsSUFBSTtRQUViLFNBQVMsRUFBRSxLQUFrQjtRQUU3QixTQUFTLEVBQUUsRUFBRTtRQUViLGFBQWEsRUFBRSxDQUFDO1FBRWhCLFNBQVMsRUFBRSxDQUFDO1FBQ1osWUFBWSxFQUFFLENBQUM7UUFFZixjQUFjLEVBQUUsSUFBSTtRQUNwQixhQUFhLEVBQUUsUUFBUTtRQUl2QixZQUFZLEVBQUUsTUFBc0I7UUFFcEMsVUFBVSxFQUFFLE1BQThCO1FBRTFDLGFBQWEsRUFBRSxFQUFvQjtRQUVuQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRWxCLGFBQWEsRUFBRSxLQUFLO1FBRXBCLFVBQVUsRUFBRSxFQUFFO1FBRWQs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O1lBQ3JCLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDbEIsV0FBVztTQUNaLEVBQUUsR0FBRyxFQUFFO1lBQ04sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBR0QsWUFBWTtRQUNWLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwQyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBRyxFQUFFLG9CQUFvQixFQUFFLENBQUMsQ0FBQztJQUM5QyxDQUFDO0lBR0QsYUFBYTtRQUVYLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1FBQzVCLElBQUksQ0FBQyxvQkFBb0IsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQztRQUNqRCxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDcEMsRUFBRSxDQUFDLFVBQVUsQ0FBQztZQUNaLEdBQUcsRUFBRSw2QkFBNkIsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUU7U0FDekQsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUdELFdBQVc7UUFDVCxJQUFBLHdCQUFnQixFQUFDLElBQUEsZ0JBQVEsR0FBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUdELGlCQUFpQjtRQUNmLE9BQU87WUFDTCxLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLElBQUksRUFBRSxvQkFBb0I7U0FDM0IsQ0FBQztJQUNKLENBQUM7SUFHRCxlQUFlO1FBQ2IsT0FBTztZQUNMLEtBQUssRUFBRSxrQkFBa0I7U0FDMUIsQ0FBQztJQUNKLENBQUM7Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBwYWdlcy93b3Jkcy93b3Jkcy50c1xuaW1wb3J0IHsgV29yZEl0ZW0gfSBmcm9tICcuLi8uLi9kYXRhL3R5cGVzJztcbmltcG9ydCB7XG4gIGdldEN1cnJlbnRCb29rSWQsXG4gIGdldEFsbFByb2dyZXNzLFxuICByZWNvcmRXb3JkUHJvZ3Jlc3MsXG4gIHJlY29yZFN0dWR5LFxuICBnZXRCb29rUHJvZ3Jlc3NTdGF0cyxcbiAgZ2V0U3RhdHMsXG4gIHN5bmNTdGF0c1RvQ2xvdWQsXG4gIGhhc1NlbGVjdGVkQm9vayxcbiAgZ2V0U3R1ZHlNb2RlLFxuICBzZXRTdHVkeU1vZGUsXG4gIGdldEJhdGNoU2l6ZSxcbiAgc2V0QmF0Y2hTaXplLFxuICBnZXRQcmFjdGljZU1vZGUsXG4gIHNldFByYWN0aWNlTW9kZSxcbiAgZ2V0T3JkZXJNb2RlLFxuICBzZXRPcmRlck1vZGUsXG4gIGdldFRvZGF5TGVhcm5lZFdvcmRzLFxuICBnZXRBY2NlbnQsXG4gIHNldEFjY2VudCxcbiAgYWRkVG9Xcm9uZ0Jvb2tcbn0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHR5cGUgeyBQcmFjdGljZU1vZGUsIENvbmNyZXRlUHJhY3RpY2VNb2RlLCBBY2NlbnQsIFN0dWR5TW9kZSB9IGZyb20gJy4uLy4uL3V0aWxzL3N0b3JlJztcbmltcG9ydCB7IHRvQ29uY3JldGVNb2RlIH0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHsgZ2V0Qm9va0J5SWQgfSBmcm9tICcuLi8uLi91dGlscy93b3JkU2VydmljZSc7XG5pbXBvcnQgeyB3b3JkQm9va3MgYXMgbG9jYWxCb29rcyB9IGZyb20gJy4uLy4uL2RhdGEvaW5kZXgnO1xuaW1wb3J0IHsgcGxheUF1ZGlvLCBwcmVsb2FkQXVkaW8gfSBmcm9tICcuLi8uLi91dGlscy9hdWRpbyc7XG5pbXBvcnQgeyByZXBvcnRXb3JkLCBpc1dvcmRSZXBvcnRlZCwgUmVwb3J0VHlwZSB9IGZyb20gJy4uLy4uL3V0aWxzL3dvcmRSZXBvcnQnO1xuaW1wb3J0IHsgY29sbGVjdFRvZGF5Um93cywgc2hvd0V4cG9ydFNoZWV0LCBUb2RheVJvdyB9IGZyb20gJy4uLy4uL3V0aWxzL3RvZGF5RXhwb3J0JztcblxuLy8g5aSN5Lmg5qih5byP5LiA5qyh5oCn5YWl5Y+j5qCH5b+X77yI6aaW6aG14oCc5b6F5aSN5Lmg4oCd54K55Ye75pe25YaZ5YWl77yMd29yZHMg6aG1IG9uU2hvdyDmtojotLnvvIlcbmNvbnN0IFJFVklFV19NT0RFX0tFWSA9ICdiY19yZXZpZXdfbW9kZSc7XG5cbi8vIOiusOW/huS9k+ajgOmrmOWNseivjeS4gOi9ruW8j+WFpeWPo+agh+W/l++8iG1lbW9yeSDpobXjgIznq4vljbPlpI3kuaDov5nkupvor43jgI3lhpnlhaXvvIx3b3JkcyDpobUgb25TaG93IOa2iOi0ue+8iVxuLy8g5YC877yaeyBib29rSWQ6IHN0cmluZywgd29yZHM6IHN0cmluZ1tdIH3vvIzkuI7mnKzor43kuabljLnphY3miY3nlJ/mlYhcbmNvbnN0IE1FTU9SWV9XT1JEU19LRVkgPSAnYmNfbWVtb3J5X3dvcmRzJztcbi8vIOmmlumhteKAnOWtpuaWsOivjeKAneWFpeWPo+agh+W/l++8iOS4gOasoeaAp++8ie+8muW8uuWItuW8gOaWsOS4gOi9ru+8jOS4jei1sOKAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneWuiOWNq1xuY29uc3QgTkVXX1JPVU5EX0tFWSA9ICdiY19uZXdfcm91bmQnO1xuXG4vLyDigJzku4rml6XlpI3nm5jigJ3lhaXlj6PmoIflv5fvvIjkuIDmrKHmgKfvvInvvJrmnKzova7lj6rlpI3nm5jku4rlpKnlrabov4fnmoTor43vvIjmiJHnmoTpobUv6aaW6aG15YaZ5YWl77yJXG5jb25zdCBUT0RBWV9SRVZJRVdfS0VZID0gJ2JjX3RvZGF5X3Jldmlldyc7XG5cbi8vIOWbm+mAieS4gOmAiemhueaOpeWPo1xuaW50ZXJmYWNlIENob2ljZU9wdGlvbiB7XG4gIG1lYW5pbmc6IHN0cmluZztcbiAgaXNDb3JyZWN0OiBib29sZWFuO1xufVxuXG5QYWdlKHtcbiAgZGF0YToge1xuICAgIC8vIOW9k+WJjeivjeS5puS/oeaBr1xuICAgIGJvb2tOYW1lOiAn5Yid5Lit6K+N5rGHJyxcbiAgICBib29rVG90YWw6IDAsXG4gICAgLy8g5pys6L2u5Y2V6K+N6Zif5YiXXG4gICAgcXVldWU6IFtdIGFzIFdvcmRJdGVtW10sXG4gICAgY3VycmVudEluZGV4OiAwLFxuICAgIC8vIOaYr+WQpuaYvuekuumHiuS5ie+8iOWNoeeJh+aooeW8j+eUqO+8iVxuICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAvLyDmnKzova7lrabkuaDov5vluqZcbiAgICBrbm93bkNvdW50OiAwLFxuICAgIHVua25vd25Db3VudDogMCxcbiAgICB0b3RhbENvdW50OiAwLFxuICAgIC8vIOW+heWkjeS5oOaVsFxuICAgIGR1ZUNvdW50OiAwLFxuICAgIG1hc3RlcmVkQ291bnQ6IDAsXG4gICAgLy8g54q25oCB5qCH562+XG4gICAgc3RhdHVzTGFiZWw6ICfmlrDor40nLFxuICAgIC8vIOaYr+WQpui/mOacieabtOWkmlxuICAgIGhhc01vcmU6IHRydWUsXG4gICAgLy8g5Yqg6L2954q25oCBXG4gICAgbG9hZGluZzogdHJ1ZSxcbiAgICAvLyDlrabkuaDojIPlm7TnrZvpgInvvIjlhajpg6gv6auY6aKRL+iZmuivjS/lrp7or43vvIlcbiAgICBzdHVkeU1vZGU6ICdhbGwnIGFzIFN0dWR5TW9kZSxcbiAgICAvLyDmr4/ova7lrabkuaDljZXor43mlbDvvIjpobbpg6jmjInpkq7lj6/osIPvvIlcbiAgICBiYXRjaFNpemU6IDEwLFxuICAgIC8vIOmrmOmikeivjeaVsOmHj1xuICAgIGhpZ2hGcmVxQ291bnQ6IDAsXG4gICAgLy8g6Jma6K+NL+WunuivjeaVsOmHj1xuICAgIGZ1bmNDb3VudDogMCxcbiAgICBjb250ZW50Q291bnQ6IDAsXG4gICAgLy8g5a2m5Lmg6IyD5Zu05qCH562+77yId3htbCDlsZXnpLrvvIlcbiAgICB3b3JkQ2xhc3NMYWJlbDogJ+WFqOmDqCcsXG4gICAgY3VycmVudEJvb2tJZDogJ2p1bmlvcicsXG4gICAgLy8gcmVtaW5kZXJTdWJzY3JpYmVkOiBmYWxzZSwgLy8g5a2m5Lmg5o+Q6YaS5bey5LiL57q/77yIMjAyNi0wOC0zMe+8iVxuICAgIC8vIOKUgOKUgOKUgCDpmLbmrrXkuIDmlrDlop4g4pSA4pSA4pSAXG4gICAgLy8g57uD5Lmg5qih5byP77ya5Y2h54mH57+76Z2iIC8g5Zub6YCJ5LiAIC8g5ou85YaZIC8g5re35ZCI77yIbWl477yJXG4gICAgcHJhY3RpY2VNb2RlOiAnY2FyZCcgYXMgUHJhY3RpY2VNb2RlLFxuICAgIC8vIOW9k+WJjeivjeWunumZhea4suafk+eahOWHuumimOaWueW8j++8iG1peCDmqKHlvI/kuIvmr4/kuKror43pmo/mnLrvvIzlhbbkvZnkuI4gcHJhY3RpY2VNb2RlIOS4gOiHtO+8iVxuICAgIGFjdGl2ZU1vZGU6ICdjYXJkJyBhcyBDb25jcmV0ZVByYWN0aWNlTW9kZSxcbiAgICAvLyDlm5vpgInkuIDpgInpoblcbiAgICBjaG9pY2VPcHRpb25zOiBbXSBhcyBDaG9pY2VPcHRpb25bXSxcbiAgICAvLyDlm5vpgInkuIDmmK/lkKblt7LpgIlcbiAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgLy8g5Zub6YCJ5LiA5piv5ZCm562U5a+5XG4gICAgY2hvaWNlQ29ycmVjdDogZmFsc2UsXG4gICAgLy8g5ou85YaZ5qih5byP6L6T5YWl5YC8XG4gICAgc3BlbGxJbnB1dDogJycsXG4gICAgLy8g5ou85YaZ5Y+N6aaI54q25oCB77yabm9uZSAvIGNvcnJlY3QgLyB3cm9uZ1xuICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAvLyDlj5Hpn7Plj6Ppn7PlgY/lpb1cbiAgICBhY2NlbnQ6ICd1cycgYXMgQWNjZW50LFxuICAgIC8vIOe7k+aenOmhtVxuICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgIHJlc3VsdFJhdGU6IDAsXG4gICAgcmVzdWx0UHJhaXNlOiAnJyxcbiAgICAvLyDnv7vpnaLliqjnlLvnirbmgIFcbiAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgIC8vIOWNoeeJh+aooeW8j+OAjOS4jeiupOivhuOAjeaPreekuuetlOahiOeKtuaAge+8iHRydWUg5pe25bGV56S644CM5LiL5LiA5Liq44CN5oyJ6ZKu5bm26ZSB5a6a57+76Z2i77yJXG4gICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAvLyDkuIrkuIDpopjlr7nplJnvvIjnlKjkuo7nu5PmnpzpobXliKTmlq3mmK/lkKborrDlvZXvvIlcbiAgICBfd29yZEJvb2tXb3JkczogW10gYXMgV29yZEl0ZW1bXSxcbiAgICAvLyDlv6vpgJ/mqKHlvI/vvJrmoIforrDkuLrkuI3orqTor4bnmoTor43vvIh3b3JkIOKGkiB0cnVl77yJ77yM5pyq5qCH6K6w6buY6K6k6K6k6K+GXG4gICAgcXVpY2tVbmtub3duOiB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPixcbiAgICAvLyDlv6vpgJ/mqKHlvI/pmLbmrrXlvIDlhbPvvJp0cnVlPeW/q+mAn+WtpuS5oO+8iOWIl+ihqOa1j+iniO+8ie+8jGZhbHNlPeajgOa1i+mYtuaute+8iOWbm+mAieS4gOaooeW8j++8iVxuICAgIHF1aWNrTGVhcm5pbmc6IGZhbHNlLFxuICAgIC8vIOWHuumimOmhuuW6j++8mumaj+acuiAvIOmhuuW6j1xuICAgIG9yZGVyTW9kZTogJ3JhbmRvbScgYXMgJ3JhbmRvbScgfCAnc2VxdWVudGlhbCcsXG4gICAgLy8g4pSA4pSA4pSAIOWHuumimOaooeW8j+S4i+aLieahhiDilIDilIDilIBcbiAgICBtb2RlTGFiZWxzOiBbJ+WNoeeJhycsICfpgInmi6knLCAn5ou85YaZJywgJ+a3t+WQiCcsICflv6vpgJ8nXSBhcyBzdHJpbmdbXSxcbiAgICBtb2RlSW5kZXg6IDAsXG4gICAgLy8g4pSA4pSA4pSAIOiHquWumuS5iemAieaLqeW8ueahhiDilIDilIDilIBcbiAgICBzaG93U2hlZXQ6IGZhbHNlLFxuICAgIHNoZWV0VGl0bGU6ICcnLFxuICAgIHNoZWV0T3B0aW9uczogW10gYXMgQXJyYXk8eyBsYWJlbDogc3RyaW5nOyBhY3RpdmU6IGJvb2xlYW4gfT4sXG4gICAgc2hlZXRUeXBlOiAnJyBhcyBzdHJpbmcsXG4gICAgLy8g4pSA4pSA4pSAIOe6oOmUmeS4iuaKpSDilIDilIDilIBcbiAgICBzaG93UmVwb3J0OiBmYWxzZSxcbiAgICByZXBvcnRUeXBlOiAnJyBhcyBSZXBvcnRUeXBlIHwgJycsXG4gICAgcmVwb3J0RGVzYzogJycsXG4gICAgcmVwb3J0ZWRNYXA6IHt9IGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+IC8vIOW3suS4iuaKpeivje+8iHdvcmQg4oaSIHRydWXvvIlcbiAgfSxcblxuICBvbkxvYWQoKSB7fSxcblxuICAvLyDmnKzova7lt7LkvZznrZTnmoTkuIvmoIfpm4blkIjvvIjkv67lpI3liIfmqKHlvI/lkI7lkIzkuIDor43ph43lpI3orqHmlbDnmoQgYnVn77yJXG4gIF9hbnN3ZXJlZFNldDogbmV3IFNldDxudW1iZXI+KCkgYXMgU2V0PG51bWJlcj4sXG5cbiAgb25TaG93KCkge1xuICAgIC8vIOS7juWIhuS6q+a1t+aKpemhtei/lOWbnu+8muS/neeVmeW9k+WJjeS4gOi9rue7k+aenO+8jOS4jemHjeaWsOWKoOi9veaWsOeahOS4gOi9rlxuICAgIGlmICh0aGlzLl9za2lwSW5pdE9uU2hvdykge1xuICAgICAgdGhpcy5fc2tpcEluaXRPblNob3cgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLl9yZXN0b3JlUmVzdWx0T25TaG93KSB7XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXN1bHQ6IHRydWUgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9yZXN0b3JlUmVzdWx0T25TaG93ID0gZmFsc2U7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIOa2iOi0uemmlumhteKAnOW+heWkjeS5oOKAneWFpeWPo+agh+W/l++8muacrOi9ruS7heWkjeS5oOWIsOacn+W+heWkjeS5oOivje+8iOS4gOasoeaAp++8iVxuICAgIGlmICh3eC5nZXRTdG9yYWdlU3luYyhSRVZJRVdfTU9ERV9LRVkpID09PSAxKSB7XG4gICAgICB3eC5yZW1vdmVTdG9yYWdlU3luYyhSRVZJRVdfTU9ERV9LRVkpO1xuICAgICAgdGhpcy5fcmV2aWV3TW9kZSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3Jldmlld01vZGUgPSBmYWxzZTtcbiAgICB9XG4gICAgLy8g5raI6LS56K6w5b+G5L2T5qOA5YWl5Y+j5qCH5b+X77ya5pys6L2u5Y+q5aSN5Lmg5L2T5qOA5riF5Y2V6YeM55qE6auY5Y2x6K+N77yI5LiA5qyh5oCn77yM6Leo6K+N5Lmm5Lii5byD77yJXG4gICAgY29uc3QgbWVtRmxhZyA9IHd4LmdldFN0b3JhZ2VTeW5jKE1FTU9SWV9XT1JEU19LRVkpIGFzIHsgYm9va0lkOiBzdHJpbmc7IHdvcmRzOiBzdHJpbmdbXSB9IHwgJyc7XG4gICAgd3gucmVtb3ZlU3RvcmFnZVN5bmMoTUVNT1JZX1dPUkRTX0tFWSk7XG4gICAgaWYgKFxuICAgICAgbWVtRmxhZyAmJiB0eXBlb2YgbWVtRmxhZyA9PT0gJ29iamVjdCcgJiZcbiAgICAgIG1lbUZsYWcuYm9va0lkID09PSBnZXRDdXJyZW50Qm9va0lkKCkgJiZcbiAgICAgIEFycmF5LmlzQXJyYXkobWVtRmxhZy53b3JkcykgJiYgbWVtRmxhZy53b3Jkcy5sZW5ndGggPiAwXG4gICAgKSB7XG4gICAgICB0aGlzLl9tZW1vcnlXb3JkcyA9IG1lbUZsYWcud29yZHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX21lbW9yeVdvcmRzID0gbnVsbDtcbiAgICB9XG4gICAgLy8g6aaW6aG15Li75Yqo54K54oCc5a2m5paw6K+N4oCd77ya5by65Yi25byA5paw5LiA6L2u77yI5riF5o6J6YeN5bu65a6I5Y2r55qEIGtlee+8iVxuICAgIGlmICh3eC5nZXRTdG9yYWdlU3luYyhORVdfUk9VTkRfS0VZKSA9PT0gMSkge1xuICAgICAgd3gucmVtb3ZlU3RvcmFnZVN5bmMoTkVXX1JPVU5EX0tFWSk7XG4gICAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJztcbiAgICB9XG5cbiAgICAvLyDmtojotLnigJzku4rml6XlpI3nm5jigJ3lhaXlj6PmoIflv5fvvJrmnKzova7lj6rlpI3nm5jku4rlpKnlrabov4fnmoTor43vvIjkuIDmrKHmgKfvvIlcbiAgICBpZiAod3guZ2V0U3RvcmFnZVN5bmMoVE9EQVlfUkVWSUVXX0tFWSkgPT09IDEpIHtcbiAgICAgIHd4LnJlbW92ZVN0b3JhZ2VTeW5jKFRPREFZX1JFVklFV19LRVkpO1xuICAgICAgdGhpcy5fdG9kYXlSZXZpZXdNb2RlID0gdHJ1ZTtcbiAgICAgIHRoaXMuX2xvYWRlZEtleSA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl90b2RheVJldmlld01vZGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyDpppbmrKHkvb/nlKjvvJrot7Povazor43kuabpgInmi6npobVcbiAgICBpZiAoIWhhc1NlbGVjdGVkQm9vaygpKSB7XG4gICAgICB3eC5uYXZpZ2F0ZVRvKHsgdXJsOiAnL3BhZ2VzL2Jvb2tsaXN0L2Jvb2tsaXN0JyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGN1cnJlbnRCb29rSWQ6IGdldEN1cnJlbnRCb29rSWQoKSxcbiAgICAgIHByYWN0aWNlTW9kZTogZ2V0UHJhY3RpY2VNb2RlKCksXG4gICAgICBtb2RlSW5kZXg6IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4JywgJ3F1aWNrJ10uaW5kZXhPZihnZXRQcmFjdGljZU1vZGUoKSksXG4gICAgICBhY2NlbnQ6IGdldEFjY2VudCgpLFxuICAgICAgb3JkZXJNb2RlOiBnZXRPcmRlck1vZGUoKVxuICAgICAgLy8gcmVtaW5kZXJTdWJzY3JpYmVkOiBpc1JlbWluZGVyU3Vic2NyaWJlZCgpIC8vIOWtpuS5oOaPkOmGkuW3suS4i+e6v++8iDIwMjYtMDgtMzHvvIlcbiAgICB9KTtcbiAgICB0aGlzLmluaXRCYXRjaCgpO1xuICB9LFxuXG4gIG9uVW5sb2FkKCkge1xuICAgIC8vIOmhtemdouWNuOi9veaXtua4heeQhumfs+mikeS4iuS4i+aWh++8iOWmguaenOacie+8iVxuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgfSxcblxuICBhc3luYyBpbml0QmF0Y2goKSB7XG4gICAgLy8g5LuK5pel5aSN55uY6L2u77ya6Zif5YiXID0g5LuK5aSp5a2m6L+H55qE6K+N77yI6Leo6K+N5Lmm77yJ77yM5LiN6LWw5bi46KeE5o6S56iLXG4gICAgaWYgKHRoaXMuX3RvZGF5UmV2aWV3TW9kZSkge1xuICAgICAgdGhpcy5fdG9kYXlSZXZpZXdNb2RlID0gZmFsc2U7XG4gICAgICBjb25zdCBvayA9IGF3YWl0IHRoaXMuX2luaXRUb2RheUJhdGNoKCk7XG4gICAgICBpZiAoIW9rKSBhd2FpdCB0aGlzLl9pbml0Tm9ybWFsQmF0Y2goKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2luaXROb3JtYWxCYXRjaCgpO1xuICB9LFxuXG4gIC8vIOS7iuaXpeWkjeebmOi9ru+8muaKiuS7iuWkqeWtpui/h+eahOivjemHjeWIt+S4gOmBje+8iOS4jeiupOivhueahOaOkuWJjemdou+8iVxuICBhc3luYyBfaW5pdFRvZGF5QmF0Y2goKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgdG9kYXlzID0gZ2V0VG9kYXlMZWFybmVkV29yZHMoKTtcbiAgICBpZiAodG9kYXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfku4rlpKnov5jmsqHmnInlrabkuaDorrDlvZXvvIzlhYjlrablh6DkuKror43lkKcnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIOaMiSBib29rSWQg5YiG57uE5ouJ6K+N5Lmm77yM5pig5bCE5Zue5a6M5pW06K+N5p2h77yI5ou/6YeK5LmJL+mfs+aghy/or43moLnvvIlcbiAgICBjb25zdCBieUJvb2sgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG4gICAgZm9yIChjb25zdCB0IG9mIHRvZGF5cykge1xuICAgICAgY29uc3QgYXJyID0gYnlCb29rLmdldCh0LmJvb2tJZCkgfHwgW107XG4gICAgICBhcnIucHVzaCh0LndvcmQpO1xuICAgICAgYnlCb29rLnNldCh0LmJvb2tJZCwgYXJyKTtcbiAgICB9XG4gICAgY29uc3QgcXVldWU6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCBhbGxXb3JkczogV29yZEl0ZW1bXSA9IFtdO1xuICAgIGNvbnN0IHVua25vd25TZXQgPSBuZXcgU2V0KFxuICAgICAgdG9kYXlzLmZpbHRlcih0ID0+ICF0Lmtub3duKS5tYXAodCA9PiB0LndvcmQudG9Mb3dlckNhc2UoKSlcbiAgICApO1xuICAgIGZvciAoY29uc3QgW2JpZCwgd29yZHNdIG9mIGJ5Qm9vaykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYm9vayA9IGF3YWl0IGdldEJvb2tCeUlkKGJpZCk7XG4gICAgICAgIGlmICghYm9vaykgY29udGludWU7XG4gICAgICAgIGFsbFdvcmRzLnB1c2goLi4uYm9vay53b3Jkcyk7XG4gICAgICAgIGNvbnN0IHdzZXQgPSBuZXcgU2V0KHdvcmRzLm1hcCh3ID0+IHcudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgICBmb3IgKGNvbnN0IHcgb2YgYm9vay53b3Jkcykge1xuICAgICAgICAgIGlmICh3c2V0Lmhhcyh3LndvcmQudG9Mb3dlckNhc2UoKSkpIHF1ZXVlLnB1c2godyk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW+S7iuaXpeWkjeebmF0g6K+N5Lmm5Yqg6L295aSx6LSlJywgYmlkLCBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIOS4jeiupOivhueahOaOkuWJjemdou+8jOetlOa8j+eahOS8mOWFiOihpVxuICAgIHF1ZXVlLnNvcnQoKGEsIGIpID0+XG4gICAgICAodW5rbm93blNldC5oYXMoYi53b3JkLnRvTG93ZXJDYXNlKCkpID8gMSA6IDApIC0gKHVua25vd25TZXQuaGFzKGEud29yZC50b0xvd2VyQ2FzZSgpKSA/IDEgOiAwKVxuICAgICk7XG5cbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG4gICAgdGhpcy5fYW5zd2VyZWRTZXQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICB0aGlzLl9uZXdXb3JkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7IC8vIOWkjeebmOS4jeiuoeWFpee0r+iuoeaWsOivjVxuICAgIGNvbnN0IHJlcG9ydGVkTWFwOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHt9O1xuICAgIGZvciAoY29uc3QgdyBvZiBxdWV1ZSkge1xuICAgICAgaWYgKGlzV29yZFJlcG9ydGVkKHcud29yZCkpIHJlcG9ydGVkTWFwW3cud29yZF0gPSB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmVzc1N0YXRzID0gZ2V0Qm9va1Byb2dyZXNzU3RhdHMoZ2V0Q3VycmVudEJvb2tJZCgpKTtcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgYm9va05hbWU6ICfku4rml6XlpI3nm5gnLFxuICAgICAgcXVldWUsXG4gICAgICBfd29yZEJvb2tXb3JkczogYWxsV29yZHMsXG4gICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICBxdWlja0xlYXJuaW5nOiB0aGlzLmRhdGEucHJhY3RpY2VNb2RlID09PSAncXVpY2snLFxuICAgICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICBrbm93bkNvdW50OiAwLFxuICAgICAgdW5rbm93bkNvdW50OiAwLFxuICAgICAgdG90YWxDb3VudDogcXVldWUubGVuZ3RoLFxuICAgICAgZHVlQ291bnQ6IHByb2dyZXNzU3RhdHMuZHVlQ291bnQsXG4gICAgICBtYXN0ZXJlZENvdW50OiBwcm9ncmVzc1N0YXRzLm1hc3RlcmVkQ291bnQsXG4gICAgICBzdGF0dXNMYWJlbDogJ+WkjeebmCcsXG4gICAgICBoYXNNb3JlOiBmYWxzZSxcbiAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgc2hvd1Jlc3VsdDogZmFsc2UsXG4gICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIHF1aWNrVW5rbm93bjoge30sXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBhc3luYyBfaW5pdE5vcm1hbEJhdGNoKCkge1xuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICBjb25zdCBzdHVkeU1vZGUgPSBnZXRTdHVkeU1vZGUoKTtcbiAgICBjb25zdCBwcmFjdGljZU1vZGUgPSBnZXRQcmFjdGljZU1vZGUoKTtcbiAgICBjb25zdCBhY2NlbnQgPSBnZXRBY2NlbnQoKTtcbiAgICBjb25zdCBiYXRjaFNpemUgPSBnZXRCYXRjaFNpemUoKTtcblxuICAgIC8vIOmhtemdouW3suacieaVsOaNruS4lOivjeS5pi/orr7nva7pg73msqHlj5jml7bvvIzot7Pov4fph43lu7rvvIzpgb/lhY0gb25TaG93IOmHjeWkjei/m+WFpeaXtuaVtOmhtemXquS4gOasoVwi6YeN5paw5Yqg6L29XCJcbiAgICBjb25zdCBvcmRlck1vZGUgPSBnZXRPcmRlck1vZGUoKTtcbiAgICBjb25zdCB3b3JkQ2xhc3NMYWJlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IGFsbDogJ+WFqOmDqCcsIGhpZ2hGcmVxOiAn6auY6aKR6K+NJywgZnVuYzogJ+iZmuivjScsIGNvbnRlbnQ6ICflrp7or40nIH07XG4gICAgY29uc3Qgc2V0dGluZ3NLZXkgPSBbYm9va0lkLCBzdHVkeU1vZGUsIHByYWN0aWNlTW9kZSwgYWNjZW50LCBiYXRjaFNpemUsIG9yZGVyTW9kZV0uam9pbignfCcpO1xuICAgIGlmIChcbiAgICAgIHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPiAwICYmICF0aGlzLmRhdGEuc2hvd1Jlc3VsdCAmJlxuICAgICAgIXRoaXMuX3Jldmlld01vZGUgJiYgIXRoaXMuX21lbW9yeVdvcmRzICYmXG4gICAgICB0aGlzLl9sb2FkZWRLZXkgPT09IHNldHRpbmdzS2V5XG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2xvYWRlZEtleSA9IHNldHRpbmdzS2V5O1xuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcblxuICAgIC8vIOmhtemdouW3suacieWGheWuue+8iOaNouS5pi/lvIDmlrDova7vvInvvJrkuI3ov5sgbG9hZGluZyDmgIHvvIzkv53mjIHml6fljaHniYflj6/op4HvvIxcbiAgICAvLyDpmJ/liJflsLHnu6rlkI7kuIDmrKHmgKfmm7/mjaLvvIzlrp7njrBcIuW5s+eos+aNoui9rlwi5peg6Zeq5Yqo77yb5LuF6aaW5qyh6L+b5YWl5omN5pi+56S65Yqg6L295Yqo55S7XG4gICAgaWYgKHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGxvYWRpbmc6IHRydWUsIHN0dWR5TW9kZSwgcHJhY3RpY2VNb2RlLCBhY2NlbnQsIGJhdGNoU2l6ZSwgb3JkZXJNb2RlLCB3b3JkQ2xhc3NMYWJlbDogd29yZENsYXNzTGFiZWxzW3N0dWR5TW9kZV0gfHwgJ+WFqOmDqCcgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHN0dWR5TW9kZSwgcHJhY3RpY2VNb2RlLCBhY2NlbnQsIGJhdGNoU2l6ZSwgb3JkZXJNb2RlLCB3b3JkQ2xhc3NMYWJlbDogd29yZENsYXNzTGFiZWxzW3N0dWR5TW9kZV0gfHwgJ+WFqOmDqCcgfSk7XG4gICAgfVxuXG4gICAgbGV0IGJvb2s7XG4gICAgdHJ5IHtcbiAgICAgIGJvb2sgPSBhd2FpdCBnZXRCb29rQnlJZChib29rSWQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ+iOt+WPluivjeS5puWksei0pScsIGUpO1xuICAgIH1cblxuICAgIGlmICghYm9vayB8fCAhYm9vay53b3JkcyB8fCBib29rLndvcmRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8g5LqR56uv5ouJ5Y+W5aSx6LSl77yM5bCd6K+V5pys5Zyw56eN5a2Q6K+N5bqT5YWc5bqVXG4gICAgICBjb25zdCBsb2NhbEJvb2sgPSBsb2NhbEJvb2tzLmZpbmQoYiA9PiBiLmlkID09PSBib29rSWQpO1xuICAgICAgaWYgKGxvY2FsQm9vayAmJiBsb2NhbEJvb2sud29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBib29rID0gbG9jYWxCb29rO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgbG9hZGluZzogZmFsc2UsIHF1ZXVlOiBbXSB9KTtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfor43lupPliqDovb3kuK3vvIzpqazkuIrlsLHlpb0nLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDlpI3kuaAv6K6w5b+G5L2T5qOA5qih5byP57uV6L+H6K+N5oCn562b6YCJ77ya5b6F5aSN5Lmg55qE6K+N5LiN6K+l6KKr4oCc6IyD5Zu0OuiZmuivjeKAneetiei/h+a7pOaOie+8jFxuICAgIC8vIOWQpuWImeiuoeWIkumHjCA0MyDkuKrlvoXlpI3kuaDor40g4oipIOiZmuivjSA9IDAg5pe25Lya5Ye6546w4oCc6K+N5Lmm5bey5YWo6YOo5o6M5o+h4oCd55qE5YGH6LGhXG4gICAgY29uc3QgYnlwYXNzRmlsdGVyID0gdGhpcy5fcmV2aWV3TW9kZSB8fCAhIXRoaXMuX21lbW9yeVdvcmRzO1xuXG4gICAgLy8g5qC55o2u5a2m5Lmg6IyD5Zu0562b6YCJ77yI5YWo6YOoL+mrmOmikS/omZror40v5a6e6K+N77yJXG4gICAgY29uc3QgaGlnaEZyZXFDb3VudCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5pc0hpZ2hGcmVxKS5sZW5ndGg7XG4gICAgY29uc3QgZnVuY0NvdW50ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyA9PT0gJ2Z1bmMnKS5sZW5ndGg7XG4gICAgY29uc3QgY29udGVudENvdW50ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyAhPT0gJ2Z1bmMnKS5sZW5ndGg7XG4gICAgbGV0IHdvcmRMaXN0OiBXb3JkSXRlbVtdO1xuICAgIGxldCBlbXB0eVRpcCA9ICcnO1xuICAgIGlmIChieXBhc3NGaWx0ZXIpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3JkcztcbiAgICB9IGVsc2UgaWYgKHN0dWR5TW9kZSA9PT0gJ2hpZ2hGcmVxJykge1xuICAgICAgd29yZExpc3QgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcuaXNIaWdoRnJlcSk7XG4gICAgICBlbXB0eVRpcCA9ICfov5nmnKzor43kuabmsqHmnInmoIfms6jpq5jpopHor40nO1xuICAgIH0gZWxzZSBpZiAoc3R1ZHlNb2RlID09PSAnZnVuYycpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyA9PT0gJ2Z1bmMnKTtcbiAgICAgIC8vIOivjeadoeWujOWFqOayoeaciSBwb3NUYWcg5a2X5q61ID0g6K+N5Lmm5pWw5o2u5piv5pen54mI77yI5LqR56uv5pyq5pu05pawL+i1sOS6huenjeWtkOWFnOW6lS/nvJPlrZjmnKrlpLHmlYjvvIlcbiAgICAgIGlmICghYm9vay53b3Jkcy5zb21lKHcgPT4gJ3Bvc1RhZycgaW4gdykpIHtcbiAgICAgICAgZW1wdHlUaXAgPSAn6K+N5Lmm5pWw5o2u5pyq5YyF5ZCr6K+N5oCn5qCH5rOo77yM6K+35pu05paw6K+N5bqT5ZCO6YeN6K+VJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+i/meacrOivjeS5puaaguaXoOiZmuivjeagh+azqCc7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzdHVkeU1vZGUgPT09ICdjb250ZW50Jykge1xuICAgICAgd29yZExpc3QgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcucG9zVGFnICE9PSAnZnVuYycpO1xuICAgICAgaWYgKCFib29rLndvcmRzLnNvbWUodyA9PiAncG9zVGFnJyBpbiB3KSkge1xuICAgICAgICBlbXB0eVRpcCA9ICfor43kuabmlbDmja7mnKrljIXlkKvor43mgKfmoIfms6jvvIzor7fmm7TmlrDor43lupPlkI7ph43or5UnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW1wdHlUaXAgPSAn6L+Z5pys6K+N5Lmm5pqC5peg5a6e6K+N5qCH5rOoJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgd29yZExpc3QgPSBib29rLndvcmRzO1xuICAgIH1cblxuICAgIGlmICh3b3JkTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGxvYWRpbmc6IGZhbHNlLCBxdWV1ZTogW10sIGhpZ2hGcmVxQ291bnQsIGZ1bmNDb3VudCwgY29udGVudENvdW50IH0pO1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6IGVtcHR5VGlwLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWxsUHJvZ3Jlc3MgPSBnZXRBbGxQcm9ncmVzcyhib29rSWQpO1xuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG5cbiAgICAvLyDmnoTlu7rlrabkuaDpmJ/liJfvvJpcbiAgICAvLyAxLiDkvJjlhYjlj5blvoXlpI3kuaDnmoTor43vvIhuZXh0UmV2aWV3IDw9IG5vdyDkuJTkuI3mmK8gbWFzdGVyZWTvvIlcbiAgICAvLyAyLiDlj5bmnKrlrabov4fnmoTmlrDor41cbiAgICBjb25zdCBkdWVXb3JkczogV29yZEl0ZW1bXSA9IFtdO1xuICAgIGNvbnN0IG5ld1dvcmRzOiBXb3JkSXRlbVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHcgb2Ygd29yZExpc3QpIHtcbiAgICAgIGNvbnN0IHAgPSBhbGxQcm9ncmVzc1t3LndvcmRdO1xuICAgICAgaWYgKCFwKSB7XG4gICAgICAgIG5ld1dvcmRzLnB1c2godyk7XG4gICAgICB9IGVsc2UgaWYgKHAuc3RhdHVzICE9PSAnbWFzdGVyZWQnICYmIHAubmV4dFJldmlldyA+IDAgJiYgcC5uZXh0UmV2aWV3IDw9IG5vdykge1xuICAgICAgICBkdWVXb3Jkcy5wdXNoKHcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOiAg+mikeaOkuW6j++8muaWsOivjeaMiSBFQ0RJQ1Qg6K+N6aKR6ZmN5bqP77yI5bi46KeB6K+N5YWI5a2m77yJ77yM5LyY5YWI5a2m5Lya6ICD6K+V6YeM5Ye6546w5pyA5aSa55qE6K+NXG4gICAgbmV3V29yZHMuc29ydCgoYSwgYikgPT4gKGIuZnJlcXVlbmN5IHx8IDApIC0gKGEuZnJlcXVlbmN5IHx8IDApKTtcblxuICAgIC8vIOWQiOW5tumYn+WIl++8mum7mOiupOS8mOWFiOWkjeS5oO+8jOWGjeWtpuaWsOivje+8m+WkjeS5oOaooeW8j+S4i+S7heWkjeS5oOWIsOacn+W+heWkjeS5oOivjVxuICAgIC8vIOmaj+acuuaooeW8j+S4i++8muaWsOivjeS7juivjeS5puWFqOmDqOacquWtpuivjeS4remaj+acuuaKveWPlu+8iOiAjOS4jeaYr+aMieivjemikeWPluWJjSBOIOS4qu+8jFxuICAgIC8vIOmBv+WFjei/nue7reWHoOi9rumBh+WIsOeahOmDveaYr+WQjOS4gOaJueivje+8ie+8jOWkjeS5oOivjeS7jeS8mOWFiOWNoOS9jVxuICAgIGxldCBxdWV1ZTtcbiAgICBpZiAodGhpcy5fcmV2aWV3TW9kZSkge1xuICAgICAgaWYgKGR1ZVdvcmRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyDmsqHmnInliLDmnJ/lvoXlpI3kuaDor43vvJrliIflm57luLjop4TlrabkuaDvvIzpgb/lhY3nqbrova5cbiAgICAgICAgdGhpcy5fcmV2aWV3TW9kZSA9IGZhbHNlO1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suWFqOmDqOWkjeS5oOWujO+8jOWIh+WbnuW4uOinhOWtpuS5oCcsIGljb246ICdub25lJyB9KTtcbiAgICAgICAgcXVldWUgPSBbLi4uZHVlV29yZHMsIC4uLm5ld1dvcmRzXS5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWUgPSBkdWVXb3Jkcy5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3JkZXJNb2RlID09PSAncmFuZG9tJykge1xuICAgICAgLy8g5aSN5Lmg6K+N5ZCM5qC35LuO5YWo6YOo5Yiw5pyf6K+N5Lit6ZqP5py65oq95Y+W77yI6ICM5LiN5piv5oyJ6K+N6KGo6aG65bqP5Y+W5YmNIE4g5Liq77yJXG4gICAgICBjb25zdCBkdWU6IFdvcmRJdGVtW10gPSBbXTtcbiAgICAgIGlmIChkdWVXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHBvb2wgPSBbLi4uZHVlV29yZHNdO1xuICAgICAgICBjb25zdCB0YWtlID0gTWF0aC5taW4oYmF0Y2hTaXplLCBwb29sLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGFrZTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgaiA9IGkgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAocG9vbC5sZW5ndGggLSBpKSk7XG4gICAgICAgICAgY29uc3QgdCA9IHBvb2xbaV07IHBvb2xbaV0gPSBwb29sW2pdOyBwb29sW2pdID0gdDtcbiAgICAgICAgICBkdWUucHVzaChwb29sW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgcmVtYWluaW5nID0gYmF0Y2hTaXplIC0gZHVlLmxlbmd0aDtcbiAgICAgIGNvbnN0IHNhbXBsZWROZXc6IFdvcmRJdGVtW10gPSBbXTtcbiAgICAgIGlmIChyZW1haW5pbmcgPiAwICYmIG5ld1dvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgcG9vbCA9IFsuLi5uZXdXb3Jkc107XG4gICAgICAgIGNvbnN0IHRha2UgPSBNYXRoLm1pbihyZW1haW5pbmcsIHBvb2wubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YWtlOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBqID0gaSArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChwb29sLmxlbmd0aCAtIGkpKTtcbiAgICAgICAgICBjb25zdCB0ID0gcG9vbFtpXTsgcG9vbFtpXSA9IHBvb2xbal07IHBvb2xbal0gPSB0O1xuICAgICAgICAgIHNhbXBsZWROZXcucHVzaChwb29sW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcXVldWUgPSBbLi4uZHVlLCAuLi5zYW1wbGVkTmV3XTtcbiAgICB9IGVsc2Uge1xuICAgICAgcXVldWUgPSBbLi4uZHVlV29yZHMsIC4uLm5ld1dvcmRzXS5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgIH1cblxuICAgIC8vIOWmguaenOmYn+WIl+S4uuepuu+8iOayoeacieW+heWkjeS5oOS5n+ayoeacieaWsOivje+8ie+8jOWPluW3suaOjOaPoeeahOivjeWkjeS5oFxuICAgIGxldCBmaW5hbFF1ZXVlID0gcXVldWU7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3QgbWFzdGVyZWRXb3JkcyA9IHdvcmRMaXN0LmZpbHRlcigodykgPT4ge1xuICAgICAgICBjb25zdCBwID0gYWxsUHJvZ3Jlc3Nbdy53b3JkXTtcbiAgICAgICAgcmV0dXJuIHAgJiYgcC5zdGF0dXMgPT09ICdtYXN0ZXJlZCc7XG4gICAgICB9KTtcbiAgICAgIGZpbmFsUXVldWUgPSBtYXN0ZXJlZFdvcmRzLnNsaWNlKDAsIGJhdGNoU2l6ZSk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSA4pSAIOiusOW/huS9k+ajgOmrmOWNseivjei9ruasoe+8muimhueblumYn+WIl+S4uuS9k+ajgOa4heWNle+8iOS/neaMgeS9k+ajgOmHjOeahOWNsemZqemhuuW6j++8jOacgOWNsemZqeWcqOWJje+8iSDilIDilIDilIBcbiAgICAvLyDnlKjlhajph4/or43ooajljLnphY3vvIjkuI3otbAgc3R1ZHlNb2RlIOmrmOmikei/h+a7pO+8jOWQpuWImea4heWNleivjeWPr+iDveWFqOWGm+imhuayoeiAjOmdmem7mOWbnumAgOaIkOW4uOinhOi9ruasoe+8iVxuICAgIGxldCBtZW1BY3RpdmUgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5fbWVtb3J5V29yZHMgJiYgKHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBtZW1MZW4gPSAodGhpcy5fbWVtb3J5V29yZHMgYXMgc3RyaW5nW10pLmxlbmd0aDtcbiAgICAgIGNvbnN0IG1lbVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgZm9yIChjb25zdCB3IG9mIHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKSBtZW1TZXQuYWRkKHcudG9Mb3dlckNhc2UoKSk7XG4gICAgICBjb25zdCBtYXRjaGVkID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiBtZW1TZXQuaGFzKHcud29yZC50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICBpZiAobWF0Y2hlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGZpbmFsUXVldWUgPSAodGhpcy5fbWVtb3J5V29yZHMgYXMgc3RyaW5nW10pXG4gICAgICAgICAgLm1hcCgodzogc3RyaW5nKSA9PiBtYXRjaGVkLmZpbmQoKG06IFdvcmRJdGVtKSA9PiBtLndvcmQudG9Mb3dlckNhc2UoKSA9PT0gdy50b0xvd2VyQ2FzZSgpKSlcbiAgICAgICAgICAuZmlsdGVyKCh4OiBXb3JkSXRlbSB8IHVuZGVmaW5lZCk6IHggaXMgV29yZEl0ZW0gPT4gISF4KTtcbiAgICAgICAgbWVtQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgaWYgKGZpbmFsUXVldWUubGVuZ3RoIDwgbWVtTGVuKSB7XG4gICAgICAgICAgLy8g5riF5Y2V6YeM5pyJ6K+N5LiN5Zyo5b2T5YmN6K+N6KGo77yI5aaC6K+N5bqT5pu05paw6L+H77yJ77ya5aaC5a6e5o+Q56S677yM57y65aSx55qE5LiN6KGl5Yir55qE6K+NXG4gICAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6IGDmuIXljZXkuK0gJHttZW1MZW4gLSBmaW5hbFF1ZXVlLmxlbmd0aH0g5Liq6K+N5LiN5Zyo6K+N5Lmm77yM5bey6Lez6L+HYCwgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyDlhajpg6jljLnphY3kuI3kuIrvvIjmnoHlsJHop4HvvInvvJrkuI3pnZnpu5jlm57pgIDvvIzmmI7noa7lkYrnn6VcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfov5nlh6DkuKror43kuI3lnKjlvZPliY3or43kuabph4zvvIzlt7LliIflm57luLjop4TlrabkuaAnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9tZW1vcnlXb3JkcyA9IG51bGw7IC8vIOS4gOasoeaAp++8jOeUqOWQjuWNs+W8g1xuICAgIH1cblxuICAgIC8vIOWHuumimOmhuuW6j++8mumaj+acuuaooeW8j+aJk+S5semYn+WIl++8iOWkjeS5oOS8mOWFiC/lt6nlm7rpmJ/liJflnKjnu4TlhoXmiZPkubHvvIzkuI3mlLnlj5jkvJjlhYjnuqfvvJtcbiAgICAvLyDorrDlv4bkvZPmo4Dova7kv53mjIHljbHpmanpobrluo/kuI3kubHluo/vvIlcbiAgICBpZiAob3JkZXJNb2RlID09PSAncmFuZG9tJyAmJiAhbWVtQWN0aXZlICYmIGZpbmFsUXVldWUubGVuZ3RoID4gMSkge1xuICAgICAgZm9yIChsZXQgaSA9IGZpbmFsUXVldWUubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICBjb25zdCBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSk7XG4gICAgICAgIGNvbnN0IHQgPSBmaW5hbFF1ZXVlW2ldO1xuICAgICAgICBmaW5hbFF1ZXVlW2ldID0gZmluYWxRdWV1ZVtqXTtcbiAgICAgICAgZmluYWxRdWV1ZVtqXSA9IHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g6K6w5b2V5pys6L2u5ZOq5Lqb5piv6aaW5qyh5a2m5Lmg55qE5paw6K+N77yI5aSN5LmgL+W3qeWbuuS4jeiuoeWFpeKAnOe0r+iuoeWNleivjeKAne+8iVxuICAgIHRoaXMuX25ld1dvcmRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgZmluYWxRdWV1ZSkge1xuICAgICAgaWYgKG5ld1dvcmRzLmluZGV4T2YodykgPiAtMSkgdGhpcy5fbmV3V29yZFNldC5hZGQody53b3JkLnRvTG93ZXJDYXNlKCkpO1xuICAgIH1cblxuICAgIC8vIOW3suS4iuaKpeivjeagh+iusO+8iOWNoeeJh+iDjOmdouaYvuekuuOAjOW3suS4iuaKpeOAje+8iVxuICAgIGNvbnN0IHJlcG9ydGVkTWFwOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHt9O1xuICAgIGZvciAoY29uc3QgdyBvZiBmaW5hbFF1ZXVlKSB7XG4gICAgICBpZiAoaXNXb3JkUmVwb3J0ZWQody53b3JkKSkgcmVwb3J0ZWRNYXBbdy53b3JkXSA9IHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvZ3Jlc3NTdGF0cyA9IGdldEJvb2tQcm9ncmVzc1N0YXRzKGJvb2tJZCk7XG5cbiAgICAvLyDmlrDkuIDova7lvIDlp4vvvIzmuIXnqbrlt7LkvZznrZTmoIforrDvvIjkv67lpI3liIfmqKHlvI/lkI7lkIzkuIDor43ph43lpI3orqHmlbDnmoQgYnVn77yJXG4gICAgdGhpcy5fYW5zd2VyZWRTZXQgPSBuZXcgU2V0PG51bWJlcj4oKTtcblxuICAgIC8vIOeKtuaAgeagh+etvuaMieacrOi9rumYn+WIl+WunumZheaehOaIkOWIpOWumu+8muWFqOmDqOS4uuWIsOacn+ivjeaJjeaYr+OAjOWkjeS5oOOAje+8jFxuICAgIC8vIOa3t+WFpeaWsOivje+8iOWkjeS5oOivjeS8mOWFiOWNoOS9jSvmlrDor43ooaXpvZDvvInml7bmoIfjgIzmlrDor43jgI3vvIzpgb/lhY0gMSDkuKrlpI3kuaDor40rOSDkuKrmlrDor43or6/moIfmiJDlpI3kuaBcbiAgICBjb25zdCBkdWVXb3JkU2V0ID0gbmV3IFNldChkdWVXb3Jkcy5tYXAodyA9PiB3LndvcmQpKTtcbiAgICBjb25zdCBkdWVJblF1ZXVlID0gZmluYWxRdWV1ZS5maWx0ZXIodyA9PiBkdWVXb3JkU2V0Lmhhcyh3LndvcmQpKS5sZW5ndGg7XG4gICAgbGV0IHN0YXR1c0xhYmVsID0gJ+aWsOivjSc7XG4gICAgaWYgKG1lbUFjdGl2ZSkge1xuICAgICAgc3RhdHVzTGFiZWwgPSAn6auY5Y2x6K+NJztcbiAgICB9IGVsc2UgaWYgKGZpbmFsUXVldWUubGVuZ3RoID4gMCAmJiBkdWVJblF1ZXVlID09PSBmaW5hbFF1ZXVlLmxlbmd0aCkge1xuICAgICAgc3RhdHVzTGFiZWwgPSAn5aSN5LmgJztcbiAgICB9IGVsc2UgaWYgKGR1ZUluUXVldWUgPT09IDAgJiYgZHVlV29yZHMubGVuZ3RoID09PSAwICYmIG5ld1dvcmRzLmxlbmd0aCA9PT0gMCAmJiBmaW5hbFF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0YXR1c0xhYmVsID0gJ+W3qeWbuic7XG4gICAgfVxuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGJvb2tOYW1lOiBib29rLm5hbWUsXG4gICAgICBib29rVG90YWw6IHdvcmRMaXN0Lmxlbmd0aCxcbiAgICAgIGhpZ2hGcmVxQ291bnQsXG4gICAgICBmdW5jQ291bnQsXG4gICAgICBjb250ZW50Q291bnQsXG4gICAgICBxdWV1ZTogZmluYWxRdWV1ZSxcbiAgICAgIF93b3JkQm9va1dvcmRzOiB3b3JkTGlzdCxcbiAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgIHF1aWNrTGVhcm5pbmc6IHByYWN0aWNlTW9kZSA9PT0gJ3F1aWNrJyxcbiAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAga25vd25Db3VudDogMCxcbiAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgIHRvdGFsQ291bnQ6IGZpbmFsUXVldWUubGVuZ3RoLFxuICAgICAgZHVlQ291bnQ6IHByb2dyZXNzU3RhdHMuZHVlQ291bnQsXG4gICAgICBtYXN0ZXJlZENvdW50OiBwcm9ncmVzc1N0YXRzLm1hc3RlcmVkQ291bnQsXG4gICAgICBzdGF0dXNMYWJlbCxcbiAgICAgIGhhc01vcmU6IGZpbmFsUXVldWUubGVuZ3RoID49IGJhdGNoU2l6ZSxcbiAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgc2hvd1Jlc3VsdDogZmFsc2UsXG4gICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIHF1aWNrVW5rbm93bjoge30sXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgICAvLyDpooTliqDovb3nrKzkuozkuKror43vvIznv7vpobXml7bnp5Llh7rlo7BcbiAgICAgICAgaWYgKGZpbmFsUXVldWUubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHByZWxvYWRBdWRpbyhmaW5hbFF1ZXVlWzFdLndvcmQsIGFjY2VudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvLyDlvZPliY3or43mmK/lkKblt7LkvZznrZTov4fvvIjpmLLliIfmqKHlvI/lkI7ph43lpI3orqHmlbDvvIlcbiAgX2NoZWNrQW5zd2VyZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2Fuc3dlcmVkU2V0Lmhhcyh0aGlzLmRhdGEuY3VycmVudEluZGV4KSkgcmV0dXJuIHRydWU7XG4gICAgdGhpcy5fYW5zd2VyZWRTZXQuYWRkKHRoaXMuZGF0YS5jdXJyZW50SW5kZXgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuXG5cbiAgLy8g5YiH5o2i6K+N5Lmm77ya6L+b5YWl6K+N5Lmm6YCJ5oup6aG177yI5o6o6I2Q5Y2hICsg6ICD6K+VL+aVmeadkOWIhue7hOWIl+ihqO+8iVxuICBjaGFuZ2VCb29rKCkge1xuICAgIHd4Lm5hdmlnYXRlVG8oeyB1cmw6ICcvcGFnZXMvYm9va2xpc3QvYm9va2xpc3QnIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDljaHniYfnv7vpnaLmqKHlvI8g4pSA4pSA4pSAXG4gIC8vIOa8q+a4uOivjeaXj++8muW4puedgOW9k+WJjeivjei3s+i9rOWIsOivjeagueaYn+ezu1xuICBnb0dhbGF4eSgpIHtcbiAgICBjb25zdCB3ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghdykgcmV0dXJuO1xuICAgIHd4Lm5hdmlnYXRlVG8oe1xuICAgICAgdXJsOiBgL3BhZ2VzL2dhbGF4eS9nYWxheHk/d29yZD0ke2VuY29kZVVSSUNvbXBvbmVudCh3LndvcmQpfWBcbiAgICB9KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg57qg6ZSZ5LiK5oqlIOKUgOKUgOKUgFxuICBvcGVuUmVwb3J0KCkge1xuICAgIGNvbnN0IHcgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKCF3KSByZXR1cm47XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1JlcG9ydDogdHJ1ZSwgcmVwb3J0VHlwZTogJycsIHJlcG9ydERlc2M6ICcnIH0pO1xuICB9LFxuXG4gIGNsb3NlUmVwb3J0KCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXBvcnQ6IGZhbHNlIH0pO1xuICB9LFxuXG4gIG9uUmVwb3J0VHlwZShlOiBhbnkpIHtcbiAgICB0aGlzLnNldERhdGEoeyByZXBvcnRUeXBlOiBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC50eXBlIGFzIFJlcG9ydFR5cGUgfSk7XG4gIH0sXG5cbiAgb25SZXBvcnREZXNjKGU6IGFueSkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHJlcG9ydERlc2M6IGUuZGV0YWlsLnZhbHVlIH0pO1xuICB9LFxuXG4gIHN1Ym1pdFJlcG9ydCgpIHtcbiAgICBjb25zdCB3ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghdykgcmV0dXJuO1xuICAgIGlmICghdGhpcy5kYXRhLnJlcG9ydFR5cGUpIHtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6K+35YWI6YCJ5oup6Zeu6aKY57G75Z6LJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVwb3J0V29yZCh3LndvcmQsIGJvb2tJZCwgdGhpcy5kYXRhLnJlcG9ydFR5cGUgYXMgUmVwb3J0VHlwZSwgdGhpcy5kYXRhLnJlcG9ydERlc2MpLnRoZW4oKHIpID0+IHtcbiAgICAgIGlmIChyLmFscmVhZHkpIHtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfov5nkuKrpl67popjlt7LmnInkurrmiqXov4fllaYnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICB9IGVsc2UgaWYgKHIub2spIHtcbiAgICAgICAgY29uc3QgcmVwb3J0ZWRNYXAgPSB7IC4uLnRoaXMuZGF0YS5yZXBvcnRlZE1hcCwgW3cud29yZF06IHRydWUgfTtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgc2hvd1JlcG9ydDogZmFsc2UsIHJlcG9ydGVkTWFwIH0pO1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suWPl+eQhu+8jOaEn+iwouWFseW7uu+8gScsIGljb246ICdzdWNjZXNzJyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5o+Q5Lqk5aSx6LSl77yM6K+35qOA5p+l572R57ucJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIGZsaXBDYXJkKCkge1xuICAgIC8vIOOAjOS4jeiupOivhuOAjeaPreekuuetlOahiOWQjuS5n+WFgeiuuOiHqueUsee/u+mdou+8iOWPr+e/u+Wbnuato+mdouWGjeeci+WNleivje+8ie+8jOa1geeoi+eUseOAjOS4i+S4gOS4quOAjeaMiemSruaOqOi/m1xuICAgIGNvbnN0IGZsaXBwZWQgPSAhdGhpcy5kYXRhLmlzRmxpcHBlZDtcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgaXNGbGlwcGVkOiBmbGlwcGVkLFxuICAgICAgc2hvd01lYW5pbmc6IGZsaXBwZWRcbiAgICB9KTtcbiAgICAvLyDnv7vliLDog4zpnaLml7boh6rliqjmkq3mlL7lj5Hpn7PvvIzlubbpooTliqDovb3kuIvkuIDkuKror41cbiAgICBpZiAoZmxpcHBlZCkge1xuICAgICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleCArIDFdO1xuICAgICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgICAgaWYgKG5leHQpIHByZWxvYWRBdWRpbyhuZXh0LndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgIH1cbiAgfSxcblxuICAvLyDilIDilIDilIAg5Y+R6Z+zIOKUgOKUgOKUgFxuICBvblBsYXlBdWRpbygpIHtcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgfSxcblxuICAvLyDliIfmjaLlj6Ppn7NcbiAgb25Ub2dnbGVBY2NlbnQoKSB7XG4gICAgY29uc3QgbmV3QWNjZW50OiBBY2NlbnQgPSB0aGlzLmRhdGEuYWNjZW50ID09PSAndXMnID8gJ3VrJyA6ICd1cyc7XG4gICAgc2V0QWNjZW50KG5ld0FjY2VudCk7XG4gICAgdGhpcy5zZXREYXRhKHsgYWNjZW50OiBuZXdBY2NlbnQgfSk7XG4gICAgd3guc2hvd1RvYXN0KHtcbiAgICAgIHRpdGxlOiBuZXdBY2NlbnQgPT09ICd1aycgPyAn6Iux6Z+z5qih5byPJyA6ICfnvo7pn7PmqKHlvI8nLFxuICAgICAgaWNvbjogJ25vbmUnXG4gICAgfSk7XG4gICAgLy8g5YiH5o2i5ZCO56uL5Y2z5pKt5pS+5b2T5YmN6K+NXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgbmV3QWNjZW50KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5Ye66aKY5pa55byP5bqU55So77yI5ZCr5re35ZCI5qih5byP6ZqP5py65pig5bCE77yJIOKUgOKUgOKUgFxuICAvLyDkuLrlvZPliY3or43noa7lrprlrp7pmYXlh7rpopjmlrnlvI/lubbph43nva7nrZTpopjnirbmgIHvvJvljaHniYfmqKHlvI/kv53nlZnnv7vpnaLlu7bnu63vvIjph4rkuYnpnaLmnJ3kuIrliIfor43vvIlcbiAgX2FwcGx5TW9kZUZvckN1cnJlbnQoKSB7XG4gICAgY29uc3QgbW9kZSA9IHRvQ29uY3JldGVNb2RlKHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpO1xuICAgIGNvbnN0IGtlZXBGbGlwID0gdGhpcy5kYXRhLmlzRmxpcHBlZCAmJiB0aGlzLmRhdGEucHJhY3RpY2VNb2RlID09PSAnY2FyZCc7XG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICAvLyDliIfor43ooaXkuIDmrKHnnJ/lrp7nv7vpnaLvvJrlhYjnn63mmoLlm57mraPpnaLvvIzkuIvkuIDluKflho3nv7vlm57ph4rkuYnpnaLvvIxcbiAgICAvLyDmtojpmaTigJzmjaLor43ml7bljaHniYflg4/msqHnv7vov4fmnaXigJ3nmoTlm7Dmg5HvvIjkv53nlZnliIfor43kv53mjIHph4rkuYnpnaLnmoTorr7orqHvvIlcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7IC8vIOWIh+aooeW8jy/liIfor43ml7blj5bmtojigJzkuI3orqTor4boh6rliqjot7PigJ3lrprml7blmajvvIzpmLLot7Por43nq57mgIFcbiAgICBjb25zdCBmbGlwQmFzZSA9IGtlZXBGbGlwID8geyBpc0ZsaXBwZWQ6IGZhbHNlLCBzaG93TWVhbmluZzogZmFsc2UgfSA6IHt9O1xuICAgIGNvbnN0IGZsaXBCYWNrID0gKCkgPT4ge1xuICAgICAgaWYgKCFrZWVwRmxpcCkgcmV0dXJuO1xuICAgICAgd3gubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLnNldERhdGEoeyBpc0ZsaXBwZWQ6IHRydWUsIHNob3dNZWFuaW5nOiB0cnVlIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICAvLyDlv6vpgJ/mqKHlvI/vvJrov5vlhaXlrabkuaDpmLbmrrXvvIzmgaLlpI3pmJ/liJflpLTmjIfpkojkuI7orqHmlbDvvIjlkIzkuIDmibnor43ph43lrabph43mtYvvvIlcbiAgICBpZiAobW9kZSA9PT0gJ3F1aWNrJykge1xuICAgICAgdGhpcy5zZXREYXRhKHtcbiAgICAgICAgYWN0aXZlTW9kZTogJ3F1aWNrJyxcbiAgICAgICAgcXVpY2tMZWFybmluZzogdHJ1ZSxcbiAgICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgICAgICBjaG9pY2VTZWxlY3RlZDogLTFcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgYWN0aXZlTW9kZTogbW9kZSxcbiAgICAgIHF1aWNrTGVhcm5pbmc6IGZhbHNlLCAvLyDliIfliLDpnZ7lv6vpgJ/mqKHlvI/ml7bpgIDlh7rlrabkuaDpmLbmrrXvvIzpmLLmraLliJfooajmrovnlZlcbiAgICAgIC4uLmZsaXBCYXNlLFxuICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xXG4gICAgfSwgKCkgPT4ge1xuICAgICAgZmxpcEJhY2soKTtcbiAgICAgIGlmICghd29yZCkgcmV0dXJuO1xuICAgICAgaWYgKG1vZGUgPT09ICdjaG9pY2UnKSB7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVDaG9pY2VPcHRpb25zKHdvcmQpO1xuICAgICAgfSBlbHNlIGlmIChtb2RlID09PSAnY2FyZCcpIHtcbiAgICAgICAgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWbm+mAieS4gOaooeW8jyDilIDilIDilIBcbiAgLy8g55Sf5oiQ5Zub6YCJ5LiA6YCJ6aG577yI57uZ5Y2V6K+N6YCJ6YeK5LmJ77yJXG4gIGdlbmVyYXRlQ2hvaWNlT3B0aW9ucyhjdXJyZW50V29yZDogV29yZEl0ZW0pIHtcbiAgICBjb25zdCBhbGxXb3JkcyA9IHRoaXMuZGF0YS5fd29yZEJvb2tXb3JkcztcbiAgICBpZiAoYWxsV29yZHMubGVuZ3RoIDwgNCkge1xuICAgICAgLy8g6K+N5Lmm6K+N5pWw5LiN5aSfIDQg5Liq77yM5peg5rOV5Ye65bmy5omw6aG577yM6ZmN57qn5Li65Y2h54mH5Ye66aKYXG4gICAgICB0aGlzLnNldERhdGEoeyBhY3RpdmVNb2RlOiAnY2FyZCcgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8g5LuO6K+N5Lmm6ZqP5py65Y+WIDMg5Liq5bmy5omw6aG5XG4gICAgY29uc3QgZGlzdHJhY3RvcnM6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCB1c2VkID0gbmV3IFNldChbY3VycmVudFdvcmQud29yZF0pO1xuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKGRpc3RyYWN0b3JzLmxlbmd0aCA8IDMgJiYgYXR0ZW1wdHMgPCAxMDApIHtcbiAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFsbFdvcmRzLmxlbmd0aCk7XG4gICAgICBjb25zdCB3ID0gYWxsV29yZHNbaWR4XTtcbiAgICAgIGlmICghdXNlZC5oYXMody53b3JkKSAmJiB3Lm1lYW5pbmcgIT09IGN1cnJlbnRXb3JkLm1lYW5pbmcpIHtcbiAgICAgICAgZGlzdHJhY3RvcnMucHVzaCh3KTtcbiAgICAgICAgdXNlZC5hZGQody53b3JkKTtcbiAgICAgIH1cbiAgICAgIGF0dGVtcHRzKys7XG4gICAgfVxuXG4gICAgLy8g57uE5ZCIICsg6ZqP5py65omT5LmxXG4gICAgY29uc3Qgb3B0aW9uczogQ2hvaWNlT3B0aW9uW10gPSBbXG4gICAgICB7IG1lYW5pbmc6IGN1cnJlbnRXb3JkLm1lYW5pbmcsIGlzQ29ycmVjdDogdHJ1ZSB9LFxuICAgICAgLi4uZGlzdHJhY3RvcnMubWFwKGQgPT4gKHsgbWVhbmluZzogZC5tZWFuaW5nLCBpc0NvcnJlY3Q6IGZhbHNlIH0pKVxuICAgIF0uc29ydCgoKSA9PiBNYXRoLnJhbmRvbSgpIC0gMC41KTtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjaG9pY2VPcHRpb25zOiBvcHRpb25zLFxuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgY2hvaWNlQ29ycmVjdDogZmFsc2VcbiAgICB9KTtcbiAgfSxcblxuICAvLyDlm5vpgInkuIDvvJrngrnlh7vpgInpoblcbiAgb25DaG9pY2VTZWxlY3QoZTogYW55KSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jaG9pY2VTZWxlY3RlZCAhPT0gLTEpIHJldHVybjsgLy8g5bey6YCJ6L+HXG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcblxuICAgIGNvbnN0IGlkeCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LmlkeCBhcyBudW1iZXI7XG4gICAgY29uc3Qgb3B0aW9uID0gdGhpcy5kYXRhLmNob2ljZU9wdGlvbnNbaWR4XTtcbiAgICBjb25zdCBpc0NvcnJlY3QgPSBvcHRpb24uaXNDb3JyZWN0O1xuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGNob2ljZVNlbGVjdGVkOiBpZHgsXG4gICAgICBjaG9pY2VDb3JyZWN0OiBpc0NvcnJlY3RcbiAgICB9KTtcblxuICAgIC8vIOaSreaUvuWNleivjeWPkemfs1xuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuXG4gICAgLy8g6K6w5b2V6L+b5bqmXG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgaXNDb3JyZWN0KTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgaWYgKCFpc0NvcnJlY3QpIHtcbiAgICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuICAgIH1cblxuICAgIGlmIChpc0NvcnJlY3QpIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGtub3duQ291bnQ6IHRoaXMuZGF0YS5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXREYXRhKHsgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9XG5cbiAgICAvLyDnrZTlr7nlgZwgMSDnp5LvvJvnrZTplJnlgZwgMi41IOenku+8jOeVmeaXtumXtOeci+a4heato+ehruetlOahiFxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5uZXh0V29yZCgpO1xuICAgIH0sIGlzQ29ycmVjdCA/IDEwMDAgOiAyNTAwKTtcbiAgfSxcblxuICAvLyDlm5vpgInkuIDvvJrngrnjgIzkuI3orqTor4bjgI3vvIjkuI3njJzkuobvvIznm7TmjqXmj63npLrmraPnoa7nrZTmoYjvvIzmjInnrZTplJnorrDlvZXvvIlcbiAgb25DaG9pY2VEb250S25vdygpIHtcbiAgICBpZiAodGhpcy5kYXRhLmNob2ljZVNlbGVjdGVkICE9PSAtMSkgcmV0dXJuOyAvLyDlt7LkvZznrZQv5bey5o+t56S6XG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcblxuICAgIC8vIGNob2ljZVNlbGVjdGVkIOe9ruS4uiAtMu+8muS4jeWRveS4reS7u+S9lemAiemhue+8iOS4jeagh+e6oumUmeivr+mhue+8ie+8jOS9huinpuWPkeato+ehrumhuemrmOS6rlxuICAgIHRoaXMuc2V0RGF0YSh7IGNob2ljZVNlbGVjdGVkOiAtMiwgY2hvaWNlQ29ycmVjdDogZmFsc2UgfSk7XG5cbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcblxuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGZhbHNlKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgYWRkVG9Xcm9uZ0Jvb2sod29yZC53b3JkLCB3b3JkLm1lYW5pbmcsIGJvb2tJZCk7XG5cbiAgICB0aGlzLnNldERhdGEoeyB1bmtub3duQ291bnQ6IHRoaXMuZGF0YS51bmtub3duQ291bnQgKyAxIH0pO1xuXG4gICAgLy8g5LiN6Ieq5Yqo6Lez6L2s77ya5bGV56S65q2j56Gu562U5qGI5ZCO5Ye644CM5LiL5LiA5Liq44CN5oyJ6ZKu77yM57uZ55So5oi35pe26Ze06K6w5L2P6L+Z5Liq6K+NXG4gIH0sXG5cbiAgLy8g6YCJ5oup5qih5byP44CM5LiN6K6k6K+G44CN5o+t56S6562U5qGI5ZCO77yM54K544CM5LiL5LiA5Liq44CN57un57utXG4gIG9uQ2hvaWNlTmV4dCgpIHtcbiAgICBpZiAodGhpcy5kYXRhLmNob2ljZVNlbGVjdGVkICE9PSAtMikgcmV0dXJuOyAvLyDku4XpmZDjgIzkuI3orqTor4bjgI3mj63npLrnirbmgIFcbiAgICB0aGlzLnNldERhdGEoeyBjaG9pY2VTZWxlY3RlZDogLTEgfSk7XG4gICAgdGhpcy5uZXh0V29yZCgpO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDmi7zlhpnmqKHlvI8g4pSA4pSA4pSAXG4gIG9uU3BlbGxJbnB1dChlOiBhbnkpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzcGVsbElucHV0OiBlLmRldGFpbC52YWx1ZSB9KTtcbiAgfSxcblxuICBvblNwZWxsU3VibWl0KCkge1xuICAgIGNvbnN0IGlucHV0ID0gdGhpcy5kYXRhLnNwZWxsSW5wdXQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKCFpbnB1dCkgcmV0dXJuO1xuXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAoIXdvcmQpIHJldHVybjtcbiAgICBpZiAodGhpcy5fY2hlY2tBbnN3ZXJlZCgpKSByZXR1cm47IC8vIOWIh+aooeW8j+WQjuWQjOS4gOivjeS4jemHjeWkjeiuoeaVsFxuXG5cbiAgICBjb25zdCBpc0NvcnJlY3QgPSBpbnB1dCA9PT0gd29yZC53b3JkLnRvTG93ZXJDYXNlKCk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgc3BlbGxGZWVkYmFjazogaXNDb3JyZWN0ID8gJ2NvcnJlY3QnIDogJ3dyb25nJ1xuICAgIH0pO1xuXG4gICAgLy8g5pKt5pS+5Y+R6Z+zXG4gICAgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG5cbiAgICAvLyDorrDlvZXov5vluqZcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCBpc0NvcnJlY3QpO1xuICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3b3JkLndvcmQpKTtcbiAgICBpZiAoIWlzQ29ycmVjdCkge1xuICAgICAgYWRkVG9Xcm9uZ0Jvb2sod29yZC53b3JkLCB3b3JkLm1lYW5pbmcsIGJvb2tJZCk7XG4gICAgfVxuXG4gICAgaWYgKGlzQ29ycmVjdCkge1xuICAgICAgdGhpcy5zZXREYXRhKHsga25vd25Db3VudDogdGhpcy5kYXRhLmtub3duQ291bnQgKyAxIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldERhdGEoeyB1bmtub3duQ291bnQ6IHRoaXMuZGF0YS51bmtub3duQ291bnQgKyAxIH0pO1xuICAgIH1cblxuICAgIC8vIOaLvOWvueWBnCAxLjIg56eS77yb5ou86ZSZ5YGcIDMg56eS77yM55WZ5pe26Ze06K6w5L2P5q2j56Gu5ou85YaZXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm5leHRXb3JkKCk7XG4gICAgfSwgaXNDb3JyZWN0ID8gMTIwMCA6IDMwMDApO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDnu4PkuaDmqKHlvI/liIfmjaLvvIjliIfmjaLkuI3mjaLor43kuI3ot7Por43vvIzlvZPliY3or43mjInmlrDmlrnlvI/ph43mlrDlh7rpopjvvIkg4pSA4pSA4pSAXG4gIC8vIOKUgOKUgOKUgCDoh6rlrprkuYnpgInmi6nlvLnmoYbvvIjmqKHlvI8v6IyD5Zu0L+avj+i9ruS4quaVsOe7n+S4gOeUqO+8iSDilIDilIDilIBcbiAgX29wZW5TaGVldCh0eXBlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG9wdGlvbnM6IEFycmF5PHsgbGFiZWw6IHN0cmluZzsgYWN0aXZlOiBib29sZWFuIH0+KSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1NoZWV0OiB0cnVlLCBzaGVldFR5cGU6IHR5cGUsIHNoZWV0VGl0bGU6IHRpdGxlLCBzaGVldE9wdGlvbnM6IG9wdGlvbnMgfSk7XG4gIH0sXG5cbiAgY2xvc2VTaGVldCgpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93U2hlZXQ6IGZhbHNlIH0pO1xuICB9LFxuXG4gIG9uU2hlZXRTZWxlY3QoZTogYW55KSB7XG4gICAgY29uc3QgaWR4ID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQuaW5kZXggYXMgbnVtYmVyO1xuICAgIGNvbnN0IHR5cGUgPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC50eXBlIGFzIHN0cmluZztcbiAgICB0aGlzLnNldERhdGEoeyBzaG93U2hlZXQ6IGZhbHNlIH0pO1xuXG4gICAgaWYgKHR5cGUgPT09ICdtb2RlJykge1xuICAgICAgY29uc3QgbW9kZXM6IFByYWN0aWNlTW9kZVtdID0gWydjYXJkJywgJ2Nob2ljZScsICdzcGVsbCcsICdtaXgnLCAncXVpY2snXTtcbiAgICAgIGNvbnN0IG1vZGUgPSBtb2Rlc1tpZHhdIGFzIFByYWN0aWNlTW9kZTtcbiAgICAgIGlmICghbW9kZSB8fCBtb2RlID09PSB0aGlzLmRhdGEucHJhY3RpY2VNb2RlKSByZXR1cm47XG4gICAgICBzZXRQcmFjdGljZU1vZGUobW9kZSk7XG4gICAgICAvLyDliIfliLDlv6vpgJ/vvJrku47lrabkuaDpmLbmrrXlvIDlp4vvvIjnjrDmnInpmJ/liJfnm7TmjqXlj5jlrabkuaDliJfooajvvIlcbiAgICAgIGlmIChtb2RlID09PSAncXVpY2snKSB7XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICAgICAgcHJhY3RpY2VNb2RlOiBtb2RlLFxuICAgICAgICAgIG1vZGVJbmRleDogaWR4LFxuICAgICAgICAgIGFjdGl2ZU1vZGU6ICdxdWljaycsIC8vIOWtpuS5oOinhuWbvua4suafk+imgeaxgiBhY3RpdmVNb2RlPT09J3F1aWNrJ++8jOS4juetlOmimOinhuWbvuS6kuaWpVxuICAgICAgICAgIHF1aWNrTGVhcm5pbmc6IHRydWUsXG4gICAgICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICAgICAgdW5rbm93bkNvdW50OiAwLFxuICAgICAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICAgICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgICAgICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICAgICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgICAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgICAgICBxdWlja1Vua25vd246IHt9XG4gICAgICAgIH0pO1xuICAgICAgICB0aGlzLl9hbnN3ZXJlZFNldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgICAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0RGF0YSh7IHByYWN0aWNlTW9kZTogbW9kZSwgbW9kZUluZGV4OiBpZHggfSk7XG4gICAgICBpZiAodGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3Njb3BlJykge1xuICAgICAgY29uc3QgbW9kZXM6IFN0dWR5TW9kZVtdID0gWydhbGwnLCAnaGlnaEZyZXEnLCAnZnVuYycsICdjb250ZW50J107XG4gICAgICBjb25zdCBuZXdNb2RlID0gbW9kZXNbaWR4XTtcbiAgICAgIGlmICghbmV3TW9kZSB8fCBuZXdNb2RlID09PSB0aGlzLmRhdGEuc3R1ZHlNb2RlKSByZXR1cm47XG4gICAgICBzZXRTdHVkeU1vZGUobmV3TW9kZSk7XG4gICAgICB0aGlzLnNldERhdGEoeyB3b3JkQ2xhc3NMYWJlbDogdGhpcy5XT1JEX0NMQVNTX0xBQkVMU1tuZXdNb2RlXSB8fCAn5YWo6YOoJyB9KTtcbiAgICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnYmF0Y2gnKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gWzUsIDEwLCAxNSwgMjBdO1xuICAgICAgY29uc3QgbiA9IG9wdGlvbnNbaWR4XTtcbiAgICAgIGlmICghbiB8fCBuID09PSB0aGlzLmRhdGEuYmF0Y2hTaXplKSByZXR1cm47XG4gICAgICBzZXRCYXRjaFNpemUobik7XG4gICAgICB0aGlzLnNldERhdGEoeyBiYXRjaFNpemU6IG4gfSk7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+avj+i9riAnICsgbiArICcg5Liq5Y2V6K+NJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgICB9XG4gIH0sXG5cbiAgb25Nb2RlVGFwKCkge1xuICAgIGNvbnN0IG1vZGVzOiBQcmFjdGljZU1vZGVbXSA9IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4JywgJ3F1aWNrJ107XG4gICAgdGhpcy5fb3BlblNoZWV0KFxuICAgICAgJ21vZGUnLFxuICAgICAgJ+WtpuS5oOaooeW8jycsXG4gICAgICBtb2Rlcy5tYXAoKG0sIGkpID0+ICh7IGxhYmVsOiB0aGlzLmRhdGEubW9kZUxhYmVsc1tpXSwgYWN0aXZlOiBtID09PSB0aGlzLmRhdGEucHJhY3RpY2VNb2RlIH0pKVxuICAgICk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOW/q+mAn+aooeW8jyDCtyDlrabkuaDpmLbmrrUg4pSA4pSA4pSAXG4gIC8vIOeCuSDDlyDmoIforrDkuI3orqTor4bvvIjlho3ngrnkuIDmrKHlj5bmtojvvIzmgaLlpI3pu5jorqTorqTor4bvvInvvJvngrnooYzlhbblroPljLrln5/lj5Hlo7BcbiAgb25RdWlja01hcmsoZTogYW55KSB7XG4gICAgY29uc3Qgd29yZCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LndvcmQgYXMgc3RyaW5nO1xuICAgIGlmICghd29yZCkgcmV0dXJuO1xuICAgIHBsYXlBdWRpbyh3b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICBjb25zdCBxdWlja1Vua25vd24gPSB7IC4uLnRoaXMuZGF0YS5xdWlja1Vua25vd24gfTtcbiAgICBpZiAocXVpY2tVbmtub3duW3dvcmRdKSB7XG4gICAgICBkZWxldGUgcXVpY2tVbmtub3duW3dvcmRdO1xuICAgIH0gZWxzZSB7XG4gICAgICBxdWlja1Vua25vd25bd29yZF0gPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoeyBxdWlja1Vua25vd24gfSk7XG4gIH0sXG5cbiAgLy8g5om56YeP6K6w5b2V5pys6L2u5qCH6K6w77ya5pyq5qCH6K6w6buY6K6k6K6k6K+G77yb6L+U5Zue5LiN6K6k6K+G5pWwXG4gIF9yZWNvcmRRdWlja1JvdW5kKCk6IG51bWJlciB7XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIGNvbnN0IHF1ZXVlID0gdGhpcy5kYXRhLnF1ZXVlO1xuICAgIGNvbnN0IHVua25vd25TZXQgPSB0aGlzLmRhdGEucXVpY2tVbmtub3duO1xuICAgIGxldCB1bmtub3duQ291bnQgPSAwO1xuICAgIGZvciAoY29uc3QgdyBvZiBxdWV1ZSkge1xuICAgICAgY29uc3Qga25vd24gPSAhdW5rbm93blNldFt3LndvcmRdO1xuICAgICAgaWYgKCFrbm93bikge1xuICAgICAgICB1bmtub3duQ291bnQgKz0gMTtcbiAgICAgICAgYWRkVG9Xcm9uZ0Jvb2sody53b3JkLCB3Lm1lYW5pbmcsIGJvb2tJZCk7XG4gICAgICB9XG4gICAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3LndvcmQsIGtub3duKTtcbiAgICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3LndvcmQpKTtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHsga25vd25Db3VudDogcXVldWUubGVuZ3RoIC0gdW5rbm93bkNvdW50LCB1bmtub3duQ291bnQgfSk7XG4gICAgdGhpcy5zeW5jVG9DbG91ZCgpO1xuICAgIHJldHVybiB1bmtub3duQ291bnQ7XG4gIH0sXG5cbiAgLy8g57un57ut77ya5om56YeP6K6w5b2V5ZCO55u05o6l5byA5LiL5LiA6L2u77yI5LiN6K6k6K+G55qE6K+N5aSN5Lmg5o6S56iL5Lya5bC95b+r5YaN5a6J5o6S77yJXG4gIG9uTmV4dFJvdW5kKCkge1xuICAgIGNvbnN0IHVua25vd25Db3VudCA9IHRoaXMuX3JlY29yZFF1aWNrUm91bmQoKTtcbiAgICB3eC5zaG93VG9hc3Qoe1xuICAgICAgdGl0bGU6IHVua25vd25Db3VudCA+IDAgPyAn5bey6K6w5b2V77yM5LiN6K6k6K+G55qE6K+N5Lya5bC95b+r5YaN5a6J5o6SJyA6ICflhajpg6jorqTor4bvvIzlpKrmo5LkuobvvIEnLFxuICAgICAgaWNvbjogJ25vbmUnXG4gICAgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICAvLyDlrozmiJDvvJrmibnph4/orrDlvZXlkI7ov5vnu5PmnpzpobXvvIjnnIvmnKzova7orqTor4bnjofvvIzlj6/lpI3kuaDmnKzova4v5YaN5p2l5LiA6L2u77yJXG4gIG9uUXVpY2tGaW5pc2goKSB7XG4gICAgdGhpcy5fcmVjb3JkUXVpY2tSb3VuZCgpO1xuICAgIHRoaXMuZmluaXNoUm91bmQoKTtcbiAgfSxcblxuICBvblByYWN0aWNlTW9kZUNoYW5nZShlOiBhbnkpIHtcbiAgICBjb25zdCBtb2RlID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQubW9kZSBhcyBQcmFjdGljZU1vZGU7XG4gICAgaWYgKG1vZGUgPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpIHJldHVybjtcblxuICAgIHNldFByYWN0aWNlTW9kZShtb2RlKTtcbiAgICB0aGlzLnNldERhdGEoeyBwcmFjdGljZU1vZGU6IG1vZGUgfSk7XG4gICAgaWYgKHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgfVxuXG4gICAgY29uc3QgbGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBjYXJkOiAn5Y2h54mH5qih5byPJywgY2hvaWNlOiAn6YCJ5oup5qih5byPJywgc3BlbGw6ICfmi7zlhpnmqKHlvI8nLCBtaXg6ICfmt7flkIjmqKHlvI8nLCBxdWljazogJ+W/q+mAn+WtpuS5oCcgfTtcbiAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogbGFiZWxzW21vZGVdIHx8ICcnLCBpY29uOiAnbm9uZScgfSk7XG4gIH0sXG5cbiAgLy8g5YiH5o2i5Ye66aKY6aG65bqP77yI6ZqP5py6IC8g6aG65bqP77yJXG4gIG9uVG9nZ2xlT3JkZXJNb2RlKCkge1xuICAgIGNvbnN0IG5ld01vZGUgPSB0aGlzLmRhdGEub3JkZXJNb2RlID09PSAncmFuZG9tJyA/ICdzZXF1ZW50aWFsJyA6ICdyYW5kb20nO1xuICAgIHNldE9yZGVyTW9kZShuZXdNb2RlKTtcbiAgICB3eC5zaG93VG9hc3Qoe1xuICAgICAgdGl0bGU6IG5ld01vZGUgPT09ICdyYW5kb20nID8gJ+W3suWIh+aNoumaj+acuuWHuuivjScgOiAn5bey5YiH5o2i6aG65bqP5Ye66K+NJyxcbiAgICAgIGljb246ICdub25lJ1xuICAgIH0pO1xuICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gIH0sXG5cbiAgLy8g5b2T5YmN6K+N5piv5ZCm5Li66aaW5qyh5a2m5Lmg55qE5paw6K+N77yI5LuF5paw6K+N6K6h5YWl4oCc57Sv6K6h5Y2V6K+N4oCd77yJXG4gIF9pc05ld1dvcmQod29yZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5fbmV3V29yZFNldCAmJiB0aGlzLl9uZXdXb3JkU2V0Lmhhcyh3b3JkLnRvTG93ZXJDYXNlKCkpO1xuICB9LFxuXG4gIC8vIOiuvue9ruavj+i9ruWtpuS5oOWNleivjeaVsO+8iOmhtumDqOaMiemSru+8iVxuICBvbkNoYW5nZUJhdGNoU2l6ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0gWzUsIDEwLCAxNSwgMjBdO1xuICAgIHRoaXMuX29wZW5TaGVldChcbiAgICAgICdiYXRjaCcsXG4gICAgICAn5q+P6L2u5Liq5pWwJyxcbiAgICAgIG9wdGlvbnMubWFwKG4gPT4gKHsgbGFiZWw6IG4gKyAnIOS4qi/ova4nLCBhY3RpdmU6IG4gPT09IHRoaXMuZGF0YS5iYXRjaFNpemUgfSkpXG4gICAgKTtcbiAgfSxcblxuICAvLyDliIfmjaLlrabkuaDojIPlm7TvvIjlhajpg6gv6auY6aKRL+iZmuivjS/lrp7or43vvIlcbiAgV09SRF9DTEFTU19MQUJFTFM6IHsgYWxsOiAn5YWo6YOoJywgaGlnaEZyZXE6ICfpq5jpopHor40nLCBmdW5jOiAn6Jma6K+NJywgY29udGVudDogJ+WunuivjScgfSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuXG4gIG9uU2VsZWN0V29yZENsYXNzKCkge1xuICAgIGNvbnN0IG1vZGVzOiBTdHVkeU1vZGVbXSA9IFsnYWxsJywgJ2hpZ2hGcmVxJywgJ2Z1bmMnLCAnY29udGVudCddO1xuICAgIHRoaXMuX29wZW5TaGVldChcbiAgICAgICdzY29wZScsXG4gICAgICAn6K+N5Lmm6IyD5Zu0JyxcbiAgICAgIG1vZGVzLm1hcChtID0+ICh7IGxhYmVsOiB0aGlzLldPUkRfQ0xBU1NfTEFCRUxTW21dLCBhY3RpdmU6IG0gPT09IHRoaXMuZGF0YS5zdHVkeU1vZGUgfSkpXG4gICAgKTtcbiAgfSxcblxuICAvLyDlhbzlrrnml6flhaXlj6NcbiAgdG9nZ2xlU3R1ZHlNb2RlKCkge1xuICAgIHRoaXMub25TZWxlY3RXb3JkQ2xhc3MoKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5a+85Ye65LuK5pel5Y2V6K+N6KGoIOKUgOKUgOKUgFxuICBfdG9kYXlSb3dzOiBudWxsIGFzIFRvZGF5Um93W10gfCBudWxsLFxuXG4gIG9uRXhwb3J0VG9kYXkoKSB7XG4gICAgd3guc2hvd0xvYWRpbmcoeyB0aXRsZTogJ+aVtOeQhuWNleivjeS4rS4uLicgfSk7XG4gICAgY29sbGVjdFRvZGF5Um93cygpLnRoZW4oKHJvd3MpID0+IHtcbiAgICAgIHd4LmhpZGVMb2FkaW5nKCk7XG4gICAgICB0aGlzLl90b2RheVJvd3MgPSByb3dzO1xuICAgICAgc2hvd0V4cG9ydFNoZWV0KHJvd3MsICgpID0+IHRoaXMuX2dldEV4cG9ydENhbnZhcygpKTtcbiAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICB3eC5oaWRlTG9hZGluZygpO1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfmlbTnkIblpLHotKXvvIzor7fph43or5UnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2dldEV4cG9ydENhbnZhcygpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB3eC5jcmVhdGVTZWxlY3RvclF1ZXJ5KCkuaW4odGhpcylcbiAgICAgICAgLnNlbGVjdCgnI2V4cG9ydENhbnZhcycpXG4gICAgICAgIC5maWVsZHMoeyBub2RlOiB0cnVlIH0pXG4gICAgICAgIC5leGVjKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChyZXMgJiYgcmVzWzBdICYmIHJlc1swXS5ub2RlKSByZXNvbHZlKHJlc1swXS5ub2RlKTtcbiAgICAgICAgICBlbHNlIHJlamVjdChuZXcgRXJyb3IoJ2NhbnZhcyDmnKrlsLHnu6onKSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDljaHniYfmqKHlvI/orqTor4Yv5LiN6K6k6K+GIOKUgOKUgOKUgFxuICBtYXJrS25vd24oKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jdXJyZW50SW5kZXggPj0gdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCB0cnVlKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAga25vd25Db3VudDogdGhpcy5kYXRhLmtub3duQ291bnQgKyAxXG4gICAgfSk7XG4gICAgdGhpcy5uZXh0V29yZCgpO1xuICB9LFxuXG4gIG1hcmtVbmtub3duKCkge1xuICAgIGlmICh0aGlzLmRhdGEuY3VycmVudEluZGV4ID49IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGgpIHJldHVybjtcbiAgICBpZiAodGhpcy5kYXRhLnJldmVhbEFmdGVyVW5rbm93bikgcmV0dXJuOyAvLyDlt7Lmj63npLrvvIznrYnlvoXnlKjmiLfngrnjgIzkuIvkuIDkuKrjgI1cbiAgICBpZiAodGhpcy5fY2hlY2tBbnN3ZXJlZCgpKSByZXR1cm47IC8vIOWIh+aooeW8j+WQjuWQjOS4gOivjeS4jemHjeWkjeiuoeaVsFxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgZmFsc2UpO1xuICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3b3JkLndvcmQpKTtcbiAgICBhZGRUb1dyb25nQm9vayh3b3JkLndvcmQsIHdvcmQubWVhbmluZywgYm9va0lkKTtcblxuICAgIC8vIOS4jeiupOivhu+8muato+mdou+8iOWPqueci+WIsOWNleivje+8ieWImee/u+mdoueci+mHiuS5ie+8m+W3sue7j+WcqOmHiuS5iemdouWImeS/neaMgeS4jeWKqO+8jFxuICAgIC8vIOeUseeUqOaIt+S4u+WKqOeCueOAjOS4i+S4gOS4quOAjei1sFxuICAgIGNvbnN0IG5lZWRGbGlwID0gIXRoaXMuZGF0YS5pc0ZsaXBwZWQ7XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHVua25vd25Db3VudDogdGhpcy5kYXRhLnVua25vd25Db3VudCArIDEsXG4gICAgICByZXZlYWxBZnRlclVua25vd246IHRydWUsXG4gICAgICBpc0ZsaXBwZWQ6IG5lZWRGbGlwID8gdHJ1ZSA6IHRoaXMuZGF0YS5pc0ZsaXBwZWQsXG4gICAgICBzaG93TWVhbmluZzogbmVlZEZsaXAgPyB0cnVlIDogdGhpcy5kYXRhLnNob3dNZWFuaW5nXG4gICAgfSk7XG4gICAgLy8g6Ieq5Yqo5pKt5pS+5Y+R6Z+z77yM5Yqg5rex6K6w5b+GXG4gICAgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gIH0sXG5cbiAgX3JldmVhbFRpbWVyOiBudWxsIGFzIGFueSxcblxuICBfY2xlYXJSZXZlYWxUaW1lcigpIHtcbiAgICBpZiAodGhpcy5fcmV2ZWFsVGltZXIpIHtcbiAgICAgIGNsZWFyVGltZW91dCh0aGlzLl9yZXZlYWxUaW1lcik7XG4gICAgICB0aGlzLl9yZXZlYWxUaW1lciA9IG51bGw7XG4gICAgfVxuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlv6vpgJ/mqKHlvI8gwrcg5a2m5Lmg6Zi25q61IOKUgOKUgOKUgFxuICAvLyDngrnljZXor43ooYzvvJrlj5Hlo7DvvIjnuq/mtY/op4jvvIzkuI3orrDmlbDmja7vvIlcbiAgb25MaXN0VGFwKGU6IGFueSkge1xuICAgIGNvbnN0IHdvcmQgPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC53b3JkIGFzIHN0cmluZztcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICB9LFxuXG4gIC8vIOOAjOS4jeiupOivhuOAjeaPreekuuetlOahiOWQju+8jOeCueOAjOS4i+S4gOS4quOAjee7p+e7rVxuICBvblJldmVhbE5leHQoKSB7XG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgIHRoaXMuc2V0RGF0YSh7IHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsIGlzRmxpcHBlZDogZmFsc2UsIHNob3dNZWFuaW5nOiBmYWxzZSB9KTtcbiAgICB0aGlzLm5leHRXb3JkKCk7XG4gIH0sXG5cbiAgbmV4dFdvcmQoKSB7XG4gICAgLy8g6Ziy5b6h77ya6Zif5YiX5byC5bi477yI56m66Zif5YiXL+S4i+agh+i2iueVjO+8ieaXtuebtOaOpemHjeW8gOS4gOi9ru+8jOmBv+WFjeeZveWxj+WNoeatu1xuICAgIGlmICghdGhpcy5kYXRhLnF1ZXVlIHx8IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IG5leHQgPSB0aGlzLmRhdGEuY3VycmVudEluZGV4ICsgMTtcbiAgICBpZiAobmV4dCA+PSB0aGlzLmRhdGEucXVldWUubGVuZ3RoKSB7XG4gICAgICB0aGlzLmZpbmlzaFJvdW5kKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjdXJyZW50SW5kZXg6IG5leHRcbiAgICB9LCAoKSA9PiB7XG4gICAgICAvLyDkuLrmlrDor43noa7lrprlh7rpopjmlrnlvI/vvIhtaXgg5qih5byP5LiL5q+P5Liq6K+N6ZqP5py65Y2h54mHL+mAieaLqS/mi7zlhpnvvInvvIzlubbph43nva7nrZTpopjnirbmgIFcbiAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICAgIC8vIOmihOWKoOi9veS4i+S4i+S4quivjVxuICAgICAgY29uc3QgYWZ0ZXJOZXh0ID0gdGhpcy5kYXRhLnF1ZXVlW25leHQgKyAxXTtcbiAgICAgIGlmIChhZnRlck5leHQpIHByZWxvYWRBdWRpbyhhZnRlck5leHQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgZmluaXNoUm91bmQoKSB7XG4gICAgLy8g5pys6L2u5bey57uT5p2f77ya5riF5o6J6YeN5bu65a6I5Y2r55qEIGtlee+8jOehruS/neS4i+asoei/m+WFpemhtemdou+8iOS7jummlumhteeCueKAnOiDjOWNleivjeKAnS/liIcgdGFiIOWbnuadpe+8iVxuICAgIC8vIOS4jeS8muWRveS4reKAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneiAjOWNoeWcqOacgOWQjuS4gOS4quivje+8iOatpOaXtiBfYW5zd2VyZWRTZXQg5bey5ruh77yM5oyJ6ZKu5YWo5peg5Y+N5bqU77yJXG4gICAgdGhpcy5fbG9hZGVkS2V5ID0gJyc7XG4gICAgY29uc3QgdG90YWwgPSB0aGlzLmRhdGEudG90YWxDb3VudDtcbiAgICBjb25zdCBrbm93biA9IHRoaXMuZGF0YS5rbm93bkNvdW50O1xuICAgIGNvbnN0IHJhdGUgPSB0b3RhbCA+IDAgPyBNYXRoLnJvdW5kKChrbm93biAvIHRvdGFsKSAqIDEwMCkgOiAwO1xuICAgIGxldCBwcmFpc2UgPSAn57un57ut5Yqg5rK577yBJztcbiAgICBpZiAocmF0ZSA+PSA5MCkgcHJhaXNlID0gJ+WkquajkuS6hu+8jOWHoOS5juWFqOmDqOaOjOaPoe+8gSc7XG4gICAgZWxzZSBpZiAocmF0ZSA+PSA3MCkgcHJhaXNlID0gJ+S4jemUmeWTpu+8jOe7p+e7reS/neaMge+8gSc7XG4gICAgZWxzZSBpZiAocmF0ZSA+PSA1MCkgcHJhaXNlID0gJ+i/mOmcgOWkmuWkjeS5oOWHoOmBjSc7XG5cbiAgICAvLyDorrDkvY/mnKzova7pmJ/liJfvvIzkvpvjgIzlpI3kuaDmnKzova7jgI3ljp/moLfph43liLfvvIjkuI3mjaLor43vvIlcbiAgICB0aGlzLl9sYXN0Um91bmRRdWV1ZSA9IHRoaXMuZGF0YS5xdWV1ZS5zbGljZSgpO1xuXG4gICAgLy8g5ZCM5q2l5a2m5Lmg5pWw5o2u5Yiw5LqR56uvXG4gICAgdGhpcy5zeW5jVG9DbG91ZCgpO1xuXG4gICAgLy8g5pi+56S65YWo5bGP57uT5p6c6aG1XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHNob3dSZXN1bHQ6IHRydWUsXG4gICAgICByZXN1bHRSYXRlOiByYXRlLFxuICAgICAgcmVzdWx0UHJhaXNlOiBwcmFpc2VcbiAgICAgIC8vIHJlbWluZGVyU3Vic2NyaWJlZDogaXNSZW1pbmRlclN1YnNjcmliZWQoKSAvLyDlrabkuaDmj5DphpLlt7LkuIvnur/vvIgyMDI2LTA4LTMx77yJXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5byA5ZCv5a2m5Lmg5o+Q6YaS77yI5bey5LiL57q/IDIwMjYtMDgtMzHvvJrkuIDmrKHmgKforqLpmIXpnIDph43lpI3mjojmnYPvvIzkvZPpqoznuYHnkJDvvIlcbiAgLy8gb25TdWJzY3JpYmVSZW1pbmRlcigpIHtcbiAgLy8gICBpZiAoaXNSZW1pbmRlclN1YnNjcmliZWQoKSkgcmV0dXJuO1xuICAvLyAgIHJlcXVlc3RSZW1pbmRlclN1YnNjcmliZSgpLnRoZW4oKGFjY2VwdGVkKSA9PiB7XG4gIC8vICAgICB0aGlzLnNldERhdGEoeyByZW1pbmRlclN1YnNjcmliZWQ6IGFjY2VwdGVkIH0pO1xuICAvLyAgICAgaWYgKGFjY2VwdGVkKSB7XG4gIC8vICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5bey5byA5ZCv5a2m5Lmg5o+Q6YaSJywgaWNvbjogJ3N1Y2Nlc3MnIH0pO1xuICAvLyAgICAgfVxuICAvLyAgIH0pO1xuICAvLyB9LFxuXG4gIC8vIOe7k+aenOmhte+8muWGjeadpeS4gOi9rlxuICBvblJlc3VsdFJlc3RhcnQoKSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1Jlc3VsdDogZmFsc2UgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrlpI3kuaDmnKzova7vvIjnlKjliJrogIPlroznmoTljp/pmJ/liJfph43liLfkuIDpgY3vvIzkuI3orqHlhaXntK/orqHmlrDor43vvIlcbiAgX2xhc3RSb3VuZFF1ZXVlOiBbXSBhcyBXb3JkSXRlbVtdLFxuXG4gIG9uUmVzdWx0UmV2aWV3Um91bmQoKSB7XG4gICAgY29uc3QgbGFzdCA9IHRoaXMuX2xhc3RSb3VuZFF1ZXVlO1xuICAgIGlmICghbGFzdCB8fCBsYXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfmnKzova7pmJ/liJflt7LkuI3lnKjvvIzor5Xor5Xlho3mnaXkuIDova4nLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJzsgLy8g57uV6L+H4oCc5pWw5o2u5pyq5Y+Y6Lez6L+H6YeN5bu64oCd5a6I5Y2rXG4gICAgdGhpcy5fYW5zd2VyZWRTZXQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICAvLyDlpI3kuaDova7kuI3orqHlhaXntK/orqHmlrDor43vvJrmuIXnqbrmlrDor43pm4blkIjvvIhfaXNOZXdXb3JkIOi/lOWbniBmYWxzZe+8iVxuICAgIHRoaXMuX25ld1dvcmRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBjb25zdCByZXBvcnRlZE1hcDogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgbGFzdCkge1xuICAgICAgaWYgKGlzV29yZFJlcG9ydGVkKHcud29yZCkpIHJlcG9ydGVkTWFwW3cud29yZF0gPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgc2hvd1Jlc3VsdDogZmFsc2UsXG4gICAgICBxdWV1ZTogbGFzdCxcbiAgICAgIF93b3JkQm9va1dvcmRzOiB0aGlzLmRhdGEuX3dvcmRCb29rV29yZHMsXG4gICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICB0b3RhbENvdW50OiBsYXN0Lmxlbmd0aCxcbiAgICAgIHN0YXR1c0xhYmVsOiAn5aSN5LmgJyxcbiAgICAgIHF1aWNrTGVhcm5pbmc6IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUgPT09ICdxdWljaycsXG4gICAgICBxdWlja1Vua25vd246IHt9LFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrov5Tlm55cbiAgb25SZXN1bHRCYWNrKCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXN1bHQ6IGZhbHNlIH0pO1xuICAgIHd4LnN3aXRjaFRhYih7IHVybDogJy9wYWdlcy9pbmRleC9pbmRleCcgfSk7XG4gIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5YiG5Lqr5omT5Y2h5rW35oqlXG4gIG9uU2hhcmVQb3N0ZXIoKSB7XG4gICAgLy8g6K6w5b2V4oCc5LuO5rW35oql6aG16L+U5Zue5pe25LiN6YeN5byA5paw5LiA6L2u4oCd77yM5bm26K6w5L2P6L+U5Zue5ZCO5piv5ZCm6KaB5oGi5aSN57uT5p6c6aG1XG4gICAgdGhpcy5fc2tpcEluaXRPblNob3cgPSB0cnVlO1xuICAgIHRoaXMuX3Jlc3RvcmVSZXN1bHRPblNob3cgPSB0aGlzLmRhdGEuc2hvd1Jlc3VsdDtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiBmYWxzZSB9KTtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogYC9wYWdlcy9wb3N0ZXIvcG9zdGVyP3JhdGU9JHt0aGlzLmRhdGEucmVzdWx0UmF0ZX1gXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5ZCM5q2l5a2m5Lmg57uf6K6h5Yiw5LqR56uv77yI57uPIHN5bmNVc2VyIOS6keWHveaVsO+8muacjeWKoeerr+WQiOW5tuWPlui+g+Wkp+WAvO+8jOmYsuWOhuWPsuiiq+WGsuWwj++8iVxuICBzeW5jVG9DbG91ZCgpIHtcbiAgICBzeW5jU3RhdHNUb0Nsb3VkKGdldFN0YXRzKCkpO1xuICB9LFxuXG4gIC8vIOi9rOWPkee7meWlveWPi1xuICBvblNoYXJlQXBwTWVzc2FnZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6ICfmiJHlnKjnlKjor43moLnorrDlv4bms5Xog4zljZXor43vvIzkuIDotbfmnaXvvIEnLFxuICAgICAgcGF0aDogJy9wYWdlcy9pbmRleC9pbmRleCdcbiAgICB9O1xuICB9LFxuXG4gIC8vIOWIhuS6q+WIsOaci+WPi+WciO+8iOWNlemhteaooeW8j++8iVxuICBvblNoYXJlVGltZWxpbmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiAn5oiR5Zyo55So6K+N5qC56K6w5b+G5rOV6IOM5Y2V6K+N77yM5LiA6LW35p2l77yBJ1xuICAgIH07XG4gIH0sXG59KTtcbiJdfQ==