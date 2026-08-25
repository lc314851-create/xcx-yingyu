// cloudfunctions/tts/index.js
// 句子 TTS 服务：服务端调用百度翻译 TTS 生成 mp3，存入云存储并建立缓存索引
// 同一句话（按文本 hash）只生成一次，之后直接返回缓存 fileID
//
// 调用：wx.cloud.callFunction({ name:'tts', data:{ text:'...' } })
// 返回：{ fileID, cached }  |  失败返回 { error }

const cloud = require('wx-server-sdk');
const https = require('https');
const crypto = require('crypto');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// 百度翻译 gettts（整句英文，实测可用）
function fetchTts(text) {
  return new Promise((resolve, reject) => {
    const url = 'https://fanyi.baidu.com/gettts?lan=en&text=' +
      encodeURIComponent(text) + '&spd=3&source=web';
    const req = https.get(url, {
      headers: {
        'Referer': 'https://fanyi.baidu.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'audio/mpeg, */*'
      },
      timeout: 10000
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const ct = (res.headers['content-type'] || '').toLowerCase();
        if (res.statusCode === 200 && ct.indexOf('audio') > -1 && buf.length > 800) {
          resolve(buf);
        } else {
          reject(new Error(`bad tts resp status=${res.statusCode} ct=${ct} len=${buf.length}`));
        }
      });
    });
    req.on('timeout', () => req.destroy(new Error('tts timeout')));
    req.on('error', reject);
  });
}

exports.main = async (event) => {
  const text = (event.text || '').trim();
  if (!text) return { error: 'no text' };

  const hash = crypto.createHash('md5').update(text.toLowerCase()).digest('hex');
  const cloudPath = `tts/${hash.slice(0, 2)}/${hash}.mp3`;
  const db = cloud.database();
  const col = db.collection('tts_cache');

  // 1) 查缓存索引（云数据库，快速命中，避免重复调用百度）
  try {
    const hit = await col.doc(hash).get();
    if (hit.data && hit.data.fileID) {
      return { fileID: hit.data.fileID, cached: true };
    }
  } catch (e) { /* 文档不存在或集合未创建，继续生成 */ }

  // 2) 生成音频并上传云存储
  let audio;
  try {
    audio = await fetchTts(text);
  } catch (e) {
    return { error: 'tts fetch fail: ' + e.message };
  }

  let fileID;
  try {
    const up = await cloud.uploadFile({ cloudPath, fileContent: audio });
    fileID = up.fileID;
  } catch (e) {
    return { error: 'upload fail: ' + e.message };
  }

  // 3) 写缓存索引（失败不影响本次返回）
  try {
    await col.doc(hash).set({ data: { fileID, text, createTime: db.serverDate() } });
  } catch (e) { /* 集合不存在等，忽略 */ }

  return { fileID, cached: false };
};
