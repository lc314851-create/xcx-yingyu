// scripts/test-word-index.js
// 验证：词索引（内存匹配）与旧数据库路径的结果一致性 + 覆盖率提升
//
// 背景：个人词书匹配从「查 wordbooks 集合」改成「查随代码包部署的 wordindex.json」。
// 这个脚本验证两件事：
//   1. 新索引没有回归 —— 旧词库里能匹配到的词，新索引一个不少
//   2. 新索引有收益 —— 考纲外的词（文学词、术语）现在能匹配到了
//
// 用法：node scripts/test-word-index.js

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { tokenize, expandForms, buildWords } = require(
  path.join(ROOT, 'cloudfunctions/userBook/extract.js')
);

// ─── A：旧路径（模拟查 wordbooks 集合）────────────────────────────
const meta = JSON.parse(fs.readFileSync(path.join(ROOT, 'wordbooks_json/books_meta.json'), 'utf-8'));
const dbHit = Object.create(null);
for (const b of meta) {
  const p = path.join(ROOT, 'wordbooks_json', b.id + '.json');
  if (!fs.existsSync(p)) continue;
  for (const w of JSON.parse(fs.readFileSync(p, 'utf-8'))) {
    const k = (w.word || '').trim().toLowerCase();
    if (!k) continue;
    const prev = dbHit[k];
    if (!prev || (!prev.isHighFreq && w.isHighFreq)) {
      dbHit[k] = {
        word: k, phonetic: w.phonetic || '', meaning: w.meaning || '',
        example: w.example || '', isHighFreq: !!w.isHighFreq,
        posTag: w.posTag, bookId: b.id
      };
    }
  }
}

// ─── B：新路径（模拟加载 wordindex.json）─────────────────────────
const ipath = path.join(ROOT, 'cloudfunctions/userBook/wordindex.json');
const imeta = JSON.parse(fs.readFileSync(ipath, 'utf-8'));
const idxHit = Object.create(null);
for (const r of (imeta.rows || [])) {
  idxHit[r[0]] = {
    word: r[0], phonetic: r[1] || '', meaning: r[2] || '',
    isHighFreq: !!r[3], bookId: r[5] || ''
  };
}

let failures = 0;
function check(label, cond, extra) {
  console.log((cond ? '  ✓ ' : '  ✗ ') + label + (extra && !cond ? '  → ' + extra : ''));
  if (!cond) failures++;
}

console.log('══════════════════════════════════════════════════');
console.log(' 词索引接入验证');
console.log('══════════════════════════════════════════════════');
console.log('索引版本 v' + imeta.v + ' · ' + imeta.count + ' 词形 · ' +
  imeta.generated + ' 生成 · 官方 ' + imeta.official + ' / ECDICT ' + imeta.ecdict);
console.log('');

const SAMPLES = [
  ['新闻体', 'Electronic waste is now the fastest-growing waste stream in the world. ' +
    'Governments have been trying to regulate it for years, but the rules were written before ' +
    'the problem became urgent. Many companies said they would recycle old devices, yet few ' +
    'actually did it. Studies show that only about twenty percent of discarded electronics are ' +
    'properly collected. Consumers are often unaware that their old phones contain valuable ' +
    'metals, and they simply throw them away.'],
  ['文学体', "Elizabeth's father had told her that Mr Darcy was a proud man, and she believed " +
    'him. She had not seen such behaviour before, and it made her uneasy. Her sister\'s friend ' +
    'said the same thing, though nobody listened. They were standing near the window when the ' +
    'carriage arrived, and the servants were running to open the gate.'],
  ['医学体', 'The patient presented with acute abdominal pain and a history of hypertension. ' +
    'Computed tomography revealed a small lesion in the pancreas. The surgeon recommended a ' +
    'laparoscopic resection, and the biopsy confirmed the diagnosis of adenocarcinoma.'],
  ['专升本词汇示例', 'The vocational student studied economics and management, attending ' +
    'lectures on marketing and accounting at the college.']
];

