// pages/booklist/booklist.ts
// 词书选择页（v3 重构）：
//   · 首次使用 → 两步问答引导（身份 → 词书类型）→ 推荐 → 一键开始
//   · 老用户 → 顶部当前词书推荐卡 + 「考试词书 / 教材同步」双 Tab
//       — 考试词书：K12 / 大学 / 出国 三组两列紧凑网格
//       — 教材同步：学段分段器 + 分册列表（原 pages/textbook 合并至此）
import { wordBooks } from '../../data/index';
import { getBookList, getBookById } from '../../utils/wordService';
import { listUserBooks, isUserBookId, UserBookMeta } from '../../utils/userBook';
import {
  getCurrentBookId, setCurrentBookId, getBookProgressStats, getAllProgress, hasSelectedBook
} from '../../utils/store';

// ─── 考试词书元数据：难度排序 + 主题色 + 分组 ───────────────────
interface BookMeta { order: number; color: string; bgColor: string; tag: string; group: string; }

const BOOK_META: Record<string, BookMeta> = {
  junior:   { order: 1, color: '#4CAF50', bgColor: '#E8F5E9', tag: '入门', group: 'k12' },
  senior:   { order: 2, color: '#2196F3', bgColor: '#E3F2FD', tag: '进阶', group: 'k12' },
  zsb:      { order: 2.5, color: '#3F51B5', bgColor: '#E8EAF6', tag: '专升本', group: 'uni' },
  cet4:     { order: 3, color: '#9C27B0', bgColor: '#F3E5F5', tag: '四级', group: 'uni' },
  cet6:     { order: 4, color: '#FF9800', bgColor: '#FFF3E0', tag: '六级', group: 'uni' },
  postgrad: { order: 5, color: '#F44336', bgColor: '#FFEBEE', tag: '考研', group: 'uni' },
  ielts:    { order: 6, color: '#00BCD4', bgColor: '#E0F7FA', tag: '雅思', group: 'abroad' },
  toefl:    { order: 7, color: '#795548', bgColor: '#EFEBE9', tag: '托福', group: 'abroad' },
  gre:      { order: 8, color: '#9E9E9E', bgColor: '#FAFAFA', tag: 'GRE', group: 'abroad' },
};

// 教材同步默认主题色
const PEP_COLOR = '#3E7259';
const PEP_BG = '#E7F0EA';

const EXAM_GROUPS = [
  { key: 'k12', title: 'K12 基础', subtitle: '中考 / 高考' },
  { key: 'uni', title: '大学考试', subtitle: '专升本 / 四六级 / 考研' },
  { key: 'abroad', title: '出国考试', subtitle: '雅思 / 托福 / GRE' }
];

// ─── 首次引导：身份 → 词书类型 ────────────────────────────────
interface WizardOption { key: string; label: string; bookId: string; hint?: string; }
interface StageDef { key: string; label: string; desc: string; options: WizardOption[]; }

const STAGES: StageDef[] = [
  {
    key: 'primary', label: '小学', desc: '教材同步，按册背',
    options: [
      { key: 'pep3_1', label: '三年级上', bookId: 'pep3_1' },
      { key: 'pep4_1', label: '四年级上', bookId: 'pep4_1' },
      { key: 'pep5_1', label: '五年级上', bookId: 'pep5_1' },
      { key: 'pep6_1', label: '六年级上', bookId: 'pep6_1' }
    ]
  },
  {
    key: 'junior', label: '初中', desc: '课本或考试大纲，二选一',
    options: [
      { key: 'textbook', label: '跟着课本背', bookId: 'pepj7_1', hint: '人教七年级上册（新版）' },
      { key: 'exam', label: '背考试大纲', bookId: 'junior', hint: '初中·中考词汇' }
    ]
  },
  {
    key: 'senior', label: '高中', desc: '课本或考试大纲，二选一',
    options: [
      { key: 'textbook', label: '跟着课本背', bookId: 'pepgz1', hint: '人教必修第一册（现行）' },
      { key: 'exam', label: '背考试大纲', bookId: 'senior', hint: '高中·高考词汇' }
    ]
  },
  {
    key: 'college', label: '大学', desc: '目标是什么？',
    options: [
      { key: 'zsb', label: '专升本', bookId: 'zsb', hint: '高职课标 3000 词' },
      { key: 'cet4', label: '四级', bookId: 'cet4', hint: '大学英语四级' },
      { key: 'cet6', label: '六级', bookId: 'cet6', hint: '大学英语六级' }
    ]
  },
  {
    key: 'abroad', label: '考研 / 留学', desc: '目标是什么？',
    options: [
      { key: 'postgrad', label: '考研', bookId: 'postgrad', hint: '考研大纲词汇' },
      { key: 'ielts', label: '雅思', bookId: 'ielts', hint: '雅思核心词汇' },
      { key: 'toefl', label: '托福', bookId: 'toefl', hint: '托福核心词汇' },
      { key: 'gre', label: 'GRE', bookId: 'gre', hint: 'GRE 核心词汇' }
    ]
  }
];

