// scripts/measure-posTag-impact.js
// 测算：数据库若缺 posTag 字段，虚拟词过滤会弱多少？
//
// 背景：*_import.jsonl 导出时丢了 posTag，数据库里的记录可能没有该字段。
// 个人词书的虚词过滤是「posTag === 'func' || FUNCTION_WORDS.has(base)」双保险，
// 这个脚本量化第一层失效后还剩多少保障。
//
// 用法：node scripts/measure-posTag-impact.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { tokenize, buildWords, FUNCTION_WORDS } = require(
  path.join(ROOT, 'cloudfunctions/userBook/extract.js')
);

const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'wordbooks_json/books_meta.json'), 'utf-8'));

function loadDict(stripPosTag) {
  const by = Object.create(null);
  for (const b of meta) {
    const p = path.join(ROOT, 'wordbooks_json', b.id + '.json');
    if (!fs.existsSync(p)) continue;
    for (const w of JSON.parse(fs.readFileSync(p, 'utf-8'))) {
      const k = (w.word || '').trim().toLowerCase();
      if (!k) continue;
      const prev = by[k];
      if (!prev || (!prev.isHighFreq && w.isHighFreq)) {
        by[k] = {
          word: k,
          phonetic: w.phonetic || '',
          meaning: w.meaning || '',
          example: w.example || '',
          isHighFreq: !!w.isHighFreq,
          posTag: stripPosTag ? undefined : w.posTag,
          bookId: b.id
        };
      }
    }
  }
  return by;
}

const TEXTS = {
  '新闻体': 'Electronic waste is now the fastest-growing waste stream in the world. ' +
    'Governments have been trying to regulate it for years, but the rules were written ' +
    'before the problem became urgent. Many companies said they would recycle old devices, ' +
    'yet few actually did it. Studies show that only about twenty percent of discarded ' +
    'electronics are properly collected. Consumers are often unaware that their old phones ' +
    'contain valuable metals, and they simply throw them away.',
  '文学体': "Elizabeth's father had told her that Mr Darcy was a proud man, and she believed " +
    'him. She had not seen such behaviour before, and it made her uneasy. Her sister\'s friend ' +
    'said the same thing, though nobody listened. They were standing near the window when the ' +
    'carriage arrived, and the servants were running to open the gate.'
};

console.log('══════════════════════════════════════════════════');
console.log(' posTag 缺失对虚词过滤的影响');
console.log('══════════════════════════════════════════════════');

for (const label of ['数据库有 posTag', '数据库无 posTag（当前情况）']) {
  const strip = label.indexOf('无') >= 0;
  const dict = loadDict(strip);
  console.log('');
  console.log('▸ ' + label);

  for (const name of Object.keys(TEXTS)) {
    const built = buildWords(tokenize(TEXTS[name]), dict, TEXTS[name]);
    const leaked = built.words.filter((w) => FUNCTION_WORDS.has(w.word));
    const viaDict = built.words.filter((w) => dict[w.word] && dict[w.word].posTag === 'func');
    console.log('  ' + name + '：入库 ' + built.words.length +
      ' 条 | 过滤计数 ' + built.funcFiltered +
      ' | 仍漏进词书 ' + leaked.length + ' 条');
    if (leaked.length) {
      console.log('      漏进的是：' + leaked.map((w) => w.word).join(', '));
    }
    if (viaDict.length) {
      console.log('      （其中靠 posTag 拦下的：' + viaDict.map((w) => w.word).join(', ') + '）');
    }
  }
}

console.log('');
console.log('FUNCTION_WORDS 表规模: ' + FUNCTION_WORDS.size + ' 个词');
console.log('══════════════════════════════════════════════════');