console.log('[1] 覆盖率与回归');
for (const [name, text] of SAMPLES) {
  const toks = tokenize(text);
  const a = buildWords(toks, dbHit, text);
  const b = buildWords(toks, idxHit, text);
  const setA = new Set(a.words.map((w) => w.word));
  const setB = new Set(b.words.map((w) => w.word));

  // 回归：旧路径能匹配到的，新路径必须仍能覆盖（按词元口径）。
  // studied → study 这类变化是「改善」不是「丢失」，所以要按还原形式比。
  const lost = [...setA].filter((w) => !expandForms(w).some((f) => setB.has(f)));
  check(name + '：无回归（旧 ' + setA.size + ' 词 → 新 ' + setB.size + ' 词，按词元口径）',
    lost.length === 0, '丢失: ' + lost.slice(0, 12).join(', '));

  const gained = [...setB].filter((w) => !setA.has(w));
  console.log('      新增匹配: ' + gained.length + ' 个' +
    (gained.length ? '  → ' + gained.slice(0, 8).join(', ') + (gained.length > 8 ? ' …' : '') : ''));
}

console.log('');
console.log('[2] 释义来源与字段完整性');
const s0 = SAMPLES[0][1];
const r0 = buildWords(tokenize(s0), idxHit, s0);
const noMeaning = r0.words.filter((w) => !w.meaning);
check('所有词条都有释义', noMeaning.length === 0,
  '缺释义: ' + noMeaning.slice(0, 8).map((w) => w.word).join(', '));
const withFrom = r0.words.filter((w) => w.from);
console.log('  来自官方词书: ' + withFrom.length + ' / ' + r0.words.length +
  '（其余为 ECDICT 兜底）');

console.log('');
console.log('[3] 索引自检');
check('索引里有 zsb 词书的内容', !!idxHit['massage'] || !!idxHit['cabin'],
  'zsb 未进入索引（build 脚本可能漏读 zsb.json）');
check('索引补上了词库漏收的 an', !!idxHit['an'], 'an 不在索引');
check('真词保留：thing / teacher / interesting',
  !!idxHit['thing'] && !!idxHit['teacher'] && !!idxHit['interesting'],
  '误把词元当变形剔掉了');

// 变形词不应作为独立词条 —— 应靠词形归一落到原形
console.log('');
console.log('[4] 变形词归位（不应出现 said/told/books 这类卡片）');

// 样例文本必须包含所有被测词，否则「没归到原形」是假阳性
const textAll = 'He was there and said nothing. They told the men and women about the ' +
  'books. She is running and studies hard, and replied quickly. He went home and gave ' +
  'her a gift that she kept.';
const r = buildWords(tokenize(textAll), idxHit, textAll);
const got = new Set(r.words.map((w) => w.word));

// 期望：变形词落到原形
const EXPECT = {
  said: 'say', told: 'tell', men: 'man', women: 'woman', books: 'book',
  studies: 'study', replied: 'reply', went: 'go', gave: 'give'
};
for (const [form, base] of Object.entries(EXPECT)) {
  check(form + ' → ' + base, got.has(base) && !got.has(form),
    got.has(form) ? '卡片里出现了变形词本身' : '没归到原形');
}

// was/were 归到 be 之后会被虚词过滤 —— 属正常（不该让用户背 be）
check('was / were 被虚词过滤（不产生卡片）', !got.has('was') && !got.has('were') && !got.has('be'),
  '出现了 was/were/be');

// 兼类词例外：running 本身就是值得学的词，保留原形
check('running 保留原形（兼类词例外）', got.has('running') && !got.has('run'),
  got.has('run') ? '被过度还原成 run' : '');

check('没有未收录的变形词残留', r.missed.length === 0,
  r.missed.slice(0, 10).join(', '));

process.exit(failures === 0 ? 0 : 1);
