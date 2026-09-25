#!/usr/bin/env node
// scripts/test-userbook-extract.js
// 个人词书「抽词 → 词形归一 → 匹配 → 回填例句」的本地离线测试
//
// 用真实词库（wordbooks_json/）当数据源，模拟云函数的匹配结果，
// 在不需要微信环境、不联网的情况下验证核心逻辑。
//
// 用法：node scripts/test-userbook-extract.js
//
// 为什么值得单独写：词形归一是这个功能的正确性核心，
// 而它恰好是最容易写错、又最难在真机上肉眼发现问题的部分。

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const { tokenize, expandForms, buildWords, FUNCTION_WORDS } = require(
  path.join(ROOT, 'cloudfunctions/userBook/extract.js')
);

// ─── 1. 载入真实词库，模拟云数据库查询结果 ────────────────────────
function loadDict() {
  const metaPath = path.join(ROOT, 'wordbooks_json/books_meta.json');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
  const byForm = Object.create(null);

  for (const b of meta) {
    const p = path.join(ROOT, 'wordbooks_json', b.id + '.json');
    if (!fs.existsSync(p)) continue;
    for (const w of JSON.parse(fs.readFileSync(p, 'utf-8'))) {
      const key = (w.word || '').trim().toLowerCase();
      if (!key) continue;
      const prev = byForm[key];
      // 与云函数一致：同一词优先取高频标记的那条
      if (!prev || (!prev.isHighFreq && w.isHighFreq)) {
        byForm[key] = {
          word: key,
          phonetic: w.phonetic || '',
          meaning: w.meaning || '',
          example: w.example || '',
          isHighFreq: !!w.isHighFreq,
          posTag: w.posTag,
          bookId: b.id
        };
      }
    }
  }
  return byForm;
}

const DICT = loadDict();
const DICT_KEYS = Object.keys(DICT).length;

// ─── 2. 测试语料 ─────────────────────────────────────────────────
const SAMPLES = [
  {
    name: '新闻体（含大量不规则变形）',
    text: `Electronic waste is now the fastest-growing waste stream in the world. ` +
      `Governments have been trying to regulate it for years, but the rules were ` +
      `written before the problem became urgent. Many companies said they would ` +
      `recycle old devices, yet few actually did it. Studies show that only about ` +
      `twenty percent of discarded electronics are properly collected. Consumers ` +
      `are often unaware that their old phones contain valuable metals, and they ` +
      `simply throw them away. Some countries have banned exports of such waste, ` +
      `but shipments continue to arrive at ports in developing nations.`
  },
  {
    name: '文学体（含所有格与缩写）',
    text: `Elizabeth's father had told her that Mr Darcy was a proud man, and she ` +
      `believed him. She had not seen such behaviour before, and it made her ` +
      `uneasy. Her sister's friend said the same thing, though nobody listened. ` +
      `They were standing near the window when the carriage arrived, and the ` +
      `servants were running to open the gate.`
  },
  {
    name: '简单句（验证虚词过滤）',
    text: `The teacher gave us a book and told us to read it carefully. ` +
      `An old man was sitting on the bench, and he was watching the birds fly over the lake.`
  }
];

// ─── 3. 断言 ─────────────────────────────────────────────────────
let failures = 0;
function check(label, cond, extra) {
  if (cond) {
    console.log('  \u2713 ' + label);
  } else {
    failures++;
    console.log('  \u2717 ' + label + (extra ? '  → ' + extra : ''));
  }
}

console.log('══════════════════════════════════════════════════');
console.log(' 个人词书抽词逻辑 · 本地离线测试');
console.log('══════════════════════════════════════════════════');
console.log('词库词形数（含跨书去重）:', DICT_KEYS);
console.log('');

// ─── 3.1 词形归一单元断言 ────────────────────────────────────────
console.log('[1] 词形归一：不规则变形');
const irregularCases = [
  ['was', 'be'], ['were', 'be'], ['been', 'be'], ['is', 'be'],
  ['said', 'say'], ['did', 'do'], ['done', 'do'], ['made', 'make'],
  ['came', 'come'], ['went', 'go'], ['heard', 'hear'], ['seen', 'see'],
  ['told', 'tell'], ['given', 'give'], ['began', 'begin'], ['knew', 'know'],
  ['has', 'have'], ['having', 'have'], ['replied', 'reply'], ['cried', 'cry']
];
for (const [form, base] of irregularCases) {
  const forms = expandForms(form);
  check(`${form} → ${base}`, forms.indexOf(base) >= 0, '得到 [' + forms.join(', ') + ']');
}

console.log('');
console.log('[2] 词形归一：规则化后缀还原');
const ruleCases = [
  ['studies', 'study'], ['running', 'run'], ['stopped', 'stop'],
  ['books', 'book'], ['watched', 'watch'], ['watching', 'watch'],
  ['easily', 'easy'], ['larger', 'large'], ['boxes', 'box'],
  ["teacher's", 'teacher'], ['biggest', 'big'],
  ['fastest-growing', 'fast'], ['well-known', 'well'], ['became', 'become']
];
for (const [form, base] of ruleCases) {
  const forms = expandForms(form);
  check(`${form} → ${base}`, forms.indexOf(base) >= 0, '得到 [' + forms.join(', ') + ']');
}

