// pages/story/story.ts
// 双语短文阅读：句子级中英对照 + 逐句语音跟读 + 点词查义 + 关键词收集
//
// 阅读器特性：
//   - 三种显示模式：中英对照 / 仅英文 / 仅中文
//   - 卡拉OK式当前句高亮，自动推进
//   - 点任意单词弹出释义（关键词优先，否则查当前词书），点喇叭发单词音
//   - 读完可标记，关键词一键收入生词本

import { stories, Story, StoryWord } from '../../data/stories';
import { playSentence, stopSentence, playAudio, destroyAudio } from '../../utils/audio';
import { getBookById } from '../../utils/wordService';
import { getCurrentBookId, addToWrongBook } from '../../utils/store';

type Stage = 'list' | 'read';
type ShowMode = 'both' | 'en' | 'zh';

interface StoryCard {
  id: string;
  title: string;
  enTitle: string;
  level: string;
  levelLabel: string;
  category: string;
  intro: string;
  sentenceCount: number;
  wordCount: number;
  finished: boolean;
}

interface WordSeg {
  text: string;
  isKey: boolean;
}

interface SentView {
  index: number;
  segments: WordSeg[];
  zh: string;
  active: boolean;
}

const LEVEL_LABEL: Record<string, string> = { easy: '入门', medium: '进阶', hard: '挑战' };

// 阅读进度
const STORY_PROGRESS_KEY = 'bc_story_progress';
function getStoryProgress(): Record<string, { finished: boolean; readAt: number }> {
  return wx.getStorageSync(STORY_PROGRESS_KEY) || {};
}
function markStoryFinished(id: string) {
  const p = getStoryProgress();
  p[id] = { finished: true, readAt: Date.now() };
  wx.setStorageSync(STORY_PROGRESS_KEY, p);
}

