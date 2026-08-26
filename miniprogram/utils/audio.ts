// utils/audio.ts
// 单词发音服务
// 策略：缓存 tempFilePath + 超时检测重试 + 手动 play() 兜底
// 如果缓存文件播放超时（微信回收了临时文件），自动重新下载

import { getAccent } from './store';

let audioCtx: any = null;
let audioId = 0;

// 下载缓存：word_accent → tempFilePath
const audioCache: Record<string, string> = {};
// 正在下载中的词，避免重复并发下载
const downloading: Record<string, boolean> = {};

/**
 * 播放单词发音
 */
export function playAudio(word: string, accent?: 'uk' | 'us') {
  if (!word) return;

  const acc = accent || getAccent();
  const type = acc === 'uk' ? 1 : 2;
  const cacheKey = `${word}_${acc}`;

  console.log('[audio] playAudio:', word, acc);

  // 销毁旧实例
  destroyCurrent();

  const myId = ++audioId;

  // 尝试缓存
  const cached = audioCache[cacheKey];
  if (cached) {
    console.log('[audio] 命中缓存:', cacheKey);
    playWithTimeoutCheck(cached, myId, () => {
      // 超时：缓存失效，重新下载
      console.log('[audio] 缓存失效，重新下载');
      delete audioCache[cacheKey];
      downloadAndPlay(word, type, cacheKey, myId);
    });
    return;
  }

  downloadAndPlay(word, type, cacheKey, myId);
}

/**
 * 下载并播放
 */
function downloadAndPlay(word: string, type: number, cacheKey: string, myId: number) {
  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;

  // 防止同一词并发下载
  if (downloading[cacheKey]) {
    console.log('[audio] 正在下载中，跳过');
    return;
  }
  downloading[cacheKey] = true;

  console.log('[audio] 开始下载:', url);

  wx.downloadFile({
    url,
    success: (res) => {
      downloading[cacheKey] = false;
      if (myId !== audioId) return; // 已过期

      console.log('[audio] 下载成功:', res.statusCode, 'id:', myId);
      if (res.statusCode === 200) {
        audioCache[cacheKey] = res.tempFilePath;
        playWithTimeoutCheck(res.tempFilePath, myId, null);
      }
    },
    fail: (err) => {
      downloading[cacheKey] = false;
      if (myId !== audioId) return;

      console.error('[audio] 下载失败:', err);
      // 降级：直接网络 URL
      playRemote(url, myId);
    }
  });
}

/**
 * 播放本地文件，带超时检测
 * @param filePath 本地路径
 * @param myId 实例 id
 * @param onTimeout 超时回调（缓存失效时重新下载）
 */
function playWithTimeoutCheck(filePath: string, myId: number, onTimeout: (() => void) | null) {
  audioCtx = wx.createInnerAudioContext();
  audioCtx.src = filePath;
  audioCtx.autoplay = true;

  let hasPlayed = false;

  audioCtx.onCanplay(() => {
    console.log('[audio] canplay, id:', myId);
    try { audioCtx.play(); } catch (e) {}
  });

  audioCtx.onPlay(() => {
    hasPlayed = true;
    console.log('[audio] 开始播放, id:', myId);
  });

  audioCtx.onError((err: any) => {
    console.error('[audio] 播放失败:', err, 'id:', myId);
    if (myId === audioId && onTimeout) {
      onTimeout();
    }
  });

  audioCtx.onEnded(() => {
    console.log('[audio] 播放结束, id:', myId);
    if (myId === audioId) {
      destroyCurrent();
    }
  });

  // 超时检测：800ms 内没有 onPlay 就认为缓存文件失效
  if (onTimeout) {
    setTimeout(() => {
      if (myId === audioId && !hasPlayed) {
        console.log('[audio] 超时未播放，触发重试, id:', myId);
        onTimeout();
      }
    }, 800);
  }
}

/**
 * 降级：直接网络 URL 播放
 */
function playRemote(url: string, myId: number) {
  console.log('[audio] 降级网络URL:', url);
  audioCtx = wx.createInnerAudioContext();
  audioCtx.src = url;
  audioCtx.autoplay = true;

  audioCtx.onPlay(() => {
    console.log('[audio] 降级播放开始, id:', myId);
  });

  audioCtx.onError((err: any) => {
    console.error('[audio] 降级播放失败:', err, 'id:', myId);
  });

  audioCtx.onEnded(() => {
    if (myId === audioId) {
      destroyCurrent();
    }
  });
}

/**
 * 销毁当前音频上下文
 */
function destroyCurrent() {
  if (audioCtx) {
    try { audioCtx.destroy(); } catch (e) {}
    audioCtx = null;
  }
  audioId++;
}

/**
 * 预加载单词发音
 */
