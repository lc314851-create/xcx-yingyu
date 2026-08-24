// pages/spelling/spelling.ts
// 拼词拼写练习：给释义 + 字母池，依次点击拼出单词，无计时计分
import { wordBooks } from '../../data/index';
import { WordItem } from '../../data/types';
import { getCurrentBookId, recordStudy, addToWrongBook, recordWordProgress } from '../../utils/store';
import { playAudio } from '../../utils/audio';

// 每轮练习题数
const ROUND_SIZE = 10;

// 打乱数组
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface LetterTile {
  letter: string;
  used: boolean;
  originIndex: number;
}

Page({
  data: {
    // 当前词
    currentWord: null as WordItem | null,
    // 打乱的字母池
    tiles: [] as LetterTile[],
    // 已选择的字母（index 指向 tiles 的 index）
    selected: [] as number[],
    // 输入的字母文本
    inputText: '',
    // 状态：none / correct / wrong
    feedback: 'none',
    // 进度
    currentIndex: 0,
    totalCount: 0,
    correctCount: 0,
    // 结果页
    showResult: false,
    resultRate: 0,
    // 内部队列
    _queue: [] as WordItem[],
    _bookId: ''
  },

  onLoad() {
    this.initRound();
  },

  initRound() {
    const bookId = getCurrentBookId();
    const book = wordBooks.find(b => b.id === bookId) || wordBooks[0];
    if (!book || book.words.length === 0) {
      wx.showToast({ title: '词书为空', icon: 'none' });
      return;
    }

    // 取高频词优先，不够取全部
    let pool = book.words.filter(w => w.isHighFreq);
    if (pool.length < ROUND_SIZE) {
      pool = book.words;
    }

    // 随机取 ROUND_SIZE 个
    const queue = shuffle(pool).slice(0, Math.min(ROUND_SIZE, pool.length));

    this.setData({
      _queue: queue,
      _bookId: bookId,
      currentIndex: 0,
      totalCount: queue.length,
      correctCount: 0,
      showResult: false
    });

    this.loadWord(queue[0]);
  },

  loadWord(word: WordItem) {
    const letters = word.word.split('');
    // 至少 2 个字母才打乱，短的词打乱后可能和原词一样，多试几次
    let shuffled = shuffle(letters);
    let tries = 0;
    while (shuffled.join('') === word.word && tries < 10) {
      shuffled = shuffle(letters);
      tries++;
    }

    const tiles: LetterTile[] = shuffled.map((l, i) => ({
      letter: l,
      used: false,
      originIndex: i
    }));

    this.setData({
      currentWord: word,
      tiles,
      selected: [],
      inputText: '',
      feedback: 'none'
    });
  },

  // 点击字母
  onTapLetter(e: any) {
    if (this.data.feedback !== 'none') return;

    const idx = e.currentTarget.dataset.idx as number;
    const tile = this.data.tiles[idx];
    if (tile.used) return;

    const tiles = this.data.tiles;
    const selected = this.data.selected;
    tiles[idx].used = true;
    selected.push(idx);

    const inputText = selected.map(i => tiles[i].letter).join('');

    this.setData({
      tiles,
      selected,
      inputText
    });

    // 检查是否拼完
    if (inputText.length === this.data.currentWord!.word.length) {
      this.checkAnswer(inputText);
    }
  },

  // 删除最后一个字母
  onBackspace() {
    if (this.data.feedback !== 'none') return;
    if (this.data.selected.length === 0) return;

    const tiles = this.data.tiles;
    const selected = this.data.selected;
    const lastIdx = selected.pop()!;
    tiles[lastIdx].used = false;

    const inputText = selected.map(i => tiles[i].letter).join('');

    this.setData({
      tiles,
      selected,
      inputText
    });
  },

  // 清空
  onClear() {
    if (this.data.feedback !== 'none') return;
    const tiles = this.data.tiles.map(t => ({ ...t, used: false }));
    this.setData({
      tiles,
      selected: [],
      inputText: ''
    });
  },

  // 检查答案
  checkAnswer(input: string) {
    const word = this.data.currentWord!;
    const isCorrect = input.toLowerCase() === word.word.toLowerCase();

    this.setData({ feedback: isCorrect ? 'correct' : 'wrong' });

    // 播放发音
    playAudio(word.word, 'us');

    // 记录学习
    recordStudy(1);
    recordWordProgress(this.data._bookId, word.word, isCorrect);
    if (!isCorrect) {
      addToWrongBook(word.word, word.meaning, this.data._bookId);
    }

    if (isCorrect) {
      this.setData({ correctCount: this.data.correctCount + 1 });
    }

    // 延迟进入下一题
    setTimeout(() => {
      this.nextWord();
    }, 1800);
  },

  // 跳过
  onSkip() {
    if (this.data.feedback !== 'none') return;
    // 显示正确答案
    this.setData({ feedback: 'wrong' });
    if (this.data.currentWord) {
      playAudio(this.data.currentWord.word, 'us');
    }
    setTimeout(() => this.nextWord(), 1800);
  },

  nextWord() {
    const next = this.data.currentIndex + 1;
    if (next >= this.data._queue.length) {
      this.finishRound();
      return;
    }
    this.setData({ currentIndex: next });
    this.loadWord(this.data._queue[next]);
  },

  finishRound() {
    const total = this.data.totalCount;
    const correct = this.data.correctCount;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;

    let praise = '继续加油！';
    if (rate >= 90) praise = '太棒了，几乎全部拼对！';
    else if (rate >= 70) praise = '不错哦，继续保持！';
    else if (rate >= 50) praise = '还需多练习拼写';

    this.setData({
      showResult: true,
      resultRate: rate
    });
  },

  onRestart() {
    this.setData({ showResult: false });
    this.initRound();
  },

  onBack() {
    wx.navigateBack();
  }
});
