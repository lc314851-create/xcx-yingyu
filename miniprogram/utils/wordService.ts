// utils/wordService.ts
// 词库云服务：优先从云存储下载 JSON 文件（CDN 缓存，秒开），云函数分页兜底

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

// 本地种子词库（云存储和云函数都不可用时的兜底）
import { wordBooks as localBooks } from '../data/index';

// v2：词库字段升级（root/rootGloss/relatedWords/lemma），旧缓存不可复用
const CACHE_PREFIX = 'bc_words_v2_';
const CACHE_META_KEY = 'bc_words_meta_v2';
const CACHE_EXPIRE = 7 * 24 * 60 * 60 * 1000; // 7天缓存

// 云存储 JSON 文件的路径前缀
// 文件格式：wordbooks/{bookId}.json
const CLOUD_FILE_PATH = (bookId: string) => `wordbooks/${bookId}.json`;

// ─── 方案一：云存储 JSON 下载（首选，CDN 缓存，秒开） ──────────
async function getBookWordsFromCloudFile(bookId: string): Promise<WordItem[] | null> {
  try {
    if (!wx.cloud || !wx.cloud.downloadFile) return null;

    const res = await wx.cloud.downloadFile({
      cloudPath: CLOUD_FILE_PATH(bookId)
    });

    if (!res || !res.tempFilePath) return null;

    // 读取临时文件内容
    const fs = wx.getFileSystemManager();
    const content = fs.readFileSync(res.tempFilePath, 'utf-8') as string;
    const words: WordItem[] = JSON.parse(content);

    if (words && words.length > 0) {
      return words;
    }
    return null;
  } catch (err) {
    console.log(`云存储下载 ${bookId} 失败（将使用云函数兜底）`, err);
    return null;
  }
}

// ─── 方案二：云函数分页拉取（兜底） ──────────────────────────────
async function getBookWordsFromCloudFunction(bookId: string): Promise<WordItem[] | null> {
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

    return allWords.length > 0 ? allWords : null;
  } catch (err) {
    console.error(`云函数拉取 ${bookId} 失败`, err);
    return null;
  }
}

// 获取词书列表（含词数）
export async function getBookList(): Promise<{ id: string; name: string; desc: string; level: string; wordCount: number; highFreqCount: number }[]> {
  // 先尝试本地缓存
  const cached = wx.getStorageSync(CACHE_META_KEY);
  if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRE) {
    return cached.data;
  }

  // 尝试从云存储下载元数据 JSON
  try {
    if (wx.cloud && wx.cloud.downloadFile) {
      const res = await wx.cloud.downloadFile({
        cloudPath: 'wordbooks/books_meta.json'
      });
      if (res && res.tempFilePath) {
        const fs = wx.getFileSystemManager();
        const content = fs.readFileSync(res.tempFilePath, 'utf-8') as string;
        const cloudMeta = JSON.parse(content);
        if (cloudMeta && cloudMeta.books) {
          const books = BOOK_META.map(meta => ({
            ...meta,
            wordCount: cloudMeta.books[meta.id]?.wordCount || 0,
            highFreqCount: cloudMeta.books[meta.id]?.highFreqCount || 0
          }));
          wx.setStorageSync(CACHE_META_KEY, { data: books, timestamp: Date.now() });
          return books;
        }
      }
    }
  } catch (err) {
    console.log('云存储元数据下载失败，使用云函数兜底');
  }

  // 从云函数拉取
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

// 获取某词书的单词列表
// 优先级：本地缓存 → 云存储 JSON 下载 → 云函数分页 → 本地种子
export async function getBookWords(bookId: string): Promise<WordItem[]> {
  const cacheKey = CACHE_PREFIX + bookId;

  // 1. 先尝试本地缓存
  const cached = wx.getStorageSync(cacheKey);
  if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRE) {
    return cached.data as WordItem[];
  }

  // 2. 尝试云存储 JSON 下载（CDN 缓存，秒开）
  const cloudFileWords = await getBookWordsFromCloudFile(bookId);
  if (cloudFileWords && cloudFileWords.length > 0) {
    wx.setStorageSync(cacheKey, { data: cloudFileWords, timestamp: Date.now() });
    return cloudFileWords;
  }

  // 3. 云函数分页拉取（兜底）
  const cloudFnWords = await getBookWordsFromCloudFunction(bookId);
  if (cloudFnWords && cloudFnWords.length > 0) {
    wx.setStorageSync(cacheKey, { data: cloudFnWords, timestamp: Date.now() });
    return cloudFnWords;
  }

  // 4. 返回缓存（即使过期）
  if (cached && cached.data) {
    return cached.data as WordItem[];
  }

  // 5. 最终兜底：返回本地种子词库
  const localBook = localBooks.find(b => b.id === bookId);
  if (localBook && localBook.words.length > 0) {
    return localBook.words;
  }

  return [];
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