// ─── 教材同步分册配置（tab → 词书 id 列表，顺序即展示顺序） ──────
const TEXTBOOK_TABS = [
  { key: 'junior', title: '初中·新版', subtitle: '2024 新版教材，与现行课本一致' },
  { key: 'senior', title: '高中·现行', subtitle: '2019 课标现行教材' },
  { key: 'classic', title: '经典版', subtitle: '旧课标 PEP 词表，新版整理中' }
];

const TEXTBOOK_GROUPS: Record<string, { id: string; name: string; desc: string }[]> = {
  junior: [
    { id: 'pepj7_1', name: '七年级上册', desc: '2024新版·人教初中' },
    { id: 'pepj7_2', name: '七年级下册', desc: '2024新版·人教初中' },
    { id: 'pepj8_1', name: '八年级上册', desc: '2024新版·人教初中' },
    { id: 'pepj8_2', name: '八年级下册', desc: '2024新版·人教初中' }
  ],
  senior: [
    { id: 'pepgz1', name: '必修第一册', desc: '现行2019课标·人教高中' },
    { id: 'pepgz2', name: '必修第二册', desc: '现行2019课标·人教高中' },
    { id: 'pepgz3', name: '必修第三册', desc: '现行2019课标·人教高中' },
    { id: 'pepgzx1', name: '选择性必修一', desc: '现行2019课标·人教高中' },
    { id: 'pepgzx2', name: '选择性必修二', desc: '现行2019课标·人教高中' },
    { id: 'pepgzx3', name: '选择性必修三', desc: '现行2019课标·人教高中' }
  ],
  classic: [
    { id: 'pep3_1', name: '三年级上', desc: '经典版PEP·2012课标' },
    { id: 'pep3_2', name: '三年级下', desc: '经典版PEP·2012课标' },
    { id: 'pep4_1', name: '四年级上', desc: '经典版PEP·2012课标' },
    { id: 'pep4_2', name: '四年级下', desc: '经典版PEP·2012课标' },
    { id: 'pep5_1', name: '五年级上', desc: '经典版PEP·2012课标' },
    { id: 'pep5_2', name: '五年级下', desc: '经典版PEP·2012课标' },
    { id: 'pep6_1', name: '六年级上', desc: '经典版PEP·2012课标' },
    { id: 'pep6_2', name: '六年级下', desc: '经典版PEP·2012课标' },
    { id: 'pepj9', name: '九年级', desc: '经典版PEP·新版词表整理中' }
  ]
};

interface ExamCard {
  id: string; name: string; desc: string;
  total: number; learned: number; due: number;
  progress: number; isCurrent: boolean;
  color: string; bg: string; tag: string;
}

interface GroupData { key: string; title: string; subtitle: string; books: ExamCard[]; }

interface TbRow {
  id: string; name: string; desc: string;
  wordCount: number; learned: number; mastered: number;
  progressPct: number; isCurrent: boolean;
}

