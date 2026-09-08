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
        orderMode: 'random',
        modeLabels: ['卡片', '选择', '拼写', '混合', '列表'],
        modeIndex: 0,
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
            modeIndex: ['card', 'choice', 'spell', 'mix', 'list'].indexOf((0, store_1.getPracticeMode)()),
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
        this.setData({
            activeMode: mode,
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
    onModeTap() {
        const modes = ['card', 'choice', 'spell', 'mix', 'list'];
        const labels = this.data.modeLabels;
        wx.showActionSheet({
            itemList: labels,
            success: (res) => {
                const idx = res.tapIndex;
                const mode = modes[idx];
                if (!mode || mode === this.data.practiceMode)
                    return;
                (0, store_1.setPracticeMode)(mode);
                this.setData({ practiceMode: mode, modeIndex: idx });
                if (this.data.queue.length > 0) {
                    this._applyModeForCurrent();
                }
                const full = { card: '卡片模式', choice: '选择模式', spell: '拼写模式', mix: '混合模式', list: '列表模式' };
                wx.showToast({ title: full[mode] || '', icon: 'none' });
            }
        });
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
        const labels = { card: '卡片模式', choice: '选择模式', spell: '拼写模式', mix: '混合模式', list: '列表模式' };
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
        wx.showActionSheet({
            itemList: options.map(n => n + ' 个/轮'),
            success: (res) => {
                const n = options[res.tapIndex];
                if (!n || n === this.data.batchSize)
                    return;
                (0, store_1.setBatchSize)(n);
                wx.showToast({ title: '每轮 ' + n + ' 个单词', icon: 'none' });
                this.initBatch();
            }
        });
    },
    WORD_CLASS_LABELS: { all: '全部', highFreq: '高频词', func: '虚词', content: '实词' },
    onSelectWordClass() {
        const modes = ['all', 'highFreq', 'func', 'content'];
        const labels = modes.map(m => this.WORD_CLASS_LABELS[m]);
        wx.showActionSheet({
            itemList: labels,
            success: (res) => {
                const newMode = modes[res.tapIndex];
                if (!newMode || newMode === this.data.studyMode)
                    return;
                (0, store_1.setStudyMode)(newMode);
                wx.showToast({ title: '已切换为「' + this.WORD_CLASS_LABELS[newMode] + '」', icon: 'none' });
                this.initBatch();
            }
        });
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
        const idx = e.currentTarget.dataset.idx;
        const w = this.data.queue[idx];
        if (w)
            (0, audio_1.playAudio)(w.word, this.data.accent);
    },
    onListAnswer(e) {
        const idx = e.currentTarget.dataset.idx;
        const known = e.currentTarget.dataset.known === '1';
        if (this.data.queue[idx] == null)
            return;
        const word = this.data.queue[idx];
        if (this.data.listAnswered[word.word])
            return;
        if (this._answeredSet.has(idx))
            return;
        this._answeredSet.add(idx);
        const bookId = (0, store_1.getCurrentBookId)();
        (0, store_1.recordWordProgress)(bookId, word.word, known);
        (0, store_1.recordStudy)(1, this._isNewWord(word.word));
        if (!known)
            (0, store_1.addToWrongBook)(word.word, word.meaning, bookId);
        const listAnswered = { ...this.data.listAnswered, [word.word]: known ? 'known' : 'unknown' };
        const knownCount = this.data.knownCount + (known ? 1 : 0);
        const unknownCount = this.data.unknownCount + (known ? 0 : 1);
        this.setData({ listAnswered, knownCount, unknownCount });
        if (knownCount + unknownCount >= this.data.totalCount) {
            setTimeout(() => this.finishRound(), 400);
        }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3b3Jkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLDZDQXFCMkI7QUFFM0IsNkNBQW1EO0FBQ25ELHlEQUFzRDtBQUN0RCw0Q0FBMkQ7QUFDM0QsNkNBQTREO0FBQzVELHVEQUFnRjtBQUNoRix5REFBc0Y7QUFHdEYsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUM7QUFJekMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQUUzQyxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFHckMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQVEzQyxJQUFJLENBQUM7SUFDSCxJQUFJLEVBQUU7UUFFSixRQUFRLEVBQUUsTUFBTTtRQUNoQixTQUFTLEVBQUUsQ0FBQztRQUVaLEtBQUssRUFBRSxFQUFnQjtRQUN2QixZQUFZLEVBQUUsQ0FBQztRQUVmLFdBQVcsRUFBRSxLQUFLO1FBRWxCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLENBQUM7UUFDZixVQUFVLEVBQUUsQ0FBQztRQUViLFFBQVEsRUFBRSxDQUFDO1FBQ1gsYUFBYSxFQUFFLENBQUM7UUFFaEIsV0FBVyxFQUFFLElBQUk7UUFFakIsT0FBTyxFQUFFLElBQUk7UUFFYixPQUFPLEVBQUUsSUFBSTtRQUViLFNBQVMsRUFBRSxLQUFrQjtRQUU3QixTQUFTLEVBQUUsRUFBRTtRQUViLGFBQWEsRUFBRSxDQUFDO1FBRWhCLFNBQVMsRUFBRSxDQUFDO1FBQ1osWUFBWSxFQUFFLENBQUM7UUFFZixjQUFjLEVBQUUsSUFBSTtRQUNwQixhQUFhLEVBQUUsUUFBUTtRQUl2QixZQUFZLEVBQUUsTUFBc0I7UUFFcEMsVUFBVSxFQUFFLE1BQThCO1FBRTFDLGFBQWEsRUFBRSxFQUFvQjtRQUVuQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRWxCLGFBQWEsRUFBRSxLQUFLO1FBRXBCLFVBQVUsRUFBRSxFQUFFO1FBRWQs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cy50c1xuaW1wb3J0IHsgV29yZEl0ZW0gfSBmcm9tICcuLi8uLi9kYXRhL3R5cGVzJztcbmltcG9ydCB7XG4gIGdldEN1cnJlbnRCb29rSWQsXG4gIGdldEFsbFByb2dyZXNzLFxuICByZWNvcmRXb3JkUHJvZ3Jlc3MsXG4gIHJlY29yZFN0dWR5LFxuICBnZXRCb29rUHJvZ3Jlc3NTdGF0cyxcbiAgZ2V0U3RhdHMsXG4gIHN5bmNTdGF0c1RvQ2xvdWQsXG4gIGhhc1NlbGVjdGVkQm9vayxcbiAgZ2V0U3R1ZHlNb2RlLFxuICBzZXRTdHVkeU1vZGUsXG4gIGdldEJhdGNoU2l6ZSxcbiAgc2V0QmF0Y2hTaXplLFxuICBnZXRQcmFjdGljZU1vZGUsXG4gIHNldFByYWN0aWNlTW9kZSxcbiAgZ2V0T3JkZXJNb2RlLFxuICBzZXRPcmRlck1vZGUsXG4gIGdldFRvZGF5TGVhcm5lZFdvcmRzLFxuICBnZXRBY2NlbnQsXG4gIHNldEFjY2VudCxcbiAgYWRkVG9Xcm9uZ0Jvb2tcbn0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHR5cGUgeyBQcmFjdGljZU1vZGUsIENvbmNyZXRlUHJhY3RpY2VNb2RlLCBBY2NlbnQsIFN0dWR5TW9kZSB9IGZyb20gJy4uLy4uL3V0aWxzL3N0b3JlJztcbmltcG9ydCB7IHRvQ29uY3JldGVNb2RlIH0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHsgZ2V0Qm9va0J5SWQgfSBmcm9tICcuLi8uLi91dGlscy93b3JkU2VydmljZSc7XG5pbXBvcnQgeyB3b3JkQm9va3MgYXMgbG9jYWxCb29rcyB9IGZyb20gJy4uLy4uL2RhdGEvaW5kZXgnO1xuaW1wb3J0IHsgcGxheUF1ZGlvLCBwcmVsb2FkQXVkaW8gfSBmcm9tICcuLi8uLi91dGlscy9hdWRpbyc7XG5pbXBvcnQgeyByZXBvcnRXb3JkLCBpc1dvcmRSZXBvcnRlZCwgUmVwb3J0VHlwZSB9IGZyb20gJy4uLy4uL3V0aWxzL3dvcmRSZXBvcnQnO1xuaW1wb3J0IHsgY29sbGVjdFRvZGF5Um93cywgc2hvd0V4cG9ydFNoZWV0LCBUb2RheVJvdyB9IGZyb20gJy4uLy4uL3V0aWxzL3RvZGF5RXhwb3J0JztcblxuLy8g5aSN5Lmg5qih5byP5LiA5qyh5oCn5YWl5Y+j5qCH5b+X77yI6aaW6aG14oCc5b6F5aSN5Lmg4oCd54K55Ye75pe25YaZ5YWl77yMd29yZHMg6aG1IG9uU2hvdyDmtojotLnvvIlcbmNvbnN0IFJFVklFV19NT0RFX0tFWSA9ICdiY19yZXZpZXdfbW9kZSc7XG5cbi8vIOiusOW/huS9k+ajgOmrmOWNseivjeS4gOi9ruW8j+WFpeWPo+agh+W/l++8iG1lbW9yeSDpobXjgIznq4vljbPlpI3kuaDov5nkupvor43jgI3lhpnlhaXvvIx3b3JkcyDpobUgb25TaG93IOa2iOi0ue+8iVxuLy8g5YC877yaeyBib29rSWQ6IHN0cmluZywgd29yZHM6IHN0cmluZ1tdIH3vvIzkuI7mnKzor43kuabljLnphY3miY3nlJ/mlYhcbmNvbnN0IE1FTU9SWV9XT1JEU19LRVkgPSAnYmNfbWVtb3J5X3dvcmRzJztcbi8vIOmmlumhteKAnOWtpuaWsOivjeKAneWFpeWPo+agh+W/l++8iOS4gOasoeaAp++8ie+8muW8uuWItuW8gOaWsOS4gOi9ru+8jOS4jei1sOKAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneWuiOWNq1xuY29uc3QgTkVXX1JPVU5EX0tFWSA9ICdiY19uZXdfcm91bmQnO1xuXG4vLyDigJzku4rml6XlpI3nm5jigJ3lhaXlj6PmoIflv5fvvIjkuIDmrKHmgKfvvInvvJrmnKzova7lj6rlpI3nm5jku4rlpKnlrabov4fnmoTor43vvIjmiJHnmoTpobUv6aaW6aG15YaZ5YWl77yJXG5jb25zdCBUT0RBWV9SRVZJRVdfS0VZID0gJ2JjX3RvZGF5X3Jldmlldyc7XG5cbi8vIOWbm+mAieS4gOmAiemhueaOpeWPo1xuaW50ZXJmYWNlIENob2ljZU9wdGlvbiB7XG4gIG1lYW5pbmc6IHN0cmluZztcbiAgaXNDb3JyZWN0OiBib29sZWFuO1xufVxuXG5QYWdlKHtcbiAgZGF0YToge1xuICAgIC8vIOW9k+WJjeivjeS5puS/oeaBr1xuICAgIGJvb2tOYW1lOiAn5Yid5Lit6K+N5rGHJyxcbiAgICBib29rVG90YWw6IDAsXG4gICAgLy8g5pys6L2u5Y2V6K+N6Zif5YiXXG4gICAgcXVldWU6IFtdIGFzIFdvcmRJdGVtW10sXG4gICAgY3VycmVudEluZGV4OiAwLFxuICAgIC8vIOaYr+WQpuaYvuekuumHiuS5ie+8iOWNoeeJh+aooeW8j+eUqO+8iVxuICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAvLyDmnKzova7lrabkuaDov5vluqZcbiAgICBrbm93bkNvdW50OiAwLFxuICAgIHVua25vd25Db3VudDogMCxcbiAgICB0b3RhbENvdW50OiAwLFxuICAgIC8vIOW+heWkjeS5oOaVsFxuICAgIGR1ZUNvdW50OiAwLFxuICAgIG1hc3RlcmVkQ291bnQ6IDAsXG4gICAgLy8g54q25oCB5qCH562+XG4gICAgc3RhdHVzTGFiZWw6ICfmlrDor40nLFxuICAgIC8vIOaYr+WQpui/mOacieabtOWkmlxuICAgIGhhc01vcmU6IHRydWUsXG4gICAgLy8g5Yqg6L2954q25oCBXG4gICAgbG9hZGluZzogdHJ1ZSxcbiAgICAvLyDlrabkuaDojIPlm7TnrZvpgInvvIjlhajpg6gv6auY6aKRL+iZmuivjS/lrp7or43vvIlcbiAgICBzdHVkeU1vZGU6ICdhbGwnIGFzIFN0dWR5TW9kZSxcbiAgICAvLyDmr4/ova7lrabkuaDljZXor43mlbDvvIjpobbpg6jmjInpkq7lj6/osIPvvIlcbiAgICBiYXRjaFNpemU6IDEwLFxuICAgIC8vIOmrmOmikeivjeaVsOmHj1xuICAgIGhpZ2hGcmVxQ291bnQ6IDAsXG4gICAgLy8g6Jma6K+NL+WunuivjeaVsOmHj1xuICAgIGZ1bmNDb3VudDogMCxcbiAgICBjb250ZW50Q291bnQ6IDAsXG4gICAgLy8g5a2m5Lmg6IyD5Zu05qCH562+77yId3htbCDlsZXnpLrvvIlcbiAgICB3b3JkQ2xhc3NMYWJlbDogJ+WFqOmDqCcsXG4gICAgY3VycmVudEJvb2tJZDogJ2p1bmlvcicsXG4gICAgLy8gcmVtaW5kZXJTdWJzY3JpYmVkOiBmYWxzZSwgLy8g5a2m5Lmg5o+Q6YaS5bey5LiL57q/77yIMjAyNi0wOC0zMe+8iVxuICAgIC8vIOKUgOKUgOKUgCDpmLbmrrXkuIDmlrDlop4g4pSA4pSA4pSAXG4gICAgLy8g57uD5Lmg5qih5byP77ya5Y2h54mH57+76Z2iIC8g5Zub6YCJ5LiAIC8g5ou85YaZIC8g5re35ZCI77yIbWl477yJXG4gICAgcHJhY3RpY2VNb2RlOiAnY2FyZCcgYXMgUHJhY3RpY2VNb2RlLFxuICAgIC8vIOW9k+WJjeivjeWunumZhea4suafk+eahOWHuumimOaWueW8j++8iG1peCDmqKHlvI/kuIvmr4/kuKror43pmo/mnLrvvIzlhbbkvZnkuI4gcHJhY3RpY2VNb2RlIOS4gOiHtO+8iVxuICAgIGFjdGl2ZU1vZGU6ICdjYXJkJyBhcyBDb25jcmV0ZVByYWN0aWNlTW9kZSxcbiAgICAvLyDlm5vpgInkuIDpgInpoblcbiAgICBjaG9pY2VPcHRpb25zOiBbXSBhcyBDaG9pY2VPcHRpb25bXSxcbiAgICAvLyDlm5vpgInkuIDmmK/lkKblt7LpgIlcbiAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgLy8g5Zub6YCJ5LiA5piv5ZCm562U5a+5XG4gICAgY2hvaWNlQ29ycmVjdDogZmFsc2UsXG4gICAgLy8g5ou85YaZ5qih5byP6L6T5YWl5YC8XG4gICAgc3BlbGxJbnB1dDogJycsXG4gICAgLy8g5ou85YaZ5Y+N6aaI54q25oCB77yabm9uZSAvIGNvcnJlY3QgLyB3cm9uZ1xuICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAvLyDlj5Hpn7Plj6Ppn7PlgY/lpb1cbiAgICBhY2NlbnQ6ICd1cycgYXMgQWNjZW50LFxuICAgIC8vIOe7k+aenOmhtVxuICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgIHJlc3VsdFJhdGU6IDAsXG4gICAgcmVzdWx0UHJhaXNlOiAnJyxcbiAgICAvLyDnv7vpnaLliqjnlLvnirbmgIFcbiAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgIC8vIOWNoeeJh+aooeW8j+OAjOS4jeiupOivhuOAjeaPreekuuetlOahiOeKtuaAge+8iHRydWUg5pe25bGV56S644CM5LiL5LiA5Liq44CN5oyJ6ZKu5bm26ZSB5a6a57+76Z2i77yJXG4gICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAvLyDkuIrkuIDpopjlr7nplJnvvIjnlKjkuo7nu5PmnpzpobXliKTmlq3mmK/lkKborrDlvZXvvIlcbiAgICBfd29yZEJvb2tXb3JkczogW10gYXMgV29yZEl0ZW1bXSxcbiAgICAvLyDliJfooajmqKHlvI/vvJrmr4/or43kvZznrZTnirbmgIHvvIh3b3JkIOKGkiAna25vd24nIHwgJ3Vua25vd24n77yJ77yM6K6k6K+G55qE6K+N5oqY5Y+g572u54GwXG4gICAgbGlzdEFuc3dlcmVkOiB7fSBhcyBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LFxuICAgIC8vIOWHuumimOmhuuW6j++8mumaj+acuiAvIOmhuuW6j1xuICAgIG9yZGVyTW9kZTogJ3JhbmRvbScgYXMgJ3JhbmRvbScgfCAnc2VxdWVudGlhbCcsXG4gICAgLy8g4pSA4pSA4pSAIOWHuumimOaooeW8j+S4i+aLieahhiDilIDilIDilIBcbiAgICBtb2RlTGFiZWxzOiBbJ+WNoeeJhycsICfpgInmi6knLCAn5ou85YaZJywgJ+a3t+WQiCcsICfliJfooagnXSBhcyBzdHJpbmdbXSxcbiAgICBtb2RlSW5kZXg6IDAsXG4gICAgLy8g4pSA4pSA4pSAIOe6oOmUmeS4iuaKpSDilIDilIDilIBcbiAgICBzaG93UmVwb3J0OiBmYWxzZSxcbiAgICByZXBvcnRUeXBlOiAnJyBhcyBSZXBvcnRUeXBlIHwgJycsXG4gICAgcmVwb3J0RGVzYzogJycsXG4gICAgcmVwb3J0ZWRNYXA6IHt9IGFzIFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+IC8vIOW3suS4iuaKpeivje+8iHdvcmQg4oaSIHRydWXvvIlcbiAgfSxcblxuICBvbkxvYWQoKSB7fSxcblxuICAvLyDmnKzova7lt7LkvZznrZTnmoTkuIvmoIfpm4blkIjvvIjkv67lpI3liIfmqKHlvI/lkI7lkIzkuIDor43ph43lpI3orqHmlbDnmoQgYnVn77yJXG4gIF9hbnN3ZXJlZFNldDogbmV3IFNldDxudW1iZXI+KCkgYXMgU2V0PG51bWJlcj4sXG5cbiAgb25TaG93KCkge1xuICAgIC8vIOS7juWIhuS6q+a1t+aKpemhtei/lOWbnu+8muS/neeVmeW9k+WJjeS4gOi9rue7k+aenO+8jOS4jemHjeaWsOWKoOi9veaWsOeahOS4gOi9rlxuICAgIGlmICh0aGlzLl9za2lwSW5pdE9uU2hvdykge1xuICAgICAgdGhpcy5fc2tpcEluaXRPblNob3cgPSBmYWxzZTtcbiAgICAgIGlmICh0aGlzLl9yZXN0b3JlUmVzdWx0T25TaG93KSB7XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXN1bHQ6IHRydWUgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9yZXN0b3JlUmVzdWx0T25TaG93ID0gZmFsc2U7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIC8vIOa2iOi0uemmlumhteKAnOW+heWkjeS5oOKAneWFpeWPo+agh+W/l++8muacrOi9ruS7heWkjeS5oOWIsOacn+W+heWkjeS5oOivje+8iOS4gOasoeaAp++8iVxuICAgIGlmICh3eC5nZXRTdG9yYWdlU3luYyhSRVZJRVdfTU9ERV9LRVkpID09PSAxKSB7XG4gICAgICB3eC5yZW1vdmVTdG9yYWdlU3luYyhSRVZJRVdfTU9ERV9LRVkpO1xuICAgICAgdGhpcy5fcmV2aWV3TW9kZSA9IHRydWU7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3Jldmlld01vZGUgPSBmYWxzZTtcbiAgICB9XG4gICAgLy8g5raI6LS56K6w5b+G5L2T5qOA5YWl5Y+j5qCH5b+X77ya5pys6L2u5Y+q5aSN5Lmg5L2T5qOA5riF5Y2V6YeM55qE6auY5Y2x6K+N77yI5LiA5qyh5oCn77yM6Leo6K+N5Lmm5Lii5byD77yJXG4gICAgY29uc3QgbWVtRmxhZyA9IHd4LmdldFN0b3JhZ2VTeW5jKE1FTU9SWV9XT1JEU19LRVkpIGFzIHsgYm9va0lkOiBzdHJpbmc7IHdvcmRzOiBzdHJpbmdbXSB9IHwgJyc7XG4gICAgd3gucmVtb3ZlU3RvcmFnZVN5bmMoTUVNT1JZX1dPUkRTX0tFWSk7XG4gICAgaWYgKFxuICAgICAgbWVtRmxhZyAmJiB0eXBlb2YgbWVtRmxhZyA9PT0gJ29iamVjdCcgJiZcbiAgICAgIG1lbUZsYWcuYm9va0lkID09PSBnZXRDdXJyZW50Qm9va0lkKCkgJiZcbiAgICAgIEFycmF5LmlzQXJyYXkobWVtRmxhZy53b3JkcykgJiYgbWVtRmxhZy53b3Jkcy5sZW5ndGggPiAwXG4gICAgKSB7XG4gICAgICB0aGlzLl9tZW1vcnlXb3JkcyA9IG1lbUZsYWcud29yZHM7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX21lbW9yeVdvcmRzID0gbnVsbDtcbiAgICB9XG4gICAgLy8g6aaW6aG15Li75Yqo54K54oCc5a2m5paw6K+N4oCd77ya5by65Yi25byA5paw5LiA6L2u77yI5riF5o6J6YeN5bu65a6I5Y2r55qEIGtlee+8iVxuICAgIGlmICh3eC5nZXRTdG9yYWdlU3luYyhORVdfUk9VTkRfS0VZKSA9PT0gMSkge1xuICAgICAgd3gucmVtb3ZlU3RvcmFnZVN5bmMoTkVXX1JPVU5EX0tFWSk7XG4gICAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJztcbiAgICB9XG5cbiAgICAvLyDmtojotLnigJzku4rml6XlpI3nm5jigJ3lhaXlj6PmoIflv5fvvJrmnKzova7lj6rlpI3nm5jku4rlpKnlrabov4fnmoTor43vvIjkuIDmrKHmgKfvvIlcbiAgICBpZiAod3guZ2V0U3RvcmFnZVN5bmMoVE9EQVlfUkVWSUVXX0tFWSkgPT09IDEpIHtcbiAgICAgIHd4LnJlbW92ZVN0b3JhZ2VTeW5jKFRPREFZX1JFVklFV19LRVkpO1xuICAgICAgdGhpcy5fdG9kYXlSZXZpZXdNb2RlID0gdHJ1ZTtcbiAgICAgIHRoaXMuX2xvYWRlZEtleSA9ICcnO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLl90b2RheVJldmlld01vZGUgPSBmYWxzZTtcbiAgICB9XG5cbiAgICAvLyDpppbmrKHkvb/nlKjvvJrot7Povazor43kuabpgInmi6npobVcbiAgICBpZiAoIWhhc1NlbGVjdGVkQm9vaygpKSB7XG4gICAgICB3eC5uYXZpZ2F0ZVRvKHsgdXJsOiAnL3BhZ2VzL2Jvb2tsaXN0L2Jvb2tsaXN0JyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGN1cnJlbnRCb29rSWQ6IGdldEN1cnJlbnRCb29rSWQoKSxcbiAgICAgIHByYWN0aWNlTW9kZTogZ2V0UHJhY3RpY2VNb2RlKCksXG4gICAgICBtb2RlSW5kZXg6IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4JywgJ2xpc3QnXS5pbmRleE9mKGdldFByYWN0aWNlTW9kZSgpKSxcbiAgICAgIGFjY2VudDogZ2V0QWNjZW50KCksXG4gICAgICBvcmRlck1vZGU6IGdldE9yZGVyTW9kZSgpXG4gICAgICAvLyByZW1pbmRlclN1YnNjcmliZWQ6IGlzUmVtaW5kZXJTdWJzY3JpYmVkKCkgLy8g5a2m5Lmg5o+Q6YaS5bey5LiL57q/77yIMjAyNi0wOC0zMe+8iVxuICAgIH0pO1xuICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gIH0sXG5cbiAgb25VbmxvYWQoKSB7XG4gICAgLy8g6aG16Z2i5Y246L295pe25riF55CG6Z+z6aKR5LiK5LiL5paH77yI5aaC5p6c5pyJ77yJXG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICB9LFxuXG4gIGFzeW5jIGluaXRCYXRjaCgpIHtcbiAgICAvLyDku4rml6XlpI3nm5jova7vvJrpmJ/liJcgPSDku4rlpKnlrabov4fnmoTor43vvIjot6jor43kuabvvInvvIzkuI3otbDluLjop4TmjpLnqItcbiAgICBpZiAodGhpcy5fdG9kYXlSZXZpZXdNb2RlKSB7XG4gICAgICB0aGlzLl90b2RheVJldmlld01vZGUgPSBmYWxzZTtcbiAgICAgIGNvbnN0IG9rID0gYXdhaXQgdGhpcy5faW5pdFRvZGF5QmF0Y2goKTtcbiAgICAgIGlmICghb2spIGF3YWl0IHRoaXMuX2luaXROb3JtYWxCYXRjaCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICByZXR1cm4gdGhpcy5faW5pdE5vcm1hbEJhdGNoKCk7XG4gIH0sXG5cbiAgLy8g5LuK5pel5aSN55uY6L2u77ya5oqK5LuK5aSp5a2m6L+H55qE6K+N6YeN5Yi35LiA6YGN77yI5LiN6K6k6K+G55qE5o6S5YmN6Z2i77yM6buY6K6k5YiX6KGo5qih5byP77yJXG4gIGFzeW5jIF9pbml0VG9kYXlCYXRjaCgpOiBQcm9taXNlPGJvb2xlYW4+IHtcbiAgICBjb25zdCB0b2RheXMgPSBnZXRUb2RheUxlYXJuZWRXb3JkcygpO1xuICAgIGlmICh0b2RheXMubGVuZ3RoID09PSAwKSB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+S7iuWkqei/mOayoeacieWtpuS5oOiusOW9le+8jOWFiOWtpuWHoOS4quivjeWQpycsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgLy8g5oyJIGJvb2tJZCDliIbnu4Tmi4nor43kuabvvIzmmKDlsITlm57lrozmlbTor43mnaHvvIjmi7/ph4rkuYkv6Z+z5qCHL+ivjeague+8iVxuICAgIGNvbnN0IGJ5Qm9vayA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmdbXT4oKTtcbiAgICBmb3IgKGNvbnN0IHQgb2YgdG9kYXlzKSB7XG4gICAgICBjb25zdCBhcnIgPSBieUJvb2suZ2V0KHQuYm9va0lkKSB8fCBbXTtcbiAgICAgIGFyci5wdXNoKHQud29yZCk7XG4gICAgICBieUJvb2suc2V0KHQuYm9va0lkLCBhcnIpO1xuICAgIH1cbiAgICBjb25zdCBxdWV1ZTogV29yZEl0ZW1bXSA9IFtdO1xuICAgIGNvbnN0IGFsbFdvcmRzOiBXb3JkSXRlbVtdID0gW107XG4gICAgY29uc3QgdW5rbm93blNldCA9IG5ldyBTZXQoXG4gICAgICB0b2RheXMuZmlsdGVyKHQgPT4gIXQua25vd24pLm1hcCh0ID0+IHQud29yZC50b0xvd2VyQ2FzZSgpKVxuICAgICk7XG4gICAgZm9yIChjb25zdCBbYmlkLCB3b3Jkc10gb2YgYnlCb29rKSB7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBib29rID0gYXdhaXQgZ2V0Qm9va0J5SWQoYmlkKTtcbiAgICAgICAgaWYgKCFib29rKSBjb250aW51ZTtcbiAgICAgICAgYWxsV29yZHMucHVzaCguLi5ib29rLndvcmRzKTtcbiAgICAgICAgY29uc3Qgd3NldCA9IG5ldyBTZXQod29yZHMubWFwKHcgPT4gdy50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICAgIGZvciAoY29uc3QgdyBvZiBib29rLndvcmRzKSB7XG4gICAgICAgICAgaWYgKHdzZXQuaGFzKHcud29yZC50b0xvd2VyQ2FzZSgpKSkgcXVldWUucHVzaCh3KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdb5LuK5pel5aSN55uYXSDor43kuabliqDovb3lpLHotKUnLCBiaWQsIGUpO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAocXVldWUubGVuZ3RoID09PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgLy8g5LiN6K6k6K+G55qE5o6S5YmN6Z2i77yM562U5ryP55qE5LyY5YWI6KGlXG4gICAgcXVldWUuc29ydCgoYSwgYikgPT5cbiAgICAgICh1bmtub3duU2V0LmhhcyhiLndvcmQudG9Mb3dlckNhc2UoKSkgPyAxIDogMCkgLSAodW5rbm93blNldC5oYXMoYS53b3JkLnRvTG93ZXJDYXNlKCkpID8gMSA6IDApXG4gICAgKTtcblxuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgICB0aGlzLl9hbnN3ZXJlZFNldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIHRoaXMuX25ld1dvcmRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTsgLy8g5aSN55uY5LiN6K6h5YWl57Sv6K6h5paw6K+NXG4gICAgY29uc3QgcmVwb3J0ZWRNYXA6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge307XG4gICAgZm9yIChjb25zdCB3IG9mIHF1ZXVlKSB7XG4gICAgICBpZiAoaXNXb3JkUmVwb3J0ZWQody53b3JkKSkgcmVwb3J0ZWRNYXBbdy53b3JkXSA9IHRydWU7XG4gICAgfVxuICAgIGNvbnN0IHByb2dyZXNzU3RhdHMgPSBnZXRCb29rUHJvZ3Jlc3NTdGF0cyhnZXRDdXJyZW50Qm9va0lkKCkpO1xuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBib29rTmFtZTogJ+S7iuaXpeWkjeebmCcsXG4gICAgICBxdWV1ZSxcbiAgICAgIF93b3JkQm9va1dvcmRzOiBhbGxXb3JkcyxcbiAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAga25vd25Db3VudDogMCxcbiAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgIHRvdGFsQ291bnQ6IHF1ZXVlLmxlbmd0aCxcbiAgICAgIGR1ZUNvdW50OiBwcm9ncmVzc1N0YXRzLmR1ZUNvdW50LFxuICAgICAgbWFzdGVyZWRDb3VudDogcHJvZ3Jlc3NTdGF0cy5tYXN0ZXJlZENvdW50LFxuICAgICAgc3RhdHVzTGFiZWw6ICflpI3nm5gnLFxuICAgICAgaGFzTW9yZTogZmFsc2UsXG4gICAgICBsb2FkaW5nOiBmYWxzZSxcbiAgICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICBsaXN0QW5zd2VyZWQ6IHt9LFxuICAgICAgcmVwb3J0ZWRNYXBcbiAgICB9LCAoKSA9PiB7XG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHRydWU7XG4gIH0sXG5cbiAgYXN5bmMgX2luaXROb3JtYWxCYXRjaCgpIHtcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgY29uc3Qgc3R1ZHlNb2RlID0gZ2V0U3R1ZHlNb2RlKCk7XG4gICAgY29uc3QgcHJhY3RpY2VNb2RlID0gZ2V0UHJhY3RpY2VNb2RlKCk7XG4gICAgY29uc3QgYWNjZW50ID0gZ2V0QWNjZW50KCk7XG4gICAgY29uc3QgYmF0Y2hTaXplID0gZ2V0QmF0Y2hTaXplKCk7XG5cbiAgICAvLyDpobXpnaLlt7LmnInmlbDmja7kuJTor43kuaYv6K6+572u6YO95rKh5Y+Y5pe277yM6Lez6L+H6YeN5bu677yM6YG/5YWNIG9uU2hvdyDph43lpI3ov5vlhaXml7bmlbTpobXpl6rkuIDmrKFcIumHjeaWsOWKoOi9vVwiXG4gICAgY29uc3Qgb3JkZXJNb2RlID0gZ2V0T3JkZXJNb2RlKCk7XG4gICAgY29uc3Qgd29yZENsYXNzTGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBhbGw6ICflhajpg6gnLCBoaWdoRnJlcTogJ+mrmOmikeivjScsIGZ1bmM6ICfomZror40nLCBjb250ZW50OiAn5a6e6K+NJyB9O1xuICAgIGNvbnN0IHNldHRpbmdzS2V5ID0gW2Jvb2tJZCwgc3R1ZHlNb2RlLCBwcmFjdGljZU1vZGUsIGFjY2VudCwgYmF0Y2hTaXplLCBvcmRlck1vZGVdLmpvaW4oJ3wnKTtcbiAgICBpZiAoXG4gICAgICB0aGlzLmRhdGEucXVldWUubGVuZ3RoID4gMCAmJiAhdGhpcy5kYXRhLnNob3dSZXN1bHQgJiZcbiAgICAgICF0aGlzLl9yZXZpZXdNb2RlICYmICF0aGlzLl9tZW1vcnlXb3JkcyAmJlxuICAgICAgdGhpcy5fbG9hZGVkS2V5ID09PSBzZXR0aW5nc0tleVxuICAgICkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9sb2FkZWRLZXkgPSBzZXR0aW5nc0tleTtcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG5cbiAgICAvLyDpobXpnaLlt7LmnInlhoXlrrnvvIjmjaLkuaYv5byA5paw6L2u77yJ77ya5LiN6L+bIGxvYWRpbmcg5oCB77yM5L+d5oyB5pen5Y2h54mH5Y+v6KeB77yMXG4gICAgLy8g6Zif5YiX5bCx57uq5ZCO5LiA5qyh5oCn5pu/5o2i77yM5a6e546wXCLlubPnqLPmjaLova5cIuaXoOmXquWKqO+8m+S7hemmluasoei/m+WFpeaJjeaYvuekuuWKoOi9veWKqOeUu1xuICAgIGlmICh0aGlzLmRhdGEucXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBsb2FkaW5nOiB0cnVlLCBzdHVkeU1vZGUsIHByYWN0aWNlTW9kZSwgYWNjZW50LCBiYXRjaFNpemUsIG9yZGVyTW9kZSwgd29yZENsYXNzTGFiZWw6IHdvcmRDbGFzc0xhYmVsc1tzdHVkeU1vZGVdIHx8ICflhajpg6gnIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBzdHVkeU1vZGUsIHByYWN0aWNlTW9kZSwgYWNjZW50LCBiYXRjaFNpemUsIG9yZGVyTW9kZSwgd29yZENsYXNzTGFiZWw6IHdvcmRDbGFzc0xhYmVsc1tzdHVkeU1vZGVdIHx8ICflhajpg6gnIH0pO1xuICAgIH1cblxuICAgIGxldCBib29rO1xuICAgIHRyeSB7XG4gICAgICBib29rID0gYXdhaXQgZ2V0Qm9va0J5SWQoYm9va0lkKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCfojrflj5bor43kuablpLHotKUnLCBlKTtcbiAgICB9XG5cbiAgICBpZiAoIWJvb2sgfHwgIWJvb2sud29yZHMgfHwgYm9vay53b3Jkcy5sZW5ndGggPT09IDApIHtcbiAgICAgIC8vIOS6keerr+aLieWPluWksei0pe+8jOWwneivleacrOWcsOenjeWtkOivjeW6k+WFnOW6lVxuICAgICAgY29uc3QgbG9jYWxCb29rID0gbG9jYWxCb29rcy5maW5kKGIgPT4gYi5pZCA9PT0gYm9va0lkKTtcbiAgICAgIGlmIChsb2NhbEJvb2sgJiYgbG9jYWxCb29rLndvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYm9vayA9IGxvY2FsQm9vaztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7IGxvYWRpbmc6IGZhbHNlLCBxdWV1ZTogW10gfSk7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6K+N5bqT5Yqg6L295Lit77yM6ams5LiK5bCx5aW9JywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g5aSN5LmgL+iusOW/huS9k+ajgOaooeW8j+e7lei/h+ivjeaAp+etm+mAie+8muW+heWkjeS5oOeahOivjeS4jeivpeiiq+KAnOiMg+WbtDromZror43igJ3nrYnov4fmu6TmjonvvIxcbiAgICAvLyDlkKbliJnorqHliJLph4wgNDMg5Liq5b6F5aSN5Lmg6K+NIOKIqSDomZror40gPSAwIOaXtuS8muWHuueOsOKAnOivjeS5puW3suWFqOmDqOaOjOaPoeKAneeahOWBh+ixoVxuICAgIGNvbnN0IGJ5cGFzc0ZpbHRlciA9IHRoaXMuX3Jldmlld01vZGUgfHwgISF0aGlzLl9tZW1vcnlXb3JkcztcblxuICAgIC8vIOagueaNruWtpuS5oOiMg+WbtOetm+mAie+8iOWFqOmDqC/pq5jpopEv6Jma6K+NL+Wunuivje+8iVxuICAgIGNvbnN0IGhpZ2hGcmVxQ291bnQgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcuaXNIaWdoRnJlcSkubGVuZ3RoO1xuICAgIGNvbnN0IGZ1bmNDb3VudCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgPT09ICdmdW5jJykubGVuZ3RoO1xuICAgIGNvbnN0IGNvbnRlbnRDb3VudCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgIT09ICdmdW5jJykubGVuZ3RoO1xuICAgIGxldCB3b3JkTGlzdDogV29yZEl0ZW1bXTtcbiAgICBsZXQgZW1wdHlUaXAgPSAnJztcbiAgICBpZiAoYnlwYXNzRmlsdGVyKSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHM7XG4gICAgfSBlbHNlIGlmIChzdHVkeU1vZGUgPT09ICdoaWdoRnJlcScpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LmlzSGlnaEZyZXEpO1xuICAgICAgZW1wdHlUaXAgPSAn6L+Z5pys6K+N5Lmm5rKh5pyJ5qCH5rOo6auY6aKR6K+NJztcbiAgICB9IGVsc2UgaWYgKHN0dWR5TW9kZSA9PT0gJ2Z1bmMnKSB7XG4gICAgICB3b3JkTGlzdCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5wb3NUYWcgPT09ICdmdW5jJyk7XG4gICAgICAvLyDor43mnaHlrozlhajmsqHmnIkgcG9zVGFnIOWtl+autSA9IOivjeS5puaVsOaNruaYr+aXp+eJiO+8iOS6keerr+acquabtOaWsC/otbDkuobnp43lrZDlhZzlupUv57yT5a2Y5pyq5aSx5pWI77yJXG4gICAgICBpZiAoIWJvb2sud29yZHMuc29tZSh3ID0+ICdwb3NUYWcnIGluIHcpKSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+ivjeS5puaVsOaNruacquWMheWQq+ivjeaAp+agh+azqO+8jOivt+abtOaWsOivjeW6k+WQjumHjeivlSc7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBlbXB0eVRpcCA9ICfov5nmnKzor43kuabmmoLml6DomZror43moIfms6gnO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAoc3R1ZHlNb2RlID09PSAnY29udGVudCcpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyAhPT0gJ2Z1bmMnKTtcbiAgICAgIGlmICghYm9vay53b3Jkcy5zb21lKHcgPT4gJ3Bvc1RhZycgaW4gdykpIHtcbiAgICAgICAgZW1wdHlUaXAgPSAn6K+N5Lmm5pWw5o2u5pyq5YyF5ZCr6K+N5oCn5qCH5rOo77yM6K+35pu05paw6K+N5bqT5ZCO6YeN6K+VJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+i/meacrOivjeS5puaaguaXoOWunuivjeagh+azqCc7XG4gICAgICB9XG4gICAgfSBlbHNlIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3JkcztcbiAgICB9XG5cbiAgICBpZiAod29yZExpc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBsb2FkaW5nOiBmYWxzZSwgcXVldWU6IFtdLCBoaWdoRnJlcUNvdW50LCBmdW5jQ291bnQsIGNvbnRlbnRDb3VudCB9KTtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBlbXB0eVRpcCwgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGNvbnN0IGFsbFByb2dyZXNzID0gZ2V0QWxsUHJvZ3Jlc3MoYm9va0lkKTtcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuXG4gICAgLy8g5p6E5bu65a2m5Lmg6Zif5YiX77yaXG4gICAgLy8gMS4g5LyY5YWI5Y+W5b6F5aSN5Lmg55qE6K+N77yIbmV4dFJldmlldyA8PSBub3cg5LiU5LiN5pivIG1hc3RlcmVk77yJXG4gICAgLy8gMi4g5Y+W5pyq5a2m6L+H55qE5paw6K+NXG4gICAgY29uc3QgZHVlV29yZHM6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCBuZXdXb3JkczogV29yZEl0ZW1bXSA9IFtdO1xuXG4gICAgZm9yIChjb25zdCB3IG9mIHdvcmRMaXN0KSB7XG4gICAgICBjb25zdCBwID0gYWxsUHJvZ3Jlc3Nbdy53b3JkXTtcbiAgICAgIGlmICghcCkge1xuICAgICAgICBuZXdXb3Jkcy5wdXNoKHcpO1xuICAgICAgfSBlbHNlIGlmIChwLnN0YXR1cyAhPT0gJ21hc3RlcmVkJyAmJiBwLm5leHRSZXZpZXcgPiAwICYmIHAubmV4dFJldmlldyA8PSBub3cpIHtcbiAgICAgICAgZHVlV29yZHMucHVzaCh3KTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDogIPpopHmjpLluo/vvJrmlrDor43mjIkgRUNESUNUIOivjemikemZjeW6j++8iOW4uOingeivjeWFiOWtpu+8ie+8jOS8mOWFiOWtpuS8muiAg+ivlemHjOWHuueOsOacgOWkmueahOivjVxuICAgIG5ld1dvcmRzLnNvcnQoKGEsIGIpID0+IChiLmZyZXF1ZW5jeSB8fCAwKSAtIChhLmZyZXF1ZW5jeSB8fCAwKSk7XG5cbiAgICAvLyDlkIjlubbpmJ/liJfvvJrpu5jorqTkvJjlhYjlpI3kuaDvvIzlho3lrabmlrDor43vvJvlpI3kuaDmqKHlvI/kuIvku4XlpI3kuaDliLDmnJ/lvoXlpI3kuaDor41cbiAgICAvLyDpmo/mnLrmqKHlvI/kuIvvvJrmlrDor43ku47or43kuablhajpg6jmnKrlrabor43kuK3pmo/mnLrmir3lj5bvvIjogIzkuI3mmK/mjInor43popHlj5bliY0gTiDkuKrvvIxcbiAgICAvLyDpgb/lhY3ov57nu63lh6Dova7pgYfliLDnmoTpg73mmK/lkIzkuIDmibnor43vvInvvIzlpI3kuaDor43ku43kvJjlhYjljaDkvY1cbiAgICBsZXQgcXVldWU7XG4gICAgaWYgKHRoaXMuX3Jldmlld01vZGUpIHtcbiAgICAgIGlmIChkdWVXb3Jkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgLy8g5rKh5pyJ5Yiw5pyf5b6F5aSN5Lmg6K+N77ya5YiH5Zue5bi46KeE5a2m5Lmg77yM6YG/5YWN56m66L2uXG4gICAgICAgIHRoaXMuX3Jldmlld01vZGUgPSBmYWxzZTtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7Llhajpg6jlpI3kuaDlrozvvIzliIflm57luLjop4TlrabkuaAnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICAgIHF1ZXVlID0gWy4uLmR1ZVdvcmRzLCAuLi5uZXdXb3Jkc10uc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHF1ZXVlID0gZHVlV29yZHMuc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICAgIH1cbiAgICB9IGVsc2UgaWYgKG9yZGVyTW9kZSA9PT0gJ3JhbmRvbScpIHtcbiAgICAgIC8vIOWkjeS5oOivjeWQjOagt+S7juWFqOmDqOWIsOacn+ivjeS4remaj+acuuaKveWPlu+8iOiAjOS4jeaYr+aMieivjeihqOmhuuW6j+WPluWJjSBOIOS4qu+8iVxuICAgICAgY29uc3QgZHVlOiBXb3JkSXRlbVtdID0gW107XG4gICAgICBpZiAoZHVlV29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBjb25zdCBwb29sID0gWy4uLmR1ZVdvcmRzXTtcbiAgICAgICAgY29uc3QgdGFrZSA9IE1hdGgubWluKGJhdGNoU2l6ZSwgcG9vbC5sZW5ndGgpO1xuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRha2U7IGkrKykge1xuICAgICAgICAgIGNvbnN0IGogPSBpICsgTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKHBvb2wubGVuZ3RoIC0gaSkpO1xuICAgICAgICAgIGNvbnN0IHQgPSBwb29sW2ldOyBwb29sW2ldID0gcG9vbFtqXTsgcG9vbFtqXSA9IHQ7XG4gICAgICAgICAgZHVlLnB1c2gocG9vbFtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGNvbnN0IHJlbWFpbmluZyA9IGJhdGNoU2l6ZSAtIGR1ZS5sZW5ndGg7XG4gICAgICBjb25zdCBzYW1wbGVkTmV3OiBXb3JkSXRlbVtdID0gW107XG4gICAgICBpZiAocmVtYWluaW5nID4gMCAmJiBuZXdXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHBvb2wgPSBbLi4ubmV3V29yZHNdO1xuICAgICAgICBjb25zdCB0YWtlID0gTWF0aC5taW4ocmVtYWluaW5nLCBwb29sLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGFrZTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgaiA9IGkgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAocG9vbC5sZW5ndGggLSBpKSk7XG4gICAgICAgICAgY29uc3QgdCA9IHBvb2xbaV07IHBvb2xbaV0gPSBwb29sW2pdOyBwb29sW2pdID0gdDtcbiAgICAgICAgICBzYW1wbGVkTmV3LnB1c2gocG9vbFtpXSk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIHF1ZXVlID0gWy4uLmR1ZSwgLi4uc2FtcGxlZE5ld107XG4gICAgfSBlbHNlIHtcbiAgICAgIHF1ZXVlID0gWy4uLmR1ZVdvcmRzLCAuLi5uZXdXb3Jkc10uc2xpY2UoMCwgYmF0Y2hTaXplKTtcbiAgICB9XG5cbiAgICAvLyDlpoLmnpzpmJ/liJfkuLrnqbrvvIjmsqHmnInlvoXlpI3kuaDkuZ/msqHmnInmlrDor43vvInvvIzlj5blt7Lmjozmj6HnmoTor43lpI3kuaBcbiAgICBsZXQgZmluYWxRdWV1ZSA9IHF1ZXVlO1xuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIGNvbnN0IG1hc3RlcmVkV29yZHMgPSB3b3JkTGlzdC5maWx0ZXIoKHcpID0+IHtcbiAgICAgICAgY29uc3QgcCA9IGFsbFByb2dyZXNzW3cud29yZF07XG4gICAgICAgIHJldHVybiBwICYmIHAuc3RhdHVzID09PSAnbWFzdGVyZWQnO1xuICAgICAgfSk7XG4gICAgICBmaW5hbFF1ZXVlID0gbWFzdGVyZWRXb3Jkcy5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgIH1cblxuICAgIC8vIOKUgOKUgOKUgCDorrDlv4bkvZPmo4Dpq5jljbHor43ova7mrKHvvJropobnm5bpmJ/liJfkuLrkvZPmo4DmuIXljZXvvIjkv53mjIHkvZPmo4Dph4znmoTljbHpmanpobrluo/vvIzmnIDljbHpmanlnKjliY3vvIkg4pSA4pSA4pSAXG4gICAgLy8g55So5YWo6YeP6K+N6KGo5Yy56YWN77yI5LiN6LWwIHN0dWR5TW9kZSDpq5jpopHov4fmu6TvvIzlkKbliJnmuIXljZXor43lj6/og73lhajlhpvopobmsqHogIzpnZnpu5jlm57pgIDmiJDluLjop4Tova7mrKHvvIlcbiAgICBsZXQgbWVtQWN0aXZlID0gZmFsc2U7XG4gICAgaWYgKHRoaXMuX21lbW9yeVdvcmRzICYmICh0aGlzLl9tZW1vcnlXb3JkcyBhcyBzdHJpbmdbXSkubGVuZ3RoID4gMCkge1xuICAgICAgY29uc3QgbWVtTGVuID0gKHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKS5sZW5ndGg7XG4gICAgICBjb25zdCBtZW1TZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICAgIGZvciAoY29uc3QgdyBvZiB0aGlzLl9tZW1vcnlXb3JkcyBhcyBzdHJpbmdbXSkgbWVtU2V0LmFkZCh3LnRvTG93ZXJDYXNlKCkpO1xuICAgICAgY29uc3QgbWF0Y2hlZCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gbWVtU2V0Lmhhcyh3LndvcmQudG9Mb3dlckNhc2UoKSkpO1xuICAgICAgaWYgKG1hdGNoZWQubGVuZ3RoID4gMCkge1xuICAgICAgICBmaW5hbFF1ZXVlID0gKHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKVxuICAgICAgICAgIC5tYXAoKHc6IHN0cmluZykgPT4gbWF0Y2hlZC5maW5kKChtOiBXb3JkSXRlbSkgPT4gbS53b3JkLnRvTG93ZXJDYXNlKCkgPT09IHcudG9Mb3dlckNhc2UoKSkpXG4gICAgICAgICAgLmZpbHRlcigoeDogV29yZEl0ZW0gfCB1bmRlZmluZWQpOiB4IGlzIFdvcmRJdGVtID0+ICEheCk7XG4gICAgICAgIG1lbUFjdGl2ZSA9IHRydWU7XG4gICAgICAgIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA8IG1lbUxlbikge1xuICAgICAgICAgIC8vIOa4heWNlemHjOacieivjeS4jeWcqOW9k+WJjeivjeihqO+8iOWmguivjeW6k+abtOaWsOi/h++8ie+8muWmguWunuaPkOekuu+8jOe8uuWkseeahOS4jeihpeWIq+eahOivjVxuICAgICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBg5riF5Y2V5LitICR7bWVtTGVuIC0gZmluYWxRdWV1ZS5sZW5ndGh9IOS4quivjeS4jeWcqOivjeS5pu+8jOW3sui3s+i/h2AsIGljb246ICdub25lJyB9KTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8g5YWo6YOo5Yy56YWN5LiN5LiK77yI5p6B5bCR6KeB77yJ77ya5LiN6Z2Z6buY5Zue6YCA77yM5piO56Gu5ZGK55+lXG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6L+Z5Yeg5Liq6K+N5LiN5Zyo5b2T5YmN6K+N5Lmm6YeM77yM5bey5YiH5Zue5bi46KeE5a2m5LmgJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfVxuICAgICAgdGhpcy5fbWVtb3J5V29yZHMgPSBudWxsOyAvLyDkuIDmrKHmgKfvvIznlKjlkI7ljbPlvINcbiAgICB9XG5cbiAgICAvLyDlh7rpopjpobrluo/vvJrpmo/mnLrmqKHlvI/miZPkubHpmJ/liJfvvIjlpI3kuaDkvJjlhYgv5bep5Zu66Zif5YiX5Zyo57uE5YaF5omT5Lmx77yM5LiN5pS55Y+Y5LyY5YWI57qn77ybXG4gICAgLy8g6K6w5b+G5L2T5qOA6L2u5L+d5oyB5Y2x6Zmp6aG65bqP5LiN5Lmx5bqP77yJXG4gICAgaWYgKG9yZGVyTW9kZSA9PT0gJ3JhbmRvbScgJiYgIW1lbUFjdGl2ZSAmJiBmaW5hbFF1ZXVlLmxlbmd0aCA+IDEpIHtcbiAgICAgIGZvciAobGV0IGkgPSBmaW5hbFF1ZXVlLmxlbmd0aCAtIDE7IGkgPiAwOyBpLS0pIHtcbiAgICAgICAgY29uc3QgaiA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChpICsgMSkpO1xuICAgICAgICBjb25zdCB0ID0gZmluYWxRdWV1ZVtpXTtcbiAgICAgICAgZmluYWxRdWV1ZVtpXSA9IGZpbmFsUXVldWVbal07XG4gICAgICAgIGZpbmFsUXVldWVbal0gPSB0O1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOiusOW9leacrOi9ruWTquS6m+aYr+mmluasoeWtpuS5oOeahOaWsOivje+8iOWkjeS5oC/lt6nlm7rkuI3orqHlhaXigJzntK/orqHljZXor43igJ3vvIlcbiAgICB0aGlzLl9uZXdXb3JkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgZm9yIChjb25zdCB3IG9mIGZpbmFsUXVldWUpIHtcbiAgICAgIGlmIChuZXdXb3Jkcy5pbmRleE9mKHcpID4gLTEpIHRoaXMuX25ld1dvcmRTZXQuYWRkKHcud29yZC50b0xvd2VyQ2FzZSgpKTtcbiAgICB9XG5cbiAgICAvLyDlt7LkuIrmiqXor43moIforrDvvIjljaHniYfog4zpnaLmmL7npLrjgIzlt7LkuIrmiqXjgI3vvIlcbiAgICBjb25zdCByZXBvcnRlZE1hcDogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgZmluYWxRdWV1ZSkge1xuICAgICAgaWYgKGlzV29yZFJlcG9ydGVkKHcud29yZCkpIHJlcG9ydGVkTWFwW3cud29yZF0gPSB0cnVlO1xuICAgIH1cblxuICAgIGNvbnN0IHByb2dyZXNzU3RhdHMgPSBnZXRCb29rUHJvZ3Jlc3NTdGF0cyhib29rSWQpO1xuXG4gICAgLy8g5paw5LiA6L2u5byA5aeL77yM5riF56m65bey5L2c562U5qCH6K6w77yI5L+u5aSN5YiH5qih5byP5ZCO5ZCM5LiA6K+N6YeN5aSN6K6h5pWw55qEIGJ1Z++8iVxuICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG5cbiAgICAvLyDnirbmgIHmoIfnrb7mjInmnKzova7pmJ/liJflrp7pmYXmnoTmiJDliKTlrprvvJrlhajpg6jkuLrliLDmnJ/or43miY3mmK/jgIzlpI3kuaDjgI3vvIxcbiAgICAvLyDmt7flhaXmlrDor43vvIjlpI3kuaDor43kvJjlhYjljaDkvY0r5paw6K+N6KGl6b2Q77yJ5pe25qCH44CM5paw6K+N44CN77yM6YG/5YWNIDEg5Liq5aSN5Lmg6K+NKzkg5Liq5paw6K+N6K+v5qCH5oiQ5aSN5LmgXG4gICAgY29uc3QgZHVlV29yZFNldCA9IG5ldyBTZXQoZHVlV29yZHMubWFwKHcgPT4gdy53b3JkKSk7XG4gICAgY29uc3QgZHVlSW5RdWV1ZSA9IGZpbmFsUXVldWUuZmlsdGVyKHcgPT4gZHVlV29yZFNldC5oYXMody53b3JkKSkubGVuZ3RoO1xuICAgIGxldCBzdGF0dXNMYWJlbCA9ICfmlrDor40nO1xuICAgIGlmIChtZW1BY3RpdmUpIHtcbiAgICAgIHN0YXR1c0xhYmVsID0gJ+mrmOWNseivjSc7XG4gICAgfSBlbHNlIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA+IDAgJiYgZHVlSW5RdWV1ZSA9PT0gZmluYWxRdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHN0YXR1c0xhYmVsID0gJ+WkjeS5oCc7XG4gICAgfSBlbHNlIGlmIChkdWVJblF1ZXVlID09PSAwICYmIGR1ZVdvcmRzLmxlbmd0aCA9PT0gMCAmJiBuZXdXb3Jkcy5sZW5ndGggPT09IDAgJiYgZmluYWxRdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICBzdGF0dXNMYWJlbCA9ICflt6nlm7onO1xuICAgIH1cblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBib29rTmFtZTogYm9vay5uYW1lLFxuICAgICAgYm9va1RvdGFsOiB3b3JkTGlzdC5sZW5ndGgsXG4gICAgICBoaWdoRnJlcUNvdW50LFxuICAgICAgZnVuY0NvdW50LFxuICAgICAgY29udGVudENvdW50LFxuICAgICAgcXVldWU6IGZpbmFsUXVldWUsXG4gICAgICBfd29yZEJvb2tXb3Jkczogd29yZExpc3QsXG4gICAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgICBzaG93TWVhbmluZzogZmFsc2UsXG4gICAgICBpc0ZsaXBwZWQ6IGZhbHNlLFxuICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgIGtub3duQ291bnQ6IDAsXG4gICAgICB1bmtub3duQ291bnQ6IDAsXG4gICAgICB0b3RhbENvdW50OiBmaW5hbFF1ZXVlLmxlbmd0aCxcbiAgICAgIGR1ZUNvdW50OiBwcm9ncmVzc1N0YXRzLmR1ZUNvdW50LFxuICAgICAgbWFzdGVyZWRDb3VudDogcHJvZ3Jlc3NTdGF0cy5tYXN0ZXJlZENvdW50LFxuICAgICAgc3RhdHVzTGFiZWwsXG4gICAgICBoYXNNb3JlOiBmaW5hbFF1ZXVlLmxlbmd0aCA+PSBiYXRjaFNpemUsXG4gICAgICBsb2FkaW5nOiBmYWxzZSxcbiAgICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICBsaXN0QW5zd2VyZWQ6IHt9LFxuICAgICAgcmVwb3J0ZWRNYXBcbiAgICB9LCAoKSA9PiB7XG4gICAgICBpZiAoZmluYWxRdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICAgICAgLy8g6aKE5Yqg6L2956ys5LqM5Liq6K+N77yM57+76aG15pe256eS5Ye65aOwXG4gICAgICAgIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA+IDEpIHtcbiAgICAgICAgICBwcmVsb2FkQXVkaW8oZmluYWxRdWV1ZVsxXS53b3JkLCBhY2NlbnQpO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5b2T5YmN6K+N5piv5ZCm5bey5L2c562U6L+H77yI6Ziy5YiH5qih5byP5ZCO6YeN5aSN6K6h5pWw77yJXG4gIF9jaGVja0Fuc3dlcmVkKCk6IGJvb2xlYW4ge1xuICAgIGlmICh0aGlzLl9hbnN3ZXJlZFNldC5oYXModGhpcy5kYXRhLmN1cnJlbnRJbmRleCkpIHJldHVybiB0cnVlO1xuICAgIHRoaXMuX2Fuc3dlcmVkU2V0LmFkZCh0aGlzLmRhdGEuY3VycmVudEluZGV4KTtcbiAgICByZXR1cm4gZmFsc2U7XG4gIH0sXG5cblxuXG4gIC8vIOWIh+aNouivjeS5pu+8mui/m+WFpeivjeS5pumAieaLqemhte+8iOaOqOiNkOWNoSArIOiAg+ivlS/mlZnmnZDliIbnu4TliJfooajvvIlcbiAgY2hhbmdlQm9vaygpIHtcbiAgICB3eC5uYXZpZ2F0ZVRvKHsgdXJsOiAnL3BhZ2VzL2Jvb2tsaXN0L2Jvb2tsaXN0JyB9KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5Y2h54mH57+76Z2i5qih5byPIOKUgOKUgOKUgFxuICAvLyDmvKvmuLjor43ml4/vvJrluKbnnYDlvZPliY3or43ot7PovazliLDor43moLnmmJ/ns7tcbiAgZ29HYWxheHkoKSB7XG4gICAgY29uc3QgdyA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAoIXcpIHJldHVybjtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogYC9wYWdlcy9nYWxheHkvZ2FsYXh5P3dvcmQ9JHtlbmNvZGVVUklDb21wb25lbnQody53b3JkKX1gXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOe6oOmUmeS4iuaKpSDilIDilIDilIBcbiAgb3BlblJlcG9ydCgpIHtcbiAgICBjb25zdCB3ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghdykgcmV0dXJuO1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXBvcnQ6IHRydWUsIHJlcG9ydFR5cGU6ICcnLCByZXBvcnREZXNjOiAnJyB9KTtcbiAgfSxcblxuICBjbG9zZVJlcG9ydCgpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVwb3J0OiBmYWxzZSB9KTtcbiAgfSxcblxuICBvblJlcG9ydFR5cGUoZTogYW55KSB7XG4gICAgdGhpcy5zZXREYXRhKHsgcmVwb3J0VHlwZTogZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQudHlwZSBhcyBSZXBvcnRUeXBlIH0pO1xuICB9LFxuXG4gIG9uUmVwb3J0RGVzYyhlOiBhbnkpIHtcbiAgICB0aGlzLnNldERhdGEoeyByZXBvcnREZXNjOiBlLmRldGFpbC52YWx1ZSB9KTtcbiAgfSxcblxuICBzdWJtaXRSZXBvcnQoKSB7XG4gICAgY29uc3QgdyA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAoIXcpIHJldHVybjtcbiAgICBpZiAoIXRoaXMuZGF0YS5yZXBvcnRUeXBlKSB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+ivt+WFiOmAieaLqemXrumimOexu+WeiycsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlcG9ydFdvcmQody53b3JkLCBib29rSWQsIHRoaXMuZGF0YS5yZXBvcnRUeXBlIGFzIFJlcG9ydFR5cGUsIHRoaXMuZGF0YS5yZXBvcnREZXNjKS50aGVuKChyKSA9PiB7XG4gICAgICBpZiAoci5hbHJlYWR5KSB7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6L+Z5Liq6Zeu6aKY5bey5pyJ5Lq65oql6L+H5ZWmJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfSBlbHNlIGlmIChyLm9rKSB7XG4gICAgICAgIGNvbnN0IHJlcG9ydGVkTWFwID0geyAuLi50aGlzLmRhdGEucmVwb3J0ZWRNYXAsIFt3LndvcmRdOiB0cnVlIH07XG4gICAgICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXBvcnQ6IGZhbHNlLCByZXBvcnRlZE1hcCB9KTtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7Llj5fnkIbvvIzmhJ/osKLlhbHlu7rvvIEnLCBpY29uOiAnc3VjY2VzcycgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+aPkOS6pOWksei0pe+8jOivt+ajgOafpee9kee7nCcsIGljb246ICdub25lJyB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBmbGlwQ2FyZCgpIHtcbiAgICAvLyDjgIzkuI3orqTor4bjgI3mj63npLrnrZTmoYjlkI7kuZ/lhYHorrjoh6rnlLHnv7vpnaLvvIjlj6/nv7vlm57mraPpnaLlho3nnIvljZXor43vvInvvIzmtYHnqIvnlLHjgIzkuIvkuIDkuKrjgI3mjInpkq7mjqjov5tcbiAgICBjb25zdCBmbGlwcGVkID0gIXRoaXMuZGF0YS5pc0ZsaXBwZWQ7XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGlzRmxpcHBlZDogZmxpcHBlZCxcbiAgICAgIHNob3dNZWFuaW5nOiBmbGlwcGVkXG4gICAgfSk7XG4gICAgLy8g57+75Yiw6IOM6Z2i5pe26Ieq5Yqo5pKt5pS+5Y+R6Z+z77yM5bm26aKE5Yqg6L295LiL5LiA5Liq6K+NXG4gICAgaWYgKGZsaXBwZWQpIHtcbiAgICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgICBjb25zdCBuZXh0ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXggKyAxXTtcbiAgICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICAgIGlmIChuZXh0KSBwcmVsb2FkQXVkaW8obmV4dC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICB9XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWPkemfsyDilIDilIDilIBcbiAgb25QbGF5QXVkaW8oKSB7XG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gIH0sXG5cbiAgLy8g5YiH5o2i5Y+j6Z+zXG4gIG9uVG9nZ2xlQWNjZW50KCkge1xuICAgIGNvbnN0IG5ld0FjY2VudDogQWNjZW50ID0gdGhpcy5kYXRhLmFjY2VudCA9PT0gJ3VzJyA/ICd1aycgOiAndXMnO1xuICAgIHNldEFjY2VudChuZXdBY2NlbnQpO1xuICAgIHRoaXMuc2V0RGF0YSh7IGFjY2VudDogbmV3QWNjZW50IH0pO1xuICAgIHd4LnNob3dUb2FzdCh7XG4gICAgICB0aXRsZTogbmV3QWNjZW50ID09PSAndWsnID8gJ+iLsemfs+aooeW8jycgOiAn576O6Z+z5qih5byPJyxcbiAgICAgIGljb246ICdub25lJ1xuICAgIH0pO1xuICAgIC8vIOWIh+aNouWQjueri+WNs+aSreaUvuW9k+WJjeivjVxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIG5ld0FjY2VudCk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWHuumimOaWueW8j+W6lOeUqO+8iOWQq+a3t+WQiOaooeW8j+maj+acuuaYoOWwhO+8iSDilIDilIDilIBcbiAgLy8g5Li65b2T5YmN6K+N56Gu5a6a5a6e6ZmF5Ye66aKY5pa55byP5bm26YeN572u562U6aKY54q25oCB77yb5Y2h54mH5qih5byP5L+d55WZ57+76Z2i5bu257ut77yI6YeK5LmJ6Z2i5pyd5LiK5YiH6K+N77yJXG4gIF9hcHBseU1vZGVGb3JDdXJyZW50KCkge1xuICAgIGNvbnN0IG1vZGUgPSB0b0NvbmNyZXRlTW9kZSh0aGlzLmRhdGEucHJhY3RpY2VNb2RlKTtcbiAgICBjb25zdCBrZWVwRmxpcCA9IHRoaXMuZGF0YS5pc0ZsaXBwZWQgJiYgdGhpcy5kYXRhLnByYWN0aWNlTW9kZSA9PT0gJ2NhcmQnO1xuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgLy8g5YiH6K+N6KGl5LiA5qyh55yf5a6e57+76Z2i77ya5YWI55+t5pqC5Zue5q2j6Z2i77yM5LiL5LiA5bin5YaN57+75Zue6YeK5LmJ6Z2i77yMXG4gICAgLy8g5raI6Zmk4oCc5o2i6K+N5pe25Y2h54mH5YOP5rKh57+76L+H5p2l4oCd55qE5Zuw5oOR77yI5L+d55WZ5YiH6K+N5L+d5oyB6YeK5LmJ6Z2i55qE6K6+6K6h77yJXG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpOyAvLyDliIfmqKHlvI8v5YiH6K+N5pe25Y+W5raI4oCc5LiN6K6k6K+G6Ieq5Yqo6Lez4oCd5a6a5pe25Zmo77yM6Ziy6Lez6K+N56ue5oCBXG4gICAgY29uc3QgZmxpcEJhc2UgPSBrZWVwRmxpcCA/IHsgaXNGbGlwcGVkOiBmYWxzZSwgc2hvd01lYW5pbmc6IGZhbHNlIH0gOiB7fTtcbiAgICBjb25zdCBmbGlwQmFjayA9ICgpID0+IHtcbiAgICAgIGlmICgha2VlcEZsaXApIHJldHVybjtcbiAgICAgIHd4Lm5leHRUaWNrKCgpID0+IHtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgaXNGbGlwcGVkOiB0cnVlLCBzaG93TWVhbmluZzogdHJ1ZSB9KTtcbiAgICAgIH0pO1xuICAgIH07XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGFjdGl2ZU1vZGU6IG1vZGUsXG4gICAgICAuLi5mbGlwQmFzZSxcbiAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMVxuICAgIH0sICgpID0+IHtcbiAgICAgIGZsaXBCYWNrKCk7XG4gICAgICBpZiAoIXdvcmQpIHJldHVybjtcbiAgICAgIGlmIChtb2RlID09PSAnY2hvaWNlJykge1xuICAgICAgICB0aGlzLmdlbmVyYXRlQ2hvaWNlT3B0aW9ucyh3b3JkKTtcbiAgICAgIH0gZWxzZSBpZiAobW9kZSA9PT0gJ2NhcmQnKSB7XG4gICAgICAgIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlm5vpgInkuIDmqKHlvI8g4pSA4pSA4pSAXG4gIC8vIOeUn+aIkOWbm+mAieS4gOmAiemhue+8iOe7meWNleivjemAiemHiuS5ie+8iVxuICBnZW5lcmF0ZUNob2ljZU9wdGlvbnMoY3VycmVudFdvcmQ6IFdvcmRJdGVtKSB7XG4gICAgY29uc3QgYWxsV29yZHMgPSB0aGlzLmRhdGEuX3dvcmRCb29rV29yZHM7XG4gICAgaWYgKGFsbFdvcmRzLmxlbmd0aCA8IDQpIHtcbiAgICAgIC8vIOivjeS5puivjeaVsOS4jeWknyA0IOS4qu+8jOaXoOazleWHuuW5suaJsOmhue+8jOmZjee6p+S4uuWNoeeJh+WHuumimFxuICAgICAgdGhpcy5zZXREYXRhKHsgYWN0aXZlTW9kZTogJ2NhcmQnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIC8vIOS7juivjeS5pumaj+acuuWPliAzIOS4quW5suaJsOmhuVxuICAgIGNvbnN0IGRpc3RyYWN0b3JzOiBXb3JkSXRlbVtdID0gW107XG4gICAgY29uc3QgdXNlZCA9IG5ldyBTZXQoW2N1cnJlbnRXb3JkLndvcmRdKTtcbiAgICBsZXQgYXR0ZW1wdHMgPSAwO1xuICAgIHdoaWxlIChkaXN0cmFjdG9ycy5sZW5ndGggPCAzICYmIGF0dGVtcHRzIDwgMTAwKSB7XG4gICAgICBjb25zdCBpZHggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhbGxXb3Jkcy5sZW5ndGgpO1xuICAgICAgY29uc3QgdyA9IGFsbFdvcmRzW2lkeF07XG4gICAgICBpZiAoIXVzZWQuaGFzKHcud29yZCkgJiYgdy5tZWFuaW5nICE9PSBjdXJyZW50V29yZC5tZWFuaW5nKSB7XG4gICAgICAgIGRpc3RyYWN0b3JzLnB1c2godyk7XG4gICAgICAgIHVzZWQuYWRkKHcud29yZCk7XG4gICAgICB9XG4gICAgICBhdHRlbXB0cysrO1xuICAgIH1cblxuICAgIC8vIOe7hOWQiCArIOmaj+acuuaJk+S5sVxuICAgIGNvbnN0IG9wdGlvbnM6IENob2ljZU9wdGlvbltdID0gW1xuICAgICAgeyBtZWFuaW5nOiBjdXJyZW50V29yZC5tZWFuaW5nLCBpc0NvcnJlY3Q6IHRydWUgfSxcbiAgICAgIC4uLmRpc3RyYWN0b3JzLm1hcChkID0+ICh7IG1lYW5pbmc6IGQubWVhbmluZywgaXNDb3JyZWN0OiBmYWxzZSB9KSlcbiAgICBdLnNvcnQoKCkgPT4gTWF0aC5yYW5kb20oKSAtIDAuNSk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgY2hvaWNlT3B0aW9uczogb3B0aW9ucyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIGNob2ljZUNvcnJlY3Q6IGZhbHNlXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5Zub6YCJ5LiA77ya54K55Ye76YCJ6aG5XG4gIG9uQ2hvaWNlU2VsZWN0KGU6IGFueSkge1xuICAgIGlmICh0aGlzLmRhdGEuY2hvaWNlU2VsZWN0ZWQgIT09IC0xKSByZXR1cm47IC8vIOW3sumAiei/h1xuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG5cbiAgICBjb25zdCBpZHggPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC5pZHggYXMgbnVtYmVyO1xuICAgIGNvbnN0IG9wdGlvbiA9IHRoaXMuZGF0YS5jaG9pY2VPcHRpb25zW2lkeF07XG4gICAgY29uc3QgaXNDb3JyZWN0ID0gb3B0aW9uLmlzQ29ycmVjdDtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjaG9pY2VTZWxlY3RlZDogaWR4LFxuICAgICAgY2hvaWNlQ29ycmVjdDogaXNDb3JyZWN0XG4gICAgfSk7XG5cbiAgICAvLyDmkq3mlL7ljZXor43lj5Hpn7NcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcblxuICAgIC8vIOiusOW9lei/m+W6plxuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGlzQ29ycmVjdCk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGlmICghaXNDb3JyZWN0KSB7XG4gICAgICBhZGRUb1dyb25nQm9vayh3b3JkLndvcmQsIHdvcmQubWVhbmluZywgYm9va0lkKTtcbiAgICB9XG5cbiAgICBpZiAoaXNDb3JyZWN0KSB7XG4gICAgICB0aGlzLnNldERhdGEoeyBrbm93bkNvdW50OiB0aGlzLmRhdGEua25vd25Db3VudCArIDEgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHVua25vd25Db3VudDogdGhpcy5kYXRhLnVua25vd25Db3VudCArIDEgfSk7XG4gICAgfVxuXG4gICAgLy8g562U5a+55YGcIDEg56eS77yb562U6ZSZ5YGcIDIuNSDnp5LvvIznlZnml7bpl7TnnIvmuIXmraPnoa7nrZTmoYhcbiAgICBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgICB9LCBpc0NvcnJlY3QgPyAxMDAwIDogMjUwMCk7XG4gIH0sXG5cbiAgLy8g5Zub6YCJ5LiA77ya54K544CM5LiN6K6k6K+G44CN77yI5LiN54yc5LqG77yM55u05o6l5o+t56S65q2j56Gu562U5qGI77yM5oyJ562U6ZSZ6K6w5b2V77yJXG4gIG9uQ2hvaWNlRG9udEtub3coKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jaG9pY2VTZWxlY3RlZCAhPT0gLTEpIHJldHVybjsgLy8g5bey5L2c562UL+W3suaPreekulxuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG5cbiAgICAvLyBjaG9pY2VTZWxlY3RlZCDnva7kuLogLTLvvJrkuI3lkb3kuK3ku7vkvZXpgInpobnvvIjkuI3moIfnuqLplJnor6/pobnvvInvvIzkvYbop6blj5HmraPnoa7pobnpq5jkuq5cbiAgICB0aGlzLnNldERhdGEoeyBjaG9pY2VTZWxlY3RlZDogLTIsIGNob2ljZUNvcnJlY3Q6IGZhbHNlIH0pO1xuXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG5cbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCBmYWxzZSk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuXG4gICAgdGhpcy5zZXREYXRhKHsgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSB9KTtcblxuICAgIC8vIOS4jeiHquWKqOi3s+i9rO+8muWxleekuuato+ehruetlOahiOWQjuWHuuOAjOS4i+S4gOS4quOAjeaMiemSru+8jOe7meeUqOaIt+aXtumXtOiusOS9j+i/meS4quivjVxuICB9LFxuXG4gIC8vIOmAieaLqeaooeW8j+OAjOS4jeiupOivhuOAjeaPreekuuetlOahiOWQju+8jOeCueOAjOS4i+S4gOS4quOAjee7p+e7rVxuICBvbkNob2ljZU5leHQoKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jaG9pY2VTZWxlY3RlZCAhPT0gLTIpIHJldHVybjsgLy8g5LuF6ZmQ44CM5LiN6K6k6K+G44CN5o+t56S654q25oCBXG4gICAgdGhpcy5zZXREYXRhKHsgY2hvaWNlU2VsZWN0ZWQ6IC0xIH0pO1xuICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5ou85YaZ5qih5byPIOKUgOKUgOKUgFxuICBvblNwZWxsSW5wdXQoZTogYW55KSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc3BlbGxJbnB1dDogZS5kZXRhaWwudmFsdWUgfSk7XG4gIH0sXG5cbiAgb25TcGVsbFN1Ym1pdCgpIHtcbiAgICBjb25zdCBpbnB1dCA9IHRoaXMuZGF0YS5zcGVsbElucHV0LnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICghaW5wdXQpIHJldHVybjtcblxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKCF3b3JkKSByZXR1cm47XG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcblxuXG4gICAgY29uc3QgaXNDb3JyZWN0ID0gaW5wdXQgPT09IHdvcmQud29yZC50b0xvd2VyQ2FzZSgpO1xuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHNwZWxsRmVlZGJhY2s6IGlzQ29ycmVjdCA/ICdjb3JyZWN0JyA6ICd3cm9uZydcbiAgICB9KTtcblxuICAgIC8vIOaSreaUvuWPkemfs1xuICAgIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuXG4gICAgLy8g6K6w5b2V6L+b5bqmXG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgaXNDb3JyZWN0KTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgaWYgKCFpc0NvcnJlY3QpIHtcbiAgICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuICAgIH1cblxuICAgIGlmIChpc0NvcnJlY3QpIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGtub3duQ291bnQ6IHRoaXMuZGF0YS5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXREYXRhKHsgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9XG5cbiAgICAvLyDmi7zlr7nlgZwgMS4yIOenku+8m+aLvOmUmeWBnCAzIOenku+8jOeVmeaXtumXtOiusOS9j+ato+ehruaLvOWGmVxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5uZXh0V29yZCgpO1xuICAgIH0sIGlzQ29ycmVjdCA/IDEyMDAgOiAzMDAwKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg57uD5Lmg5qih5byP5YiH5o2i77yI5YiH5o2i5LiN5o2i6K+N5LiN6Lez6K+N77yM5b2T5YmN6K+N5oyJ5paw5pa55byP6YeN5paw5Ye66aKY77yJIOKUgOKUgOKUgFxuICAvLyDpgInmqKHlvI/vvIjlvLnmoYbvvIlcbiAgb25Nb2RlVGFwKCkge1xuICAgIGNvbnN0IG1vZGVzOiBQcmFjdGljZU1vZGVbXSA9IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4JywgJ2xpc3QnXTtcbiAgICBjb25zdCBsYWJlbHMgPSB0aGlzLmRhdGEubW9kZUxhYmVscztcbiAgICB3eC5zaG93QWN0aW9uU2hlZXQoe1xuICAgICAgaXRlbUxpc3Q6IGxhYmVscyxcbiAgICAgIHN1Y2Nlc3M6IChyZXM6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBpZHggPSByZXMudGFwSW5kZXg7XG4gICAgICAgIGNvbnN0IG1vZGUgPSBtb2Rlc1tpZHhdIGFzIFByYWN0aWNlTW9kZTtcbiAgICAgICAgaWYgKCFtb2RlIHx8IG1vZGUgPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpIHJldHVybjtcbiAgICAgICAgc2V0UHJhY3RpY2VNb2RlKG1vZGUpO1xuICAgICAgICB0aGlzLnNldERhdGEoeyBwcmFjdGljZU1vZGU6IG1vZGUsIG1vZGVJbmRleDogaWR4IH0pO1xuICAgICAgICBpZiAodGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgICAgIH1cbiAgICAgICAgY29uc3QgZnVsbDogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHsgY2FyZDogJ+WNoeeJh+aooeW8jycsIGNob2ljZTogJ+mAieaLqeaooeW8jycsIHNwZWxsOiAn5ou85YaZ5qih5byPJywgbWl4OiAn5re35ZCI5qih5byPJywgbGlzdDogJ+WIl+ihqOaooeW8jycgfTtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6IGZ1bGxbbW9kZV0gfHwgJycsIGljb246ICdub25lJyB9KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICBvblByYWN0aWNlTW9kZUNoYW5nZShlOiBhbnkpIHtcbiAgICBjb25zdCBtb2RlID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQubW9kZSBhcyBQcmFjdGljZU1vZGU7XG4gICAgaWYgKG1vZGUgPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpIHJldHVybjtcblxuICAgIHNldFByYWN0aWNlTW9kZShtb2RlKTtcbiAgICB0aGlzLnNldERhdGEoeyBwcmFjdGljZU1vZGU6IG1vZGUgfSk7XG4gICAgaWYgKHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgfVxuXG4gICAgY29uc3QgbGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBjYXJkOiAn5Y2h54mH5qih5byPJywgY2hvaWNlOiAn6YCJ5oup5qih5byPJywgc3BlbGw6ICfmi7zlhpnmqKHlvI8nLCBtaXg6ICfmt7flkIjmqKHlvI8nLCBsaXN0OiAn5YiX6KGo5qih5byPJyB9O1xuICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBsYWJlbHNbbW9kZV0gfHwgJycsIGljb246ICdub25lJyB9KTtcbiAgfSxcblxuICAvLyDliIfmjaLlh7rpopjpobrluo/vvIjpmo/mnLogLyDpobrluo/vvIlcbiAgb25Ub2dnbGVPcmRlck1vZGUoKSB7XG4gICAgY29uc3QgbmV3TW9kZSA9IHRoaXMuZGF0YS5vcmRlck1vZGUgPT09ICdyYW5kb20nID8gJ3NlcXVlbnRpYWwnIDogJ3JhbmRvbSc7XG4gICAgc2V0T3JkZXJNb2RlKG5ld01vZGUpO1xuICAgIHd4LnNob3dUb2FzdCh7XG4gICAgICB0aXRsZTogbmV3TW9kZSA9PT0gJ3JhbmRvbScgPyAn5bey5YiH5o2i6ZqP5py65Ye66K+NJyA6ICflt7LliIfmjaLpobrluo/lh7ror40nLFxuICAgICAgaWNvbjogJ25vbmUnXG4gICAgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICAvLyDlvZPliY3or43mmK/lkKbkuLrpppbmrKHlrabkuaDnmoTmlrDor43vvIjku4XmlrDor43orqHlhaXigJzntK/orqHljZXor43igJ3vvIlcbiAgX2lzTmV3V29yZCh3b3JkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLl9uZXdXb3JkU2V0ICYmIHRoaXMuX25ld1dvcmRTZXQuaGFzKHdvcmQudG9Mb3dlckNhc2UoKSk7XG4gIH0sXG5cbiAgLy8g6K6+572u5q+P6L2u5a2m5Lmg5Y2V6K+N5pWw77yI6aG26YOo5oyJ6ZKu77yJXG4gIG9uQ2hhbmdlQmF0Y2hTaXplKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSBbNSwgMTAsIDE1LCAyMF07XG4gICAgd3guc2hvd0FjdGlvblNoZWV0KHtcbiAgICAgIGl0ZW1MaXN0OiBvcHRpb25zLm1hcChuID0+IG4gKyAnIOS4qi/ova4nKSxcbiAgICAgIHN1Y2Nlc3M6IChyZXM6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBuID0gb3B0aW9uc1tyZXMudGFwSW5kZXhdO1xuICAgICAgICBpZiAoIW4gfHwgbiA9PT0gdGhpcy5kYXRhLmJhdGNoU2l6ZSkgcmV0dXJuO1xuICAgICAgICBzZXRCYXRjaFNpemUobik7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5q+P6L2uICcgKyBuICsgJyDkuKrljZXor40nLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5YiH5o2i5a2m5Lmg6IyD5Zu077yI5YWo6YOoL+mrmOmikS/omZror40v5a6e6K+N77yJXG4gIFdPUkRfQ0xBU1NfTEFCRUxTOiB7IGFsbDogJ+WFqOmDqCcsIGhpZ2hGcmVxOiAn6auY6aKR6K+NJywgZnVuYzogJ+iZmuivjScsIGNvbnRlbnQ6ICflrp7or40nIH0gYXMgUmVjb3JkPHN0cmluZywgc3RyaW5nPixcblxuICBvblNlbGVjdFdvcmRDbGFzcygpIHtcbiAgICBjb25zdCBtb2RlczogU3R1ZHlNb2RlW10gPSBbJ2FsbCcsICdoaWdoRnJlcScsICdmdW5jJywgJ2NvbnRlbnQnXTtcbiAgICBjb25zdCBsYWJlbHMgPSBtb2Rlcy5tYXAobSA9PiB0aGlzLldPUkRfQ0xBU1NfTEFCRUxTW21dKTtcbiAgICB3eC5zaG93QWN0aW9uU2hlZXQoe1xuICAgICAgaXRlbUxpc3Q6IGxhYmVscyxcbiAgICAgIHN1Y2Nlc3M6IChyZXM6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBuZXdNb2RlID0gbW9kZXNbcmVzLnRhcEluZGV4XTtcbiAgICAgICAgaWYgKCFuZXdNb2RlIHx8IG5ld01vZGUgPT09IHRoaXMuZGF0YS5zdHVkeU1vZGUpIHJldHVybjtcbiAgICAgICAgc2V0U3R1ZHlNb2RlKG5ld01vZGUpO1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suWIh+aNouS4uuOAjCcgKyB0aGlzLldPUkRfQ0xBU1NfTEFCRUxTW25ld01vZGVdICsgJ+OAjScsIGljb246ICdub25lJyB9KTtcbiAgICAgICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvLyDlhbzlrrnml6flhaXlj6NcbiAgdG9nZ2xlU3R1ZHlNb2RlKCkge1xuICAgIHRoaXMub25TZWxlY3RXb3JkQ2xhc3MoKTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5a+85Ye65LuK5pel5Y2V6K+N6KGoIOKUgOKUgOKUgFxuICBfdG9kYXlSb3dzOiBudWxsIGFzIFRvZGF5Um93W10gfCBudWxsLFxuXG4gIG9uRXhwb3J0VG9kYXkoKSB7XG4gICAgd3guc2hvd0xvYWRpbmcoeyB0aXRsZTogJ+aVtOeQhuWNleivjeS4rS4uLicgfSk7XG4gICAgY29sbGVjdFRvZGF5Um93cygpLnRoZW4oKHJvd3MpID0+IHtcbiAgICAgIHd4LmhpZGVMb2FkaW5nKCk7XG4gICAgICB0aGlzLl90b2RheVJvd3MgPSByb3dzO1xuICAgICAgc2hvd0V4cG9ydFNoZWV0KHJvd3MsICgpID0+IHRoaXMuX2dldEV4cG9ydENhbnZhcygpKTtcbiAgICB9KS5jYXRjaCgoKSA9PiB7XG4gICAgICB3eC5oaWRlTG9hZGluZygpO1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfmlbTnkIblpLHotKXvvIzor7fph43or5UnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgX2dldEV4cG9ydENhbnZhcygpOiBQcm9taXNlPGFueT4ge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICB3eC5jcmVhdGVTZWxlY3RvclF1ZXJ5KCkuaW4odGhpcylcbiAgICAgICAgLnNlbGVjdCgnI2V4cG9ydENhbnZhcycpXG4gICAgICAgIC5maWVsZHMoeyBub2RlOiB0cnVlIH0pXG4gICAgICAgIC5leGVjKChyZXM6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChyZXMgJiYgcmVzWzBdICYmIHJlc1swXS5ub2RlKSByZXNvbHZlKHJlc1swXS5ub2RlKTtcbiAgICAgICAgICBlbHNlIHJlamVjdChuZXcgRXJyb3IoJ2NhbnZhcyDmnKrlsLHnu6onKSk7XG4gICAgICAgIH0pO1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDljaHniYfmqKHlvI/orqTor4Yv5LiN6K6k6K+GIOKUgOKUgOKUgFxuICBtYXJrS25vd24oKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jdXJyZW50SW5kZXggPj0gdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCB0cnVlKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAga25vd25Db3VudDogdGhpcy5kYXRhLmtub3duQ291bnQgKyAxXG4gICAgfSk7XG4gICAgdGhpcy5uZXh0V29yZCgpO1xuICB9LFxuXG4gIG1hcmtVbmtub3duKCkge1xuICAgIGlmICh0aGlzLmRhdGEuY3VycmVudEluZGV4ID49IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGgpIHJldHVybjtcbiAgICBpZiAodGhpcy5kYXRhLnJldmVhbEFmdGVyVW5rbm93bikgcmV0dXJuOyAvLyDlt7Lmj63npLrvvIznrYnlvoXnlKjmiLfngrnjgIzkuIvkuIDkuKrjgI1cbiAgICBpZiAodGhpcy5fY2hlY2tBbnN3ZXJlZCgpKSByZXR1cm47IC8vIOWIh+aooeW8j+WQjuWQjOS4gOivjeS4jemHjeWkjeiuoeaVsFxuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgZmFsc2UpO1xuICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3b3JkLndvcmQpKTtcbiAgICBhZGRUb1dyb25nQm9vayh3b3JkLndvcmQsIHdvcmQubWVhbmluZywgYm9va0lkKTtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICB1bmtub3duQ291bnQ6IHRoaXMuZGF0YS51bmtub3duQ291bnQgKyAxLFxuICAgICAgLy8g5LiN6K6k6K+G77ya5YWI57+76Z2i5bGV56S66YeK5LmJ77yI5b2T5Zy655yL5Yiw5q2j56Gu562U5qGI77yJ77yMMi41IOenkuWQjuiHquWKqOi/m+WFpeS4i+S4gOS4quivjVxuICAgICAgLy8g77yI5Lmf5L+d55WZ44CM5LiL5LiA5Liq44CN5oyJ6ZKu77yM55So5oi35Y+v5o+Q5YmN54K56LWw77yJXG4gICAgICByZXZlYWxBZnRlclVua25vd246IHRydWUsXG4gICAgICBpc0ZsaXBwZWQ6IHRydWUsXG4gICAgICBzaG93TWVhbmluZzogdHJ1ZVxuICAgIH0pO1xuICAgIC8vIOiHquWKqOaSreaUvuWPkemfs++8jOWKoOa3seiusOW/hlxuICAgIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgIC8vIOiHquWKqOi3s+S4i+S4gOS4qu+8muWxleekuumHiuS5ieWQjuWBnCAyLjUg56eS77yb5pyf6Ze054K544CM5LiL5LiA5Liq44CN5Lya5Y+W5raI5a6a5pe25ZmoXG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgIHRoaXMuX3JldmVhbFRpbWVyID0gc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLl9yZXZlYWxUaW1lciA9IG51bGw7XG4gICAgICBpZiAodGhpcy5kYXRhLnJldmVhbEFmdGVyVW5rbm93bikgdGhpcy5vblJldmVhbE5leHQoKTtcbiAgICB9LCAyNTAwKTtcbiAgfSxcblxuICBfcmV2ZWFsVGltZXI6IG51bGwgYXMgYW55LFxuXG4gIF9jbGVhclJldmVhbFRpbWVyKCkge1xuICAgIGlmICh0aGlzLl9yZXZlYWxUaW1lcikge1xuICAgICAgY2xlYXJUaW1lb3V0KHRoaXMuX3JldmVhbFRpbWVyKTtcbiAgICAgIHRoaXMuX3JldmVhbFRpbWVyID0gbnVsbDtcbiAgICB9XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWIl+ihqOW5s+mTuuaooeW8jyDilIDilIDilIBcbiAgLy8g54K55Y2V6K+N6KGM77ya5Y+R5aOwXG4gIG9uTGlzdFRhcChlOiBhbnkpIHtcbiAgICBjb25zdCBpZHggPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC5pZHggYXMgbnVtYmVyO1xuICAgIGNvbnN0IHcgPSB0aGlzLmRhdGEucXVldWVbaWR4XTtcbiAgICBpZiAodykgcGxheUF1ZGlvKHcud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gIH0sXG5cbiAgLy8g5YiX6KGo5qih5byP77ya6K6k6K+GL+S4jeiupOivhu+8iOWkjeeUqOWNoeeJh+aooeW8j+eahOi/m+W6puiusOW9lemTvui3r++8iVxuICBvbkxpc3RBbnN3ZXIoZTogYW55KSB7XG4gICAgY29uc3QgaWR4ID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQuaWR4IGFzIG51bWJlcjtcbiAgICBjb25zdCBrbm93biA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0Lmtub3duID09PSAnMSc7XG4gICAgaWYgKHRoaXMuZGF0YS5xdWV1ZVtpZHhdID09IG51bGwpIHJldHVybjtcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW2lkeF07XG4gICAgaWYgKHRoaXMuZGF0YS5saXN0QW5zd2VyZWRbd29yZC53b3JkXSkgcmV0dXJuOyAvLyDlt7LkvZznrZRcbiAgICBpZiAodGhpcy5fYW5zd2VyZWRTZXQuaGFzKGlkeCkpIHJldHVybjsgLy8g6Ziy6YeN5aSN6K6h5pWwXG4gICAgdGhpcy5fYW5zd2VyZWRTZXQuYWRkKGlkeCk7XG5cbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCBrbm93bik7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGlmICgha25vd24pIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuXG4gICAgY29uc3QgbGlzdEFuc3dlcmVkID0geyAuLi50aGlzLmRhdGEubGlzdEFuc3dlcmVkLCBbd29yZC53b3JkXToga25vd24gPyAna25vd24nIDogJ3Vua25vd24nIH07XG4gICAgY29uc3Qga25vd25Db3VudCA9IHRoaXMuZGF0YS5rbm93bkNvdW50ICsgKGtub3duID8gMSA6IDApO1xuICAgIGNvbnN0IHVua25vd25Db3VudCA9IHRoaXMuZGF0YS51bmtub3duQ291bnQgKyAoa25vd24gPyAwIDogMSk7XG4gICAgdGhpcy5zZXREYXRhKHsgbGlzdEFuc3dlcmVkLCBrbm93bkNvdW50LCB1bmtub3duQ291bnQgfSk7XG5cbiAgICAvLyDlhajpg6jnrZTlrowg4oaSIOe7k+eul+acrOi9rlxuICAgIGlmIChrbm93bkNvdW50ICsgdW5rbm93bkNvdW50ID49IHRoaXMuZGF0YS50b3RhbENvdW50KSB7XG4gICAgICBzZXRUaW1lb3V0KCgpID0+IHRoaXMuZmluaXNoUm91bmQoKSwgNDAwKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8g44CM5LiN6K6k6K+G44CN5o+t56S6562U5qGI5ZCO77yM54K544CM5LiL5LiA5Liq44CN57un57utXG4gIG9uUmV2ZWFsTmV4dCgpIHtcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG4gICAgdGhpcy5zZXREYXRhKHsgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSwgaXNGbGlwcGVkOiBmYWxzZSwgc2hvd01lYW5pbmc6IGZhbHNlIH0pO1xuICAgIHRoaXMubmV4dFdvcmQoKTtcbiAgfSxcblxuICBuZXh0V29yZCgpIHtcbiAgICAvLyDpmLLlvqHvvJrpmJ/liJflvILluLjvvIjnqbrpmJ/liJcv5LiL5qCH6LaK55WM77yJ5pe255u05o6l6YeN5byA5LiA6L2u77yM6YG/5YWN55m95bGP5Y2h5q27XG4gICAgaWYgKCF0aGlzLmRhdGEucXVldWUgfHwgdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgY29uc3QgbmV4dCA9IHRoaXMuZGF0YS5jdXJyZW50SW5kZXggKyAxO1xuICAgIGlmIChuZXh0ID49IHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGgpIHtcbiAgICAgIHRoaXMuZmluaXNoUm91bmQoKTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGN1cnJlbnRJbmRleDogbmV4dFxuICAgIH0sICgpID0+IHtcbiAgICAgIC8vIOS4uuaWsOivjeehruWumuWHuumimOaWueW8j++8iG1peCDmqKHlvI/kuIvmr4/kuKror43pmo/mnLrljaHniYcv6YCJ5oupL+aLvOWGme+8ie+8jOW5tumHjee9ruetlOmimOeKtuaAgVxuICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgLy8g6aKE5Yqg6L295LiL5LiL5Liq6K+NXG4gICAgICBjb25zdCBhZnRlck5leHQgPSB0aGlzLmRhdGEucXVldWVbbmV4dCArIDFdO1xuICAgICAgaWYgKGFmdGVyTmV4dCkgcHJlbG9hZEF1ZGlvKGFmdGVyTmV4dC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgICB9KTtcbiAgfSxcblxuICBmaW5pc2hSb3VuZCgpIHtcbiAgICAvLyDmnKzova7lt7Lnu5PmnZ/vvJrmuIXmjonph43lu7rlrojljavnmoQga2V577yM56Gu5L+d5LiL5qyh6L+b5YWl6aG16Z2i77yI5LuO6aaW6aG154K54oCc6IOM5Y2V6K+N4oCdL+WIhyB0YWIg5Zue5p2l77yJXG4gICAgLy8g5LiN5Lya5ZG95Lit4oCc5pWw5o2u5pyq5Y+Y6Lez6L+H6YeN5bu64oCd6ICM5Y2h5Zyo5pyA5ZCO5LiA5Liq6K+N77yI5q2k5pe2IF9hbnN3ZXJlZFNldCDlt7Lmu6HvvIzmjInpkq7lhajml6Dlj43lupTvvIlcbiAgICB0aGlzLl9sb2FkZWRLZXkgPSAnJztcbiAgICBjb25zdCB0b3RhbCA9IHRoaXMuZGF0YS50b3RhbENvdW50O1xuICAgIGNvbnN0IGtub3duID0gdGhpcy5kYXRhLmtub3duQ291bnQ7XG4gICAgY29uc3QgcmF0ZSA9IHRvdGFsID4gMCA/IE1hdGgucm91bmQoKGtub3duIC8gdG90YWwpICogMTAwKSA6IDA7XG4gICAgbGV0IHByYWlzZSA9ICfnu6fnu63liqDmsrnvvIEnO1xuICAgIGlmIChyYXRlID49IDkwKSBwcmFpc2UgPSAn5aSq5qOS5LqG77yM5Yeg5LmO5YWo6YOo5o6M5o+h77yBJztcbiAgICBlbHNlIGlmIChyYXRlID49IDcwKSBwcmFpc2UgPSAn5LiN6ZSZ5ZOm77yM57un57ut5L+d5oyB77yBJztcbiAgICBlbHNlIGlmIChyYXRlID49IDUwKSBwcmFpc2UgPSAn6L+Y6ZyA5aSa5aSN5Lmg5Yeg6YGNJztcblxuICAgIC8vIOiusOS9j+acrOi9rumYn+WIl++8jOS+m+OAjOWkjeS5oOacrOi9ruOAjeWOn+agt+mHjeWIt++8iOS4jeaNouivje+8iVxuICAgIHRoaXMuX2xhc3RSb3VuZFF1ZXVlID0gdGhpcy5kYXRhLnF1ZXVlLnNsaWNlKCk7XG5cbiAgICAvLyDlkIzmraXlrabkuaDmlbDmja7liLDkupHnq69cbiAgICB0aGlzLnN5bmNUb0Nsb3VkKCk7XG5cbiAgICAvLyDmmL7npLrlhajlsY/nu5PmnpzpobVcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgc2hvd1Jlc3VsdDogdHJ1ZSxcbiAgICAgIHJlc3VsdFJhdGU6IHJhdGUsXG4gICAgICByZXN1bHRQcmFpc2U6IHByYWlzZVxuICAgICAgLy8gcmVtaW5kZXJTdWJzY3JpYmVkOiBpc1JlbWluZGVyU3Vic2NyaWJlZCgpIC8vIOWtpuS5oOaPkOmGkuW3suS4i+e6v++8iDIwMjYtMDgtMzHvvIlcbiAgICB9KTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrlvIDlkK/lrabkuaDmj5DphpLvvIjlt7LkuIvnur8gMjAyNi0wOC0zMe+8muS4gOasoeaAp+iuoumYhemcgOmHjeWkjeaOiOadg++8jOS9k+mqjOe5geeQkO+8iVxuICAvLyBvblN1YnNjcmliZVJlbWluZGVyKCkge1xuICAvLyAgIGlmIChpc1JlbWluZGVyU3Vic2NyaWJlZCgpKSByZXR1cm47XG4gIC8vICAgcmVxdWVzdFJlbWluZGVyU3Vic2NyaWJlKCkudGhlbigoYWNjZXB0ZWQpID0+IHtcbiAgLy8gICAgIHRoaXMuc2V0RGF0YSh7IHJlbWluZGVyU3Vic2NyaWJlZDogYWNjZXB0ZWQgfSk7XG4gIC8vICAgICBpZiAoYWNjZXB0ZWQpIHtcbiAgLy8gICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7LlvIDlkK/lrabkuaDmj5DphpInLCBpY29uOiAnc3VjY2VzcycgfSk7XG4gIC8vICAgICB9XG4gIC8vICAgfSk7XG4gIC8vIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5YaN5p2l5LiA6L2uXG4gIG9uUmVzdWx0UmVzdGFydCgpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiBmYWxzZSB9KTtcbiAgICB0aGlzLmluaXRCYXRjaCgpO1xuICB9LFxuXG4gIC8vIOe7k+aenOmhte+8muWkjeS5oOacrOi9ru+8iOeUqOWImuiAg+WujOeahOWOn+mYn+WIl+mHjeWIt+S4gOmBje+8jOS4jeiuoeWFpee0r+iuoeaWsOivje+8iVxuICBfbGFzdFJvdW5kUXVldWU6IFtdIGFzIFdvcmRJdGVtW10sXG5cbiAgb25SZXN1bHRSZXZpZXdSb3VuZCgpIHtcbiAgICBjb25zdCBsYXN0ID0gdGhpcy5fbGFzdFJvdW5kUXVldWU7XG4gICAgaWYgKCFsYXN0IHx8IGxhc3QubGVuZ3RoID09PSAwKSB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+acrOi9rumYn+WIl+W3suS4jeWcqO+8jOivleivleWGjeadpeS4gOi9ricsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgIHRoaXMuX2xvYWRlZEtleSA9ICcnOyAvLyDnu5Xov4figJzmlbDmja7mnKrlj5jot7Pov4fph43lu7rigJ3lrojljatcbiAgICB0aGlzLl9hbnN3ZXJlZFNldCA9IG5ldyBTZXQ8bnVtYmVyPigpO1xuICAgIC8vIOWkjeS5oOi9ruS4jeiuoeWFpee0r+iuoeaWsOivje+8mua4heepuuaWsOivjembhuWQiO+8iF9pc05ld1dvcmQg6L+U5ZueIGZhbHNl77yJXG4gICAgdGhpcy5fbmV3V29yZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGNvbnN0IHJlcG9ydGVkTWFwOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHt9O1xuICAgIGZvciAoY29uc3QgdyBvZiBsYXN0KSB7XG4gICAgICBpZiAoaXNXb3JkUmVwb3J0ZWQody53b3JkKSkgcmVwb3J0ZWRNYXBbdy53b3JkXSA9IHRydWU7XG4gICAgfVxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBzaG93UmVzdWx0OiBmYWxzZSxcbiAgICAgIHF1ZXVlOiBsYXN0LFxuICAgICAgX3dvcmRCb29rV29yZHM6IHRoaXMuZGF0YS5fd29yZEJvb2tXb3JkcyxcbiAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAga25vd25Db3VudDogMCxcbiAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgIHRvdGFsQ291bnQ6IGxhc3QubGVuZ3RoLFxuICAgICAgc3RhdHVzTGFiZWw6ICflpI3kuaAnLFxuICAgICAgbGlzdEFuc3dlcmVkOiB7fSxcbiAgICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgcmVwb3J0ZWRNYXBcbiAgICB9LCAoKSA9PiB7XG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g57uT5p6c6aG177ya6L+U5ZueXG4gIG9uUmVzdWx0QmFjaygpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiBmYWxzZSB9KTtcbiAgICB3eC5zd2l0Y2hUYWIoeyB1cmw6ICcvcGFnZXMvaW5kZXgvaW5kZXgnIH0pO1xuICB9LFxuXG4gIC8vIOe7k+aenOmhte+8muWIhuS6q+aJk+WNoea1t+aKpVxuICBvblNoYXJlUG9zdGVyKCkge1xuICAgIC8vIOiusOW9leKAnOS7jua1t+aKpemhtei/lOWbnuaXtuS4jemHjeW8gOaWsOS4gOi9ruKAne+8jOW5tuiusOS9j+i/lOWbnuWQjuaYr+WQpuimgeaBouWkjee7k+aenOmhtVxuICAgIHRoaXMuX3NraXBJbml0T25TaG93ID0gdHJ1ZTtcbiAgICB0aGlzLl9yZXN0b3JlUmVzdWx0T25TaG93ID0gdGhpcy5kYXRhLnNob3dSZXN1bHQ7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1Jlc3VsdDogZmFsc2UgfSk7XG4gICAgd3gubmF2aWdhdGVUbyh7XG4gICAgICB1cmw6IGAvcGFnZXMvcG9zdGVyL3Bvc3Rlcj9yYXRlPSR7dGhpcy5kYXRhLnJlc3VsdFJhdGV9YFxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOWQjOatpeWtpuS5oOe7n+iuoeWIsOS6keerr++8iOe7jyBzeW5jVXNlciDkupHlh73mlbDvvJrmnI3liqHnq6/lkIjlubblj5bovoPlpKflgLzvvIzpmLLljoblj7LooqvlhrLlsI/vvIlcbiAgc3luY1RvQ2xvdWQoKSB7XG4gICAgc3luY1N0YXRzVG9DbG91ZChnZXRTdGF0cygpKTtcbiAgfSxcblxuICAvLyDovazlj5Hnu5nlpb3lj4tcbiAgb25TaGFyZUFwcE1lc3NhZ2UoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiAn5oiR5Zyo55So6K+N5qC56K6w5b+G5rOV6IOM5Y2V6K+N77yM5LiA6LW35p2l77yBJyxcbiAgICAgIHBhdGg6ICcvcGFnZXMvaW5kZXgvaW5kZXgnXG4gICAgfTtcbiAgfSxcblxuICAvLyDliIbkuqvliLDmnIvlj4vlnIjvvIjljZXpobXmqKHlvI/vvIlcbiAgb25TaGFyZVRpbWVsaW5lKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogJ+aIkeWcqOeUqOivjeagueiusOW/huazleiDjOWNleivje+8jOS4gOi1t+adpe+8gSdcbiAgICB9O1xuICB9LFxufSk7XG4iXX0=