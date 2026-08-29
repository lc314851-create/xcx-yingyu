// utils/audio.ts
// 单词发音：直接走有道接口，本地内存缓存；无网络时播放失败即静默
// 整句 TTS 部分保持原有实现不变

import { getAccent } from './store';
import { synthesizeSentence } from './wechatTts';

let audioCtx: any = null;

// 会话内内存缓存：word_accent -> tempFilePath
const audioCache: Record<string, string> = {};

/**
 * 播放单词发音（有道直连，无云端兜底）
 */
export function playAudio(word: string, accent?: 'uk' | 'us', isRetry = false) {
  if (!word) return;
  const acc = accent || getAccent();
  const cacheKey = word + '_' + acc;

  console.log('[audio] playAudio:', word, acc);

  // 销毁旧实例，防止多个声音重叠
  destroyCurrent();

  const cached = audioCache[cacheKey];
  if (cached && !isRetry) {
    // 内存里的临时文件可能已被系统回收：带上下文播放，失败则清缓存重试
    playLocal(cached, { word, accent: acc, cacheKey });
    return;
  }

  const type = acc === 'uk' ? 1 : 2;
  const url = 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(word) + '&type=' + type;

  wx.downloadFile({
    url,
    success: (res: any) => {
      if (res.statusCode !== 200 || !res.tempFilePath) return;
      audioCache[cacheKey] = res.tempFilePath;
      // 下载期间用户可能已切换到别的词触发了新播放（destroyCurrent 已被调用），
      // 此时 audioCtx 为空才算仍然是当前请求，避免旧词音频延迟抢播
      if (audioCtx) return;
      playLocal(res.tempFilePath, isRetry ? undefined : { word, accent: acc, cacheKey });
    },
    fail: (err: any) => {
      console.error('[audio] 单词音频获取失败(可能无网络):', err);
    }
  });
}

// 用同一个全局实例顺序播放（autoplay），天然保证同一时刻只有一个声音
// 失败时若携带词信息：删除可能失效的缓存路径并重新下载重试一次
function playLocal(
  filePath: string,
  retryCtx?: { word: string; accent: 'uk' | 'us'; cacheKey: string }
) {
  const ctx = wx.createInnerAudioContext();
  audioCtx = ctx;
  ctx.src = filePath;
  ctx.autoplay = true;

  let played = false;   // 已主动触发过 play
  let started = false;  // 已真正开始出声

  // 部分机型上仅靠 autoplay 不起播，资源就绪后显式 play()
  ctx.onCanplay(() => {
    if (!played) {
      played = true;
      try { ctx.play(); } catch (e) {}
    }
  });

  // 双保险：onCanplay 迟迟不回调的环境（安卓常见），稍后直接补一次 play()
  setTimeout(() => {
    if (audioCtx === ctx && !started) {
      try { ctx.play(); } catch (e) {}
    }
  }, 500);

  ctx.onError((err: any) => {
    console.error('[audio] 播放失败:', err);
    if (retryCtx && audioCtx === ctx) {
      delete audioCache[retryCtx.cacheKey];
      playAudio(retryCtx.word, retryCtx.accent, true); // 重试一次，不再套娃
    }
  });

  ctx.onPlay(() => { started = true; });

  ctx.onEnded(() => {
    if (audioCtx === ctx) destroyCurrent();
  });
}

/**
 * 预加载下一词发音（仅下载缓存，不出声）
 */
export function preloadAudio(word: string, accent?: 'uk' | 'us') {
  if (!word) return;
  const acc = accent || getAccent();
  const cacheKey = word + '_' + acc;
  if (audioCache[cacheKey]) return;

  const type = acc === 'uk' ? 1 : 2;
  wx.downloadFile({
    url: 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(word) + '&type=' + type,
    success: (res: any) => {
      if (res.statusCode === 200 && res.tempFilePath) {
        audioCache[cacheKey] = res.tempFilePath;
      }
    }
  });
}

/**
 * 页面卸载时调用
 */
export function destroyAudio() {
  destroyCurrent();
  stopSentence();
}

function destroyCurrent() {
  if (audioCtx) {
    try { audioCtx.stop(); } catch (e) {}
    try { audioCtx.destroy(); } catch (e) {}
    audioCtx = null;
  }
}

/* ═════════════════════════════════════════ */
/* 整句 TTS：多源降级播放 + 暂停/恢复           */
/* ═════════════════════════════════════════ */

export interface SentencePlayOptions {
  onStart?: () => void;
  onEnded?: () => void;
  onError?: () => void;
}

