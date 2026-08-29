// SM-2 排程引擎回归烟测（不依赖微信环境）
// 运行：npm run smoke 或手动：
//   npx tsc miniprogram/utils/store.ts scripts/smoke-test/wx.d.ts --outDir scripts/smoke-test/out --module commonjs --target es2020 --skipLibCheck
//   node scripts/smoke-test/smoke_sm2.js
'use strict';

// ─── wx 内存 stub ───
const storage = {};
global.wx = {
  getStorageSync: (k) => storage[k],
  setStorageSync: (k, v) => { storage[k] = v; },
  cloud: null
};

const store = require('./out/store.js');

const DAY = 24 * 60 * 60 * 1000;
let failed = 0;

function assert(name, cond, detail) {
  if (cond) {
    console.log('  ✓ ' + name);
  } else {
    failed++;
    console.error('  ✗ ' + name + (detail ? '  → ' + JSON.stringify(detail) : ''));
  }
}

function nowDays(p, offsetDays) {
  return Math.round((p.nextReview - (Date.now() - (offsetDays * DAY))) / DAY);
}

console.log('═ SM-2 排程：新词连续答对 4 次 → 已掌握 ═');
const t0 = Date.now();
let p = store.recordWordProgress('cet4', 'abandon', true);
assert('第一次答对：rep=1 interval=1 天', p.rep === 1 && p.interval === 1, p);
assert('第一次答对：box=2 且状态 learning', p.box === 2 && p.status === 'learning', p);
assert('第一次答对：下次复习 = 1 天后', Math.round((p.nextReview - t0) / DAY) === 1, p);

p = store.recordWordProgress('cet4', 'abandon', true);
assert('第二次答对：rep=2 interval=2 天', p.rep === 2 && p.interval === 2, p);
p = store.recordWordProgress('cet4', 'abandon', true);
assert('第三次答对：rep=3 interval=4 天', p.rep === 3 && p.interval === 4, p);
p = store.recordWordProgress('cet4', 'abandon', true);
assert('第四次答对：rep=4 interval=7 天 = 已掌握', p.rep === 4 && p.interval === 7 && p.box === 5 && p.status === 'mastered', p);

console.log('═ SM-2 排程：已掌握后继续答对 → 间隔按 ease 拉长 ═');
p = store.recordWordProgress('cet4', 'abandon', true);
assert('第五次答对：interval = round(7×2.5) = 18 天', p.rep === 5 && p.interval === 18, p);
assert('第五次答对：ease 封顶 2.5', p.ease === 2.5, p);
p = store.recordWordProgress('cet4', 'abandon', true);
assert('第六次答对：interval = round(18×2.5) = 45 天', p.interval === 45, p);

console.log('═ SM-2 排程：答错重置 ═');
p = store.recordWordProgress('cet4', 'abandon', false);
assert('答错：rep=0 interval=0 box=1 learning', p.rep === 0 && p.interval === 0 && p.box === 1 && p.status === 'learning', p);
assert('答错：立即可复习（nextReview≈now）', Math.abs(p.nextReview - Date.now()) < 1000, p);
assert('答错：ease 从 2.5 降到 2.3', p.ease === 2.3, p);

console.log('═ 旧 Leitner 数据兼容（只有 box） ═');
// 手工写入一条旧格式记录（box=5 = 旧已掌握，无 rep/interval/ease）
const all = store.getAllProgress('cet4');
all['oldword'] = { word: 'oldword', status: 'review', box: 5, knownCount: 0, unknownCount: 0, nextReview: Date.now() - 3 * DAY, lastSeen: Date.now() - 10 * DAY };
store.saveAllProgress('cet4', all);
p = store.recordWordProgress('cet4', 'oldword', true);
assert('旧 box=5 记录答对：回填 rep=4 后升到 rep=5，interval 按 ease 拉长到 18', p.rep === 5 && p.interval === 18 && p.box === 6, p);
// 旧 box=3 只答对过一次的语义验证：record 一次 known 应 rep=2 interval=2
all['oldword2'] = { word: 'oldword2', status: 'learning', box: 2, knownCount: 0, unknownCount: 0, nextReview: 0, lastSeen: 0 };
store.saveAllProgress('cet4', all);
p = store.recordWordProgress('cet4', 'oldword2', true);
assert('旧 box=2 记录答对：rep=2 interval=2 天', p.rep === 2 && p.interval === 2 && p.box === 3, p);

