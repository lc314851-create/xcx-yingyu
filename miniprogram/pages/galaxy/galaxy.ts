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
    hasResult: true,
    inMainBook: true, // 中心词是否在当前词书（跨册漫游时标注）
    // 展示视图：orbit=星系轨道 / flat=当前星系词族平铺
    viewMode: 'orbit' as 'orbit' | 'flat',
    flatWords: [] as WordItem[]
  },

  allFamily: [] as WordItem[],
  allSimilar: [] as WordItem[],
  // 最近漫游过的中心词（避免随机漫游连续撞同一个词）
  _recent: [] as string[],

  onLoad(options: { word?: string }) {
    this.init(options.word || '');
  },

  // 随机挑一个词，避开最近看过的（最多重试 15 次，全看过则退化为纯随机）
  async pickRandomWord(): Promise<string | null> {
    for (let i = 0; i < 15; i++) {
      const rand = await randomFamilyWord();
      if (rand && !this._recent.includes(rand)) return rand;
    }
    return randomFamilyWord();
  },

  async init(startWord: string) {
    this.setData({ loading: true });
    let w = startWord;
    if (!w) {
      const rand = await this.pickRandomWord();
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
      const rand = await this.pickRandomWord();
      if (rand) {
        await this.showWord(rand);
      } else {
        this.setData({ loading: false, hasResult: false });
      }
      return;
    }

    this.allFamily = res.family;
    this.allSimilar = res.similar;

    // 记录最近漫游的中心词（防随机漫游连撞）
    this._recent.push(res.center.word);
    if (this._recent.length > 8) this._recent.shift();

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
      bookLevel: getCurrentBookId().toUpperCase(),
      inMainBook: res.inMainBook
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
      const r = isInner ? 30 : 43;
      const gx = 50 + r * Math.cos(angle);
      const gy = 50 + r * 0.82 * Math.sin(angle); // 纵向压缩，贴合屏幕
      nodes.push({
        word: list[i].word,
        meaning: list[i].meaning || '',
        // 避让中心词卡：落入卡片区域的节点沿水平方向推到区域外，防止被卡片遮挡
        x: Math.abs(gx - 50) < 30 && Math.abs(gy - 50) < 20 ? 50 + (gx >= 50 ? 1 : -1) * 32 : gx,
        y: gy, // 纵向压缩，贴合屏幕
        ring: isInner ? 0 : 1
      });
    }
    this.setData({ nodes });
  },

  // ─── 平铺视图：当前星系词族（中心词 + 同根 + 形近），点击发声 ───
  onToggleView() {
    const next = this.data.viewMode === 'orbit' ? 'flat' : 'orbit';
    if (next === 'flat') this.onToggleViewToFlat();
    else this.setData({ viewMode: next });
  },

  // 平铺视图：点单词 → 发声 + 以它为中心重建词族（留在平铺视图内漫游）
  async onFlatTap(e: any) {
    const word = e.currentTarget.dataset.word as string;
    if (!word) return;
    playAudio(word);
    await this.showWord(word);
    this.onToggleViewToFlat();
  },

  // 平铺视图：长按单词 → 回星系轨道视图，以该词为中心
  async onFlatLongPress(e: any) {
    const word = e.currentTarget.dataset.word as string;
    if (!word) return;
    await this.showWord(word);
    this.setData({ viewMode: 'orbit' });
  },

  // 以当前中心词重建平铺词族（showWord 成功后调用）
  onToggleViewToFlat() {
    const seen = new Set<string>([this.data.word.toLowerCase()]);
    const flat: WordItem[] = [];
    if (this.data.word) {
      flat.push({ word: this.data.word, meaning: this.data.meaning } as WordItem);
    }
    for (const w of [...this.allFamily, ...this.allSimilar]) {
      if (seen.has(w.word.toLowerCase())) continue;
      seen.add(w.word.toLowerCase());
      flat.push(w);
    }
    this.setData({ flatWords: flat, viewMode: 'flat' });
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
    // 防抖：漫游进行中忽略连点，避免多次请求竞态
    if (this.data.loading) return;
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
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '词根星系 · 一次记住一串词',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '词根星系 · 一次记住一串词'
    };
  },
});