export function preloadAudio(word: string, accent?: 'uk' | 'us') {
  if (!word) return;
  const acc = accent || getAccent();
  const type = acc === 'uk' ? 1 : 2;
  const cacheKey = `${word}_${acc}`;

  if (audioCache[cacheKey] || downloading[cacheKey]) return;

  const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${type}`;
  downloading[cacheKey] = true;

  wx.downloadFile({
    url,
    success: (res) => {
      downloading[cacheKey] = false;
      if (res.statusCode === 200) {
        audioCache[cacheKey] = res.tempFilePath;
        console.log('[audio] 预加载完成:', cacheKey);
      }
    },
    fail: () => {
      downloading[cacheKey] = false;
    }
  });
}

/**
 * 销毁音频上下文（页面卸载时调用）
 */
export function destroyAudio() {
  destroyCurrent();
  stopSentence();
}

/* ═════════════════════════════════════════ */
/* 整句 TTS：多源降级播放                      */
/* ═════════════════════════════════════════ */

export interface SentencePlayOptions {
  onStart?: () => void;
  onEnded?: () => void;
  onError?: () => void;
}

let sentenceCtx: any = null;
let sentenceSeq = 0;

// 会话内内存缓存：同一句只调一次云函数/下载
const sentenceFileCache = new Map<string, string>();

// 句子音频本地持久目录（避免 downloadFile 临时文件被系统回收）
const SENTENCE_CACHE_DIR = `${wx.env.USER_DATA_PATH}/tts_cache`;
let sentenceCacheReady = false;

function ensureSentenceCacheDir() {
  if (sentenceCacheReady) return;
  try {
    const fs = wx.getFileSystemManager();
    fs.mkdirSync(SENTENCE_CACHE_DIR, true);
    sentenceCacheReady = true;
  } catch (e) {
    sentenceCacheReady = false;
  }
}

// 文本 → 稳定短哈希（本地持久文件名 / 云 fileID 映射的 key）
function sentenceHash(text: string): string {
  let h = 0;
  const s = text.toLowerCase();
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

function sentenceFileName(text: string): string {
  return `${sentenceHash(text)}.mp3`;
}

// 文本 → 云存储 fileID 的本地持久映射（重进页面也能直接读云文件，免调云函数）
const SENTENCE_FILEID_KEY = 'bc_sentence_fileid';
function getFileIDMap(): Record<string, string> {
  return wx.getStorageSync(SENTENCE_FILEID_KEY) || {};
}
function saveFileID(text: string, fileID: string): void {
  const m = getFileIDMap();
  m[sentenceHash(text)] = fileID;
  wx.setStorageSync(SENTENCE_FILEID_KEY, m);
}

// 保存临时音频为本地持久文件，返回可稳定重播的路径
function persistSentenceFile(tempPath: string, text: string): string {
  ensureSentenceCacheDir();
  const target = `${SENTENCE_CACHE_DIR}/${sentenceFileName(text)}`;
  try {
    const fs = wx.getFileSystemManager();
    if (!fs.accessSync) {
      // 基础库较老时无 accessSync，直接复制
    } else {
      try { fs.accessSync(target); return target; } catch (e) { /* 不存在则复制 */ }
    }
    fs.copyFileSync(tempPath, target);
    return target;
  } catch (e) {
    return tempPath;
  }
}

/**
 * 播放整句英文（逐句跟读/听力用）
 * 主链路：拿到云存储 fileID（映射/云函数）→ 统一下载成本地文件 → 播放
 * 播放一律走本地文件，规避 fileID 直播在部分环境起播不稳的问题；
 * 本地文件按句持久化，重播/暂停恢复均秒开。
 */
export function playSentence(text: string, opts: SentencePlayOptions = {}) {
  if (!text) return;
  stopSentence();
  const myId = ++sentenceSeq;

  // 1) 会话内内存缓存（已是本地路径）
  const cached = sentenceFileCache.get(text);
  if (cached) {
    playSentenceFile(cached, myId, () => onSentenceFail(myId, text, opts), opts);
    return;
  }

  // 2) 本地持久 mp3（上次下载过的音频）
  const localPath = localSentencePath(text);
  if (localPath) {
    sentenceFileCache.set(text, localPath);
    playSentenceFile(localPath, myId, () => onSentenceFail(myId, text, opts), opts);
    return;
  }

  // 3) 本地持久化的云 fileID 映射：下载云文件到本地再播
  const savedFileID = getFileIDMap()[sentenceHash(text)];
  if (savedFileID) {
    sentenceFileCache.set(text, savedFileID);
    playFromCloudFile(savedFileID, myId, text, opts);
    return;
  }

  // 4) tts 云函数：生成/取缓存音频，拿到 fileID 后下载到本地播
  if (wx.cloud) {
    wx.cloud.callFunction({ name: 'tts', data: { text } })
      .then((res: any) => {
        const fileID = res && res.result && res.result.fileID;
        if (!fileID || myId !== sentenceSeq) {
          if (myId === sentenceSeq) onSentenceFail(myId, text, opts);
          return;
        }
        sentenceFileCache.set(text, fileID);
        saveFileID(text, fileID);
        playFromCloudFile(fileID, myId, text, opts);
      })
      .catch(() => {
        if (myId === sentenceSeq) onSentenceFail(myId, text, opts);
      });
  } else {
    onSentenceFail(myId, text, opts);
  }
}

// 从云存储取音频并播放，多级降级：
//   ① wx.cloud.downloadFile 下载到本地持久文件 → 播本地（最稳）
//   ② 下载失败时直接以 fileID 作 src 播放（部分环境支持）
//   ③ 都失败 → 百度直连兜庇
function playFromCloudFile(fileID: string, myId: number, text: string, opts: SentencePlayOptions) {
  if (!wx.cloud) {
    if (myId === sentenceSeq) onSentenceFail(myId, text, opts);
    return;
  }
  wx.cloud.downloadFile({ fileID })
    .then((res: any) => {
      if (myId !== sentenceSeq) return;
      if (res && res.tempFilePath) {
        const path = persistSentenceFile(res.tempFilePath, text);
        sentenceFileCache.set(text, path);
        playSentenceFile(path, myId, () => {
          // 本地文件播放失败（极少见）：降级为 fileID 直播
          console.error('[tts] 本地文件播放失败，尝试 fileID 直播', fileID);
          playFileIDDirect(fileID, myId, text, opts);
        }, opts);
      } else {
        console.error('[tts] 云文件下载无 tempFilePath', JSON.stringify(res));
        if (myId === sentenceSeq) playFileIDDirect(fileID, myId, text, opts);
      }
    })
    .catch((err: any) => {
      console.error('[tts] 云文件下载失败，转 fileID 直播', fileID, err && err.errMsg || err);
      if (myId === sentenceSeq) playFileIDDirect(fileID, myId, text, opts);
    });
}

// 直接以云 fileID 作为 src 播放（备份方案，devtools 部分版本可用）
function playFileIDDirect(fileID: string, myId: number, text: string, opts: SentencePlayOptions) {
  playSentenceFile(fileID, myId, () => {
    console.error('[tts] fileID 直播也失败，转百度直连', fileID);
    if (myId === sentenceSeq) onSentenceFail(myId, text, opts);
  }, opts);
}

// 检查本地持久缓存中是否已有该句音频
function localSentencePath(text: string): string {
  ensureSentenceCacheDir();
  const target = `${SENTENCE_CACHE_DIR}/${sentenceFileName(text)}`;
  try {
    const fs = wx.getFileSystemManager();
    fs.accessSync(target);
    return target;
  } catch (e) {
    return '';
  }
}

// 云函数不可用/失败时的本地兜庇：直接下载百度 TTS 并持久化
function onSentenceFail(myId: number, text: string, opts: SentencePlayOptions) {
  if (myId !== sentenceSeq) return;
  console.error('[tts] 云链路失败，转百度直连', text.slice(0, 30));
  const baidu = `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(text)}&spd=3&source=web`;
  wx.downloadFile({
    url: baidu,
    timeout: 8000,
    success: (res: any) => {
      if (myId !== sentenceSeq) return;
      const ct = (res.header && (res.header['content-type'] || res.header['Content-Type'])) || '';
      if (res.statusCode === 200 && res.tempFilePath && ct.indexOf('audio') > -1) {
        const path = persistSentenceFile(res.tempFilePath, text);
        sentenceFileCache.set(text, path);
        playSentenceFile(path, myId, () => {
          console.error('[tts] 百度音频本地播放失败');
          if (myId === sentenceSeq) opts.onError && opts.onError();
        }, opts);
      } else {
        console.error('[tts] 百度直连非音频响应', res.statusCode, ct);
        if (myId === sentenceSeq) opts.onError && opts.onError();
      }
    },
    fail: (err: any) => {
      console.error('[tts] 百度直连下载失败', err && err.errMsg || err);
      if (myId === sentenceSeq) opts.onError && opts.onError();
    }
  });
}


function playSentenceFile(
  filePath: string,
  myId: number,
  onFail: () => void,
  opts: SentencePlayOptions
) {
  const ctx = wx.createInnerAudioContext();
  sentenceCtx = ctx;
  ctx.src = filePath;
  ctx.autoplay = true;

  let started = false;
  let done = false;

  const cleanup = () => {
    done = true;
    try { ctx.destroy(); } catch (e) {}
    sentenceCtx = null;
  };

  ctx.onPlay(() => {
    started = true;
    if (myId === sentenceSeq) opts.onStart && opts.onStart();
  });

  ctx.onEnded(() => {
    if (done) return;
    cleanup();
    if (myId === sentenceSeq) {
      sentenceSeq++;
      opts.onEnded && opts.onEnded();
    }
  });

  ctx.onError(() => {
    if (done) return;
    cleanup();
    if (myId === sentenceSeq) onFail();
  });

  // 起播超时判定（本地文件一般即时起播；放宽到 6s 避免误判）
  setTimeout(() => {
    // 已被 stopSentence 停止（暂停/切句/卸载）则不再判定失败
    if (sentenceCtx !== ctx) return;
    if (!started && !done) {
      cleanup();
      if (myId === sentenceSeq) onFail();
    }
  }, 6000);
}

/**
 * 停止整句播放（换句/切页/页面卸载时调用）
 */
export function stopSentence() {
  if (sentenceCtx) {
    try { sentenceCtx.stop(); sentenceCtx.destroy(); } catch (e) {}
    sentenceCtx = null;
  }
  sentenceSeq++;
}