let sentenceCtx: any = null;
let sentenceSeq = 0;

// 句子播放状态机：
//   idle    无音频 / 已播完
//   loading 音频加载中（云函数/下载中，尚无声音）
//   playing 播放中
//   paused  暂停（含“加载中被暂停”，可从暂停处恢复）
let sentenceState: 'idle' | 'loading' | 'playing' | 'paused' = 'idle';
// loading 完成后是否立即自动出声（加载过程中被暂停则置 false，等恢复再播）
let playOnReady = true;
// 当前 ctx 的 src 是否已就绪（可直接 play()）
let sentenceReady = false;

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
  sentenceState = 'loading';
  playOnReady = true;

  // 1) 会话内内存缓存（本地路径或云 fileID）
  const cached = sentenceFileCache.get(text);
  if (cached) {
    if (cached.indexOf('cloud://') === 0) {
      playFromCloudFile(cached, myId, text, opts);
    } else {
      playSentenceFile(cached, myId, () => onSentenceFail(myId, text, opts), opts);
    }
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

  // 4) 官方同声传译插件（合规主链路）：合成后立即下载持久化再播
  const pluginLaunched = synthesizeSentence(
    text,
    (tempPath: string) => {
      if (myId !== sentenceSeq) return;
      const path = persistSentenceFile(tempPath, text);
      sentenceFileCache.set(text, path);
      playSentenceFile(path, myId, () => {
        console.error('[tts] 插件音频播放失败，转云函数', text.slice(0, 30));
        playViaCloudFunction(text, myId, opts);
      }, opts);
    },
    () => {
      // 插件不可用/合成失败：转云端降级
      if (myId !== sentenceSeq) return;
      console.warn('[tts] 插件链路失败，转 tts 云函数', text.slice(0, 30));
      playViaCloudFunction(text, myId, opts);
    }
  );

  if (!pluginLaunched) {
    playViaCloudFunction(text, myId, opts);
  }
}

// 云函数降级链路：生成/取缓存音频，拿到 fileID 后下载到本地播
function playViaCloudFunction(text: string, myId: number, opts: SentencePlayOptions) {
  if (!wx.cloud || myId !== sentenceSeq) {
    if (myId === sentenceSeq) opts.onError && opts.onError();
    return;
  }
  wx.cloud.callFunction({ name: 'tts', data: { text } })
    .then((res: any) => {
      const fileID = res && res.result && res.result.fileID;
      if (!fileID || myId !== sentenceSeq) {
        if (myId === sentenceSeq) opts.onError && opts.onError();
        return;
      }
      sentenceFileCache.set(text, fileID);
      saveFileID(text, fileID);
      playFromCloudFile(fileID, myId, text, opts);
    })
    .catch(() => {
      if (myId === sentenceSeq) opts.onError && opts.onError();
    });
}

// 从云存储取音频并播放，多级降级：
//   ① wx.cloud.downloadFile 下载到本地持久文件 → 播本地（最稳）
//   ② 下载失败时直接以 fileID 作 src 播放（部分环境支持）
//   ③ 都失败 → 错误回调（不再直连非官方接口）
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
    console.error('[tts] fileID 直播也失败', fileID);
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

// 预取下一句音频：只准备不出声（后台调云函数+下载+落盘），
// 当前句 onEnded 时下一句已是本地文件，消除句间网络停顿
const preloadSet = new Set<string>();
export function preloadSentence(text: string) {
  if (!text || preloadSet.has(text)) return;

  const cached = sentenceFileCache.get(text);
  if (cached) {
    if (cached.indexOf('cloud://') !== 0) return; // 已是本地文件，无需预取
    // 缓存的是 fileID：提前下载落盘，播放时直接命中本地路径
    preloadSet.add(text);
    wx.cloud.downloadFile({ fileID: cached })
      .then((res: any) => {
        if (res && res.tempFilePath) {
          sentenceFileCache.set(text, persistSentenceFile(res.tempFilePath, text));
        }
      })
      .catch(() => {})
      .then(() => { preloadSet.delete(text); });
    return;
  }

  const local = localSentencePath(text);
  if (local) {
    sentenceFileCache.set(text, local);
    return;
  }

  const savedFileID = getFileIDMap()[sentenceHash(text)];
  if (savedFileID) {
    sentenceFileCache.set(text, savedFileID);
    preloadSentence(text); // 走上面的 fileID 下载分支
    return;
  }

  // 都没有：优先官方插件预取；不可用再调 tts 云函数生成，落盘后下载缓存
  if (synthesizeSentence(
    text,
    (tempPath: string) => {
      sentenceFileCache.set(text, persistSentenceFile(tempPath, text));
    },
    () => {}
  )) {
    preloadSet.add(text);
    setTimeout(() => preloadSet.delete(text), 1500);
    return;
  }

  if (!wx.cloud) return;
  preloadSet.add(text);
  wx.cloud.callFunction({ name: 'tts', data: { text } })
    .then((res: any) => {
      const fileID = res && res.result && res.result.fileID;
      if (!fileID) return;
      saveFileID(text, fileID);
      sentenceFileCache.set(text, fileID);
      return wx.cloud.downloadFile({ fileID });
    })
    .then((res: any) => {
      if (res && res.tempFilePath) {
        sentenceFileCache.set(text, persistSentenceFile(res.tempFilePath, text));
      }
    })
    .catch(() => {})
    .then(() => { preloadSet.delete(text); });
}

