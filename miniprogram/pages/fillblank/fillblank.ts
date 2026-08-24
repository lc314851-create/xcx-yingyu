// pages/fillblank/fillblank.ts
import { getRandomFillBlank, FillBlankItem } from '../../data/quotes';
import { recordStudy } from '../../utils/store';
import { playAudio } from '../../utils/audio';

interface Option {
  text: string;
  isCorrect: boolean;
}

Page({
  data: {
    currentItem: null as FillBlankItem | null,
    options: [] as Option[],
    selectedIndex: -1,
    answered: false,
    isCorrect: false,
    // 统计
    totalCount: 0,
    correctCount: 0,
    // 连续答对
    streak: 0,
    // 结果
    showResult: false,
    resultRate: 0,
    // 上一个 index（避免重复出题）
    _lastIndex: -1,
    // 总题数限制
    _maxRounds: 10,
    _currentRound: 0
  },

  onLoad() {
    this.nextQuestion();
  },

  nextQuestion() {
    if (this.data._currentRound >= this.data._maxRounds) {
      this.finishRound();
      return;
    }

    const { item, index } = getRandomFillBlank(this.data._lastIndex);
    // 打乱选项
    const options: Option[] = item.options.map(o => ({
      text: o,
      isCorrect: o === item.answer
    })).sort(() => Math.random() - 0.5);

    this.setData({
      currentItem: item,
      options,
      selectedIndex: -1,
      answered: false,
      isCorrect: false,
      _lastIndex: index,
      _currentRound: this.data._currentRound + 1
    });
  },

  onSelect(e: any) {
    if (this.data.answered) return;

    const idx = e.currentTarget.dataset.idx as number;
    const option = this.data.options[idx];
    const isCorrect = option.isCorrect;

    this.setData({
      selectedIndex: idx,
      answered: true,
      isCorrect
    });

    // 记录学习
    recordStudy(1);

    if (isCorrect) {
      this.setData({
        correctCount: this.data.correctCount + 1,
        streak: this.data.streak + 1
      });
      // 播放答案单词发音
      if (this.data.currentItem) {
        playAudio(this.data.currentItem.answer, 'us');
      }
    } else {
      this.setData({ streak: 0 });
    }

    // 延迟进入下一题
    setTimeout(() => {
      this.nextQuestion();
    }, 2200);
  },

  // 跳过当前题
  onSkip() {
    if (this.data.answered) return;
    this.setData({ streak: 0 });
    this.nextQuestion();
  },

  finishRound() {
    const total = this.data._maxRounds;
    const correct = this.data.correctCount;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    this.setData({
      showResult: true,
      resultRate: rate
    });
  },

  onRestart() {
    this.setData({
      showResult: false,
      totalCount: 0,
      correctCount: 0,
      streak: 0,
      _lastIndex: -1,
      _currentRound: 0
    });
    this.nextQuestion();
  },

  onBack() {
    wx.navigateBack();
  }
});
