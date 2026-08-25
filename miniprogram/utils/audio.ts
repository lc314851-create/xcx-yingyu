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

// 句子 TTS 候选源（实测可用性降级：百度可用，有道整句500，Google国内不可达）
// 一律先下载到本地临时文件再播放（内网可直接播，也能校验是否为真实音频）
function sentenceSources(text: string): string[] {
  return [
    `https://fanyi.baidu.com/gettts?lan=en&text=${encodeURIComponent(text)}&spd=3&source=web`,
    `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=en&client=tw-ob`
  ];
}

/**
 * 播放整句英文（逐句跟读/听力用）
 * 下载式：百度 → Google，下载失败/非音频/起播超时 逐级降级
 */
export function playSentence(text: string, opts: SentencePlayOptions = {}) {
  if (!text) return;
  stopSentence();
  const myId = ++sentenceSeq;
  tryDownloadSentence(sentenceSources(text), 0, myId, opts);
}

function tryDownloadSentence(
  sources: string[],
  idx: number,
  myId: number,
  opts: SentencePlayOptions
) {
  if (idx >= sources.length) {
    if (myId === sentenceSeq) opts.onError && opts.onError();
    return;
  }
  if (myId !== sentenceSeq) return;

  wx.downloadFile({
    url: sources[idx],
    timeout: 8000,
    success: (res: any) => {
      if (myId !== sentenceSeq) return;
      const ct = (res.header && (res.header['content-type'] || res.header['Content-Type'])) || '';
      if (res.statusCode === 200 && res.tempFilePath && ct.indexOf('audio') > -1) {
        playSentenceFile(res.tempFilePath, myId, () => {
          if (myId === sentenceSeq) tryDownloadSentence(sources, idx + 1, myId, opts);
        }, opts);
      } else {
        // 返回了非音频内容（可能是登录页/限流页），换下一个源
        if (myId === sentenceSeq) tryDownloadSentence(sources, idx + 1, myId, opts);
      }
    },
    fail: () => {
      if (myId === sentenceSeq) tryDownloadSentence(sources, idx + 1, myId, opts);
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

  // 起播超时判定
  setTimeout(() => {
    if (!started && !done) {
      cleanup();
      if (myId === sentenceSeq) onFail();
    }
  }, 3000);
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