// 全部链路（插件 + 云函数）失败的最终兕底：仅触发错误回调，不再直连非官方接口
// （原有百度 gettts 直连已移除：非授权抓取接口，随时失效且有合规风险）
function onSentenceFail(myId: number, _text: string, opts: SentencePlayOptions) {
  if (myId !== sentenceSeq) return;
  console.error('[tts] 所有语音链路均失败', _text.slice(0, 30));
  opts.onError && opts.onError();
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
  // 加载过程中被暂停过：资源就绪但不自动出声，等 resumeSentence() 再播
  ctx.autoplay = playOnReady;
  sentenceReady = true;
  if (!playOnReady) sentenceState = 'paused';

  let started = false;
  let done = false;

  const cleanup = () => {
    done = true;
    sentenceReady = false;
    try { ctx.destroy(); } catch (e) {}
    if (sentenceCtx === ctx) sentenceCtx = null;
  };

  ctx.onPlay(() => {
    started = true;
    if (myId === sentenceSeq) {
      sentenceState = 'playing';
      opts.onStart && opts.onStart();
    }
  });

  ctx.onPause(() => {
    if (myId === sentenceSeq && !done) sentenceState = 'paused';
  });

  ctx.onEnded(() => {
    if (done) return;
    cleanup();
    if (myId === sentenceSeq) {
      sentenceState = 'idle';
      sentenceSeq++;
      opts.onEnded && opts.onEnded();
    }
  });

  ctx.onError(() => {
    if (done) return;
    cleanup();
    if (myId === sentenceSeq) {
      sentenceState = 'idle';
      onFail();
    }
  });

  // 起播超时判定（本地文件一般即时起播；放宽到 6s 避免误判）
  setTimeout(() => {
    // 已被停止（切句/卸载）、或处于暂停态，都不判定失败
    if (sentenceCtx !== ctx || sentenceState === 'paused') return;
    if (!started && !done) {
      cleanup();
      if (myId === sentenceSeq) {
        sentenceState = 'idle';
        onFail();
      }
    }
  }, 6000);
}

/**
 * 暂停整句播放（保留进度，可从暂停处继续）
 * - 播放中：音频原地暂停
 * - 加载中：资源到达后不出声，等恢复
 */
export function pauseSentence() {
  if (sentenceState === 'loading') {
    playOnReady = false;
    sentenceState = 'paused';
    return;
  }
  if (sentenceState === 'playing' && sentenceCtx) {
    try { sentenceCtx.pause(); } catch (e) {}
    sentenceState = 'paused';
  }
}

/**
 * 从暂停处继续播放
 * @returns 是否成功恢复（false = 当前没有可恢复的暂停音频）
 */
export function resumeSentence(): boolean {
  if (sentenceState !== 'paused') return false;
  if (sentenceCtx && sentenceReady) {
    sentenceState = 'playing';
    try { sentenceCtx.play(); } catch (e) {}
    return true;
  }
  // 音频仍在加载：恢复“就绪即播”
  playOnReady = true;
  sentenceState = 'loading';
  return true;
}

/**
 * 停止整句播放并销毁（换句/切页/页面卸载时调用，不可恢复）
 */
export function stopSentence() {
  if (sentenceCtx) {
    try { sentenceCtx.stop(); sentenceCtx.destroy(); } catch (e) {}
    sentenceCtx = null;
  }
  sentenceSeq++;
  sentenceState = 'idle';
  playOnReady = true;
  sentenceReady = false;
}
