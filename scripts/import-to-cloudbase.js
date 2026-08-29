/**
 * import-to-cloudbase.js
 * 
 * 本地 Node.js 脚本：将 wordbooks_json/ 下的 JSON 词库导入到云开发数据库
 * 
 * 使用方式：
 *   1. npm install cloudbase-node-sdk
 *   2. 设置环境变量 TCB_ENV（云环境ID）
 *   3. node scripts/import-to-cloudbase.js
 * 
 * 或者在微信开发者工具中：
 *   使用「云开发」->「数据库」->「导入数据」功能，直接导入 JSON 文件
 */

const fs = require('fs');
const path = require('path');

const ENV_ID = 'cloudbase-d0g1vselq28a99d40';
const WORDBOOKS_DIR = path.join(__dirname, '..', 'wordbooks_json');

// 读取所有词库 JSON
const bookFiles = [
  { id: 'junior', name: '初中词汇', file: 'junior.json' },
  { id: 'senior', name: '高中词汇', file: 'senior.json' },
  { id: 'cet4', name: '四级词汇', file: 'cet4.json' },
  { id: 'cet6', name: '六级词汇', file: 'cet6.json' },
  { id: 'postgrad', name: '考研词汇', file: 'postgrad.json' },
  { id: 'ielts', name: '雅思词汇', file: 'ielts.json' },
  { id: 'toefl', name: '托福词汇', file: 'toefl.json' },
  { id: 'gre', name: 'GRE词汇', file: 'gre.json' },
  // 人教版教材同步分册
  { id: 'pepj7_1', name: 'pepj7_1', file: 'pepj7_1.json' },
  { id: 'pepj7_2', name: 'pepj7_2', file: 'pepj7_2.json' },
  { id: 'pepj8_1', name: 'pepj8_1', file: 'pepj8_1.json' },
  { id: 'pepj8_2', name: 'pepj8_2', file: 'pepj8_2.json' },
  { id: 'pepj9', name: 'pepj9', file: 'pepj9.json' },
  { id: 'pepgz1', name: 'pepgz1', file: 'pepgz1.json' },
  { id: 'pepgz2', name: 'pepgz2', file: 'pepgz2.json' },
  { id: 'pepgz3', name: 'pepgz3', file: 'pepgz3.json' },
  { id: 'pepgzx1', name: 'pepgzx1', file: 'pepgzx1.json' },
  { id: 'pepgzx2', name: 'pepgzx2', file: 'pepgzx2.json' },
  { id: 'pepgzx3', name: 'pepgzx3', file: 'pepgzx3.json' },
  { id: 'pep3_1', name: 'pep3_1', file: 'pep3_1.json' },
  { id: 'pep3_2', name: 'pep3_2', file: 'pep3_2.json' },
  { id: 'pep4_1', name: 'pep4_1', file: 'pep4_1.json' },
  { id: 'pep4_2', name: 'pep4_2', file: 'pep4_2.json' },
  { id: 'pep5_1', name: 'pep5_1', file: 'pep5_1.json' },
  { id: 'pep5_2', name: 'pep5_2', file: 'pep5_2.json' },
  { id: 'pep6_1', name: 'pep6_1', file: 'pep6_1.json' },
  { id: 'pep6_2', name: 'pep6_2', file: 'pep6_2.json' },
];

console.log('=== 词库数据导入云开发数据库 ===');
console.log(`云环境: ${ENV_ID}`);
console.log(`数据目录: ${WORDBOOKS_DIR}`);
console.log('');

// 检查文件并统计
let totalWords = 0;
for (const book of bookFiles) {
  const filePath = path.join(WORDBOOKS_DIR, book.file);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`  ${book.name} (${book.id}): ${data.length} 词`);
    totalWords += data.length;
  } else {
    console.log(`  ${book.name}: 文件不存在!`);
  }
}
console.log(`  总计: ${totalWords} 词`);
console.log('');

// 生成云开发数据库导入格式（每行一个 JSON 对象，不包含数组括号）
for (const book of bookFiles) {
  const filePath = path.join(WORDBOOKS_DIR, book.file);
  if (!fs.existsSync(filePath)) continue;

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  
  // 云开发数据库导入格式：每行一个 JSON 对象
  const lines = data.map(w => JSON.stringify({
    bookId: book.id,
    word: w.word,
    phonetic: w.phonetic || '',
    meaning: w.meaning || '',
    example: w.example || '',
    isHighFreq: w.isHighFreq || false,
    // ECDICT 扩展字段
    root: w.root || '',
    synonyms: w.synonyms || '',
    antonyms: w.antonyms || '',
    relatedWords: w.relatedWords || '',
    frequency: w.frequency || 0,
    star: w.star || 0
  }));

  const importFile = path.join(WORDBOOKS_DIR, `${book.id}_import.jsonl`);
  fs.writeFileSync(importFile, lines.join('\n'), 'utf-8');
  console.log(`已生成导入文件: ${book.id}_import.jsonl (${lines.length} 行)`);
}

console.log('');
console.log('=== 导入方式 ===');
console.log('方式1: 微信开发者工具 -> 云开发 -> 数据库 -> 创建集合 wordbooks');
console.log('       然后在每个词书的 _import.jsonl 文件上点击「导入数据」');
console.log('');
console.log('方式2: 使用云函数 initWords，在小程序中调用');
console.log('       wx.cloud.callFunction({ name: "initWords", data: { action: "import", bookId, words } })');
