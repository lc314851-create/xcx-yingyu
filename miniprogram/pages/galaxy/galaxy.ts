// pages/galaxy/galaxy.ts
// 词根星系：以某个词为中心，环绕展示同根词族 / 形近词，点击任意词即可漫游过去

import { getFamily, randomFamilyWord, FamilyResult } from '../../utils/familyService';
import { playAudio } from '../../utils/audio';
import { getCurrentBookId } from '../../utils/store';
import { WordItem } from '../../data/types';

type RelationTab = 'family' | 'similar';

interface OrbitNode {
  word: string;
  meaning: string;
  x: number; // 百分比
  y: number;
  ring: number; // 0=内环 1=外环
}

Page({
  data: {
    loading: true,
    word: '',
    phonetic: '',
    meaning: '',
    root: '',
    rootGloss: '',
    tab: 'family' as RelationTab,
    familyTotal: 0,
    similarTotal: 0,
    nodes: [] as OrbitNode[],
    bookLevel: '',
    hasResult: true
  },

  allFamily: [] as WordItem[],
  allSimilar: [] as WordItem[],

  onLoad(options: { word?: string }) {
    this.init(options.word || '');
  },

  async init(startWord: string) {
    this.setData({ loading: true });
    let w = startWord;
    if (!w) {
      const rand = await randomFamilyWord();
      if (!rand) {
        this.setData({ loading: false, hasResult: false });
        return;
      }
      w = rand;
    }
    await this.showWord(w);
  },

  async showWord(word: string) {
    const res: FamilyResult = await getFamily(word);
    if (!res.center) {
      // 当前词书不含该词：引导随机漫游
      wx.showToast({ title: '当前词书未收录该词', icon: 'none' });
      const rand = await randomFamilyWord();
      if (rand) {
        await this.showWord(rand);
      } else {
        this.setData({ loading: false, hasResult: false });
      }
      return;
    }

    this.allFamily = res.family;
    this.allSimilar = res.similar;

    this.setData({
      loading: false,
      hasResult: true,
      word: res.center.word,
      phonetic: res.center.phonetic || '',
      meaning: res.center.meaning || '',
      root: res.root,
      rootGloss: res.rootGloss,
      familyTotal: res.family.length,
      similarTotal: res.similar.length,
      tab: res.family.length > 0 ? 'family' : (res.similar.length > 0 ? 'similar' : 'family'),
      bookLevel: getCurrentBookId().toUpperCase()
    });
    this.layoutNodes();
  },

  // 环绕布局：<=6 节点用内环，>6 双环
  layoutNodes() {
    const tab = this.data.tab as RelationTab;
    const source = tab === 'family' ? this.allFamily : this.allSimilar;
    const max = 12;
    const list = source.slice(0, max);

    const nodes: OrbitNode[] = [];
    const innerCount = list.length <= 6 ? list.length : 8;
    const outerCount = list.length > 6 ? list.length - innerCount : 0;

    for (let i = 0; i < list.length; i++) {
      const isInner = i < innerCount;
      const idx = isInner ? i : i - innerCount;
      const total = isInner ? innerCount : outerCount;
      const angle = (2 * Math.PI * idx) / total - Math.PI / 2 + (isInner ? 0 : Math.PI / total);
      const r = isInner ? 30 : 43; // 半径（% of 容器）
      nodes.push({
        word: list[i].word,
        meaning: list[i].meaning || '',
        x: 50 + r * Math.cos(angle),
        y: 50 + r * 0.82 * Math.sin(angle), // 纵向压缩，贴合屏幕
        ring: isInner ? 0 : 1
      });
    }
    this.setData({ nodes });
  },

  onTabChange(e: any) {
    const tab = e.currentTarget.dataset.tab as RelationTab;
    this.setData({ tab });
    this.layoutNodes();
  },

  // 点击轨道节点：漫游到新中心词
  onNodeTap(e: any) {
    const word = e.currentTarget.dataset.word as string;
    playAudio(word);
    this.showWord(word);
  },

  onPlayCenter() {
    playAudio(this.data.word);
  },

  onRandomTap() {
    this.setData({ loading: true });
    this.init('');
  },

  // 查看词详情（把底部含义面板展开——此处以 toast 轻量提示为主）
  onNodeLongPress(e: any) {
    const word = e.currentTarget.dataset.word as string;
    const meaning = e.currentTarget.dataset.meaning as string;
    wx.showModal({
      title: word,
      content: meaning || '暂无释义',
      showCancel: false,
      confirmText: '知道了'
    });
  }
});
