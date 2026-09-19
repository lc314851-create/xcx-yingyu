// utils/wordService.ts
// 词库云服务：优先从云存储下载 JSON 文件（CDN 缓存，秒开），云函数分页兜底

import { WordItem, WordBook } from '../data/types';

// 词书元数据（固定信息，不依赖数据库）
const BOOK_META: Omit<WordBook, 'words'>[] = [
  // ─── 人教版教材同步词书 ──────────────
  // 初中：2024 新版教材（现行）
  { id: 'pepj7_1', name: '人教版七年级上册', desc: '2024新版人教初中英语七年级上册课本词汇', level: '初一' },
  { id: 'pepj7_2', name: '人教版七年级下册', desc: '2024新版人教初中英语七年级下册课本词汇', level: '初一' },
  { id: 'pepj8_1', name: '人教版八年级上册', desc: '2024新版人教初中英语八年级上册课本词汇', level: '初二' },
  { id: 'pepj8_2', name: '人教版八年级下册', desc: '2024新版人教初中英语八年级下册课本词汇', level: '初二' },
  // 高中：现行 2019 课标教材
  { id: 'pepgz1', name: '人教版必修第一册', desc: '现行2019课标人教高中英语必修第一册课本词汇', level: '高一' },
  { id: 'pepgz2', name: '人教版必修第二册', desc: '现行2019课标人教高中英语必修第二册课本词汇', level: '高一' },
  { id: 'pepgz3', name: '人教版必修第三册', desc: '现行2019课标人教高中英语必修第三册课本词汇', level: '高二' },
  { id: 'pepgzx1', name: '人教版选择性必修一', desc: '现行2019课标人教高中英语选择性必修第一册课本词汇', level: '高二' },
  { id: 'pepgzx2', name: '人教版选择性必修二', desc: '现行2019课标人教高中英语选择性必修第二册课本词汇', level: '高二' },
  { id: 'pepgzx3', name: '人教版选择性必修三', desc: '现行2019课标人教高中英语选择性必修第三册课本词汇', level: '高三' },
  // 经典版（2012课标旧PEP，新版词表待开源数据可用后替换）
  { id: 'pep3_1', name: 'PEP经典版·三年级上', desc: '经典版PEP小学英语三年级上册词汇（2012课标）', level: '小学' },
  { id: 'pep3_2', name: 'PEP经典版·三年级下', desc: '经典版PEP小学英语三年级下册词汇（2012课标）', level: '小学' },
  { id: 'pep4_1', name: 'PEP经典版·四年级上', desc: '经典版PEP小学英语四年级上册词汇（2012课标）', level: '小学' },
  { id: 'pep4_2', name: 'PEP经典版·四年级下', desc: '经典版PEP小学英语四年级下册词汇（2012课标）', level: '小学' },
  { id: 'pep5_1', name: 'PEP经典版·五年级上', desc: '经典版PEP小学英语五年级上册词汇（2012课标）', level: '小学' },
  { id: 'pep5_2', name: 'PEP经典版·五年级下', desc: '经典版PEP小学英语五年级下册词汇（2012课标）', level: '小学' },
  { id: 'pep6_1', name: 'PEP经典版·六年级上', desc: '经典版PEP小学英语六年级上册词汇（2012课标）', level: '小学' },
  { id: 'pep6_2', name: 'PEP经典版·六年级下', desc: '经典版PEP小学英语六年级下册词汇（2012课标）', level: '小学' },
  { id: 'pepj9', name: 'PEP经典版·九年级', desc: '经典版PEP初中英语九年级全册词汇（新版九年级词表待更新）', level: '初三' },

  { id: 'junior', name: '初中词汇', desc: '中考大纲词汇', level: '初中' },
  { id: 'senior', name: '高中词汇', desc: '高考大纲词汇', level: '高中' },
  { id: 'zsb', name: '专升本词汇', desc: '专升本考试大纲词汇（高职课标）', level: '专升本' },
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
const CACHE_PREFIX = 'bc_words_v4_'; // v4：v3 时期云函数兕底曾把无 posTag 的旧词条写入缓存，升版强制重拉
// v3: 新增专升本词书（zsb），旧缓存无此书会显示 id 和 0 词，升版强制重拉
const CACHE_META_KEY = 'bc_words_meta_v3';
const CACHE_EXPIRE = 7 * 24 * 60 * 60 * 1000; // 7天缓存

// 云环境与存储桶（用于拼接 fileID；小程序端 downloadFile 只认 fileID，不支持 cloudPath）
// 存储桶格式：{envId}.{bucket}，可在云开发控制台-存储-文件详情的 FileID 中查看确认
const CLOUD_ENV_ID = 'cloudbase-d0g1vselq28a99d40';
const CLOUD_BUCKET = '636c-cloudbase-d0g1vselq28a99d40-1470230380';
const CLOUD_FILE_ID = (bookId: string) =>
  `cloud://${CLOUD_ENV_ID}.${CLOUD_BUCKET}/wordbooks/${bookId}.json`;

// 本会话内已知云存储缺失的文件（避免每次切词书都重复请求失败、拖慢加载）
const cloudFileMissing = new Set<string>();

// 带超时的 Promise 包装：云下载/云函数若挂起，超时后放弃，让后续兑底方案接管
function withTimeout<T>(p: Promise<T>, ms: number, label = 'request'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(label + ' timeout ' + ms + 'ms')), ms);
    p.then(
      v => { clearTimeout(timer); resolve(v); },
      e => { clearTimeout(timer); reject(e); }
    );
  });
}