Page({
  data: {
    stage: 'list' as Stage,
    storyList: [] as StoryCard[],
    // 阅读器
    story: null as Story | null,
    sentViews: [] as SentView[],
    showMode: 'both' as ShowMode,
    fontSize: 30,
    playing: false,
    playSeq: 0,
    finished: false,
    // 词义弹窗
    wordPopup: null as { word: string; phonetic: string; meaning: string; isKey: boolean } | null,
    // 关键词面板
    keyWords: [] as StoryWord[],
    collectedWords: [] as string[],
    loadingStory: false
  },

  // 用于点词查义的词书词表（懒加载）
  _bookWordMap: null as Map<string, { phonetic: string; meaning: string }> | null,

  onLoad() {
    this.buildList();
    this.loadBookWords();
  },

  onUnload() {
    destroyAudio();
  },

  onHide() {
    stopSentence();
    this.setData({ playing: false });
  },

  async loadBookWords() {
    try {
      const book = await getBookById(getCurrentBookId());
      const map = new Map<string, { phonetic: string; meaning: string }>();
      for (const w of book.words || []) {
        map.set(w.word, { phonetic: w.phonetic || '', meaning: w.meaning || '' });
      }
      this._bookWordMap = map;
    } catch (e) {
      this._bookWordMap = new Map();
    }
  },

  buildList() {
    const progress = getStoryProgress();
    const storyList: StoryCard[] = stories.map(s => ({
      id: s.id,
      title: s.title,
      enTitle: s.enTitle,
      level: s.level,
      levelLabel: LEVEL_LABEL[s.level] || '进阶',
      category: s.category,
      intro: s.intro,
      sentenceCount: s.sentences.length,
      wordCount: s.keyWords.length,
      finished: !!(progress[s.id] && progress[s.id].finished)
    }));
    this.setData({ storyList });
  },

  // ─── 进入阅读器 ───
  openStory(e: any) {
    const id = e.currentTarget.dataset.id as string;
    const story = stories.find(s => s.id === id);
    if (!story) return;
    stopSentence();

    const keySet = new Set(story.keyWords.map(k => k.word.toLowerCase()));
    const sentViews: SentView[] = story.sentences.map((sen, idx) => ({
      index: idx,
      segments: sen.en.split(/\s+/).map(w => {
        const clean = w.replace(/[^a-zA-Z'’-]/g, '');
        return { text: w, isKey: !!clean && keySet.has(clean.toLowerCase()) };
      }),
      zh: sen.zh,
      active: false
    }));

    const progress = getStoryProgress();
    this.setData({
      stage: 'read',
      story,
      sentViews,
      showMode: 'both',
      playing: false,
      finished: !!(progress[id] && progress[id].finished),
      keyWords: story.keyWords,
      collectedWords: [],
      wordPopup: null
    });
    wx.setNavigationBarTitle({ title: story.title });
  },

  backToList() {
    stopSentence();
    this.setData({ stage: 'list', story: null, playing: false });
    wx.setNavigationBarTitle({ title: '双语阅读' });
  },

  // ─── 朗读控制 ───
  togglePlay() {
    if (this.data.playing) {
      stopSentence();
      this.setData({ playing: false });
      return;
    }
    // 从当前高亮句开始；若已读完全部则从头
    let startIdx = this.data.playSeq;
    if (startIdx >= this.data.sentViews.length) startIdx = 0;
    this.setData({ playSeq: startIdx, playing: true });
    this.playSentenceAt(startIdx);
  },

  playSentenceAt(idx: number) {
    const story = this.data.story;
    if (!story || idx >= story.sentences.length) {
      // 全篇读完
      this.setData({ playing: false });
      wx.vibrateShort({ type: 'light' });
      return;
    }
    const text = story.sentences[idx].en;
    this.highlight(idx);
    playSentence(text, {
      onStart: () => {
        if (this.data.playing) this.setData({ playSeq: idx });
      },
      onEnded: () => {
        if (!this.data.playing) return;
        const next = idx + 1;
        this.setData({ playSeq: next });
        this.playSentenceAt(next);
      },
      onError: () => {
        this.setData({ playing: false });
        wx.showToast({ title: '语音加载失败', icon: 'none' });
      }
    });
  },

  highlight(idx: number) {
    const views = this.data.sentViews.map(v => ({ ...v, active: v.index === idx }));
    this.setData({ sentViews: views });
    // 尽量把当前句滚到可视区
    const query = wx.createSelectorQuery();
    query.select(`.sent-${idx}`).boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res: any[]) => {
      if (!res || res.length < 2) return;
      const rect = res[0];
      const scroll = res[1];
      if (rect && (rect.top < 0 || rect.bottom > 1200)) {
        wx.pageScrollTo({ scrollTop: scroll.scrollTop + rect.top - 300, duration: 300 });
      }
    });
  },

  // 点句子：从该句开始播
  onSentenceTap(e: any) {
    const idx = e.currentTarget.dataset.idx as number;
    if (this.data.playing) {
      stopSentence();
    }
    this.setData({ playing: true, playSeq: idx });
    this.playSentenceAt(idx);
  },

  // 点单词：查释义 + 发音
  onWordTap(e: any) {
    const raw = e.currentTarget.dataset.w as string;
    const clean = raw.replace(/[^a-zA-Z'’-]/g, '');
    if (!clean) return;
    playAudio(clean);

    const story = this.data.story;
    let popup: any = null;
    // 1) 关键词优先
    const kw = story && story.keyWords.find(k => k.word.toLowerCase() === clean.toLowerCase());
    if (kw) {
      popup = { word: kw.word, phonetic: kw.phonetic, meaning: kw.meaning, isKey: true };
    } else if (this._bookWordMap) {
      // 2) 当前词书
      const hit = this._bookWordMap.get(clean.toLowerCase());
      if (hit) popup = { word: clean, phonetic: hit.phonetic, meaning: hit.meaning, isKey: false };
      else popup = { word: clean, phonetic: '', meaning: '当前词书未收录，可去「搜单词」查询', isKey: false };
    } else {
      popup = { word: clean, phonetic: '', meaning: '正在加载词库…', isKey: false };
    }
    this.setData({ wordPopup: popup });
  },

  closeWordPopup() {
    this.setData({ wordPopup: null });
  },

  noop() {},

  onWordPopupPlay() {
    if (this.data.wordPopup) playAudio(this.data.wordPopup.word);
  },

  // 显示模式
  onModeChange(e: any) {
    this.setData({ showMode: e.currentTarget.dataset.mode as ShowMode });
  },

  // 字号
  changeFontSize(e: any) {
    const delta = Number(e.currentTarget.dataset.delta);
    let size = this.data.fontSize + delta;
    if (size < 26) size = 26;
    if (size > 40) size = 40;
    this.setData({ fontSize: size });
  },

  // ─── 关键词收集 ───
  collectWord(e: any) {
    const idx = e.currentTarget.dataset.idx as number;
    const w = this.data.keyWords[idx];
    if (!w || this.data.collectedWords.includes(w.word)) return;
    addToWrongBook(w.word, w.meaning, `story_${this.data.story!.id}`);
    this.setData({ collectedWords: [...this.data.collectedWords, w.word] });
    wx.showToast({ title: '已收入生词本', icon: 'none' });
  },

  // 一键全部收集
  collectAll() {
    const story = this.data.story;
    if (!story) return;
    const collected = [...this.data.collectedWords];
    let added = 0;
    for (const w of story.keyWords) {
      if (!collected.includes(w.word)) {
        addToWrongBook(w.word, w.meaning, `story_${story.id}`);
        collected.push(w.word);
        added++;
      }
    }
    this.setData({ collectedWords: collected });
    wx.showToast({ title: added ? `已收集 ${added} 个词` : '已全部收集', icon: 'none' });
  },

  // 标记读完
  markFinished() {
    if (!this.data.story) return;
    markStoryFinished(this.data.story.id);
    this.setData({ finished: true });
    wx.showToast({ title: '已标记读完', icon: 'success' });
  }
});
