// utils/userBook.ts
// 个人词书：客户端封装
//
// 数据全部走 userBook 云函数（服务端按 _openid 校验，客户端不做权限判断）。
// 抽词 / 词形归一 / 例句回填都在服务端，客户端只负责：
//   1) 输入校验与字数限制（即时反馈，省一次云函数调用）
//   2) 云函数调用与结果转成 WordItem，接入现有背书流程
//
// 设计说明见 docs/个人词书功能设计方案.md

import { WordItem } from '../data/types';

// ─── 类型 ────────────────────────────────────────────────────────
export interface UserBookWord {
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  isHighFreq?: boolean;
  from?: string;        // 来自哪本官方词书
  matchedForm?: string; // 原文中的形态（如 running），空串表示原形命中
}

export interface UserBookStats {
  total: number;
  matched: number;
  missed: number;
  funcFiltered: number;
  truncated: number;
}

export interface UserBookMeta {
  bookId: string;
  name: string;
  desc: string;
  source: 'paste' | 'txt' | 'image';
  total: number;
  missed: number;
  createTime: string;
  updateTime: string;
}

export interface UserBook {
  bookId: string;
  name: string;
  desc: string;
  source: string;
  words: UserBookWord[];
  stats: UserBookStats | null;
}

// 与云函数 LIMITS 保持一致（云函数是权威，这里只用于即时提示）
export const USER_BOOK_LIMITS = {
  rawTextLen: 20000,
  wordsPerBook: 500,
  booksPerUser: 20,
  nameLen: 20,
  descLen: 60
};

// ─── 判定 ────────────────────────────────────────────────────────
// 官方词书 id 是 junior / cet4 等；个人词书一律 u_ 前缀，
// 目的是避免与 users 文档里的 progress_${bookId} 字段撞车
export function isUserBookId(bookId: string): boolean {
  return typeof bookId === 'string' && bookId.indexOf('u_') === 0;
}

// ─── 云函数调用 ──────────────────────────────────────────────────
function call<T>(data: Record<string, unknown>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'userBook',
      data,
      success: (res: any) => {
        const r = res && res.result;
        if (r && r.ok) {
          resolve(r as T);
        } else {
          reject(new Error((r && r.message) || (r && r.error) || '操作失败'));
        }
      },
      fail: (err: any) => reject(new Error((err && err.errMsg) || '网络异常'))
    });
  });
}

// ─── 建书 ────────────────────────────────────────────────────────
export interface CreateUserInput {
  name: string;
  desc?: string;
  source?: 'paste' | 'txt' | 'image';
  rawText: string;
}

export interface CreateResult {
  ok: true;
  bookId: string;
  name: string;
  words: UserBookWord[];
  stats: UserBookStats;
  missedSamples: string[];
}

export function createUserBook(input: CreateUserInput): Promise<CreateResult> {
  return call<CreateResult>({
    action: 'create',
    name: (input.name || '').trim(),
    desc: (input.desc || '').trim(),
    source: input.source || 'paste',
    rawText: input.rawText || ''
  });
}

// ─── 列表 / 读取 ─────────────────────────────────────────────────
export async function listUserBooks(): Promise<UserBookMeta[]> {
  const r = await call<{ books: UserBookMeta[] }>({ action: 'list' });
  return (r.books || []) as UserBookMeta[];
}

// 同一会话内的整书缓存，避免每次进背书页都拉一次云函数
const memoryCache = new Map<string, UserBook>();

export async function getUserBook(bookId: string): Promise<UserBook | null> {
  const hit = memoryCache.get(bookId);
  if (hit) return hit;

  try {
    const r = await call<{ book: UserBook }>({ action: 'get', bookId });
    const book = r.book || null;
    if (book) memoryCache.set(bookId, book);
    return book;
  } catch (e: any) {
    // 「not found」= 词书不存在或已被删除，属预期情况（如首页拿已删的当前词书来查），
    // 返回 null 让调用方走兜底，不当错误抛出；顺手清掉可能的脏缓存
    const msg = (e && e.message) || '';
    if (msg.indexOf('not found') >= 0) {
      memoryCache.delete(bookId);
      return null;
    }
    throw e;
  }
}

// ─── 改名 / 删除 ─────────────────────────────────────────────────
export function renameUserBook(bookId: string, name: string, desc?: string): Promise<void> {
  return call<void>({
    action: 'rename',
    bookId,
    name: (name || '').trim(),
    desc: (desc || '').trim()
  }).then(() => {
    // 改名后同步内存缓存，避免列表页读到旧名字
    const hit = memoryCache.get(bookId);
    if (hit) {
      hit.name = (name || '').trim();
      if (typeof desc === 'string') hit.desc = desc.trim();
    }
  });
}

export function removeUserBook(bookId: string): Promise<void> {
  return call<void>({ action: 'remove', bookId }).then(() => {
    memoryCache.delete(bookId);
  });
}

// ─── 删除单词（详情页逐个删）────────────────────────────────────
export function removeUserWord(bookId: string, word: string): Promise<{ total: number }> {
  return call<{ total: number }>({ action: 'removeWord', bookId, word }).then((r) => {
    const hit = memoryCache.get(bookId);
    if (hit && hit.words) {
      hit.words = hit.words.filter((w) => w.word !== word);
      if (hit.stats) hit.stats.total = r.total;
    }
    return { total: r.total };
  });
}

// ─── 接入现有背书流程 ────────────────────────────────────────────
// 个人词书的词条结构与官方 WordItem 几乎一致，
// 多出来的 matchedForm / from 对背书页无影响，透传即可
export function toWordItems(words: UserBookWord[]): WordItem[] {
  return (words || []).map((w) => ({
    word: w.word,
    phonetic: w.phonetic || '',
    meaning: w.meaning || '',
    example: w.example || '',
    isHighFreq: !!w.isHighFreq,
    posTag: 'content' as const,
    from: w.from || '',
    matchedForm: w.matchedForm || ''
  }));
}

// 官方词书元数据形状（供 booklist 页拼装列表用）
export function toBookMeta(book: UserBook): {
  id: string; name: string; desc: string; level: string; wordCount: number;
} {
  return {
    id: book.bookId,
    name: book.name,
    desc: book.desc || '我的专属词书',
    level: '我的',
    wordCount: (book.words || []).length
  };
}