Page({
  data: {
    view: 'main' as 'wizard' | 'main', // 首次=向导，否则=主界面
    mainTab: 'exam' as 'exam' | 'textbook',

    // 向导
    stages: STAGES,
    wizardStep: 1,
    stageOptions: [] as WizardOption[],
    recommend: null as any,

    // 当前词书推荐卡
    current: null as any,

    // 考试词书分组
    groups: [] as GroupData[],

    // 教材同步
    tbTabs: TEXTBOOK_TABS,
    tbActive: 'junior',
    tbSubtitle: TEXTBOOK_TABS[0].subtitle,
    tbRows: [] as TbRow[],

    // 我的词书（用户自定义上传）
    myBooks: [] as { bookId: string; name: string; total: number; isCurrent: boolean }[],

    loading: true
  },

  // 云端词书元数据缓存（不参与渲染）
  _meta: {} as Record<string, { name: string; wordCount: number; desc: string }>,
  _fromFirstPick: false, // 首次引导里点了「查看全部词书」

  onLoad(options: any) {
    const firstTime = !hasSelectedBook();
    const mainTab = (!firstTime && options && options.tab === 'textbook') ? 'textbook' : 'exam';
    this.setData({
      view: firstTime ? 'wizard' : 'main',
      wizardStep: 1,
      mainTab: mainTab as 'exam' | 'textbook'
    });
    this.initMeta();
  },

  onShow() {
    // 从背词页返回：刷新进度展示
    if (this.data.view === 'main' && !this.data.loading) {
      this.buildCurrent();
      if (this.data.mainTab === 'textbook') this.loadTbRows();
      else this.buildExamGroups();
    }
  },

  // ─── 数据加载 ────────────────────────────────────────────────
  async initMeta() {
    try {
      const list = await getBookList();
      const meta: Record<string, { name: string; wordCount: number; desc: string }> = {};
      list.forEach((b: any) => {
        meta[b.id] = { name: b.name, wordCount: b.wordCount || 0, desc: b.desc || '' };
      });
      this._meta = meta;
    } catch (e) {
      // 云端不可用：本地词书兜底
      wordBooks.forEach((b) => {
        this._meta[b.id] = { name: b.name, wordCount: b.words.length, desc: b.desc };
      });
    }

    if (this.data.view === 'wizard') {
      this.buildRecommend();
    } else {
      this.buildCurrent();
      this.buildExamGroups();
      if (this.data.mainTab === 'textbook') this.loadTbRows();
    }
    // 个人词书不阻塞官方词书展示，失败静默
    this.loadMyBooks();
    this.setData({ loading: false });
  },

  // ─── 我的词书（用户自定义上传）────────────────────────────────
  async loadMyBooks() {
    try {
      const books = await listUserBooks();
      const ids = new Set((books || []).map((b: UserBookMeta) => b.bookId));
      const currentId = getCurrentBookId();

      // 自愈：当前词书指向一本已不存在的个人词书
      // （旧版本删除时没重置指针，或在其他设备上删的）→ 重置回默认词书，
      // 否则顶部「当前词书」卡会一直显示裸 bookId（如 u_bg8hte71）
      let stale = false;
      if (currentId && isUserBookId(currentId) && !ids.has(currentId)) {
        setCurrentBookId('junior');
        stale = true;
      }
      const effectiveId = stale ? 'junior' : currentId;

      const rows = (books || []).map((b: UserBookMeta) => ({
        bookId: b.bookId,
        name: b.name,
        total: b.total || 0,
        isCurrent: b.bookId === effectiveId
      }));
      // 并入 _meta，让顶部「当前词书」卡能正确显示个人词书的名字和词数
      rows.forEach((b) => {
        this._meta[b.bookId] = { name: b.name, wordCount: b.total, desc: '我的专属词书' };
      });
      this.setData({ myBooks: rows });
      if (stale || (effectiveId && isUserBookId(effectiveId))) this.buildCurrent();
    } catch (e) {
      // 未登录 / 云函数异常时不影响官方词书
    }
  },

  goMyBooks() {
    wx.navigateTo({ url: '/pages/mybooks/mybooks' });
  },

  // 当前词书推荐卡
  buildCurrent() {
    const id = getCurrentBookId();
    const meta = this._meta[id] || wordBooks.find(b => b.id === id);
    const stats = getBookProgressStats(id);
    const name = meta ? meta.name : id;
    const total = meta ? meta.wordCount : (wordBooks.find(b => b.id === id)?.words.length || 0);
    const mastered = stats.masteredCount;
    const due = stats.dueCount;
    this.setData({
      current: {
        name,
        total,
        mastered,
        due,
        progress: total > 0 ? Math.round((mastered / total) * 100) : 0
      }
    });
  },

  // 考试词书：分组网格
  buildExamGroups() {
    const currentId = getCurrentBookId();
    const exams = Object.keys(BOOK_META);
    const groups: GroupData[] = EXAM_GROUPS.map((g) => {
      const books: ExamCard[] = exams
        .filter((id) => BOOK_META[id].group === g.key)
        .sort((a, b) => BOOK_META[a].order - BOOK_META[b].order)
        .map((id) => {
          const meta = this._meta[id];
          const stats = getBookProgressStats(id);
          const total = meta ? meta.wordCount : (wordBooks.find(b => b.id === id)?.words.length || 0);
          const learned = stats.masteredCount;
          return {
            id,
            name: meta ? meta.name : id,
            desc: meta ? meta.desc : '',
            total,
            learned,
            due: stats.dueCount,
            progress: total > 0 ? Math.round((learned / total) * 100) : 0,
            isCurrent: id === currentId,
            color: BOOK_META[id].color,
            bg: BOOK_META[id].bgColor,
            tag: BOOK_META[id].tag
          };
        });
      return { ...g, books };
    });
    this.setData({ groups });
  },

  // 教材同步：分册列表
  async loadTbRows() {
    const defs = TEXTBOOK_GROUPS[this.data.tbActive] || [];
    const rows: TbRow[] = defs.map(def => {
      const meta = this._meta[def.id];
      const progress = getAllProgress(def.id);
      let learned = 0;
      let mastered = 0;
      Object.values(progress).forEach((p: any) => {
        if ((p.box || 1) >= 2) learned++;
        if ((p.box || 1) >= 5) mastered++;
      });
      const wordCount = (meta && meta.wordCount) || 0;
      return {
        id: def.id,
        name: def.name,
        desc: def.desc,
        wordCount,
        learned,
        mastered,
        progressPct: wordCount > 0 ? Math.min(100, Math.round(learned / wordCount * 100)) : 0,
        isCurrent: def.id === getCurrentBookId()
      };
    });
    this.setData({ tbRows: rows });
  },

  // ─── 首次引导 ────────────────────────────────────────────────
  tapStage(e: any) {
    const key = e.currentTarget.dataset.key as string;
    const stage = STAGES.find(s => s.key === key);
    if (!stage) return;
    this.setData({
      wizardStep: 2,
      stageOptions: stage.options
    });
  },

  backToStage1() {
    this.setData({ wizardStep: 1 });
  },

  tapOption(e: any) {
    const bookId = e.currentTarget.dataset.book as string;
    this.buildRecommend(bookId);
    this.setData({ wizardStep: 3 });
  },

  // 计算推荐词书信息
  buildRecommend(bookId?: string) {
    let id = bookId;
    if (!id) {
      // 默认：小学 → 三年级上；其余取该身份第一个选项
      id = STAGES[0].options[0].bookId;
    }
    const meta = this._meta[id];
    const local = wordBooks.find(b => b.id === id);
    const isPep = id.startsWith('pep');
    const name = meta ? meta.name : (local ? local.name : id);
    const wordCount = meta ? meta.wordCount : (local ? local.words.length : 0);
    const desc = meta ? meta.desc : (local ? local.desc : '');
    this.setData({
      recommend: {
        id,
        name,
        wordCount,
        desc,
        recMeta: wordCount > 0 ? `${wordCount} 词${desc ? ' · ' + desc : ''}` : (desc || ''),
        color: isPep ? PEP_COLOR : (BOOK_META[id]?.color || '#2F5746'),
        bg: isPep ? PEP_BG : (BOOK_META[id]?.bgColor || '#E7F0EA')
      }
    });
  },

  // 首次引导：选其他 → 进入主界面
  goAllBooks() {
    this._fromFirstPick = true;
    this.setData({ view: 'main' });
    this.buildCurrent();
    this.buildExamGroups();
  },

  // ─── 主界面 ──────────────────────────────────────────────────
  switchMainTab(e: any) {
    const key = e.currentTarget.dataset.key as 'exam' | 'textbook';
    this.setData({ mainTab: key });
    if (key === 'textbook') this.loadTbRows();
  },

  switchTbTab(e: any) {
    const key = e.currentTarget.dataset.key as string;
    const tab = TEXTBOOK_TABS.find(t => t.key === key);
    this.setData({ tbActive: key, tbSubtitle: tab ? tab.subtitle : '' });
    this.loadTbRows();
  },

  // 推荐卡：直接去背当前词书
  goStudy() {
    wx.switchTab({ url: '/pages/words/words' });
  },

  goVocabTest() {
    wx.navigateTo({ url: '/pages/vocabtest/vocabtest' });
  },

  // 选中一本词书
  async selectBook(e: any) {
    const id = e.currentTarget.dataset.id as string;
    // 已选过词书且点击的就是当前词书：直接去背
    if (hasSelectedBook() && id === getCurrentBookId()) {
      wx.switchTab({ url: '/pages/words/words' });
      return;
    }
    wx.showLoading({ title: '加载词书...' });
    try {
      const book = await getBookById(id);
      wx.hideLoading();
      if (!book || !book.words || book.words.length === 0) {
        wx.showToast({ title: '这本词书还在准备中，先换一本吧', icon: 'none' });
        return;
      }
      setCurrentBookId(id);
      // 不清空词库缓存：刚拉取的词书已写入 7 天缓存，清掉会导致每次切书都重新下载
      this.buildCurrent();
      if (this.data.mainTab === 'textbook') this.loadTbRows();
      wx.showToast({ title: '已切换', icon: 'success' });

      setTimeout(() => {
        if (this.data.view === 'wizard' || this._fromFirstPick) {
          // 首次：进入首页开始学习
          wx.switchTab({ url: '/pages/index/index' });
        } else {
          wx.navigateBack();
        }
      }, 500);
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '这本词书还在准备中，先换一本吧', icon: 'none' });
    }
  },

  confirmRecommend() {
    if (!this.data.recommend) return;
    this.selectBook({ currentTarget: { dataset: { id: this.data.recommend.id } } } as any);
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '选一本词书，开始补回落下的单词',
      path: '/pages/index/index'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '选一本词书，开始补回落下的单词'
    };
  },
});