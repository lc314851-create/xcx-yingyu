// pages/mybooks/mybooks.ts
// 我的词书：用户自定义上传（粘贴一段英文 → 服务端抽词匹配 → 存成私有词书）
//
// 四个视图：
//   list   词书列表（点击进详情，长按快捷改名/删除）
//   detail 词书详情：词单 + 逐个删词 + 改名 + 删除整本 + 设为当前学习
//   create 粘贴文本 → 起名 → 生成
//   result 生成结果（命中 / 未收录 / 虚词过滤）
//
// 交互约定：点击卡片 = 看详情（不是直接背）；要背，在详情页点「开始学习」。
// 所有数据走 userBook 云函数，服务端按 _openid 隔离，这里不做权限判断。
import {
  listUserBooks, createUserBook, renameUserBook, removeUserBook,
  removeUserWord, getUserBook, isUserBookId, USER_BOOK_LIMITS,
  UserBookMeta, UserBookWord, CreateResult
} from '../../utils/userBook';
import { setCurrentBookId, getCurrentBookId } from '../../utils/store';

type View = 'list' | 'detail' | 'create' | 'result';

interface BookRow {
  bookId: string;
  name: string;
  desc: string;
  total: number;
  missed: number;
  timeText: string;
}

interface WordRow {
  word: string;
  phonetic: string;
  meaning: string;
  matchedForm: string;
}

