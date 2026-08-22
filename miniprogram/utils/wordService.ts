// utils/wordService.ts
// 词库云服务：通过云函数获取词汇，本地缓存兜底

import { WordItem, WordBook } from '../data/types';

// 词书元数据（固定信息，不依赖数据库）
const BOOK_META: Omit<WordBook, 'words'>[] = [
  { id: 'junior', name: '初中词汇', desc: '中考大纲词汇', level: '初中' },
  { id: 'senior', name: '高中词汇', desc: '高考大纲词汇', level: '高中' },
  { id: 'cet4', name: '四级词汇', desc: '大学英语四级词汇', level: '四级' },
  { id: 'cet6', name: '六级词汇', desc: '大学英语六级词汇', level: '六级' },
  { id: 'postgrad', name: '考研词汇', desc: '考研大纲词汇', level: '考研' },
  { id: 'ielts', name: '雅思词汇', desc: '雅思核心词汇', level: '雅思' },
  { id: 'toefl', name: '托福词汇', desc: '托福核心词汇', level: '托福' },
  { id: 'gre', name: 'GRE词汇', desc: 'GRE核心词汇', level: 'GRE' }
];

// 本地种子词库（云函数不可用时的兜底）
import { wordBooks as localBooks } from '../data/index';

const CACHE_PREFIX = 'bc_words_';
const CACHE_META_KEY = 'bc_words_meta';
const CACHE_EXPIRE = 7 * 24 * 60 * 60 * 1000; // 7天缓存

// 获取词书列表（含词数）
export async function getBookList(): Promise<{ id: string; name: string; desc: string; level: string; wordCount: number; highFreqCount: number }[]> {
  // 先尝试本地缓存
  const cached = wx.getStorageSync(CACHE_META_KEY);
  if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRE) {
    return cached.data;
  }

  // 从云端拉取
  try {
    const res = await wx.cloud.callFunction({
      name: 'initWords',
      data: { action: 'getMeta' }
    });

    const cloudMeta = res.result as any;
    const books = BOOK_META.map(meta => ({
      ...meta,
      wordCount: cloudMeta.books?.[meta.id]?.wordCount || 0,
      highFreqCount: cloudMeta.books?.[meta.id]?.highFreqCount || 0
    }));

    // 缓存
    wx.setStorageSync(CACHE_META_KEY, { data: books, timestamp: Date.now() });
    return books;
  } catch (err) {
    console.error('获取词书列表失败', err);
    // 返回缓存（即使过期）
    if (cached) return cached.data;
    // 最终兜底：返回本地词库
    return BOOK_META.map(meta => {
      const local = localBooks.find(b => b.id === meta.id);
      return { ...meta, wordCount: local?.words.length || 0, highFreqCount: 0 };
    });
  }
}

// 获取某词书的单词列表（分页拉取，避免超过云函数返回大小限制）
export async function getBookWords(bookId: string): Promise<WordItem[]> {
  const cacheKey = CACHE_PREFIX + bookId;
  
  // 先尝试本地缓存
  const cached = wx.getStorageSync(cacheKey);
  if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRE) {
    return cached.data as WordItem[];
  }

  // 从云函数分页拉取
  try {
    let allWords: WordItem[] = [];
    let page = 0;
    const pageSize = 500;
    let hasMore = true;

    while (hasMore) {
      const res = await wx.cloud.callFunction({
        name: 'initWords',
        data: { action: 'getWords', bookId, page, pageSize }
      });

      const result = res.result as any;
      if (result && result.words && result.words.length > 0) {
        allWords = allWords.concat(result.words);
        hasMore = result.hasMore === true;
        page++;
      } else {
        hasMore = false;
      }
    }

    if (allWords.length > 0) {
      // 缓存
      wx.setStorageSync(cacheKey, { data: allWords, timestamp: Date.now() });
      return allWords;
    }

    // 云函数返回空
    throw new Error('词书数据为空');
  } catch (err) {
    console.error(`获取词书 ${bookId} 失败`, err);
    
    // 返回缓存（即使过期）
    if (cached && cached.data) {
      return cached.data as WordItem[];
    }
    
    // 最终兜底：返回本地种子词库
    const localBook = localBooks.find(b => b.id === bookId);
    if (localBook && localBook.words.length > 0) {
      return localBook.words;
    }
    
    return [];
  }
}

// 获取完整词书对象（含 words）
export async function getBookById(bookId: string): Promise<WordBook | undefined> {
  const meta = BOOK_META.find(m => m.id === bookId);
  if (!meta) return undefined;

  const words = await getBookWords(bookId);
  return {
    ...meta,
    words
  };
}

// 清除词库缓存（切换词书或更新时调用）
export function clearWordCache(bookId?: string): void {
  if (bookId) {
    wx.removeStorageSync(CACHE_PREFIX + bookId);
  } else {
    // 清除所有词库缓存
    BOOK_META.forEach(m => {
      wx.removeStorageSync(CACHE_PREFIX + m.id);
    });
    wx.removeStorageSync(CACHE_META_KEY);
  }
}
