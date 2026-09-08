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
            const modes = ['card', 'choice', 'spell', 'mix', 'list'];
            const mode = modes[idx];
            if (!mode || mode === this.data.practiceMode)
                return;
            (0, store_1.setPracticeMode)(mode);
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
        const modes = ['card', 'choice', 'spell', 'mix', 'list'];
        this._openSheet('mode', '出题模式', modes.map((m, i) => ({ label: this.data.modeLabels[i], active: m === this.data.practiceMode })));
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
        this._openSheet('batch', '每轮个数', options.map(n => ({ label: n + ' 个/轮', active: n === this.data.batchSize })));
    },
    WORD_CLASS_LABELS: { all: '全部', highFreq: '高频词', func: '虚词', content: '实词' },
    onSelectWordClass() {
        const modes = ['all', 'highFreq', 'func', 'content'];
        this._openSheet('scope', '学习范围', modes.map(m => ({ label: this.WORD_CLASS_LABELS[m], active: m === this.data.studyMode })));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29yZHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ3b3Jkcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUVBLDZDQXFCMkI7QUFFM0IsNkNBQW1EO0FBQ25ELHlEQUFzRDtBQUN0RCw0Q0FBMkQ7QUFDM0QsNkNBQTREO0FBQzVELHVEQUFnRjtBQUNoRix5REFBc0Y7QUFHdEYsTUFBTSxlQUFlLEdBQUcsZ0JBQWdCLENBQUM7QUFJekMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQUUzQyxNQUFNLGFBQWEsR0FBRyxjQUFjLENBQUM7QUFHckMsTUFBTSxnQkFBZ0IsR0FBRyxpQkFBaUIsQ0FBQztBQVEzQyxJQUFJLENBQUM7SUFDSCxJQUFJLEVBQUU7UUFFSixRQUFRLEVBQUUsTUFBTTtRQUNoQixTQUFTLEVBQUUsQ0FBQztRQUVaLEtBQUssRUFBRSxFQUFnQjtRQUN2QixZQUFZLEVBQUUsQ0FBQztRQUVmLFdBQVcsRUFBRSxLQUFLO1FBRWxCLFVBQVUsRUFBRSxDQUFDO1FBQ2IsWUFBWSxFQUFFLENBQUM7UUFDZixVQUFVLEVBQUUsQ0FBQztRQUViLFFBQVEsRUFBRSxDQUFDO1FBQ1gsYUFBYSxFQUFFLENBQUM7UUFFaEIsV0FBVyxFQUFFLElBQUk7UUFFakIsT0FBTyxFQUFFLElBQUk7UUFFYixPQUFPLEVBQUUsSUFBSTtRQUViLFNBQVMsRUFBRSxLQUFrQjtRQUU3QixTQUFTLEVBQUUsRUFBRTtRQUViLGFBQWEsRUFBRSxDQUFDO1FBRWhCLFNBQVMsRUFBRSxDQUFDO1FBQ1osWUFBWSxFQUFFLENBQUM7UUFFZixjQUFjLEVBQUUsSUFBSTtRQUNwQixhQUFhLEVBQUUsUUFBUTtRQUl2QixZQUFZLEVBQUUsTUFBc0I7UUFFcEMsVUFBVSxFQUFFLE1BQThCO1FBRTFDLGFBQWEsRUFBRSxFQUFvQjtRQUVuQyxjQUFjLEVBQUUsQ0FBQyxDQUFDO1FBRWxCLGFBQWEsRUFBRSxLQUFLO1FBRXBCLFVBQVUsRUFBRSxFQUFFO1FBRWQsYUFBYSxFQUFFLE1BQU07UUFFckIsTUFBTSxFQUFFLElBQWM7UUFFdEIsVUFBVSxFQUFFLEtBQUs7UUFDakIsVUFBVSxFQUFFLENBQUM7UUFDYixZQUFZLEVBQUUsRUFBRTtRQUVoQixTQUFTLEVBQUUsS0FBSztRQUVoQixrQkFBa0IsRUFBRSxLQUFLO1FBRXpCLGNBQWMsRUFBRSxFQUFnQjtRQUVoQyxZQUFZLEVBQUUsRUFBNEI7UUFFMUMsU0FBUyxFQUFFLFFBQW1DO1FBRTlDLFVBQVUsRUFBRSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQWE7UUFDdEQsU0FBUyxFQUFFLENBQUM7UUFFWixTQUFTLEVBQUUsS0FBSztRQUNoQixVQUFVLEVBQUUsRUFBRTtRQUNkLFlBQVksRUFBRSxFQUErQztRQUM3RCxTQUFTLEVBQUUsRUFBWTtRQUV2QixVQUFVLEVBQUUsS0FBSztRQUNqQixVQUFVLEVBQUUsRUFBcUI7UUFDakMsVUFBVSxFQUFFLEVBQUU7UUFDZCxXQUFXLEVBQUUsRUFBNkI7S0FDM0M7SUFFRCxNQUFNLEtBQUksQ0FBQztJQUdYLFlBQVksRUFBRSxJQUFJLEdBQUcsRUFBeUI7SUFFOUMsTUFBTTtRQUVKLElBQUksSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3pCLElBQUksQ0FBQyxlQUFlLEdBQUcsS0FBSyxDQUFDO1lBQzdCLElBQUksSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBQzlCLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztZQUNyQyxDQUFDO1lBQ0QsSUFBSSxDQUFDLG9CQUFvQixHQUFHLEtBQUssQ0FBQztZQUNsQyxPQUFPO1FBQ1QsQ0FBQztRQUVELElBQUksRUFBRSxDQUFDLGNBQWMsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUM3QyxFQUFFLENBQUMsaUJBQWlCLENBQUMsZUFBZSxDQUFDLENBQUM7WUFDdEMsSUFBSSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDMUIsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsV0FBVyxHQUFHLEtBQUssQ0FBQztRQUMzQixDQUFDO1FBRUQsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLGNBQWMsQ0FBQyxnQkFBZ0IsQ0FBNkMsQ0FBQztRQUNoRyxFQUFFLENBQUMsaUJBQWlCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztRQUN2QyxJQUNFLE9BQU8sSUFBSSxPQUFPLE9BQU8sS0FBSyxRQUFRO1lBQ3RDLE9BQU8sQ0FBQyxNQUFNLEtBQUssSUFBQSx3QkFBZ0IsR0FBRTtZQUNyQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQ3hELENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUM7UUFDcEMsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUMzQixDQUFDO1FBRUQsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzNDLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQyxhQUFhLENBQUMsQ0FBQztZQUNwQyxJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUN2QixDQUFDO1FBR0QsSUFBSSxFQUFFLENBQUMsY0FBYyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7WUFDOUMsRUFBRSxDQUFDLGlCQUFpQixDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDdkMsSUFBSSxDQUFDLGdCQUFnQixHQUFHLElBQUksQ0FBQztZQUM3QixJQUFJLENBQUMsVUFBVSxHQUFHLEVBQUUsQ0FBQztRQUN2QixDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxnQkFBZ0IsR0FBRyxLQUFLLENBQUM7UUFDaEMsQ0FBQztRQUdELElBQUksQ0FBQyxJQUFBLHVCQUFlLEdBQUUsRUFBRSxDQUFDO1lBQ3ZCLEVBQUUsQ0FBQyxVQUFVLENBQUMsRUFBRSxHQUFHLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQyxDQUFDO1lBQ25ELE9BQU87UUFDVCxDQUFDO1FBQ0QsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNYLGFBQWEsRUFBRSxJQUFBLHdCQUFnQixHQUFFO1lBQ2pDLFlBQVksRUFBRSxJQUFBLHVCQUFlLEdBQUU7WUFDL0IsU0FBUyxFQUFFLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxJQUFBLHVCQUFlLEdBQUUsQ0FBQztZQUNoRixNQUFNLEVBQUUsSUFBQSxpQkFBUyxHQUFFO1lBQ25CLFNBQVMsRUFBRSxJQUFBLG9CQUFZLEdBQUU7U0FFMUIsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFRCxRQUFRO1FBRU4sSUFBSSxDQUFDLGlCQUFpQixFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUVELEtBQUssQ0FBQyxTQUFTO1FBRWIsSUFBSSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUMxQixJQUFJLENBQUMsZ0JBQWdCLEdBQUcsS0FBSyxDQUFDO1lBQzlCLE1BQU0sRUFBRSxHQUFHLE1BQU0sSUFBSSxDQUFDLGVBQWUsRUFBRSxDQUFDO1lBQ3hDLElBQUksQ0FBQyxFQUFFO2dCQUFFLE1BQU0sSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdkMsT0FBTztRQUNULENBQUM7UUFDRCxPQUFPLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO0lBQ2pDLENBQUM7SUFHRCxLQUFLLENBQUMsZUFBZTtRQUNuQixNQUFNLE1BQU0sR0FBRyxJQUFBLDRCQUFvQixHQUFFLENBQUM7UUFDdEMsSUFBSSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ3hCLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsa0JBQWtCLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDMUQsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO1FBRUQsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQW9CLENBQUM7UUFDM0MsS0FBSyxNQUFNLENBQUMsSUFBSSxNQUFNLEVBQUUsQ0FBQztZQUN2QixNQUFNLEdBQUcsR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDdkMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDakIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQzVCLENBQUM7UUFDRCxNQUFNLEtBQUssR0FBZSxFQUFFLENBQUM7UUFDN0IsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFDO1FBQ2hDLE1BQU0sVUFBVSxHQUFHLElBQUksR0FBRyxDQUN4QixNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUM1RCxDQUFDO1FBQ0YsS0FBSyxNQUFNLENBQUMsR0FBRyxFQUFFLEtBQUssQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQ2xDLElBQUksQ0FBQztnQkFDSCxNQUFNLElBQUksR0FBRyxNQUFNLElBQUEseUJBQVcsRUFBQyxHQUFHLENBQUMsQ0FBQztnQkFDcEMsSUFBSSxDQUFDLElBQUk7b0JBQUUsU0FBUztnQkFDcEIsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztnQkFDN0IsTUFBTSxJQUFJLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDLENBQUM7Z0JBQ3RELEtBQUssTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLEtBQUssRUFBRSxDQUFDO29CQUMzQixJQUFJLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQzt3QkFBRSxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO2dCQUNwRCxDQUFDO1lBQ0gsQ0FBQztZQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Z0JBQ1gsT0FBTyxDQUFDLEtBQUssQ0FBQyxlQUFlLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDO1lBQ3pDLENBQUM7UUFDSCxDQUFDO1FBQ0QsSUFBSSxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUVyQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQ2xCLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FDaEcsQ0FBQztRQUVGLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUN0QyxJQUFJLENBQUMsV0FBVyxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFDckMsTUFBTSxXQUFXLEdBQTRCLEVBQUUsQ0FBQztRQUNoRCxLQUFLLE1BQU0sQ0FBQyxJQUFJLEtBQUssRUFBRSxDQUFDO1lBQ3RCLElBQUksSUFBQSwyQkFBYyxFQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7Z0JBQUUsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxJQUFJLENBQUM7UUFDekQsQ0FBQztRQUNELE1BQU0sYUFBYSxHQUFHLElBQUEsNEJBQW9CLEVBQUMsSUFBQSx3QkFBZ0IsR0FBRSxDQUFDLENBQUM7UUFDL0QsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNYLFFBQVEsRUFBRSxNQUFNO1lBQ2hCLEtBQUs7WUFDTCxjQUFjLEVBQUUsUUFBUTtZQUN4QixZQUFZLEVBQUUsQ0FBQztZQUNmLFdBQVcsRUFBRSxLQUFLO1lBQ2xCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGtCQUFrQixFQUFFLEtBQUs7WUFDekIsVUFBVSxFQUFFLENBQUM7WUFDYixZQUFZLEVBQUUsQ0FBQztZQUNmLFVBQVUsRUFBRSxLQUFLLENBQUMsTUFBTTtZQUN4QixRQUFRLEVBQUUsYUFBYSxDQUFDLFFBQVE7WUFDaEMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxhQUFhO1lBQzFDLFdBQVcsRUFBRSxJQUFJO1lBQ2pCLE9BQU8sRUFBRSxLQUFLO1lBQ2QsT0FBTyxFQUFFLEtBQUs7WUFDZCxVQUFVLEVBQUUsS0FBSztZQUNqQixVQUFVLEVBQUUsRUFBRTtZQUNkLGFBQWEsRUFBRSxNQUFNO1lBQ3JCLGNBQWMsRUFBRSxDQUFDLENBQUM7WUFDbEIsWUFBWSxFQUFFLEVBQUU7WUFDaEIsV0FBVztTQUNaLEVBQUUsR0FBRyxFQUFFO1lBQ04sSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7UUFDOUIsQ0FBQyxDQUFDLENBQUM7UUFDSCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxLQUFLLENBQUMsZ0JBQWdCO1FBQ3BCLE1BQU0sTUFBTSxHQUFHLElBQUEsd0JBQWdCLEdBQUUsQ0FBQztRQUNsQyxNQUFNLFNBQVMsR0FBRyxJQUFBLG9CQUFZLEdBQUUsQ0FBQztRQUNqQyxNQUFNLFlBQVksR0FBRyxJQUFBLHVCQUFlLEdBQUUsQ0FBQztRQUN2QyxNQUFNLE1BQU0sR0FBRyxJQUFBLGlCQUFTLEdBQUUsQ0FBQztRQUMzQixNQUFNLFNBQVMsR0FBRyxJQUFBLG9CQUFZLEdBQUUsQ0FBQztRQUdqQyxNQUFNLFNBQVMsR0FBRyxJQUFBLG9CQUFZLEdBQUUsQ0FBQztRQUNqQyxNQUFNLGVBQWUsR0FBMkIsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLENBQUM7UUFDMUcsTUFBTSxXQUFXLEdBQUcsQ0FBQyxNQUFNLEVBQUUsU0FBUyxFQUFFLFlBQVksRUFBRSxNQUFNLEVBQUUsU0FBUyxFQUFFLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUM5RixJQUNFLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVU7WUFDbkQsQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVk7WUFDdkMsSUFBSSxDQUFDLFVBQVUsS0FBSyxXQUFXLEVBQy9CLENBQUM7WUFDRCxPQUFPO1FBQ1QsQ0FBQztRQUNELElBQUksQ0FBQyxVQUFVLEdBQUcsV0FBVyxDQUFDO1FBQzlCLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBSXpCLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQ2pDLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzdJLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsTUFBTSxFQUFFLFNBQVMsRUFBRSxTQUFTLEVBQUUsY0FBYyxFQUFFLGVBQWUsQ0FBQyxTQUFTLENBQUMsSUFBSSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQzlILENBQUM7UUFFRCxJQUFJLElBQUksQ0FBQztRQUNULElBQUksQ0FBQztZQUNILElBQUksR0FBRyxNQUFNLElBQUEseUJBQVcsRUFBQyxNQUFNLENBQUMsQ0FBQztRQUNuQyxDQUFDO1FBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQztZQUNYLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQzdCLENBQUM7UUFFRCxJQUFJLENBQUMsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUVwRCxNQUFNLFNBQVMsR0FBRyxpQkFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLEtBQUssTUFBTSxDQUFDLENBQUM7WUFDeEQsSUFBSSxTQUFTLElBQUksU0FBUyxDQUFDLEtBQUssQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQzVDLElBQUksR0FBRyxTQUFTLENBQUM7WUFDbkIsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO2dCQUM1QyxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDcEQsT0FBTztZQUNULENBQUM7UUFDSCxDQUFDO1FBSUQsTUFBTSxZQUFZLEdBQUcsSUFBSSxDQUFDLFdBQVcsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQztRQUc3RCxNQUFNLGFBQWEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxNQUFNLENBQUM7UUFDbEUsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxLQUFLLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUNyRSxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDO1FBQ3hFLElBQUksUUFBb0IsQ0FBQztRQUN6QixJQUFJLFFBQVEsR0FBRyxFQUFFLENBQUM7UUFDbEIsSUFBSSxZQUFZLEVBQUUsQ0FBQztZQUNqQixRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN4QixDQUFDO2FBQU0sSUFBSSxTQUFTLEtBQUssVUFBVSxFQUFFLENBQUM7WUFDcEMsUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO1lBQ2hELFFBQVEsR0FBRyxhQUFhLENBQUM7UUFDM0IsQ0FBQzthQUFNLElBQUksU0FBUyxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ2hDLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLENBQUM7WUFFdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQztZQUNwQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sUUFBUSxHQUFHLFlBQVksQ0FBQztZQUMxQixDQUFDO1FBQ0gsQ0FBQzthQUFNLElBQUksU0FBUyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQ25DLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLEtBQUssTUFBTSxDQUFDLENBQUM7WUFDdkQsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsUUFBUSxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ3pDLFFBQVEsR0FBRyxzQkFBc0IsQ0FBQztZQUNwQyxDQUFDO2lCQUFNLENBQUM7Z0JBQ04sUUFBUSxHQUFHLFlBQVksQ0FBQztZQUMxQixDQUFDO1FBQ0gsQ0FBQzthQUFNLENBQUM7WUFDTixRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQztRQUN4QixDQUFDO1FBRUQsSUFBSSxRQUFRLENBQUMsTUFBTSxLQUFLLENBQUMsRUFBRSxDQUFDO1lBQzFCLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsS0FBSyxFQUFFLEtBQUssRUFBRSxFQUFFLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1lBQ3BGLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsUUFBUSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ2hELE9BQU87UUFDVCxDQUFDO1FBRUQsTUFBTSxXQUFXLEdBQUcsSUFBQSxzQkFBYyxFQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNDLE1BQU0sR0FBRyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUt2QixNQUFNLFFBQVEsR0FBZSxFQUFFLENBQUM7UUFDaEMsTUFBTSxRQUFRLEdBQWUsRUFBRSxDQUFDO1FBRWhDLEtBQUssTUFBTSxDQUFDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDekIsTUFBTSxDQUFDLEdBQUcsV0FBVyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5QixJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7Z0JBQ1AsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQixDQUFDO2lCQUFNLElBQUksQ0FBQyxDQUFDLE1BQU0sS0FBSyxVQUFVLElBQUksQ0FBQyxDQUFDLFVBQVUsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsSUFBSSxHQUFHLEVBQUUsQ0FBQztnQkFDOUUsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUNuQixDQUFDO1FBQ0gsQ0FBQztRQUdELFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsU0FBUyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFLakUsSUFBSSxLQUFLLENBQUM7UUFDVixJQUFJLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNyQixJQUFJLFFBQVEsQ0FBQyxNQUFNLEtBQUssQ0FBQyxFQUFFLENBQUM7Z0JBRTFCLElBQUksQ0FBQyxXQUFXLEdBQUcsS0FBSyxDQUFDO2dCQUN6QixFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLGVBQWUsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDdkQsS0FBSyxHQUFHLENBQUMsR0FBRyxRQUFRLEVBQUUsR0FBRyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1lBQ3pELENBQUM7aUJBQU0sQ0FBQztnQkFDTixLQUFLLEdBQUcsUUFBUSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUM7WUFDdkMsQ0FBQztRQUNILENBQUM7YUFBTSxJQUFJLFNBQVMsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUVsQyxNQUFNLEdBQUcsR0FBZSxFQUFFLENBQUM7WUFDM0IsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN4QixNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7Z0JBQzNCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM5QixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2xELEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQ3BCLENBQUM7WUFDSCxDQUFDO1lBQ0QsTUFBTSxTQUFTLEdBQUcsU0FBUyxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUM7WUFDekMsTUFBTSxVQUFVLEdBQWUsRUFBRSxDQUFDO1lBQ2xDLElBQUksU0FBUyxHQUFHLENBQUMsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO2dCQUN6QyxNQUFNLElBQUksR0FBRyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7Z0JBQzNCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDOUMsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLElBQUksRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO29CQUM5QixNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxJQUFJLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7b0JBQzVELE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztvQkFBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO29CQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQ2xELFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzNCLENBQUM7WUFDSCxDQUFDO1lBQ0QsS0FBSyxHQUFHLENBQUMsR0FBRyxHQUFHLEVBQUUsR0FBRyxVQUFVLENBQUMsQ0FBQztRQUNsQyxDQUFDO2FBQU0sQ0FBQztZQUNOLEtBQUssR0FBRyxDQUFDLEdBQUcsUUFBUSxFQUFFLEdBQUcsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxTQUFTLENBQUMsQ0FBQztRQUN6RCxDQUFDO1FBR0QsSUFBSSxVQUFVLEdBQUcsS0FBSyxDQUFDO1FBQ3ZCLElBQUksS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDLEVBQUUsQ0FBQztZQUN2QixNQUFNLGFBQWEsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQzFDLE1BQU0sQ0FBQyxHQUFHLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQzlCLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLEtBQUssVUFBVSxDQUFDO1lBQ3RDLENBQUMsQ0FBQyxDQUFDO1lBQ0gsVUFBVSxHQUFHLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLFNBQVMsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFJRCxJQUFJLFNBQVMsR0FBRyxLQUFLLENBQUM7UUFDdEIsSUFBSSxJQUFJLENBQUMsWUFBWSxJQUFLLElBQUksQ0FBQyxZQUF5QixDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUNwRSxNQUFNLE1BQU0sR0FBSSxJQUFJLENBQUMsWUFBeUIsQ0FBQyxNQUFNLENBQUM7WUFDdEQsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztZQUNqQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxZQUF3QjtnQkFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1lBQzNFLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQztZQUN6RSxJQUFJLE9BQU8sQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQ3ZCLFVBQVUsR0FBSSxJQUFJLENBQUMsWUFBeUI7cUJBQ3pDLEdBQUcsQ0FBQyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQVcsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsS0FBSyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUMsQ0FBQztxQkFDM0YsTUFBTSxDQUFDLENBQUMsQ0FBdUIsRUFBaUIsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDM0QsU0FBUyxHQUFHLElBQUksQ0FBQztnQkFDakIsSUFBSSxVQUFVLENBQUMsTUFBTSxHQUFHLE1BQU0sRUFBRSxDQUFDO29CQUUvQixFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLE9BQU8sTUFBTSxHQUFHLFVBQVUsQ0FBQyxNQUFNLGFBQWEsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztnQkFDeEYsQ0FBQztZQUNILENBQUM7aUJBQU0sQ0FBQztnQkFFTixFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHFCQUFxQixFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQy9ELENBQUM7WUFDRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksQ0FBQztRQUMzQixDQUFDO1FBSUQsSUFBSSxTQUFTLEtBQUssUUFBUSxJQUFJLENBQUMsU0FBUyxJQUFJLFVBQVUsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxFQUFFLENBQUM7WUFDbEUsS0FBSyxJQUFJLENBQUMsR0FBRyxVQUFVLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQy9DLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7Z0JBQzlDLE1BQU0sQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDeEIsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDOUIsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNwQixDQUFDO1FBQ0gsQ0FBQztRQUdELElBQUksQ0FBQyxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQVUsQ0FBQztRQUNyQyxLQUFLLE1BQU0sQ0FBQyxJQUFJLFVBQVUsRUFBRSxDQUFDO1lBQzNCLElBQUksUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7Z0JBQUUsSUFBSSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQzNFLENBQUM7UUFHRCxNQUFNLFdBQVcsR0FBNEIsRUFBRSxDQUFDO1FBQ2hELEtBQUssTUFBTSxDQUFDLElBQUksVUFBVSxFQUFFLENBQUM7WUFDM0IsSUFBSSxJQUFBLDJCQUFjLEVBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztnQkFBRSxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLElBQUksQ0FBQztRQUN6RCxDQUFDO1FBRUQsTUFBTSxhQUFhLEdBQUcsSUFBQSw0QkFBb0IsRUFBQyxNQUFNLENBQUMsQ0FBQztRQUduRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksR0FBRyxFQUFVLENBQUM7UUFJdEMsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sVUFBVSxHQUFHLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztRQUN6RSxJQUFJLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDdkIsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLFdBQVcsR0FBRyxLQUFLLENBQUM7UUFDdEIsQ0FBQzthQUFNLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLElBQUksVUFBVSxLQUFLLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNyRSxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLENBQUM7YUFBTSxJQUFJLFVBQVUsS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksUUFBUSxDQUFDLE1BQU0sS0FBSyxDQUFDLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUN2RyxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3JCLENBQUM7UUFFRCxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ1gsUUFBUSxFQUFFLElBQUksQ0FBQyxJQUFJO1lBQ25CLFNBQVMsRUFBRSxRQUFRLENBQUMsTUFBTTtZQUMxQixhQUFhO1lBQ2IsU0FBUztZQUNULFlBQVk7WUFDWixLQUFLLEVBQUUsVUFBVTtZQUNqQixjQUFjLEVBQUUsUUFBUTtZQUN4QixZQUFZLEVBQUUsQ0FBQztZQUNmLFdBQVcsRUFBRSxLQUFLO1lBQ2xCLFNBQVMsRUFBRSxLQUFLO1lBQ2hCLGtCQUFrQixFQUFFLEtBQUs7WUFDekIsVUFBVSxFQUFFLENBQUM7WUFDYixZQUFZLEVBQUUsQ0FBQztZQUNmLFVBQVUsRUFBRSxVQUFVLENBQUMsTUFBTTtZQUM3QixRQUFRLEVBQUUsYUFBYSxDQUFDLFFBQVE7WUFDaEMsYUFBYSxFQUFFLGFBQWEsQ0FBQyxhQUFhO1lBQzFDLFdBQVc7WUFDWCxPQUFPLEVBQUUsVUFBVSxDQUFDLE1BQU0sSUFBSSxTQUFTO1lBQ3ZDLE9BQU8sRUFBRSxLQUFLO1lBQ2QsVUFBVSxFQUFFLEtBQUs7WUFDakIsVUFBVSxFQUFFLEVBQUU7WUFDZCxhQUFhLEVBQUUsTUFBTTtZQUNyQixjQUFjLEVBQUUsQ0FBQyxDQUFDO1lBQ2xCLFlBQVksRUFBRSxFQUFFO1lBQ2hCLFdBQVc7U0FDWixFQUFFLEdBQUcsRUFBRTtZQUNOLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDMUIsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7Z0JBRTVCLElBQUksVUFBVSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztvQkFDMUIsSUFBQSxvQkFBWSxFQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUM7Z0JBQzNDLENBQUM7WUFDSCxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBR0QsY0FBYztRQUNaLElBQUksSUFBSSxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUM7WUFBRSxPQUFPLElBQUksQ0FBQztRQUMvRCxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQzlDLE9BQU8sS0FBSyxDQUFDO0lBQ2YsQ0FBQztJQUtELFVBQVU7UUFDUixFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsR0FBRyxFQUFFLDBCQUEwQixFQUFFLENBQUMsQ0FBQztJQUNyRCxDQUFDO0lBSUQsUUFBUTtRQUNOLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLENBQUM7WUFBRSxPQUFPO1FBQ2YsRUFBRSxDQUFDLFVBQVUsQ0FBQztZQUNaLEdBQUcsRUFBRSw2QkFBNkIsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO1NBQy9ELENBQUMsQ0FBQztJQUNMLENBQUM7SUFHRCxVQUFVO1FBQ1IsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNsRCxJQUFJLENBQUMsQ0FBQztZQUFFLE9BQU87UUFDZixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsRUFBRSxFQUFFLFVBQVUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFFRCxXQUFXO1FBQ1QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFFRCxZQUFZLENBQUMsQ0FBTTtRQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQWtCLEVBQUUsQ0FBQyxDQUFDO0lBQzNFLENBQUM7SUFFRCxZQUFZLENBQUMsQ0FBTTtRQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsWUFBWTtRQUNWLE1BQU0sQ0FBQyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDbEQsSUFBSSxDQUFDLENBQUM7WUFBRSxPQUFPO1FBQ2YsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDMUIsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDbEQsT0FBTztRQUNULENBQUM7UUFDRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHdCQUFnQixHQUFFLENBQUM7UUFDbEMsSUFBQSx1QkFBVSxFQUFDLENBQUMsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBd0IsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFO1lBQzlGLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNkLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3RELENBQUM7aUJBQU0sSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUM7Z0JBQ2hCLE1BQU0sV0FBVyxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxJQUFJLEVBQUUsQ0FBQztnQkFDakUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsV0FBVyxFQUFFLENBQUMsQ0FBQztnQkFDakQsRUFBRSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDeEQsQ0FBQztpQkFBTSxDQUFDO2dCQUNOLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1lBQ3RELENBQUM7UUFDSCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRCxRQUFRO1FBRU4sTUFBTSxPQUFPLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQztRQUNyQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ1gsU0FBUyxFQUFFLE9BQU87WUFDbEIsV0FBVyxFQUFFLE9BQU87U0FDckIsQ0FBQyxDQUFDO1FBRUgsSUFBSSxPQUFPLEVBQUUsQ0FBQztZQUNaLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDckQsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxDQUFDLENBQUM7WUFDekQsSUFBSSxJQUFJO2dCQUFFLElBQUEsaUJBQVMsRUFBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDakQsSUFBSSxJQUFJO2dCQUFFLElBQUEsb0JBQVksRUFBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDdEQsQ0FBQztJQUNILENBQUM7SUFHRCxXQUFXO1FBQ1QsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNyRCxJQUFJLElBQUk7WUFBRSxJQUFBLGlCQUFTLEVBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQ25ELENBQUM7SUFHRCxjQUFjO1FBQ1osTUFBTSxTQUFTLEdBQVcsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEtBQUssSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztRQUNsRSxJQUFBLGlCQUFTLEVBQUMsU0FBUyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLE1BQU0sRUFBRSxTQUFTLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLEVBQUUsQ0FBQyxTQUFTLENBQUM7WUFDWCxLQUFLLEVBQUUsU0FBUyxLQUFLLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNO1lBQzNDLElBQUksRUFBRSxNQUFNO1NBQ2IsQ0FBQyxDQUFDO1FBRUgsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNyRCxJQUFJLElBQUk7WUFBRSxJQUFBLGlCQUFTLEVBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBSUQsb0JBQW9CO1FBQ2xCLE1BQU0sSUFBSSxHQUFHLElBQUEsc0JBQWMsRUFBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3BELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxLQUFLLE1BQU0sQ0FBQztRQUMxRSxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBR3JELElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO1FBQ3pCLE1BQU0sUUFBUSxHQUFHLFFBQVEsQ0FBQyxDQUFDLENBQUMsRUFBRSxTQUFTLEVBQUUsS0FBSyxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQzFFLE1BQU0sUUFBUSxHQUFHLEdBQUcsRUFBRTtZQUNwQixJQUFJLENBQUMsUUFBUTtnQkFBRSxPQUFPO1lBQ3RCLEVBQUUsQ0FBQyxRQUFRLENBQUMsR0FBRyxFQUFFO2dCQUNmLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQyxDQUFDO1FBQ0YsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNYLFVBQVUsRUFBRSxJQUFJO1lBQ2hCLEdBQUcsUUFBUTtZQUNYLGtCQUFrQixFQUFFLEtBQUs7WUFDekIsVUFBVSxFQUFFLEVBQUU7WUFDZCxhQUFhLEVBQUUsTUFBTTtZQUNyQixjQUFjLEVBQUUsQ0FBQyxDQUFDO1NBQ25CLEVBQUUsR0FBRyxFQUFFO1lBQ04sUUFBUSxFQUFFLENBQUM7WUFDWCxJQUFJLENBQUMsSUFBSTtnQkFBRSxPQUFPO1lBQ2xCLElBQUksSUFBSSxLQUFLLFFBQVEsRUFBRSxDQUFDO2dCQUN0QixJQUFJLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkMsQ0FBQztpQkFBTSxJQUFJLElBQUksS0FBSyxNQUFNLEVBQUUsQ0FBQztnQkFDM0IsSUFBQSxpQkFBUyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUN6QyxDQUFDO1FBQ0gsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBSUQscUJBQXFCLENBQUMsV0FBcUI7UUFDekMsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUM7UUFDMUMsSUFBSSxRQUFRLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBRXhCLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztZQUNyQyxPQUFPO1FBQ1QsQ0FBQztRQUdELE1BQU0sV0FBVyxHQUFlLEVBQUUsQ0FBQztRQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLElBQUksUUFBUSxHQUFHLENBQUMsQ0FBQztRQUNqQixPQUFPLFdBQVcsQ0FBQyxNQUFNLEdBQUcsQ0FBQyxJQUFJLFFBQVEsR0FBRyxHQUFHLEVBQUUsQ0FBQztZQUNoRCxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUM7WUFDeEQsTUFBTSxDQUFDLEdBQUcsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3hCLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxLQUFLLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDM0QsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztnQkFDcEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkIsQ0FBQztZQUNELFFBQVEsRUFBRSxDQUFDO1FBQ2IsQ0FBQztRQUdELE1BQU0sT0FBTyxHQUFtQjtZQUM5QixFQUFFLE9BQU8sRUFBRSxXQUFXLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUU7WUFDakQsR0FBRyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1NBQ3BFLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxHQUFHLENBQUMsQ0FBQztRQUVsQyxJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ1gsYUFBYSxFQUFFLE9BQU87WUFDdEIsY0FBYyxFQUFFLENBQUMsQ0FBQztZQUNsQixhQUFhLEVBQUUsS0FBSztTQUNyQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBR0QsY0FBYyxDQUFDLENBQU07UUFDbkIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGNBQWMsS0FBSyxDQUFDLENBQUM7WUFBRSxPQUFPO1FBQzVDLElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUFFLE9BQU87UUFFbEMsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsR0FBYSxDQUFDO1FBQ2xELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQzVDLE1BQU0sU0FBUyxHQUFHLE1BQU0sQ0FBQyxTQUFTLENBQUM7UUFFbkMsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNYLGNBQWMsRUFBRSxHQUFHO1lBQ25CLGFBQWEsRUFBRSxTQUFTO1NBQ3pCLENBQUMsQ0FBQztRQUdILE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDckQsSUFBSSxJQUFJO1lBQUUsSUFBQSxpQkFBUyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUdqRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHdCQUFnQixHQUFFLENBQUM7UUFDbEMsSUFBQSwwQkFBa0IsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqRCxJQUFBLG1CQUFXLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBQSxzQkFBYyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6RCxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBR0QsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNkLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsQixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFHRCxnQkFBZ0I7UUFDZCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxLQUFLLENBQUMsQ0FBQztZQUFFLE9BQU87UUFDNUMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQUUsT0FBTztRQUdsQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsY0FBYyxFQUFFLENBQUMsQ0FBQyxFQUFFLGFBQWEsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRTNELE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDckQsSUFBSSxJQUFJO1lBQUUsSUFBQSxpQkFBUyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVqRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHdCQUFnQixHQUFFLENBQUM7UUFDbEMsSUFBQSwwQkFBa0IsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM3QyxJQUFBLG1CQUFXLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0MsSUFBQSxzQkFBYyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUVoRCxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7SUFHN0QsQ0FBQztJQUdELFlBQVk7UUFDVixJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsY0FBYyxLQUFLLENBQUMsQ0FBQztZQUFFLE9BQU87UUFDNUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLGNBQWMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDckMsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO0lBQ2xCLENBQUM7SUFHRCxZQUFZLENBQUMsQ0FBTTtRQUNqQixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUMvQyxDQUFDO0lBRUQsYUFBYTtRQUNYLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3hELElBQUksQ0FBQyxLQUFLO1lBQUUsT0FBTztRQUVuQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELElBQUksQ0FBQyxJQUFJO1lBQUUsT0FBTztRQUNsQixJQUFJLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFBRSxPQUFPO1FBR2xDLE1BQU0sU0FBUyxHQUFHLEtBQUssS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRXBELElBQUksQ0FBQyxPQUFPLENBQUM7WUFDWCxhQUFhLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE9BQU87U0FDL0MsQ0FBQyxDQUFDO1FBR0gsSUFBQSxpQkFBUyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUd2QyxNQUFNLE1BQU0sR0FBRyxJQUFBLHdCQUFnQixHQUFFLENBQUM7UUFDbEMsSUFBQSwwQkFBa0IsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNqRCxJQUFBLG1CQUFXLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDM0MsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1lBQ2YsSUFBQSxzQkFBYyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLE9BQU8sRUFBRSxNQUFNLENBQUMsQ0FBQztRQUNsRCxDQUFDO1FBRUQsSUFBSSxTQUFTLEVBQUUsQ0FBQztZQUNkLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUN6RCxDQUFDO2FBQU0sQ0FBQztZQUNOLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RCxDQUFDO1FBR0QsVUFBVSxDQUFDLEdBQUcsRUFBRTtZQUNkLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUNsQixDQUFDLEVBQUUsU0FBUyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFJRCxVQUFVLENBQUMsSUFBWSxFQUFFLEtBQWEsRUFBRSxPQUFrRDtRQUN4RixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBUyxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsWUFBWSxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDL0YsQ0FBQztJQUVELFVBQVU7UUFDUixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsU0FBUyxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7SUFDckMsQ0FBQztJQUVELGFBQWEsQ0FBQyxDQUFNO1FBQ2xCLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQWUsQ0FBQztRQUNwRCxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxJQUFjLENBQUM7UUFDcEQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBRW5DLElBQUksSUFBSSxLQUFLLE1BQU0sRUFBRSxDQUFDO1lBQ3BCLE1BQU0sS0FBSyxHQUFtQixDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztZQUN6RSxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFpQixDQUFDO1lBQ3hDLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWTtnQkFBRSxPQUFPO1lBQ3JELElBQUEsdUJBQWUsRUFBQyxJQUFJLENBQUMsQ0FBQztZQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsR0FBRyxFQUFFLENBQUMsQ0FBQztZQUNyRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztnQkFDL0IsSUFBSSxDQUFDLG9CQUFvQixFQUFFLENBQUM7WUFDOUIsQ0FBQztRQUNILENBQUM7YUFBTSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUM1QixNQUFNLEtBQUssR0FBZ0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztZQUNsRSxNQUFNLE9BQU8sR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7WUFDM0IsSUFBSSxDQUFDLE9BQU8sSUFBSSxPQUFPLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTO2dCQUFFLE9BQU87WUFDeEQsSUFBQSxvQkFBWSxFQUFDLE9BQU8sQ0FBQyxDQUFDO1lBQ3RCLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxjQUFjLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLE9BQU8sQ0FBQyxJQUFJLElBQUksRUFBRSxDQUFDLENBQUM7WUFDMUUsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25CLENBQUM7YUFBTSxJQUFJLElBQUksS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUM1QixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1lBQ2hDLE1BQU0sQ0FBQyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUN2QixJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFNBQVM7Z0JBQUUsT0FBTztZQUM1QyxJQUFBLG9CQUFZLEVBQUMsQ0FBQyxDQUFDLENBQUM7WUFDaEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQy9CLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUMsR0FBRyxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7WUFDMUQsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ25CLENBQUM7SUFDSCxDQUFDO0lBRUQsU0FBUztRQUNQLE1BQU0sS0FBSyxHQUFtQixDQUFDLE1BQU0sRUFBRSxRQUFRLEVBQUUsT0FBTyxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQztRQUN6RSxJQUFJLENBQUMsVUFBVSxDQUNiLE1BQU0sRUFDTixNQUFNLEVBQ04sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsS0FBSyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FDaEcsQ0FBQztJQUNKLENBQUM7SUFFRCxvQkFBb0IsQ0FBQyxDQUFNO1FBQ3pCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQW9CLENBQUM7UUFDMUQsSUFBSSxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZO1lBQUUsT0FBTztRQUU1QyxJQUFBLHVCQUFlLEVBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEIsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFlBQVksRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDO1FBQ3JDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQy9CLElBQUksQ0FBQyxvQkFBb0IsRUFBRSxDQUFDO1FBQzlCLENBQUM7UUFFRCxNQUFNLE1BQU0sR0FBMkIsRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxHQUFHLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQztRQUNsSCxFQUFFLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUdELGlCQUFpQjtRQUNmLE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7UUFDM0UsSUFBQSxvQkFBWSxFQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ3RCLEVBQUUsQ0FBQyxTQUFTLENBQUM7WUFDWCxLQUFLLEVBQUUsT0FBTyxLQUFLLFFBQVEsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTO1lBQ25ELElBQUksRUFBRSxNQUFNO1NBQ2IsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFHRCxVQUFVLENBQUMsSUFBWTtRQUNyQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsV0FBVyxJQUFJLElBQUksQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLEVBQUUsQ0FBQyxDQUFDO0lBQ3hFLENBQUM7SUFHRCxpQkFBaUI7UUFDZixNQUFNLE9BQU8sR0FBRyxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxVQUFVLENBQ2IsT0FBTyxFQUNQLE1BQU0sRUFDTixPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDLEdBQUcsTUFBTSxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQzdFLENBQUM7SUFDSixDQUFDO0lBR0QsaUJBQWlCLEVBQUUsRUFBRSxHQUFHLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxFQUE0QjtJQUV0RyxpQkFBaUI7UUFDZixNQUFNLEtBQUssR0FBZ0IsQ0FBQyxLQUFLLEVBQUUsVUFBVSxFQUFFLE1BQU0sRUFBRSxTQUFTLENBQUMsQ0FBQztRQUNsRSxJQUFJLENBQUMsVUFBVSxDQUNiLE9BQU8sRUFDUCxNQUFNLEVBQ04sS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsSUFBSSxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxDQUFDLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLENBQzFGLENBQUM7SUFDSixDQUFDO0lBR0QsZUFBZTtRQUNiLElBQUksQ0FBQyxpQkFBaUIsRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFHRCxVQUFVLEVBQUUsSUFBeUI7SUFFckMsYUFBYTtRQUNYLEVBQUUsQ0FBQyxXQUFXLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUN0QyxJQUFBLDhCQUFnQixHQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxFQUFFLEVBQUU7WUFDL0IsRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLElBQUksQ0FBQyxVQUFVLEdBQUcsSUFBSSxDQUFDO1lBQ3ZCLElBQUEsNkJBQWUsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUMsQ0FBQztRQUN2RCxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFO1lBQ1osRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1lBQ2pCLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBQ3BELENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUVELGdCQUFnQjtRQUNkLE9BQU8sSUFBSSxPQUFPLENBQUMsQ0FBQyxPQUFPLEVBQUUsTUFBTSxFQUFFLEVBQUU7WUFDckMsRUFBRSxDQUFDLG1CQUFtQixFQUFFLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQztpQkFDOUIsTUFBTSxDQUFDLGVBQWUsQ0FBQztpQkFDdkIsTUFBTSxDQUFDLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxDQUFDO2lCQUN0QixJQUFJLENBQUMsQ0FBQyxHQUFRLEVBQUUsRUFBRTtnQkFDakIsSUFBSSxHQUFHLElBQUksR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO29CQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7O29CQUNsRCxNQUFNLENBQUMsSUFBSSxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQztZQUN2QyxDQUFDLENBQUMsQ0FBQztRQUNQLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztJQUdELFNBQVM7UUFDUCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU07WUFBRSxPQUFPO1FBQzdELElBQUksSUFBSSxDQUFDLGNBQWMsRUFBRTtZQUFFLE9BQU87UUFDbEMsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsQ0FBQztRQUNyRCxNQUFNLE1BQU0sR0FBRyxJQUFBLHdCQUFnQixHQUFFLENBQUM7UUFDbEMsSUFBQSwwQkFBa0IsRUFBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztRQUM1QyxJQUFBLG1CQUFXLEVBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFFM0MsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNYLFVBQVUsRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDO1NBQ3JDLENBQUMsQ0FBQztRQUNILElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQsV0FBVztRQUNULElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUFFLE9BQU87UUFDN0QsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQjtZQUFFLE9BQU87UUFDekMsSUFBSSxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQUUsT0FBTztRQUNsQyxNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksQ0FBQyxDQUFDO1FBQ3JELE1BQU0sTUFBTSxHQUFHLElBQUEsd0JBQWdCLEdBQUUsQ0FBQztRQUNsQyxJQUFBLDBCQUFrQixFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUEsbUJBQVcsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMzQyxJQUFBLHNCQUFjLEVBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsT0FBTyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRWhELElBQUksQ0FBQyxPQUFPLENBQUM7WUFDWCxZQUFZLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEdBQUcsQ0FBQztZQUd4QyxrQkFBa0IsRUFBRSxJQUFJO1lBQ3hCLFNBQVMsRUFBRSxJQUFJO1lBQ2YsV0FBVyxFQUFFLElBQUk7U0FDbEIsQ0FBQyxDQUFDO1FBRUgsSUFBQSxpQkFBUyxFQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUV2QyxJQUFJLENBQUMsaUJBQWlCLEVBQUUsQ0FBQztRQUN6QixJQUFJLENBQUMsWUFBWSxHQUFHLFVBQVUsQ0FBQyxHQUFHLEVBQUU7WUFDbEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7WUFDekIsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLGtCQUFrQjtnQkFBRSxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUM7UUFDeEQsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ1gsQ0FBQztJQUVELFlBQVksRUFBRSxJQUFXO0lBRXpCLGlCQUFpQjtRQUNmLElBQUksSUFBSSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3RCLFlBQVksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLFlBQVksR0FBRyxJQUFJLENBQUM7UUFDM0IsQ0FBQztJQUNILENBQUM7SUFJRCxTQUFTLENBQUMsQ0FBTTtRQUNkLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEdBQWEsQ0FBQztRQUNsRCxNQUFNLENBQUMsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUMvQixJQUFJLENBQUM7WUFBRSxJQUFBLGlCQUFTLEVBQUMsQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0lBQzdDLENBQUM7SUFHRCxZQUFZLENBQUMsQ0FBTTtRQUNqQixNQUFNLEdBQUcsR0FBRyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxHQUFhLENBQUM7UUFDbEQsTUFBTSxLQUFLLEdBQUcsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsS0FBSyxLQUFLLEdBQUcsQ0FBQztRQUNwRCxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUk7WUFBRSxPQUFPO1FBQ3pDLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ2xDLElBQUksSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUFFLE9BQU87UUFDOUMsSUFBSSxJQUFJLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUM7WUFBRSxPQUFPO1FBQ3ZDLElBQUksQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBRTNCLE1BQU0sTUFBTSxHQUFHLElBQUEsd0JBQWdCLEdBQUUsQ0FBQztRQUNsQyxJQUFBLDBCQUFrQixFQUFDLE1BQU0sRUFBRSxJQUFJLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzdDLElBQUEsbUJBQVcsRUFBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsS0FBSztZQUFFLElBQUEsc0JBQWMsRUFBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxPQUFPLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFNUQsTUFBTSxZQUFZLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLEVBQUUsQ0FBQztRQUM3RixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUMxRCxNQUFNLFlBQVksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFlBQVksR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5RCxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsWUFBWSxFQUFFLFVBQVUsRUFBRSxZQUFZLEVBQUUsQ0FBQyxDQUFDO1FBR3pELElBQUksVUFBVSxHQUFHLFlBQVksSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ3RE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LENBQUMsb0JBQW9CLEVBQUUsQ0FBQztRQUM5QixDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFHRCxZQUFZO1FBQ1YsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFVBQVUsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1FBQ3BDLEVBQUUsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFHLEVBQUUsb0JBQW9CLEVBQUUsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFHRCxhQUFhO1FBRVgsSUFBSSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7UUFDNUIsSUFBSSxDQUFDLG9CQUFvQixHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO1FBQ2pELElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxVQUFVLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNwQyxFQUFFLENBQUMsVUFBVSxDQUFDO1lBQ1osR0FBRyxFQUFFLDZCQUE2QixJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRTtTQUN6RCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBR0QsV0FBVztRQUNULElBQUEsd0JBQWdCLEVBQUMsSUFBQSxnQkFBUSxHQUFFLENBQUMsQ0FBQztJQUMvQixDQUFDO0lBR0QsaUJBQWlCO1FBQ2YsT0FBTztZQUNMLEtBQUssRUFBRSxrQkFBa0I7WUFDekIsSUFBSSxFQUFFLG9CQUFvQjtTQUMzQixDQUFDO0lBQ0osQ0FBQztJQUdELGVBQWU7UUFDYixPQUFPO1lBQ0wsS0FBSyxFQUFFLGtCQUFrQjtTQUMxQixDQUFDO0lBQ0osQ0FBQztDQUNGLENBQUMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8vIHBhZ2VzL3dvcmRzL3dvcmRzLnRzXG5pbXBvcnQgeyBXb3JkSXRlbSB9IGZyb20gJy4uLy4uL2RhdGEvdHlwZXMnO1xuaW1wb3J0IHtcbiAgZ2V0Q3VycmVudEJvb2tJZCxcbiAgZ2V0QWxsUHJvZ3Jlc3MsXG4gIHJlY29yZFdvcmRQcm9ncmVzcyxcbiAgcmVjb3JkU3R1ZHksXG4gIGdldEJvb2tQcm9ncmVzc1N0YXRzLFxuICBnZXRTdGF0cyxcbiAgc3luY1N0YXRzVG9DbG91ZCxcbiAgaGFzU2VsZWN0ZWRCb29rLFxuICBnZXRTdHVkeU1vZGUsXG4gIHNldFN0dWR5TW9kZSxcbiAgZ2V0QmF0Y2hTaXplLFxuICBzZXRCYXRjaFNpemUsXG4gIGdldFByYWN0aWNlTW9kZSxcbiAgc2V0UHJhY3RpY2VNb2RlLFxuICBnZXRPcmRlck1vZGUsXG4gIHNldE9yZGVyTW9kZSxcbiAgZ2V0VG9kYXlMZWFybmVkV29yZHMsXG4gIGdldEFjY2VudCxcbiAgc2V0QWNjZW50LFxuICBhZGRUb1dyb25nQm9va1xufSBmcm9tICcuLi8uLi91dGlscy9zdG9yZSc7XG5pbXBvcnQgdHlwZSB7IFByYWN0aWNlTW9kZSwgQ29uY3JldGVQcmFjdGljZU1vZGUsIEFjY2VudCwgU3R1ZHlNb2RlIH0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHsgdG9Db25jcmV0ZU1vZGUgfSBmcm9tICcuLi8uLi91dGlscy9zdG9yZSc7XG5pbXBvcnQgeyBnZXRCb29rQnlJZCB9IGZyb20gJy4uLy4uL3V0aWxzL3dvcmRTZXJ2aWNlJztcbmltcG9ydCB7IHdvcmRCb29rcyBhcyBsb2NhbEJvb2tzIH0gZnJvbSAnLi4vLi4vZGF0YS9pbmRleCc7XG5pbXBvcnQgeyBwbGF5QXVkaW8sIHByZWxvYWRBdWRpbyB9IGZyb20gJy4uLy4uL3V0aWxzL2F1ZGlvJztcbmltcG9ydCB7IHJlcG9ydFdvcmQsIGlzV29yZFJlcG9ydGVkLCBSZXBvcnRUeXBlIH0gZnJvbSAnLi4vLi4vdXRpbHMvd29yZFJlcG9ydCc7XG5pbXBvcnQgeyBjb2xsZWN0VG9kYXlSb3dzLCBzaG93RXhwb3J0U2hlZXQsIFRvZGF5Um93IH0gZnJvbSAnLi4vLi4vdXRpbHMvdG9kYXlFeHBvcnQnO1xuXG4vLyDlpI3kuaDmqKHlvI/kuIDmrKHmgKflhaXlj6PmoIflv5fvvIjpppbpobXigJzlvoXlpI3kuaDigJ3ngrnlh7vml7blhpnlhaXvvIx3b3JkcyDpobUgb25TaG93IOa2iOi0ue+8iVxuY29uc3QgUkVWSUVXX01PREVfS0VZID0gJ2JjX3Jldmlld19tb2RlJztcblxuLy8g6K6w5b+G5L2T5qOA6auY5Y2x6K+N5LiA6L2u5byP5YWl5Y+j5qCH5b+X77yIbWVtb3J5IOmhteOAjOeri+WNs+WkjeS5oOi/meS6m+ivjeOAjeWGmeWFpe+8jHdvcmRzIOmhtSBvblNob3cg5raI6LS577yJXG4vLyDlgLzvvJp7IGJvb2tJZDogc3RyaW5nLCB3b3Jkczogc3RyaW5nW10gfe+8jOS4juacrOivjeS5puWMuemFjeaJjeeUn+aViFxuY29uc3QgTUVNT1JZX1dPUkRTX0tFWSA9ICdiY19tZW1vcnlfd29yZHMnO1xuLy8g6aaW6aG14oCc5a2m5paw6K+N4oCd5YWl5Y+j5qCH5b+X77yI5LiA5qyh5oCn77yJ77ya5by65Yi25byA5paw5LiA6L2u77yM5LiN6LWw4oCc5pWw5o2u5pyq5Y+Y6Lez6L+H6YeN5bu64oCd5a6I5Y2rXG5jb25zdCBORVdfUk9VTkRfS0VZID0gJ2JjX25ld19yb3VuZCc7XG5cbi8vIOKAnOS7iuaXpeWkjeebmOKAneWFpeWPo+agh+W/l++8iOS4gOasoeaAp++8ie+8muacrOi9ruWPquWkjeebmOS7iuWkqeWtpui/h+eahOivje+8iOaIkeeahOmhtS/pppbpobXlhpnlhaXvvIlcbmNvbnN0IFRPREFZX1JFVklFV19LRVkgPSAnYmNfdG9kYXlfcmV2aWV3JztcblxuLy8g5Zub6YCJ5LiA6YCJ6aG55o6l5Y+jXG5pbnRlcmZhY2UgQ2hvaWNlT3B0aW9uIHtcbiAgbWVhbmluZzogc3RyaW5nO1xuICBpc0NvcnJlY3Q6IGJvb2xlYW47XG59XG5cblBhZ2Uoe1xuICBkYXRhOiB7XG4gICAgLy8g5b2T5YmN6K+N5Lmm5L+h5oGvXG4gICAgYm9va05hbWU6ICfliJ3kuK3or43msYcnLFxuICAgIGJvb2tUb3RhbDogMCxcbiAgICAvLyDmnKzova7ljZXor43pmJ/liJdcbiAgICBxdWV1ZTogW10gYXMgV29yZEl0ZW1bXSxcbiAgICBjdXJyZW50SW5kZXg6IDAsXG4gICAgLy8g5piv5ZCm5pi+56S66YeK5LmJ77yI5Y2h54mH5qih5byP55So77yJXG4gICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgIC8vIOacrOi9ruWtpuS5oOi/m+W6plxuICAgIGtub3duQ291bnQ6IDAsXG4gICAgdW5rbm93bkNvdW50OiAwLFxuICAgIHRvdGFsQ291bnQ6IDAsXG4gICAgLy8g5b6F5aSN5Lmg5pWwXG4gICAgZHVlQ291bnQ6IDAsXG4gICAgbWFzdGVyZWRDb3VudDogMCxcbiAgICAvLyDnirbmgIHmoIfnrb5cbiAgICBzdGF0dXNMYWJlbDogJ+aWsOivjScsXG4gICAgLy8g5piv5ZCm6L+Y5pyJ5pu05aSaXG4gICAgaGFzTW9yZTogdHJ1ZSxcbiAgICAvLyDliqDovb3nirbmgIFcbiAgICBsb2FkaW5nOiB0cnVlLFxuICAgIC8vIOWtpuS5oOiMg+WbtOetm+mAie+8iOWFqOmDqC/pq5jpopEv6Jma6K+NL+Wunuivje+8iVxuICAgIHN0dWR5TW9kZTogJ2FsbCcgYXMgU3R1ZHlNb2RlLFxuICAgIC8vIOavj+i9ruWtpuS5oOWNleivjeaVsO+8iOmhtumDqOaMiemSruWPr+iwg++8iVxuICAgIGJhdGNoU2l6ZTogMTAsXG4gICAgLy8g6auY6aKR6K+N5pWw6YePXG4gICAgaGlnaEZyZXFDb3VudDogMCxcbiAgICAvLyDomZror40v5a6e6K+N5pWw6YePXG4gICAgZnVuY0NvdW50OiAwLFxuICAgIGNvbnRlbnRDb3VudDogMCxcbiAgICAvLyDlrabkuaDojIPlm7TmoIfnrb7vvIh3eG1sIOWxleekuu+8iVxuICAgIHdvcmRDbGFzc0xhYmVsOiAn5YWo6YOoJyxcbiAgICBjdXJyZW50Qm9va0lkOiAnanVuaW9yJyxcbiAgICAvLyByZW1pbmRlclN1YnNjcmliZWQ6IGZhbHNlLCAvLyDlrabkuaDmj5DphpLlt7LkuIvnur/vvIgyMDI2LTA4LTMx77yJXG4gICAgLy8g4pSA4pSA4pSAIOmYtuauteS4gOaWsOWiniDilIDilIDilIBcbiAgICAvLyDnu4PkuaDmqKHlvI/vvJrljaHniYfnv7vpnaIgLyDlm5vpgInkuIAgLyDmi7zlhpkgLyDmt7flkIjvvIhtaXjvvIlcbiAgICBwcmFjdGljZU1vZGU6ICdjYXJkJyBhcyBQcmFjdGljZU1vZGUsXG4gICAgLy8g5b2T5YmN6K+N5a6e6ZmF5riy5p+T55qE5Ye66aKY5pa55byP77yIbWl4IOaooeW8j+S4i+avj+S4quivjemaj+acuu+8jOWFtuS9meS4jiBwcmFjdGljZU1vZGUg5LiA6Ie077yJXG4gICAgYWN0aXZlTW9kZTogJ2NhcmQnIGFzIENvbmNyZXRlUHJhY3RpY2VNb2RlLFxuICAgIC8vIOWbm+mAieS4gOmAiemhuVxuICAgIGNob2ljZU9wdGlvbnM6IFtdIGFzIENob2ljZU9wdGlvbltdLFxuICAgIC8vIOWbm+mAieS4gOaYr+WQpuW3sumAiVxuICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAvLyDlm5vpgInkuIDmmK/lkKbnrZTlr7lcbiAgICBjaG9pY2VDb3JyZWN0OiBmYWxzZSxcbiAgICAvLyDmi7zlhpnmqKHlvI/ovpPlhaXlgLxcbiAgICBzcGVsbElucHV0OiAnJyxcbiAgICAvLyDmi7zlhpnlj43ppojnirbmgIHvvJpub25lIC8gY29ycmVjdCAvIHdyb25nXG4gICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgIC8vIOWPkemfs+WPo+mfs+WBj+WlvVxuICAgIGFjY2VudDogJ3VzJyBhcyBBY2NlbnQsXG4gICAgLy8g57uT5p6c6aG1XG4gICAgc2hvd1Jlc3VsdDogZmFsc2UsXG4gICAgcmVzdWx0UmF0ZTogMCxcbiAgICByZXN1bHRQcmFpc2U6ICcnLFxuICAgIC8vIOe/u+mdouWKqOeUu+eKtuaAgVxuICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgLy8g5Y2h54mH5qih5byP44CM5LiN6K6k6K+G44CN5o+t56S6562U5qGI54q25oCB77yIdHJ1ZSDml7blsZXnpLrjgIzkuIvkuIDkuKrjgI3mjInpkq7lubbplIHlrprnv7vpnaLvvIlcbiAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgIC8vIOS4iuS4gOmimOWvuemUme+8iOeUqOS6jue7k+aenOmhteWIpOaWreaYr+WQpuiusOW9le+8iVxuICAgIF93b3JkQm9va1dvcmRzOiBbXSBhcyBXb3JkSXRlbVtdLFxuICAgIC8vIOWIl+ihqOaooeW8j++8muavj+ivjeS9nOetlOeKtuaAge+8iHdvcmQg4oaSICdrbm93bicgfCAndW5rbm93bifvvInvvIzorqTor4bnmoTor43mipjlj6Dnva7ngbBcbiAgICBsaXN0QW5zd2VyZWQ6IHt9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG4gICAgLy8g5Ye66aKY6aG65bqP77ya6ZqP5py6IC8g6aG65bqPXG4gICAgb3JkZXJNb2RlOiAncmFuZG9tJyBhcyAncmFuZG9tJyB8ICdzZXF1ZW50aWFsJyxcbiAgICAvLyDilIDilIDilIAg5Ye66aKY5qih5byP5LiL5ouJ5qGGIOKUgOKUgOKUgFxuICAgIG1vZGVMYWJlbHM6IFsn5Y2h54mHJywgJ+mAieaLqScsICfmi7zlhpknLCAn5re35ZCIJywgJ+WIl+ihqCddIGFzIHN0cmluZ1tdLFxuICAgIG1vZGVJbmRleDogMCxcbiAgICAvLyDilIDilIDilIAg6Ieq5a6a5LmJ6YCJ5oup5by55qGGIOKUgOKUgOKUgFxuICAgIHNob3dTaGVldDogZmFsc2UsXG4gICAgc2hlZXRUaXRsZTogJycsXG4gICAgc2hlZXRPcHRpb25zOiBbXSBhcyBBcnJheTx7IGxhYmVsOiBzdHJpbmc7IGFjdGl2ZTogYm9vbGVhbiB9PixcbiAgICBzaGVldFR5cGU6ICcnIGFzIHN0cmluZyxcbiAgICAvLyDilIDilIDilIAg57qg6ZSZ5LiK5oqlIOKUgOKUgOKUgFxuICAgIHNob3dSZXBvcnQ6IGZhbHNlLFxuICAgIHJlcG9ydFR5cGU6ICcnIGFzIFJlcG9ydFR5cGUgfCAnJyxcbiAgICByZXBvcnREZXNjOiAnJyxcbiAgICByZXBvcnRlZE1hcDoge30gYXMgUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gLy8g5bey5LiK5oql6K+N77yId29yZCDihpIgdHJ1Ze+8iVxuICB9LFxuXG4gIG9uTG9hZCgpIHt9LFxuXG4gIC8vIOacrOi9ruW3suS9nOetlOeahOS4i+agh+mbhuWQiO+8iOS/ruWkjeWIh+aooeW8j+WQjuWQjOS4gOivjemHjeWkjeiuoeaVsOeahCBidWfvvIlcbiAgX2Fuc3dlcmVkU2V0OiBuZXcgU2V0PG51bWJlcj4oKSBhcyBTZXQ8bnVtYmVyPixcblxuICBvblNob3coKSB7XG4gICAgLy8g5LuO5YiG5Lqr5rW35oql6aG16L+U5Zue77ya5L+d55WZ5b2T5YmN5LiA6L2u57uT5p6c77yM5LiN6YeN5paw5Yqg6L295paw55qE5LiA6L2uXG4gICAgaWYgKHRoaXMuX3NraXBJbml0T25TaG93KSB7XG4gICAgICB0aGlzLl9za2lwSW5pdE9uU2hvdyA9IGZhbHNlO1xuICAgICAgaWYgKHRoaXMuX3Jlc3RvcmVSZXN1bHRPblNob3cpIHtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgc2hvd1Jlc3VsdDogdHJ1ZSB9KTtcbiAgICAgIH1cbiAgICAgIHRoaXMuX3Jlc3RvcmVSZXN1bHRPblNob3cgPSBmYWxzZTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8g5raI6LS56aaW6aG14oCc5b6F5aSN5Lmg4oCd5YWl5Y+j5qCH5b+X77ya5pys6L2u5LuF5aSN5Lmg5Yiw5pyf5b6F5aSN5Lmg6K+N77yI5LiA5qyh5oCn77yJXG4gICAgaWYgKHd4LmdldFN0b3JhZ2VTeW5jKFJFVklFV19NT0RFX0tFWSkgPT09IDEpIHtcbiAgICAgIHd4LnJlbW92ZVN0b3JhZ2VTeW5jKFJFVklFV19NT0RFX0tFWSk7XG4gICAgICB0aGlzLl9yZXZpZXdNb2RlID0gdHJ1ZTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fcmV2aWV3TW9kZSA9IGZhbHNlO1xuICAgIH1cbiAgICAvLyDmtojotLnorrDlv4bkvZPmo4DlhaXlj6PmoIflv5fvvJrmnKzova7lj6rlpI3kuaDkvZPmo4DmuIXljZXph4znmoTpq5jljbHor43vvIjkuIDmrKHmgKfvvIzot6jor43kuabkuKLlvIPvvIlcbiAgICBjb25zdCBtZW1GbGFnID0gd3guZ2V0U3RvcmFnZVN5bmMoTUVNT1JZX1dPUkRTX0tFWSkgYXMgeyBib29rSWQ6IHN0cmluZzsgd29yZHM6IHN0cmluZ1tdIH0gfCAnJztcbiAgICB3eC5yZW1vdmVTdG9yYWdlU3luYyhNRU1PUllfV09SRFNfS0VZKTtcbiAgICBpZiAoXG4gICAgICBtZW1GbGFnICYmIHR5cGVvZiBtZW1GbGFnID09PSAnb2JqZWN0JyAmJlxuICAgICAgbWVtRmxhZy5ib29rSWQgPT09IGdldEN1cnJlbnRCb29rSWQoKSAmJlxuICAgICAgQXJyYXkuaXNBcnJheShtZW1GbGFnLndvcmRzKSAmJiBtZW1GbGFnLndvcmRzLmxlbmd0aCA+IDBcbiAgICApIHtcbiAgICAgIHRoaXMuX21lbW9yeVdvcmRzID0gbWVtRmxhZy53b3JkcztcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5fbWVtb3J5V29yZHMgPSBudWxsO1xuICAgIH1cbiAgICAvLyDpppbpobXkuLvliqjngrnigJzlrabmlrDor43igJ3vvJrlvLrliLblvIDmlrDkuIDova7vvIjmuIXmjonph43lu7rlrojljavnmoQga2V577yJXG4gICAgaWYgKHd4LmdldFN0b3JhZ2VTeW5jKE5FV19ST1VORF9LRVkpID09PSAxKSB7XG4gICAgICB3eC5yZW1vdmVTdG9yYWdlU3luYyhORVdfUk9VTkRfS0VZKTtcbiAgICAgIHRoaXMuX2xvYWRlZEtleSA9ICcnO1xuICAgIH1cblxuICAgIC8vIOa2iOi0ueKAnOS7iuaXpeWkjeebmOKAneWFpeWPo+agh+W/l++8muacrOi9ruWPquWkjeebmOS7iuWkqeWtpui/h+eahOivje+8iOS4gOasoeaAp++8iVxuICAgIGlmICh3eC5nZXRTdG9yYWdlU3luYyhUT0RBWV9SRVZJRVdfS0VZKSA9PT0gMSkge1xuICAgICAgd3gucmVtb3ZlU3RvcmFnZVN5bmMoVE9EQVlfUkVWSUVXX0tFWSk7XG4gICAgICB0aGlzLl90b2RheVJldmlld01vZGUgPSB0cnVlO1xuICAgICAgdGhpcy5fbG9hZGVkS2V5ID0gJyc7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuX3RvZGF5UmV2aWV3TW9kZSA9IGZhbHNlO1xuICAgIH1cblxuICAgIC8vIOmmluasoeS9v+eUqO+8mui3s+i9rOivjeS5pumAieaLqemhtVxuICAgIGlmICghaGFzU2VsZWN0ZWRCb29rKCkpIHtcbiAgICAgIHd4Lm5hdmlnYXRlVG8oeyB1cmw6ICcvcGFnZXMvYm9va2xpc3QvYm9va2xpc3QnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgY3VycmVudEJvb2tJZDogZ2V0Q3VycmVudEJvb2tJZCgpLFxuICAgICAgcHJhY3RpY2VNb2RlOiBnZXRQcmFjdGljZU1vZGUoKSxcbiAgICAgIG1vZGVJbmRleDogWydjYXJkJywgJ2Nob2ljZScsICdzcGVsbCcsICdtaXgnLCAnbGlzdCddLmluZGV4T2YoZ2V0UHJhY3RpY2VNb2RlKCkpLFxuICAgICAgYWNjZW50OiBnZXRBY2NlbnQoKSxcbiAgICAgIG9yZGVyTW9kZTogZ2V0T3JkZXJNb2RlKClcbiAgICAgIC8vIHJlbWluZGVyU3Vic2NyaWJlZDogaXNSZW1pbmRlclN1YnNjcmliZWQoKSAvLyDlrabkuaDmj5DphpLlt7LkuIvnur/vvIgyMDI2LTA4LTMx77yJXG4gICAgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICBvblVubG9hZCgpIHtcbiAgICAvLyDpobXpnaLljbjovb3ml7bmuIXnkIbpn7PpopHkuIrkuIvmlofvvIjlpoLmnpzmnInvvIlcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG4gIH0sXG5cbiAgYXN5bmMgaW5pdEJhdGNoKCkge1xuICAgIC8vIOS7iuaXpeWkjeebmOi9ru+8mumYn+WIlyA9IOS7iuWkqeWtpui/h+eahOivje+8iOi3qOivjeS5pu+8ie+8jOS4jei1sOW4uOinhOaOkueoi1xuICAgIGlmICh0aGlzLl90b2RheVJldmlld01vZGUpIHtcbiAgICAgIHRoaXMuX3RvZGF5UmV2aWV3TW9kZSA9IGZhbHNlO1xuICAgICAgY29uc3Qgb2sgPSBhd2FpdCB0aGlzLl9pbml0VG9kYXlCYXRjaCgpO1xuICAgICAgaWYgKCFvaykgYXdhaXQgdGhpcy5faW5pdE5vcm1hbEJhdGNoKCk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHJldHVybiB0aGlzLl9pbml0Tm9ybWFsQmF0Y2goKTtcbiAgfSxcblxuICAvLyDku4rml6XlpI3nm5jova7vvJrmiorku4rlpKnlrabov4fnmoTor43ph43liLfkuIDpgY3vvIjkuI3orqTor4bnmoTmjpLliY3pnaLvvIzpu5jorqTliJfooajmqKHlvI/vvIlcbiAgYXN5bmMgX2luaXRUb2RheUJhdGNoKCk6IFByb21pc2U8Ym9vbGVhbj4ge1xuICAgIGNvbnN0IHRvZGF5cyA9IGdldFRvZGF5TGVhcm5lZFdvcmRzKCk7XG4gICAgaWYgKHRvZGF5cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5LuK5aSp6L+Y5rKh5pyJ5a2m5Lmg6K6w5b2V77yM5YWI5a2m5Yeg5Liq6K+N5ZCnJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICAvLyDmjIkgYm9va0lkIOWIhue7hOaLieivjeS5pu+8jOaYoOWwhOWbnuWujOaVtOivjeadoe+8iOaLv+mHiuS5iS/pn7PmoIcv6K+N5qC577yJXG4gICAgY29uc3QgYnlCb29rID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZ1tdPigpO1xuICAgIGZvciAoY29uc3QgdCBvZiB0b2RheXMpIHtcbiAgICAgIGNvbnN0IGFyciA9IGJ5Qm9vay5nZXQodC5ib29rSWQpIHx8IFtdO1xuICAgICAgYXJyLnB1c2godC53b3JkKTtcbiAgICAgIGJ5Qm9vay5zZXQodC5ib29rSWQsIGFycik7XG4gICAgfVxuICAgIGNvbnN0IHF1ZXVlOiBXb3JkSXRlbVtdID0gW107XG4gICAgY29uc3QgYWxsV29yZHM6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCB1bmtub3duU2V0ID0gbmV3IFNldChcbiAgICAgIHRvZGF5cy5maWx0ZXIodCA9PiAhdC5rbm93bikubWFwKHQgPT4gdC53b3JkLnRvTG93ZXJDYXNlKCkpXG4gICAgKTtcbiAgICBmb3IgKGNvbnN0IFtiaWQsIHdvcmRzXSBvZiBieUJvb2spIHtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJvb2sgPSBhd2FpdCBnZXRCb29rQnlJZChiaWQpO1xuICAgICAgICBpZiAoIWJvb2spIGNvbnRpbnVlO1xuICAgICAgICBhbGxXb3Jkcy5wdXNoKC4uLmJvb2sud29yZHMpO1xuICAgICAgICBjb25zdCB3c2V0ID0gbmV3IFNldCh3b3Jkcy5tYXAodyA9PiB3LnRvTG93ZXJDYXNlKCkpKTtcbiAgICAgICAgZm9yIChjb25zdCB3IG9mIGJvb2sud29yZHMpIHtcbiAgICAgICAgICBpZiAod3NldC5oYXMody53b3JkLnRvTG93ZXJDYXNlKCkpKSBxdWV1ZS5wdXNoKHcpO1xuICAgICAgICB9XG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1vku4rml6XlpI3nm5hdIOivjeS5puWKoOi9veWksei0pScsIGJpZCwgZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChxdWV1ZS5sZW5ndGggPT09IDApIHJldHVybiBmYWxzZTtcbiAgICAvLyDkuI3orqTor4bnmoTmjpLliY3pnaLvvIznrZTmvI/nmoTkvJjlhYjooaVcbiAgICBxdWV1ZS5zb3J0KChhLCBiKSA9PlxuICAgICAgKHVua25vd25TZXQuaGFzKGIud29yZC50b0xvd2VyQ2FzZSgpKSA/IDEgOiAwKSAtICh1bmtub3duU2V0LmhhcyhhLndvcmQudG9Mb3dlckNhc2UoKSkgPyAxIDogMClcbiAgICApO1xuXG4gICAgdGhpcy5fY2xlYXJSZXZlYWxUaW1lcigpO1xuICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgdGhpcy5fbmV3V29yZFNldCA9IG5ldyBTZXQ8c3RyaW5nPigpOyAvLyDlpI3nm5jkuI3orqHlhaXntK/orqHmlrDor41cbiAgICBjb25zdCByZXBvcnRlZE1hcDogUmVjb3JkPHN0cmluZywgYm9vbGVhbj4gPSB7fTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgcXVldWUpIHtcbiAgICAgIGlmIChpc1dvcmRSZXBvcnRlZCh3LndvcmQpKSByZXBvcnRlZE1hcFt3LndvcmRdID0gdHJ1ZTtcbiAgICB9XG4gICAgY29uc3QgcHJvZ3Jlc3NTdGF0cyA9IGdldEJvb2tQcm9ncmVzc1N0YXRzKGdldEN1cnJlbnRCb29rSWQoKSk7XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGJvb2tOYW1lOiAn5LuK5pel5aSN55uYJyxcbiAgICAgIHF1ZXVlLFxuICAgICAgX3dvcmRCb29rV29yZHM6IGFsbFdvcmRzLFxuICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICBrbm93bkNvdW50OiAwLFxuICAgICAgdW5rbm93bkNvdW50OiAwLFxuICAgICAgdG90YWxDb3VudDogcXVldWUubGVuZ3RoLFxuICAgICAgZHVlQ291bnQ6IHByb2dyZXNzU3RhdHMuZHVlQ291bnQsXG4gICAgICBtYXN0ZXJlZENvdW50OiBwcm9ncmVzc1N0YXRzLm1hc3RlcmVkQ291bnQsXG4gICAgICBzdGF0dXNMYWJlbDogJ+WkjeebmCcsXG4gICAgICBoYXNNb3JlOiBmYWxzZSxcbiAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgc2hvd1Jlc3VsdDogZmFsc2UsXG4gICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIGxpc3RBbnN3ZXJlZDoge30sXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICB9KTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfSxcblxuICBhc3luYyBfaW5pdE5vcm1hbEJhdGNoKCkge1xuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICBjb25zdCBzdHVkeU1vZGUgPSBnZXRTdHVkeU1vZGUoKTtcbiAgICBjb25zdCBwcmFjdGljZU1vZGUgPSBnZXRQcmFjdGljZU1vZGUoKTtcbiAgICBjb25zdCBhY2NlbnQgPSBnZXRBY2NlbnQoKTtcbiAgICBjb25zdCBiYXRjaFNpemUgPSBnZXRCYXRjaFNpemUoKTtcblxuICAgIC8vIOmhtemdouW3suacieaVsOaNruS4lOivjeS5pi/orr7nva7pg73msqHlj5jml7bvvIzot7Pov4fph43lu7rvvIzpgb/lhY0gb25TaG93IOmHjeWkjei/m+WFpeaXtuaVtOmhtemXquS4gOasoVwi6YeN5paw5Yqg6L29XCJcbiAgICBjb25zdCBvcmRlck1vZGUgPSBnZXRPcmRlck1vZGUoKTtcbiAgICBjb25zdCB3b3JkQ2xhc3NMYWJlbHM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7IGFsbDogJ+WFqOmDqCcsIGhpZ2hGcmVxOiAn6auY6aKR6K+NJywgZnVuYzogJ+iZmuivjScsIGNvbnRlbnQ6ICflrp7or40nIH07XG4gICAgY29uc3Qgc2V0dGluZ3NLZXkgPSBbYm9va0lkLCBzdHVkeU1vZGUsIHByYWN0aWNlTW9kZSwgYWNjZW50LCBiYXRjaFNpemUsIG9yZGVyTW9kZV0uam9pbignfCcpO1xuICAgIGlmIChcbiAgICAgIHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPiAwICYmICF0aGlzLmRhdGEuc2hvd1Jlc3VsdCAmJlxuICAgICAgIXRoaXMuX3Jldmlld01vZGUgJiYgIXRoaXMuX21lbW9yeVdvcmRzICYmXG4gICAgICB0aGlzLl9sb2FkZWRLZXkgPT09IHNldHRpbmdzS2V5XG4gICAgKSB7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHRoaXMuX2xvYWRlZEtleSA9IHNldHRpbmdzS2V5O1xuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcblxuICAgIC8vIOmhtemdouW3suacieWGheWuue+8iOaNouS5pi/lvIDmlrDova7vvInvvJrkuI3ov5sgbG9hZGluZyDmgIHvvIzkv53mjIHml6fljaHniYflj6/op4HvvIxcbiAgICAvLyDpmJ/liJflsLHnu6rlkI7kuIDmrKHmgKfmm7/mjaLvvIzlrp7njrBcIuW5s+eos+aNoui9rlwi5peg6Zeq5Yqo77yb5LuF6aaW5qyh6L+b5YWl5omN5pi+56S65Yqg6L295Yqo55S7XG4gICAgaWYgKHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGxvYWRpbmc6IHRydWUsIHN0dWR5TW9kZSwgcHJhY3RpY2VNb2RlLCBhY2NlbnQsIGJhdGNoU2l6ZSwgb3JkZXJNb2RlLCB3b3JkQ2xhc3NMYWJlbDogd29yZENsYXNzTGFiZWxzW3N0dWR5TW9kZV0gfHwgJ+WFqOmDqCcgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHN0dWR5TW9kZSwgcHJhY3RpY2VNb2RlLCBhY2NlbnQsIGJhdGNoU2l6ZSwgb3JkZXJNb2RlLCB3b3JkQ2xhc3NMYWJlbDogd29yZENsYXNzTGFiZWxzW3N0dWR5TW9kZV0gfHwgJ+WFqOmDqCcgfSk7XG4gICAgfVxuXG4gICAgbGV0IGJvb2s7XG4gICAgdHJ5IHtcbiAgICAgIGJvb2sgPSBhd2FpdCBnZXRCb29rQnlJZChib29rSWQpO1xuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ+iOt+WPluivjeS5puWksei0pScsIGUpO1xuICAgIH1cblxuICAgIGlmICghYm9vayB8fCAhYm9vay53b3JkcyB8fCBib29rLndvcmRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgLy8g5LqR56uv5ouJ5Y+W5aSx6LSl77yM5bCd6K+V5pys5Zyw56eN5a2Q6K+N5bqT5YWc5bqVXG4gICAgICBjb25zdCBsb2NhbEJvb2sgPSBsb2NhbEJvb2tzLmZpbmQoYiA9PiBiLmlkID09PSBib29rSWQpO1xuICAgICAgaWYgKGxvY2FsQm9vayAmJiBsb2NhbEJvb2sud29yZHMubGVuZ3RoID4gMCkge1xuICAgICAgICBib29rID0gbG9jYWxCb29rO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgbG9hZGluZzogZmFsc2UsIHF1ZXVlOiBbXSB9KTtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfor43lupPliqDovb3kuK3vvIzpqazkuIrlsLHlpb0nLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDlpI3kuaAv6K6w5b+G5L2T5qOA5qih5byP57uV6L+H6K+N5oCn562b6YCJ77ya5b6F5aSN5Lmg55qE6K+N5LiN6K+l6KKr4oCc6IyD5Zu0OuiZmuivjeKAneetiei/h+a7pOaOie+8jFxuICAgIC8vIOWQpuWImeiuoeWIkumHjCA0MyDkuKrlvoXlpI3kuaDor40g4oipIOiZmuivjSA9IDAg5pe25Lya5Ye6546w4oCc6K+N5Lmm5bey5YWo6YOo5o6M5o+h4oCd55qE5YGH6LGhXG4gICAgY29uc3QgYnlwYXNzRmlsdGVyID0gdGhpcy5fcmV2aWV3TW9kZSB8fCAhIXRoaXMuX21lbW9yeVdvcmRzO1xuXG4gICAgLy8g5qC55o2u5a2m5Lmg6IyD5Zu0562b6YCJ77yI5YWo6YOoL+mrmOmikS/omZror40v5a6e6K+N77yJXG4gICAgY29uc3QgaGlnaEZyZXFDb3VudCA9IGJvb2sud29yZHMuZmlsdGVyKHcgPT4gdy5pc0hpZ2hGcmVxKS5sZW5ndGg7XG4gICAgY29uc3QgZnVuY0NvdW50ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyA9PT0gJ2Z1bmMnKS5sZW5ndGg7XG4gICAgY29uc3QgY29udGVudENvdW50ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyAhPT0gJ2Z1bmMnKS5sZW5ndGg7XG4gICAgbGV0IHdvcmRMaXN0OiBXb3JkSXRlbVtdO1xuICAgIGxldCBlbXB0eVRpcCA9ICcnO1xuICAgIGlmIChieXBhc3NGaWx0ZXIpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3JkcztcbiAgICB9IGVsc2UgaWYgKHN0dWR5TW9kZSA9PT0gJ2hpZ2hGcmVxJykge1xuICAgICAgd29yZExpc3QgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcuaXNIaWdoRnJlcSk7XG4gICAgICBlbXB0eVRpcCA9ICfov5nmnKzor43kuabmsqHmnInmoIfms6jpq5jpopHor40nO1xuICAgIH0gZWxzZSBpZiAoc3R1ZHlNb2RlID09PSAnZnVuYycpIHtcbiAgICAgIHdvcmRMaXN0ID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiB3LnBvc1RhZyA9PT0gJ2Z1bmMnKTtcbiAgICAgIC8vIOivjeadoeWujOWFqOayoeaciSBwb3NUYWcg5a2X5q61ID0g6K+N5Lmm5pWw5o2u5piv5pen54mI77yI5LqR56uv5pyq5pu05pawL+i1sOS6huenjeWtkOWFnOW6lS/nvJPlrZjmnKrlpLHmlYjvvIlcbiAgICAgIGlmICghYm9vay53b3Jkcy5zb21lKHcgPT4gJ3Bvc1RhZycgaW4gdykpIHtcbiAgICAgICAgZW1wdHlUaXAgPSAn6K+N5Lmm5pWw5o2u5pyq5YyF5ZCr6K+N5oCn5qCH5rOo77yM6K+35pu05paw6K+N5bqT5ZCO6YeN6K+VJztcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGVtcHR5VGlwID0gJ+i/meacrOivjeS5puaaguaXoOiZmuivjeagh+azqCc7XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChzdHVkeU1vZGUgPT09ICdjb250ZW50Jykge1xuICAgICAgd29yZExpc3QgPSBib29rLndvcmRzLmZpbHRlcih3ID0+IHcucG9zVGFnICE9PSAnZnVuYycpO1xuICAgICAgaWYgKCFib29rLndvcmRzLnNvbWUodyA9PiAncG9zVGFnJyBpbiB3KSkge1xuICAgICAgICBlbXB0eVRpcCA9ICfor43kuabmlbDmja7mnKrljIXlkKvor43mgKfmoIfms6jvvIzor7fmm7TmlrDor43lupPlkI7ph43or5UnO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgZW1wdHlUaXAgPSAn6L+Z5pys6K+N5Lmm5pqC5peg5a6e6K+N5qCH5rOoJztcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgd29yZExpc3QgPSBib29rLndvcmRzO1xuICAgIH1cblxuICAgIGlmICh3b3JkTGlzdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGxvYWRpbmc6IGZhbHNlLCBxdWV1ZTogW10sIGhpZ2hGcmVxQ291bnQsIGZ1bmNDb3VudCwgY29udGVudENvdW50IH0pO1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6IGVtcHR5VGlwLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgY29uc3QgYWxsUHJvZ3Jlc3MgPSBnZXRBbGxQcm9ncmVzcyhib29rSWQpO1xuICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG5cbiAgICAvLyDmnoTlu7rlrabkuaDpmJ/liJfvvJpcbiAgICAvLyAxLiDkvJjlhYjlj5blvoXlpI3kuaDnmoTor43vvIhuZXh0UmV2aWV3IDw9IG5vdyDkuJTkuI3mmK8gbWFzdGVyZWTvvIlcbiAgICAvLyAyLiDlj5bmnKrlrabov4fnmoTmlrDor41cbiAgICBjb25zdCBkdWVXb3JkczogV29yZEl0ZW1bXSA9IFtdO1xuICAgIGNvbnN0IG5ld1dvcmRzOiBXb3JkSXRlbVtdID0gW107XG5cbiAgICBmb3IgKGNvbnN0IHcgb2Ygd29yZExpc3QpIHtcbiAgICAgIGNvbnN0IHAgPSBhbGxQcm9ncmVzc1t3LndvcmRdO1xuICAgICAgaWYgKCFwKSB7XG4gICAgICAgIG5ld1dvcmRzLnB1c2godyk7XG4gICAgICB9IGVsc2UgaWYgKHAuc3RhdHVzICE9PSAnbWFzdGVyZWQnICYmIHAubmV4dFJldmlldyA+IDAgJiYgcC5uZXh0UmV2aWV3IDw9IG5vdykge1xuICAgICAgICBkdWVXb3Jkcy5wdXNoKHcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIOiAg+mikeaOkuW6j++8muaWsOivjeaMiSBFQ0RJQ1Qg6K+N6aKR6ZmN5bqP77yI5bi46KeB6K+N5YWI5a2m77yJ77yM5LyY5YWI5a2m5Lya6ICD6K+V6YeM5Ye6546w5pyA5aSa55qE6K+NXG4gICAgbmV3V29yZHMuc29ydCgoYSwgYikgPT4gKGIuZnJlcXVlbmN5IHx8IDApIC0gKGEuZnJlcXVlbmN5IHx8IDApKTtcblxuICAgIC8vIOWQiOW5tumYn+WIl++8mum7mOiupOS8mOWFiOWkjeS5oO+8jOWGjeWtpuaWsOivje+8m+WkjeS5oOaooeW8j+S4i+S7heWkjeS5oOWIsOacn+W+heWkjeS5oOivjVxuICAgIC8vIOmaj+acuuaooeW8j+S4i++8muaWsOivjeS7juivjeS5puWFqOmDqOacquWtpuivjeS4remaj+acuuaKveWPlu+8iOiAjOS4jeaYr+aMieivjemikeWPluWJjSBOIOS4qu+8jFxuICAgIC8vIOmBv+WFjei/nue7reWHoOi9rumBh+WIsOeahOmDveaYr+WQjOS4gOaJueivje+8ie+8jOWkjeS5oOivjeS7jeS8mOWFiOWNoOS9jVxuICAgIGxldCBxdWV1ZTtcbiAgICBpZiAodGhpcy5fcmV2aWV3TW9kZSkge1xuICAgICAgaWYgKGR1ZVdvcmRzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgICAvLyDmsqHmnInliLDmnJ/lvoXlpI3kuaDor43vvJrliIflm57luLjop4TlrabkuaDvvIzpgb/lhY3nqbrova5cbiAgICAgICAgdGhpcy5fcmV2aWV3TW9kZSA9IGZhbHNlO1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suWFqOmDqOWkjeS5oOWujO+8jOWIh+WbnuW4uOinhOWtpuS5oCcsIGljb246ICdub25lJyB9KTtcbiAgICAgICAgcXVldWUgPSBbLi4uZHVlV29yZHMsIC4uLm5ld1dvcmRzXS5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcXVldWUgPSBkdWVXb3Jkcy5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3JkZXJNb2RlID09PSAncmFuZG9tJykge1xuICAgICAgLy8g5aSN5Lmg6K+N5ZCM5qC35LuO5YWo6YOo5Yiw5pyf6K+N5Lit6ZqP5py65oq95Y+W77yI6ICM5LiN5piv5oyJ6K+N6KGo6aG65bqP5Y+W5YmNIE4g5Liq77yJXG4gICAgICBjb25zdCBkdWU6IFdvcmRJdGVtW10gPSBbXTtcbiAgICAgIGlmIChkdWVXb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnN0IHBvb2wgPSBbLi4uZHVlV29yZHNdO1xuICAgICAgICBjb25zdCB0YWtlID0gTWF0aC5taW4oYmF0Y2hTaXplLCBwb29sLmxlbmd0aCk7XG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGFrZTsgaSsrKSB7XG4gICAgICAgICAgY29uc3QgaiA9IGkgKyBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAocG9vbC5sZW5ndGggLSBpKSk7XG4gICAgICAgICAgY29uc3QgdCA9IHBvb2xbaV07IHBvb2xbaV0gPSBwb29sW2pdOyBwb29sW2pdID0gdDtcbiAgICAgICAgICBkdWUucHVzaChwb29sW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgY29uc3QgcmVtYWluaW5nID0gYmF0Y2hTaXplIC0gZHVlLmxlbmd0aDtcbiAgICAgIGNvbnN0IHNhbXBsZWROZXc6IFdvcmRJdGVtW10gPSBbXTtcbiAgICAgIGlmIChyZW1haW5pbmcgPiAwICYmIG5ld1dvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgY29uc3QgcG9vbCA9IFsuLi5uZXdXb3Jkc107XG4gICAgICAgIGNvbnN0IHRha2UgPSBNYXRoLm1pbihyZW1haW5pbmcsIHBvb2wubGVuZ3RoKTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0YWtlOyBpKyspIHtcbiAgICAgICAgICBjb25zdCBqID0gaSArIE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIChwb29sLmxlbmd0aCAtIGkpKTtcbiAgICAgICAgICBjb25zdCB0ID0gcG9vbFtpXTsgcG9vbFtpXSA9IHBvb2xbal07IHBvb2xbal0gPSB0O1xuICAgICAgICAgIHNhbXBsZWROZXcucHVzaChwb29sW2ldKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgcXVldWUgPSBbLi4uZHVlLCAuLi5zYW1wbGVkTmV3XTtcbiAgICB9IGVsc2Uge1xuICAgICAgcXVldWUgPSBbLi4uZHVlV29yZHMsIC4uLm5ld1dvcmRzXS5zbGljZSgwLCBiYXRjaFNpemUpO1xuICAgIH1cblxuICAgIC8vIOWmguaenOmYn+WIl+S4uuepuu+8iOayoeacieW+heWkjeS5oOS5n+ayoeacieaWsOivje+8ie+8jOWPluW3suaOjOaPoeeahOivjeWkjeS5oFxuICAgIGxldCBmaW5hbFF1ZXVlID0gcXVldWU7XG4gICAgaWYgKHF1ZXVlLmxlbmd0aCA9PT0gMCkge1xuICAgICAgY29uc3QgbWFzdGVyZWRXb3JkcyA9IHdvcmRMaXN0LmZpbHRlcigodykgPT4ge1xuICAgICAgICBjb25zdCBwID0gYWxsUHJvZ3Jlc3Nbdy53b3JkXTtcbiAgICAgICAgcmV0dXJuIHAgJiYgcC5zdGF0dXMgPT09ICdtYXN0ZXJlZCc7XG4gICAgICB9KTtcbiAgICAgIGZpbmFsUXVldWUgPSBtYXN0ZXJlZFdvcmRzLnNsaWNlKDAsIGJhdGNoU2l6ZSk7XG4gICAgfVxuXG4gICAgLy8g4pSA4pSA4pSAIOiusOW/huS9k+ajgOmrmOWNseivjei9ruasoe+8muimhueblumYn+WIl+S4uuS9k+ajgOa4heWNle+8iOS/neaMgeS9k+ajgOmHjOeahOWNsemZqemhuuW6j++8jOacgOWNsemZqeWcqOWJje+8iSDilIDilIDilIBcbiAgICAvLyDnlKjlhajph4/or43ooajljLnphY3vvIjkuI3otbAgc3R1ZHlNb2RlIOmrmOmikei/h+a7pO+8jOWQpuWImea4heWNleivjeWPr+iDveWFqOWGm+imhuayoeiAjOmdmem7mOWbnumAgOaIkOW4uOinhOi9ruasoe+8iVxuICAgIGxldCBtZW1BY3RpdmUgPSBmYWxzZTtcbiAgICBpZiAodGhpcy5fbWVtb3J5V29yZHMgJiYgKHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKS5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zdCBtZW1MZW4gPSAodGhpcy5fbWVtb3J5V29yZHMgYXMgc3RyaW5nW10pLmxlbmd0aDtcbiAgICAgIGNvbnN0IG1lbVNldCA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgICAgZm9yIChjb25zdCB3IG9mIHRoaXMuX21lbW9yeVdvcmRzIGFzIHN0cmluZ1tdKSBtZW1TZXQuYWRkKHcudG9Mb3dlckNhc2UoKSk7XG4gICAgICBjb25zdCBtYXRjaGVkID0gYm9vay53b3Jkcy5maWx0ZXIodyA9PiBtZW1TZXQuaGFzKHcud29yZC50b0xvd2VyQ2FzZSgpKSk7XG4gICAgICBpZiAobWF0Y2hlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgIGZpbmFsUXVldWUgPSAodGhpcy5fbWVtb3J5V29yZHMgYXMgc3RyaW5nW10pXG4gICAgICAgICAgLm1hcCgodzogc3RyaW5nKSA9PiBtYXRjaGVkLmZpbmQoKG06IFdvcmRJdGVtKSA9PiBtLndvcmQudG9Mb3dlckNhc2UoKSA9PT0gdy50b0xvd2VyQ2FzZSgpKSlcbiAgICAgICAgICAuZmlsdGVyKCh4OiBXb3JkSXRlbSB8IHVuZGVmaW5lZCk6IHggaXMgV29yZEl0ZW0gPT4gISF4KTtcbiAgICAgICAgbWVtQWN0aXZlID0gdHJ1ZTtcbiAgICAgICAgaWYgKGZpbmFsUXVldWUubGVuZ3RoIDwgbWVtTGVuKSB7XG4gICAgICAgICAgLy8g5riF5Y2V6YeM5pyJ6K+N5LiN5Zyo5b2T5YmN6K+N6KGo77yI5aaC6K+N5bqT5pu05paw6L+H77yJ77ya5aaC5a6e5o+Q56S677yM57y65aSx55qE5LiN6KGl5Yir55qE6K+NXG4gICAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6IGDmuIXljZXkuK0gJHttZW1MZW4gLSBmaW5hbFF1ZXVlLmxlbmd0aH0g5Liq6K+N5LiN5Zyo6K+N5Lmm77yM5bey6Lez6L+HYCwgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICAvLyDlhajpg6jljLnphY3kuI3kuIrvvIjmnoHlsJHop4HvvInvvJrkuI3pnZnpu5jlm57pgIDvvIzmmI7noa7lkYrnn6VcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfov5nlh6DkuKror43kuI3lnKjlvZPliY3or43kuabph4zvvIzlt7LliIflm57luLjop4TlrabkuaAnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLl9tZW1vcnlXb3JkcyA9IG51bGw7IC8vIOS4gOasoeaAp++8jOeUqOWQjuWNs+W8g1xuICAgIH1cblxuICAgIC8vIOWHuumimOmhuuW6j++8mumaj+acuuaooeW8j+aJk+S5semYn+WIl++8iOWkjeS5oOS8mOWFiC/lt6nlm7rpmJ/liJflnKjnu4TlhoXmiZPkubHvvIzkuI3mlLnlj5jkvJjlhYjnuqfvvJtcbiAgICAvLyDorrDlv4bkvZPmo4Dova7kv53mjIHljbHpmanpobrluo/kuI3kubHluo/vvIlcbiAgICBpZiAob3JkZXJNb2RlID09PSAncmFuZG9tJyAmJiAhbWVtQWN0aXZlICYmIGZpbmFsUXVldWUubGVuZ3RoID4gMSkge1xuICAgICAgZm9yIChsZXQgaSA9IGZpbmFsUXVldWUubGVuZ3RoIC0gMTsgaSA+IDA7IGktLSkge1xuICAgICAgICBjb25zdCBqID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKGkgKyAxKSk7XG4gICAgICAgIGNvbnN0IHQgPSBmaW5hbFF1ZXVlW2ldO1xuICAgICAgICBmaW5hbFF1ZXVlW2ldID0gZmluYWxRdWV1ZVtqXTtcbiAgICAgICAgZmluYWxRdWV1ZVtqXSA9IHQ7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8g6K6w5b2V5pys6L2u5ZOq5Lqb5piv6aaW5qyh5a2m5Lmg55qE5paw6K+N77yI5aSN5LmgL+W3qeWbuuS4jeiuoeWFpeKAnOe0r+iuoeWNleivjeKAne+8iVxuICAgIHRoaXMuX25ld1dvcmRTZXQgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgICBmb3IgKGNvbnN0IHcgb2YgZmluYWxRdWV1ZSkge1xuICAgICAgaWYgKG5ld1dvcmRzLmluZGV4T2YodykgPiAtMSkgdGhpcy5fbmV3V29yZFNldC5hZGQody53b3JkLnRvTG93ZXJDYXNlKCkpO1xuICAgIH1cblxuICAgIC8vIOW3suS4iuaKpeivjeagh+iusO+8iOWNoeeJh+iDjOmdouaYvuekuuOAjOW3suS4iuaKpeOAje+8iVxuICAgIGNvbnN0IHJlcG9ydGVkTWFwOiBSZWNvcmQ8c3RyaW5nLCBib29sZWFuPiA9IHt9O1xuICAgIGZvciAoY29uc3QgdyBvZiBmaW5hbFF1ZXVlKSB7XG4gICAgICBpZiAoaXNXb3JkUmVwb3J0ZWQody53b3JkKSkgcmVwb3J0ZWRNYXBbdy53b3JkXSA9IHRydWU7XG4gICAgfVxuXG4gICAgY29uc3QgcHJvZ3Jlc3NTdGF0cyA9IGdldEJvb2tQcm9ncmVzc1N0YXRzKGJvb2tJZCk7XG5cbiAgICAvLyDmlrDkuIDova7lvIDlp4vvvIzmuIXnqbrlt7LkvZznrZTmoIforrDvvIjkv67lpI3liIfmqKHlvI/lkI7lkIzkuIDor43ph43lpI3orqHmlbDnmoQgYnVn77yJXG4gICAgdGhpcy5fYW5zd2VyZWRTZXQgPSBuZXcgU2V0PG51bWJlcj4oKTtcblxuICAgIC8vIOeKtuaAgeagh+etvuaMieacrOi9rumYn+WIl+WunumZheaehOaIkOWIpOWumu+8muWFqOmDqOS4uuWIsOacn+ivjeaJjeaYr+OAjOWkjeS5oOOAje+8jFxuICAgIC8vIOa3t+WFpeaWsOivje+8iOWkjeS5oOivjeS8mOWFiOWNoOS9jSvmlrDor43ooaXpvZDvvInml7bmoIfjgIzmlrDor43jgI3vvIzpgb/lhY0gMSDkuKrlpI3kuaDor40rOSDkuKrmlrDor43or6/moIfmiJDlpI3kuaBcbiAgICBjb25zdCBkdWVXb3JkU2V0ID0gbmV3IFNldChkdWVXb3Jkcy5tYXAodyA9PiB3LndvcmQpKTtcbiAgICBjb25zdCBkdWVJblF1ZXVlID0gZmluYWxRdWV1ZS5maWx0ZXIodyA9PiBkdWVXb3JkU2V0Lmhhcyh3LndvcmQpKS5sZW5ndGg7XG4gICAgbGV0IHN0YXR1c0xhYmVsID0gJ+aWsOivjSc7XG4gICAgaWYgKG1lbUFjdGl2ZSkge1xuICAgICAgc3RhdHVzTGFiZWwgPSAn6auY5Y2x6K+NJztcbiAgICB9IGVsc2UgaWYgKGZpbmFsUXVldWUubGVuZ3RoID4gMCAmJiBkdWVJblF1ZXVlID09PSBmaW5hbFF1ZXVlLmxlbmd0aCkge1xuICAgICAgc3RhdHVzTGFiZWwgPSAn5aSN5LmgJztcbiAgICB9IGVsc2UgaWYgKGR1ZUluUXVldWUgPT09IDAgJiYgZHVlV29yZHMubGVuZ3RoID09PSAwICYmIG5ld1dvcmRzLmxlbmd0aCA9PT0gMCAmJiBmaW5hbFF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgIHN0YXR1c0xhYmVsID0gJ+W3qeWbuic7XG4gICAgfVxuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGJvb2tOYW1lOiBib29rLm5hbWUsXG4gICAgICBib29rVG90YWw6IHdvcmRMaXN0Lmxlbmd0aCxcbiAgICAgIGhpZ2hGcmVxQ291bnQsXG4gICAgICBmdW5jQ291bnQsXG4gICAgICBjb250ZW50Q291bnQsXG4gICAgICBxdWV1ZTogZmluYWxRdWV1ZSxcbiAgICAgIF93b3JkQm9va1dvcmRzOiB3b3JkTGlzdCxcbiAgICAgIGN1cnJlbnRJbmRleDogMCxcbiAgICAgIHNob3dNZWFuaW5nOiBmYWxzZSxcbiAgICAgIGlzRmxpcHBlZDogZmFsc2UsXG4gICAgICByZXZlYWxBZnRlclVua25vd246IGZhbHNlLFxuICAgICAga25vd25Db3VudDogMCxcbiAgICAgIHVua25vd25Db3VudDogMCxcbiAgICAgIHRvdGFsQ291bnQ6IGZpbmFsUXVldWUubGVuZ3RoLFxuICAgICAgZHVlQ291bnQ6IHByb2dyZXNzU3RhdHMuZHVlQ291bnQsXG4gICAgICBtYXN0ZXJlZENvdW50OiBwcm9ncmVzc1N0YXRzLm1hc3RlcmVkQ291bnQsXG4gICAgICBzdGF0dXNMYWJlbCxcbiAgICAgIGhhc01vcmU6IGZpbmFsUXVldWUubGVuZ3RoID49IGJhdGNoU2l6ZSxcbiAgICAgIGxvYWRpbmc6IGZhbHNlLFxuICAgICAgc2hvd1Jlc3VsdDogZmFsc2UsXG4gICAgICBzcGVsbElucHV0OiAnJyxcbiAgICAgIHNwZWxsRmVlZGJhY2s6ICdub25lJyxcbiAgICAgIGNob2ljZVNlbGVjdGVkOiAtMSxcbiAgICAgIGxpc3RBbnN3ZXJlZDoge30sXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIGlmIChmaW5hbFF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgICAvLyDpooTliqDovb3nrKzkuozkuKror43vvIznv7vpobXml7bnp5Llh7rlo7BcbiAgICAgICAgaWYgKGZpbmFsUXVldWUubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHByZWxvYWRBdWRpbyhmaW5hbFF1ZXVlWzFdLndvcmQsIGFjY2VudCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfSxcblxuICAvLyDlvZPliY3or43mmK/lkKblt7LkvZznrZTov4fvvIjpmLLliIfmqKHlvI/lkI7ph43lpI3orqHmlbDvvIlcbiAgX2NoZWNrQW5zd2VyZWQoKTogYm9vbGVhbiB7XG4gICAgaWYgKHRoaXMuX2Fuc3dlcmVkU2V0Lmhhcyh0aGlzLmRhdGEuY3VycmVudEluZGV4KSkgcmV0dXJuIHRydWU7XG4gICAgdGhpcy5fYW5zd2VyZWRTZXQuYWRkKHRoaXMuZGF0YS5jdXJyZW50SW5kZXgpO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfSxcblxuXG5cbiAgLy8g5YiH5o2i6K+N5Lmm77ya6L+b5YWl6K+N5Lmm6YCJ5oup6aG177yI5o6o6I2Q5Y2hICsg6ICD6K+VL+aVmeadkOWIhue7hOWIl+ihqO+8iVxuICBjaGFuZ2VCb29rKCkge1xuICAgIHd4Lm5hdmlnYXRlVG8oeyB1cmw6ICcvcGFnZXMvYm9va2xpc3QvYm9va2xpc3QnIH0pO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDljaHniYfnv7vpnaLmqKHlvI8g4pSA4pSA4pSAXG4gIC8vIOa8q+a4uOivjeaXj++8muW4puedgOW9k+WJjeivjei3s+i9rOWIsOivjeagueaYn+ezu1xuICBnb0dhbGF4eSgpIHtcbiAgICBjb25zdCB3ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghdykgcmV0dXJuO1xuICAgIHd4Lm5hdmlnYXRlVG8oe1xuICAgICAgdXJsOiBgL3BhZ2VzL2dhbGF4eS9nYWxheHk/d29yZD0ke2VuY29kZVVSSUNvbXBvbmVudCh3LndvcmQpfWBcbiAgICB9KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg57qg6ZSZ5LiK5oqlIOKUgOKUgOKUgFxuICBvcGVuUmVwb3J0KCkge1xuICAgIGNvbnN0IHcgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKCF3KSByZXR1cm47XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1JlcG9ydDogdHJ1ZSwgcmVwb3J0VHlwZTogJycsIHJlcG9ydERlc2M6ICcnIH0pO1xuICB9LFxuXG4gIGNsb3NlUmVwb3J0KCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXBvcnQ6IGZhbHNlIH0pO1xuICB9LFxuXG4gIG9uUmVwb3J0VHlwZShlOiBhbnkpIHtcbiAgICB0aGlzLnNldERhdGEoeyByZXBvcnRUeXBlOiBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC50eXBlIGFzIFJlcG9ydFR5cGUgfSk7XG4gIH0sXG5cbiAgb25SZXBvcnREZXNjKGU6IGFueSkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHJlcG9ydERlc2M6IGUuZGV0YWlsLnZhbHVlIH0pO1xuICB9LFxuXG4gIHN1Ym1pdFJlcG9ydCgpIHtcbiAgICBjb25zdCB3ID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICghdykgcmV0dXJuO1xuICAgIGlmICghdGhpcy5kYXRhLnJlcG9ydFR5cGUpIHtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn6K+35YWI6YCJ5oup6Zeu6aKY57G75Z6LJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVwb3J0V29yZCh3LndvcmQsIGJvb2tJZCwgdGhpcy5kYXRhLnJlcG9ydFR5cGUgYXMgUmVwb3J0VHlwZSwgdGhpcy5kYXRhLnJlcG9ydERlc2MpLnRoZW4oKHIpID0+IHtcbiAgICAgIGlmIChyLmFscmVhZHkpIHtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfov5nkuKrpl67popjlt7LmnInkurrmiqXov4fllaYnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICB9IGVsc2UgaWYgKHIub2spIHtcbiAgICAgICAgY29uc3QgcmVwb3J0ZWRNYXAgPSB7IC4uLnRoaXMuZGF0YS5yZXBvcnRlZE1hcCwgW3cud29yZF06IHRydWUgfTtcbiAgICAgICAgdGhpcy5zZXREYXRhKHsgc2hvd1JlcG9ydDogZmFsc2UsIHJlcG9ydGVkTWFwIH0pO1xuICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suWPl+eQhu+8jOaEn+iwouWFseW7uu+8gScsIGljb246ICdzdWNjZXNzJyB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5o+Q5Lqk5aSx6LSl77yM6K+35qOA5p+l572R57ucJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIGZsaXBDYXJkKCkge1xuICAgIC8vIOOAjOS4jeiupOivhuOAjeaPreekuuetlOahiOWQjuS5n+WFgeiuuOiHqueUsee/u+mdou+8iOWPr+e/u+Wbnuato+mdouWGjeeci+WNleivje+8ie+8jOa1geeoi+eUseOAjOS4i+S4gOS4quOAjeaMiemSruaOqOi/m1xuICAgIGNvbnN0IGZsaXBwZWQgPSAhdGhpcy5kYXRhLmlzRmxpcHBlZDtcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgaXNGbGlwcGVkOiBmbGlwcGVkLFxuICAgICAgc2hvd01lYW5pbmc6IGZsaXBwZWRcbiAgICB9KTtcbiAgICAvLyDnv7vliLDog4zpnaLml7boh6rliqjmkq3mlL7lj5Hpn7PvvIzlubbpooTliqDovb3kuIvkuIDkuKror41cbiAgICBpZiAoZmxpcHBlZCkge1xuICAgICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICAgIGNvbnN0IG5leHQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleCArIDFdO1xuICAgICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgICAgaWYgKG5leHQpIHByZWxvYWRBdWRpbyhuZXh0LndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgIH1cbiAgfSxcblxuICAvLyDilIDilIDilIAg5Y+R6Z+zIOKUgOKUgOKUgFxuICBvblBsYXlBdWRpbygpIHtcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgfSxcblxuICAvLyDliIfmjaLlj6Ppn7NcbiAgb25Ub2dnbGVBY2NlbnQoKSB7XG4gICAgY29uc3QgbmV3QWNjZW50OiBBY2NlbnQgPSB0aGlzLmRhdGEuYWNjZW50ID09PSAndXMnID8gJ3VrJyA6ICd1cyc7XG4gICAgc2V0QWNjZW50KG5ld0FjY2VudCk7XG4gICAgdGhpcy5zZXREYXRhKHsgYWNjZW50OiBuZXdBY2NlbnQgfSk7XG4gICAgd3guc2hvd1RvYXN0KHtcbiAgICAgIHRpdGxlOiBuZXdBY2NlbnQgPT09ICd1aycgPyAn6Iux6Z+z5qih5byPJyA6ICfnvo7pn7PmqKHlvI8nLFxuICAgICAgaWNvbjogJ25vbmUnXG4gICAgfSk7XG4gICAgLy8g5YiH5o2i5ZCO56uL5Y2z5pKt5pS+5b2T5YmN6K+NXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQud29yZCwgbmV3QWNjZW50KTtcbiAgfSxcblxuICAvLyDilIDilIDilIAg5Ye66aKY5pa55byP5bqU55So77yI5ZCr5re35ZCI5qih5byP6ZqP5py65pig5bCE77yJIOKUgOKUgOKUgFxuICAvLyDkuLrlvZPliY3or43noa7lrprlrp7pmYXlh7rpopjmlrnlvI/lubbph43nva7nrZTpopjnirbmgIHvvJvljaHniYfmqKHlvI/kv53nlZnnv7vpnaLlu7bnu63vvIjph4rkuYnpnaLmnJ3kuIrliIfor43vvIlcbiAgX2FwcGx5TW9kZUZvckN1cnJlbnQoKSB7XG4gICAgY29uc3QgbW9kZSA9IHRvQ29uY3JldGVNb2RlKHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpO1xuICAgIGNvbnN0IGtlZXBGbGlwID0gdGhpcy5kYXRhLmlzRmxpcHBlZCAmJiB0aGlzLmRhdGEucHJhY3RpY2VNb2RlID09PSAnY2FyZCc7XG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICAvLyDliIfor43ooaXkuIDmrKHnnJ/lrp7nv7vpnaLvvJrlhYjnn63mmoLlm57mraPpnaLvvIzkuIvkuIDluKflho3nv7vlm57ph4rkuYnpnaLvvIxcbiAgICAvLyDmtojpmaTigJzmjaLor43ml7bljaHniYflg4/msqHnv7vov4fmnaXigJ3nmoTlm7Dmg5HvvIjkv53nlZnliIfor43kv53mjIHph4rkuYnpnaLnmoTorr7orqHvvIlcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7IC8vIOWIh+aooeW8jy/liIfor43ml7blj5bmtojigJzkuI3orqTor4boh6rliqjot7PigJ3lrprml7blmajvvIzpmLLot7Por43nq57mgIFcbiAgICBjb25zdCBmbGlwQmFzZSA9IGtlZXBGbGlwID8geyBpc0ZsaXBwZWQ6IGZhbHNlLCBzaG93TWVhbmluZzogZmFsc2UgfSA6IHt9O1xuICAgIGNvbnN0IGZsaXBCYWNrID0gKCkgPT4ge1xuICAgICAgaWYgKCFrZWVwRmxpcCkgcmV0dXJuO1xuICAgICAgd3gubmV4dFRpY2soKCkgPT4ge1xuICAgICAgICB0aGlzLnNldERhdGEoeyBpc0ZsaXBwZWQ6IHRydWUsIHNob3dNZWFuaW5nOiB0cnVlIH0pO1xuICAgICAgfSk7XG4gICAgfTtcbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgYWN0aXZlTW9kZTogbW9kZSxcbiAgICAgIC4uLmZsaXBCYXNlLFxuICAgICAgcmV2ZWFsQWZ0ZXJVbmtub3duOiBmYWxzZSxcbiAgICAgIHNwZWxsSW5wdXQ6ICcnLFxuICAgICAgc3BlbGxGZWVkYmFjazogJ25vbmUnLFxuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xXG4gICAgfSwgKCkgPT4ge1xuICAgICAgZmxpcEJhY2soKTtcbiAgICAgIGlmICghd29yZCkgcmV0dXJuO1xuICAgICAgaWYgKG1vZGUgPT09ICdjaG9pY2UnKSB7XG4gICAgICAgIHRoaXMuZ2VuZXJhdGVDaG9pY2VPcHRpb25zKHdvcmQpO1xuICAgICAgfSBlbHNlIGlmIChtb2RlID09PSAnY2FyZCcpIHtcbiAgICAgICAgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gICAgICB9XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWbm+mAieS4gOaooeW8jyDilIDilIDilIBcbiAgLy8g55Sf5oiQ5Zub6YCJ5LiA6YCJ6aG577yI57uZ5Y2V6K+N6YCJ6YeK5LmJ77yJXG4gIGdlbmVyYXRlQ2hvaWNlT3B0aW9ucyhjdXJyZW50V29yZDogV29yZEl0ZW0pIHtcbiAgICBjb25zdCBhbGxXb3JkcyA9IHRoaXMuZGF0YS5fd29yZEJvb2tXb3JkcztcbiAgICBpZiAoYWxsV29yZHMubGVuZ3RoIDwgNCkge1xuICAgICAgLy8g6K+N5Lmm6K+N5pWw5LiN5aSfIDQg5Liq77yM5peg5rOV5Ye65bmy5omw6aG577yM6ZmN57qn5Li65Y2h54mH5Ye66aKYXG4gICAgICB0aGlzLnNldERhdGEoeyBhY3RpdmVNb2RlOiAnY2FyZCcgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgLy8g5LuO6K+N5Lmm6ZqP5py65Y+WIDMg5Liq5bmy5omw6aG5XG4gICAgY29uc3QgZGlzdHJhY3RvcnM6IFdvcmRJdGVtW10gPSBbXTtcbiAgICBjb25zdCB1c2VkID0gbmV3IFNldChbY3VycmVudFdvcmQud29yZF0pO1xuICAgIGxldCBhdHRlbXB0cyA9IDA7XG4gICAgd2hpbGUgKGRpc3RyYWN0b3JzLmxlbmd0aCA8IDMgJiYgYXR0ZW1wdHMgPCAxMDApIHtcbiAgICAgIGNvbnN0IGlkeCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIGFsbFdvcmRzLmxlbmd0aCk7XG4gICAgICBjb25zdCB3ID0gYWxsV29yZHNbaWR4XTtcbiAgICAgIGlmICghdXNlZC5oYXMody53b3JkKSAmJiB3Lm1lYW5pbmcgIT09IGN1cnJlbnRXb3JkLm1lYW5pbmcpIHtcbiAgICAgICAgZGlzdHJhY3RvcnMucHVzaCh3KTtcbiAgICAgICAgdXNlZC5hZGQody53b3JkKTtcbiAgICAgIH1cbiAgICAgIGF0dGVtcHRzKys7XG4gICAgfVxuXG4gICAgLy8g57uE5ZCIICsg6ZqP5py65omT5LmxXG4gICAgY29uc3Qgb3B0aW9uczogQ2hvaWNlT3B0aW9uW10gPSBbXG4gICAgICB7IG1lYW5pbmc6IGN1cnJlbnRXb3JkLm1lYW5pbmcsIGlzQ29ycmVjdDogdHJ1ZSB9LFxuICAgICAgLi4uZGlzdHJhY3RvcnMubWFwKGQgPT4gKHsgbWVhbmluZzogZC5tZWFuaW5nLCBpc0NvcnJlY3Q6IGZhbHNlIH0pKVxuICAgIF0uc29ydCgoKSA9PiBNYXRoLnJhbmRvbSgpIC0gMC41KTtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBjaG9pY2VPcHRpb25zOiBvcHRpb25zLFxuICAgICAgY2hvaWNlU2VsZWN0ZWQ6IC0xLFxuICAgICAgY2hvaWNlQ29ycmVjdDogZmFsc2VcbiAgICB9KTtcbiAgfSxcblxuICAvLyDlm5vpgInkuIDvvJrngrnlh7vpgInpoblcbiAgb25DaG9pY2VTZWxlY3QoZTogYW55KSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jaG9pY2VTZWxlY3RlZCAhPT0gLTEpIHJldHVybjsgLy8g5bey6YCJ6L+HXG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcblxuICAgIGNvbnN0IGlkeCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LmlkeCBhcyBudW1iZXI7XG4gICAgY29uc3Qgb3B0aW9uID0gdGhpcy5kYXRhLmNob2ljZU9wdGlvbnNbaWR4XTtcbiAgICBjb25zdCBpc0NvcnJlY3QgPSBvcHRpb24uaXNDb3JyZWN0O1xuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGNob2ljZVNlbGVjdGVkOiBpZHgsXG4gICAgICBjaG9pY2VDb3JyZWN0OiBpc0NvcnJlY3RcbiAgICB9KTtcblxuICAgIC8vIOaSreaUvuWNleivjeWPkemfs1xuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbdGhpcy5kYXRhLmN1cnJlbnRJbmRleF07XG4gICAgaWYgKHdvcmQpIHBsYXlBdWRpbyh3b3JkLndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuXG4gICAgLy8g6K6w5b2V6L+b5bqmXG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuICAgIHJlY29yZFdvcmRQcm9ncmVzcyhib29rSWQsIHdvcmQud29yZCwgaXNDb3JyZWN0KTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgaWYgKCFpc0NvcnJlY3QpIHtcbiAgICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuICAgIH1cblxuICAgIGlmIChpc0NvcnJlY3QpIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IGtub3duQ291bnQ6IHRoaXMuZGF0YS5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5zZXREYXRhKHsgdW5rbm93bkNvdW50OiB0aGlzLmRhdGEudW5rbm93bkNvdW50ICsgMSB9KTtcbiAgICB9XG5cbiAgICAvLyDnrZTlr7nlgZwgMSDnp5LvvJvnrZTplJnlgZwgMi41IOenku+8jOeVmeaXtumXtOeci+a4heato+ehruetlOahiFxuICAgIHNldFRpbWVvdXQoKCkgPT4ge1xuICAgICAgdGhpcy5uZXh0V29yZCgpO1xuICAgIH0sIGlzQ29ycmVjdCA/IDEwMDAgOiAyNTAwKTtcbiAgfSxcblxuICAvLyDlm5vpgInkuIDvvJrngrnjgIzkuI3orqTor4bjgI3vvIjkuI3njJzkuobvvIznm7TmjqXmj63npLrmraPnoa7nrZTmoYjvvIzmjInnrZTplJnorrDlvZXvvIlcbiAgb25DaG9pY2VEb250S25vdygpIHtcbiAgICBpZiAodGhpcy5kYXRhLmNob2ljZVNlbGVjdGVkICE9PSAtMSkgcmV0dXJuOyAvLyDlt7LkvZznrZQv5bey5o+t56S6XG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcblxuICAgIC8vIGNob2ljZVNlbGVjdGVkIOe9ruS4uiAtMu+8muS4jeWRveS4reS7u+S9lemAiemhue+8iOS4jeagh+e6oumUmeivr+mhue+8ie+8jOS9huinpuWPkeato+ehrumhuemrmOS6rlxuICAgIHRoaXMuc2V0RGF0YSh7IGNob2ljZVNlbGVjdGVkOiAtMiwgY2hvaWNlQ29ycmVjdDogZmFsc2UgfSk7XG5cbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZC53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcblxuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGZhbHNlKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgYWRkVG9Xcm9uZ0Jvb2sod29yZC53b3JkLCB3b3JkLm1lYW5pbmcsIGJvb2tJZCk7XG5cbiAgICB0aGlzLnNldERhdGEoeyB1bmtub3duQ291bnQ6IHRoaXMuZGF0YS51bmtub3duQ291bnQgKyAxIH0pO1xuXG4gICAgLy8g5LiN6Ieq5Yqo6Lez6L2s77ya5bGV56S65q2j56Gu562U5qGI5ZCO5Ye644CM5LiL5LiA5Liq44CN5oyJ6ZKu77yM57uZ55So5oi35pe26Ze06K6w5L2P6L+Z5Liq6K+NXG4gIH0sXG5cbiAgLy8g6YCJ5oup5qih5byP44CM5LiN6K6k6K+G44CN5o+t56S6562U5qGI5ZCO77yM54K544CM5LiL5LiA5Liq44CN57un57utXG4gIG9uQ2hvaWNlTmV4dCgpIHtcbiAgICBpZiAodGhpcy5kYXRhLmNob2ljZVNlbGVjdGVkICE9PSAtMikgcmV0dXJuOyAvLyDku4XpmZDjgIzkuI3orqTor4bjgI3mj63npLrnirbmgIFcbiAgICB0aGlzLnNldERhdGEoeyBjaG9pY2VTZWxlY3RlZDogLTEgfSk7XG4gICAgdGhpcy5uZXh0V29yZCgpO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDmi7zlhpnmqKHlvI8g4pSA4pSA4pSAXG4gIG9uU3BlbGxJbnB1dChlOiBhbnkpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzcGVsbElucHV0OiBlLmRldGFpbC52YWx1ZSB9KTtcbiAgfSxcblxuICBvblNwZWxsU3VibWl0KCkge1xuICAgIGNvbnN0IGlucHV0ID0gdGhpcy5kYXRhLnNwZWxsSW5wdXQudHJpbSgpLnRvTG93ZXJDYXNlKCk7XG4gICAgaWYgKCFpbnB1dCkgcmV0dXJuO1xuXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBpZiAoIXdvcmQpIHJldHVybjtcbiAgICBpZiAodGhpcy5fY2hlY2tBbnN3ZXJlZCgpKSByZXR1cm47IC8vIOWIh+aooeW8j+WQjuWQjOS4gOivjeS4jemHjeWkjeiuoeaVsFxuXG5cbiAgICBjb25zdCBpc0NvcnJlY3QgPSBpbnB1dCA9PT0gd29yZC53b3JkLnRvTG93ZXJDYXNlKCk7XG5cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgc3BlbGxGZWVkYmFjazogaXNDb3JyZWN0ID8gJ2NvcnJlY3QnIDogJ3dyb25nJ1xuICAgIH0pO1xuXG4gICAgLy8g5pKt5pS+5Y+R6Z+zXG4gICAgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG5cbiAgICAvLyDorrDlvZXov5vluqZcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCBpc0NvcnJlY3QpO1xuICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3b3JkLndvcmQpKTtcbiAgICBpZiAoIWlzQ29ycmVjdCkge1xuICAgICAgYWRkVG9Xcm9uZ0Jvb2sod29yZC53b3JkLCB3b3JkLm1lYW5pbmcsIGJvb2tJZCk7XG4gICAgfVxuXG4gICAgaWYgKGlzQ29ycmVjdCkge1xuICAgICAgdGhpcy5zZXREYXRhKHsga25vd25Db3VudDogdGhpcy5kYXRhLmtub3duQ291bnQgKyAxIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnNldERhdGEoeyB1bmtub3duQ291bnQ6IHRoaXMuZGF0YS51bmtub3duQ291bnQgKyAxIH0pO1xuICAgIH1cblxuICAgIC8vIOaLvOWvueWBnCAxLjIg56eS77yb5ou86ZSZ5YGcIDMg56eS77yM55WZ5pe26Ze06K6w5L2P5q2j56Gu5ou85YaZXG4gICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICB0aGlzLm5leHRXb3JkKCk7XG4gICAgfSwgaXNDb3JyZWN0ID8gMTIwMCA6IDMwMDApO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDnu4PkuaDmqKHlvI/liIfmjaLvvIjliIfmjaLkuI3mjaLor43kuI3ot7Por43vvIzlvZPliY3or43mjInmlrDmlrnlvI/ph43mlrDlh7rpopjvvIkg4pSA4pSA4pSAXG4gIC8vIOKUgOKUgOKUgCDoh6rlrprkuYnpgInmi6nlvLnmoYbvvIjmqKHlvI8v6IyD5Zu0L+avj+i9ruS4quaVsOe7n+S4gOeUqO+8iSDilIDilIDilIBcbiAgX29wZW5TaGVldCh0eXBlOiBzdHJpbmcsIHRpdGxlOiBzdHJpbmcsIG9wdGlvbnM6IEFycmF5PHsgbGFiZWw6IHN0cmluZzsgYWN0aXZlOiBib29sZWFuIH0+KSB7XG4gICAgdGhpcy5zZXREYXRhKHsgc2hvd1NoZWV0OiB0cnVlLCBzaGVldFR5cGU6IHR5cGUsIHNoZWV0VGl0bGU6IHRpdGxlLCBzaGVldE9wdGlvbnM6IG9wdGlvbnMgfSk7XG4gIH0sXG5cbiAgY2xvc2VTaGVldCgpIHtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93U2hlZXQ6IGZhbHNlIH0pO1xuICB9LFxuXG4gIG9uU2hlZXRTZWxlY3QoZTogYW55KSB7XG4gICAgY29uc3QgaWR4ID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQuaW5kZXggYXMgbnVtYmVyO1xuICAgIGNvbnN0IHR5cGUgPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC50eXBlIGFzIHN0cmluZztcbiAgICB0aGlzLnNldERhdGEoeyBzaG93U2hlZXQ6IGZhbHNlIH0pO1xuXG4gICAgaWYgKHR5cGUgPT09ICdtb2RlJykge1xuICAgICAgY29uc3QgbW9kZXM6IFByYWN0aWNlTW9kZVtdID0gWydjYXJkJywgJ2Nob2ljZScsICdzcGVsbCcsICdtaXgnLCAnbGlzdCddO1xuICAgICAgY29uc3QgbW9kZSA9IG1vZGVzW2lkeF0gYXMgUHJhY3RpY2VNb2RlO1xuICAgICAgaWYgKCFtb2RlIHx8IG1vZGUgPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpIHJldHVybjtcbiAgICAgIHNldFByYWN0aWNlTW9kZShtb2RlKTtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHByYWN0aWNlTW9kZTogbW9kZSwgbW9kZUluZGV4OiBpZHggfSk7XG4gICAgICBpZiAodGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdGhpcy5fYXBwbHlNb2RlRm9yQ3VycmVudCgpO1xuICAgICAgfVxuICAgIH0gZWxzZSBpZiAodHlwZSA9PT0gJ3Njb3BlJykge1xuICAgICAgY29uc3QgbW9kZXM6IFN0dWR5TW9kZVtdID0gWydhbGwnLCAnaGlnaEZyZXEnLCAnZnVuYycsICdjb250ZW50J107XG4gICAgICBjb25zdCBuZXdNb2RlID0gbW9kZXNbaWR4XTtcbiAgICAgIGlmICghbmV3TW9kZSB8fCBuZXdNb2RlID09PSB0aGlzLmRhdGEuc3R1ZHlNb2RlKSByZXR1cm47XG4gICAgICBzZXRTdHVkeU1vZGUobmV3TW9kZSk7XG4gICAgICB0aGlzLnNldERhdGEoeyB3b3JkQ2xhc3NMYWJlbDogdGhpcy5XT1JEX0NMQVNTX0xBQkVMU1tuZXdNb2RlXSB8fCAn5YWo6YOoJyB9KTtcbiAgICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gICAgfSBlbHNlIGlmICh0eXBlID09PSAnYmF0Y2gnKSB7XG4gICAgICBjb25zdCBvcHRpb25zID0gWzUsIDEwLCAxNSwgMjBdO1xuICAgICAgY29uc3QgbiA9IG9wdGlvbnNbaWR4XTtcbiAgICAgIGlmICghbiB8fCBuID09PSB0aGlzLmRhdGEuYmF0Y2hTaXplKSByZXR1cm47XG4gICAgICBzZXRCYXRjaFNpemUobik7XG4gICAgICB0aGlzLnNldERhdGEoeyBiYXRjaFNpemU6IG4gfSk7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+avj+i9riAnICsgbiArICcg5Liq5Y2V6K+NJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgICB9XG4gIH0sXG5cbiAgb25Nb2RlVGFwKCkge1xuICAgIGNvbnN0IG1vZGVzOiBQcmFjdGljZU1vZGVbXSA9IFsnY2FyZCcsICdjaG9pY2UnLCAnc3BlbGwnLCAnbWl4JywgJ2xpc3QnXTtcbiAgICB0aGlzLl9vcGVuU2hlZXQoXG4gICAgICAnbW9kZScsXG4gICAgICAn5Ye66aKY5qih5byPJyxcbiAgICAgIG1vZGVzLm1hcCgobSwgaSkgPT4gKHsgbGFiZWw6IHRoaXMuZGF0YS5tb2RlTGFiZWxzW2ldLCBhY3RpdmU6IG0gPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUgfSkpXG4gICAgKTtcbiAgfSxcblxuICBvblByYWN0aWNlTW9kZUNoYW5nZShlOiBhbnkpIHtcbiAgICBjb25zdCBtb2RlID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQubW9kZSBhcyBQcmFjdGljZU1vZGU7XG4gICAgaWYgKG1vZGUgPT09IHRoaXMuZGF0YS5wcmFjdGljZU1vZGUpIHJldHVybjtcblxuICAgIHNldFByYWN0aWNlTW9kZShtb2RlKTtcbiAgICB0aGlzLnNldERhdGEoeyBwcmFjdGljZU1vZGU6IG1vZGUgfSk7XG4gICAgaWYgKHRoaXMuZGF0YS5xdWV1ZS5sZW5ndGggPiAwKSB7XG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgfVxuXG4gICAgY29uc3QgbGFiZWxzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0geyBjYXJkOiAn5Y2h54mH5qih5byPJywgY2hvaWNlOiAn6YCJ5oup5qih5byPJywgc3BlbGw6ICfmi7zlhpnmqKHlvI8nLCBtaXg6ICfmt7flkIjmqKHlvI8nLCBsaXN0OiAn5YiX6KGo5qih5byPJyB9O1xuICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBsYWJlbHNbbW9kZV0gfHwgJycsIGljb246ICdub25lJyB9KTtcbiAgfSxcblxuICAvLyDliIfmjaLlh7rpopjpobrluo/vvIjpmo/mnLogLyDpobrluo/vvIlcbiAgb25Ub2dnbGVPcmRlck1vZGUoKSB7XG4gICAgY29uc3QgbmV3TW9kZSA9IHRoaXMuZGF0YS5vcmRlck1vZGUgPT09ICdyYW5kb20nID8gJ3NlcXVlbnRpYWwnIDogJ3JhbmRvbSc7XG4gICAgc2V0T3JkZXJNb2RlKG5ld01vZGUpO1xuICAgIHd4LnNob3dUb2FzdCh7XG4gICAgICB0aXRsZTogbmV3TW9kZSA9PT0gJ3JhbmRvbScgPyAn5bey5YiH5o2i6ZqP5py65Ye66K+NJyA6ICflt7LliIfmjaLpobrluo/lh7ror40nLFxuICAgICAgaWNvbjogJ25vbmUnXG4gICAgfSk7XG4gICAgdGhpcy5pbml0QmF0Y2goKTtcbiAgfSxcblxuICAvLyDlvZPliY3or43mmK/lkKbkuLrpppbmrKHlrabkuaDnmoTmlrDor43vvIjku4XmlrDor43orqHlhaXigJzntK/orqHljZXor43igJ3vvIlcbiAgX2lzTmV3V29yZCh3b3JkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgICByZXR1cm4gISF0aGlzLl9uZXdXb3JkU2V0ICYmIHRoaXMuX25ld1dvcmRTZXQuaGFzKHdvcmQudG9Mb3dlckNhc2UoKSk7XG4gIH0sXG5cbiAgLy8g6K6+572u5q+P6L2u5a2m5Lmg5Y2V6K+N5pWw77yI6aG26YOo5oyJ6ZKu77yJXG4gIG9uQ2hhbmdlQmF0Y2hTaXplKCkge1xuICAgIGNvbnN0IG9wdGlvbnMgPSBbNSwgMTAsIDE1LCAyMF07XG4gICAgdGhpcy5fb3BlblNoZWV0KFxuICAgICAgJ2JhdGNoJyxcbiAgICAgICfmr4/ova7kuKrmlbAnLFxuICAgICAgb3B0aW9ucy5tYXAobiA9PiAoeyBsYWJlbDogbiArICcg5LiqL+i9ricsIGFjdGl2ZTogbiA9PT0gdGhpcy5kYXRhLmJhdGNoU2l6ZSB9KSlcbiAgICApO1xuICB9LFxuXG4gIC8vIOWIh+aNouWtpuS5oOiMg+WbtO+8iOWFqOmDqC/pq5jpopEv6Jma6K+NL+Wunuivje+8iVxuICBXT1JEX0NMQVNTX0xBQkVMUzogeyBhbGw6ICflhajpg6gnLCBoaWdoRnJlcTogJ+mrmOmikeivjScsIGZ1bmM6ICfomZror40nLCBjb250ZW50OiAn5a6e6K+NJyB9IGFzIFJlY29yZDxzdHJpbmcsIHN0cmluZz4sXG5cbiAgb25TZWxlY3RXb3JkQ2xhc3MoKSB7XG4gICAgY29uc3QgbW9kZXM6IFN0dWR5TW9kZVtdID0gWydhbGwnLCAnaGlnaEZyZXEnLCAnZnVuYycsICdjb250ZW50J107XG4gICAgdGhpcy5fb3BlblNoZWV0KFxuICAgICAgJ3Njb3BlJyxcbiAgICAgICflrabkuaDojIPlm7QnLFxuICAgICAgbW9kZXMubWFwKG0gPT4gKHsgbGFiZWw6IHRoaXMuV09SRF9DTEFTU19MQUJFTFNbbV0sIGFjdGl2ZTogbSA9PT0gdGhpcy5kYXRhLnN0dWR5TW9kZSB9KSlcbiAgICApO1xuICB9LFxuXG4gIC8vIOWFvOWuueaXp+WFpeWPo1xuICB0b2dnbGVTdHVkeU1vZGUoKSB7XG4gICAgdGhpcy5vblNlbGVjdFdvcmRDbGFzcygpO1xuICB9LFxuXG4gIC8vIOKUgOKUgOKUgCDlr7zlh7rku4rml6XljZXor43ooagg4pSA4pSA4pSAXG4gIF90b2RheVJvd3M6IG51bGwgYXMgVG9kYXlSb3dbXSB8IG51bGwsXG5cbiAgb25FeHBvcnRUb2RheSgpIHtcbiAgICB3eC5zaG93TG9hZGluZyh7IHRpdGxlOiAn5pW055CG5Y2V6K+N5LitLi4uJyB9KTtcbiAgICBjb2xsZWN0VG9kYXlSb3dzKCkudGhlbigocm93cykgPT4ge1xuICAgICAgd3guaGlkZUxvYWRpbmcoKTtcbiAgICAgIHRoaXMuX3RvZGF5Um93cyA9IHJvd3M7XG4gICAgICBzaG93RXhwb3J0U2hlZXQocm93cywgKCkgPT4gdGhpcy5fZ2V0RXhwb3J0Q2FudmFzKCkpO1xuICAgIH0pLmNhdGNoKCgpID0+IHtcbiAgICAgIHd4LmhpZGVMb2FkaW5nKCk7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+aVtOeQhuWksei0pe+8jOivt+mHjeivlScsIGljb246ICdub25lJyB9KTtcbiAgICB9KTtcbiAgfSxcblxuICBfZ2V0RXhwb3J0Q2FudmFzKCk6IFByb21pc2U8YW55PiB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHd4LmNyZWF0ZVNlbGVjdG9yUXVlcnkoKS5pbih0aGlzKVxuICAgICAgICAuc2VsZWN0KCcjZXhwb3J0Q2FudmFzJylcbiAgICAgICAgLmZpZWxkcyh7IG5vZGU6IHRydWUgfSlcbiAgICAgICAgLmV4ZWMoKHJlczogYW55KSA9PiB7XG4gICAgICAgICAgaWYgKHJlcyAmJiByZXNbMF0gJiYgcmVzWzBdLm5vZGUpIHJlc29sdmUocmVzWzBdLm5vZGUpO1xuICAgICAgICAgIGVsc2UgcmVqZWN0KG5ldyBFcnJvcignY2FudmFzIOacquWwsee7qicpKTtcbiAgICAgICAgfSk7XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g4pSA4pSA4pSAIOWNoeeJh+aooeW8j+iupOivhi/kuI3orqTor4Yg4pSA4pSA4pSAXG4gIG1hcmtLbm93bigpIHtcbiAgICBpZiAodGhpcy5kYXRhLmN1cnJlbnRJbmRleCA+PSB0aGlzLmRhdGEucXVldWUubGVuZ3RoKSByZXR1cm47XG4gICAgaWYgKHRoaXMuX2NoZWNrQW5zd2VyZWQoKSkgcmV0dXJuOyAvLyDliIfmqKHlvI/lkI7lkIzkuIDor43kuI3ph43lpI3orqHmlbBcbiAgICBjb25zdCB3b3JkID0gdGhpcy5kYXRhLnF1ZXVlW3RoaXMuZGF0YS5jdXJyZW50SW5kZXhdO1xuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIHRydWUpO1xuICAgIHJlY29yZFN0dWR5KDEsIHRoaXMuX2lzTmV3V29yZCh3b3JkLndvcmQpKTtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBrbm93bkNvdW50OiB0aGlzLmRhdGEua25vd25Db3VudCArIDFcbiAgICB9KTtcbiAgICB0aGlzLm5leHRXb3JkKCk7XG4gIH0sXG5cbiAgbWFya1Vua25vd24oKSB7XG4gICAgaWYgKHRoaXMuZGF0YS5jdXJyZW50SW5kZXggPj0gdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLmRhdGEucmV2ZWFsQWZ0ZXJVbmtub3duKSByZXR1cm47IC8vIOW3suaPreekuu+8jOetieW+heeUqOaIt+eCueOAjOS4i+S4gOS4quOAjVxuICAgIGlmICh0aGlzLl9jaGVja0Fuc3dlcmVkKCkpIHJldHVybjsgLy8g5YiH5qih5byP5ZCO5ZCM5LiA6K+N5LiN6YeN5aSN6K6h5pWwXG4gICAgY29uc3Qgd29yZCA9IHRoaXMuZGF0YS5xdWV1ZVt0aGlzLmRhdGEuY3VycmVudEluZGV4XTtcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgcmVjb3JkV29yZFByb2dyZXNzKGJvb2tJZCwgd29yZC53b3JkLCBmYWxzZSk7XG4gICAgcmVjb3JkU3R1ZHkoMSwgdGhpcy5faXNOZXdXb3JkKHdvcmQud29yZCkpO1xuICAgIGFkZFRvV3JvbmdCb29rKHdvcmQud29yZCwgd29yZC5tZWFuaW5nLCBib29rSWQpO1xuXG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHVua25vd25Db3VudDogdGhpcy5kYXRhLnVua25vd25Db3VudCArIDEsXG4gICAgICAvLyDkuI3orqTor4bvvJrlhYjnv7vpnaLlsZXnpLrph4rkuYnvvIjlvZPlnLrnnIvliLDmraPnoa7nrZTmoYjvvInvvIwyLjUg56eS5ZCO6Ieq5Yqo6L+b5YWl5LiL5LiA5Liq6K+NXG4gICAgICAvLyDvvIjkuZ/kv53nlZnjgIzkuIvkuIDkuKrjgI3mjInpkq7vvIznlKjmiLflj6/mj5DliY3ngrnotbDvvIlcbiAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogdHJ1ZSxcbiAgICAgIGlzRmxpcHBlZDogdHJ1ZSxcbiAgICAgIHNob3dNZWFuaW5nOiB0cnVlXG4gICAgfSk7XG4gICAgLy8g6Ieq5Yqo5pKt5pS+5Y+R6Z+z77yM5Yqg5rex6K6w5b+GXG4gICAgcGxheUF1ZGlvKHdvcmQud29yZCwgdGhpcy5kYXRhLmFjY2VudCk7XG4gICAgLy8g6Ieq5Yqo6Lez5LiL5LiA5Liq77ya5bGV56S66YeK5LmJ5ZCO5YGcIDIuNSDnp5LvvJvmnJ/pl7TngrnjgIzkuIvkuIDkuKrjgI3kvJrlj5bmtojlrprml7blmahcbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG4gICAgdGhpcy5fcmV2ZWFsVGltZXIgPSBzZXRUaW1lb3V0KCgpID0+IHtcbiAgICAgIHRoaXMuX3JldmVhbFRpbWVyID0gbnVsbDtcbiAgICAgIGlmICh0aGlzLmRhdGEucmV2ZWFsQWZ0ZXJVbmtub3duKSB0aGlzLm9uUmV2ZWFsTmV4dCgpO1xuICAgIH0sIDI1MDApO1xuICB9LFxuXG4gIF9yZXZlYWxUaW1lcjogbnVsbCBhcyBhbnksXG5cbiAgX2NsZWFyUmV2ZWFsVGltZXIoKSB7XG4gICAgaWYgKHRoaXMuX3JldmVhbFRpbWVyKSB7XG4gICAgICBjbGVhclRpbWVvdXQodGhpcy5fcmV2ZWFsVGltZXIpO1xuICAgICAgdGhpcy5fcmV2ZWFsVGltZXIgPSBudWxsO1xuICAgIH1cbiAgfSxcblxuICAvLyDilIDilIDilIAg5YiX6KGo5bmz6ZO65qih5byPIOKUgOKUgOKUgFxuICAvLyDngrnljZXor43ooYzvvJrlj5Hlo7BcbiAgb25MaXN0VGFwKGU6IGFueSkge1xuICAgIGNvbnN0IGlkeCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LmlkeCBhcyBudW1iZXI7XG4gICAgY29uc3QgdyA9IHRoaXMuZGF0YS5xdWV1ZVtpZHhdO1xuICAgIGlmICh3KSBwbGF5QXVkaW8ody53b3JkLCB0aGlzLmRhdGEuYWNjZW50KTtcbiAgfSxcblxuICAvLyDliJfooajmqKHlvI/vvJrorqTor4Yv5LiN6K6k6K+G77yI5aSN55So5Y2h54mH5qih5byP55qE6L+b5bqm6K6w5b2V6ZO+6Lev77yJXG4gIG9uTGlzdEFuc3dlcihlOiBhbnkpIHtcbiAgICBjb25zdCBpZHggPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC5pZHggYXMgbnVtYmVyO1xuICAgIGNvbnN0IGtub3duID0gZS5jdXJyZW50VGFyZ2V0LmRhdGFzZXQua25vd24gPT09ICcxJztcbiAgICBpZiAodGhpcy5kYXRhLnF1ZXVlW2lkeF0gPT0gbnVsbCkgcmV0dXJuO1xuICAgIGNvbnN0IHdvcmQgPSB0aGlzLmRhdGEucXVldWVbaWR4XTtcbiAgICBpZiAodGhpcy5kYXRhLmxpc3RBbnN3ZXJlZFt3b3JkLndvcmRdKSByZXR1cm47IC8vIOW3suS9nOetlFxuICAgIGlmICh0aGlzLl9hbnN3ZXJlZFNldC5oYXMoaWR4KSkgcmV0dXJuOyAvLyDpmLLph43lpI3orqHmlbBcbiAgICB0aGlzLl9hbnN3ZXJlZFNldC5hZGQoaWR4KTtcblxuICAgIGNvbnN0IGJvb2tJZCA9IGdldEN1cnJlbnRCb29rSWQoKTtcbiAgICByZWNvcmRXb3JkUHJvZ3Jlc3MoYm9va0lkLCB3b3JkLndvcmQsIGtub3duKTtcbiAgICByZWNvcmRTdHVkeSgxLCB0aGlzLl9pc05ld1dvcmQod29yZC53b3JkKSk7XG4gICAgaWYgKCFrbm93bikgYWRkVG9Xcm9uZ0Jvb2sod29yZC53b3JkLCB3b3JkLm1lYW5pbmcsIGJvb2tJZCk7XG5cbiAgICBjb25zdCBsaXN0QW5zd2VyZWQgPSB7IC4uLnRoaXMuZGF0YS5saXN0QW5zd2VyZWQsIFt3b3JkLndvcmRdOiBrbm93biA/ICdrbm93bicgOiAndW5rbm93bicgfTtcbiAgICBjb25zdCBrbm93bkNvdW50ID0gdGhpcy5kYXRhLmtub3duQ291bnQgKyAoa25vd24gPyAxIDogMCk7XG4gICAgY29uc3QgdW5rbm93bkNvdW50ID0gdGhpcy5kYXRhLnVua25vd25Db3VudCArIChrbm93biA/IDAgOiAxKTtcbiAgICB0aGlzLnNldERhdGEoeyBsaXN0QW5zd2VyZWQsIGtub3duQ291bnQsIHVua25vd25Db3VudCB9KTtcblxuICAgIC8vIOWFqOmDqOetlOWujCDihpIg57uT566X5pys6L2uXG4gICAgaWYgKGtub3duQ291bnQgKyB1bmtub3duQ291bnQgPj0gdGhpcy5kYXRhLnRvdGFsQ291bnQpIHtcbiAgICAgIHNldFRpbWVvdXQoKCkgPT4gdGhpcy5maW5pc2hSb3VuZCgpLCA0MDApO1xuICAgIH1cbiAgfSxcblxuICAvLyDjgIzkuI3orqTor4bjgI3mj63npLrnrZTmoYjlkI7vvIzngrnjgIzkuIvkuIDkuKrjgI3nu6fnu61cbiAgb25SZXZlYWxOZXh0KCkge1xuICAgIHRoaXMuX2NsZWFyUmV2ZWFsVGltZXIoKTtcbiAgICB0aGlzLnNldERhdGEoeyByZXZlYWxBZnRlclVua25vd246IGZhbHNlLCBpc0ZsaXBwZWQ6IGZhbHNlLCBzaG93TWVhbmluZzogZmFsc2UgfSk7XG4gICAgdGhpcy5uZXh0V29yZCgpO1xuICB9LFxuXG4gIG5leHRXb3JkKCkge1xuICAgIC8vIOmYsuW+oe+8mumYn+WIl+W8guW4uO+8iOepuumYn+WIly/kuIvmoIfotornlYzvvInml7bnm7TmjqXph43lvIDkuIDova7vvIzpgb/lhY3nmb3lsY/ljaHmrbtcbiAgICBpZiAoIXRoaXMuZGF0YS5xdWV1ZSB8fCB0aGlzLmRhdGEucXVldWUubGVuZ3RoID09PSAwKSB7XG4gICAgICB0aGlzLmluaXRCYXRjaCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjb25zdCBuZXh0ID0gdGhpcy5kYXRhLmN1cnJlbnRJbmRleCArIDE7XG4gICAgaWYgKG5leHQgPj0gdGhpcy5kYXRhLnF1ZXVlLmxlbmd0aCkge1xuICAgICAgdGhpcy5maW5pc2hSb3VuZCgpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoe1xuICAgICAgY3VycmVudEluZGV4OiBuZXh0XG4gICAgfSwgKCkgPT4ge1xuICAgICAgLy8g5Li65paw6K+N56Gu5a6a5Ye66aKY5pa55byP77yIbWl4IOaooeW8j+S4i+avj+S4quivjemaj+acuuWNoeeJhy/pgInmi6kv5ou85YaZ77yJ77yM5bm26YeN572u562U6aKY54q25oCBXG4gICAgICB0aGlzLl9hcHBseU1vZGVGb3JDdXJyZW50KCk7XG4gICAgICAvLyDpooTliqDovb3kuIvkuIvkuKror41cbiAgICAgIGNvbnN0IGFmdGVyTmV4dCA9IHRoaXMuZGF0YS5xdWV1ZVtuZXh0ICsgMV07XG4gICAgICBpZiAoYWZ0ZXJOZXh0KSBwcmVsb2FkQXVkaW8oYWZ0ZXJOZXh0LndvcmQsIHRoaXMuZGF0YS5hY2NlbnQpO1xuICAgIH0pO1xuICB9LFxuXG4gIGZpbmlzaFJvdW5kKCkge1xuICAgIC8vIOacrOi9ruW3sue7k+adn++8mua4heaOiemHjeW7uuWuiOWNq+eahCBrZXnvvIznoa7kv53kuIvmrKHov5vlhaXpobXpnaLvvIjku47pppbpobXngrnigJzog4zljZXor43igJ0v5YiHIHRhYiDlm57mnaXvvIlcbiAgICAvLyDkuI3kvJrlkb3kuK3igJzmlbDmja7mnKrlj5jot7Pov4fph43lu7rigJ3ogIzljaHlnKjmnIDlkI7kuIDkuKror43vvIjmraTml7YgX2Fuc3dlcmVkU2V0IOW3sua7oe+8jOaMiemSruWFqOaXoOWPjeW6lO+8iVxuICAgIHRoaXMuX2xvYWRlZEtleSA9ICcnO1xuICAgIGNvbnN0IHRvdGFsID0gdGhpcy5kYXRhLnRvdGFsQ291bnQ7XG4gICAgY29uc3Qga25vd24gPSB0aGlzLmRhdGEua25vd25Db3VudDtcbiAgICBjb25zdCByYXRlID0gdG90YWwgPiAwID8gTWF0aC5yb3VuZCgoa25vd24gLyB0b3RhbCkgKiAxMDApIDogMDtcbiAgICBsZXQgcHJhaXNlID0gJ+e7p+e7reWKoOayue+8gSc7XG4gICAgaWYgKHJhdGUgPj0gOTApIHByYWlzZSA9ICflpKrmo5LkuobvvIzlh6DkuY7lhajpg6jmjozmj6HvvIEnO1xuICAgIGVsc2UgaWYgKHJhdGUgPj0gNzApIHByYWlzZSA9ICfkuI3plJnlk6bvvIznu6fnu63kv53mjIHvvIEnO1xuICAgIGVsc2UgaWYgKHJhdGUgPj0gNTApIHByYWlzZSA9ICfov5jpnIDlpJrlpI3kuaDlh6DpgY0nO1xuXG4gICAgLy8g6K6w5L2P5pys6L2u6Zif5YiX77yM5L6b44CM5aSN5Lmg5pys6L2u44CN5Y6f5qC36YeN5Yi377yI5LiN5o2i6K+N77yJXG4gICAgdGhpcy5fbGFzdFJvdW5kUXVldWUgPSB0aGlzLmRhdGEucXVldWUuc2xpY2UoKTtcblxuICAgIC8vIOWQjOatpeWtpuS5oOaVsOaNruWIsOS6keerr1xuICAgIHRoaXMuc3luY1RvQ2xvdWQoKTtcblxuICAgIC8vIOaYvuekuuWFqOWxj+e7k+aenOmhtVxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBzaG93UmVzdWx0OiB0cnVlLFxuICAgICAgcmVzdWx0UmF0ZTogcmF0ZSxcbiAgICAgIHJlc3VsdFByYWlzZTogcHJhaXNlXG4gICAgICAvLyByZW1pbmRlclN1YnNjcmliZWQ6IGlzUmVtaW5kZXJTdWJzY3JpYmVkKCkgLy8g5a2m5Lmg5o+Q6YaS5bey5LiL57q/77yIMjAyNi0wOC0zMe+8iVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOe7k+aenOmhte+8muW8gOWQr+WtpuS5oOaPkOmGku+8iOW3suS4i+e6vyAyMDI2LTA4LTMx77ya5LiA5qyh5oCn6K6i6ZiF6ZyA6YeN5aSN5o6I5p2D77yM5L2T6aqM57mB55CQ77yJXG4gIC8vIG9uU3Vic2NyaWJlUmVtaW5kZXIoKSB7XG4gIC8vICAgaWYgKGlzUmVtaW5kZXJTdWJzY3JpYmVkKCkpIHJldHVybjtcbiAgLy8gICByZXF1ZXN0UmVtaW5kZXJTdWJzY3JpYmUoKS50aGVuKChhY2NlcHRlZCkgPT4ge1xuICAvLyAgICAgdGhpcy5zZXREYXRhKHsgcmVtaW5kZXJTdWJzY3JpYmVkOiBhY2NlcHRlZCB9KTtcbiAgLy8gICAgIGlmIChhY2NlcHRlZCkge1xuICAvLyAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suW8gOWQr+WtpuS5oOaPkOmGkicsIGljb246ICdzdWNjZXNzJyB9KTtcbiAgLy8gICAgIH1cbiAgLy8gICB9KTtcbiAgLy8gfSxcblxuICAvLyDnu5PmnpzpobXvvJrlho3mnaXkuIDova5cbiAgb25SZXN1bHRSZXN0YXJ0KCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXN1bHQ6IGZhbHNlIH0pO1xuICAgIHRoaXMuaW5pdEJhdGNoKCk7XG4gIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5aSN5Lmg5pys6L2u77yI55So5Yia6ICD5a6M55qE5Y6f6Zif5YiX6YeN5Yi35LiA6YGN77yM5LiN6K6h5YWl57Sv6K6h5paw6K+N77yJXG4gIF9sYXN0Um91bmRRdWV1ZTogW10gYXMgV29yZEl0ZW1bXSxcblxuICBvblJlc3VsdFJldmlld1JvdW5kKCkge1xuICAgIGNvbnN0IGxhc3QgPSB0aGlzLl9sYXN0Um91bmRRdWV1ZTtcbiAgICBpZiAoIWxhc3QgfHwgbGFzdC5sZW5ndGggPT09IDApIHtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5pys6L2u6Zif5YiX5bey5LiN5Zyo77yM6K+V6K+V5YaN5p2l5LiA6L2uJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICB0aGlzLl9jbGVhclJldmVhbFRpbWVyKCk7XG4gICAgdGhpcy5fbG9hZGVkS2V5ID0gJyc7IC8vIOe7lei/h+KAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneWuiOWNq1xuICAgIHRoaXMuX2Fuc3dlcmVkU2V0ID0gbmV3IFNldDxudW1iZXI+KCk7XG4gICAgLy8g5aSN5Lmg6L2u5LiN6K6h5YWl57Sv6K6h5paw6K+N77ya5riF56m65paw6K+N6ZuG5ZCI77yIX2lzTmV3V29yZCDov5Tlm54gZmFsc2XvvIlcbiAgICB0aGlzLl9uZXdXb3JkU2V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gICAgY29uc3QgcmVwb3J0ZWRNYXA6IFJlY29yZDxzdHJpbmcsIGJvb2xlYW4+ID0ge307XG4gICAgZm9yIChjb25zdCB3IG9mIGxhc3QpIHtcbiAgICAgIGlmIChpc1dvcmRSZXBvcnRlZCh3LndvcmQpKSByZXBvcnRlZE1hcFt3LndvcmRdID0gdHJ1ZTtcbiAgICB9XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHNob3dSZXN1bHQ6IGZhbHNlLFxuICAgICAgcXVldWU6IGxhc3QsXG4gICAgICBfd29yZEJvb2tXb3JkczogdGhpcy5kYXRhLl93b3JkQm9va1dvcmRzLFxuICAgICAgY3VycmVudEluZGV4OiAwLFxuICAgICAgc2hvd01lYW5pbmc6IGZhbHNlLFxuICAgICAgaXNGbGlwcGVkOiBmYWxzZSxcbiAgICAgIHJldmVhbEFmdGVyVW5rbm93bjogZmFsc2UsXG4gICAgICBrbm93bkNvdW50OiAwLFxuICAgICAgdW5rbm93bkNvdW50OiAwLFxuICAgICAgdG90YWxDb3VudDogbGFzdC5sZW5ndGgsXG4gICAgICBzdGF0dXNMYWJlbDogJ+WkjeS5oCcsXG4gICAgICBsaXN0QW5zd2VyZWQ6IHt9LFxuICAgICAgc3BlbGxJbnB1dDogJycsXG4gICAgICBzcGVsbEZlZWRiYWNrOiAnbm9uZScsXG4gICAgICBjaG9pY2VTZWxlY3RlZDogLTEsXG4gICAgICByZXBvcnRlZE1hcFxuICAgIH0sICgpID0+IHtcbiAgICAgIHRoaXMuX2FwcGx5TW9kZUZvckN1cnJlbnQoKTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyDnu5PmnpzpobXvvJrov5Tlm55cbiAgb25SZXN1bHRCYWNrKCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IHNob3dSZXN1bHQ6IGZhbHNlIH0pO1xuICAgIHd4LnN3aXRjaFRhYih7IHVybDogJy9wYWdlcy9pbmRleC9pbmRleCcgfSk7XG4gIH0sXG5cbiAgLy8g57uT5p6c6aG177ya5YiG5Lqr5omT5Y2h5rW35oqlXG4gIG9uU2hhcmVQb3N0ZXIoKSB7XG4gICAgLy8g6K6w5b2V4oCc5LuO5rW35oql6aG16L+U5Zue5pe25LiN6YeN5byA5paw5LiA6L2u4oCd77yM5bm26K6w5L2P6L+U5Zue5ZCO5piv5ZCm6KaB5oGi5aSN57uT5p6c6aG1XG4gICAgdGhpcy5fc2tpcEluaXRPblNob3cgPSB0cnVlO1xuICAgIHRoaXMuX3Jlc3RvcmVSZXN1bHRPblNob3cgPSB0aGlzLmRhdGEuc2hvd1Jlc3VsdDtcbiAgICB0aGlzLnNldERhdGEoeyBzaG93UmVzdWx0OiBmYWxzZSB9KTtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogYC9wYWdlcy9wb3N0ZXIvcG9zdGVyP3JhdGU9JHt0aGlzLmRhdGEucmVzdWx0UmF0ZX1gXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5ZCM5q2l5a2m5Lmg57uf6K6h5Yiw5LqR56uv77yI57uPIHN5bmNVc2VyIOS6keWHveaVsO+8muacjeWKoeerr+WQiOW5tuWPlui+g+Wkp+WAvO+8jOmYsuWOhuWPsuiiq+WGsuWwj++8iVxuICBzeW5jVG9DbG91ZCgpIHtcbiAgICBzeW5jU3RhdHNUb0Nsb3VkKGdldFN0YXRzKCkpO1xuICB9LFxuXG4gIC8vIOi9rOWPkee7meWlveWPi1xuICBvblNoYXJlQXBwTWVzc2FnZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6ICfmiJHlnKjnlKjor43moLnorrDlv4bms5Xog4zljZXor43vvIzkuIDotbfmnaXvvIEnLFxuICAgICAgcGF0aDogJy9wYWdlcy9pbmRleC9pbmRleCdcbiAgICB9O1xuICB9LFxuXG4gIC8vIOWIhuS6q+WIsOaci+WPi+WciO+8iOWNlemhteaooeW8j++8iVxuICBvblNoYXJlVGltZWxpbmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiAn5oiR5Zyo55So6K+N5qC56K6w5b+G5rOV6IOM5Y2V6K+N77yM5LiA6LW35p2l77yBJ1xuICAgIH07XG4gIH0sXG59KTtcbiJdfQ==