// ─── 方案一：云存储 JSON 下载（首选，CDN 缓存，秒开） ──────────
async function getBookWordsFromCloudFile(bookId: string): Promise<WordItem[] | null> {
  const cloudPath = 'wordbooks/' + bookId + '.json';
  if (!wx.cloud || !wx.cloud.downloadFile) return null;
  // 两条下载路径都已失败的词书，本会话直接走云函数兜底
  if (cloudFileMissing.has(cloudPath)) return null;

  // 解析已下载的临时文件
  const parseDl = (p: string): WordItem[] | null => {
    try {
      const fs = wx.getFileSystemManager();
      const words: WordItem[] = JSON.parse(fs.readFileSync(p, 'utf-8') as string);
      return words && words.length > 0 ? words : null;
    } catch (e) {
      console.log(`[词库] ${bookId} 解析下载文件失败`, e);
      return null;
    }
  };

  // 方式 A：客户端 fileID 直下（最快）
  // 注意：服务端云函数上传的文件，客户端直下可能报 empty download url，属已知情况，此时走方式 B
  try {
    const res = await withTimeout<any>(
      wx.cloud.downloadFile({ fileID: CLOUD_FILE_ID(bookId) }),
      8000, 'downloadFile ' + bookId
    );
    if (res && res.tempFilePath) {
      const words = parseDl(res.tempFilePath);
      if (words) return words;
    }
  } catch (err: any) {
    console.log(`[词库] fileID直下 ${bookId} 失败：${(err && (err.errMsg || err.message)) || err}，改走临时链接`);
  }

  // 方式 A2：CDN 直连（存储开启公开读时可用，不依赖 fileID 与环境绑定）
  try {
    const directUrl = `https://${CLOUD_BUCKET}.tcb.qcloud.la/wordbooks/${bookId}.json`;
    const dl2 = await withTimeout(new Promise<string>((resolve: any, reject: any) => {
      wx.downloadFile({
        url: directUrl,
        success: (r: any) => (r.statusCode === 200 ? resolve(r.tempFilePath) : reject(new Error('status ' + r.statusCode))),
        fail: reject
      });
    }), 8000, 'cdnDirect ' + bookId);
    const cdnWords = parseDl(dl2);
    if (cdnWords) {
      console.log(`[词库] ${bookId} CDN直连下载完成`);
      return cdnWords;
    }
  } catch (e3: any) {
    console.log(`[词库] CDN直连 ${bookId} 失败`, (e3 && (e3.errMsg || e3.message)) || e3);
  }

  // 方式 B：云函数 getTempFileURL 换临时链接下载（服务端不受客户端存储 ACL 限制）
  try {
    const urlRes = await withTimeout<any>(
      wx.cloud.callFunction({ name: 'initWords', data: { action: 'getBookFileUrl', bookId } }),
      8000, 'getBookFileUrl ' + bookId
    );
    const urlResult = urlRes.result as any;
    if (urlResult && urlResult.ok && urlResult.url) {
      const dl = await withTimeout(new Promise<string>((resolve, reject) => {
        wx.downloadFile({
          url: urlResult.url,
          success: (r: any) => (r.statusCode === 200 ? resolve(r.tempFilePath) : reject(new Error('status ' + r.statusCode))),
          fail: reject
        });
      }), 10000, 'tempUrl download ' + bookId);
      const words = parseDl(dl);
      if (words) return words;
    } else {
      console.log(`[词库] getBookFileUrl ${bookId} 未返回链接`, urlResult);
    }
  } catch (e2: any) {
    console.log(`[词库] 临时链接下载 ${bookId} 失败`, (e2 && (e2.errMsg || e2.message)) || e2);
  }

  cloudFileMissing.add(cloudPath);
  console.info(`[词库] ${bookId}.json 云存储两条路径均不可用，本次走云函数`);
  return null;
}


