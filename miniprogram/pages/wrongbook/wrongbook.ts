// pages/wrongbook/wrongbook.ts
import { getWrongBook, removeFromWrongBook, clearWrongBook, WrongBookItem } from '../../utils/store';
import { playAudio } from '../../utils/audio';
import { showExportSheet, TodayRow } from '../../utils/todayExport';

Page({
  data: {
    words: [] as WrongBookItem[],
    isEmpty: true
  },

  onShow() {
    this.loadWords();
  },

  loadWords() {
    const words = getWrongBook();
    this.setData({
      words,
      isEmpty: words.length === 0
    });
  },

  // 导出生词本（文本 / 图片 / Excel）
  onExport() {
    const rows: TodayRow[] = this.data.words.map((w: WrongBookItem) => ({
      word: w.word,
      meaning: w.meaning || '',
      phonetic: '',
      known: true
    }));
    showExportSheet(rows, () => this._getExportCanvas(), {
      title: '生词本 · 中英对照',
      footText: '英语补词达人 · 生词本导出',
      namePrefix: '生词本',
      emptyTip: '生词本还是空的',
      buildTsvTitle: '生词本'
    });
  },

  _getExportCanvas(): Promise<any> {
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery().in(this)
        .select('#exportCanvas')
        .fields({ node: true })
        .exec((res: any) => {
          if (res && res[0] && res[0].node) resolve(res[0].node);
          else reject(new Error('canvas 未就绪'));
        });
    });
  },

  // 播放发音
  onPlayAudio(e: any) {
    const word = e.currentTarget.dataset.word as string;
    if (word) playAudio(word, 'us');
  },

  // 移除生词
  onRemove(e: any) {
    const word = e.currentTarget.dataset.word as string;
    wx.showModal({
      title: '确认移除',
      content: `确定将「${word}」从生词本移除吗？`,
      success: (res: any) => {
        if (res.confirm) {
          removeFromWrongBook(word);
          this.loadWords();
          wx.showToast({ title: '已移除', icon: 'success' });
        }
      }
    });
  },

  // 清空生词本
  onClearAll() {
    if (this.data.words.length === 0) {
      wx.showToast({ title: '生词本是空的', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '确认清空',
      content: '确定清空所有生词吗？此操作不可撤销。',
      success: (res: any) => {
        if (res.confirm) {
          clearWrongBook();
          this.loadWords();
          wx.showToast({ title: '已清空', icon: 'success' });
        }
      }
    });
  },

  // 返回
  onBack() {
    wx.navigateBack();
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '错题本 · 答错过的不再错',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '错题本 · 答错过的不再错'
    };
  },
});
