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
        const word = this.data.queue[this.data.currentIndex];
        if (mode === 'quick') {
            this.setData({
                activeMode: 'quick',
                quickLearning: true,
                currentIndex: 0,
                isFlipped: false,
                showMeaning: false,
                spellInput: '',
                spellFeedback: 'none',
                choiceSelected: -1
            });
            return;
        }
        this.setData({
            activeMode: mode,
            quickLearning: false,
            isFlipped: false,
            showMeaning: false,
            spellInput: '',
            spellFeedback: 'none',
            choiceSelected: -1
        }, () => {
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
                    showMeaning: false,
                    isFlipped: false,
                    spellInput: '',
                    spellFeedback: 'none',
                    choiceSelected: -1,
                    quickUnknown: {}
                });
                this._answeredSet = new Set();
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
        if (this._checkAnswered())
            return;
        const word = this.data.queue[this.data.currentIndex];
        const bookId = (0, store_1.getCurrentBookId)();
        (0, store_1.recordWordProgress)(bookId, word.word, false);
        (0, store_1.recordStudy)(1, this._isNewWord(word.word));
        (0, store_1.addToWrongBook)(word.word, word.meaning, bookId);
        this.setData({
            unknownCount: this.data.unknownCount + 1
        });
        this.nextWord();
    },
    onListTap(e) {
        const word = e.currentTarget.dataset.word;
        if (word)
            (0, audio_1.playAudio)(word, this.data.accent);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3b3Jkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLDZDQXFCMkI7QUFFM0IsNkNBQW1EO0FBQ25ELHlEQUFzRDtBQUN0RCw0Q0FBMkQ7QUFDM0QsNkNBQTREO0FBQzVELHVEQUFnRjtBQUNoRix5REFBc0Y7QUFHdEYsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUM7QUFJekMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQUUzQyxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFHckMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQVEzQyxJQUFJLENBQUM7SUFDSCxJQUFJLEVBQUU7UUFFSixRQUFRLEVBQUUsTUFBTTtRQUNoQixTQUFTLEVBQUUsQ0FBQztRQUVaLEtBQUssRUFBRSxFQUFnQjtRQUN2QixZQUFZLEVBQUUsQ0FBQztRQUVmLFdBQVcsRUFBRSxLQUFLO1FBRWxCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLENBQUM7UUFDZixVQUFVLEVBQUUsQ0FBQztRQUViLFFBQVEsRUFBRSxDQUFDO1FBQ1gsYUFBYSxFQUFFLENBQUM7UUFFaEIsV0FBVyxFQUFFLElBQUk7UUFFakIsT0FBTyxFQUFFLElBQUk7UUFFYixPQUFPLEVBQUUsSUFBSTtRQUViLFNBQVMsRUFBRSxLQUFrQjtRQUU3QixTQUFTLEVBQUUsRUFBRTtRQUViLGFBQWEsRUFBRSxDQUFDO1FBRWhCLFNBQVMsRUFBRSxDQUFDO1FBQ1osWUFBWSxFQUFFLENBQUM7UUFFZixjQUFjLEVBQUUsSUFBSTtRQUNwQixhQUFhLEVBQUUsUUFBUTtRQUl2QixZQUFZLEVBQUUsTUFBc0I7UUFFcEMsVUFBVSxFQUFFLE1BQThCO1FBRTFDLGFBQWEsRUFBRSxFQUFvQjtRQUVuQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRWxCLGFBQWEsRUFBRSxLQUFLO1FBRXBCLFVBQVUsRUFBRSxFQUFFO1FBRWQsYUFBYSxFQUFFLE1BQU07UUFFckIsTUFBTSxFQUFFLElBQWM7UUFFdEIsVUFBVSxFQUFFLEtBQUs7UUFDakIsVUFBVSxFQUFFLENBQUM7UUFDYixZQUFZLEVBQUUsRUFBRTtRQUVoQixTQUFTLEVBQUUsS0FBSztRQUdoQixjQUFjLEVBQUUsRUFBZ0I7UUFFaEMsWUFBWSxFQUFFLEVBQTZCO1FBRTNDLGFBQWEsRUFBRSxLQUFLO1FBRXBCLFNBQVMsRUFBRSxRQUFtQztRQUU5QyxVQUFVLEVBQUUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFhO1FBQ3RELFNBQVMsRUFBRSxDQUFDO1FBRVosU0FBUyxFQUFFLEtBQUs7UUFDaEIsVUFBVSxFQUFFLEVBQUU7UUFDZCxZQUFZLEVBQUUsRUFBK0M7UUFDN0QsU0FBUyxFQUFFLEVBQVk7UUFFdkIsVUFBVSxFQUFFLEtBQUs7UUFDakIsVUFBVSxFQUFFLEVBQXFCO1FBQ2pDLFVBQVUsRUFBRSxFQUFFO1FBQ2QsV0FBVyxFQUFFLEVBQTZCO0tBQzNDO0lBRUQsTUFBTSxLQUFJLENBQUM7SUFHWCxZQUFZLEVBQUUsSUFBSSxHQUFHLEVBQXlCO0lBRTlDLE1BQU07UUFFSixJQUFJLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN6QixJQUFJLENBQUMsZUFBZSxHQUFHLEtBQUssQ0FBQztZQUM3QixJQUFJLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO2dCQUM5QixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7WUFDckMsQ0FBQztZQUNELElBQUksQ0FBQyxvQkFBb0IsR0FBRyxLQUFLLENBQUM7WUFDbEMsT0FBTztRQUNULENBQUM7UUFFRCxJQUFJLEVBQUUsQ0FBQyxjQUFjLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDN0MsRUFBRSxDQUFDLGlCQUFpQixDQUFDLGVBQWUsQ0FBQyxDQUFDO1lBQ3RDLElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQzFCLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDM0IsQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLEVBQUUsQ0FBQyxjQUFjLENBQUMsZ0JBQWdCLENBQTZDLENBQUM7UUFDaEcsRUFBRSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLENBQUM7UUFDdkMsSUFDRSxPQUFPLElBQUksT0FBTyxPQUFPLEtBQUssUUFBUTtZQUN0QyxPQUFPLENBQUMsTUFBTSxLQUFLLElBQUEsd0JBQWdCLEdBQUU7WUFDckMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUN4RCxDQUFDO1lBQ0QsSUFBSSxDQUFDLFlBQVksR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDO1FBQ3BDLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDM0IsQ0FBQztRQUVELElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUMzQyxFQUFFLENBQUMsaUJBQWlCLENBQUMsYUFBYSxDQUFDLENBQUM7WUFDcEMsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDdkIsQ0FBQztRQUdELElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzlDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ3ZDLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxJQUFJLENBQUM7WUFDN0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxFQUFFLENBQUM7UUFDdkIsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1FBQ2hDLENBQUM7UUFHRCxJQUFJLENBQUMsSUFBQSx1QkFBZSxHQUFFLEVBQUUsQ0FBQztZQUN2QixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztZQUNuRCxPQUFPO1FBQ1QsQ0FBQztRQUNELElBQUksQ0FBQyxPQUFPLENBQUM7WUFDWCxhQUFhLEVBQUUsSUFBQSx3QkFBZ0IsR0FBRTtZQUNqQyxZQUFZLEVBQUUsSUFBQSx1QkFBZSxHQUFFO1lBQy9CLFNBQVMsRUFBRSxDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBQSx1QkFBZSxHQUFFLENBQUM7WUFDakYsTUFBTSxFQUFFLElBQUEsaUJBQVMsR0FBRTtZQUNuQixTQUFTLEVBQUUsSUFBQSxvQkFBWSxHQUFFO1NBRTFCLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsUUFBUTtJQUVSLENBQUM7SUFFRCxLQUFLLENBQUMsU0FBUztRQUViLElBQUksSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLGdCQUFnQixHQUFHLEtBQUssQ0FBQztZQUM5QixNQUFNLEVBQUUsR0FBRyxNQUFNLElBQUksQ0FBQyxlQUFlLEVBQUUsQ0FBQztZQUN4QyxJQUFJLENBQUMsRUFBRTtnQkFBRSxNQUFNLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3ZDLE9BQU87UUFDVCxDQUFDO1FBQ0QsT0FBTyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBR0QsS0FBSyxDQUFDLGVBQWU7UUFDbkIsTUFBTSxNQUFNLEdBQUcsSUFBQSw0QkFBb0IsR0FBRSxDQUFDO1FBQ3RDLElBQUksTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN4QixFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLGtCQUFrQixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQzFELE9BQU8sS0FBSyxDQUFDO1FBQ2YsQ0FBQztRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksR0FBRyxFQUFvQixDQUFDO1FBQzNDLEtBQUssTUFBTSxDQUFDLElBQUksTUFBTSxFQUFFLENBQUM7WUFDdkIsTUFBTSxHQUFHLEdBQUcsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3ZDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ2pCLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQztRQUM1QixDQUFDO1FBQ0QsTUFBTSxLQUFLLEdBQWUsRUFBRSxDQUFDO1FBQzdCLE1BQU0sUUFBUSxHQUFlLEVBQUUsQ0FBQztRQUNoQyxNQUFNLFVBQVUsR0FBRyxJQUFJLEdBQUcsQ0FDeEIsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FDNUQsQ0FBQztRQUNGLEtBQUssTUFBTSxDQUFDLEdBQUcsRUFBRSxLQUFLLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUNsQyxJQUFJLENBQUM7Z0JBQ0gsTUFBTSxJQUFJLEdBQUcsTUFBTSxJQUFBLHlCQUFXLEVBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQ3BDLElBQUksQ0FBQyxJQUFJO29CQUFFLFNBQVM7Z0JBQ3BCLFFBQVEsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQzdCLE1BQU0sSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO2dCQUN0RCxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUUsQ0FBQztvQkFDM0IsSUFBSSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUM7d0JBQUUsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEQsQ0FBQztZQUNILENBQUM7WUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsZUFBZSxFQUFFLEdBQUcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6QyxDQUFDO1FBQ0gsQ0FBQztRQUNELElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFckMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUNsQixDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQ2hHLENBQUM7UUFDRixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3JDLE1BQU0sV0FBVyxHQUE0QixFQUFFLENBQUM7UUFDaEQsS0FBSyxNQUFNLENBQUMsSUFBSSxLQUFLLEVBQUUsQ0FBQztZQUN0QixJQUFJLElBQUEsMkJBQWMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUFFLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsSUFBSSxDQUFDO1FBQ3pELENBQUM7UUFDRCxNQUFNLGFBQWEsR0FBRyxJQUFBLDRCQUFvQixFQUFDLElBQUEsd0JBQWdCLEdBQUUsQ0FBQyxDQUFDO1FBQy9ELElBQUksQ0FBQyxPQUFPLENBQUM7WUFDWCxRQUFRLEVBQUUsTUFBTTtZQUNoQixLQUFLO1lBQ0wsY0FBYyxFQUFFLFFBQVE7WUFDeEIsWUFBWSxFQUFFLENBQUM7WUFDZixhQUFhLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEtBQUssT0FBTztZQUNqRCxXQUFXLEVBQUUsS0FBSztZQUNsQixTQUFTLEVBQUUsS0FBSztZQUNoQixVQUFVLEVBQUUsQ0FBQztZQUNiLFlBQVksRUFBRSxDQUFDO1lBQ2YsVUFBVSxFQUFFLEtBQUssQ0FBQyxNQUFNO1lBQ3hCLFFBQVEsRUFBRSxhQUFhLENBQUMsUUFBUTtZQUNoQyxhQUFhLEVBQUUsYUFBYSxDQUFDLGFBQWE7WUFDMUMsV0FBVyxFQUFFLElBQUk7WUFDakIsT0FBTyxFQUFFLEtBQUs7WUFDZCxPQUFPLEVBQUUsS0FBSztZQUNkLFVBQVUsRUFBRSxLQUFLO1lBQ2pCLFVBQVUsRUFBRSxFQUFFO1lBQ2QsYUFBYSxFQUFFLE1BQU07WUFDckIsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUNsQixZQUFZLEVBQUUsRUFBRTtZQUNoQixXQUFXO1NBQ1osRUFBRSxHQUFHLEVBQUU7WUFDTixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxnQkFBZ0I7UUFDcEIsTUFBTSxNQUFNLEdBQUcsSUFBQSx3QkFBZ0IsR0FBRSxDQUFDO1FBQ2xDLE1BQU0sU0FBUyxHQUFHLElBQUEsb0JBQVksR0FBRSxDQUFDO1FBQ2pDLE1BQU0sWUFBWSxHQUFHLElBQUEsdUJBQWUsR0FBRSxDQUFDO1FBQ3ZDLE1BQU0sTUFBTSxHQUFHLElBQUEsaUJBQVMsR0FBRSxDQUFDO1FBQzNCLE1BQU0sU0FBUyxHQUFHLElBQUEsb0JBQVksR0FBRSxDQUFDO1FBR2pDLE1BQU0sU0FBUyxHQUFHLElBQUEsb0JBQVksR0FBRSxDQUFDO1FBQ2pDLE1BQU0sZUFBZSxHQUEyQixFQUFFLEdBQUcsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLEtBQUssRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsQ0FBQztRQUMxRyxNQUFNLFdBQVcsR0FBRyxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsWUFBWSxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzlGLElBQ0UsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVTtZQUNuRCxDQUFDLElBQUksQ0FBQyxXQUFXLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWTtZQUN2QyxJQUFJLENBQUMsVUFBVSxLQUFLLFdBQVcsRUFDL0IsQ0FBQztZQUNELE9BQU87UUFDVCxDQUFDO1FBQ0QsSUFBSSxDQUFDLFVBQVUsR0FBRyxXQUFXLENBQUM7UUFJOUIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDakMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxJQUFJLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7UUFDN0ksQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsRUFBRSxjQUFjLEVBQUUsZUFBZSxDQUFDLFNBQVMsQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7UUFDOUgsQ0FBQztRQUVELElBQUksSUFBSSxDQUFDO1FBQ1QsSUFBSSxDQUFDO1lBQ0gsSUFBSSxHQUFHLE1BQU0sSUFBQSx5QkFBVyxFQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ25DLENBQUM7UUFBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQ1gsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDN0IsQ0FBQztRQUVELElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBRXBELE1BQU0sU0FBUyxHQUFHLGlCQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsS0FBSyxNQUFNLENBQUMsQ0FBQztZQUN4RCxJQUFJLFNBQVMsSUFBSSxTQUFTLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDNUMsSUFBSSxHQUFHLFNBQVMsQ0FBQztZQUNuQixDQUFDO2lCQUFNLENBQUM7Z0JBQ04sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxDQUFDLENBQUM7Z0JBQzVDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUNwRCxPQUFPO1lBQ1QsQ0FBQztRQUNILENBQUM7UUFJRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO1FBRzdELE1BQU0sYUFBYSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNsRSxNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3JFLE1BQU0sWUFBWSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDeEUsSUFBSSxRQUFvQixDQUFDO1FBQ3pCLElBQUksUUFBUSxHQUFHLEVBQUUsQ0FBQztRQUNsQixJQUFJLFlBQVksRUFBRSxDQUFDO1lBQ2pCLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3hCLENBQUM7YUFBTSxJQUFJLFNBQVMsS0FBSyxVQUFVLEVBQUUsQ0FBQztZQUNwQyxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7WUFDaEQsUUFBUSxHQUFHLGFBQWEsQ0FBQztRQUMzQixDQUFDO2FBQU0sSUFBSSxTQUFTLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDaEMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsQ0FBQztZQUV2RCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsUUFBUSxHQUFHLHNCQUFzQixDQUFDO1lBQ3BDLENBQUM7aUJBQU0sQ0FBQztnQkFDTixRQUFRLEdBQUcsWUFBWSxDQUFDO1lBQzFCLENBQUM7UUFDSCxDQUFDO2FBQU0sSUFBSSxTQUFTLEtBQUssU0FBUyxFQUFFLENBQUM7WUFDbkMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sS0FBSyxNQUFNLENBQUMsQ0FBQztZQUN2RCxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxRQUFRLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDekMsUUFBUSxHQUFHLHNCQUFzQixDQUFDO1lBQ3BDLENBQUM7aUJBQU0sQ0FBQztnQkFDTixRQUFRLEdBQUcsWUFBWSxDQUFDO1lBQzFCLENBQUM7UUFDSCxDQUFDO2FBQU0sQ0FBQztZQUNOLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO1FBQ3hCLENBQUM7UUFFRCxJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDMUIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE9BQU8sRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEVBQUUsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxDQUFDLENBQUM7WUFDcEYsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDaEQsT0FBTztRQUNULENBQUM7UUFFRCxNQUFNLFdBQVcsR0FBRyxJQUFBLHNCQUFjLEVBQUMsTUFBTSxDQUFDLENBQUM7UUFDM0MsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBS3ZCLE1BQU0sUUFBUSxHQUFlLEVBQUUsQ0FBQztRQUNoQyxNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUM7UUFFaEMsS0FBSyxNQUFNLENBQUMsSUFBSSxRQUFRLEVBQUUsQ0FBQztZQUN6QixNQUFNLENBQUMsR0FBRyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlCLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztnQkFDUCxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25CLENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsTUFBTSxLQUFLLFVBQVUsSUFBSSxDQUFDLENBQUMsVUFBVSxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsVUFBVSxJQUFJLEdBQUcsRUFBRSxDQUFDO2dCQUM5RSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ25CLENBQUM7UUFDSCxDQUFDO1FBR0QsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUtqRSxJQUFJLEtBQUssQ0FBQztRQUNWLElBQUksSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ3JCLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztnQkFFMUIsSUFBSSxDQUFDLFdBQVcsR0FBRyxLQUFLLENBQUM7Z0JBQ3pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsZUFBZSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUN2RCxLQUFLLEdBQUcsQ0FBQyxHQUFHLFFBQVEsRUFBRSxHQUFHLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDekQsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLEtBQUssR0FBRyxRQUFRLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztZQUN2QyxDQUFDO1FBQ0gsQ0FBQzthQUFNLElBQUksU0FBUyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBRWxDLE1BQU0sR0FBRyxHQUFlLEVBQUUsQ0FBQztZQUMzQixJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3hCLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztnQkFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM5QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzlCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbEQsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEIsQ0FBQztZQUNILENBQUM7WUFDRCxNQUFNLFNBQVMsR0FBRyxTQUFTLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQztZQUN6QyxNQUFNLFVBQVUsR0FBZSxFQUFFLENBQUM7WUFDbEMsSUFBSSxTQUFTLEdBQUcsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLE1BQU0sSUFBSSxHQUFHLENBQUMsR0FBRyxRQUFRLENBQUMsQ0FBQztnQkFDM0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO2dCQUM5QyxLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7b0JBQzlCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFDNUQsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFDbEQsVUFBVSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0IsQ0FBQztZQUNILENBQUM7WUFDRCxLQUFLLEdBQUcsQ0FBQyxHQUFHLEdBQUcsRUFBRSxHQUFHLFVBQVUsQ0FBQyxDQUFDO1FBQ2xDLENBQUM7YUFBTSxDQUFDO1lBQ04sS0FBSyxHQUFHLENBQUMsR0FBRyxRQUFRLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ3pELENBQUM7UUFHRCxJQUFJLFVBQVUsR0FBRyxLQUFLLENBQUM7UUFDdkIsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sYUFBYSxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRTtnQkFDMUMsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztnQkFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxVQUFVLENBQUM7WUFDdEMsQ0FBQyxDQUFDLENBQUM7WUFDSCxVQUFVLEdBQUcsYUFBYSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7UUFDakQsQ0FBQztRQUlELElBQUksU0FBUyxHQUFHLEtBQUssQ0FBQztRQUN0QixJQUFJLElBQUksQ0FBQyxZQUFZLElBQUssSUFBSSxDQUFDLFlBQXlCLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQ3BFLE1BQU0sTUFBTSxHQUFJLElBQUksQ0FBQyxZQUF5QixDQUFDLE1BQU0sQ0FBQztZQUN0RCxNQUFNLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1lBQ2pDLEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLFlBQXdCO2dCQUFFLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7WUFDM0UsTUFBTSxPQUFPLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3pFLElBQUksT0FBTyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDdkIsVUFBVSxHQUFJLElBQUksQ0FBQyxZQUF5QjtxQkFDekMsR0FBRyxDQUFDLENBQUMsQ0FBUyxFQUFFLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBVyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxLQUFLLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO3FCQUMzRixNQUFNLENBQUMsQ0FBQyxDQUF1QixFQUFpQixFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUMzRCxTQUFTLEdBQUcsSUFBSSxDQUFDO2dCQUNqQixJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsTUFBTSxFQUFFLENBQUM7b0JBRS9CLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsT0FBTyxNQUFNLEdBQUcsVUFBVSxDQUFDLE1BQU0sYUFBYSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO2dCQUN4RixDQUFDO1lBQ0gsQ0FBQztpQkFBTSxDQUFDO2dCQUVOLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDL0QsQ0FBQztZQUNELElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxDQUFDO1FBQzNCLENBQUM7UUFJRCxJQUFJLFNBQVMsS0FBSyxRQUFRLElBQUksQ0FBQyxTQUFTLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNsRSxLQUFLLElBQUksQ0FBQyxHQUFHLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQztnQkFDL0MsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUMsTUFBTSxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUN4QixVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUM5QixVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BCLENBQUM7UUFDSCxDQUFDO1FBR0QsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBQ3JDLEtBQUssTUFBTSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUM7WUFDM0IsSUFBSSxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztnQkFBRSxJQUFJLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDM0UsQ0FBQztRQUdELE1BQU0sV0FBVyxHQUE0QixFQUFFLENBQUM7UUFDaEQsS0FBSyxNQUFNLENBQUMsSUFBSSxVQUFVLEVBQUUsQ0FBQztZQUMzQixJQUFJLElBQUEsMkJBQWMsRUFBQyxDQUFDLENBQUMsSUFBSSxDQUFDO2dCQUFFLFdBQVcsQ0FBQyxDQUFD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QyxDQUFDO0lBQ0wsQ0FBQztJQUdELFdBQVc7UUFDVCxJQUFBLHdCQUFnQixFQUFDLElBQUEsZ0JBQVEsR0FBRSxDQUFDLENBQUM7SUFDL0IsQ0FBQztJQUdELGlCQUFpQjtRQUNmLE9BQU87WUFDTCxLQUFLLEVBQUUsa0JBQWtCO1lBQ3pCLElBQUksRUFBRSxvQkFBb0I7U0FDM0IsQ0FBQztJQUNKLENBQUM7SUFHRCxlQUFlO1FBQ2IsT0FBTztZQUNMLEtBQUssRUFBRSxrQkFBa0I7U0FDMUIsQ0FBQztJQUNKLENBQUM7Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBwYWdlcy93b3Jkcy93b3Jkcy50c1xuaW1wb3J0IHsgV29yZEl0ZW0gfSBmcm9tICcuLi8uLi9kYXRhL3R5cGVzJztcbmltcG9ydCB7XG4gIGdldEN1cnJlbnRCb29rSWQsXG4gIGdldEFsbFByb2dyZXNzLFxuICByZWNvcmRXb3JkUHJvZ3Jlc3MsXG4gIHJlY29yZFN0dWR5LFxuICBnZXRCb29rUHJvZ3Jlc3NTdGF0cyxcbiAgZ2V0U3RhdHMsXG4gIHN5bmNTdGF0c1RvQ2xvdWQsXG4gIGhhc1NlbGVjdGVkQm9vayxcbiAgZ2V0U3R1ZHlNb2RlLFxuICBzZXRTdHVkeU1vZGUsXG4gIGdldEJhdGNoU2l6ZSxcbiAgc2V0QmF0Y2hTaXplLFxuICBnZXRQcmFjdGljZU1vZGUsXG4gIHNldFByYWN0aWNlTW9kZSxcbiAgZ2V0T3JkZXJNb2RlLFxuICBzZXRPcmRlck1vZGUsXG4gIGdldFRvZGF5TGVhcm5lZFdvcmRzLFxuICBnZXRBY2NlbnQsXG4gIHNldEFjY2VudCxcbiAgYWRkVG9Xcm9uZ0Jvb2tcbn0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHR5cGUgeyBQcmFjdGljZU1vZGUsIENvbmNyZXRlUHJhY3RpY2VNb2RlLCBBY2NlbnQsIFN0dWR5TW9kZSB9IGZyb20gJy4uLy4uL3V0aWxzL3N0b3JlJztcbmltcG9ydCB7IHRvQ29uY3JldGVNb2RlIH0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHsgZ2V0Qm9va0J5SWQgfSBmcm9tICcuLi8uLi91dGlscy93b3JkU2VydmljZSc7XG5pbXBvcnQgeyB3b3JkQm9va3MgYXMgbG9jYWxCb29rcyB9IGZyb20gJy4uLy4uL2RhdGEvaW5kZXgnO1xuaW1wb3J0IHsgcGxheUF1ZGlvLCBwcmVsb2FkQXVkaW8gfSBmcm9tICcuLi8uLi91dGlscy9hdWRpbyc7XG5pbXBvcnQgeyByZXBvcnRXb3JkLCBpc1dvcmRSZXBvcnRlZCwgUmVwb3J0VHlwZSB9IGZyb20gJy4uLy4uL3V0aWxzL3dvcmRSZXBvcnQnO1xuaW1wb3J0IHsgY29sbGVjdFRvZGF5Um93cywgc2hvd0V4cG9ydFNoZWV0LCBUb2RheVJvdyB9IGZyb20gJy4uLy4uL3V0aWxzL3RvZGF5RXhwb3J0JztcblxuLy8g5aSN5Lmg5qih5byP5LiA5qyh5oCn5YWl5Y+j5qCH5b+X77yI6aaW6aG14oCc5b6F5aSN5Lmg4oCd54K55Ye75pe25YaZ5YWl77yMd29yZHMg6aG1IG9uU2hvdyDmtojotLnvvIlcbmNvbnN0IFJFVklFV19NT0RFX0tFWSA9ICdiY19yZXZpZXdfbW9kZSc7XG5cbi8vIOiusOW/huS9k+ajgOmrmOWNseivjeS4gOi9ruW8j+WFpeWPo+agh+W/l++8iG1lbW9yeSDpobXjgIznq4vljbPlpI3kuaDov5nkupvor43jgI3lhpnlhaXvvIx3b3JkcyDpobUgb25TaG93IOa2iOi0ue+8iVxuLy8g5YC877yaeyBib29rSWQ6IHN0cmluZywgd29yZHM6IHN0cmluZ1tdIH3vvIzkuI7mnKzor43kuabljLnphY3miY3nlJ/mlYhcbmNvbnN0IE1FTU9SWV9XT1JEU19LRVkgPSAnYmNfbWVtb3J5X3dvcmRzJztcbi8vIOmmlumhteKAnOWtpuaWsOivjeKAneWFpeWPo+agh+W/l++8iOS4gOasoeaAp++8ie+8muW8uuWItuW8gOaWsOS4gOi9ru+8jOS4jei1sOKAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneWuiOWNq1xuY29uc3QgTkVXX1JPVU5EX0tFWSA9ICdiY19uZXdfcm91bmQnO1xuXG4vLyDigJzku4rml6XlpI3nm5jigJ3lhaXlj6PmoIflv5fvvIjkuIDmrKHmgKfvvInvvJrmnKzova7lj6rlpI3nm5jku4rlpKnlrabov4fnmoTor43vvIjmiJHnmoTpobUv6aaW6aG15YaZ5YWl77yJXG5jb25zdCBUT0RBWV9SRVZJRVdfS0VZID0gJ2JjX3RvZGF5X3Jldmlldyc7XG5cbi8vIOWbm+mAieS4gOmAiemhueaOpeWPo1xuaW50ZXJmYWNlIENob2ljZU9wdGlvbiB7XG4gIG1lYW5pbmc6IHN0cmluZztcbiAgaXNDb3JyZWN0OiBib29sZWFuO1xufVxuXG5QYWdlKHtcbiAgZGF0YToge1xuICAgIC8vIOW9k+WJjeivjeS5puS/oeaBr1xuICAgIGJvb2tOYW1lOiAn5Yid5Lit6K+N5rGHJyxcbiAgICBib29rVG90YWw6IDAsXG4gICAgLy8g5pys6L2u5Y2V6K+N6Zif5YiXXG4gICAgcXVldWU6IFtdIGFzIFdvcmRJdGVtW10sXG4gICAgY3VycmVudEluZGV4OiAwLFxuICAgIC8vIOaYr+WQpuaYvuekuumHiuS5ie+8iOWNoeeJh+aooeW8j+eUqO+8iVxuICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAvLyDmnKzova7lrabkuaDov5vluqZcbiAgICBrbm93bkNvdW50OiAwLFxuICAgIHVua25vd25Db3VudDogMCxcbiAgICB0b3RhbENvdW50OiAwLFxuICAgIC8vIOW+heWkjeS5oOaVsFxuICAgIGR1ZUNvdW50OiAwLFxuICAgIG1hc3RlcmVkQ291bnQ6IDAsXG4gICAgLy8g54q25oCB5qCH562+XG4gICAgc3RhdHVzTGFiZWw6ICfmlrDor40nLFxuICAgIC8vIOaYr+WQpui/mOacieabtOWkmlxuICAgIGhhc01vcmU6IHRydWUsXG4gICAgLy8g5Yqg6L2954q25oCBXG4gICAgbG9hZGluZzogdHJ1ZSxcbiAgICAvLyDlrabkuaDojIPlm7TnrZvpgInvvIjlhajpg6gv6auY6aKRL+iZmuivjS/lrp7or43vvIlcbiAgICBzdHVkeU1vZGU6ICdhbGwnIGFzIFN0dWR5TW9kZSxcbiAgICAvLyDmr4/ova7lrabkuaDljZXor43mlbDvvIjpobbpg6jmjInpkq7lj6/osIPvvIlcbiAgICBiYXRjaFNpemU6IDEwLFxuICAgIC8vIOmrmOmikeivjeaVsOmHj1xuICAgIGhpZ2hGcmVxQ291bnQ6IDAsXG4gICAgLy8g6Jma6K+NL+WunuivjeaVsOmHj1xuICAgIGZ1bmNDb3VudDogMCxcbiAgICBjb250ZW50Q291bnQ6IDAsXG4gICAgLy8g5a2m5Lmg6IyD5Zu05qCH562+77yId3htbCDlsZXnpLrvvIlcbiAgICB3b3JkQ2xhc3NMYWJlbDogJ+WFqOmDqCcsXG4gICAgY3VycmVudEJvb2tJZDogJ2p1bmlvcicsXG4gICAgLy8gcmVtaW5kZXJTdWJzY3JpYmVkOiBmYWxzZSwgLy8g5a2m5Lmg5o+Q6YaS5bey5LiL57q/77yIMjAyNi0wOC0zMe+8iVxuICAgIC8vIOKUgOKUgOKUgCDpmLbmrrXkuIDmlrDlop4g4pSA4pSA4pSAXG4gICAgLy8g57uD5Lmg5qih5byP77ya5Y2h54mH57+76Z2iIC8g5Zub6YCJ5LiAIC8g5ou85YaZIC8g5re35ZCI77yIbWl477yJXG4gICAgcHJhY3RpY2VNb2RlOiAnY2FyZCcgYXMgUHJhY3RpY2VNb2RlLFxuICAgIC8vIOW9k+WJjeivjeWunumZhea4suafk+eahOWHuumimOaWueW8j++8iG1peCDmqKHlvI/kuIvmr4/kuKror43pmo/mnLrvvIzlhbbkvZnkuI4gcHJhY3RpY2VNb2RlIOS4gOiHtO+8iVxuICAgIGFjdGl2ZU1vZGU6ICdjYXJkJyBhcyBDb25jcmV0ZVByYWN0aWNlTW9kZSxcbiAgICAvLyDlm5vpgInkuIDpgInpoblcbiAgICBjaG9pY2VPcHRpb25zOiBbXSBhcyBDaG9pY2VPcHRpb25bXSxcbiAgICAvLyDlm5vpgInkuIDmmK/lkKblt7LpgIlcbiAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgLy8g5Zub6YCJ5LiA5piv5ZCm562U5a+5XG4gICAgY2hvaWNlQ29ycmVjdDogZmFsc2UsXG4gICAgLy8g5ou85YaZ5qih5byP6L6T5YWl5YC8XG4gICAgc3BlbGxJbnB1dDogJycsXG4gICAgLy8g5ou85YaZ5Y+N6aaI54q25oCB77yabm9uZSAvIGNvcnJlY3QgLyB3cm9uZ1xuICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAvLyDlj5Hpn7Plj6Ppn7PlgY/lpb1cbiAgICBhY2NlbnQ6ICd1cycgYXMgQWNjZW50LFxuICAgIC8vIOe7k+aenOmhtVxuICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgIHJlc3VsdFJhdGU6IDAsXG4gICAgcmVzdWx0UHJhaXNlOiAnJyxcbiAgICAvLyDnv7vpnaLliqjnlLvnirbmgIFcbiAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgIC8vIOWNoeeJh+aooeW8j+OAjOS4jeiupOivhuOAjeaPreekuuetlOahiOeKtuaAge+8iHRydWUg5pe25bGV56S644CM5LiL5LiA5Liq44CN5oyJ6ZKu5bm26ZSB5a6a57+76Z2i77yJXG4gICAgLy8g5LiK5LiA6aKY5a+56ZSZ77yI55So5LqO57uT5p6c6aG15Yik5pat5piv5ZCm6K6w5b2V77yJXG4gICAgX3dvcmRCb29rV29yZHM6IFtdIGFzIFdvcmRJdGVtW10sXG4gICAgLy8g5b+r6YCf5qih5byP77ya5qCH6K6w5Li65LiN6K6k6K+G55qE6K+N77yId29yZCDihpIgdHJ1Ze+8ie+8jOacquagh+iusOm7mOiupOiupOivhlxuICAgIHF1aWNrVW5rbm93bjoge30gYXMgUmVjb3JkPHN0cmluZywgYm9vbGVhbj4sXG4gICAgLy8g5b+r6YCf5qih5byP6Zi25q615byA5YWz77yadHJ1ZT3lv6vpgJ/lrabkuaDvvIjliJfooajmtY/op4jvvInvvIxmYWxzZT3mo4DmtYvpmLbmrrXvvIjlm5vpgInkuIDmqKHlvI/vvIlcbiAgICBxdWlja0xlYXJuaW5nOiBmYWxzZSxcbiAgICAvLyDlh7rpopjpobrluo/vvJrpmo/mnLogLyDpobrluo9cbiAgICBvcmRlck1vZGU6ICdyYW5kb20nIGFzICdyYW5kb20nIHwgJ3NlcXVlbnRpYWwnLFxuICAgIC8vIOKUgOKUgOKUgCDlh7rpopjmqKHlvI/kuIvmi4nmoYYg4pSA4pSA4pSAXG4gICAgbW9kZUxhYmVsczogWyfljaHniYcnLCAn6YCJ5oupJywgJ+aLvOWGmScsICfmt7flkIgnLCAn5b+r6YCfJ10gYXMgc3RyaW5nW10sXG4gICAgbW9kZUluZGV4OiAwLFxuICAgIC8vIOKUgOKUgOKUgCDoh6rlrprkuYnpgInmi6nlvLnmoYYg4pSA4pSA4pSAXG4gICAgc2hvd1NoZWV0OiBmYWxzZSxcbiAgICBzaGVldFRpdGxlOiAnJyxcbiAgICBzaGVldE9wdGlvbnM6IFtdIGFzIEFycmF5PHsgbGFiZWw6IHN0cmluZzsgYWN0aXZlOiBib29sZWFuIH0+LFxuICAgIHNoZWV0VHlwZTogJycgYXMgc3RyaW5nLFxuICAgIC8vIOKUgOKUgOKUgCDnuqDplJnkuIrmiqUg4pSA4pSA4pSAXG4gICAgc2hvd1JlcG9ydDogZmFsc2UsXG4gICAgcmVwb3J0VHlwZTogJycgYXMgUmVwb3J0VHlwZSB8ICcnLFxuICAgIHJlcG9ydERlc2M6ICcnLFxuICAgIHJlcG9ydGVkTWFwOiB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiAvLyDlt7LkuIrmiqXor43vvIh3b3JkIOKGkiB0cnVl77yJXG4gIH0sXG5cbiAgb25Mb2FkKCkge30sXG5cbiAgLy8g5pys6L2u5bey5L2c562U55qE5LiL5qCH6ZuG5ZCI77yI5L+u5aSN5YiH5qih5byP5ZCO5ZCM5LiA6K+N6YeN5aSN6K6h5pWw55qEIGJ1Z++8iVxuICBfYW5zd2VyZWRTZXQ6IG5ldyBTZXQ8bnVtYmVyPigpIGFzIFNldDxudW1iZXI+LFxuXG4gIG9uU2hvdygpIHtcbiAgICAvLyDku47liIbkuqvmtbfmiqXpobXov5Tlm57vvJrkv53nlZnlvZPliY3kuIDova7nu5PmnpzvvIzkuI3ph43mlrDliqDovb3mlrDnmoTkuIDova5cbiAgICBpZiAodGhpcy5fc2tpcEluaXRPblNob3cpIHtcbiAgICAgIHRoaXMuX3NraXBJbml0T25TaG93ID0gZmFsc2U7XG4gICAgICBpZiAodGhpcy5fcmVzdG9yZVJlc3VsdE9uU2hvdykge1xuICAgICAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiB0cnVlIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5fcmVzdG9yZVJlc3VsdE9uU2hvdyA9IGZhbHNlO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICAvLyDmtojotLnpppbpobXigJzlvoXlpI3kuaDigJ3lhaXlj6PmoIflv5fvvJrmnKzova7ku4XlpI3kuaDliLDmnJ/lvoXlpI3kuaDor43vvIjkuIDmrKHmgKfvvIlcbiAgICBpZiAod3guZ2V0U3RvcmFnZVN5bmMoUkVWSUVXX01PREVfS0VZKSA9PT0gMSkge1xuICAgICAgd3gucmVtb3ZlU3RvcmFnZVN5bmMoUkVWSUVXX01PREVfS0VZKTtcbiAgICAgIHRoaXMuX3Jldmlld01vZGUgPSB0cnVlO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9yZXZpZXdNb2RlID0gZmFsc2U7XG4gICAgfVxuICAgIC8vIOa2iOi0ueiusOW/huS9k+ajgOWFpeWPo+agh+W/l++8muacrOi9ruWPquWkjeS5oOS9k+ajgOa4heWNlemHjOeahOmrmOWNseivje+8iOS4gOasoeaAp++8jOi3qOivjeS5puS4ouW8g++8iVxuICAgIGNvbnN0IG1lbUZsYWcgPSB3eC5nZXRTdG9yYWdlU3luYyhNRU1PUllfV09SRFNfS0VZKSBhcyB7IGJvb2tJZDogc3RyaW5nOyB3b3Jkczogc3RyaW5nW10gfSB8ICcnO1xuICAgIHd4LnJlbW92ZVN0b3JhZ2VTeW5jKE1FTU9SWV9XT1JEU19LRVkpO1xuICAgIGlmIChcbiAgICAgIG1lbUZsYWcgJiYgdHlwZW9mIG1lbUZsYWcgPT09ICdvYmplY3QnICYmXG4gICAgICBtZW1GbGFnLmJvb2tJZCA9PT0gZ2V0Q3VycmVudEJvb2tJZCgpICYmXG4gICAgICBBcnJheS5pc0FycmF5KG1lbUZsYWcud29yZHMpICYmIG1lbUZsYWcud29yZHMubGVuZ3RoID4gMFxuICAgICkge1xuICAgICAgdGhpcy5fbWVtb3J5V29yZHMgPSBtZW1GbGFnLndvcmRzO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl9tZW1vcnlXb3JkcyA9IG51bGw7XG4gICAgfVxuICAgIC8vIOmmlumhteS4u+WKqOeCueKAnOWtpuaWsOivjeKAne+8muW8uuWItuW8gOaWsOS4gOi9ru+8iOa4heaOiemHjeW7uuWuiOWNq+eahCBrZXnvvIlcbiAgICBpZiAod3guZ2V0U3RvcmFnZVN5bmMoTkVXX1JPVU5EX0tFWSkgPT09IDEpIHtcbiAgICAgIHd4LnJlbW92ZVN0b3JhZ2VTeW5jKE5FV19ST1VORF9LRVkpO1xuICAgICAgdGhpcy5fbG9hZGVkS2V5ID0gJyc7XG4gICAgfVxuXG4gICAgLy8g5raI6LS54oCc5LuK5pel5aSN55uY4oCd5YWl5Y+j5qCH5b+X77ya5pys6L2u5Y+q5aSN55uY5LuK5aSp5a2m6L+H55qE6K+N77yI5LiA5qyh5oCn77yJXG4gICAgaWYgKHd4LmdldFN0b3JhZ2VTeW5jKFRPREFZX1JFVklFV19LRVkpID09PSAxKSB7XG4gICAgICB3eC5yZW1vdmVTdG9yYWdlU3luYyhUT0RBWV9SRVZJRVdfS0VZKTtcbiAgICAgIHRoaXMuX3RvZGF5UmV2aWV3TW9kZSA9IHRydWU7XG4gICAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fdG9kYXlSZXZpZXdNb2RlID0gZmFsc2U7XG4gICAgfVxuXG4gICAgLy8g6aaW5qyh5L2/55So77ya6Lez6L2s6K+N5Lmm6YCJ5oup6aG1XG4gICAgaWYgKCFoYXNTZWxlY3RlZEJvb2soKSkge1xuICAgICAgd3gubmF2aWdhdGVUbyh7IHVybDogJy9wYWdlcy9ib29rbGlzdC9ib29rbGlzdCcgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjdXJyZW50Qm9va0lkOiBnZXRDdXJyZW50Qm9va0lkKCksXG4gICAgICBwcmFjdGljZU1vZGU6IGdldFByYWN0aWNlTW9kZSgpLFxuICAgICAgbW9kZUluZGV4OiBbJ2NhcmQnLCAnY2hvaWNlJywgJ3NwZWxsJywgJ21peCcsICdxdWljayddLmluZGV4T2YoZ2V0UHJhY3RpY2VNb2RlKCkpLFxuICAgICAgYWNjZW50OiBnZXRBY2NlbnQoKSxcbiAgICAgIG9yZGVyTW9kZTogZ2V0T3JkZXJNb2RlKClcbiAgICAgIC8vIHJlbWluZGVyU3Vic2NyaWJlZDogaXNSZW1pbmRlclN1YnNjcmliZWQoKSAvLyDlrabkuaDmj5DphpLlt7LkuIvnur/vvIgyMDI2LTA4LTMx77yJXG4gICAgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICBvblVubG9hZCgpIHtcbiAgICAvLyDpobXpnaLljbjovb3ml7bmuIXnkIbpn7PpopHkuIrkuIvmlofvvIjlpoLmnpzmnInvvIlcbiAgfSxcblxuICBhc3luYyBpbml0QmF0Y2goKSB7XG4gICAgLy8g5LuK5pel5aSN55uY6L2u77ya6Zif5YiXID0g5LuK5aSp5a2m6L+H55qE6K+N77yI6Leo6K+N5Lmm77yJ77yM5LiN6LWw5bi46KeE5o6S56iLXG4gICAgaWYgKHRoaXMuX3RvZGF5UmV2aWV3TW9kZSkge1xuICAgICAgdGhpcy5fdG9kYXlSZXZpZXdNb2RlID0gZmFsc2U7XG4gICAgICBjb25zdCBvayA9IGF3YWl0IHRoaXMuX2luaXRUb2RheUJhdGNoKCk7XG4gICAgICBpZiAoIW9rKSBhd2FpdCB0aGlzLl9pbml0Tm9ybWFsQmF0Y2goKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXMuX2luaXROb3JtYWxCYXRjaCgpO1xuICB9LFxuXG4gIC8vIOS7iuaXpeWkjeebmOi9ru+8muaKiuS7iuWkqeWtpui/h+eahOivjemHjeWIt+S4gOmBje+8iOS4jeiupOivhueahOaOkuWJjemdou+8iVxuICBhc3luYyBfaW5pdFRvZGF5QmF0Y2goKTogUHJvbWlzZTxib29sZWFuPiB7XG4gICAgY29uc3QgdG9kYXlzID0gZ2V0VG9kYXlMZWFybmVkV29yZHMoKTtcbiAgICBpZiAodG9kYXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfku4rlpKnov5jmsqHmnInlrabkuaDorrDlvZXvvIzlhYjlrablh6DkuKror43lkKcnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIC8vIOaMiSBib29rSWQg5YiG57uE5ouJ6K+N5Lmm77yM5pig5bCE5Zue5a6M5pW06K+N5p2h77yI5ou/6YeK5LmJL+mfs+aghy/or43moLnvvIlcbiAgICBjb25zdCBieUJvb2sgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nW10+KCk7XG4gICAgZm9yIChjb25zdCB0IG9mIHRvZGF5cykge1xuICAgICAgY29uc3QgYXJyID0gYnlCb29rLmdldCh0LmJvb2tJZCkgfHwgW107XG4gICAgICBhcnIucHVzaCh0LndvcmQpO1xuICAgICAgYnlCb29rLnNldCh0LmJvb2tJZCwgYXJyKTtcbiAgICB9XG4gICAgY29uc3QgcXVldWU6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCBhbGxXb3JkczogV29yZEl0ZW1bXSA9IFtdO1xuICAgIGNvbnN0IHVua25vd25TZXQgPSBuZXcgU2V0KFxuICAgICAgdG9kYXlzLmZpbHRlcih0ID0+ICF0Lmtub3duKS5tYXAodCA9PiB0LndvcmQudG9Mb3dlckNhc2UoKSlcbiAgICApO1xuICAgIGZvciAoY29uc3QgW2JpZCwgd29yZHNdIG9mIGJ5Qm9vaykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYm9vayA9IGF3YWl0IGdldEJvb2tCeUlkKGJpZCk7XG4gICAgICAgIGlmICghYm9vaykgY29udGludWU7XG4gICAgICAgIGFsbFdvcmRzLnB1c2goLi4uYm9vay53b3Jkcyk7XG4gICAgICAgIGNvbnN0IHdzZXQgPSBuZXcgU2V0KHdvcmRzLm1hcCh3ID0+IHcudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgICBmb3IgKGNvbnN0IHcgb2YgYm9vay53b3Jkcykge1xuICAgICAgICAgIGlmICh3c2V0Lmhhcyh3LndvcmQudG9Mb3dlckNhc2UoKSkpIHF1ZXVlLnB1c2godyk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW+S7iuaXpeWkjeebmF0g6K+N5Lmm5Yqg6L295aSx6LSlJywgYmlkLCBlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIOS4jeiupOivhueahOaOkuWJjemdou+8jOetlOa8j+eahOS8mOWFiOihpVxuICAgIHF1ZXVlLnNvcnQoKGEsIGIpID0+XG4gICAgICAodW5rbm93blNldC5oYXMoYi53b3JkLnRvTG93ZXJDYXNlKCkpID8gMSA6IDApIC0gKHVua25vd25TZXQuaGFzKGEud29yZC50b0xvd2VyQ2FzZSgpKSA/IDEgOiAwKVxuICAgICk7XG4gICAgdGhpcy5fYW5zd2VyZWRTZXQgPSBuZXcgU2V0PG51bWJlcj4oKTtcbiAgICB0aGlzLl9uZXdXb3JkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7IC8vIOWkjeebmOS4jeiuoeWFpee0r+iuoeaWsOivjVxuICAgIGNvbnN0IHJlcG9ydGVkTWFwOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHt9O1xuICAgIGZvciAoY29uc3QgdyBvZiBxdWV1ZSkge1xuICAgICAgaWYgKGlzV29yZFJlcG9ydGVkKHcud29yZCkpIHJlcG9ydGVkTWFwW3cud29yZF0gPSB0cnVlO1xuICAgIH1cbiAgICBjb25zdCBwcm9ncmVzc1N0YXRzID0gZ2V0Qm9va1Byb2dyZXNzU3RhdHMoZ2V0Q3VycmVudEJvb2tJZCgpKTtcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgYm9va05hbWU6ICfku4rml6XlpI3nm5gnLFxuICAgICAgcXVldWUsXG4gICAgICBfd29yZEJvb2tXb3JkczogYWxsV29yZHMsXG4gICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICBxdWlja0xlYXJuaW5nOiB0aGlzLmRhdGEucHJhY3RpY2VNb2RlID09PSAncXVpY2snLFxuICAgICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICB0b3RhbENvdW50OiBxdWV1ZS5sZW5ndGgsXG4gICAgICBkdWVDb3VudDogcHJvZ3Jlc3NTdGF0cy5kdWVDb3VudCxcbiAgICAgIG1hc3RlcmVkQ291bnQ6IHByb2dyZXNzU3RhdHMubWFzdGVyZWRDb3VudCxcbiAgICAgIHN0YXR1c0xhYmVsOiAn5aSN55uYJyxcbiAgICAgIGhhc01vcmU6IGZhbHNlLFxuICAgICAgbG9hZGluZzogZmFsc2UsXG4gICAgICBzaG93UmVzdWx0OiBmYWxzZSxcbiAgICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgcXVpY2tVbmtub3duOiB7fSxcbiAgICAgIHJlcG9ydGVkTWFwXG4gICAgfSwgKCkgPT4ge1xuICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgIH0pO1xuICAgIHJldHVybiB0cnVlO1xuICB9LFxuXG4gIGFzeW5jIF9pbml0Tm9ybWFsQmF0Y2goKSB7XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIGNvbnN0IHN0dWR5TW9kZSA9IGdldFN0dWR5TW9kZSgpO1xuICAgIGNvbnN0IHByYWN0aWNlTW9kZSA9IGdldFByYWN0aWNlTW9kZSgpO1xuICAgIGNvbnN0IGFjY2VudCA9IGdldEFjY2VudCgpO1xuICAgIGNvbnN0IGJhdGNoU2l6ZSA9IGdldEJhdGNoU2l6ZSgpO1xuXG4gICAgLy8g6aG16Z2i5bey5pyJ5pWw5o2u5LiU6K+N5LmmL+iuvue9rumDveayoeWPmOaXtu+8jOi3s+i/h+mHjeW7uu+8jOmBv+WFjSBvblNob3cg6YeN5aSN6L+b5YWl5pe25pW06aG16Zeq5LiA5qyhXCLph43mlrDliqDovb1cIlxuICAgIGNvbnN0IG9yZGVyTW9kZSA9IGdldE9yZGVyTW9kZSgpO1xuICAgIGNvbnN0IHdvcmRDbGFzc0xhYmVsczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgYWxsOiAn5YWo6YOoJywgaGlnaEZyZXE6ICfpq5jpopHor40nLCBmdW5jOiAn6Jma6K+NJywgY29udGVudDogJ+WunuivjScgfTtcbiAgICBjb25zdCBzZXR0aW5nc0tleSA9IFtib29rSWQsIHN0dWR5TW9kZSwgcHJhY3RpY2VNb2RlLCBhY2NlbnQsIGJhdGNoU2l6ZSwgb3JkZXJNb2RlXS5qb2luKCd8Jyk7XG4gICAgaWYgKFxuICAgICAgdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA+IDAgJiYgIXRoaXMuZGF0YS5zaG93UmVzdWx0ICYmXG4gICAgICAhdGhpcy5fcmV2aWV3TW9kZSAmJiAhdGhpcy5fbWVtb3J5V29yZHMgJiZcbiAgICAgIHRoaXMuX2xvYWRlZEtleSA9PT0gc2V0dGluZ3NLZXlcbiAgICApIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fbG9hZGVkS2V5ID0gc2V0dGluZ3NLZXk7XG5cbiAgICAvLyDpobXpnaLlt7LmnInlhoXlrrnvvIjmjaLkuaYv5byA5paw6L2u77yJ77ya5LiN6L+bIGxvYWRpbmcg5oCB77yM5L+d5oyB5pen5Y2h54mH5Y+v6KeB77yMXG4gICAgLy8g6Zif5YiX5bCx57uq5ZCO5LiA5qyh5oCn5pu/5o2i77yM5a6e546wXCLlubPnqLPmjaLova5cIuaXoOmXquWKqO+8m+S7hemmluasoei/m+WFpeaJjeaYvuekuuWKoOi9veWKqOeUu1xuICAgIGlmICh0aGlzLmRhdGEucXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBsb2FkaW5nOiB0cnVlLCBzdHVkeU1vZGUsIHByYWN0aWNlTW9kZSwgYWNjZW50LCBiYXRjaFNpemUsIG9yZGVyTW9kZSwgd29yZENsYXNzTGFiZWw6IHdvcmRDbGFzc0xhYmVsc1tzdHVkeU1vZGVdIHx8ICflhajpg6gnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBzdHVkeU1vZGUsIHByYWN0aWNlTW9kZSwgYWNjZW50LCBiYXRjaFNpemUsIG9yZGVyTW9kZSwgd29yZENsYXNzTGFiZWw6IHdvcmRDbGFzc0xhYmVsc1tzdHVkeU1vZGVdIHx8ICflhajpg6gnIH0pO1xuICAgIH1cblxuICAgIGxldCBib29rO1xuICAgIHRyeSB7XG4gICAgICBib29rID0gYXdhaXQgZ2V0Qm9va0J5SWQoYm9va0lkKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCfojrflj5bor43kuablpLHotKUnLCBlKTtcbiAgICB9XG5cbiAgICBpZiAoIWJvb2sgfHwgIWJvb2sud29yZHMgfHwgYm9vay53b3Jkcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIOS6keerr+aLieWPluWksei0pe+8jOWwneivleacrOWcsOenjeWtkOivjeW6k+WFnOW6lVxuICAgICAgY29uc3QgbG9jYWxCb29rID0gbG9jYWxCb29rcy5maW5kKGIgPT4gYi5pZCA9PT0gYm9va0lkKTtcbiAgICAgIGlmIChsb2NhbEJvb2sgJiYgbG9jYWxCb29rLndvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYm9vayA9IGxvY2FsQm9vaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7IGxvYWRpbmc6IGZhbHNlLCBxdWV1ZTogW10gfSk7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6K+N5bqT5Yqg6L295Lit77yM6ams5LiK5bCx5aW9JywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g5aSN5LmgL+iusOW/huS9k+ajgOaooeW8j+e7lei/h+ivjeaAp+etm+mAie+8muW+heWkjeS5oOeahOivjeS4jeivpeiiq+KAnOiMg+WbtDromZror43igJ3nrYnov4fmu6TmjonvvIxcbiAgICAvLyDlkKbliJnorqHliJLph4wgNDMg5Liq5b6F5aSN5Lmg6K+NIOKIqSDomZror40gPSAwIOaXtuS8muWHuueOsOKAnOivjeS5puW3suWFqOmDqOaOjOaPoeKAneeahOWBh+ixoVxuICAgIGNvbnN0IGJ5cGFzc0ZpbHRlciA9IHRoaXMuX3Jldmlld01vZGUgfHwgISF0aGlzLl9tZW1vcnlXb3JkcztcblxuICAgIC8vIOagueaNruWtpuS5oOiMg+WbtOetm+mAie+8iOWFqOmDqC/pq5jpopEv6Jma6K+NL+Wunuivje+8iVxuICAgIGNvbnN0IGhpZ2hGcmVxQ291bnQgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcuaXNIaWdoRnJlcSkubGVuZ3RoO1xuICAgIGNvbnN0IGZ1bmNDb3VudCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgPT09ICdmdW5jJykubGVuZ3RoO1xuICAgIGNvbnN0IGNvbnRlbnRDb3VudCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgIT09ICdmdW5jJykubGVuZ3RoO1xuICAgIGxldCB3b3JkTGlzdDogV29yZEl0ZW1bXTtcbiAgICBsZXQgZW1wdHlUaXAgPSAnJztcbiAgICBpZiAoYnlwYXNzRmlsdGVyKSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHM7XG4gICAgfSBlbHNlIGlmIChzdHVkeU1vZGUgPT09ICdoaWdoRnJlcScpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LmlzSGlnaEZyZXEpO1xuICAgICAgZW1wdHlUaXAgPSAn6L+Z5pys6K+N5Lmm5rKh5pyJ5qCH5rOo6auY6aKR6K+NJztcbiAgICB9IGVsc2UgaWYgKHN0dWR5TW9kZSA9PT0gJ2Z1bmMnKSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgPT09ICdmdW5jJyk7XG4gICAgICAvLyDor43mnaHlrozlhajmsqHmnIkgcG9zVGFnIOWtl+autSA9IOivjeS5puaVsOaNruaYr+aXp+eJiO+8iOS6keerr+acquabtOaWsC/otbDkuobnp43lrZDlhZzlupUv57yT5a2Y5pyq5aSx5pWI77yJXG4gICAgICBpZiAoIWJvb2sud29yZHMuc29tZSh3ID0+ICdwb3NUYWcnIGluIHcpKSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+ivjeS5puaVsOaNruacquWMheWQq+ivjeaAp+agh+azqO+8jOivt+abtOaWsOivjeW6k+WQjumHjeivlSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbXB0eVRpcCA9ICfov5nmnKzor43kuabmmoLml6DomZror43moIfms6gnO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc3R1ZHlNb2RlID09PSAnY29udGVudCcpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyAhPT0gJ2Z1bmMnKTtcbiAgICAgIGlmICghYm9vay53b3Jkcy5zb21lKHcgPT4gJ3Bvc1RhZycgaW4gdykpIHtcbiAgICAgICAgZW1wdHlUaXAgPSAn6K+N5Lmm5pWw5o2u5pyq5YyF5ZCr6K+N5oCn5qCH5rOo77yM6K+35pu05paw6K+N5bqT5ZCO6YeN6K+VJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+i/meacrOivjeS5puaaguaXoOWunuivjeagh+azqCc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3JkcztcbiAgICB9XG5cbiAgICBpZiAod29yZExpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBsb2FkaW5nOiBmYWxzZSwgcXVldWU6IFtdLCBoaWdoRnJlcUNvdW50LCBmdW5jQ291bnQsIGNvbnRlbnRDb3VudCB9KTtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBlbXB0eVRpcCwgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFsbFByb2dyZXNzID0gZ2V0QWxsUHJvZ3Jlc3MoYm9va0lkKTtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gICAgLy8g5p6E5bu65a2m5Lmg6Zif5YiX77yaXG4gICAgLy8gMS4g5LyY5YWI5Y+W5b6F5aSN5Lmg55qE6K+N77yIbmV4dFJldmlldyA8PSBub3cg5LiU5LiN5pivIG1hc3RlcmVk77yJXG4gICAgLy8gMi4g5Y+W5pyq5a2m6L+H55qE5paw6K+NXG4gICAgY29uc3QgZHVlV29yZHM6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCBuZXdXb3JkczogV29yZEl0ZW1bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB3IG9mIHdvcmRMaXN0KSB7XG4gICAgICBjb25zdCBwID0gYWxsUHJvZ3Jlc3Nbdy53b3JkXTtcbiAgICAgIGlmICghcCkge1xuICAgICAgICBuZXdXb3Jkcy5wdXNoKHcpO1xuICAgICAgfSBlbHNlIGlmIChwLnN0YXR1cyAhPT0gJ21hc3RlcmVkJyAmJiBwLm5leHRSZXZpZXcgPiAwICYmIHAubmV4dFJldmlldyA8PSBub3cpIHtcbiAgICAgICAgZHVlV29yZHMucHVzaCh3KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDogIPpopHmjpLluo/vvJrmlrDor43mjIkgRUNESUNUIOivjemikemZjeW6j++8iOW4uOingeivjeWFiOWtpu+8ie+8jOS8mOWFiOWtpuS8muiAg+ivlemHjOWHuueOsOacgOWkmueahOivjVxuICAgIG5ld1dvcmRzLnNvcnQoKGEsIGIpID0+IChiLmZyZXF1ZW5jeSB8fCAwKSAtIChhLmZyZXF1ZW5jeSB8fCAwKSk7XG5cbiAgICAvLyDlkIjlubbpmJ/liJfvvJrpu5jorqTkvJjlhYjlpI3kuaDvvIzlho3lrabmlrDor43vvJvlpI3kuaDmqKHlvI/kuIvku4XlpI3kuaDliLDmnJ/lvoXlpI3kuaDor41cbiAgICAvLyDpmo/mnLrmqKHlvI/kuIvvvJrmlrDor43ku47or43kuablhajpg6jmnKrlrabor43kuK3pmo/mnLrmir3lj5bvvIjogIzkuI3mmK/mjInor43popHlj5bliY0gTiDkuKrvvIxcbiAgICAvLyDpgb/lhY3ov57nu63lh6Dova7pgYfliLDnmoTpg73mmK/lkIzkuIDmibnor43vvInvvIzlpI3kuaDor43ku43kvJjlhYjljaDkvY1cbiAgICBsZXQgcXVldWU7XG4gICAgaWYgKHRoaXMuX3Jldmlld01vZGUpIHtcbiAgICAgIGlmIChkdWVXb3Jkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8g5rKh5pyJ5Yiw5pyf5b6F5aSN5Lmg6K+N77ya5YiH5Zue5bi46KeE5a2m5Lmg77yM6YG/5YWN56m66L2uXG4gICAgICAgIHRoaXMuX3Jldmlld01vZGUgPSBmYWxzZTtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7Llhajpg6jlpI3kuaDlrozvvIzliIflm57luLjop4TlrabkuaAnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICAgIHF1ZXVlID0gWy4uLmR1ZVdvcmRzLCAuLi5uZXdXb3Jkc10uc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlID0gZHVlV29yZHMuc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG9yZGVyTW9kZSA9PT0gJ3JhbmRvbScpIHtcbiAgICAgIC8vIOWkjeS5oOivjeWQjOagt+S7juWFqOmDqOWIsOacn+ivjeS4remaj+acuuaKveWPlu+8iOiAjOS4jeaYr+aMieivjeihqOmhuuW6j+WPluWJjSBOIOS4qu+8iVxuICAgICAgY29uc3QgZHVlOiBXb3JkSXRlbVtdID0gW107XG4gICAgICBpZiAoZHVlV29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBwb29sID0gWy4uLmR1ZVdvcmRzXTtcbiAgICAgICAgY29uc3QgdGFrZSA9IE1hdGgubWluKGJhdGNoU2l6ZSwgcG9vbC5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRha2U7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGogPSBpICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKHBvb2wubGVuZ3RoIC0gaSkpO1xuICAgICAgICAgIGNvbnN0IHQgPSBwb29sW2ldOyBwb29sW2ldID0gcG9vbFtqXTsgcG9vbFtqXSA9IHQ7XG4gICAgICAgICAgZHVlLnB1c2gocG9vbFtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlbWFpbmluZyA9IGJhdGNoU2l6ZSAtIGR1ZS5sZW5ndGg7XG4gICAgICBjb25zdCBzYW1wbGVkTmV3OiBXb3JkSXRlbVtdID0gW107XG4gICAgICBpZiAocmVtYWluaW5nID4gMCAmJiBuZXdXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHBvb2wgPSBbLi4ubmV3V29yZHNdO1xuICAgICAgICBjb25zdCB0YWtlID0gTWF0aC5taW4ocmVtYWluaW5nLCBwb29sLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGFrZTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgaiA9IGkgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAocG9vbC5sZW5ndGggLSBpKSk7XG4gICAgICAgICAgY29uc3QgdCA9IHBvb2xbaV07IHBvb2xbaV0gPSBwb29sW2pdOyBwb29sW2pdID0gdDtcbiAgICAgICAgICBzYW1wbGVkTmV3LnB1c2gocG9vbFtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHF1ZXVlID0gWy4uLmR1ZSwgLi4uc2FtcGxlZE5ld107XG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXVlID0gWy4uLmR1ZVdvcmRzLCAuLi5uZXdXb3Jkc10uc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICB9XG5cbiAgICAvLyDlpoLmnpzpmJ/liJfkuLrnqbrvvIjmsqHmnInlvoXlpI3kuaDkuZ/msqHmnInmlrDor43vvInvvIzlj5blt7Lmjozmj6HnmoTor43lpI3kuaBcbiAgICBsZXQgZmluYWxRdWV1ZSA9IHF1ZXVlO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IG1hc3RlcmVkV29yZHMgPSB3b3JkTGlzdC5maWx0ZXIoKHcpID0+IHtcbiAgICAgICAgY29uc3QgcCA9IGFsbFByb2dyZXNzW3cud29yZF07XG4gICAgICAgIHJldHVybiBwICYmIHAuc3RhdHVzID09PSAnbWFzdGVyZWQnO1xuICAgICAgfSk7XG4gICAgICBmaW5hbFF1ZXVlID0gbWFzdGVyZWRXb3Jkcy5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgOKUgCDorrDlv4bkvZPmo4Dpq5jljbHor43ova7mrKHvvJropobnm5bpmJ/liJfkuLrkvZPmo4DmuIXljZXvvIjkv53mjIHkvZPmo4Dph4znmoTljbHpmanpobrluo/vvIzmnIDljbHpmanlnKjliY3vvIkg4pSA4pSA4pSAXG4gICAgLy8g55So5YWo6YeP6K+N6KGo5Yy56YWN77yI5LiN6LWwIHN0dWR5TW9kZSDpq5jpopHov4fmu6TvvIzlkKbliJnmuIXljZXor43lj6/og73lhajlhpvopobmsqHogIzpnZnpu5jlm57pgIDmiJDluLjop4Tova7mrKHvvIlcbiAgICBsZXQgbWVtQWN0aXZlID0gZmFsc2U7XG4gICAgaWYgKHRoaXMuX21lbW9yeVdvcmRzICYmICh0aGlzLl9tZW1vcnlXb3JkcyBhcyBzdHJpbmdbXSkubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbWVtTGVuID0gKHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKS5sZW5ndGg7XG4gICAgICBjb25zdCBtZW1TZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB0aGlzLl9tZW1vcnlXb3JkcyBhcyBzdHJpbmdbXSkgbWVtU2V0LmFkZCh3LnRvTG93ZXJDYXNlKCkpO1xuICAgICAgY29uc3QgbWF0Y2hlZCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gbWVtU2V0Lmhhcyh3LndvcmQudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgaWYgKG1hdGNoZWQubGVuZ3RoID4gMCkge1xuICAgICAgICBmaW5hbFF1ZXVlID0gKHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKVxuICAgICAgICAgIC5tYXAoKHc6IHN0cmluZykgPT4gbWF0Y2hlZC5maW5kKChtOiBXb3JkSXRlbSkgPT4gbS53b3JkLnRvTG93ZXJDYXNlKCkgPT09IHcudG9Mb3dlckNhc2UoKSkpXG4gICAgICAgICAgLmZpbHRlcigoeDogV29yZEl0ZW0gfCB1bmRlZmluZWQpOiB4IGlzIFdvcmRJdGVtID0+ICEheCk7XG4gICAgICAgIG1lbUFjdGl2ZSA9IHRydWU7XG4gICAgICAgIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA8IG1lbUxlbikge1xuICAgICAgICAgIC8vIOa4heWNlemHjOacieivjeS4jeWcqOW9k+WJjeivjeihqO+8iOWmguivjeW6k+abtOaWsOi/h++8ie+8muWmguWunuaPkOekuu+8jOe8uuWkseeahOS4jeihpeWIq+eahOivjVxuICAgICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBg5riF5Y2V5LitICR7bWVtTGVuIC0gZmluYWxRdWV1ZS5sZW5ndGh9IOS4quivjeS4jeWcqOivjeS5pu+8jOW3sui3s+i/h2AsIGljb246ICdub25lJyB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8g5YWo6YOo5Yy56YWN5LiN5LiK77yI5p6B5bCR6KeB77yJ77ya5LiN6Z2Z6buY5Zue6YCA77yM5piO56Gu5ZGK55+lXG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6L+Z5Yeg5Liq6K+N5LiN5Zyo5b2T5YmN6K+N5Lmm6YeM77yM5bey5YiH5Zue5bi46KeE5a2m5LmgJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVtb3J5V29yZHMgPSBudWxsOyAvLyDkuIDmrKHmgKfvvIznlKjlkI7ljbPlvINcbiAgICB9XG5cbiAgICAvLyDlh7rpopjpobrluo/vvJrpmo/mnLrmqKHlvI/miZPkubHpmJ/liJfvvIjlpI3kuaDkvJjlhYgv5bep5Zu66Zif5YiX5Zyo57uE5YaF5omT5Lmx77yM5LiN5pS55Y+Y5LyY5YWI57qn77ybXG4gICAgLy8g6K6w5b+G5L2T5qOA6L2u5L+d5oyB5Y2x6Zmp6aG65bqP5LiN5Lmx5bqP77yJXG4gICAgaWYgKG9yZGVyTW9kZSA9PT0gJ3JhbmRvbScgJiYgIW1lbUFjdGl2ZSAmJiBmaW5hbFF1ZXVlLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZvciAobGV0IGkgPSBmaW5hbFF1ZXVlLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgY29uc3QgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xuICAgICAgICBjb25zdCB0ID0gZmluYWxRdWV1ZVtpXTtcbiAgICAgICAgZmluYWxRdWV1ZVtpXSA9IGZpbmFsUXVldWVbal07XG4gICAgICAgIGZpbmFsUXVldWVbal0gPSB0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOiusOW9leacrOi9ruWTquS6m+aYr+mmluasoeWtpuS5oOeahOaWsOivje+8iOWkjeS5oC/lt6nlm7rkuI3orqHlhaXigJzntK/orqHljZXor43igJ3vvIlcbiAgICB0aGlzLl9uZXdXb3JkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCB3IG9mIGZpbmFsUXVldWUpIHtcbiAgICAgIGlmIChuZXdXb3Jkcy5pbmRleE9mKHcpID4gLTEpIHRoaXMuX25ld1dvcmRTZXQuYWRkKHcud29yZC50b0xvd2VyQ2FzZSgpKTtcbiAgICB9XG5cbiAgICAvLyDlt7LkuIrmiqXor43moIforrDvvIjljaHniYfog4zpnaLmmL7npLrjgIzlt7LkuIrmiqXjgI3vvIlcbiAgICBjb25zdCByZXBvcnRlZE1hcDogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgZmluYWxRdWV1ZSkge1xuICAgICAgaWYgKGlzV29yZFJlcG9ydGVkKHcud29yZCkpIHJlcG9ydGVkTWFwW3cud29yZF0gPSB0cnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyZXNzU3RhdHMgPSBnZXRCb29rUHJvZ3Jlc3NTdGF0cyhib29rSWQpO1xuXG4gICAgLy8g5paw5LiA6L2u5byA5aeL77yM5riF56m65bey5L2c562U5qCH6K6w77yI5L+u5aSN5YiH5qih5byP5ZCO5ZCM5LiA6K+N6YeN5aSN6K6h5pWw55qEIGJ1Z++8iVxuICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG5cbiAgICAvLyDnirbmgIHmoIfnrb7mjInmnKzova7pmJ/liJflrp7pmYXmnoTmiJDliKTlrprvvJrlhajpg6jkuLrliLDmnJ/or43miY3mmK/jgIzlpI3kuaDjgI3vvIxcbiAgICAvLyDmt7flhaXmlrDor43vvIjlpI3kuaDor43kvJjlhYjljaDkvY0r5paw6K+N6KGl6b2Q77yJ5pe25qCH44CM5paw6K+N44CN77yM6YG/5YWNIDEg5Liq5aSN5Lmg6K+NKzkg5Liq5paw6K+N6K+v5qCH5oiQ5aSN5LmgXG4gICAgY29uc3QgZHVlV29yZFNldCA9IG5ldyBTZXQoZHVlV29yZHMubWFwKHcgPT4gdy53b3JkKSk7XG4gICAgY29uc3QgZHVlSW5RdWV1ZSA9IGZpbmFsUXVldWUuZmlsdGVyKHcgPT4gZHVlV29yZFNldC5oYXMody53b3JkKSkubGVuZ3RoO1xuICAgIGxldCBzdGF0dXNMYWJlbCA9ICfmlrDor40nO1xuICAgIGlmIChtZW1BY3RpdmUpIHtcbiAgICAgIHN0YXR1c0xhYmVsID0gJ+mrmOWNseivjSc7XG4gICAgfSBlbHNlIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA+IDAgJiYgZHVlSW5RdWV1ZSA9PT0gZmluYWxRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHN0YXR1c0xhYmVsID0gJ+WkjeS5oCc7XG4gICAgfSBlbHNlIGlmIChkdWVJblF1ZXVlID09PSAwICYmIGR1ZVdvcmRzLmxlbmd0aCA9PT0gMCAmJiBuZXdXb3Jkcy5sZW5ndGggPT09IDAgJiYgZmluYWxRdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICBzdGF0dXNMYWJlbCA9ICflt6nlm7onO1xuICAgIH1cblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBib29rTmFtZTogYm9vay5uYW1lLFxuICAgICAgYm9va1RvdGFsOiB3b3JkTGlzdC5sZW5ndGgsXG4gICAgICBoaWdoRnJlcUNvdW50LFxuICAgICAgZnVuY0NvdW50LFxuICAgICAgY29udGVudENvdW50LFxuICAgICAgcXVldWU6IGZpbmFsUXVldWUsXG4gICAgICBfd29yZEJvb2tXb3Jkczogd29yZExpc3QsXG4gICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICBxdWlja0xlYXJuaW5nOiBwcmFjdGljZU1vZGUgPT09ICdxdWljaycsXG4gICAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgICAga25vd25Db3VudDogMCxcbiAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgIHRvdGFsQ291bnQ6IGZpbmFsUXVldWUubGVuZ3RoLFxuICAgICAgZHVlQ291bnQ6IHByb2dyZXNzU3RhdHMuZHVlQ291bnQsXG4gICAgICBtYXN0ZXJlZENvdW50OiBwcm9ncmVzc1N0YXRzLm1hc3RlcmVkQ291bnQsXG4gICAgICBzdGF0dXNMYWJlbCxcbiAgICAgIGhhc01vcmU6IGZpbmFsUXVldWUubGVuZ3RoID49IGJhdGNoU2l6ZSxcbiAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgc2hvd1Jlc3VsdDogZmFsc2UsXG4gICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIHF1aWNrVW5rbm93bjoge30sXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgICAvLyDpooTliqDovb3nrKzkuozkuKror43vvIznv7vpobXml7bnp5Llh7rlo7BcbiAgICAgICAgaWYgKGZpbmFsUXVldWUubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHByZWxvYWRBdWRpbyhmaW5hbFF1ZXVlWzFdLndvcmQsIGFjY2VudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvLyDlvZPliY3or43mmK/lkKblt7LkvZznrZTov4fvvIjpmLLliIfmqKHlvI/lkI7ph43lpI3orqHmlbDvvIlcbiAgX2NoZWNrQW5zd2VyZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2Fuc3dlcmVkU2V0Lmhhcyh0aGlzLmRhdGEuY3VycmVudEluZGV4KSkgcmV0dXJuIHRydWU7XG4gICAgdGhpcy5fYW5zd2VyZWRTZXQuYWRkKHRoaXMuZGF0YS5jdXJyZW50SW5kZXgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuXG5cbiAgLy8g5YiH5o2i6K+N5Lmm77ya6L+b5YWl6K+N5Lmm6YCJ5oup6aG177yI5o6o6I2Q5Y2hICsg6ICD6K+VL+aVmeadkOWIhue7hOWIl+ihqO+8iVxuICBjaGFuZ2VCb29rKCkge1xuICAgIHd4Lm5hdmlnYXRlVG8oeyB1cmw6ICcvcGFnZXMvYm9va2xpc3QvYm9va2xpc3QnIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDljaHniYfnv7vpnaLmqKHlvI8g4pSA4pSA4pSAXG4gIC8vIOa8q+a4uOivjeaXj++8muW4puedgOW9k+WJjeivjei3s+i9rOWIsOivjeagueaYn+ezu1xuICBnb0dhbGF4eSgpIHtcbiAgICBjb25zdCB3ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghdykgcmV0dXJuO1xuICAgIHd4Lm5hdmlnYXRlVG8oe1xuICAgICAgdXJsOiBgL3BhZ2VzL2dhbGF4eS9nYWxheHk/d29yZD0ke2VuY29kZVVSSUNvbXBvbmVudCh3LndvcmQpfWBcbiAgICB9KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg57qg6ZSZ5LiK5oqlIOKUgOKUgOKUgFxuICBvcGVuUmVwb3J0KCkge1xuICAgIGNvbnN0IHcgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKCF3KSByZXR1cm47XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1JlcG9ydDogdHJ1ZSwgcmVwb3J0VHlwZTogJycsIHJlcG9ydERlc2M6ICcnIH0pO1xuICB9LFxuXG4gIGNsb3NlUmVwb3J0KCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXBvcnQ6IGZhbHNlIH0pO1xuICB9LFxuXG4gIG9uUmVwb3J0VHlwZShlOiBhbnkpIHtcbiAgICB0aGlzLnNldERhdGEoeyByZXBvcnRUeXBlOiBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC50eXBlIGFzIFJlcG9ydFR5cGUgfSk7XG4gIH0sXG5cbiAgb25SZXBvcnREZXNjKGU6IGFueSkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHJlcG9ydERlc2M6IGUuZGV0YWlsLnZhbHVlIH0pO1xuICB9LFxuXG4gIHN1Ym1pdFJlcG9ydCgpIHtcbiAgICBjb25zdCB3ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghdykgcmV0dXJuO1xuICAgIGlmICghdGhpcy5kYXRhLnJlcG9ydFR5cGUpIHtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6K+35YWI6YCJ5oup6Zeu6aKY57G75Z6LJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVwb3J0V29yZCh3LndvcmQsIGJvb2tJZCwgdGhpcy5kYXRhLnJlcG9ydFR5cGUgYXMgUmVwb3J0VHlwZSwgdGhpcy5kYXRhLnJlcG9ydERlc2MpLnRoZW4oKHIpID0+IHtcbiAgICAgIGlmIChyLmFscmVhZHkpIHtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfov5nkuKrpl67popjlt7LmnInkurrmiqXov4fllaYnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICB9IGVsc2UgaWYgKHIub2spIHtcbiAgICAgICAgY29uc3QgcmVwb3J0ZWRNYXAgPSB7IC4uLnRoaXMuZGF0YS5yZXBvcnRlZE1hcCwgW3cud29yZF06IHRydWUgfTtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgc2hvd1JlcG9ydDogZmFsc2UsIHJlcG9ydGVkTWFwIH0pO1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suWPl+eQhu+8jOaEn+iwouWFseW7uu+8gScsIGljb246ICdzdWNjZXNzJyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5o+Q5Lqk5aSx6LSl77yM6K+35qOA5p+l572R57ucJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIGZsaXBDYXJkKCkge1xuICAgIC8vIOOAjOS4jeiupOivhuOAjeaPreekuuetlOahiOWQjuS5n+WFgeiuuOiHqueUsee/u+mdou+8iOWPr+e/u+Wbnuato+mdouWGjeeci+WNleivje+8ie+8jOa1geeoi+eUseOAjOS4i+S4gOS4quOAjeaMiemSruaOqOi/m1xuICAgIGNvbnN0IGZsaXBwZWQgPSAhdGhpcy5kYXRhLmlzRmxpcHBlZDtcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgaXNGbGlwcGVkOiBmbGlwcGVkLFxuICAgICAgc2hvd01lYW5pbmc6IGZsaXBwZWRcbiAgICB9KTtcbiAgICAvLyDnv7vliLDog4zpnaLml7boh6rliqjmkq3mlL7lj5Hpn7PvvIzlubbpooTliqDovb3kuIvkuIDkuKror41cbiAgICBpZiAoZmxpcHBlZCkge1xuICAgICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleCArIDFdO1xuICAgICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgICAgaWYgKG5leHQpIHByZWxvYWRBdWRpbyhuZXh0LndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgIH1cbiAgfSxcblxuICAvLyDilIDilIDilIAg5Y+R6Z+zIOKUgOKUgOKUgFxuICBvblBsYXlBdWRpbygpIHtcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgfSxcblxuICAvLyDliIfmjaLlj6Ppn7NcbiAgb25Ub2dnbGVBY2NlbnQoKSB7XG4gICAgY29uc3QgbmV3QWNjZW50OiBBY2NlbnQgPSB0aGlzLmRhdGEuYWNjZW50ID09PSAndXMnID8gJ3VrJyA6ICd1cyc7XG4gICAgc2V0QWNjZW50KG5ld0FjY2VudCk7XG4gICAgdGhpcy5zZXREYXRhKHsgYWNjZW50OiBuZXdBY2NlbnQgfSk7XG4gICAgd3guc2hvd1RvYXN0KHtcbiAgICAgIHRpdGxlOiBuZXdBY2NlbnQgPT09ICd1aycgPyAn6Iux6Z+z5qih5byPJyA6ICfnvo7pn7PmqKHlvI8nLFxuICAgICAgaWNvbjogJ25vbmUnXG4gICAgfSk7XG4gICAgLy8g5YiH5o2i5ZCO56uL5Y2z5pKt5pS+5b2T5YmN6K+NXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgbmV3QWNjZW50KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5Ye66aKY5pa55byP5bqU55So77yI5ZCr5re35ZCI5qih5byP6ZqP5py65pig5bCE77yJIOKUgOKUgOKUgFxuICAvLyDkuLrlvZPliY3or43noa7lrprlrp7pmYXlh7rpopjmlrnlvI/lubbph43nva7nrZTpopjnirbmgIHvvJvljaHniYfmqKHlvI/mr4/lvKDmlrDljaHpg73ku47mraPpnaLvvIjljZXor43vvInlvIDlp4vvvIxcbiAgLy8g5YiH6K+N5pe26Ieq54S25pKt5pS+57+76Z2i5Yqo55S777yM5LiN5YaN5L+d55WZ4oCc6YeK5LmJ6Z2i5pyd5LiK5YiH6K+N4oCd55qE5pen6K6+6K6h77yI5Lya5o+Q5YmN5rOE562U5qGI77yJXG4gIF9hcHBseU1vZGVGb3JDdXJyZW50KCkge1xuICAgIGNvbnN0IG1vZGUgPSB0b0NvbmNyZXRlTW9kZSh0aGlzLmRhdGEucHJhY3RpY2VNb2RlKTtcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIC8vIOW/q+mAn+aooeW8j++8mui/m+WFpeWtpuS5oOmYtuaute+8jOaBouWkjemYn+WIl+WktOaMh+mSiOS4juiuoeaVsO+8iOWQjOS4gOaJueivjemHjeWtpumHjea1i++8iVxuICAgIGlmIChtb2RlID09PSAncXVpY2snKSB7XG4gICAgICB0aGlzLnNldERhdGEoe1xuICAgICAgICBhY3RpdmVNb2RlOiAncXVpY2snLFxuICAgICAgICBxdWlja0xlYXJuaW5nOiB0cnVlLFxuICAgICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xXG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGFjdGl2ZU1vZGU6IG1vZGUsXG4gICAgICBxdWlja0xlYXJuaW5nOiBmYWxzZSwgLy8g5YiH5Yiw6Z2e5b+r6YCf5qih5byP5pe26YCA5Ye65a2m5Lmg6Zi25q6177yM6Ziy5q2i5YiX6KGo5q6L55WZXG4gICAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTFcbiAgICB9LCAoKSA9PiB7XG4gICAgICBpZiAoIXdvcmQpIHJldHVybjtcbiAgICAgIGlmIChtb2RlID09PSAnY2hvaWNlJykge1xuICAgICAgICB0aGlzLmdlbmVyYXRlQ2hvaWNlT3B0aW9ucyh3b3JkKTtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gJ2NhcmQnKSB7XG4gICAgICAgIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlm5vpgInkuIDmqKHlvI8g4pSA4pSA4pSAXG4gIC8vIOeUn+aIkOWbm+mAieS4gOmAiemhue+8iOe7meWNleivjemAiemHiuS5ie+8iVxuICBnZW5lcmF0ZUNob2ljZU9wdGlvbnMoY3VycmVudFdvcmQ6IFdvcmRJdGVtKSB7XG4gICAgY29uc3QgYWxsV29yZHMgPSB0aGlzLmRhdGEuX3dvcmRCb29rV29yZHM7XG4gICAgaWYgKGFsbFdvcmRzLmxlbmd0aCA8IDQpIHtcbiAgICAgIC8vIOivjeS5puivjeaVsOS4jeWknyA0IOS4qu+8jOaXoOazleWHuuW5suaJsOmhue+8jOmZjee6p+S4uuWNoeeJh+WHuumimFxuICAgICAgdGhpcy5zZXREYXRhKHsgYWN0aXZlTW9kZTogJ2NhcmQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIOS7juivjeS5pumaj+acuuWPliAzIOS4quW5suaJsOmhuVxuICAgIGNvbnN0IGRpc3RyYWN0b3JzOiBXb3JkSXRlbVtdID0gW107XG4gICAgY29uc3QgdXNlZCA9IG5ldyBTZXQoW2N1cnJlbnRXb3JkLndvcmRdKTtcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlIChkaXN0cmFjdG9ycy5sZW5ndGggPCAzICYmIGF0dGVtcHRzIDwgMTAwKSB7XG4gICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhbGxXb3Jkcy5sZW5ndGgpO1xuICAgICAgY29uc3QgdyA9IGFsbFdvcmRzW2lkeF07XG4gICAgICBpZiAoIXVzZWQuaGFzKHcud29yZCkgJiYgdy5tZWFuaW5nICE9PSBjdXJyZW50V29yZC5tZWFuaW5nKSB7XG4gICAgICAgIGRpc3RyYWN0b3JzLnB1c2godyk7XG4gICAgICAgIHVzZWQuYWRkKHcud29yZCk7XG4gICAgICB9XG4gICAgICBhdHRlbXB0cysrO1xuICAgIH1cblxuICAgIC8vIOe7hOWQiCArIOmaj+acuuaJk+S5sVxuICAgIGNvbnN0IG9wdGlvbnM6IENob2ljZU9wdGlvbltdID0gW1xuICAgICAgeyBtZWFuaW5nOiBjdXJyZW50V29yZC5tZWFuaW5nLCBpc0NvcnJlY3Q6IHRydWUgfSxcbiAgICAgIC4uLmRpc3RyYWN0b3JzLm1hcChkID0+ICh7IG1lYW5pbmc6IGQubWVhbmluZywgaXNDb3JyZWN0OiBmYWxzZSB9KSlcbiAgICBdLnNvcnQoKCkgPT4gTWF0aC5yYW5kb20oKSAtIDAuNSk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgY2hvaWNlT3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIGNob2ljZUNvcnJlY3Q6IGZhbHNlXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5Zub6YCJ5LiA77ya54K55Ye76YCJ6aG5XG4gIG9uQ2hvaWNlU2VsZWN0KGU6IGFueSkge1xuICAgIGlmICh0aGlzLmRhdGEuY2hvaWNlU2VsZWN0ZWQgIT09IC0xKSByZXR1cm47IC8vIOW3sumAiei/h1xuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG5cbiAgICBjb25zdCBpZHggPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC5pZHggYXMgbnVtYmVyO1xuICAgIGNvbnN0IG9wdGlvbiA9IHRoaXMuZGF0YS5jaG9pY2VPcHRpb25zW2lkeF07XG4gICAgY29uc3QgaXNDb3JyZWN0ID0gb3B0aW9uLmlzQ29ycmVjdDtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjaG9pY2VTZWxlY3RlZDogaWR4LFxuICAgICAgY2hvaWNlQ29ycmVjdDogaXNDb3JyZWN0XG4gICAgfSk7XG5cbiAgICAvLyDmkq3mlL7ljZXor43lj5Hpn7NcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcblxuICAgIC8vIOiusOW9lei/m+W6plxuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGlzQ29ycmVjdCk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGlmICghaXNDb3JyZWN0KSB7XG4gICAgICBhZGRUb1dyb25nQm9vayh3b3JkLndvcmQsIHdvcmQubWVhbmluZywgYm9va0lkKTtcbiAgICB9XG5cbiAgICBpZiAoaXNDb3JyZWN0KSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBrbm93bkNvdW50OiB0aGlzLmRhdGEua25vd25Db3VudCArIDEgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHVua25vd25Db3VudDogdGhpcy5kYXRhLnVua25vd25Db3VudCArIDEgfSk7XG4gICAgfVxuXG4gICAgLy8g562U5a+55YGcIDEg56eS77yb562U6ZSZ5YGcIDIuNSDnp5LvvIznlZnml7bpl7TnnIvmuIXmraPnoa7nrZTmoYhcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgICB9LCBpc0NvcnJlY3QgPyAxMDAwIDogMjUwMCk7XG4gIH0sXG5cbiAgLy8g5Zub6YCJ5LiA77ya54K544CM5LiN6K6k6K+G44CN77yI5LiN54yc5LqG77yM55u05o6l5o+t56S65q2j56Gu562U5qGI77yM5oyJ562U6ZSZ6K6w5b2V77yJXG4gIG9uQ2hvaWNlRG9udEtub3coKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jaG9pY2VTZWxlY3RlZCAhPT0gLTEpIHJldHVybjsgLy8g5bey5L2c562UL+W3suaPreekulxuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG5cbiAgICAvLyBjaG9pY2VTZWxlY3RlZCDnva7kuLogLTLvvJrkuI3lkb3kuK3ku7vkvZXpgInpobnvvIjkuI3moIfnuqLplJnor6/pobnvvInvvIzkvYbop6blj5HmraPnoa7pobnpq5jkuq5cbiAgICB0aGlzLnNldERhdGEoeyBjaG9pY2VTZWxlY3RlZDogLTIsIGNob2ljZUNvcnJlY3Q6IGZhbHNlIH0pO1xuXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG5cbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCBmYWxzZSk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuXG4gICAgdGhpcy5zZXREYXRhKHsgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSB9KTtcblxuICAgIC8vIOS4jeiHquWKqOi3s+i9rO+8muWxleekuuato+ehruetlOahiOWQjuWHuuOAjOS4i+S4gOS4quOAjeaMiemSru+8jOe7meeUqOaIt+aXtumXtOiusOS9j+i/meS4quivjVxuICB9LFxuXG4gIC8vIOmAieaLqeaooeW8j+OAjOS4jeiupOivhuOAjeaPreekuuetlOahiOWQju+8jOeCueOAjOS4i+S4gOS4quOAjee7p+e7rVxuICBvbkNob2ljZU5leHQoKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jaG9pY2VTZWxlY3RlZCAhPT0gLTIpIHJldHVybjsgLy8g5LuF6ZmQ44CM5LiN6K6k6K+G44CN5o+t56S654q25oCBXG4gICAgdGhpcy5zZXREYXRhKHsgY2hvaWNlU2VsZWN0ZWQ6IC0xIH0pO1xuICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5ou85YaZ5qih5byPIOKUgOKUgOKUgFxuICBvblNwZWxsSW5wdXQoZTogYW55KSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc3BlbGxJbnB1dDogZS5kZXRhaWwudmFsdWUgfSk7XG4gIH0sXG5cbiAgb25TcGVsbFN1Ym1pdCgpIHtcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuZGF0YS5zcGVsbElucHV0LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICghaW5wdXQpIHJldHVybjtcblxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKCF3b3JkKSByZXR1cm47XG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcblxuXG4gICAgY29uc3QgaXNDb3JyZWN0ID0gaW5wdXQgPT09IHdvcmQud29yZC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHNwZWxsRmVlZGJhY2s6IGlzQ29ycmVjdCA/ICdjb3JyZWN0JyA6ICd3cm9uZydcbiAgICB9KTtcblxuICAgIC8vIOaSreaUvuWPkemfs1xuICAgIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuXG4gICAgLy8g6K6w5b2V6L+b5bqmXG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgaXNDb3JyZWN0KTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgaWYgKCFpc0NvcnJlY3QpIHtcbiAgICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuICAgIH1cblxuICAgIGlmIChpc0NvcnJlY3QpIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGtub3duQ291bnQ6IHRoaXMuZGF0YS5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXREYXRhKHsgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9XG5cbiAgICAvLyDmi7zlr7nlgZwgMS4yIOenku+8m+aLvOmUmeWBnCAzIOenku+8jOeVmeaXtumXtOiusOS9j+ato+ehruaLvOWGmVxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5uZXh0V29yZCgpO1xuICAgIH0sIGlzQ29ycmVjdCA/IDEyMDAgOiAzMDAwKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg57uD5Lmg5qih5byP5YiH5o2i77yI5YiH5o2i5LiN5o2i6K+N5LiN6Lez6K+N77yM5b2T5YmN6K+N5oyJ5paw5pa55byP6YeN5paw5Ye66aKY77yJIOKUgOKUgOKUgFxuICAvLyDilIDilIDilIAg6Ieq5a6a5LmJ6YCJ5oup5by55qGG77yI5qih5byPL+iMg+WbtC/mr4/ova7kuKrmlbDnu5/kuIDnlKjvvIkg4pSA4pSA4pSAXG4gIF9vcGVuU2hlZXQodHlwZTogc3RyaW5nLCB0aXRsZTogc3RyaW5nLCBvcHRpb25zOiBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IGFjdGl2ZTogYm9vbGVhbiB9Pikge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dTaGVldDogdHJ1ZSwgc2hlZXRUeXBlOiB0eXBlLCBzaGVldFRpdGxlOiB0aXRsZSwgc2hlZXRPcHRpb25zOiBvcHRpb25zIH0pO1xuICB9LFxuXG4gIGNsb3NlU2hlZXQoKSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1NoZWV0OiBmYWxzZSB9KTtcbiAgfSxcblxuICBvblNoZWV0U2VsZWN0KGU6IGFueSkge1xuICAgIGNvbnN0IGlkeCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LmluZGV4IGFzIG51bWJlcjtcbiAgICBjb25zdCB0eXBlID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQudHlwZSBhcyBzdHJpbmc7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1NoZWV0OiBmYWxzZSB9KTtcblxuICAgIGlmICh0eXBlID09PSAnbW9kZScpIHtcbiAgICAgIGNvbnN0IG1vZGVzOiBQcmFjdGljZU1vZGVbXSA9IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4JywgJ3F1aWNrJ107XG4gICAgICBjb25zdCBtb2RlID0gbW9kZXNbaWR4XSBhcyBQcmFjdGljZU1vZGU7XG4gICAgICBpZiAoIW1vZGUgfHwgbW9kZSA9PT0gdGhpcy5kYXRhLnByYWN0aWNlTW9kZSkgcmV0dXJuO1xuICAgICAgc2V0UHJhY3RpY2VNb2RlKG1vZGUpO1xuICAgICAgLy8g5YiH5Yiw5b+r6YCf77ya5LuO5a2m5Lmg6Zi25q615byA5aeL77yI546w5pyJ6Zif5YiX55u05o6l5Y+Y5a2m5Lmg5YiX6KGo77yJXG4gICAgICBpZiAobW9kZSA9PT0gJ3F1aWNrJykge1xuICAgICAgICB0aGlzLnNldERhdGEoe1xuICAgICAgICAgIHByYWN0aWNlTW9kZTogbW9kZSxcbiAgICAgICAgICBtb2RlSW5kZXg6IGlkeCxcbiAgICAgICAgICBhY3RpdmVNb2RlOiAncXVpY2snLCAvLyDlrabkuaDop4blm77muLLmn5PopoHmsYIgYWN0aXZlTW9kZT09PSdxdWljayfvvIzkuI7nrZTpopjop4blm77kupLmlqVcbiAgICAgICAgICBxdWlja0xlYXJuaW5nOiB0cnVlLFxuICAgICAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgICAgICBrbm93bkNvdW50OiAwLFxuICAgICAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgICAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgICAgIHF1aWNrVW5rbm93bjoge31cbiAgICAgICAgfSk7XG4gICAgICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuc2V0RGF0YSh7IHByYWN0aWNlTW9kZTogbW9kZSwgbW9kZUluZGV4OiBpZHggfSk7XG4gICAgICBpZiAodGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3Njb3BlJykge1xuICAgICAgY29uc3QgbW9kZXM6IFN0dWR5TW9kZVtdID0gWydhbGwnLCAnaGlnaEZyZXEnLCAnZnVuYycsICdjb250ZW50J107XG4gICAgICBjb25zdCBuZXdNb2RlID0gbW9kZXNbaWR4XTtcbiAgICAgIGlmICghbmV3TW9kZSB8fCBuZXdNb2RlID09PSB0aGlzLmRhdGEuc3R1ZHlNb2RlKSByZXR1cm47XG4gICAgICBzZXRTdHVkeU1vZGUobmV3TW9kZSk7XG4gICAgICB0aGlzLnNldERhdGEoeyB3b3JkQ2xhc3NMYWJlbDogdGhpcy5XT1JEX0NMQVNTX0xBQkVMU1tuZXdNb2RlXSB8fCAn5YWo6YOoJyB9KTtcbiAgICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnYmF0Y2gnKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gWzUsIDEwLCAxNSwgMjBdO1xuICAgICAgY29uc3QgbiA9IG9wdGlvbnNbaWR4XTtcbiAgICAgIGlmICghbiB8fCBuID09PSB0aGlzLmRhdGEuYmF0Y2hTaXplKSByZXR1cm47XG4gICAgICBzZXRCYXRjaFNpemUobik7XG4gICAgICB0aGlzLnNldERhdGEoeyBiYXRjaFNpemU6IG4gfSk7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+avj+i9riAnICsgbiArICcg5Liq5Y2V6K+NJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgICB9XG4gIH0sXG5cbiAgb25Nb2RlVGFwKCkge1xuICAgIGNvbnN0IG1vZGVzOiBQcmFjdGljZU1vZGVbXSA9IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4JywgJ3F1aWNrJ107XG4gICAgdGhpcy5fb3BlblNoZWV0KFxuICAgICAgJ21vZGUnLFxuICAgICAgJ+WtpuS5oOaooeW8jycsXG4gICAgICBtb2Rlcy5tYXAoKG0sIGkpID0+ICh7IGxhYmVsOiB0aGlzLmRhdGEubW9kZUxhYmVsc1tpXSwgYWN0aXZlOiBtID09PSB0aGlzLmRhdGEucHJhY3RpY2VNb2RlIH0pKVxuICAgICk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOW/q+mAn+aooeW8jyDCtyDlrabkuaDpmLbmrrUg4pSA4pSA4pSAXG4gIC8vIOeCuSDDlyDmoIforrDkuI3orqTor4bvvIjlho3ngrnkuIDmrKHlj5bmtojvvIzmgaLlpI3pu5jorqTorqTor4bvvInvvJvngrnooYzlhbblroPljLrln5/lj5Hlo7BcbiAgb25RdWlja01hcmsoZTogYW55KSB7XG4gICAgY29uc3Qgd29yZCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LndvcmQgYXMgc3RyaW5nO1xuICAgIGlmICghd29yZCkgcmV0dXJuO1xuICAgIHBsYXlBdWRpbyh3b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICBjb25zdCBxdWlja1Vua25vd24gPSB7IC4uLnRoaXMuZGF0YS5xdWlja1Vua25vd24gfTtcbiAgICBpZiAocXVpY2tVbmtub3duW3dvcmRdKSB7XG4gICAgICBkZWxldGUgcXVpY2tVbmtub3duW3dvcmRdO1xuICAgIH0gZWxzZSB7XG4gICAgICBxdWlja1Vua25vd25bd29yZF0gPSB0cnVlO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoeyBxdWlja1Vua25vd24gfSk7XG4gIH0sXG5cbiAgLy8g5om56YeP6K6w5b2V5pys6L2u5qCH6K6w77ya5pyq5qCH6K6w6buY6K6k6K6k6K+G77yb6L+U5Zue5LiN6K6k6K+G5pWwXG4gIF9yZWNvcmRRdWlja1JvdW5kKCk6IG51bWJlciB7XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIGNvbnN0IHF1ZXVlID0gdGhpcy5kYXRhLnF1ZXVlO1xuICAgIGNvbnN0IHVua25vd25TZXQgPSB0aGlzLmRhdGEucXVpY2tVbmtub3duO1xuICAgIGxldCB1bmtub3duQ291bnQgPSAwO1xuICAgIGZvciAoY29uc3QgdyBvZiBxdWV1ZSkge1xuICAgICAgY29uc3Qga25vd24gPSAhdW5rbm93blNldFt3LndvcmRdO1xuICAgICAgaWYgKCFrbm93bikge1xuICAgICAgICB1bmtub3duQ291bnQgKz0gMTtcbiAgICAgICAgYWRkVG9Xcm9uZ0Jvb2sody53b3JkLCB3Lm1lYW5pbmcsIGJvb2tJZCk7XG4gICAgICB9XG4gICAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3LndvcmQsIGtub3duKTtcbiAgICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3LndvcmQpKTtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHsga25vd25Db3VudDogcXVldWUubGVuZ3RoIC0gdW5rbm93bkNvdW50LCB1bmtub3duQ291bnQgfSk7XG4gICAgdGhpcy5zeW5jVG9DbG91ZCgpO1xuICAgIHJldHVybiB1bmtub3duQ291bnQ7XG4gIH0sXG5cbiAgLy8g57un57ut77ya5om56YeP6K6w5b2V5ZCO55u05o6l5byA5LiL5LiA6L2u77yI5LiN6K6k6K+G55qE6K+N5aSN5Lmg5o6S56iL5Lya5bC95b+r5YaN5a6J5o6S77yJXG4gIG9uTmV4dFJvdW5kKCkge1xuICAgIGNvbnN0IHVua25vd25Db3VudCA9IHRoaXMuX3JlY29yZFF1aWNrUm91bmQoKTtcbiAgICB3eC5zaG93VG9hc3Qoe1xuICAgICAgdGl0bGU6IHVua25vd25Db3VudCA+IDAgPyAn5bey6K6w5b2V77yM5LiN6K6k6K+G55qE6K+N5Lya5bC95b+r5YaN5a6J5o6SJyA6ICflhajpg6jorqTor4bvvIzlpKrmo5LkuobvvIEnLFxuICAgICAgaWNvbjogJ25vbmUnXG4gICAgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICAvLyDlrozmiJDvvJrmibnph4/orrDlvZXlkI7ov5vnu5PmnpzpobXvvIjnnIvmnKzova7orqTor4bnjofvvIzlj6/lpI3kuaDmnKzova4v5YaN5p2l5LiA6L2u77yJXG4gIG9uUXVpY2tGaW5pc2goKSB7XG4gICAgdGhpcy5fcmVjb3JkUXVpY2tSb3VuZCgpO1xuICAgIHRoaXMuZmluaXNoUm91bmQoKTtcbiAgfSxcblxuICBvblByYWN0aWNlTW9kZUNoYW5nZShlOiBhbnkpIHtcbiAgICBjb25zdCBtb2RlID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQubW9kZSBhcyBQcmFjdGljZU1vZGU7XG4gICAgaWYgKG1vZGUgPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpIHJldHVybjtcblxuICAgIHNldFByYWN0aWNlTW9kZShtb2RlKTtcbiAgICB0aGlzLnNldERhdGEoeyBwcmFjdGljZU1vZGU6IG1vZGUgfSk7XG4gICAgaWYgKHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgfVxuXG4gICAgY29uc3QgbGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBjYXJkOiAn5Y2h54mH5qih5byPJywgY2hvaWNlOiAn6YCJ5oup5qih5byPJywgc3BlbGw6ICfmi7zlhpnmqKHlvI8nLCBtaXg6ICfmt7flkIjmqKHlvI8nLCBxdWljazogJ+W/q+mAn+WtpuS5oCcgfTtcbiAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogbGFiZWxzW21vZGVdIHx8ICcnLCBpY29uOiAnbm9uZScgfSk7XG4gIH0sXG5cbiAgLy8g5YiH5o2i5Ye66aKY6aG65bqP77yI6ZqP5py6IC8g6aG65bqP77yJXG4gIG9uVG9nZ2xlT3JkZXJNb2RlKCkge1xuICAgIGNvbnN0IG5ld01vZGUgPSB0aGlzLmRhdGEub3JkZXJNb2RlID09PSAncmFuZG9tJyA/ICdzZXF1ZW50aWFsJyA6ICdyYW5kb20nO1xuICAgIHNldE9yZGVyTW9kZShuZXdNb2RlKTtcbiAgICB3eC5zaG93VG9hc3Qoe1xuICAgICAgdGl0bGU6IG5ld01vZGUgPT09ICdyYW5kb20nID8gJ+W3suWIh+aNoumaj+acuuWHuuivjScgOiAn5bey5YiH5o2i6aG65bqP5Ye66K+NJyxcbiAgICAgIGljb246ICdub25lJ1xuICAgIH0pO1xuICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gIH0sXG5cbiAgLy8g5b2T5YmN6K+N5piv5ZCm5Li66aaW5qyh5a2m5Lmg55qE5paw6K+N77yI5LuF5paw6K+N6K6h5YWl4oCc57Sv6K6h5Y2V6K+N4oCd77yJXG4gIF9pc05ld1dvcmQod29yZDogc3RyaW5nKTogYm9vbGVhbiB7XG4gICAgcmV0dXJuICEhdGhpcy5fbmV3V29yZFNldCAmJiB0aGlzLl9uZXdXb3JkU2V0Lmhhcyh3b3JkLnRvTG93ZXJDYXNlKCkpO1xuICB9LFxuXG4gIC8vIOiuvue9ruavj+i9ruWtpuS5oOWNleivjeaVsO+8iOmhtumDqOaMiemSru+8iVxuICBvbkNoYW5nZUJhdGNoU2l6ZSgpIHtcbiAgICBjb25zdCBvcHRpb25zID0gWzUsIDEwLCAxNSwgMjBdO1xuICAgIHRoaXMuX29wZW5TaGVldChcbiAgICAgICdiYXRjaCcsXG4gICAgICAn5q+P6L2u5Liq5pWwJyxcbiAgICAgIG9wdGlvbnMubWFwKG4gPT4gKHsgbGFiZWw6IG4gKyAnIOS4qi/ova4nLCBhY3RpdmU6IG4gPT09IHRoaXMuZGF0YS5iYXRjaFNpemUgfSkpXG4gICAgKTtcbiAgfSxcblxuICAvLyDliIfmjaLlrabkuaDojIPlm7TvvIjlhajpg6gv6auY6aKRL+iZmuivjS/lrp7or43vvIlcbiAgV09SRF9DTEFTU19MQUJFTFM6IHsgYWxsOiAn5YWo6YOoJywgaGlnaEZyZXE6ICfpq5jpopHor40nLCBmdW5jOiAn6Jma6K+NJywgY29udGVudDogJ+WunuivjScgfSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuXG4gIG9uU2VsZWN0V29yZENsYXNzKCkge1xuICAgIGNvbnN0IG1vZGVzOiBTdHVkeU1vZGVbXSA9IFsnYWxsJywgJ2hpZ2hGcmVxJywgJ2Z1bmMnLCAnY29udGVudCddO1xuICAgIHRoaXMuX29wZW5TaGVldChcbiAgICAgICdzY29wZScsXG4gICAgICAn6K+N5Lmm6IyD5Zu0JyxcbiAgICAgIG1vZGVzLm1hcChtID0+ICh7IGxhYmVsOiB0aGlzLldPUkRfQ0xBU1NfTEFCRUxTW21dLCBhY3RpdmU6IG0gPT09IHRoaXMuZGF0YS5zdHVkeU1vZGUgfSkpXG4gICAgKTtcbiAgfSxcblxuICAvLyDlhbzlrrnml6flhaXlj6NcbiAgdG9nZ2xlU3R1ZHlNb2RlKCkge1xuICAgIHRoaXMub25TZWxlY3RXb3JkQ2xhc3MoKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5a+85Ye65LuK5pel5Y2V6K+N6KGoIOKUgOKUgOKUgFxuICBfdG9kYXlSb3dzOiBudWxsIGFzIFRvZGF5Um93W10gfCBudWxsLFxuXG4gIG9uRXhwb3J0VG9kYXkoKSB7XG4gICAgd3guc2hvd0xvYWRpbmcoeyB0aXRsZTogJ+aVtOeQhuWNleivjeS4rS4uLicgfSk7XG4gICAgY29sbGVjdFRvZGF5Um93cygpLnRoZW4oKHJvd3MpID0+IHtcbiAgICAgIHd4LmhpZGVMb2FkaW5nKCk7XG4gICAgICB0aGlzLl90b2RheVJvd3MgPSByb3dzO1xuICAgICAgc2hvd0V4cG9ydFNoZWV0KHJvd3MsICgpID0+IHRoaXMuX2dldEV4cG9ydENhbnZhcygpKTtcbiAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICB3eC5oaWRlTG9hZGluZygpO1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfmlbTnkIblpLHotKXvvIzor7fph43or5UnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2dldEV4cG9ydENhbnZhcygpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB3eC5jcmVhdGVTZWxlY3RvclF1ZXJ5KCkuaW4odGhpcylcbiAgICAgICAgLnNlbGVjdCgnI2V4cG9ydENhbnZhcycpXG4gICAgICAgIC5maWVsZHMoeyBub2RlOiB0cnVlIH0pXG4gICAgICAgIC5leGVjKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChyZXMgJiYgcmVzWzBdICYmIHJlc1swXS5ub2RlKSByZXNvbHZlKHJlc1swXS5ub2RlKTtcbiAgICAgICAgICBlbHNlIHJlamVjdChuZXcgRXJyb3IoJ2NhbnZhcyDmnKrlsLHnu6onKSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDljaHniYfmqKHlvI/orqTor4Yv5LiN6K6k6K+GIOKUgOKUgOKUgFxuICBtYXJrS25vd24oKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jdXJyZW50SW5kZXggPj0gdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCB0cnVlKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAga25vd25Db3VudDogdGhpcy5kYXRhLmtub3duQ291bnQgKyAxXG4gICAgfSk7XG4gICAgdGhpcy5uZXh0V29yZCgpO1xuICB9LFxuXG4gIC8vIOS4jeiupOivhu+8muS4juiupOivhuWujOWFqOWvueensOKAlOKAlOiusOW9leWQjuebtOaOpei/m+S4i+S4gOW8oO+8iOaDs+eci+mHiuS5ieWFiOeCueWNoeeJh+e/u+mdouWGjeivhO+8iVxuICBtYXJrVW5rbm93bigpIHtcbiAgICBpZiAodGhpcy5kYXRhLmN1cnJlbnRJbmRleCA+PSB0aGlzLmRhdGEucXVldWUubGVuZ3RoKSByZXR1cm47XG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGZhbHNlKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgYWRkVG9Xcm9uZ0Jvb2sod29yZC53b3JkLCB3b3JkLm1lYW5pbmcsIGJvb2tJZCk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMVxuICAgIH0pO1xuICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5b+r6YCf5qih5byPIMK3IOWtpuS5oOmYtuautSDilIDilIDilIBcbiAgLy8g54K55Y2V6K+N6KGM77ya5Y+R5aOw77yI57qv5rWP6KeI77yM5LiN6K6w5pWw5o2u77yJXG4gIG9uTGlzdFRhcChlOiBhbnkpIHtcbiAgICBjb25zdCB3b3JkID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQud29yZCBhcyBzdHJpbmc7XG4gICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgfSxcblxuICBuZXh0V29yZCgpIHtcbiAgICAvLyDpmLLlvqHvvJrpmJ/liJflvILluLjvvIjnqbrpmJ/liJcv5LiL5qCH6LaK55WM77yJ5pe255u05o6l6YeN5byA5LiA6L2u77yM6YG/5YWN55m95bGP5Y2h5q27XG4gICAgaWYgKCF0aGlzLmRhdGEucXVldWUgfHwgdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbmV4dCA9IHRoaXMuZGF0YS5jdXJyZW50SW5kZXggKyAxO1xuICAgIGlmIChuZXh0ID49IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZmluaXNoUm91bmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGN1cnJlbnRJbmRleDogbmV4dFxuICAgIH0sICgpID0+IHtcbiAgICAgIC8vIOS4uuaWsOivjeehruWumuWHuumimOaWueW8j++8iG1peCDmqKHlvI/kuIvmr4/kuKror43pmo/mnLrljaHniYcv6YCJ5oupL+aLvOWGme+8ie+8jOW5tumHjee9ruetlOmimOeKtuaAgVxuICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgLy8g6aKE5Yqg6L295LiL5LiL5Liq6K+NXG4gICAgICBjb25zdCBhZnRlck5leHQgPSB0aGlzLmRhdGEucXVldWVbbmV4dCArIDFdO1xuICAgICAgaWYgKGFmdGVyTmV4dCkgcHJlbG9hZEF1ZGlvKGFmdGVyTmV4dC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICB9KTtcbiAgfSxcblxuICBmaW5pc2hSb3VuZCgpIHtcbiAgICAvLyDmnKzova7lt7Lnu5PmnZ/vvJrmuIXmjonph43lu7rlrojljavnmoQga2V577yM56Gu5L+d5LiL5qyh6L+b5YWl6aG16Z2i77yI5LuO6aaW6aG154K54oCc6IOM5Y2V6K+N4oCdL+WIhyB0YWIg5Zue5p2l77yJXG4gICAgLy8g5LiN5Lya5ZG95Lit4oCc5pWw5o2u5pyq5Y+Y6Lez6L+H6YeN5bu64oCd6ICM5Y2h5Zyo5pyA5ZCO5LiA5Liq6K+N77yI5q2k5pe2IF9hbnN3ZXJlZFNldCDlt7Lmu6HvvIzmjInpkq7lhajml6Dlj43lupTvvIlcbiAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJztcbiAgICBjb25zdCB0b3RhbCA9IHRoaXMuZGF0YS50b3RhbENvdW50O1xuICAgIGNvbnN0IGtub3duID0gdGhpcy5kYXRhLmtub3duQ291bnQ7XG4gICAgY29uc3QgcmF0ZSA9IHRvdGFsID4gMCA/IE1hdGgucm91bmQoKGtub3duIC8gdG90YWwpICogMTAwKSA6IDA7XG4gICAgbGV0IHByYWlzZSA9ICfnu6fnu63liqDmsrnvvIEnO1xuICAgIGlmIChyYXRlID49IDkwKSBwcmFpc2UgPSAn5aSq5qOS5LqG77yM5Yeg5LmO5YWo6YOo5o6M5o+h77yBJztcbiAgICBlbHNlIGlmIChyYXRlID49IDcwKSBwcmFpc2UgPSAn5LiN6ZSZ5ZOm77yM57un57ut5L+d5oyB77yBJztcbiAgICBlbHNlIGlmIChyYXRlID49IDUwKSBwcmFpc2UgPSAn6L+Y6ZyA5aSa5aSN5Lmg5Yeg6YGNJztcblxuICAgIC8vIOiusOS9j+acrOi9rumYn+WIl++8jOS+m+OAjOWkjeS5oOacrOi9ruOAjeWOn+agt+mHjeWIt++8iOS4jeaNouivje+8iVxuICAgIHRoaXMuX2xhc3RSb3VuZFF1ZXVlID0gdGhpcy5kYXRhLnF1ZXVlLnNsaWNlKCk7XG5cbiAgICAvLyDlkIzmraXlrabkuaDmlbDmja7liLDkupHnq69cbiAgICB0aGlzLnN5bmNUb0Nsb3VkKCk7XG5cbiAgICAvLyDmmL7npLrlhajlsY/nu5PmnpzpobVcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgc2hvd1Jlc3VsdDogdHJ1ZSxcbiAgICAgIHJlc3VsdFJhdGU6IHJhdGUsXG4gICAgICByZXN1bHRQcmFpc2U6IHByYWlzZVxuICAgICAgLy8gcmVtaW5kZXJTdWJzY3JpYmVkOiBpc1JlbWluZGVyU3Vic2NyaWJlZCgpIC8vIOWtpuS5oOaPkOmGkuW3suS4i+e6v++8iDIwMjYtMDgtMzHvvIlcbiAgICB9KTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrlvIDlkK/lrabkuaDmj5DphpLvvIjlt7LkuIvnur8gMjAyNi0wOC0zMe+8muS4gOasoeaAp+iuoumYhemcgOmHjeWkjeaOiOadg++8jOS9k+mqjOe5geeQkO+8iVxuICAvLyBvblN1YnNjcmliZVJlbWluZGVyKCkge1xuICAvLyAgIGlmIChpc1JlbWluZGVyU3Vic2NyaWJlZCgpKSByZXR1cm47XG4gIC8vICAgcmVxdWVzdFJlbWluZGVyU3Vic2NyaWJlKCkudGhlbigoYWNjZXB0ZWQpID0+IHtcbiAgLy8gICAgIHRoaXMuc2V0RGF0YSh7IHJlbWluZGVyU3Vic2NyaWJlZDogYWNjZXB0ZWQgfSk7XG4gIC8vICAgICBpZiAoYWNjZXB0ZWQpIHtcbiAgLy8gICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7LlvIDlkK/lrabkuaDmj5DphpInLCBpY29uOiAnc3VjY2VzcycgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5YaN5p2l5LiA6L2uXG4gIG9uUmVzdWx0UmVzdGFydCgpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiBmYWxzZSB9KTtcbiAgICB0aGlzLmluaXRCYXRjaCgpO1xuICB9LFxuXG4gIC8vIOe7k+aenOmhte+8muWkjeS5oOacrOi9ru+8iOeUqOWImuiAg+WujOeahOWOn+mYn+WIl+mHjeWIt+S4gOmBje+8jOS4jeiuoeWFpee0r+iuoeaWsOivje+8iVxuICBfbGFzdFJvdW5kUXVldWU6IFtdIGFzIFdvcmRJdGVtW10sXG5cbiAgb25SZXN1bHRSZXZpZXdSb3VuZCgpIHtcbiAgICBjb25zdCBsYXN0ID0gdGhpcy5fbGFzdFJvdW5kUXVldWU7XG4gICAgaWYgKCFsYXN0IHx8IGxhc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+acrOi9rumYn+WIl+W3suS4jeWcqO+8jOivleivleWGjeadpeS4gOi9ricsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fbG9hZGVkS2V5ID0gJyc7IC8vIOe7lei/h+KAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneWuiOWNq1xuICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgLy8g5aSN5Lmg6L2u5LiN6K6h5YWl57Sv6K6h5paw6K+N77ya5riF56m65paw6K+N6ZuG5ZCI77yIX2lzTmV3V29yZCDov5Tlm54gZmFsc2XvvIlcbiAgICB0aGlzLl9uZXdXb3JkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgcmVwb3J0ZWRNYXA6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge307XG4gICAgZm9yIChjb25zdCB3IG9mIGxhc3QpIHtcbiAgICAgIGlmIChpc1dvcmRSZXBvcnRlZCh3LndvcmQpKSByZXBvcnRlZE1hcFt3LndvcmRdID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgICAgcXVldWU6IGxhc3QsXG4gICAgICBfd29yZEJvb2tXb3JkczogdGhpcy5kYXRhLl93b3JkQm9va1dvcmRzLFxuICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICB0b3RhbENvdW50OiBsYXN0Lmxlbmd0aCxcbiAgICAgIHN0YXR1c0xhYmVsOiAn5aSN5LmgJyxcbiAgICAgIHF1aWNrTGVhcm5pbmc6IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUgPT09ICdxdWljaycsXG4gICAgICBxdWlja1Vua25vd246IHt9LFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrov5Tlm55cbiAgb25SZXN1bHRCYWNrKCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXN1bHQ6IGZhbHNlIH0pO1xuICAgIHd4LnN3aXRjaFRhYih7IHVybDogJy9wYWdlcy9pbmRleC9pbmRleCcgfSk7XG4gIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5YiG5Lqr5omT5Y2h5rW35oqlXG4gIG9uU2hhcmVQb3N0ZXIoKSB7XG4gICAgLy8g6K6w5b2V4oCc5LuO5rW35oql6aG16L+U5Zue5pe25LiN6YeN5byA5paw5LiA6L2u4oCd77yM5bm26K6w5L2P6L+U5Zue5ZCO5piv5ZCm6KaB5oGi5aSN57uT5p6c6aG1XG4gICAgdGhpcy5fc2tpcEluaXRPblNob3cgPSB0cnVlO1xuICAgIHRoaXMuX3Jlc3RvcmVSZXN1bHRPblNob3cgPSB0aGlzLmRhdGEuc2hvd1Jlc3VsdDtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiBmYWxzZSB9KTtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogYC9wYWdlcy9wb3N0ZXIvcG9zdGVyP3JhdGU9JHt0aGlzLmRhdGEucmVzdWx0UmF0ZX1gXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5ZCM5q2l5a2m5Lmg57uf6K6h5Yiw5LqR56uv77yI57uPIHN5bmNVc2VyIOS6keWHveaVsO+8muacjeWKoeerr+WQiOW5tuWPlui+g+Wkp+WAvO+8jOmYsuWOhuWPsuiiq+WGsuWwj++8iVxuICBzeW5jVG9DbG91ZCgpIHtcbiAgICBzeW5jU3RhdHNUb0Nsb3VkKGdldFN0YXRzKCkpO1xuICB9LFxuXG4gIC8vIOi9rOWPkee7meWlveWPi1xuICBvblNoYXJlQXBwTWVzc2FnZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6ICfmiJHlnKjnlKjor43moLnorrDlv4bms5Xog4zljZXor43vvIzkuIDotbfmnaXvvIEnLFxuICAgICAgcGF0aDogJy9wYWdlcy9pbmRleC9pbmRleCdcbiAgICB9O1xuICB9LFxuXG4gIC8vIOWIhuS6q+WIsOaci+WPi+WciO+8iOWNlemhteaooeW8j++8iVxuICBvblNoYXJlVGltZWxpbmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiAn5oiR5Zyo55So6K+N5qC56K6w5b+G5rOV6IOM5Y2V6K+N77yM5LiA6LW35p2l77yBJ1xuICAgIH07XG4gIH0sXG59KTtcbiJdfQ==