console.log('═ mergeProgress：深度合并（与云函数同策略） ═');
const legacy = { w1: { word: 'w1', box: 3, status: 'review', knownCount: 1, unknownCount: 0, nextReview: 0, lastSeen: 100 } };
const newer = { w1: { word: 'w1', box: 3, status: 'review', knownCount: 2, unknownCount: 0, nextReview: 0, lastSeen: 200 } };
const m = store.mergeProgress(legacy, newer);
assert('深度相同取 lastSeen 更新者 + 累计取较大值', m.w1.lastSeen === 200 && m.w1.knownCount === 2, m);

const deep = { w2: { word: 'w2', box: 4, rep: 3, interval: 4, ease: 2.5, knownCount: 3, unknownCount: 0, lastSeen: 100 } };
const shallow = { w2: { word: 'w2', box: 5, rep: 4, interval: 100, ease: 2.5, knownCount: 3, unknownCount: 0, lastSeen: 500 } };
// rep=4 深度更高（即使 lastSeen 更旧）→ 应选 shallow 的调度
const m2 = store.mergeProgress(deep, shallow);
assert('rep 高者胜（不受 lastSeen 影响）', m2.w2.rep === 4 && m2.w2.interval === 100, m2);
assert('合并后 box/status 由 rep 归一化', m2.w2.box === 5 && m2.w2.status === 'mastered', m2);

// 旧格式（无 rep）与 SM-2 新格式比较
const legacyBox7 = { w3: { word: 'w3', box: 7, knownCount: 7, unknownCount: 1, lastSeen: 100 } };
const sm2rep5 = { w3: { word: 'w3', box: 5, rep: 6, interval: 44, ease: 2.5, knownCount: 6, unknownCount: 0, lastSeen: 1000 } };
const m3 = store.mergeProgress(legacyBox7, sm2rep5);
assert('旧 box=7(rep≈6) 深度更高者胜', m3.w3.rep === 6 && m3.w3.box === 7, m3);

console.log('═ getReviewPlan：到期词与理由 ═');
// 构造：一个已逾期 2 天的 box3 词（interval=2），一个明天到期的 box2 词
const all2 = store.getAllProgress('cet4');
all2['dueword'] = { word: 'dueword', status: 'review', box: 3, rep: 2, interval: 2, ease: 2.5, knownCount: 2, unknownCount: 0, nextReview: Date.now() - 2 * DAY, lastSeen: Date.now() - 4 * DAY };
all2['laterword'] = { word: 'laterword', status: 'learning', box: 2, rep: 1, interval: 1, ease: 2.5, knownCount: 1, unknownCount: 0, nextReview: Date.now() + DAY, lastSeen: Date.now() };
store.saveAllProgress('cet4', all2);
const plan = store.getReviewPlan('cet4');
assert('到期词数 = 2（逾期 dueword + 答错后立即可复习的 abandon）', plan.dueToday === 2 && plan.dueList.length === 2, plan);
assert('到期理由含真实间隔「间隔 2 天」', plan.dueList[0].reason.indexOf('间隔 2 天') > -1, plan.dueList[0].reason);
assert('到期理由标注逾期 2 天', plan.dueList[0].reason.indexOf('晚了 2 天') > -1, plan.dueList[0].reason);
assert('未来 7 天预测包含明天到期的词', plan.forecast[0].count >= 1, plan.forecast);
assert('已掌握数统计正确（oldword 已掌握）', plan.masteredCount >= 1, plan.masteredCount);

console.log('═ getBookProgressStats：统计兼容 ═');
const stats = store.getBookProgressStats('cet4');
assert('dueCount ≥ 1（dueword 逾期）', stats.dueCount >= 1, stats);
assert('masteredCount ≥ 1（oldword box6）', stats.masteredCount >= 1, stats);
assert('knownCount ≥ 4（四个 box≥2 的词）', stats.knownCount >= 4, stats);

if (failed === 0) {
  console.log('\n✅ 全部断言通过');
  process.exit(0);
} else {
  console.error(`\n❌ ${failed} 项断言失败`);
  process.exit(1);
}