function fmtTime(t: any): string {
  const d = t ? new Date(t) : null;
  if (!d || isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

Page({
  data: {
    view: 'list' as View,
    loading: true,
    books: [] as BookRow[],

    // ─── detail ───
    detailLoading: false,
    detail: null as null | {
      bookId: string;
      name: string;
      desc: string;
      total: number;
      words: WordRow[];
      isCurrent: boolean;
    },

    // ─── create ───
    name: '',
    desc: '',
    rawText: '',
    submitting: false,
    rawLen: 0,

    // ─── result ───
    result: null as null | {
      bookId: string;
      name: string;
      total: number;
      missed: number;
      funcFiltered: number;
      missedSamples: string[];
      examples: string[]
    }
  },

  onLoad() {
    this.loadBooks();
  },

  onShow() {
    // 从背书页返回时刷新（词数可能变了）
    if (this.data.view === 'list') this.loadBooks();
  },

  // ─── 列表 ──────────────────────────────────────────────────────
  async loadBooks() {
    this.setData({ loading: true });
    try {
      const books = await listUserBooks();
      const rows: BookRow[] = (books || []).map((b: UserBookMeta) => ({
        bookId: b.bookId,
        name: b.name,
        desc: b.desc,
        total: b.total || 0,
        missed: b.missed || 0,
        timeText: fmtTime(b.createTime)
      }));
      this.setData({ books: rows, loading: false });
    } catch (e: any) {
      this.setData({ loading: false });
      wx.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
    }
  },

  goCreate() {
    this.setData({ view: 'create', name: '', desc: '', rawText: '', rawLen: 0 });
  },

  backToList() {
    this.setData({ view: 'list', detail: null });
    this.loadBooks();
  },

  // 点击卡片 → 进详情（不是直接背）
  tapBook(e: any) {
    const id = e.currentTarget.dataset.id as string;
    if (!isUserBookId(id)) return;
    this.openDetail(id);
  },

  // ─── 详情 ──────────────────────────────────────────────────────
  async openDetail(bookId: string) {
    this.setData({ view: 'detail', detailLoading: true, detail: null });
    try {
      const book = await getUserBook(bookId);
      if (!book) {
        wx.showToast({ title: '词书不存在或已删除', icon: 'none' });
        this.setData({ view: 'list', detailLoading: false });
        this.loadBooks();
        return;
      }
      const words: WordRow[] = (book.words || []).map((w: UserBookWord) => ({
        word: w.word,
        phonetic: w.phonetic || '',
        meaning: w.meaning || '',
        matchedForm: w.matchedForm || ''
      }));
      this.setData({
        detailLoading: false,
        detail: {
          bookId: book.bookId,
          name: book.name,
          desc: book.desc || '',
          total: words.length,
          words,
          isCurrent: false
        }
      });
      this.markCurrent();
    } catch (e: any) {
      this.setData({ detailLoading: false });
      wx.showToast({ title: (e && e.message) || '加载失败', icon: 'none' });
    }
  },

  // 标记当前正在学的是哪本
  markCurrent() {
    const d = this.data.detail;
    if (!d) return;
    this.setData({ 'detail.isCurrent': d.bookId === getCurrentBookId() });
  },

  // 设为正在学习的词书（不跳转）
  setAsCurrent() {
    const d = this.data.detail;
    if (!d) return;
    setCurrentBookId(d.bookId);
    this.setData({ 'detail.isCurrent': true });
    wx.showToast({ title: '已设为当前学习', icon: 'success' });
  },

  // 设为当前并直接去背
  goStudy() {
    const d = this.data.detail;
    if (!d) return;
    setCurrentBookId(d.bookId);
    wx.navigateTo({ url: '/pages/words/words' });
  },

  // 详情页里改名
  renameFromDetail() {
    const d = this.data.detail;
    if (!d) return;
    wx.showModal({
      title: '重新命名',
      editable: true,
      placeholderText: '新的词书名（最多 20 字）',
      content: d.name,
      success: async (res: any) => {
        if (!res.confirm) return;
        const name = (res.content || '').trim();
        if (!name) {
          wx.showToast({ title: '名字不能为空', icon: 'none' });
          return;
        }
        try {
          await renameUserBook(d.bookId, name);
          this.setData({ 'detail.name': name });
          wx.showToast({ title: '已改名', icon: 'success' });
        } catch (e: any) {
          wx.showToast({ title: (e && e.message) || '改名失败', icon: 'none' });
        }
      }
    });
  },

  // 详情页里删除整本
  removeBookFromDetail() {
    const d = this.data.detail;
    if (!d) return;
    wx.showModal({
      title: '删除词书',
      content: `确定删除「${d.name}」吗？\n删除后学习进度也会一并清除，无法恢复。`,
      confirmText: '删除',
      confirmColor: '#B84A3E',
      success: async (res: any) => {
        if (!res.confirm) return;
        try {
          await removeUserBook(d.bookId);
          this.resetCurrentIfDeleted(d.bookId);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.backToList();
        } catch (e: any) {
          wx.showToast({ title: (e && e.message) || '删除失败', icon: 'none' });
        }
      }
    });
  },

  // 删除单个词
  removeWordItem(e: any) {
    const d = this.data.detail;
    if (!d) return;
    const word = e.currentTarget.dataset.word as string;
    if (!word) return;
    wx.showModal({
      title: '删除单词',
      content: `从「${d.name}」里删掉 ${word}？`,
      confirmText: '删除',
      confirmColor: '#B84A3E',
      success: async (res: any) => {
        if (!res.confirm) return;
        try {
          await removeUserWord(d.bookId, word);
          const words = (d.words as WordRow[]).filter((w: WordRow) => w.word !== word);
          this.setData({ 'detail.words': words, 'detail.total': words.length });
          wx.showToast({ title: '已删除', icon: 'success' });
        } catch (e: any) {
          wx.showToast({ title: (e && e.message) || '删除失败', icon: 'none' });
        }
      }
    });
  },

  // ─── 列表页的长按（快捷改名/删除）──────────────────────────────
  onBookLongPress(e: any) {
    const id = e.currentTarget.dataset.id as string;
    const name = e.currentTarget.dataset.name as string;
    wx.showActionSheet({
      itemList: ['重新命名', '删除这本词书'],
      success: (res: any) => {
        if (res.tapIndex === 0) this.promptRename(id, name);
        else if (res.tapIndex === 1) this.confirmRemove(id, name);
      }
    });
  },

  promptRename(id: string, oldName: string) {
    wx.showModal({
      title: '重新命名',
      editable: true,
      placeholderText: '新的词书名（最多 20 字）',
      content: oldName,
      success: async (res: any) => {
        if (!res.confirm) return;
        const name = (res.content || '').trim();
        if (!name) {
          wx.showToast({ title: '名字不能为空', icon: 'none' });
          return;
        }
        try {
          await renameUserBook(id, name);
          wx.showToast({ title: '已改名', icon: 'success' });
          this.loadBooks();
        } catch (e: any) {
          wx.showToast({ title: (e && e.message) || '改名失败', icon: 'none' });
        }
      }
    });
  },

  // 删除后若删的是「当前词书」，重置回默认词书，
  // 否则首页会一直查一本已删除的书（getBookById → not found）
  resetCurrentIfDeleted(id: string) {
    if (getCurrentBookId() === id) {
      setCurrentBookId('junior');
    }
  },

  confirmRemove(id: string, name: string) {
    wx.showModal({
      title: '删除词书',
      content: `确定删除「${name}」吗？\n删除后学习进度也会一并清除，无法恢复。`,
      confirmText: '删除',
      confirmColor: '#B84A3E',
      success: async (res: any) => {
        if (!res.confirm) return;
        try {
          await removeUserBook(id);
          this.resetCurrentIfDeleted(id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadBooks();
        } catch (e: any) {
          wx.showToast({ title: (e && e.message) || '删除失败', icon: 'none' });
        }
      }
    });
  },

  // ─── 创建 ──────────────────────────────────────────────────────
  onNameInput(e: any) {
    this.setData({ name: (e.detail.value || '').slice(0, USER_BOOK_LIMITS.nameLen) });
  },

  onDescInput(e: any) {
    this.setData({ desc: (e.detail.value || '').slice(0, USER_BOOK_LIMITS.descLen) });
  },

  onTextInput(e: any) {
    const v = e.detail.value || '';
    this.setData({ rawText: v.slice(0, USER_BOOK_LIMITS.rawTextLen), rawLen: v.length });
  },

  async submitCreate() {
    const { name, desc, rawText, submitting } = this.data;
    if (submitting) return;
    if (!name.trim()) {
      wx.showToast({ title: '先给词书起个名字', icon: 'none' });
      return;
    }
    if (rawText.trim().length < 10) {
      wx.showToast({ title: '内容太短了，多贴点英文', icon: 'none' });
      return;
    }

    this.setData({ submitting: true });
    try {
      const r: CreateResult = await createUserBook({ name, desc, source: 'paste', rawText });
      this.setData({
        submitting: false,
        view: 'result',
        rawText: '',
        name: '',
        desc: '',
        rawLen: 0,
        result: {
          bookId: r.bookId,
          name: r.name,
          total: (r.stats && r.stats.total) || 0,
          missed: (r.stats && r.stats.missed) || 0,
          funcFiltered: (r.stats && r.stats.funcFiltered) || 0,
          missedSamples: r.missedSamples || [],
          examples: (r.words || [])
            .filter((w) => w.example && w.example.length > 10)
            .slice(0, 3)
            .map((w) => w.example)
        }
      });
      wx.showToast({ title: '已生成', icon: 'success' });
    } catch (e: any) {
      this.setData({ submitting: false });
      wx.showModal({ title: '生成失败', content: (e && e.message) || '请稍后重试', showCancel: false });
    }
  },

  // ─── 结果页 ────────────────────────────────────────────────────
  // 生成完直接进详情，让用户马上看到这 14 个词长什么样
  tapOpenDetail() {
    const r = this.data.result;
    if (!r) return;
    this.setData({ result: null });
    this.openDetail(r.bookId);
  },

  tapBackList() {
    this.setData({ view: 'list', result: null });
    this.loadBooks();
  }
});
