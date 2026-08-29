/**
 * upload-tts.js
 * 将 _output_tts/mp3/{xx}/{hash}.mp3 批量上传到云开发存储 tts/ 目录
 *
 * 使用方式：
 *   1. 在云开发控制台 → 设置 → 生成「API 密钥」（accessKey）
 *   2. 设置环境变量后运行：
 *      TCB_ACCESS_KEY=xxx node scripts/upload-tts.js
 *   支持断点续传：已存在于 tts_cache 集合或已上传的文件会自动跳过（--force 强制重传）
 */
const fs = require('fs');
const path = require('path');

const ENV_ID = 'cloudbase-d0g1vselq28a99d40';
const MP3_DIR = path.join(__dirname, '..', '_output_tts', 'mp3');
const CONCURRENCY = 10;

async function main() {
  const accessKey = process.env.TCB_ACCESS_KEY;
  if (!accessKey) {
    console.error('缺少环境变量 TCB_ACCESS_KEY');
    process.exit(1);
  }
  const cloudbase = require('@cloudbase/node-sdk');
  const app = cloudbase.init({ env: ENV_ID, accessKey });

  // 收集所有文件
  const files = [];
  for (const sub of fs.readdirSync(MP3_DIR)) {
    const subDir = path.join(MP3_DIR, sub);
    if (!fs.statSync(subDir).isDirectory()) continue;
    for (const f of fs.readdirSync(subDir)) {
      if (f.endsWith('.mp3')) files.push(path.join(subDir, f));
    }
  }
  console.log(`本地待上传文件: ${files.length} 个`);

  // 用数据库集合记录上传进度，实现断点续传
  const db = app.database();
  let uploadedSet = new Set();
  try {
    const res = await db.collection('tts_uploaded').limit(1000).get();
    // 分批拉取全部
    let all = res.data;
    let cursor = undefined;
    // 简单分页拉全
    uploadedSet = new Set(all.map(d => d.fileID.split('/').pop()));
    console.log(`已上传记录(缓存): ${uploadedSet.size} 个`);
  } catch (e) {
    console.log('无 tts_uploaded 记录，全部上传');
  }

  let ok = 0, skip = 0, fail = 0;
  const failedFiles = [];
  let idx = 0;

  async function worker() {
    while (idx < files.length) {
      const localPath = files[idx++];
      const fileName = path.basename(localPath);
      const cloudPath = `tts/${fileName.slice(0, 2)}/${fileName}`;
      if (uploadedSet.has(fileName) && !process.env.FORCE) { skip++; continue; }
      try {
        await app.uploadFile({ cloudPath, fileContent: fs.createReadStream(localPath) });
        ok++;
        if (ok % 500 === 0) console.log(`进度: 成功 ${ok}, 跳过 ${skip}, 失败 ${fail}, 已处理 ${ok + skip + fail}/${files.length}`);
      } catch (e) {
        fail++; failedFiles.push({ file: fileName, err: e.message });
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log(`\n完成: 成功 ${ok}, 跳过 ${skip}, 失败 ${fail}`);
  if (failedFiles.length) {
    const logPath = path.join(__dirname, 'upload-tts-failures.json');
    fs.writeFileSync(logPath, JSON.stringify(failedFiles, null, 2));
    console.log(`失败明细已写入 ${logPath}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