// ─── 3.2 端到端 ─────────────────────────────────────────────────
for (const s of SAMPLES) {
  console.log('');
  console.log('[' + (SAMPLES.indexOf(s) + 3) + '] 端到端：' + s.name);

  const tokens = tokenize(s.text);
  const built = buildWords(tokens, DICT, s.text);
  const withExample = built.words.filter((w) => w.example).length;
  const matchedForm = built.words.filter((w) => w.matchedForm).length;

  console.log(`  候选词 ${tokens.length} → 入库 ${built.words.length} · ` +
    `未命中 ${built.missed.length} · 虚词过滤 ${built.funcFiltered}`);
  console.log(`  例句回填 ${withExample}/${built.words.length} · ` +
    `带原文形态标记 ${matchedForm}`);

  // 虚词不应入库（posTag 不可靠，必须叠加兜底虚词表判定）
  const leaked = built.words.filter(
    (w) => (DICT[w.word] && DICT[w.word].posTag === 'func') || FUNCTION_WORDS.has(w.word)
  );
  check('功能词没有混进词书', leaked.length === 0,
    leaked.map((w) => w.word).join(', '));

  // 归一后不应有重复
  const uniq = new Set(built.words.map((w) => w.word));
  check('归一后无重复', uniq.size === built.words.length);

  // 不该出现的基础虚词（词库漏收的 an 也不能冒到未命中里）
  check('an 未出现在未收录列表', built.missed.indexOf('an') < 0,
    built.missed.slice(0, 12).join(', '));

  // 入库词数应在合理区间
  const ratio = built.words.length / tokens.length;
  check(`入库比例合理（${(ratio * 100).toFixed(0)}%）`, ratio > 0.2 && ratio < 0.95);

  // 展示前几条
  console.log('  样例：');
  for (const w of built.words.slice(0, 5)) {
    const tag = w.matchedForm ? `  [原文: ${w.matchedForm}]` : '';
    const ex = w.example ? `  例: ${w.example.slice(0, 46)}…` : '';
    console.log(`    ${w.word.padEnd(14)} ${(w.meaning || '').slice(0, 22).padEnd(24)}${tag}${ex}`);
  }
  if (built.missed.length) {
    console.log('  未命中：' + built.missed.slice(0, 12).join(', '));
  }
}

// ─── 4. 词库缺口回归 ────────────────────────────────────────────
console.log('');
console.log('[6] 词库已知缺口回归');
const gaps = ['an', 'was', 'were', 'been', 'did', 'done', 'has', 'having'];
for (const g of gaps) {
  const inDict = !!DICT[g];
  const resolved = expandForms(g).some((f) => f !== g && DICT[f]);
  const viaStop = FUNCTION_WORDS.has(g);
  check(`${g} 不会暴露给用户`, inDict || resolved || viaStop,
    inDict ? '在词库中'
      : resolved ? '可由词形还原命中'
        : viaStop ? '靠兜底虚词表静默过滤'
          : '无任何保护，会出现在未收录列表里');
}

// ─── 5. posTag 缺失等价性 ───────────────────────────────────────
// *_import.jsonl 导出时丢了 posTag，数据库里可能压根没有这个字段。
// 兜底虚词表必须能独立撑起过滤，否则一旦 posTag 缺失，
// 用户上传的文章里会混进一堆 the / of / is。
console.log('');
console.log('[7] 数据库缺 posTag 时的等价性');

const dictNoPosTag = Object.create(null);
for (const k of Object.keys(DICT)) {
  dictNoPosTag[k] = Object.assign({}, DICT[k], { posTag: undefined });
}

let posTagDiff = 0;
for (const s of SAMPLES) {
  const withTag = buildWords(tokenize(s.text), DICT, s.text);
  const noTag = buildWords(tokenize(s.text), dictNoPosTag, s.text);
  const a = withTag.words.map((w) => w.word).sort().join(',');
  const b = noTag.words.map((w) => w.word).sort().join(',');
  const same = a === b;
  if (!same) posTagDiff++;
  check(`${s.name}：结果一致`, same,
    same ? '' : '有 posTag ' + withTag.words.length + ' 条 / 无 posTag ' + noTag.words.length + ' 条');

  const leaked = noTag.words.filter((w) => FUNCTION_WORDS.has(w.word));
  check(`${s.name}：无 posTag 也没漏虚词`, leaked.length === 0,
    leaked.map((w) => w.word).join(', '));
}
check('兜底虚词表规模足够（≥180）', FUNCTION_WORDS.size >= 180,
  '当前 ' + FUNCTION_WORDS.size + ' 个');

console.log('');
console.log('══════════════════════════════════════════════════');
if (failures === 0) {
  console.log(' 全部通过');
} else {
  console.log(' ✗ 失败 ' + failures + ' 项');
}
console.log('══════════════════════════════════════════════════');
process.exit(failures === 0 ? 0 : 1);
