// pages/challenge/challenge.ts
// 挑战模式：关卡选择 + 答题循环 + 通关结算
import { WordItem } from '../../data/types';
import {
  getCurrentBookId,
  recordWordProgress,
  recordStudy,
  addToWrongBook,
  getAccent,
  // 挑战模式
  getChallengeProgress,
  getAreaMeta,
  getClearedLevels,
  getLevelStars,
  getAreaStars,
  recordLevelResult,
  syncChallengeToCloud,
  LEVELS_PER_AREA,
  QUESTIONS_PER_LEVEL,
  PASS_THRESHOLD,
  getChallengeBadges,
  ChallengeBadge
} from '../../utils/store';
import { getBookById } from '../../utils/wordService';
import { wordBooks as localBooks } from '../../data/index';
import { playAudio } from '../../utils/audio';

// 题型枚举
type QType = 'choice' | 'spell' | 'reverse';
// choice: 看单词选释义
// spell:  看释义拼单词
// reverse: 看释义选单词（反向四选一）

interface ChoiceOption {
  text: string;
  isCorrect: boolean;
}

Page({
  data: {
    // ─── 页面状态：list | playing | result ───
    pageState: 'list' as 'list' | 'playing' | 'result',
    // ─── 区域信息 ───
    bookId: 'junior',
    areaName: '基础营地',
    areaIcon: '🏕️',
    cleared: 0,
    areaStars: 0,
    // ─── 关卡列表 ───
    levels: [] as Array<{
      level: number;
      locked: boolean;
      stars: number;
      label: string;
    }>,
    // ─── 当前挑战关卡 ───
    currentLevel: 1,
    // ─── 答题状态 ───
    questions: [] as WordItem[],
    qIndex: 0,
    qType: 'choice' as QType,
    // 进度
    correctCount: 0,
    wrongCount: 0,
    progressPct: 0,
    // 连击
    combo: 0,
    maxCombo: 0,
    showCombo: false,
    comboText: '',
    // 四选一
    choiceOptions: [] as ChoiceOption[],
    choiceSelected: -1,
    choiceCorrect: false,
    // 拼写
    spellInput: '',
    spellFeedback: 'none' as 'none' | 'correct' | 'wrong',
    // 反向选择（看释义选词）
    reverseOptions: [] as ChoiceOption[],
    reverseSelected: -1,
    reverseCorrect: false,
    // 发音
    accent: 'us' as 'uk' | 'us',
    // ─── 通关结算 ───
    resultStars: 0,
    resultCorrect: 0,
    resultTotal: 0,
    resultRate: 0,
    resultIsPass: false,
    resultNewUnlock: false,
    resultNewBadges: [] as ChallengeBadge[],
    // 加载状态
    loading: false,
    // 词书全部单词（用于出干扰项）
    _allWords: [] as WordItem[]
  },

  onLoad() {
    this.initArea();
  },

  onShow() {
    if (this.data.pageState === 'list') {
      this.initArea();
    }
  },

  // 初始化区域信息
  initArea() {
    const bookId = getCurrentBookId();
    const meta = getAreaMeta(bookId);
    const cleared = getClearedLevels(bookId);
    const areaStars = getAreaStars(bookId);

    // 构建关卡列表
    const levels = [];
    for (let i = 1; i <= LEVELS_PER_AREA; i++) {
      const stars = getLevelStars(bookId, i);
      levels.push({
        level: i,
        locked: i > cleared + 1,
        stars,
        label: `第 ${i} 关`
      });
    }

    this.setData({
      bookId,
      areaName: meta.name,
      areaIcon: meta.icon,
      cleared,
      areaStars,
      levels,
      pageState: 'list',
      accent: getAccent()
    });
  },

  // 切换区域（跳转词书选择页）
  changeArea() {
    wx.navigateTo({ url: '/pages/booklist/booklist' });
  },

  // 点击关卡
  onLevelTap(e: any) {
    const level = e.currentTarget.dataset.level as number;
    const levelData = this.data.levels.find(l => l.level === level);
    if (!levelData || levelData.locked) {
      wx.showToast({ title: '请先通关前面的关卡', icon: 'none' });
      return;
    }
    this.startChallenge(level);
  },

  // 开始挑战
  async startChallenge(level: number) {
    this.setData({ loading: true, currentLevel: level });

    const bookId = this.data.bookId;
    let book;
    try {
      book = await getBookById(bookId);
    } catch (e) {
      console.error('获取词书失败', e);
    }

    if (!book || !book.words || book.words.length === 0) {
      const localBook = localBooks.find(b => b.id === bookId);
      if (localBook) book = localBook;
    }

    if (!book || !book.words || book.words.length === 0) {
      this.setData({ loading: false });
      wx.showToast({ title: '词库加载失败', icon: 'none' });
      return;
    }

    // 难度递增：根据关卡决定取词范围
    // 第 1~3 关：取前 30% 的词
    // 第 4~6 关：取 30%~70%
    // 第 7~10 关：取 70%~100%
    const words = book.words;
    const total = words.length;
    let pool: WordItem[];
    if (level <= 3) {
      pool = words.slice(0, Math.max(20, Math.floor(total * 0.3)));
    } else if (level <= 6) {
      pool = words.slice(Math.floor(total * 0.3), Math.max(20, Math.floor(total * 0.7)));
    } else {
      pool = words.slice(Math.floor(total * 0.7));
    }
    // 如果池子不够，用全部词
    if (pool.length < 10) pool = words;

    // 随机取 QUESTIONS_PER_LEVEL 个不重复的词
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    const questions = shuffled.slice(0, Math.min(QUESTIONS_PER_LEVEL, pool.length));

    // 第一题题型（每 5 题切换一次）
    const firstQType = this.getQTypeForIndex(0);

    this.setData({
      questions,
      qIndex: 0,
      qType: firstQType,
      correctCount: 0,
      wrongCount: 0,
      progressPct: 0,
      combo: 0,
      maxCombo: 0,
      showCombo: false,
      pageState: 'playing',
      loading: false,
      _allWords: words,
      choiceSelected: -1,
      spellInput: '',
      spellFeedback: 'none',
      reverseSelected: -1
    }, () => {
      this.generateQuestion(questions[0], firstQType);
    });
  },

  // 根据题目序号决定题型（每 5 题切换一次）
  getQTypeForIndex(index: number): QType {
    const phase = Math.floor(index / 5);
    const types: QType[] = ['choice', 'spell', 'reverse'];
    return types[phase % types.length];
  },

  // 生成题目
  generateQuestion(word: WordItem, qType: QType) {
    if (qType === 'choice') {
      this.generateChoiceOptions(word);
    } else if (qType === 'reverse') {
      this.generateReverseOptions(word);
    }
    // spell 模式不需要预生成
  },

  // 生成四选一选项（看单词选释义）
  generateChoiceOptions(word: WordItem) {
    const allWords = this.data._allWords;
    const distractors: WordItem[] = [];
    const used = new Set([word.word]);
    let attempts = 0;
    while (distractors.length < 3 && attempts < 100) {
      const idx = Math.floor(Math.random() * allWords.length);
      const w = allWords[idx];
      if (!used.has(w.word) && w.meaning !== word.meaning) {
        distractors.push(w);
        used.add(w.word);
      }
      attempts++;
    }
    const options: ChoiceOption[] = [
      { text: word.meaning, isCorrect: true },
      ...distractors.map(d => ({ text: d.meaning, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    this.setData({
      choiceOptions: options,
      choiceSelected: -1,
      choiceCorrect: false
    });
  },

  // 生成反向选择选项（看释义选单词）
  generateReverseOptions(word: WordItem) {
    const allWords = this.data._allWords;
    const distractors: WordItem[] = [];
    const used = new Set([word.word]);
    let attempts = 0;
    while (distractors.length < 3 && attempts < 100) {
      const idx = Math.floor(Math.random() * allWords.length);
      const w = allWords[idx];
      if (!used.has(w.word) && w.word !== word.word) {
        distractors.push(w);
        used.add(w.word);
      }
      attempts++;
    }
    const options: ChoiceOption[] = [
      { text: word.word, isCorrect: true },
      ...distractors.map(d => ({ text: d.word, isCorrect: false }))
    ].sort(() => Math.random() - 0.5);

    this.setData({
      reverseOptions: options,
      reverseSelected: -1,
      reverseCorrect: false
    });
  },

  // ─── 四选一答题 ───
  onChoiceSelect(e: any) {
    if (this.data.choiceSelected !== -1) return;
    const idx = e.currentTarget.dataset.idx as number;
    const option = this.data.choiceOptions[idx];
    this.handleAnswer(option.isCorrect);
    this.setData({
      choiceSelected: idx,
      choiceCorrect: option.isCorrect
    });
  },

  // ─── 反向选择答题 ───
  onReverseSelect(e: any) {
    if (this.data.reverseSelected !== -1) return;
    const idx = e.currentTarget.dataset.idx as number;
    const option = this.data.reverseOptions[idx];
    this.handleAnswer(option.isCorrect);
    this.setData({
      reverseSelected: idx,
      reverseCorrect: option.isCorrect
    });
  },

  // ─── 拼写答题 ───
  onSpellInput(e: any) {
    this.setData({ spellInput: e.detail.value });
  },

  onSpellSubmit() {
    if (this.data.spellFeedback !== 'none') return;
    const input = this.data.spellInput.trim().toLowerCase();
    if (!input) return;
    const word = this.data.questions[this.data.qIndex];
    const isCorrect = input === word.word.toLowerCase();
    this.handleAnswer(isCorrect);
    this.setData({
      spellFeedback: isCorrect ? 'correct' : 'wrong'
    });
  },

  // ─── 统一答题处理 ───
  handleAnswer(isCorrect: boolean) {
    const word = this.data.questions[this.data.qIndex];
    const bookId = this.data.bookId;

    // 播放发音
    playAudio(word.word, this.data.accent);

    // 记录单词进度
    recordWordProgress(bookId, word.word, isCorrect);
    recordStudy(1);
    if (!isCorrect) {
      addToWrongBook(word.word, word.meaning, bookId);
    }

    let correctCount = this.data.correctCount;
    let wrongCount = this.data.wrongCount;
    let combo = this.data.combo;
    let maxCombo = this.data.maxCombo;

    if (isCorrect) {
      correctCount++;
      combo++;
      if (combo > maxCombo) maxCombo = combo;
    } else {
      wrongCount++;
      combo = 0;
    }

    // 连击鼓励（3 连及以上）
    let showCombo = false;
    let comboText = '';
    if (isCorrect && combo >= 3) {
      showCombo = true;
      if (combo >= 7) comboText = `${combo} 连对！无敌！🔥`;
      else if (combo >= 5) comboText = `${combo} 连对！太强了！⭐`;
      else if (combo >= 3) comboText = `${combo} 连对！加油！👍`;
    }

    const total = this.data.questions.length;
    const progressPct = Math.round(((this.data.qIndex + 1) / total) * 100);

    this.setData({
      correctCount,
      wrongCount,
      combo,
      maxCombo,
      showCombo,
      comboText,
      progressPct
    });

    // 连击提示自动消失
    if (showCombo) {
      setTimeout(() => {
        this.setData({ showCombo: false });
      }, 1500);
    }

    // 延迟进入下一题
    setTimeout(() => {
      this.nextQuestion();
    }, isCorrect ? 800 : 1200);
  },

  // ─── 下一题 ───
  nextQuestion() {
    const next = this.data.qIndex + 1;
    if (next >= this.data.questions.length) {
      this.finishChallenge();
      return;
    }
    const qType = this.getQTypeForIndex(next);
    this.setData({
      qIndex: next,
      qType,
      choiceSelected: -1,
      spellInput: '',
      spellFeedback: 'none',
      reverseSelected: -1
    }, () => {
      this.generateQuestion(this.data.questions[next], qType);
    });
  },

  // ─── 通关结算 ───
  finishChallenge() {
    const total = this.data.questions.length;
    const correct = this.data.correctCount;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    const isPass = rate >= PASS_THRESHOLD;

    let resultStars = 0;
    if (rate >= 100) resultStars = 3;
    else if (rate >= 80) resultStars = 2;
    else if (rate >= PASS_THRESHOLD) resultStars = 1;

    // 记录通关结果
    const result = recordLevelResult(
      this.data.bookId,
      this.data.currentLevel,
      correct,
      total
    );

    // 同步到云端
    syncChallengeToCloud();

    // 获取新解锁的徽章
    const allBadges = getChallengeBadges();
    const newBadges = result.isNewBadge ? allBadges.filter(b => b.unlocked).slice(-1) : [];

    this.setData({
      pageState: 'result',
      resultStars: result.stars,
      resultCorrect: correct,
      resultTotal: total,
      resultRate: rate,
      resultIsPass: isPass,
      resultNewUnlock: result.newUnlock,
      resultNewBadges: newBadges
    });
  },

  // ─── 结算页操作 ───
  // 再来一次
  onRetry() {
    this.startChallenge(this.data.currentLevel);
  },

  // 下一关
  onNextLevel() {
    const next = this.data.currentLevel + 1;
    if (next > LEVELS_PER_AREA) {
      wx.showToast({ title: '本区域已全部通关！', icon: 'success' });
      this.initArea();
      return;
    }
    this.startChallenge(next);
  },

  // 返回关卡列表
  onBackToList() {
    this.initArea();
  },

  // ─── 发音 ───
  onPlayAudio() {
    const word = this.data.questions[this.data.qIndex];
    if (word) playAudio(word.word, this.data.accent);
  },

  // ─── 题型标签 ───
  getQTypeLabel(qType: QType): string {
    const labels: Record<string, string> = {
      choice: '看词选义',
      spell: '看义拼词',
      reverse: '看义选词'
    };
    return labels[qType] || '';
  }
});
