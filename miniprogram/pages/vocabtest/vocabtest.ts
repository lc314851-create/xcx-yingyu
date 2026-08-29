// pages/vocabtest/vocabtest.ts
// 词汇量测试：分层抽样 30 题（初中/高中/四级/六级/考研 各 6 题，只测本级新增词），
// 四选一选释义 → m-估计 + 等渗平滑估计词汇量 → 推荐词书 → 错词可一键收入生词本
//
// 估值模型（经典分层法）：
//   - 每层正确率 r_i 用 m-估计 (答对数+1)/(题数+2)，避免 0/100 假象
//   - 等渗平滑：高层（更难）掌握率不高于低层，eff_i = min(r_i, eff_{i-1})
//   - 词汇量 = Σ (本层累计量 - 上层累计量) × eff_i
//   - 推荐词书 = 掌握率第一个跌破 80% 的层次

import { juniorWords } from '../../data/junior';
import { seniorWords } from '../../data/senior';
import { cet4Words } from '../../data/cet4';
import { cet6Words } from '../../data/cet6';
import { postgradWords } from '../../data/postgrad';
import type { WordItem } from '../../data/types';
import { playAudio, preloadAudio } from '../../utils/audio';
import { getAccent, getCurrentBookId, setCurrentBookId, addToWrongBook } from '../../utils/store';
import { estimateVocab } from '../../utils/vocabEstimate';

const QUESTIONS_PER_BAND = 6;

interface Band {
  id: string;
  label: string;     // 显示名：初中/高中/...
  words: WordItem[]; // 本级新增词（不含低层，本地种子即分层结构）
  cumulative: number; // 覆盖到本层的目标累计词汇量（估值用）
}

const BANDS: Band[] = [
  { id: 'junior', label: '初中', words: juniorWords, cumulative: 1600 },
  { id: 'senior', label: '高中', words: seniorWords, cumulative: 3500 },
  { id: 'cet4', label: '四级', words: cet4Words, cumulative: 4500 },
  { id: 'cet6', label: '六级', words: cet6Words, cumulative: 6000 },
  { id: 'postgrad', label: '考研', words: postgradWords, cumulative: 7000 }
];

interface QuizQuestion {
  word: string;
  phonetic: string;
  meaning: string;
  bandIndex: number;
  options: string[]; // 4 个释义选项
  correctIdx: number;
}

