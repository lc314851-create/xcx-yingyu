// pages/scene/scene.ts
// 情景剧本：读双语剧本 → 关键词点拨 → 场景词演练（四选一）→ 结算
// 错题自动收入生词本（bookId 标记为 scene_{sceneId} 来源）

import { scenes, Scene, SceneWord } from '../../data/scenes';
import { playAudio } from '../../utils/audio';
import { addToWrongBook } from '../../utils/store';

type Stage = 'list' | 'read' | 'quiz' | 'result';

interface QuizItem {
  word: string;
  phonetic: string;
  meaning: string;
  options: string[];      // 4 个释义选项
  correctIndex: number;
}

Page({
  data: {
    stage: 'list' as Stage,
    sceneList: [] as any[],
    // 读剧阶段
    scene: null as Scene | null,
    activeWordIdx: -1,
    wordPopup: null as SceneWord | null,
    // 演练阶段
    quiz: [] as QuizItem[],
    currentQ: 0,
    selected: -1,
    isCorrect: false,
    answered: false,
    correctCount: 0,
    wrongWords: [] as SceneWord[],
    // 结算
    finished: false,
    levelLabel: ''
  },

  onLoad() {
    const levelText: Record<string, string> = { easy: '日常', medium: '进阶', hard: '挑战' };
    const sceneList = scenes.map(s => ({
      ...s,
      levelLabel: levelText[s.level] || '日常',
      lineCount: s.dialogue.length,
      wordCount: s.keyWords.length
    }));
    this.setData({ sceneList });
  },

  // ─── 读剧 ───────────────────────────────
  openScene(e: any) {
    const id = e.currentTarget.dataset.id as string;
    const scene = scenes.find(s => s.id === id) || null;
    if (!scene) return;
    this.setData({ stage: 'read', scene, activeWordIdx: -1, wordPopup: null });
    wx.setNavigationBarTitle({ title: scene.title });
  },

  // 点击剧本中的关键词chip
  onWordTap(e: any) {
    const idx = e.currentTarget.dataset.idx as number;
    const scene = this.data.scene;
    if (!scene) return;
    const w = scene.keyWords[idx];
    playAudio(w.word.split(' ')[0]); // 词组只发首词
    this.setData({ wordPopup: w, activeWordIdx: idx });
  },

  closeWordPopup() {
    this.setData({ wordPopup: null, activeWordIdx: -1 });
  },

  onPlayLine(e: any) {
    const en = e.currentTarget.dataset.en as string;
    // 取句子前3个词播放（有道 TTS 按词播放长句体验差，取首词示意）
    const firstWord = en.replace(/[.,!?]/g, '').split(' ').slice(0, 3).join(' ');
    playAudio(firstWord);
  },

  // ─── 演练 ───────────────────────────────
  startQuiz() {
    const scene = this.data.scene;
    if (!scene) return;

    // 为每个关键词生成四选一（word → meaning，干扰项取同场景其他词的释义）
    const quiz: QuizItem[] = scene.keyWords.map(w => {
      const distractPool = scene.keyWords.filter(x => x.word !== w.word);
      // 打乱后取前3
      const shuffled = [...distractPool].sort(() => Math.random() - 0.5).slice(0, 3);
      const options = [w.meaning, ...shuffled.map(x => x.meaning)]
        .sort(() => Math.random() - 0.5);
      return {
        word: w.word,
        phonetic: w.phonetic,
        meaning: w.meaning,
        options,
        correctIndex: options.indexOf(w.meaning)
      };
    });

    this.setData({
      stage: 'quiz',
      quiz,
      currentQ: 0,
      selected: -1,
      answered: false,
      correctCount: 0,
      wrongWords: [],
      finished: false
    });
  },

  onSelectOption(e: any) {
    if (this.data.answered) return;
    const idx = e.currentTarget.dataset.idx as number;
    const q = this.data.quiz[this.data.currentQ];
    const correct = idx === q.correctIndex;

    const wrongWords = [...this.data.wrongWords];
    if (!correct) {
      // 记住这个词对象，结算时统一收入生词本
      const scene = this.data.scene!;
      const w = scene.keyWords.find(k => k.word === q.word);
      if (w) wrongWords.push(w);
    } else {
      playAudio(q.word.split(' ')[0]);
    }

    this.setData({
      selected: idx,
      answered: true,
      isCorrect: correct,
      correctCount: this.data.correctCount + (correct ? 1 : 0),
      wrongWords
    });

    setTimeout(() => this.nextQuestion(), 900);
  },

  nextQuestion() {
    const next = this.data.currentQ + 1;
    if (next >= this.data.quiz.length) {
      // 结算：错题收入生词本
      const scene = this.data.scene!;
      for (const w of this.data.wrongWords) {
        addToWrongBook(w.word, w.meaning, `scene_${scene.id}`);
      }
      const accuracy = Math.round((this.data.correctCount / this.data.quiz.length) * 100);
      let levelLabel = '还需巩固';
      if (accuracy === 100) levelLabel = '场景达人';
      else if (accuracy >= 80) levelLabel = '基本拿下';
      else if (accuracy >= 60) levelLabel = '渐入佳境';
      this.setData({ stage: 'result', levelLabel });
      return;
    }
    this.setData({ currentQ: next, selected: -1, answered: false });
  },

  // ─── 导航 ───────────────────────────────
  backToList() {
    this.setData({ stage: 'list', scene: null });
    wx.setNavigationBarTitle({ title: '情景剧本' });
  },

  backToRead() {
    this.setData({ stage: 'read' });
  },

  restartQuiz() {
    this.startQuiz();
  }
});
