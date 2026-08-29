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

// 云环境与存储桶（用于拼接 fileID；小程序端 downloadFile 只认 fileID，不支持 cloudPath）
// 存储桶格式：{envId}.{bucket}，可在云开发控制台-存储-文件详情的 FileID 中查看确认
const CLOUD_ENV_ID = 'cloudbase-d0g1vselq28a99d40';
const CLOUD_BUCKET = '636c-cloudbase-d0g1vselq28a99d40-147023080';
const CLOUD_FILE_ID = (bookId: string) =>
  `cloud://${CLOUD_ENV_ID}.${CLOUD_BUCKET}/wordbooks/${bookId}.json`;

// 本会话内已知云存储缺失的文件（避免每次切词书都重复请求失败、拖慢加载）
const cloudFileMissing = new Set<string>();

// ─── 方案一：云存储 JSON 下载（首选，CDN 缓存，秒开） ──────────
async function getBookWordsFromCloudFile(bookId: string): Promise<WordItem[] | null> {
  try {
    if (!wx.cloud || !wx.cloud.downloadFile) return null;
    // 已确认存储桶里没有该文件，本会话直接走云函数兜底
    if (cloudFileMissing.has('wordbooks/' + bookId + '.json')) return null;

    // 小程序端 downloadFile 仅支持 fileID（cloudPath 仅用于上传）
    const res = await wx.cloud.downloadFile({
      fileID: CLOUD_FILE_ID(bookId)
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
    // 客户端 fileID 下载失败：尝试云函数换临时链接（服务端 getTempFileURL 不受客户端存储权限限制）
    const urlRes = await wx.cloud.callFunction({
      name: 'initWords',
      data: { action: 'getBookFileUrl', bookId }
    });
    const urlResult = urlRes.result as any;
    if (urlResult && urlResult.ok && urlResult.url) {
      const dl = await new Promise<string>((resolve, reject) => {
        wx.downloadFile({
          url: urlResult.url,
          success: (r) => (r.statusCode === 200 ? resolve(r.tempFilePath) : reject(new Error('status ' + r.statusCode))),
          fail: reject
        });
      });
      const fs = wx.getFileSystemManager();
      const words: WordItem[] = JSON.parse(fs.readFileSync(dl, 'utf-8') as string);
      if (words && words.length > 0) return words;
    }
    return null;
  } catch (err: any) {
    const msg = (err && (err.errMsg || err.message)) || '';
    if (msg.indexOf('empty download url') > -1) {
      // fileID 下载报缺文件：先试临时链接（可能只是客户端权限问题），都失败才记入缺失名单
      try {
        const urlRes2 = await wx.cloud.callFunction({
          name: 'initWords',
          data: { action: 'getBookFileUrl', bookId }
        });
        const r2 = urlRes2.result as any;
        if (r2 && r2.ok && r2.url) {
          const dl2 = await new Promise<string>((resolve, reject) => {
            wx.downloadFile({
              url: r2.url,
              success: (r) => (r.statusCode === 200 ? resolve(r.tempFilePath) : reject(new Error('status ' + r.statusCode))),
              fail: reject
            });
          });
          const fs2 = wx.getFileSystemManager();
          const words2: WordItem[] = JSON.parse(fs2.readFileSync(dl2, 'utf-8') as string);
          if (words2 && words2.length > 0) return words2;
        }
      } catch (e2) {
        console.log(`临时链接下载 ${bookId} 也失败`, e2);
      }
      cloudFileMissing.add('wordbooks/' + bookId + '.json');
      console.info(`${bookId}.json 暂不可用（存储桶无文件或权限未生效），已走云函数`);
    } else {
      console.log(`云存储下载 ${bookId} 失败（将使用云函数兜底）`, err);
    }
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
      // 下载同样只能用 fileID
      const res = await wx.cloud.downloadFile({
        fileID: `cloud://${CLOUD_ENV_ID}.${CLOUD_BUCKET}/wordbooks/books_meta.json`
      });
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

  // 0. 内存缓存：本次会话已解析过的词书直接返回，避免反复读盘+解析大 JSON 卡顿
  if (memoryWords.has(bookId)) {
    return memoryWords.get(bookId)!;
  }

  // 1a. 旧版 storage 缓存（小词书）
  const cached = wx.getStorageSync(cacheKey);
  if (cached && cached.timestamp && Date.now() - cached.timestamp < CACHE_EXPIRE) {
    memoryWords.set(bookId, cached.data as WordItem[]);
    return cached.data as WordItem[];
  }

  // 1b. 文件缓存（大词书；setStorageSync 单 key 上限 1MB，大词书必须用文件缓存）
  const filePath = `${wx.env.USER_DATA_PATH}/wc_${bookId}.json`;
  const fs = wx.getFileSystemManager();
  try {
    const tsMap = wx.getStorageSync(CACHE_FILE_TS_KEY) || {};
    if (tsMap[bookId] && Date.now() - tsMap[bookId] < CACHE_EXPIRE && fs.existsSync(filePath)) {
      const words: WordItem[] = JSON.parse(fs.readFileSync(filePath, 'utf-8') as string);
      if (words && words.length > 0) {
        memoryWords.set(bookId, words);
        return words;
      }
    }
  } catch (e) {
    // 文件缓存损坏则忽略，重新拉取
  }

  // 2. 尝试云存储 JSON 下载（CDN 缓存，秒开）
  const cloudFileWords = await getBookWordsFromCloudFile(bookId);
  if (cloudFileWords && cloudFileWords.length > 0) {
    saveWordsCache(bookId, filePath, fs, cloudFileWords, cacheKey);
    memoryWords.set(bookId, cloudFileWords);
    return cloudFileWords;
  }

  // 3. 云函数分页拉取（兜底）
  const cloudFnWords = await getBookWordsFromCloudFunction(bookId);
  if (cloudFnWords && cloudFnWords.length > 0) {
    saveWordsCache(bookId, filePath, fs, cloudFnWords, cacheKey);
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
    // 缓存写失败不影响本次使用
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
