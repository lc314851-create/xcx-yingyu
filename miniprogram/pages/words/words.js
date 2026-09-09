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
        listAnswered: {},
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
            listAnswered: {},
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
            listAnswered: {},
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
                    listAnswered: {}
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
        else if (type === 'quickTest') {
            const modes = ['card', 'choice', 'spell', 'mix'];
            const mode = modes[idx];
            if (!mode)
                return;
            this._clearRevealTimer();
            this._answeredSet = new Set();
            this.setData({
                showSheet: false,
                quickLearning: false,
                practiceMode: mode,
                modeIndex: ['card', 'choice', 'spell', 'mix'].indexOf(mode),
                currentIndex: 0,
                knownCount: 0,
                unknownCount: 0,
                revealAfterUnknown: false,
                showMeaning: false,
                isFlipped: false,
                spellInput: '',
                spellFeedback: 'none',
                choiceSelected: -1,
                listAnswered: {}
            }, () => {
                this._applyModeForCurrent();
            });
        }
    },
    onModeTap() {
        const modes = ['card', 'choice', 'spell', 'mix', 'quick'];
        this._openSheet('mode', '学习模式', modes.map((m, i) => ({ label: this.data.modeLabels[i], active: m === this.data.practiceMode })));
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
        }, 2500);
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
            listAnswered: {},
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3b3Jkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLDZDQXFCMkI7QUFFM0IsNkNBQW1EO0FBQ25ELHlEQUFzRDtBQUN0RCw0Q0FBMkQ7QUFDM0QsNkNBQTREO0FBQzVELHVEQUFnRjtBQUNoRix5REFBc0Y7QUFHdEYsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUM7QUFJekMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQUUzQyxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFHckMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQVEzQyxJQUFJLENBQUM7SUFDSCxJQUFJLEVBQUU7UUFFSixRQUFRLEVBQUUsTUFBTTtRQUNoQixTQUFTLEVBQUUsQ0FBQztRQUVaLEtBQUssRUFBRSxFQUFnQjtRQUN2QixZQUFZLEVBQUUsQ0FBQztRQUVmLFdBQVcsRUFBRSxLQUFLO1FBRWxCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLENBQUM7UUFDZixVQUFVLEVBQUUsQ0FBQztRQUViLFFBQVEsRUFBRSxDQUFDO1FBQ1gsYUFBYSxFQUFFLENBQUM7UUFFaEIsV0FBVyxFQUFFLElBQUk7UUFFakIsT0FBTyxFQUFFLElBQUk7UUFFYixPQUFPLEVBQUUsSUFBSTtRQUViLFNBQVMsRUFBRSxLQUFrQjtRQUU3QixTQUFTLEVBQUUsRUFBRTtRQUViLGFBQWEsRUFBRSxDQUFDO1FBRWhCLFNBQVMsRUFBRSxDQUFDO1FBQ1osWUFBWSxFQUFFLENBQUM7UUFFZixjQUFjLEVBQUUsSUFBSTtRQUNwQixhQUFhLEVBQUUsUUFBUTtRQUl2QixZQUFZLEVBQUUsTUFBc0I7UUFFcEMsVUFBVSxFQUFFLE1BQThCO1FBRTFDLGFBQWEsRUFBRSxFQUFvQjtRQUVuQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRWxCLGFBQWEsRUFBRSxLQUFLO1FBRXBCLFVBQVUsRUFBRSxFQUFFO1FBRWQs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Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBwYWdlcy93b3Jkcy93b3Jkcy50c1xuaW1wb3J0IHsgV29yZEl0ZW0gfSBmcm9tICcuLi8uLi9kYXRhL3R5cGVzJztcbmltcG9ydCB7XG4gIGdldEN1cnJlbnRCb29rSWQsXG4gIGdldEFsbFByb2dyZXNzLFxuICByZWNvcmRXb3JkUHJvZ3Jlc3MsXG4gIHJlY29yZFN0dWR5LFxuICBnZXRCb29rUHJvZ3Jlc3NTdGF0cyxcbiAgZ2V0U3RhdHMsXG4gIHN5bmNTdGF0c1RvQ2xvdWQsXG4gIGhhc1NlbGVjdGVkQm9vayxcbiAgZ2V0U3R1ZHlNb2RlLFxuICBzZXRTdHVkeU1vZGUsXG4gIGdldEJhdGNoU2l6ZSxcbiAgc2V0QmF0Y2hTaXplLFxuICBnZXRQcmFjdGljZU1vZGUsXG4gIHNldFByYWN0aWNlTW9kZSxcbiAgZ2V0T3JkZXJNb2RlLFxuICBzZXRPcmRlck1vZGUsXG4gIGdldFRvZGF5TGVhcm5lZFdvcmRzLFxuICBnZXRBY2NlbnQsXG4gIHNldEFjY2VudCxcbiAgYWRkVG9Xcm9uZ0Jvb2tcbn0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHR5cGUgeyBQcmFjdGljZU1vZGUsIENvbmNyZXRlUHJhY3RpY2VNb2RlLCBBY2NlbnQsIFN0dWR5TW9kZSB9IGZyb20gJy4uLy4uL3V0aWxzL3N0b3JlJztcbmltcG9ydCB7IHRvQ29uY3JldGVNb2RlIH0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHsgZ2V0Qm9va0J5SWQgfSBmcm9tICcuLi8uLi91dGlscy93b3JkU2VydmljZSc7XG5pbXBvcnQgeyB3b3JkQm9va3MgYXMgbG9jYWxCb29rcyB9IGZyb20gJy4uLy4uL2RhdGEvaW5kZXgnO1xuaW1wb3J0IHsgcGxheUF1ZGlvLCBwcmVsb2FkQXVkaW8gfSBmcm9tICcuLi8uLi91dGlscy9hdWRpbyc7XG5pbXBvcnQgeyByZXBvcnRXb3JkLCBpc1dvcmRSZXBvcnRlZCwgUmVwb3J0VHlwZSB9IGZyb20gJy4uLy4uL3V0aWxzL3dvcmRSZXBvcnQnO1xuaW1wb3J0IHsgY29sbGVjdFRvZGF5Um93cywgc2hvd0V4cG9ydFNoZWV0LCBUb2RheVJvdyB9IGZyb20gJy4uLy4uL3V0aWxzL3RvZGF5RXhwb3J0JztcblxuLy8g5aSN5Lmg5qih5byP5LiA5qyh5oCn5YWl5Y+j5qCH5b+X77yI6aaW6aG14oCc5b6F5aSN5Lmg4oCd54K55Ye75pe25YaZ5YWl77yMd29yZHMg6aG1IG9uU2hvdyDmtojotLnvvIlcbmNvbnN0IFJFVklFV19NT0RFX0tFWSA9ICdiY19yZXZpZXdfbW9kZSc7XG5cbi8vIOiusOW/huS9k+ajgOmrmOWNseivjeS4gOi9ruW8j+WFpeWPo+agh+W/l++8iG1lbW9yeSDpobXjgIznq4vljbPlpI3kuaDov5nkupvor43jgI3lhpnlhaXvvIx3b3JkcyDpobUgb25TaG93IOa2iOi0ue+8iVxuLy8g5YC877yaeyBib29rSWQ6IHN0cmluZywgd29yZHM6IHN0cmluZ1tdIH3vvIzkuI7mnKzor43kuabljLnphY3miY3nlJ/mlYhcbmNvbnN0IE1FTU9SWV9XT1JEU19LRVkgPSAnYmNfbWVtb3J5X3dvcmRzJztcbi8vIOmmlumhteKAnOWtpuaWsOivjeKAneWFpeWPo+agh+W/l++8iOS4gOasoeaAp++8ie+8muW8uuWItuW8gOaWsOS4gOi9ru+8jOS4jei1sOKAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneWuiOWNq1xuY29uc3QgTkVXX1JPVU5EX0tFWSA9ICdiY19uZXdfcm91bmQnO1xuXG4vLyDigJzku4rml6XlpI3nm5jigJ3lhaXlj6PmoIflv5fvvIjkuIDmrKHmgKfvvInvvJrmnKzova7lj6rlpI3nm5jku4rlpKnlrabov4fnmoTor43vvIjmiJHnmoTpobUv6aaW6aG15YaZ5YWl77yJXG5jb25zdCBUT0RBWV9SRVZJRVdfS0VZID0gJ2JjX3RvZGF5X3Jldmlldyc7XG5cbi8vIOWbm+mAieS4gOmAiemhueaOpeWPo1xuaW50ZXJmYWNlIENob2ljZU9wdGlvbiB7XG4gIG1lYW5pbmc6IHN0cmluZztcbiAgaXNDb3JyZWN0OiBib29sZWFuO1xufVxuXG5QYWdlKHtcbiAgZGF0YToge1xuICAgIC8vIOW9k+WJjeivjeS5puS/oeaBr1xuICAgIGJvb2tOYW1lOiAn5Yid5Lit6K+N5rGHJyxcbiAgICBib29rVG90YWw6IDAsXG4gICAgLy8g5pys6L2u5Y2V6K+N6Zif5YiXXG4gICAgcXVldWU6IFtdIGFzIFdvcmRJdGVtW10sXG4gICAgY3VycmVudEluZGV4OiAwLFxuICAgIC8vIOaYr+WQpuaYvuekuumHiuS5ie+8iOWNoeeJh+aooeW8j+eUqO+8iVxuICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAvLyDmnKzova7lrabkuaDov5vluqZcbiAgICBrbm93bkNvdW50OiAwLFxuICAgIHVua25vd25Db3VudDogMCxcbiAgICB0b3RhbENvdW50OiAwLFxuICAgIC8vIOW+heWkjeS5oOaVsFxuICAgIGR1ZUNvdW50OiAwLFxuICAgIG1hc3RlcmVkQ291bnQ6IDAsXG4gICAgLy8g54q25oCB5qCH562+XG4gICAgc3RhdHVzTGFiZWw6ICfmlrDor40nLFxuICAgIC8vIOaYr+WQpui/mOacieabtOWkmlxuICAgIGhhc01vcmU6IHRydWUsXG4gICAgLy8g5Yqg6L2954q25oCBXG4gICAgbG9hZGluZzogdHJ1ZSxcbiAgICAvLyDlrabkuaDojIPlm7TnrZvpgInvvIjlhajpg6gv6auY6aKRL+iZmuivjS/lrp7or43vvIlcbiAgICBzdHVkeU1vZGU6ICdhbGwnIGFzIFN0dWR5TW9kZSxcbiAgICAvLyDmr4/ova7lrabkuaDljZXor43mlbDvvIjpobbpg6jmjInpkq7lj6/osIPvvIlcbiAgICBiYXRjaFNpemU6IDEwLFxuICAgIC8vIOmrmOmikeivjeaVsOmHj1xuICAgIGhpZ2hGcmVxQ291bnQ6IDAsXG4gICAgLy8g6Jma6K+NL+WunuivjeaVsOmHj1xuICAgIGZ1bmNDb3VudDogMCxcbiAgICBjb250ZW50Q291bnQ6IDAsXG4gICAgLy8g5a2m5Lmg6IyD5Zu05qCH562+77yId3htbCDlsZXnpLrvvIlcbiAgICB3b3JkQ2xhc3NMYWJlbDogJ+WFqOmDqCcsXG4gICAgY3VycmVudEJvb2tJZDogJ2p1bmlvcicsXG4gICAgLy8gcmVtaW5kZXJTdWJzY3JpYmVkOiBmYWxzZSwgLy8g5a2m5Lmg5o+Q6YaS5bey5LiL57q/77yIMjAyNi0wOC0zMe+8iVxuICAgIC8vIOKUgOKUgOKUgCDpmLbmrrXkuIDmlrDlop4g4pSA4pSA4pSAXG4gICAgLy8g57uD5Lmg5qih5byP77ya5Y2h54mH57+76Z2iIC8g5Zub6YCJ5LiAIC8g5ou85YaZIC8g5re35ZCI77yIbWl477yJXG4gICAgcHJhY3RpY2VNb2RlOiAnY2FyZCcgYXMgUHJhY3RpY2VNb2RlLFxuICAgIC8vIOW9k+WJjeivjeWunumZhea4suafk+eahOWHuumimOaWueW8j++8iG1peCDmqKHlvI/kuIvmr4/kuKror43pmo/mnLrvvIzlhbbkvZnkuI4gcHJhY3RpY2VNb2RlIOS4gOiHtO+8iVxuICAgIGFjdGl2ZU1vZGU6ICdjYXJkJyBhcyBDb25jcmV0ZVByYWN0aWNlTW9kZSxcbiAgICAvLyDlm5vpgInkuIDpgInpoblcbiAgICBjaG9pY2VPcHRpb25zOiBbXSBhcyBDaG9pY2VPcHRpb25bXSxcbiAgICAvLyDlm5vpgInkuIDmmK/lkKblt7LpgIlcbiAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgLy8g5Zub6YCJ5LiA5piv5ZCm562U5a+5XG4gICAgY2hvaWNlQ29ycmVjdDogZmFsc2UsXG4gICAgLy8g5ou85YaZ5qih5byP6L6T5YWl5YC8XG4gICAgc3BlbGxJbnB1dDogJycsXG4gICAgLy8g5ou85YaZ5Y+N6aaI54q25oCB77yabm9uZSAvIGNvcnJlY3QgLyB3cm9uZ1xuICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAvLyDlj5Hpn7Plj6Ppn7PlgY/lpb1cbiAgICBhY2NlbnQ6ICd1cycgYXMgQWNjZW50LFxuICAgIC8vIOe7k+aenOmhtVxuICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgIHJlc3VsdFJhdGU6IDAsXG4gICAgcmVzdWx0UHJhaXNlOiAnJyxcbiAgICAvLyDnv7vpnaLliqjnlLvnirbmgIFcbiAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgIC8vIOWNoeeJh+aooeW8j+OAjOS4jeiupOivhuOAjeaPreekuuetlOahiOeKtuaAge+8iHRydWUg5pe25bGV56S644CM5LiL5LiA5Liq44CN5oyJ6ZKu5bm26ZSB5a6a57+76Z2i77yJXG4gICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAvLyDkuIrkuIDpopjlr7nplJnvvIjnlKjkuo7nu5PmnpzpobXliKTmlq3mmK/lkKborrDlvZXvvIlcbiAgICBfd29yZEJvb2tXb3JkczogW10gYXMgV29yZEl0ZW1bXSxcbiAgICAvLyDliJfooajmqKHlvI/vvJrmr4/or43kvZznrZTnirbmgIHvvIh3b3JkIOKGkiAna25vd24nIHwgJ3Vua25vd24n77yJ77yM6K6k6K+G55qE6K+N5oqY5Y+g572u54GwXG4gICAgbGlzdEFuc3dlcmVkOiB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICAgIC8vIOW/q+mAn+aooeW8j+mYtuauteW8gOWFs++8mnRydWU95b+r6YCf5a2m5Lmg77yI5YiX6KGo5rWP6KeI77yJ77yMZmFsc2U95qOA5rWL6Zi25q6177yI5Zub6YCJ5LiA5qih5byP77yJXG4gICAgcXVpY2tMZWFybmluZzogZmFsc2UsXG4gICAgLy8g5Ye66aKY6aG65bqP77ya6ZqP5py6IC8g6aG65bqPXG4gICAgb3JkZXJNb2RlOiAncmFuZG9tJyBhcyAncmFuZG9tJyB8ICdzZXF1ZW50aWFsJyxcbiAgICAvLyDilIDilIDilIAg5Ye66aKY5qih5byP5LiL5ouJ5qGGIOKUgOKUgOKUgFxuICAgIG1vZGVMYWJlbHM6IFsn5Y2h54mHJywgJ+mAieaLqScsICfmi7zlhpknLCAn5re35ZCIJywgJ+W/q+mAnyddIGFzIHN0cmluZ1tdLFxuICAgIG1vZGVJbmRleDogMCxcbiAgICAvLyDilIDilIDilIAg6Ieq5a6a5LmJ6YCJ5oup5by55qGGIOKUgOKUgOKUgFxuICAgIHNob3dTaGVldDogZmFsc2UsXG4gICAgc2hlZXRUaXRsZTogJycsXG4gICAgc2hlZXRPcHRpb25zOiBbXSBhcyBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IGFjdGl2ZTogYm9vbGVhbiB9PixcbiAgICBzaGVldFR5cGU6ICcnIGFzIHN0cmluZyxcbiAgICAvLyDilIDilIDilIAg57qg6ZSZ5LiK5oqlIOKUgOKUgOKUgFxuICAgIHNob3dSZXBvcnQ6IGZhbHNlLFxuICAgIHJlcG9ydFR5cGU6ICcnIGFzIFJlcG9ydFR5cGUgfCAnJyxcbiAgICByZXBvcnREZXNjOiAnJyxcbiAgICByZXBvcnRlZE1hcDoge30gYXMgUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gLy8g5bey5LiK5oql6K+N77yId29yZCDihpIgdHJ1Ze+8iVxuICB9LFxuXG4gIG9uTG9hZCgpIHt9LFxuXG4gIC8vIOacrOi9ruW3suS9nOetlOeahOS4i+agh+mbhuWQiO+8iOS/ruWkjeWIh+aooeW8j+WQjuWQjOS4gOivjemHjeWkjeiuoeaVsOeahCBidWfvvIlcbiAgX2Fuc3dlcmVkU2V0OiBuZXcgU2V0PG51bWJlcj4oKSBhcyBTZXQ8bnVtYmVyPixcblxuICBvblNob3coKSB7XG4gICAgLy8g5LuO5YiG5Lqr5rW35oql6aG16L+U5Zue77ya5L+d55WZ5b2T5YmN5LiA6L2u57uT5p6c77yM5LiN6YeN5paw5Yqg6L295paw55qE5LiA6L2uXG4gICAgaWYgKHRoaXMuX3NraXBJbml0T25TaG93KSB7XG4gICAgICB0aGlzLl9za2lwSW5pdE9uU2hvdyA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMuX3Jlc3RvcmVSZXN1bHRPblNob3cpIHtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgc2hvd1Jlc3VsdDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3Jlc3RvcmVSZXN1bHRPblNob3cgPSBmYWxzZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8g5raI6LS56aaW6aG14oCc5b6F5aSN5Lmg4oCd5YWl5Y+j5qCH5b+X77ya5pys6L2u5LuF5aSN5Lmg5Yiw5pyf5b6F5aSN5Lmg6K+N77yI5LiA5qyh5oCn77yJXG4gICAgaWYgKHd4LmdldFN0b3JhZ2VTeW5jKFJFVklFV19NT0RFX0tFWSkgPT09IDEpIHtcbiAgICAgIHd4LnJlbW92ZVN0b3JhZ2VTeW5jKFJFVklFV19NT0RFX0tFWSk7XG4gICAgICB0aGlzLl9yZXZpZXdNb2RlID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcmV2aWV3TW9kZSA9IGZhbHNlO1xuICAgIH1cbiAgICAvLyDmtojotLnorrDlv4bkvZPmo4DlhaXlj6PmoIflv5fvvJrmnKzova7lj6rlpI3kuaDkvZPmo4DmuIXljZXph4znmoTpq5jljbHor43vvIjkuIDmrKHmgKfvvIzot6jor43kuabkuKLlvIPvvIlcbiAgICBjb25zdCBtZW1GbGFnID0gd3guZ2V0U3RvcmFnZVN5bmMoTUVNT1JZX1dPUkRTX0tFWSkgYXMgeyBib29rSWQ6IHN0cmluZzsgd29yZHM6IHN0cmluZ1tdIH0gfCAnJztcbiAgICB3eC5yZW1vdmVTdG9yYWdlU3luYyhNRU1PUllfV09SRFNfS0VZKTtcbiAgICBpZiAoXG4gICAgICBtZW1GbGFnICYmIHR5cGVvZiBtZW1GbGFnID09PSAnb2JqZWN0JyAmJlxuICAgICAgbWVtRmxhZy5ib29rSWQgPT09IGdldEN1cnJlbnRCb29rSWQoKSAmJlxuICAgICAgQXJyYXkuaXNBcnJheShtZW1GbGFnLndvcmRzKSAmJiBtZW1GbGFnLndvcmRzLmxlbmd0aCA+IDBcbiAgICApIHtcbiAgICAgIHRoaXMuX21lbW9yeVdvcmRzID0gbWVtRmxhZy53b3JkcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbWVtb3J5V29yZHMgPSBudWxsO1xuICAgIH1cbiAgICAvLyDpppbpobXkuLvliqjngrnigJzlrabmlrDor43igJ3vvJrlvLrliLblvIDmlrDkuIDova7vvIjmuIXmjonph43lu7rlrojljavnmoQga2V577yJXG4gICAgaWYgKHd4LmdldFN0b3JhZ2VTeW5jKE5FV19ST1VORF9LRVkpID09PSAxKSB7XG4gICAgICB3eC5yZW1vdmVTdG9yYWdlU3luYyhORVdfUk9VTkRfS0VZKTtcbiAgICAgIHRoaXMuX2xvYWRlZEtleSA9ICcnO1xuICAgIH1cblxuICAgIC8vIOa2iOi0ueKAnOS7iuaXpeWkjeebmOKAneWFpeWPo+agh+W/l++8muacrOi9ruWPquWkjeebmOS7iuWkqeWtpui/h+eahOivje+8iOS4gOasoeaAp++8iVxuICAgIGlmICh3eC5nZXRTdG9yYWdlU3luYyhUT0RBWV9SRVZJRVdfS0VZKSA9PT0gMSkge1xuICAgICAgd3gucmVtb3ZlU3RvcmFnZVN5bmMoVE9EQVlfUkVWSUVXX0tFWSk7XG4gICAgICB0aGlzLl90b2RheVJldmlld01vZGUgPSB0cnVlO1xuICAgICAgdGhpcy5fbG9hZGVkS2V5ID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3RvZGF5UmV2aWV3TW9kZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIOmmluasoeS9v+eUqO+8mui3s+i9rOivjeS5pumAieaLqemhtVxuICAgIGlmICghaGFzU2VsZWN0ZWRCb29rKCkpIHtcbiAgICAgIHd4Lm5hdmlnYXRlVG8oeyB1cmw6ICcvcGFnZXMvYm9va2xpc3QvYm9va2xpc3QnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgY3VycmVudEJvb2tJZDogZ2V0Q3VycmVudEJvb2tJZCgpLFxuICAgICAgcHJhY3RpY2VNb2RlOiBnZXRQcmFjdGljZU1vZGUoKSxcbiAgICAgIG1vZGVJbmRleDogWydjYXJkJywgJ2Nob2ljZScsICdzcGVsbCcsICdtaXgnLCAncXVpY2snXS5pbmRleE9mKGdldFByYWN0aWNlTW9kZSgpKSxcbiAgICAgIGFjY2VudDogZ2V0QWNjZW50KCksXG4gICAgICBvcmRlck1vZGU6IGdldE9yZGVyTW9kZSgpXG4gICAgICAvLyByZW1pbmRlclN1YnNjcmliZWQ6IGlzUmVtaW5kZXJTdWJzY3JpYmVkKCkgLy8g5a2m5Lmg5o+Q6YaS5bey5LiL57q/77yIMjAyNi0wOC0zMe+8iVxuICAgIH0pO1xuICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gIH0sXG5cbiAgb25VbmxvYWQoKSB7XG4gICAgLy8g6aG16Z2i5Y246L295pe25riF55CG6Z+z6aKR5LiK5LiL5paH77yI5aaC5p6c5pyJ77yJXG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICB9LFxuXG4gIGFzeW5jIGluaXRCYXRjaCgpIHtcbiAgICAvLyDku4rml6XlpI3nm5jova7vvJrpmJ/liJcgPSDku4rlpKnlrabov4fnmoTor43vvIjot6jor43kuabvvInvvIzkuI3otbDluLjop4TmjpLnqItcbiAgICBpZiAodGhpcy5fdG9kYXlSZXZpZXdNb2RlKSB7XG4gICAgICB0aGlzLl90b2RheVJldmlld01vZGUgPSBmYWxzZTtcbiAgICAgIGNvbnN0IG9rID0gYXdhaXQgdGhpcy5faW5pdFRvZGF5QmF0Y2goKTtcbiAgICAgIGlmICghb2spIGF3YWl0IHRoaXMuX2luaXROb3JtYWxCYXRjaCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faW5pdE5vcm1hbEJhdGNoKCk7XG4gIH0sXG5cbiAgLy8g5LuK5pel5aSN55uY6L2u77ya5oqK5LuK5aSp5a2m6L+H55qE6K+N6YeN5Yi35LiA6YGN77yI5LiN6K6k6K+G55qE5o6S5YmN6Z2i77yJXG4gIGFzeW5jIF9pbml0VG9kYXlCYXRjaCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCB0b2RheXMgPSBnZXRUb2RheUxlYXJuZWRXb3JkcygpO1xuICAgIGlmICh0b2RheXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+S7iuWkqei/mOayoeacieWtpuS5oOiusOW9le+8jOWFiOWtpuWHoOS4quivjeWQpycsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8g5oyJIGJvb2tJZCDliIbnu4Tmi4nor43kuabvvIzmmKDlsITlm57lrozmlbTor43mnaHvvIjmi7/ph4rkuYkv6Z+z5qCHL+ivjeague+8iVxuICAgIGNvbnN0IGJ5Qm9vayA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcbiAgICBmb3IgKGNvbnN0IHQgb2YgdG9kYXlzKSB7XG4gICAgICBjb25zdCBhcnIgPSBieUJvb2suZ2V0KHQuYm9va0lkKSB8fCBbXTtcbiAgICAgIGFyci5wdXNoKHQud29yZCk7XG4gICAgICBieUJvb2suc2V0KHQuYm9va0lkLCBhcnIpO1xuICAgIH1cbiAgICBjb25zdCBxdWV1ZTogV29yZEl0ZW1bXSA9IFtdO1xuICAgIGNvbnN0IGFsbFdvcmRzOiBXb3JkSXRlbVtdID0gW107XG4gICAgY29uc3QgdW5rbm93blNldCA9IG5ldyBTZXQoXG4gICAgICB0b2RheXMuZmlsdGVyKHQgPT4gIXQua25vd24pLm1hcCh0ID0+IHQud29yZC50b0xvd2VyQ2FzZSgpKVxuICAgICk7XG4gICAgZm9yIChjb25zdCBbYmlkLCB3b3Jkc10gb2YgYnlCb29rKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBib29rID0gYXdhaXQgZ2V0Qm9va0J5SWQoYmlkKTtcbiAgICAgICAgaWYgKCFib29rKSBjb250aW51ZTtcbiAgICAgICAgYWxsV29yZHMucHVzaCguLi5ib29rLndvcmRzKTtcbiAgICAgICAgY29uc3Qgd3NldCA9IG5ldyBTZXQod29yZHMubWFwKHcgPT4gdy50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICAgIGZvciAoY29uc3QgdyBvZiBib29rLndvcmRzKSB7XG4gICAgICAgICAgaWYgKHdzZXQuaGFzKHcud29yZC50b0xvd2VyQ2FzZSgpKSkgcXVldWUucHVzaCh3KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdb5LuK5pel5aSN55uYXSDor43kuabliqDovb3lpLHotKUnLCBiaWQsIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgLy8g5LiN6K6k6K+G55qE5o6S5YmN6Z2i77yM562U5ryP55qE5LyY5YWI6KGlXG4gICAgcXVldWUuc29ydCgoYSwgYikgPT5cbiAgICAgICh1bmtub3duU2V0LmhhcyhiLndvcmQudG9Mb3dlckNhc2UoKSkgPyAxIDogMCkgLSAodW5rbm93blNldC5oYXMoYS53b3JkLnRvTG93ZXJDYXNlKCkpID8gMSA6IDApXG4gICAgKTtcblxuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgICB0aGlzLl9hbnN3ZXJlZFNldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIHRoaXMuX25ld1dvcmRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTsgLy8g5aSN55uY5LiN6K6h5YWl57Sv6K6h5paw6K+NXG4gICAgY29uc3QgcmVwb3J0ZWRNYXA6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge307XG4gICAgZm9yIChjb25zdCB3IG9mIHF1ZXVlKSB7XG4gICAgICBpZiAoaXNXb3JkUmVwb3J0ZWQody53b3JkKSkgcmVwb3J0ZWRNYXBbdy53b3JkXSA9IHRydWU7XG4gICAgfVxuICAgIGNvbnN0IHByb2dyZXNzU3RhdHMgPSBnZXRCb29rUHJvZ3Jlc3NTdGF0cyhnZXRDdXJyZW50Qm9va0lkKCkpO1xuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBib29rTmFtZTogJ+S7iuaXpeWkjeebmCcsXG4gICAgICBxdWV1ZSxcbiAgICAgIF93b3JkQm9va1dvcmRzOiBhbGxXb3JkcyxcbiAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgIHF1aWNrTGVhcm5pbmc6IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUgPT09ICdxdWljaycsXG4gICAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICB0b3RhbENvdW50OiBxdWV1ZS5sZW5ndGgsXG4gICAgICBkdWVDb3VudDogcHJvZ3Jlc3NTdGF0cy5kdWVDb3VudCxcbiAgICAgIG1hc3RlcmVkQ291bnQ6IHByb2dyZXNzU3RhdHMubWFzdGVyZWRDb3VudCxcbiAgICAgIHN0YXR1c0xhYmVsOiAn5aSN55uYJyxcbiAgICAgIGhhc01vcmU6IGZhbHNlLFxuICAgICAgbG9hZGluZzogZmFsc2UsXG4gICAgICBzaG93UmVzdWx0OiBmYWxzZSxcbiAgICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgbGlzdEFuc3dlcmVkOiB7fSxcbiAgICAgIHJlcG9ydGVkTWFwXG4gICAgfSwgKCkgPT4ge1xuICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGFzeW5jIF9pbml0Tm9ybWFsQmF0Y2goKSB7XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIGNvbnN0IHN0dWR5TW9kZSA9IGdldFN0dWR5TW9kZSgpO1xuICAgIGNvbnN0IHByYWN0aWNlTW9kZSA9IGdldFByYWN0aWNlTW9kZSgpO1xuICAgIGNvbnN0IGFjY2VudCA9IGdldEFjY2VudCgpO1xuICAgIGNvbnN0IGJhdGNoU2l6ZSA9IGdldEJhdGNoU2l6ZSgpO1xuXG4gICAgLy8g6aG16Z2i5bey5pyJ5pWw5o2u5LiU6K+N5LmmL+iuvue9rumDveayoeWPmOaXtu+8jOi3s+i/h+mHjeW7uu+8jOmBv+WFjSBvblNob3cg6YeN5aSN6L+b5YWl5pe25pW06aG16Zeq5LiA5qyhXCLph43mlrDliqDovb1cIlxuICAgIGNvbnN0IG9yZGVyTW9kZSA9IGdldE9yZGVyTW9kZSgpO1xuICAgIGNvbnN0IHdvcmRDbGFzc0xhYmVsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgYWxsOiAn5YWo6YOoJywgaGlnaEZyZXE6ICfpq5jpopHor40nLCBmdW5jOiAn6Jma6K+NJywgY29udGVudDogJ+WunuivjScgfTtcbiAgICBjb25zdCBzZXR0aW5nc0tleSA9IFtib29rSWQsIHN0dWR5TW9kZSwgcHJhY3RpY2VNb2RlLCBhY2NlbnQsIGJhdGNoU2l6ZSwgb3JkZXJNb2RlXS5qb2luKCd8Jyk7XG4gICAgaWYgKFxuICAgICAgdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA+IDAgJiYgIXRoaXMuZGF0YS5zaG93UmVzdWx0ICYmXG4gICAgICAhdGhpcy5fcmV2aWV3TW9kZSAmJiAhdGhpcy5fbWVtb3J5V29yZHMgJiZcbiAgICAgIHRoaXMuX2xvYWRlZEtleSA9PT0gc2V0dGluZ3NLZXlcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fbG9hZGVkS2V5ID0gc2V0dGluZ3NLZXk7XG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuXG4gICAgLy8g6aG16Z2i5bey5pyJ5YaF5a6577yI5o2i5LmmL+W8gOaWsOi9ru+8ie+8muS4jei/myBsb2FkaW5nIOaAge+8jOS/neaMgeaXp+WNoeeJh+WPr+inge+8jFxuICAgIC8vIOmYn+WIl+Wwsee7quWQjuS4gOasoeaAp+abv+aNou+8jOWunueOsFwi5bmz56iz5o2i6L2uXCLml6Dpl6rliqjvvJvku4XpppbmrKHov5vlhaXmiY3mmL7npLrliqDovb3liqjnlLtcbiAgICBpZiAodGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5zZXREYXRhKHsgbG9hZGluZzogdHJ1ZSwgc3R1ZHlNb2RlLCBwcmFjdGljZU1vZGUsIGFjY2VudCwgYmF0Y2hTaXplLCBvcmRlck1vZGUsIHdvcmRDbGFzc0xhYmVsOiB3b3JkQ2xhc3NMYWJlbHNbc3R1ZHlNb2RlXSB8fCAn5YWo6YOoJyB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXREYXRhKHsgc3R1ZHlNb2RlLCBwcmFjdGljZU1vZGUsIGFjY2VudCwgYmF0Y2hTaXplLCBvcmRlck1vZGUsIHdvcmRDbGFzc0xhYmVsOiB3b3JkQ2xhc3NMYWJlbHNbc3R1ZHlNb2RlXSB8fCAn5YWo6YOoJyB9KTtcbiAgICB9XG5cbiAgICBsZXQgYm9vaztcbiAgICB0cnkge1xuICAgICAgYm9vayA9IGF3YWl0IGdldEJvb2tCeUlkKGJvb2tJZCk7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgY29uc29sZS5lcnJvcign6I635Y+W6K+N5Lmm5aSx6LSlJywgZSk7XG4gICAgfVxuXG4gICAgaWYgKCFib29rIHx8ICFib29rLndvcmRzIHx8IGJvb2sud29yZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAvLyDkupHnq6/mi4nlj5blpLHotKXvvIzlsJ3or5XmnKzlnLDnp43lrZDor43lupPlhZzlupVcbiAgICAgIGNvbnN0IGxvY2FsQm9vayA9IGxvY2FsQm9va3MuZmluZChiID0+IGIuaWQgPT09IGJvb2tJZCk7XG4gICAgICBpZiAobG9jYWxCb29rICYmIGxvY2FsQm9vay53b3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGJvb2sgPSBsb2NhbEJvb2s7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNldERhdGEoeyBsb2FkaW5nOiBmYWxzZSwgcXVldWU6IFtdIH0pO1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+ivjeW6k+WKoOi9veS4re+8jOmprOS4iuWwseWlvScsIGljb246ICdub25lJyB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOWkjeS5oC/orrDlv4bkvZPmo4DmqKHlvI/nu5Xov4for43mgKfnrZvpgInvvJrlvoXlpI3kuaDnmoTor43kuI3or6XooqvigJzojIPlm7Q66Jma6K+N4oCd562J6L+H5ruk5o6J77yMXG4gICAgLy8g5ZCm5YiZ6K6h5YiS6YeMIDQzIOS4quW+heWkjeS5oOivjSDiiKkg6Jma6K+NID0gMCDml7bkvJrlh7rnjrDigJzor43kuablt7Llhajpg6jmjozmj6HigJ3nmoTlgYfosaFcbiAgICBjb25zdCBieXBhc3NGaWx0ZXIgPSB0aGlzLl9yZXZpZXdNb2RlIHx8ICEhdGhpcy5fbWVtb3J5V29yZHM7XG5cbiAgICAvLyDmoLnmja7lrabkuaDojIPlm7TnrZvpgInvvIjlhajpg6gv6auY6aKRL+iZmuivjS/lrp7or43vvIlcbiAgICBjb25zdCBoaWdoRnJlcUNvdW50ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LmlzSGlnaEZyZXEpLmxlbmd0aDtcbiAgICBjb25zdCBmdW5jQ291bnQgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcucG9zVGFnID09PSAnZnVuYycpLmxlbmd0aDtcbiAgICBjb25zdCBjb250ZW50Q291bnQgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcucG9zVGFnICE9PSAnZnVuYycpLmxlbmd0aDtcbiAgICBsZXQgd29yZExpc3Q6IFdvcmRJdGVtW107XG4gICAgbGV0IGVtcHR5VGlwID0gJyc7XG4gICAgaWYgKGJ5cGFzc0ZpbHRlcikge1xuICAgICAgd29yZExpc3QgPSBib29rLndvcmRzO1xuICAgIH0gZWxzZSBpZiAoc3R1ZHlNb2RlID09PSAnaGlnaEZyZXEnKSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5pc0hpZ2hGcmVxKTtcbiAgICAgIGVtcHR5VGlwID0gJ+i/meacrOivjeS5puayoeacieagh+azqOmrmOmikeivjSc7XG4gICAgfSBlbHNlIGlmIChzdHVkeU1vZGUgPT09ICdmdW5jJykge1xuICAgICAgd29yZExpc3QgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcucG9zVGFnID09PSAnZnVuYycpO1xuICAgICAgLy8g6K+N5p2h5a6M5YWo5rKh5pyJIHBvc1RhZyDlrZfmrrUgPSDor43kuabmlbDmja7mmK/ml6fniYjvvIjkupHnq6/mnKrmm7TmlrAv6LWw5LqG56eN5a2Q5YWc5bqVL+e8k+WtmOacquWkseaViO+8iVxuICAgICAgaWYgKCFib29rLndvcmRzLnNvbWUodyA9PiAncG9zVGFnJyBpbiB3KSkge1xuICAgICAgICBlbXB0eVRpcCA9ICfor43kuabmlbDmja7mnKrljIXlkKvor43mgKfmoIfms6jvvIzor7fmm7TmlrDor43lupPlkI7ph43or5UnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW1wdHlUaXAgPSAn6L+Z5pys6K+N5Lmm5pqC5peg6Jma6K+N5qCH5rOoJztcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKHN0dWR5TW9kZSA9PT0gJ2NvbnRlbnQnKSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgIT09ICdmdW5jJyk7XG4gICAgICBpZiAoIWJvb2sud29yZHMuc29tZSh3ID0+ICdwb3NUYWcnIGluIHcpKSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+ivjeS5puaVsOaNruacquWMheWQq+ivjeaAp+agh+azqO+8jOivt+abtOaWsOivjeW6k+WQjumHjeivlSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbXB0eVRpcCA9ICfov5nmnKzor43kuabmmoLml6Dlrp7or43moIfms6gnO1xuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHM7XG4gICAgfVxuXG4gICAgaWYgKHdvcmRMaXN0Lmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5zZXREYXRhKHsgbG9hZGluZzogZmFsc2UsIHF1ZXVlOiBbXSwgaGlnaEZyZXFDb3VudCwgZnVuY0NvdW50LCBjb250ZW50Q291bnQgfSk7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogZW1wdHlUaXAsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBjb25zdCBhbGxQcm9ncmVzcyA9IGdldEFsbFByb2dyZXNzKGJvb2tJZCk7XG4gICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcblxuICAgIC8vIOaehOW7uuWtpuS5oOmYn+WIl++8mlxuICAgIC8vIDEuIOS8mOWFiOWPluW+heWkjeS5oOeahOivje+8iG5leHRSZXZpZXcgPD0gbm93IOS4lOS4jeaYryBtYXN0ZXJlZO+8iVxuICAgIC8vIDIuIOWPluacquWtpui/h+eahOaWsOivjVxuICAgIGNvbnN0IGR1ZVdvcmRzOiBXb3JkSXRlbVtdID0gW107XG4gICAgY29uc3QgbmV3V29yZHM6IFdvcmRJdGVtW10gPSBbXTtcblxuICAgIGZvciAoY29uc3QgdyBvZiB3b3JkTGlzdCkge1xuICAgICAgY29uc3QgcCA9IGFsbFByb2dyZXNzW3cud29yZF07XG4gICAgICBpZiAoIXApIHtcbiAgICAgICAgbmV3V29yZHMucHVzaCh3KTtcbiAgICAgIH0gZWxzZSBpZiAocC5zdGF0dXMgIT09ICdtYXN0ZXJlZCcgJiYgcC5uZXh0UmV2aWV3ID4gMCAmJiBwLm5leHRSZXZpZXcgPD0gbm93KSB7XG4gICAgICAgIGR1ZVdvcmRzLnB1c2godyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g6ICD6aKR5o6S5bqP77ya5paw6K+N5oyJIEVDRElDVCDor43popHpmY3luo/vvIjluLjop4Hor43lhYjlrabvvInvvIzkvJjlhYjlrabkvJrogIPor5Xph4zlh7rnjrDmnIDlpJrnmoTor41cbiAgICBuZXdXb3Jkcy5zb3J0KChhLCBiKSA9PiAoYi5mcmVxdWVuY3kgfHwgMCkgLSAoYS5mcmVxdWVuY3kgfHwgMCkpO1xuXG4gICAgLy8g5ZCI5bm26Zif5YiX77ya6buY6K6k5LyY5YWI5aSN5Lmg77yM5YaN5a2m5paw6K+N77yb5aSN5Lmg5qih5byP5LiL5LuF5aSN5Lmg5Yiw5pyf5b6F5aSN5Lmg6K+NXG4gICAgLy8g6ZqP5py65qih5byP5LiL77ya5paw6K+N5LuO6K+N5Lmm5YWo6YOo5pyq5a2m6K+N5Lit6ZqP5py65oq95Y+W77yI6ICM5LiN5piv5oyJ6K+N6aKR5Y+W5YmNIE4g5Liq77yMXG4gICAgLy8g6YG/5YWN6L+e57ut5Yeg6L2u6YGH5Yiw55qE6YO95piv5ZCM5LiA5om56K+N77yJ77yM5aSN5Lmg6K+N5LuN5LyY5YWI5Y2g5L2NXG4gICAgbGV0IHF1ZXVlO1xuICAgIGlmICh0aGlzLl9yZXZpZXdNb2RlKSB7XG4gICAgICBpZiAoZHVlV29yZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIC8vIOayoeacieWIsOacn+W+heWkjeS5oOivje+8muWIh+WbnuW4uOinhOWtpuS5oO+8jOmBv+WFjeepuui9rlxuICAgICAgICB0aGlzLl9yZXZpZXdNb2RlID0gZmFsc2U7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5bey5YWo6YOo5aSN5Lmg5a6M77yM5YiH5Zue5bi46KeE5a2m5LmgJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgICBxdWV1ZSA9IFsuLi5kdWVXb3JkcywgLi4ubmV3V29yZHNdLnNsaWNlKDAsIGJhdGNoU2l6ZSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBxdWV1ZSA9IGR1ZVdvcmRzLnNsaWNlKDAsIGJhdGNoU2l6ZSk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvcmRlck1vZGUgPT09ICdyYW5kb20nKSB7XG4gICAgICAvLyDlpI3kuaDor43lkIzmoLfku47lhajpg6jliLDmnJ/or43kuK3pmo/mnLrmir3lj5bvvIjogIzkuI3mmK/mjInor43ooajpobrluo/lj5bliY0gTiDkuKrvvIlcbiAgICAgIGNvbnN0IGR1ZTogV29yZEl0ZW1bXSA9IFtdO1xuICAgICAgaWYgKGR1ZVdvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgcG9vbCA9IFsuLi5kdWVXb3Jkc107XG4gICAgICAgIGNvbnN0IHRha2UgPSBNYXRoLm1pbihiYXRjaFNpemUsIHBvb2wubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YWtlOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBqID0gaSArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChwb29sLmxlbmd0aCAtIGkpKTtcbiAgICAgICAgICBjb25zdCB0ID0gcG9vbFtpXTsgcG9vbFtpXSA9IHBvb2xbal07IHBvb2xbal0gPSB0O1xuICAgICAgICAgIGR1ZS5wdXNoKHBvb2xbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBjb25zdCByZW1haW5pbmcgPSBiYXRjaFNpemUgLSBkdWUubGVuZ3RoO1xuICAgICAgY29uc3Qgc2FtcGxlZE5ldzogV29yZEl0ZW1bXSA9IFtdO1xuICAgICAgaWYgKHJlbWFpbmluZyA+IDAgJiYgbmV3V29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBwb29sID0gWy4uLm5ld1dvcmRzXTtcbiAgICAgICAgY29uc3QgdGFrZSA9IE1hdGgubWluKHJlbWFpbmluZywgcG9vbC5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRha2U7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGogPSBpICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKHBvb2wubGVuZ3RoIC0gaSkpO1xuICAgICAgICAgIGNvbnN0IHQgPSBwb29sW2ldOyBwb29sW2ldID0gcG9vbFtqXTsgcG9vbFtqXSA9IHQ7XG4gICAgICAgICAgc2FtcGxlZE5ldy5wdXNoKHBvb2xbaV0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBxdWV1ZSA9IFsuLi5kdWUsIC4uLnNhbXBsZWROZXddO1xuICAgIH0gZWxzZSB7XG4gICAgICBxdWV1ZSA9IFsuLi5kdWVXb3JkcywgLi4ubmV3V29yZHNdLnNsaWNlKDAsIGJhdGNoU2l6ZSk7XG4gICAgfVxuXG4gICAgLy8g5aaC5p6c6Zif5YiX5Li656m677yI5rKh5pyJ5b6F5aSN5Lmg5Lmf5rKh5pyJ5paw6K+N77yJ77yM5Y+W5bey5o6M5o+h55qE6K+N5aSN5LmgXG4gICAgbGV0IGZpbmFsUXVldWUgPSBxdWV1ZTtcbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICBjb25zdCBtYXN0ZXJlZFdvcmRzID0gd29yZExpc3QuZmlsdGVyKCh3KSA9PiB7XG4gICAgICAgIGNvbnN0IHAgPSBhbGxQcm9ncmVzc1t3LndvcmRdO1xuICAgICAgICByZXR1cm4gcCAmJiBwLnN0YXR1cyA9PT0gJ21hc3RlcmVkJztcbiAgICAgIH0pO1xuICAgICAgZmluYWxRdWV1ZSA9IG1hc3RlcmVkV29yZHMuc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICB9XG5cbiAgICAvLyDilIDilIDilIAg6K6w5b+G5L2T5qOA6auY5Y2x6K+N6L2u5qyh77ya6KaG55uW6Zif5YiX5Li65L2T5qOA5riF5Y2V77yI5L+d5oyB5L2T5qOA6YeM55qE5Y2x6Zmp6aG65bqP77yM5pyA5Y2x6Zmp5Zyo5YmN77yJIOKUgOKUgOKUgFxuICAgIC8vIOeUqOWFqOmHj+ivjeihqOWMuemFje+8iOS4jei1sCBzdHVkeU1vZGUg6auY6aKR6L+H5ruk77yM5ZCm5YiZ5riF5Y2V6K+N5Y+v6IO95YWo5Yab6KaG5rKh6ICM6Z2Z6buY5Zue6YCA5oiQ5bi46KeE6L2u5qyh77yJXG4gICAgbGV0IG1lbUFjdGl2ZSA9IGZhbHNlO1xuICAgIGlmICh0aGlzLl9tZW1vcnlXb3JkcyAmJiAodGhpcy5fbWVtb3J5V29yZHMgYXMgc3RyaW5nW10pLmxlbmd0aCA+IDApIHtcbiAgICAgIGNvbnN0IG1lbUxlbiA9ICh0aGlzLl9tZW1vcnlXb3JkcyBhcyBzdHJpbmdbXSkubGVuZ3RoO1xuICAgICAgY29uc3QgbWVtU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgICBmb3IgKGNvbnN0IHcgb2YgdGhpcy5fbWVtb3J5V29yZHMgYXMgc3RyaW5nW10pIG1lbVNldC5hZGQody50b0xvd2VyQ2FzZSgpKTtcbiAgICAgIGNvbnN0IG1hdGNoZWQgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IG1lbVNldC5oYXMody53b3JkLnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgIGlmIChtYXRjaGVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZmluYWxRdWV1ZSA9ICh0aGlzLl9tZW1vcnlXb3JkcyBhcyBzdHJpbmdbXSlcbiAgICAgICAgICAubWFwKCh3OiBzdHJpbmcpID0+IG1hdGNoZWQuZmluZCgobTogV29yZEl0ZW0pID0+IG0ud29yZC50b0xvd2VyQ2FzZSgpID09PSB3LnRvTG93ZXJDYXNlKCkpKVxuICAgICAgICAgIC5maWx0ZXIoKHg6IFdvcmRJdGVtIHwgdW5kZWZpbmVkKTogeCBpcyBXb3JkSXRlbSA9PiAhIXgpO1xuICAgICAgICBtZW1BY3RpdmUgPSB0cnVlO1xuICAgICAgICBpZiAoZmluYWxRdWV1ZS5sZW5ndGggPCBtZW1MZW4pIHtcbiAgICAgICAgICAvLyDmuIXljZXph4zmnInor43kuI3lnKjlvZPliY3or43ooajvvIjlpoLor43lupPmm7TmlrDov4fvvInvvJrlpoLlrp7mj5DnpLrvvIznvLrlpLHnmoTkuI3ooaXliKvnmoTor41cbiAgICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogYOa4heWNleS4rSAke21lbUxlbiAtIGZpbmFsUXVldWUubGVuZ3RofSDkuKror43kuI3lnKjor43kuabvvIzlt7Lot7Pov4dgLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIOWFqOmDqOWMuemFjeS4jeS4iu+8iOaegeWwkeinge+8ie+8muS4jemdmem7mOWbnumAgO+8jOaYjuehruWRiuefpVxuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+i/meWHoOS4quivjeS4jeWcqOW9k+WJjeivjeS5pumHjO+8jOW3suWIh+WbnuW4uOinhOWtpuS5oCcsIGljb246ICdub25lJyB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX21lbW9yeVdvcmRzID0gbnVsbDsgLy8g5LiA5qyh5oCn77yM55So5ZCO5Y2z5byDXG4gICAgfVxuXG4gICAgLy8g5Ye66aKY6aG65bqP77ya6ZqP5py65qih5byP5omT5Lmx6Zif5YiX77yI5aSN5Lmg5LyY5YWIL+W3qeWbuumYn+WIl+WcqOe7hOWGheaJk+S5se+8jOS4jeaUueWPmOS8mOWFiOe6p++8m1xuICAgIC8vIOiusOW/huS9k+ajgOi9ruS/neaMgeWNsemZqemhuuW6j+S4jeS5seW6j++8iVxuICAgIGlmIChvcmRlck1vZGUgPT09ICdyYW5kb20nICYmICFtZW1BY3RpdmUgJiYgZmluYWxRdWV1ZS5sZW5ndGggPiAxKSB7XG4gICAgICBmb3IgKGxldCBpID0gZmluYWxRdWV1ZS5sZW5ndGggLSAxOyBpID4gMDsgaS0tKSB7XG4gICAgICAgIGNvbnN0IGogPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoaSArIDEpKTtcbiAgICAgICAgY29uc3QgdCA9IGZpbmFsUXVldWVbaV07XG4gICAgICAgIGZpbmFsUXVldWVbaV0gPSBmaW5hbFF1ZXVlW2pdO1xuICAgICAgICBmaW5hbFF1ZXVlW2pdID0gdDtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDorrDlvZXmnKzova7lk6rkupvmmK/pppbmrKHlrabkuaDnmoTmlrDor43vvIjlpI3kuaAv5bep5Zu65LiN6K6h5YWl4oCc57Sv6K6h5Y2V6K+N4oCd77yJXG4gICAgdGhpcy5fbmV3V29yZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgdyBvZiBmaW5hbFF1ZXVlKSB7XG4gICAgICBpZiAobmV3V29yZHMuaW5kZXhPZih3KSA+IC0xKSB0aGlzLl9uZXdXb3JkU2V0LmFkZCh3LndvcmQudG9Mb3dlckNhc2UoKSk7XG4gICAgfVxuXG4gICAgLy8g5bey5LiK5oql6K+N5qCH6K6w77yI5Y2h54mH6IOM6Z2i5pi+56S644CM5bey5LiK5oql44CN77yJXG4gICAgY29uc3QgcmVwb3J0ZWRNYXA6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge307XG4gICAgZm9yIChjb25zdCB3IG9mIGZpbmFsUXVldWUpIHtcbiAgICAgIGlmIChpc1dvcmRSZXBvcnRlZCh3LndvcmQpKSByZXBvcnRlZE1hcFt3LndvcmRdID0gdHJ1ZTtcbiAgICB9XG5cbiAgICBjb25zdCBwcm9ncmVzc1N0YXRzID0gZ2V0Qm9va1Byb2dyZXNzU3RhdHMoYm9va0lkKTtcblxuICAgIC8vIOaWsOS4gOi9ruW8gOWni++8jOa4heepuuW3suS9nOetlOagh+iusO+8iOS/ruWkjeWIh+aooeW8j+WQjuWQjOS4gOivjemHjeWkjeiuoeaVsOeahCBidWfvvIlcbiAgICB0aGlzLl9hbnN3ZXJlZFNldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuXG4gICAgLy8g54q25oCB5qCH562+5oyJ5pys6L2u6Zif5YiX5a6e6ZmF5p6E5oiQ5Yik5a6a77ya5YWo6YOo5Li65Yiw5pyf6K+N5omN5piv44CM5aSN5Lmg44CN77yMXG4gICAgLy8g5re35YWl5paw6K+N77yI5aSN5Lmg6K+N5LyY5YWI5Y2g5L2NK+aWsOivjeihpem9kO+8ieaXtuagh+OAjOaWsOivjeOAje+8jOmBv+WFjSAxIOS4quWkjeS5oOivjSs5IOS4quaWsOivjeivr+agh+aIkOWkjeS5oFxuICAgIGNvbnN0IGR1ZVdvcmRTZXQgPSBuZXcgU2V0KGR1ZVdvcmRzLm1hcCh3ID0+IHcud29yZCkpO1xuICAgIGNvbnN0IGR1ZUluUXVldWUgPSBmaW5hbFF1ZXVlLmZpbHRlcih3ID0+IGR1ZVdvcmRTZXQuaGFzKHcud29yZCkpLmxlbmd0aDtcbiAgICBsZXQgc3RhdHVzTGFiZWwgPSAn5paw6K+NJztcbiAgICBpZiAobWVtQWN0aXZlKSB7XG4gICAgICBzdGF0dXNMYWJlbCA9ICfpq5jljbHor40nO1xuICAgIH0gZWxzZSBpZiAoZmluYWxRdWV1ZS5sZW5ndGggPiAwICYmIGR1ZUluUXVldWUgPT09IGZpbmFsUXVldWUubGVuZ3RoKSB7XG4gICAgICBzdGF0dXNMYWJlbCA9ICflpI3kuaAnO1xuICAgIH0gZWxzZSBpZiAoZHVlSW5RdWV1ZSA9PT0gMCAmJiBkdWVXb3Jkcy5sZW5ndGggPT09IDAgJiYgbmV3V29yZHMubGVuZ3RoID09PSAwICYmIGZpbmFsUXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgc3RhdHVzTGFiZWwgPSAn5bep5Zu6JztcbiAgICB9XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgYm9va05hbWU6IGJvb2submFtZSxcbiAgICAgIGJvb2tUb3RhbDogd29yZExpc3QubGVuZ3RoLFxuICAgICAgaGlnaEZyZXFDb3VudCxcbiAgICAgIGZ1bmNDb3VudCxcbiAgICAgIGNvbnRlbnRDb3VudCxcbiAgICAgIHF1ZXVlOiBmaW5hbFF1ZXVlLFxuICAgICAgX3dvcmRCb29rV29yZHM6IHdvcmRMaXN0LFxuICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgcXVpY2tMZWFybmluZzogcHJhY3RpY2VNb2RlID09PSAncXVpY2snLFxuICAgICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICBrbm93bkNvdW50OiAwLFxuICAgICAgdW5rbm93bkNvdW50OiAwLFxuICAgICAgdG90YWxDb3VudDogZmluYWxRdWV1ZS5sZW5ndGgsXG4gICAgICBkdWVDb3VudDogcHJvZ3Jlc3NTdGF0cy5kdWVDb3VudCxcbiAgICAgIG1hc3RlcmVkQ291bnQ6IHByb2dyZXNzU3RhdHMubWFzdGVyZWRDb3VudCxcbiAgICAgIHN0YXR1c0xhYmVsLFxuICAgICAgaGFzTW9yZTogZmluYWxRdWV1ZS5sZW5ndGggPj0gYmF0Y2hTaXplLFxuICAgICAgbG9hZGluZzogZmFsc2UsXG4gICAgICBzaG93UmVzdWx0OiBmYWxzZSxcbiAgICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgbGlzdEFuc3dlcmVkOiB7fSxcbiAgICAgIHJlcG9ydGVkTWFwXG4gICAgfSwgKCkgPT4ge1xuICAgICAgaWYgKGZpbmFsUXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgICAgIC8vIOmihOWKoOi9veesrOS6jOS4quivje+8jOe/u+mhteaXtuenkuWHuuWjsFxuICAgICAgICBpZiAoZmluYWxRdWV1ZS5sZW5ndGggPiAxKSB7XG4gICAgICAgICAgcHJlbG9hZEF1ZGlvKGZpbmFsUXVldWVbMV0ud29yZCwgYWNjZW50KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOW9k+WJjeivjeaYr+WQpuW3suS9nOetlOi/h++8iOmYsuWIh+aooeW8j+WQjumHjeWkjeiuoeaVsO+8iVxuICBfY2hlY2tBbnN3ZXJlZCgpOiBib29sZWFuIHtcbiAgICBpZiAodGhpcy5fYW5zd2VyZWRTZXQuaGFzKHRoaXMuZGF0YS5jdXJyZW50SW5kZXgpKSByZXR1cm4gdHJ1ZTtcbiAgICB0aGlzLl9hbnN3ZXJlZFNldC5hZGQodGhpcy5kYXRhLmN1cnJlbnRJbmRleCk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9LFxuXG5cblxuICAvLyDliIfmjaLor43kuabvvJrov5vlhaXor43kuabpgInmi6npobXvvIjmjqjojZDljaEgKyDogIPor5Uv5pWZ5p2Q5YiG57uE5YiX6KGo77yJXG4gIGNoYW5nZUJvb2soKSB7XG4gICAgd3gubmF2aWdhdGVUbyh7IHVybDogJy9wYWdlcy9ib29rbGlzdC9ib29rbGlzdCcgfSk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWNoeeJh+e/u+mdouaooeW8jyDilIDilIDilIBcbiAgLy8g5ryr5ri46K+N5peP77ya5bim552A5b2T5YmN6K+N6Lez6L2s5Yiw6K+N5qC55pif57O7XG4gIGdvR2FsYXh5KCkge1xuICAgIGNvbnN0IHcgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKCF3KSByZXR1cm47XG4gICAgd3gubmF2aWdhdGVUbyh7XG4gICAgICB1cmw6IGAvcGFnZXMvZ2FsYXh5L2dhbGF4eT93b3JkPSR7ZW5jb2RlVVJJQ29tcG9uZW50KHcud29yZCl9YFxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDnuqDplJnkuIrmiqUg4pSA4pSA4pSAXG4gIG9wZW5SZXBvcnQoKSB7XG4gICAgY29uc3QgdyA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAoIXcpIHJldHVybjtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVwb3J0OiB0cnVlLCByZXBvcnRUeXBlOiAnJywgcmVwb3J0RGVzYzogJycgfSk7XG4gIH0sXG5cbiAgY2xvc2VSZXBvcnQoKSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1JlcG9ydDogZmFsc2UgfSk7XG4gIH0sXG5cbiAgb25SZXBvcnRUeXBlKGU6IGFueSkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHJlcG9ydFR5cGU6IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LnR5cGUgYXMgUmVwb3J0VHlwZSB9KTtcbiAgfSxcblxuICBvblJlcG9ydERlc2MoZTogYW55KSB7XG4gICAgdGhpcy5zZXREYXRhKHsgcmVwb3J0RGVzYzogZS5kZXRhaWwudmFsdWUgfSk7XG4gIH0sXG5cbiAgc3VibWl0UmVwb3J0KCkge1xuICAgIGNvbnN0IHcgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKCF3KSByZXR1cm47XG4gICAgaWYgKCF0aGlzLmRhdGEucmVwb3J0VHlwZSkge1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfor7flhYjpgInmi6npl67popjnsbvlnosnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZXBvcnRXb3JkKHcud29yZCwgYm9va0lkLCB0aGlzLmRhdGEucmVwb3J0VHlwZSBhcyBSZXBvcnRUeXBlLCB0aGlzLmRhdGEucmVwb3J0RGVzYykudGhlbigocikgPT4ge1xuICAgICAgaWYgKHIuYWxyZWFkeSkge1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+i/meS4qumXrumimOW3suacieS6uuaKpei/h+WVpicsIGljb246ICdub25lJyB9KTtcbiAgICAgIH0gZWxzZSBpZiAoci5vaykge1xuICAgICAgICBjb25zdCByZXBvcnRlZE1hcCA9IHsgLi4udGhpcy5kYXRhLnJlcG9ydGVkTWFwLCBbdy53b3JkXTogdHJ1ZSB9O1xuICAgICAgICB0aGlzLnNldERhdGEoeyBzaG93UmVwb3J0OiBmYWxzZSwgcmVwb3J0ZWRNYXAgfSk7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5bey5Y+X55CG77yM5oSf6LCi5YWx5bu677yBJywgaWNvbjogJ3N1Y2Nlc3MnIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfmj5DkuqTlpLHotKXvvIzor7fmo4Dmn6XnvZHnu5wnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgZmxpcENhcmQoKSB7XG4gICAgLy8g44CM5LiN6K6k6K+G44CN5o+t56S6562U5qGI5ZCO5Lmf5YWB6K646Ieq55Sx57+76Z2i77yI5Y+v57+75Zue5q2j6Z2i5YaN55yL5Y2V6K+N77yJ77yM5rWB56iL55Sx44CM5LiL5LiA5Liq44CN5oyJ6ZKu5o6o6L+bXG4gICAgY29uc3QgZmxpcHBlZCA9ICF0aGlzLmRhdGEuaXNGbGlwcGVkO1xuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBpc0ZsaXBwZWQ6IGZsaXBwZWQsXG4gICAgICBzaG93TWVhbmluZzogZmxpcHBlZFxuICAgIH0pO1xuICAgIC8vIOe/u+WIsOiDjOmdouaXtuiHquWKqOaSreaUvuWPkemfs++8jOW5tumihOWKoOi9veS4i+S4gOS4quivjVxuICAgIGlmIChmbGlwcGVkKSB7XG4gICAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgICAgY29uc3QgbmV4dCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4ICsgMV07XG4gICAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gICAgICBpZiAobmV4dCkgcHJlbG9hZEF1ZGlvKG5leHQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gICAgfVxuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlj5Hpn7Mg4pSA4pSA4pSAXG4gIG9uUGxheUF1ZGlvKCkge1xuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICB9LFxuXG4gIC8vIOWIh+aNouWPo+mfs1xuICBvblRvZ2dsZUFjY2VudCgpIHtcbiAgICBjb25zdCBuZXdBY2NlbnQ6IEFjY2VudCA9IHRoaXMuZGF0YS5hY2NlbnQgPT09ICd1cycgPyAndWsnIDogJ3VzJztcbiAgICBzZXRBY2NlbnQobmV3QWNjZW50KTtcbiAgICB0aGlzLnNldERhdGEoeyBhY2NlbnQ6IG5ld0FjY2VudCB9KTtcbiAgICB3eC5zaG93VG9hc3Qoe1xuICAgICAgdGl0bGU6IG5ld0FjY2VudCA9PT0gJ3VrJyA/ICfoi7Hpn7PmqKHlvI8nIDogJ+e+jumfs+aooeW8jycsXG4gICAgICBpY29uOiAnbm9uZSdcbiAgICB9KTtcbiAgICAvLyDliIfmjaLlkI7nq4vljbPmkq3mlL7lvZPliY3or41cbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCBuZXdBY2NlbnQpO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlh7rpopjmlrnlvI/lupTnlKjvvIjlkKvmt7flkIjmqKHlvI/pmo/mnLrmmKDlsITvvIkg4pSA4pSA4pSAXG4gIC8vIOS4uuW9k+WJjeivjeehruWumuWunumZheWHuumimOaWueW8j+W5tumHjee9ruetlOmimOeKtuaAge+8m+WNoeeJh+aooeW8j+S/neeVmee/u+mdouW7tue7re+8iOmHiuS5iemdouacneS4iuWIh+ivje+8iVxuICBfYXBwbHlNb2RlRm9yQ3VycmVudCgpIHtcbiAgICBjb25zdCBtb2RlID0gdG9Db25jcmV0ZU1vZGUodGhpcy5kYXRhLnByYWN0aWNlTW9kZSk7XG4gICAgY29uc3Qga2VlcEZsaXAgPSB0aGlzLmRhdGEuaXNGbGlwcGVkICYmIHRoaXMuZGF0YS5wcmFjdGljZU1vZGUgPT09ICdjYXJkJztcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIC8vIOWIh+ivjeihpeS4gOasoeecn+Wunue/u+mdou+8muWFiOefreaaguWbnuato+mdou+8jOS4i+S4gOW4p+WGjee/u+WbnumHiuS5iemdou+8jFxuICAgIC8vIOa2iOmZpOKAnOaNouivjeaXtuWNoeeJh+WDj+ayoee/u+i/h+adpeKAneeahOWbsOaDke+8iOS/neeVmeWIh+ivjeS/neaMgemHiuS5iemdoueahOiuvuiuoe+8iVxuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTsgLy8g5YiH5qih5byPL+WIh+ivjeaXtuWPlua2iOKAnOS4jeiupOivhuiHquWKqOi3s+KAneWumuaXtuWZqO+8jOmYsui3s+ivjeernuaAgVxuICAgIGNvbnN0IGZsaXBCYXNlID0ga2VlcEZsaXAgPyB7IGlzRmxpcHBlZDogZmFsc2UsIHNob3dNZWFuaW5nOiBmYWxzZSB9IDoge307XG4gICAgY29uc3QgZmxpcEJhY2sgPSAoKSA9PiB7XG4gICAgICBpZiAoIWtlZXBGbGlwKSByZXR1cm47XG4gICAgICB3eC5uZXh0VGljaygoKSA9PiB7XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7IGlzRmxpcHBlZDogdHJ1ZSwgc2hvd01lYW5pbmc6IHRydWUgfSk7XG4gICAgICB9KTtcbiAgICB9O1xuICAgIC8vIOW/q+mAn+aooeW8j++8mui/m+WFpeWtpuS5oOmYtuaute+8jOaBouWkjemYn+WIl+WktOaMh+mSiOS4juiuoeaVsO+8iOWQjOS4gOaJueivjemHjeWtpumHjea1i++8iVxuICAgIGlmIChtb2RlID09PSAncXVpY2snKSB7XG4gICAgICB0aGlzLnNldERhdGEoe1xuICAgICAgICBhY3RpdmVNb2RlOiAncXVpY2snLFxuICAgICAgICBxdWlja0xlYXJuaW5nOiB0cnVlLFxuICAgICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICAgIGNob2ljZVNlbGVjdGVkOiAtMVxuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBhY3RpdmVNb2RlOiBtb2RlLFxuICAgICAgcXVpY2tMZWFybmluZzogZmFsc2UsIC8vIOWIh+WIsOmdnuW/q+mAn+aooeW8j+aXtumAgOWHuuWtpuS5oOmYtuaute+8jOmYsuatouWIl+ihqOaui+eVmVxuICAgICAgLi4uZmxpcEJhc2UsXG4gICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTFcbiAgICB9LCAoKSA9PiB7XG4gICAgICBmbGlwQmFjaygpO1xuICAgICAgaWYgKCF3b3JkKSByZXR1cm47XG4gICAgICBpZiAobW9kZSA9PT0gJ2Nob2ljZScpIHtcbiAgICAgICAgdGhpcy5nZW5lcmF0ZUNob2ljZU9wdGlvbnMod29yZCk7XG4gICAgICB9IGVsc2UgaWYgKG1vZGUgPT09ICdjYXJkJykge1xuICAgICAgICBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5Zub6YCJ5LiA5qih5byPIOKUgOKUgOKUgFxuICAvLyDnlJ/miJDlm5vpgInkuIDpgInpobnvvIjnu5nljZXor43pgInph4rkuYnvvIlcbiAgZ2VuZXJhdGVDaG9pY2VPcHRpb25zKGN1cnJlbnRXb3JkOiBXb3JkSXRlbSkge1xuICAgIGNvbnN0IGFsbFdvcmRzID0gdGhpcy5kYXRhLl93b3JkQm9va1dvcmRzO1xuICAgIGlmIChhbGxXb3Jkcy5sZW5ndGggPCA0KSB7XG4gICAgICAvLyDor43kuabor43mlbDkuI3lpJ8gNCDkuKrvvIzml6Dms5Xlh7rlubLmibDpobnvvIzpmY3nuqfkuLrljaHniYflh7rpophcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGFjdGl2ZU1vZGU6ICdjYXJkJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyDku47or43kuabpmo/mnLrlj5YgMyDkuKrlubLmibDpoblcbiAgICBjb25zdCBkaXN0cmFjdG9yczogV29yZEl0ZW1bXSA9IFtdO1xuICAgIGNvbnN0IHVzZWQgPSBuZXcgU2V0KFtjdXJyZW50V29yZC53b3JkXSk7XG4gICAgbGV0IGF0dGVtcHRzID0gMDtcbiAgICB3aGlsZSAoZGlzdHJhY3RvcnMubGVuZ3RoIDwgMyAmJiBhdHRlbXB0cyA8IDEwMCkge1xuICAgICAgY29uc3QgaWR4ID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYWxsV29yZHMubGVuZ3RoKTtcbiAgICAgIGNvbnN0IHcgPSBhbGxXb3Jkc1tpZHhdO1xuICAgICAgaWYgKCF1c2VkLmhhcyh3LndvcmQpICYmIHcubWVhbmluZyAhPT0gY3VycmVudFdvcmQubWVhbmluZykge1xuICAgICAgICBkaXN0cmFjdG9ycy5wdXNoKHcpO1xuICAgICAgICB1c2VkLmFkZCh3LndvcmQpO1xuICAgICAgfVxuICAgICAgYXR0ZW1wdHMrKztcbiAgICB9XG5cbiAgICAvLyDnu4TlkIggKyDpmo/mnLrmiZPkubFcbiAgICBjb25zdCBvcHRpb25zOiBDaG9pY2VPcHRpb25bXSA9IFtcbiAgICAgIHsgbWVhbmluZzogY3VycmVudFdvcmQubWVhbmluZywgaXNDb3JyZWN0OiB0cnVlIH0sXG4gICAgICAuLi5kaXN0cmFjdG9ycy5tYXAoZCA9PiAoeyBtZWFuaW5nOiBkLm1lYW5pbmcsIGlzQ29ycmVjdDogZmFsc2UgfSkpXG4gICAgXS5zb3J0KCgpID0+IE1hdGgucmFuZG9tKCkgLSAwLjUpO1xuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGNob2ljZU9wdGlvbnM6IG9wdGlvbnMsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICBjaG9pY2VDb3JyZWN0OiBmYWxzZVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOWbm+mAieS4gO+8mueCueWHu+mAiemhuVxuICBvbkNob2ljZVNlbGVjdChlOiBhbnkpIHtcbiAgICBpZiAodGhpcy5kYXRhLmNob2ljZVNlbGVjdGVkICE9PSAtMSkgcmV0dXJuOyAvLyDlt7LpgInov4dcbiAgICBpZiAodGhpcy5fY2hlY2tBbnN3ZXJlZCgpKSByZXR1cm47IC8vIOWIh+aooeW8j+WQjuWQjOS4gOivjeS4jemHjeWkjeiuoeaVsFxuXG4gICAgY29uc3QgaWR4ID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQuaWR4IGFzIG51bWJlcjtcbiAgICBjb25zdCBvcHRpb24gPSB0aGlzLmRhdGEuY2hvaWNlT3B0aW9uc1tpZHhdO1xuICAgIGNvbnN0IGlzQ29ycmVjdCA9IG9wdGlvbi5pc0NvcnJlY3Q7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IGlkeCxcbiAgICAgIGNob2ljZUNvcnJlY3Q6IGlzQ29ycmVjdFxuICAgIH0pO1xuXG4gICAgLy8g5pKt5pS+5Y2V6K+N5Y+R6Z+zXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG5cbiAgICAvLyDorrDlvZXov5vluqZcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCBpc0NvcnJlY3QpO1xuICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3b3JkLndvcmQpKTtcbiAgICBpZiAoIWlzQ29ycmVjdCkge1xuICAgICAgYWRkVG9Xcm9uZ0Jvb2sod29yZC53b3JkLCB3b3JkLm1lYW5pbmcsIGJvb2tJZCk7XG4gICAgfVxuXG4gICAgaWYgKGlzQ29ycmVjdCkge1xuICAgICAgdGhpcy5zZXREYXRhKHsga25vd25Db3VudDogdGhpcy5kYXRhLmtub3duQ291bnQgKyAxIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldERhdGEoeyB1bmtub3duQ291bnQ6IHRoaXMuZGF0YS51bmtub3duQ291bnQgKyAxIH0pO1xuICAgIH1cblxuICAgIC8vIOetlOWvueWBnCAxIOenku+8m+etlOmUmeWBnCAyLjUg56eS77yM55WZ5pe26Ze055yL5riF5q2j56Gu562U5qGIXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm5leHRXb3JkKCk7XG4gICAgfSwgaXNDb3JyZWN0ID8gMTAwMCA6IDI1MDApO1xuICB9LFxuXG4gIC8vIOWbm+mAieS4gO+8mueCueOAjOS4jeiupOivhuOAje+8iOS4jeeMnOS6hu+8jOebtOaOpeaPreekuuato+ehruetlOahiO+8jOaMieetlOmUmeiusOW9le+8iVxuICBvbkNob2ljZURvbnRLbm93KCkge1xuICAgIGlmICh0aGlzLmRhdGEuY2hvaWNlU2VsZWN0ZWQgIT09IC0xKSByZXR1cm47IC8vIOW3suS9nOetlC/lt7Lmj63npLpcbiAgICBpZiAodGhpcy5fY2hlY2tBbnN3ZXJlZCgpKSByZXR1cm47IC8vIOWIh+aooeW8j+WQjuWQjOS4gOivjeS4jemHjeWkjeiuoeaVsFxuXG4gICAgLy8gY2hvaWNlU2VsZWN0ZWQg572u5Li6IC0y77ya5LiN5ZG95Lit5Lu75L2V6YCJ6aG577yI5LiN5qCH57qi6ZSZ6K+v6aG577yJ77yM5L2G6Kem5Y+R5q2j56Gu6aG56auY5LquXG4gICAgdGhpcy5zZXREYXRhKHsgY2hvaWNlU2VsZWN0ZWQ6IC0yLCBjaG9pY2VDb3JyZWN0OiBmYWxzZSB9KTtcblxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuXG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgZmFsc2UpO1xuICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3b3JkLndvcmQpKTtcbiAgICBhZGRUb1dyb25nQm9vayh3b3JkLndvcmQsIHdvcmQubWVhbmluZywgYm9va0lkKTtcblxuICAgIHRoaXMuc2V0RGF0YSh7IHVua25vd25Db3VudDogdGhpcy5kYXRhLnVua25vd25Db3VudCArIDEgfSk7XG5cbiAgICAvLyDkuI3oh6rliqjot7PovazvvJrlsZXnpLrmraPnoa7nrZTmoYjlkI7lh7rjgIzkuIvkuIDkuKrjgI3mjInpkq7vvIznu5nnlKjmiLfml7bpl7TorrDkvY/ov5nkuKror41cbiAgfSxcblxuICAvLyDpgInmi6nmqKHlvI/jgIzkuI3orqTor4bjgI3mj63npLrnrZTmoYjlkI7vvIzngrnjgIzkuIvkuIDkuKrjgI3nu6fnu61cbiAgb25DaG9pY2VOZXh0KCkge1xuICAgIGlmICh0aGlzLmRhdGEuY2hvaWNlU2VsZWN0ZWQgIT09IC0yKSByZXR1cm47IC8vIOS7hemZkOOAjOS4jeiupOivhuOAjeaPreekuueKtuaAgVxuICAgIHRoaXMuc2V0RGF0YSh7IGNob2ljZVNlbGVjdGVkOiAtMSB9KTtcbiAgICB0aGlzLm5leHRXb3JkKCk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOaLvOWGmeaooeW8jyDilIDilIDilIBcbiAgb25TcGVsbElucHV0KGU6IGFueSkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNwZWxsSW5wdXQ6IGUuZGV0YWlsLnZhbHVlIH0pO1xuICB9LFxuXG4gIG9uU3BlbGxTdWJtaXQoKSB7XG4gICAgY29uc3QgaW5wdXQgPSB0aGlzLmRhdGEuc3BlbGxJbnB1dC50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAoIWlucHV0KSByZXR1cm47XG5cbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghd29yZCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG5cblxuICAgIGNvbnN0IGlzQ29ycmVjdCA9IGlucHV0ID09PSB3b3JkLndvcmQudG9Mb3dlckNhc2UoKTtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBzcGVsbEZlZWRiYWNrOiBpc0NvcnJlY3QgPyAnY29ycmVjdCcgOiAnd3JvbmcnXG4gICAgfSk7XG5cbiAgICAvLyDmkq3mlL7lj5Hpn7NcbiAgICBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcblxuICAgIC8vIOiusOW9lei/m+W6plxuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGlzQ29ycmVjdCk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGlmICghaXNDb3JyZWN0KSB7XG4gICAgICBhZGRUb1dyb25nQm9vayh3b3JkLndvcmQsIHdvcmQubWVhbmluZywgYm9va0lkKTtcbiAgICB9XG5cbiAgICBpZiAoaXNDb3JyZWN0KSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBrbm93bkNvdW50OiB0aGlzLmRhdGEua25vd25Db3VudCArIDEgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHVua25vd25Db3VudDogdGhpcy5kYXRhLnVua25vd25Db3VudCArIDEgfSk7XG4gICAgfVxuXG4gICAgLy8g5ou85a+55YGcIDEuMiDnp5LvvJvmi7zplJnlgZwgMyDnp5LvvIznlZnml7bpl7TorrDkvY/mraPnoa7mi7zlhplcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgICB9LCBpc0NvcnJlY3QgPyAxMjAwIDogMzAwMCk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOe7g+S5oOaooeW8j+WIh+aNou+8iOWIh+aNouS4jeaNouivjeS4jei3s+ivje+8jOW9k+WJjeivjeaMieaWsOaWueW8j+mHjeaWsOWHuumimO+8iSDilIDilIDilIBcbiAgLy8g4pSA4pSA4pSAIOiHquWumuS5iemAieaLqeW8ueahhu+8iOaooeW8jy/ojIPlm7Qv5q+P6L2u5Liq5pWw57uf5LiA55So77yJIOKUgOKUgOKUgFxuICBfb3BlblNoZWV0KHR5cGU6IHN0cmluZywgdGl0bGU6IHN0cmluZywgb3B0aW9uczogQXJyYXk8eyBsYWJlbDogc3RyaW5nOyBhY3RpdmU6IGJvb2xlYW4gfT4pIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93U2hlZXQ6IHRydWUsIHNoZWV0VHlwZTogdHlwZSwgc2hlZXRUaXRsZTogdGl0bGUsIHNoZWV0T3B0aW9uczogb3B0aW9ucyB9KTtcbiAgfSxcblxuICBjbG9zZVNoZWV0KCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dTaGVldDogZmFsc2UgfSk7XG4gIH0sXG5cbiAgb25TaGVldFNlbGVjdChlOiBhbnkpIHtcbiAgICBjb25zdCBpZHggPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC5pbmRleCBhcyBudW1iZXI7XG4gICAgY29uc3QgdHlwZSA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LnR5cGUgYXMgc3RyaW5nO1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dTaGVldDogZmFsc2UgfSk7XG5cbiAgICBpZiAodHlwZSA9PT0gJ21vZGUnKSB7XG4gICAgICBjb25zdCBtb2RlczogUHJhY3RpY2VNb2RlW10gPSBbJ2NhcmQnLCAnY2hvaWNlJywgJ3NwZWxsJywgJ21peCcsICdxdWljayddO1xuICAgICAgY29uc3QgbW9kZSA9IG1vZGVzW2lkeF0gYXMgUHJhY3RpY2VNb2RlO1xuICAgICAgaWYgKCFtb2RlIHx8IG1vZGUgPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpIHJldHVybjtcbiAgICAgIHNldFByYWN0aWNlTW9kZShtb2RlKTtcbiAgICAgIC8vIOWIh+WIsOW/q+mAn++8muS7juWtpuS5oOmYtuauteW8gOWni++8iOeOsOaciemYn+WIl+ebtOaOpeWPmOWtpuS5oOWIl+ihqO+8iVxuICAgICAgaWYgKG1vZGUgPT09ICdxdWljaycpIHtcbiAgICAgICAgdGhpcy5zZXREYXRhKHtcbiAgICAgICAgICBwcmFjdGljZU1vZGU6IG1vZGUsXG4gICAgICAgICAgbW9kZUluZGV4OiBpZHgsXG4gICAgICAgICAgcXVpY2tMZWFybmluZzogdHJ1ZSxcbiAgICAgICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICAgICAga25vd25Db3VudDogMCxcbiAgICAgICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgICAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgICAgIGxpc3RBbnN3ZXJlZDoge31cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5zZXREYXRhKHsgcHJhY3RpY2VNb2RlOiBtb2RlLCBtb2RlSW5kZXg6IGlkeCB9KTtcbiAgICAgIGlmICh0aGlzLmRhdGEucXVldWUubGVuZ3RoID4gMCkge1xuICAgICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnc2NvcGUnKSB7XG4gICAgICBjb25zdCBtb2RlczogU3R1ZHlNb2RlW10gPSBbJ2FsbCcsICdoaWdoRnJlcScsICdmdW5jJywgJ2NvbnRlbnQnXTtcbiAgICAgIGNvbnN0IG5ld01vZGUgPSBtb2Rlc1tpZHhdO1xuICAgICAgaWYgKCFuZXdNb2RlIHx8IG5ld01vZGUgPT09IHRoaXMuZGF0YS5zdHVkeU1vZGUpIHJldHVybjtcbiAgICAgIHNldFN0dWR5TW9kZShuZXdNb2RlKTtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHdvcmRDbGFzc0xhYmVsOiB0aGlzLldPUkRfQ0xBU1NfTEFCRUxTW25ld01vZGVdIHx8ICflhajpg6gnIH0pO1xuICAgICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgICB9IGVsc2UgaWYgKHR5cGUgPT09ICdiYXRjaCcpIHtcbiAgICAgIGNvbnN0IG9wdGlvbnMgPSBbNSwgMTAsIDE1LCAyMF07XG4gICAgICBjb25zdCBuID0gb3B0aW9uc1tpZHhdO1xuICAgICAgaWYgKCFuIHx8IG4gPT09IHRoaXMuZGF0YS5iYXRjaFNpemUpIHJldHVybjtcbiAgICAgIHNldEJhdGNoU2l6ZShuKTtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGJhdGNoU2l6ZTogbiB9KTtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5q+P6L2uICcgKyBuICsgJyDkuKrljZXor40nLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICB0aGlzLmluaXRCYXRjaCgpO1xuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3F1aWNrVGVzdCcpIHtcbiAgICAgIC8vIOW/q+mAn+WtpuS5oCDihpIg5qOA5rWL77ya5ZCM5LiA5om56K+N6YeN6L+H5LiA6YGN77yM5oGi5aSN562U6aKY54q25oCBXG4gICAgICAvLyDms6jmhI/vvJrmo4DmtYvmlrnlvI/lj6rmlLnmnKzmrKHkvJror53nmoQgcHJhY3RpY2VNb2Rl77yM5oyB5LmF5bGC5LuN5a2YICdxdWljayfvvIxcbiAgICAgIC8vIOi/meagt+KAnOWGjeadpeS4gOi9ruKAnS/kuIvmrKHov5vlhaXkvJrph43mlrDku47lrabkuaDpmLbmrrXlvIDlp4tcbiAgICAgIGNvbnN0IG1vZGVzOiBQcmFjdGljZU1vZGVbXSA9IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4J107XG4gICAgICBjb25zdCBtb2RlID0gbW9kZXNbaWR4XSBhcyBQcmFjdGljZU1vZGU7XG4gICAgICBpZiAoIW1vZGUpIHJldHVybjtcbiAgICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgICB0aGlzLnNldERhdGEoe1xuICAgICAgICBzaG93U2hlZXQ6IGZhbHNlLFxuICAgICAgICBxdWlja0xlYXJuaW5nOiBmYWxzZSxcbiAgICAgICAgcHJhY3RpY2VNb2RlOiBtb2RlLFxuICAgICAgICBtb2RlSW5kZXg6IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4J10uaW5kZXhPZihtb2RlKSxcbiAgICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgICBrbm93bkNvdW50OiAwLFxuICAgICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgICBsaXN0QW5zd2VyZWQ6IHt9XG4gICAgICB9LCAoKSA9PiB7XG4gICAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICAgIH0pO1xuICAgIH1cbiAgfSxcblxuICBvbk1vZGVUYXAoKSB7XG4gICAgY29uc3QgbW9kZXM6IFByYWN0aWNlTW9kZVtdID0gWydjYXJkJywgJ2Nob2ljZScsICdzcGVsbCcsICdtaXgnLCAncXVpY2snXTtcbiAgICB0aGlzLl9vcGVuU2hlZXQoXG4gICAgICAnbW9kZScsXG4gICAgICAn5a2m5Lmg5qih5byPJyxcbiAgICAgIG1vZGVzLm1hcCgobSwgaSkgPT4gKHsgbGFiZWw6IHRoaXMuZGF0YS5tb2RlTGFiZWxzW2ldLCBhY3RpdmU6IG0gPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUgfSkpXG4gICAgKTtcbiAgfSxcblxuICBvblByYWN0aWNlTW9kZUNoYW5nZShlOiBhbnkpIHtcbiAgICBjb25zdCBtb2RlID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQubW9kZSBhcyBQcmFjdGljZU1vZGU7XG4gICAgaWYgKG1vZGUgPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpIHJldHVybjtcblxuICAgIHNldFByYWN0aWNlTW9kZShtb2RlKTtcbiAgICB0aGlzLnNldERhdGEoeyBwcmFjdGljZU1vZGU6IG1vZGUgfSk7XG4gICAgaWYgKHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgfVxuXG4gICAgY29uc3QgbGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBjYXJkOiAn5Y2h54mH5qih5byPJywgY2hvaWNlOiAn6YCJ5oup5qih5byPJywgc3BlbGw6ICfmi7zlhpnmqKHlvI8nLCBtaXg6ICfmt7flkIjmqKHlvI8nLCBxdWljazogJ+W/q+mAn+WtpuS5oCcgfTtcbiAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogbGFiZWxzW21vZGVdIHx8ICcnLCBpY29uOiAnbm9uZScgfSk7XG4gIH0sXG5cbiAgLy8g5YiH5o2i5Ye66aKY6aG65bqP77yI6ZqP5py6IC8g6aG65bqP77yJXG4gIG9uVG9nZ2xlT3JkZXJNb2RlKCkge1xuICAgIGNvbnN0IG5ld01vZGUgPSB0aGlzLmRhdGEub3JkZXJNb2RlID09PSAncmFuZG9tJyA/ICdzZXF1ZW50aWFsJyA6ICdyYW5kb20nO1xuICAgIHNldE9yZGVyTW9kZShuZXdNb2RlKTtcbiAgICB3eC5zaG93VG9hc3Qoe1xuICAgICAgdGl0bGU6IG5ld01vZGUgPT09ICdyYW5kb20nID8gJ+W3suWIh+aNoumaj+acuuWHuuivjScgOiAn5bey5YiH5o2i6aG65bqP5Ye66K+NJyxcbiAgICAgIGljb246ICdub25lJ1xuICAgIH0pO1xuICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gIH0sXG5cbiAgLy8g5b2T5YmN6K+N5piv5ZCm5Li66aaW5qyh5a2m5Lmg55qE5paw6K+N77yI5LuF5paw6K+N6K6h5YWl4oCc57Sv6K6h5Y2V6K+N4oCd77yJXG4gIF9pc05ld1dvcmQod29yZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5fbmV3V29yZFNldCAmJiB0aGlzLl9uZXdXb3JkU2V0Lmhhcyh3b3JkLnRvTG93ZXJDYXNlKCkpO1xuICB9LFxuXG4gIC8vIOiuvue9ruavj+i9ruWtpuS5oOWNleivjeaVsO+8iOmhtumDqOaMiemSru+8iVxuICBvbkNoYW5nZUJhdGNoU2l6ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0gWzUsIDEwLCAxNSwgMjBdO1xuICAgIHRoaXMuX29wZW5TaGVldChcbiAgICAgICdiYXRjaCcsXG4gICAgICAn5q+P6L2u5Liq5pWwJyxcbiAgICAgIG9wdGlvbnMubWFwKG4gPT4gKHsgbGFiZWw6IG4gKyAnIOS4qi/ova4nLCBhY3RpdmU6IG4gPT09IHRoaXMuZGF0YS5iYXRjaFNpemUgfSkpXG4gICAgKTtcbiAgfSxcblxuICAvLyDliIfmjaLlrabkuaDojIPlm7TvvIjlhajpg6gv6auY6aKRL+iZmuivjS/lrp7or43vvIlcbiAgV09SRF9DTEFTU19MQUJFTFM6IHsgYWxsOiAn5YWo6YOoJywgaGlnaEZyZXE6ICfpq5jpopHor40nLCBmdW5jOiAn6Jma6K+NJywgY29udGVudDogJ+WunuivjScgfSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuXG4gIG9uU2VsZWN0V29yZENsYXNzKCkge1xuICAgIGNvbnN0IG1vZGVzOiBTdHVkeU1vZGVbXSA9IFsnYWxsJywgJ2hpZ2hGcmVxJywgJ2Z1bmMnLCAnY29udGVudCddO1xuICAgIHRoaXMuX29wZW5TaGVldChcbiAgICAgICdzY29wZScsXG4gICAgICAn6K+N5Lmm6IyD5Zu0JyxcbiAgICAgIG1vZGVzLm1hcChtID0+ICh7IGxhYmVsOiB0aGlzLldPUkRfQ0xBU1NfTEFCRUxTW21dLCBhY3RpdmU6IG0gPT09IHRoaXMuZGF0YS5zdHVkeU1vZGUgfSkpXG4gICAgKTtcbiAgfSxcblxuICAvLyDlhbzlrrnml6flhaXlj6NcbiAgdG9nZ2xlU3R1ZHlNb2RlKCkge1xuICAgIHRoaXMub25TZWxlY3RXb3JkQ2xhc3MoKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5a+85Ye65LuK5pel5Y2V6K+N6KGoIOKUgOKUgOKUgFxuICBfdG9kYXlSb3dzOiBudWxsIGFzIFRvZGF5Um93W10gfCBudWxsLFxuXG4gIG9uRXhwb3J0VG9kYXkoKSB7XG4gICAgd3guc2hvd0xvYWRpbmcoeyB0aXRsZTogJ+aVtOeQhuWNleivjeS4rS4uLicgfSk7XG4gICAgY29sbGVjdFRvZGF5Um93cygpLnRoZW4oKHJvd3MpID0+IHtcbiAgICAgIHd4LmhpZGVMb2FkaW5nKCk7XG4gICAgICB0aGlzLl90b2RheVJvd3MgPSByb3dzO1xuICAgICAgc2hvd0V4cG9ydFNoZWV0KHJvd3MsICgpID0+IHRoaXMuX2dldEV4cG9ydENhbnZhcygpKTtcbiAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICB3eC5oaWRlTG9hZGluZygpO1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfmlbTnkIblpLHotKXvvIzor7fph43or5UnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2dldEV4cG9ydENhbnZhcygpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB3eC5jcmVhdGVTZWxlY3RvclF1ZXJ5KCkuaW4odGhpcylcbiAgICAgICAgLnNlbGVjdCgnI2V4cG9ydENhbnZhcycpXG4gICAgICAgIC5maWVsZHMoeyBub2RlOiB0cnVlIH0pXG4gICAgICAgIC5leGVjKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChyZXMgJiYgcmVzWzBdICYmIHJlc1swXS5ub2RlKSByZXNvbHZlKHJlc1swXS5ub2RlKTtcbiAgICAgICAgICBlbHNlIHJlamVjdChuZXcgRXJyb3IoJ2NhbnZhcyDmnKrlsLHnu6onKSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDljaHniYfmqKHlvI/orqTor4Yv5LiN6K6k6K+GIOKUgOKUgOKUgFxuICBtYXJrS25vd24oKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jdXJyZW50SW5kZXggPj0gdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCB0cnVlKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAga25vd25Db3VudDogdGhpcy5kYXRhLmtub3duQ291bnQgKyAxXG4gICAgfSk7XG4gICAgdGhpcy5uZXh0V29yZCgpO1xuICB9LFxuXG4gIG1hcmtVbmtub3duKCkge1xuICAgIGlmICh0aGlzLmRhdGEuY3VycmVudEluZGV4ID49IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGgpIHJldHVybjtcbiAgICBpZiAodGhpcy5kYXRhLnJldmVhbEFmdGVyVW5rbm93bikgcmV0dXJuOyAvLyDlt7Lmj63npLrvvIznrYnlvoXnlKjmiLfngrnjgIzkuIvkuIDkuKrjgI1cbiAgICBpZiAodGhpcy5fY2hlY2tBbnN3ZXJlZCgpKSByZXR1cm47IC8vIOWIh+aooeW8j+WQjuWQjOS4gOivjeS4jemHjeWkjeiuoeaVsFxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgZmFsc2UpO1xuICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3b3JkLndvcmQpKTtcbiAgICBhZGRUb1dyb25nQm9vayh3b3JkLndvcmQsIHdvcmQubWVhbmluZywgYm9va0lkKTtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICB1bmtub3duQ291bnQ6IHRoaXMuZGF0YS51bmtub3duQ291bnQgKyAxLFxuICAgICAgLy8g5LiN6K6k6K+G77ya5YWI57+76Z2i5bGV56S66YeK5LmJ77yI5b2T5Zy655yL5Yiw5q2j56Gu562U5qGI77yJ77yMMi41IOenkuWQjuiHquWKqOi/m+WFpeS4i+S4gOS4quivjVxuICAgICAgLy8g77yI5Lmf5L+d55WZ44CM5LiL5LiA5Liq44CN5oyJ6ZKu77yM55So5oi35Y+v5o+Q5YmN54K56LWw77yJXG4gICAgICByZXZlYWxBZnRlclVua25vd246IHRydWUsXG4gICAgICBpc0ZsaXBwZWQ6IHRydWUsXG4gICAgICBzaG93TWVhbmluZzogdHJ1ZVxuICAgIH0pO1xuICAgIC8vIOiHquWKqOaSreaUvuWPkemfs++8jOWKoOa3seiusOW/hlxuICAgIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgIC8vIOiHquWKqOi3s+S4i+S4gOS4qu+8muWxleekuumHiuS5ieWQjuWBnCAyLjUg56eS77yb5pyf6Ze054K544CM5LiL5LiA5Liq44CN5Lya5Y+W5raI5a6a5pe25ZmoXG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgIHRoaXMuX3JldmVhbFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLl9yZXZlYWxUaW1lciA9IG51bGw7XG4gICAgICBpZiAodGhpcy5kYXRhLnJldmVhbEFmdGVyVW5rbm93bikgdGhpcy5vblJldmVhbE5leHQoKTtcbiAgICB9LCAyNTAwKTtcbiAgfSxcblxuICBfcmV2ZWFsVGltZXI6IG51bGwgYXMgYW55LFxuXG4gIF9jbGVhclJldmVhbFRpbWVyKCkge1xuICAgIGlmICh0aGlzLl9yZXZlYWxUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3JldmVhbFRpbWVyKTtcbiAgICAgIHRoaXMuX3JldmVhbFRpbWVyID0gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOW/q+mAn+aooeW8jyDCtyDlrabkuaDpmLbmrrUg4pSA4pSA4pSAXG4gIC8vIOeCueWNleivjeihjO+8muWPkeWjsO+8iOe6r+a1j+iniO+8jOS4jeiusOaVsOaNru+8iVxuICBvbkxpc3RUYXAoZTogYW55KSB7XG4gICAgY29uc3Qgd29yZCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LndvcmQgYXMgc3RyaW5nO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gIH0sXG5cbiAgLy8g44CM5LiN6K6k6K+G44CN5o+t56S6562U5qGI5ZCO77yM54K544CM5LiL5LiA5Liq44CN57un57utXG4gIG9uUmV2ZWFsTmV4dCgpIHtcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG4gICAgdGhpcy5zZXREYXRhKHsgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSwgaXNGbGlwcGVkOiBmYWxzZSwgc2hvd01lYW5pbmc6IGZhbHNlIH0pO1xuICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgfSxcblxuICBuZXh0V29yZCgpIHtcbiAgICAvLyDpmLLlvqHvvJrpmJ/liJflvILluLjvvIjnqbrpmJ/liJcv5LiL5qCH6LaK55WM77yJ5pe255u05o6l6YeN5byA5LiA6L2u77yM6YG/5YWN55m95bGP5Y2h5q27XG4gICAgaWYgKCF0aGlzLmRhdGEucXVldWUgfHwgdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbmV4dCA9IHRoaXMuZGF0YS5jdXJyZW50SW5kZXggKyAxO1xuICAgIGlmIChuZXh0ID49IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZmluaXNoUm91bmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGN1cnJlbnRJbmRleDogbmV4dFxuICAgIH0sICgpID0+IHtcbiAgICAgIC8vIOS4uuaWsOivjeehruWumuWHuumimOaWueW8j++8iG1peCDmqKHlvI/kuIvmr4/kuKror43pmo/mnLrljaHniYcv6YCJ5oupL+aLvOWGme+8ie+8jOW5tumHjee9ruetlOmimOeKtuaAgVxuICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgLy8g6aKE5Yqg6L295LiL5LiL5Liq6K+NXG4gICAgICBjb25zdCBhZnRlck5leHQgPSB0aGlzLmRhdGEucXVldWVbbmV4dCArIDFdO1xuICAgICAgaWYgKGFmdGVyTmV4dCkgcHJlbG9hZEF1ZGlvKGFmdGVyTmV4dC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICB9KTtcbiAgfSxcblxuICBmaW5pc2hSb3VuZCgpIHtcbiAgICAvLyDmnKzova7lt7Lnu5PmnZ/vvJrmuIXmjonph43lu7rlrojljavnmoQga2V577yM56Gu5L+d5LiL5qyh6L+b5YWl6aG16Z2i77yI5LuO6aaW6aG154K54oCc6IOM5Y2V6K+N4oCdL+WIhyB0YWIg5Zue5p2l77yJXG4gICAgLy8g5LiN5Lya5ZG95Lit4oCc5pWw5o2u5pyq5Y+Y6Lez6L+H6YeN5bu64oCd6ICM5Y2h5Zyo5pyA5ZCO5LiA5Liq6K+N77yI5q2k5pe2IF9hbnN3ZXJlZFNldCDlt7Lmu6HvvIzmjInpkq7lhajml6Dlj43lupTvvIlcbiAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJztcbiAgICBjb25zdCB0b3RhbCA9IHRoaXMuZGF0YS50b3RhbENvdW50O1xuICAgIGNvbnN0IGtub3duID0gdGhpcy5kYXRhLmtub3duQ291bnQ7XG4gICAgY29uc3QgcmF0ZSA9IHRvdGFsID4gMCA/IE1hdGgucm91bmQoKGtub3duIC8gdG90YWwpICogMTAwKSA6IDA7XG4gICAgbGV0IHByYWlzZSA9ICfnu6fnu63liqDmsrnvvIEnO1xuICAgIGlmIChyYXRlID49IDkwKSBwcmFpc2UgPSAn5aSq5qOS5LqG77yM5Yeg5LmO5YWo6YOo5o6M5o+h77yBJztcbiAgICBlbHNlIGlmIChyYXRlID49IDcwKSBwcmFpc2UgPSAn5LiN6ZSZ5ZOm77yM57un57ut5L+d5oyB77yBJztcbiAgICBlbHNlIGlmIChyYXRlID49IDUwKSBwcmFpc2UgPSAn6L+Y6ZyA5aSa5aSN5Lmg5Yeg6YGNJztcblxuICAgIC8vIOiusOS9j+acrOi9rumYn+WIl++8jOS+m+OAjOWkjeS5oOacrOi9ruOAjeWOn+agt+mHjeWIt++8iOS4jeaNouivje+8iVxuICAgIHRoaXMuX2xhc3RSb3VuZFF1ZXVlID0gdGhpcy5kYXRhLnF1ZXVlLnNsaWNlKCk7XG5cbiAgICAvLyDlkIzmraXlrabkuaDmlbDmja7liLDkupHnq69cbiAgICB0aGlzLnN5bmNUb0Nsb3VkKCk7XG5cbiAgICAvLyDmmL7npLrlhajlsY/nu5PmnpzpobVcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgc2hvd1Jlc3VsdDogdHJ1ZSxcbiAgICAgIHJlc3VsdFJhdGU6IHJhdGUsXG4gICAgICByZXN1bHRQcmFpc2U6IHByYWlzZVxuICAgICAgLy8gcmVtaW5kZXJTdWJzY3JpYmVkOiBpc1JlbWluZGVyU3Vic2NyaWJlZCgpIC8vIOWtpuS5oOaPkOmGkuW3suS4i+e6v++8iDIwMjYtMDgtMzHvvIlcbiAgICB9KTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrlvIDlkK/lrabkuaDmj5DphpLvvIjlt7LkuIvnur8gMjAyNi0wOC0zMe+8muS4gOasoeaAp+iuoumYhemcgOmHjeWkjeaOiOadg++8jOS9k+mqjOe5geeQkO+8iVxuICAvLyBvblN1YnNjcmliZVJlbWluZGVyKCkge1xuICAvLyAgIGlmIChpc1JlbWluZGVyU3Vic2NyaWJlZCgpKSByZXR1cm47XG4gIC8vICAgcmVxdWVzdFJlbWluZGVyU3Vic2NyaWJlKCkudGhlbigoYWNjZXB0ZWQpID0+IHtcbiAgLy8gICAgIHRoaXMuc2V0RGF0YSh7IHJlbWluZGVyU3Vic2NyaWJlZDogYWNjZXB0ZWQgfSk7XG4gIC8vICAgICBpZiAoYWNjZXB0ZWQpIHtcbiAgLy8gICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7LlvIDlkK/lrabkuaDmj5DphpInLCBpY29uOiAnc3VjY2VzcycgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5YaN5p2l5LiA6L2uXG4gIG9uUmVzdWx0UmVzdGFydCgpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiBmYWxzZSB9KTtcbiAgICB0aGlzLmluaXRCYXRjaCgpO1xuICB9LFxuXG4gIC8vIOe7k+aenOmhte+8muWkjeS5oOacrOi9ru+8iOeUqOWImuiAg+WujOeahOWOn+mYn+WIl+mHjeWIt+S4gOmBje+8jOS4jeiuoeWFpee0r+iuoeaWsOivje+8iVxuICBfbGFzdFJvdW5kUXVldWU6IFtdIGFzIFdvcmRJdGVtW10sXG5cbiAgb25SZXN1bHRSZXZpZXdSb3VuZCgpIHtcbiAgICBjb25zdCBsYXN0ID0gdGhpcy5fbGFzdFJvdW5kUXVldWU7XG4gICAgaWYgKCFsYXN0IHx8IGxhc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+acrOi9rumYn+WIl+W3suS4jeWcqO+8jOivleivleWGjeadpeS4gOi9ricsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgIHRoaXMuX2xvYWRlZEtleSA9ICcnOyAvLyDnu5Xov4figJzmlbDmja7mnKrlj5jot7Pov4fph43lu7rigJ3lrojljatcbiAgICB0aGlzLl9hbnN3ZXJlZFNldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIC8vIOWkjeS5oOi9ruS4jeiuoeWFpee0r+iuoeaWsOivje+8mua4heepuuaWsOivjembhuWQiO+8iF9pc05ld1dvcmQg6L+U5ZueIGZhbHNl77yJXG4gICAgdGhpcy5fbmV3V29yZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHJlcG9ydGVkTWFwOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHt9O1xuICAgIGZvciAoY29uc3QgdyBvZiBsYXN0KSB7XG4gICAgICBpZiAoaXNXb3JkUmVwb3J0ZWQody53b3JkKSkgcmVwb3J0ZWRNYXBbdy53b3JkXSA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBzaG93UmVzdWx0OiBmYWxzZSxcbiAgICAgIHF1ZXVlOiBsYXN0LFxuICAgICAgX3dvcmRCb29rV29yZHM6IHRoaXMuZGF0YS5fd29yZEJvb2tXb3JkcyxcbiAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAga25vd25Db3VudDogMCxcbiAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgIHRvdGFsQ291bnQ6IGxhc3QubGVuZ3RoLFxuICAgICAgc3RhdHVzTGFiZWw6ICflpI3kuaAnLFxuICAgICAgcXVpY2tMZWFybmluZzogdGhpcy5kYXRhLnByYWN0aWNlTW9kZSA9PT0gJ3F1aWNrJyxcbiAgICAgIGxpc3RBbnN3ZXJlZDoge30sXG4gICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIHJlcG9ydGVkTWFwXG4gICAgfSwgKCkgPT4ge1xuICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOe7k+aenOmhte+8mui/lOWbnlxuICBvblJlc3VsdEJhY2soKSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1Jlc3VsdDogZmFsc2UgfSk7XG4gICAgd3guc3dpdGNoVGFiKHsgdXJsOiAnL3BhZ2VzL2luZGV4L2luZGV4JyB9KTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrliIbkuqvmiZPljaHmtbfmiqVcbiAgb25TaGFyZVBvc3RlcigpIHtcbiAgICAvLyDorrDlvZXigJzku47mtbfmiqXpobXov5Tlm57ml7bkuI3ph43lvIDmlrDkuIDova7igJ3vvIzlubborrDkvY/ov5Tlm57lkI7mmK/lkKbopoHmgaLlpI3nu5PmnpzpobVcbiAgICB0aGlzLl9za2lwSW5pdE9uU2hvdyA9IHRydWU7XG4gICAgdGhpcy5fcmVzdG9yZVJlc3VsdE9uU2hvdyA9IHRoaXMuZGF0YS5zaG93UmVzdWx0O1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXN1bHQ6IGZhbHNlIH0pO1xuICAgIHd4Lm5hdmlnYXRlVG8oe1xuICAgICAgdXJsOiBgL3BhZ2VzL3Bvc3Rlci9wb3N0ZXI/cmF0ZT0ke3RoaXMuZGF0YS5yZXN1bHRSYXRlfWBcbiAgICB9KTtcbiAgfSxcblxuICAvLyDlkIzmraXlrabkuaDnu5/orqHliLDkupHnq6/vvIjnu48gc3luY1VzZXIg5LqR5Ye95pWw77ya5pyN5Yqh56uv5ZCI5bm25Y+W6L6D5aSn5YC877yM6Ziy5Y6G5Y+y6KKr5Yay5bCP77yJXG4gIHN5bmNUb0Nsb3VkKCkge1xuICAgIHN5bmNTdGF0c1RvQ2xvdWQoZ2V0U3RhdHMoKSk7XG4gIH0sXG5cbiAgLy8g6L2s5Y+R57uZ5aW95Y+LXG4gIG9uU2hhcmVBcHBNZXNzYWdlKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogJ+aIkeWcqOeUqOivjeagueiusOW/huazleiDjOWNleivje+8jOS4gOi1t+adpe+8gScsXG4gICAgICBwYXRoOiAnL3BhZ2VzL2luZGV4L2luZGV4J1xuICAgIH07XG4gIH0sXG5cbiAgLy8g5YiG5Lqr5Yiw5pyL5Y+L5ZyI77yI5Y2V6aG15qih5byP77yJXG4gIG9uU2hhcmVUaW1lbGluZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6ICfmiJHlnKjnlKjor43moLnorrDlv4bms5Xog4zljZXor43vvIzkuIDotbfmnaXvvIEnXG4gICAgfTtcbiAgfSxcbn0pO1xuIl19