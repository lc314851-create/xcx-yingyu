// pages/booklist/booklist.ts
import { wordBooks } from '../../data/index';
import { getCurrentBookId, setCurrentBookId, getBookProgressStats, hasSelectedBook } from '../../utils/store';

// 难度排序权重 + 主题色
const BOOK_META: Record<string, { order: number; color: string; bgColor: string; tag: string }> = {
  junior:   { order: 1, color: '#4CAF50', bgColor: '#E8F5E9', tag: '入门' },
  senior:   { order: 2, color: '#2196F3', bgColor: '#E3F2FD', tag: '进阶' },
  cet4:     { order: 3, color: '#9C27B0', bgColor: '#F3E5F5', tag: '四级' },
  cet6:     { order: 4, color: '#FF9800', bgColor: '#FFF3E0', tag: '六级' },
  postgrad: { order: 5, color: '#F44336', bgColor: '#FFEBEE', tag: '考研' },
  ielts:    { order: 6, color: '#00BCD4', bgColor: '#E0F7FA', tag: '雅思' },
  toefl:    { order: 7, color: '#795548', bgColor: '#EFEBE9', tag: '托福' },
  gre:      { order: 8, color: '#9E9E9E', bgColor: '#FAFAFA', tag: 'GRE' }
};

interface BookCardData {
  id: string;
  name: string;
  desc: string;
  level: string;
  totalWords: number;
  learned: number;
  learning: number;
  due: number;
  isCurrent: boolean;
  progress: number;      // 0~100
  themeColor: string;
  themeBg: string;
  tag: string;
}

Page({
  data: {
    books: [] as BookCardData[],
    currentBookId: '',
    isFirstTime: false
  },

  onLoad() {
    const firstTime = !hasSelectedBook();
    this.setData({ isFirstTime: firstTime });
    this.loadBooks();
  },

  onShow() {
    this.loadBooks();
  },

  loadBooks() {
    const currentId = getCurrentBookId();
    const books: BookCardData[] = wordBooks.map((b) => {
      const stats = getBookProgressStats(b.id);
      const total = b.words.length;
      const learned = stats.masteredCount;
      const progress = total > 0 ? Math.round((learned / total) * 100) : 0;
      const meta = BOOK_META[b.id] || { order: 99, color: '#4A90D9', bgColor: '#EAF2FC', tag: b.level };
      return {
        id: b.id,
        name: b.name,
        desc: b.desc,
        level: b.level,
        totalWords: total,
        learned,
        learning: stats.learningCount + stats.reviewCount,
        due: stats.dueCount,
        isCurrent: b.id === currentId,
        progress,
        themeColor: meta.color,
        themeBg: meta.bgColor,
        tag: meta.tag
      };
    });

    // 按难度排序
    books.sort((a, b) => {
      const aMeta = BOOK_META[a.id]?.order || 99;
      const bMeta = BOOK_META[b.id]?.order || 99;
      return aMeta - bMeta;
    });

    this.setData({ books, currentBookId: currentId });
  },

  selectBook(e: any) {
    const id = e.currentTarget.dataset.id;
    setCurrentBookId(id);
    this.setData({ currentBookId: id });
    // 更新选中状态
    const books = this.data.books.map((b) => ({
      ...b,
      isCurrent: b.id === id
    }));
    this.setData({ books });
    wx.showToast({ title: '已切换词书', icon: 'success' });

    setTimeout(() => {
      if (this.data.isFirstTime) {
        wx.switchTab({
          url: '/pages/index/index'
        });
      } else {
        wx.navigateBack();
      }
    }, 600);
  }
});