// ─── 方案二：云函数分页拉取（兜底） ──────────────────────────────
async function getBookWordsFromCloudFunction(bookId: string): Promise<WordItem[] | null> {
  try {
    let allWords: WordItem[] = [];
    let page = 0;
    const pageSize = 1000; // 云函数端单页上限 1000，页数减半提速
    let hasMore = true;

    while (hasMore) {
      const res = await withTimeout<any>(wx.cloud.callFunction({
        name: 'initWords',
        data: { action: 'getWords', bookId, page, pageSize }
      }), 10000, 'callFunction getWords ' + bookId);

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
      // 下载同样只能用 fileID
      const res = await withTimeout<any>(wx.cloud.downloadFile({
        fileID: `cloud://${CLOUD_ENV_ID}.${CLOUD_BUCKET}/wordbooks/books_meta.json`
      }), 5000, 'downloadFile meta');
      if (res && res.tempFilePath) {
        const fs = wx.getFileSystemManager();
        const content = fs.readFileSync(res.tempFilePath, 'utf-8') as string;
        const cloudMeta = JSON.parse(content);
        // 兼容两种格式：{ books: {id: {...}} } 或 [{id, wordCount, highFreqCount}] 数组
        const metaMap: Record<string, { wordCount: number; highFreqCount: number }> = {};
        if (Array.isArray(cloudMeta)) {
          cloudMeta.forEach((b: any) => {
            if (b && b.id) metaMap[b.id] = { wordCount: b.wordCount || 0, highFreqCount: b.highFreqCount || 0 };
          });
        } else if (cloudMeta && cloudMeta.books) {
          Object.keys(cloudMeta.books).forEach((id: string) => {
            const b = cloudMeta.books[id];
            metaMap[id] = { wordCount: b?.wordCount || 0, highFreqCount: b?.highFreqCount || 0 };
          });
        }
        if (Object.keys(metaMap).length > 0) {
          const books = BOOK_META.map(meta => ({
            ...meta,
            wordCount: metaMap[meta.id]?.wordCount || 0,
            highFreqCount: metaMap[meta.id]?.highFreqCount || 0
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
    const res = await withTimeout<any>(wx.cloud.callFunction({
      name: 'initWords',
      data: { action: 'getMeta' }
    }), 8000, 'callFunction getMeta');

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
// 优先级：内存 → 本地 storage → 文件缓存 → 云存储 JSON → 云函数分页 → 本地种子

// 同一词书的并发请求去重：启动预热与页面加载共享同一个下载/解析 Promise，避免重复下载
const inflightGets = new Map<string, Promise<WordItem[]>>();

export async function getBookWords(bookId: string): Promise<WordItem[]> {
  // 0. 内存缓存：本次会话已解析过的词书直接返回
  if (memoryWords.has(bookId)) {
    return memoryWords.get(bookId)!;
  }
  const inflight = inflightGets.get(bookId);
  if (inflight) return inflight;
  const task = loadBookWords(bookId).finally(() => inflightGets.delete(bookId));
  inflightGets.set(bookId, task);
  return task;
}

async function loadBookWords(bookId: string): Promise<WordItem[]> {
  const cacheKey = CACHE_PREFIX + bookId;
  const t0 = Date.now();

  // 1a. 旧版 storage 缓存（小词书）
  const cached = wx.getStorageSync(cacheKey);
  if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRE) {
    console.log(`[词库] ${bookId} storage缓存命中，${Date.now() - t0}ms`);
    memoryWords.set(bookId, cached.data as WordItem[]);
    return cached.data as WordItem[];
  }


  // 1b. 文件缓存（大词书；setStorageSync 单 key 上限 1MB，大词书必须用文件缓存）
  const filePath = `${wx.env.USER_DATA_PATH}/wc_${bookId}.json`;
  const fs = wx.getFileSystemManager();
  try {
    const tsMap = wx.getStorageSync(CACHE_FILE_TS_KEY) || {};
    // 微信 FileSystemManager 没有 existsSync，用 accessSync 探测文件是否存在
    let fileExists = true;
    try {
      fs.accessSync(filePath);
    } catch (e) {
      fileExists = false;
    }
    if (tsMap[bookId] && Date.now() - tsMap[bookId] < CACHE_EXPIRE && fileExists) {
      const words: WordItem[] = JSON.parse(fs.readFileSync(filePath, 'utf-8') as string);
      if (words && words.length > 0) {
        console.log(`[词库] ${bookId} 文件缓存命中，${Date.now() - t0}ms`);
        memoryWords.set(bookId, words);
        return words;
      }
    }
  } catch (e) {
    console.log(`[词库] ${bookId} 文件缓存读取失败，将重新拉取`, e);
  }

  // 2. 尝试云存储 JSON 下载（CDN 缓存，秒开）
  console.log(`[词库] ${bookId} 缓存未命中，开始云端下载…`);
  const cloudFileWords = await getBookWordsFromCloudFile(bookId);
  if (cloudFileWords && cloudFileWords.length > 0) {
    console.log(`[词库] ${bookId} 云端下载完成，耗时 ${Date.now() - t0}ms`);
    saveWordsCache(bookId, filePath, fs, cloudFileWords, cacheKey);
    memoryWords.set(bookId, cloudFileWords);
    return cloudFileWords;
  }

  // 3. 云函数分页拉取（兜底）
  const cloudFnWords = await getBookWordsFromCloudFunction(bookId);
  if (cloudFnWords && cloudFnWords.length > 0) {
    // 兕底数据若无 posTag（数据库还是旧版词条），只进内存不落缓存，
    // 避免污染本地缓存导致云端修复后仍读旧数据
    if (cloudFnWords[0] && 'posTag' in cloudFnWords[0]) {
      saveWordsCache(bookId, filePath, fs, cloudFnWords, cacheKey);
    }
    memoryWords.set(bookId, cloudFnWords);
    return cloudFnWords;
  }

  // 4. 返回缓存（即使过期）
  if (cached && cached.data) {
    memoryWords.set(bookId, cached.data as WordItem[]);
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

// 文件缓存写入（大小不限；时间戳存小 storage）
const CACHE_FILE_TS_KEY = 'bc_words_file_ts';
// 会话级内存缓存：词书数据量最大 1~2MB，全部驻留也就十几 MB，可接受
const memoryWords = new Map<string, WordItem[]>();
function saveWordsCache(bookId: string, filePath: string, fs: any, words: WordItem[], legacyKey: string): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(words), 'utf-8');
    const tsMap = wx.getStorageSync(CACHE_FILE_TS_KEY) || {};
    tsMap[bookId] = Date.now();
    wx.setStorageSync(CACHE_FILE_TS_KEY, tsMap);
  } catch (e) {
    console.log(`[词库] ${bookId} 缓存写入失败（下次仍需下载）`, e);
  }
  // 小词书同步写一份 legacy storage 缓存（<900KB 才写，避免超 1MB 限制抛异常）
  try {
    if (JSON.stringify(words).length < 900 * 1024) {
      wx.setStorageSync(legacyKey, { data: words, timestamp: Date.now() });
    }
  } catch (e) {
    // 忽略
  }
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
