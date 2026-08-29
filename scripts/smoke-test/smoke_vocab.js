// 词汇量估值模型回归烟测（纯函数，不依赖微信环境）
// 编译：与 store.ts 一起 tsc 到 scripts/smoke-test/out 后运行
'use strict';

const v = require('./out/vocabEstimate.js');

const BANDS = [
  { label: '初中', cumulative: 1600 },
  { label: '高中', cumulative: 3500 },
  { label: '四级', cumulative: 4500 },
  { label: '六级', cumulative: 6000 },
  { label: '考研', cumulative: 7000 }
];

let failed = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log('  ✓ ' + name);
  } else {
    failed++;
    console.error('  ✗ ' + name + (detail ? '  → ' + JSON.stringify(detail) : ''));
  }
}

console.log('═ 词汇量估值：全对 / 全错 / 一半 ═');
let r = v.estimateVocab(BANDS, [6, 6, 6, 6, 6], 6);
assert('全对 → 估值 6125（m-估计压顶 0.875，不夸大），推荐最后一层', r.estimate === 6125 && r.recommendIndex === 4, r);

r = v.estimateVocab(BANDS, [0, 0, 0, 0, 0], 6);
assert('全错 → 估值 875（m-估计保底），推荐初中', r.estimate === 875 && r.recommendIndex === 0, r);

r = v.estimateVocab(BANDS, [3, 3, 3, 3, 3], 6);
assert('各对一半 → 估值 3500，推荐初中', r.estimate === 3500 && r.recommendIndex === 0, r);

console.log('═ 词汇量估值：等渗平滑 ═');
r = v.estimateVocab(BANDS, [5, 6, 6, 6, 6], 6);
assert('高层全对不虚增（初中 5/6 封顶）', r.estimate === 5250 && Math.max(...r.rates) === 0.75, r);

r = v.estimateVocab(BANDS, [6, 0, 0, 0, 0], 6);
assert('初中全对、高层全错 → 估值 2075，推荐高中', r.estimate === 2075 && r.recommendIndex === 1, r);

r = v.estimateVocab(BANDS, [6, 6, 6, 6, 4], 6);
assert('前四层全过、考研跌破 0.8 → 推荐考研', r.recommendIndex === 4 && r.estimate === 5875, r);

console.log('═ 词汇量估值：边界 ═');
r = v.estimateVocab(BANDS, [6, 6, 6, 0, 0], 6);
assert('六级全错 → 推荐六级（掌握度 0.125）', r.recommendIndex === 3, r);

if (failed === 0) {
  console.log('\n✅ 全部断言通过');
  process.exit(0);
} else {
  console.error(`\n❌ ${failed} 项断言失败`);
  process.exit(1);
}