interface WrongWord {
  word: string;
  meaning: string;
  bandIndex: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

Page({
  data: {
    phase: 'intro' as 'intro' | 'quiz' | 'result',
    questions: [] as QuizQuestion[],
    total: QUESTIONS_PER_BAND * BANDS.length,
    // 当前题
    index: 0,
    word: '',
    phonetic: '',
    bandLabel: '',
    options: [] as string[],
    selected: -1,        // 已选选项下标
    correctIdx: -1,
    answered: false,
    isCorrect: false,
    // 结果
    estimate: 0,
    accuracy: 0,
    usedSeconds: 0,
    recommendBook: '',
    recommendName: '',
    bandRates: [] as { label: string; rate: number }[],
    wrongWords: [] as WrongWord[],
    wrongAdded: false,
    accent: 'us' as 'uk' | 'us'
  },

  _answers: [] as boolean[], // 每题对错（与 questions 对齐）
  _startTime: 0,

  onLoad() {
    this.setData({ accent: getAccent() });
  },

  // ─── 组卷：每层随机抽 6 个词，干扰项取自本级 + 下一级 ───
  buildQuestions(): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    BANDS.forEach((band, bandIndex) => {
      const picks = shuffle(band.words).slice(0, QUESTIONS_PER_BAND);
      const next = BANDS[bandIndex + 1];
      const pool = shuffle([...band.words, ...(next ? next.words : [])]);
      for (const w of picks) {
        if (!w || !w.meaning) continue;
        const distractors: string[] = [];
        for (const d of pool) {
          if (distractors.length >= 3) break;
          if (d.meaning && d.meaning !== w.meaning && !distractors.includes(d.meaning)) {
            distractors.push(d.meaning);
          }
        }
        const options = shuffle([w.meaning, ...distractors]);
        questions.push({
          word: w.word,
          phonetic: w.phonetic || '',
          meaning: w.meaning,
          bandIndex,
          options,
          correctIdx: options.indexOf(w.meaning)
        });
      }
    });
    return shuffle(questions);
  },

  startTest() {
    const questions = this.buildQuestions();
    if (questions.length < 10) {
      wx.showToast({ title: '词库数据还不够，先去学几个词再来测吧', icon: 'none' });
      return;
    }
    this._answers = [];
    this._startTime = Date.now();
    this.setData({ phase: 'quiz', questions, index: 0, wrongAdded: false });
    this.showQuestion(0);
  },

  showQuestion(i: number) {
    const q = this.data.questions[i];
    this.setData({
      index: i,
      word: q.word,
      phonetic: q.phonetic,
      bandLabel: BANDS[q.bandIndex]?.label + '词汇' || '',
      options: q.options,
      selected: -1,
      answered: false,
      isCorrect: false
    });
    playAudio(q.word, this.data.accent);
    const next = this.data.questions[i + 1];
    if (next) preloadAudio(next.word, this.data.accent);
  },

  onPlayAudio() {
    const q = this.data.questions[this.data.index];
    if (q) playAudio(q.word, this.data.accent);
  },

  onPick(e: any) {
    if (this.data.answered) return;
    const idx = Number(e.currentTarget.dataset.idx);
    const q = this.data.questions[this.data.index];
    const isCorrect = idx === q.correctIdx;
    this._answers.push(isCorrect);
    this.setData({ selected: idx, answered: true, isCorrect });
    playAudio(q.word, this.data.accent);
    setTimeout(() => this.nextQuestion(), 650);
  },

  nextQuestion() {
    const nextIdx = this.data.index + 1;
    if (nextIdx >= this.data.questions.length) {
      this.finishTest();
      return;
    }
    this.showQuestion(nextIdx);
  },

  // ─── 结算：估值 + 推荐 ───
  finishTest() {
    const perBandCorrect = BANDS.map(() => 0);
    this._answers.forEach((ok: boolean, qi: number) => {
      perBandCorrect[this.data.questions[qi].bandIndex] += ok ? 1 : 0;
    });

    const res = estimateVocab(BANDS, perBandCorrect, QUESTIONS_PER_BAND);
    const estimate = res.estimate;
    const recommendBook = BANDS[res.recommendIndex].id;

    const correctCount = this._answers.filter(Boolean).length;
    const accuracy = Math.round((correctCount / Math.max(this._answers.length, 1)) * 100);
    const usedSeconds = Math.round((Date.now() - this._startTime) / 1000);

    // 错词去重收集
    const wrongSet = new Map<string, WrongWord>();
    this.data.questions.forEach((q: QuizQuestion, qi: number) => {
      if (this._answers[qi] === false) {
        wrongSet.set(q.word, { word: q.word, meaning: q.meaning, bandIndex: q.bandIndex });
      }
    });

    this.setData({
      phase: 'result',
      estimate,
      accuracy,
      usedSeconds,
      recommendBook,
      recommendName: BANDS[res.recommendIndex].label,
      bandRates: BANDS.map((b, i) => ({ label: b.label, rate: Math.round(res.rates[i] * 100) })),
      wrongWords: Array.from(wrongSet.values()).slice(0, 20)
    });
  },

  // 错词一键收入生词本（来源标记为所在层级词书）
  addWrongToBook() {
    const bookId = getCurrentBookId();
    let added = 0;
    this.data.wrongWords.forEach((w: WrongWord) => {
      addToWrongBook(w.word, w.meaning, BANDS[w.bandIndex]?.id || bookId);
      added++;
    });
    this.setData({ wrongAdded: true });
    wx.showToast({ title: `已加入 ${added} 个生词`, icon: 'success' });
  },

  // 切换词书并去背
  goRecommendedBook() {
    setCurrentBookId(this.data.recommendBook);
    wx.switchTab({ url: '/pages/words/words' });
  },

  retest() {
    this.startTest();
  },

  onShareAppMessage() {
    return {
      title: `我的词汇量约 ${this.data.estimate} 词，来测测你的！`,
      path: '/pages/vocabtest/vocabtest'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '测测你的词汇量'
    };
  },
});