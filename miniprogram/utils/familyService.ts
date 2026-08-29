// utils/familyService.ts
// 词根星系数据服务：同根词族聚合 + 形近词关联
//
// 数据有两种来源：
//   1) 词库 JSON 自带的增强字段（root/rootGloss/relatedWords，由 enrich 管线生成）
//   2) 运行时兜底：词库缺字段时（旧缓存 / 本地种子），客户端现场计算词根与形近词
// 两者产出同构，星系页无感知。

import { WordItem } from '../data/types';
import { getBookWords } from './wordService';
import { getCurrentBookId } from './store';
import { familySeeds } from '../data/familySeeds';

// ─── 词根释义表（与 enrich 管线同步的紧凑版） ──────────────────
const ROOT_GLOSS: Record<string, string> = {
  act: '做', ag: '做', anim: '生命', ann: '年', aqua: '水', aud: '听',
  auto: '自己', bio: '生命', cede: '走', ceed: '走', cess: '走', cent: '百',
  chron: '时间', circ: '环', claim: '喊', clam: '喊', clud: '关闭', clus: '关闭',
  clude: '关闭', cogn: '知道', cord: '心', corp: '身体', cred: '相信', cur: '跑',
  curs: '跑', dem: '人民', dict: '说', duc: '引导', duct: '引导', duce: '引导',
  dur: '持久', equ: '平等', fac: '做', fact: '做', fect: '做', fer: '带来',
  fid: '信任', fin: '结束', flect: '弯曲', flu: '流', form: '形状', frag: '破',
  fract: '破', gen: '产生', grad: '步', gress: '步', gram: '写', graph: '写',
  grat: '喜悦', grav: '重', ject: '投', jud: '判断', junct: '连接', jur: '法律',
  lat: '带来', lect: '选择', leg: '选择', lig: '选择', liber: '自由', log: '说',
  loqu: '说', luc: '光', lum: '光', magn: '大', man: '手', manu: '手',
  mar: '海', medi: '中间', memor: '记忆', ment: '心', merg: '沉', migr: '迁移',
  min: '小', mit: '送', miss: '送', mob: '动', mot: '动', mov: '动',
  mort: '死', mut: '改变', nat: '出生', oper: '工作', par: '相等', pass: '感情',
  path: '感情', pel: '推', puls: '推', pend: '悬挂', pens: '悬挂', pet: '寻求',
  phon: '声音', plac: '取悦', ple: '满', plic: '折叠', ply: '折叠', ploy: '折叠',
  pon: '放', pos: '放', popul: '人', port: '拿', press: '压', prim: '第一',
  priv: '私人', put: '想', quest: '问', rad: '光', rect: '直', rupt: '破',
  scend: '爬', sci: '知道', scrib: '写', script: '写', sect: '切', sed: '坐',
  sens: '感觉', sent: '感觉', serv: '保持', sid: '坐', sign: '记号', sist: '站',
  sol: '唯一', solv: '松', son: '声音', spect: '看', spir: '呼吸', sta: '站',
  stat: '站', stitut: '站', struct: '建造', tain: '握', tect: '盖', tele: '远',
  tend: '伸', tens: '伸', term: '界限', terra: '地', terr: '地', test: '证明',
  tort: '扭', tract: '拉', trib: '给予', turb: '搅乱', uni: '一', ur: '城市',
  vac: '空', vad: '走', val: '强', ven: '来', vent: '来', ver: '真',
  vers: '转', vert: '转', vid: '看', vis: '看', vide: '看', viv: '活',
  vit: '活', voc: '声音', vok: '声音', volv: '滚', vot: '愿望',
  sume: '拿', cept: '拿取', strain: '拉紧', strict: '拉紧', spond: '承诺',
  juse: '法律'
};

// 前缀表
const CONFIDENT_PREFIXES = [
  'counter', 'under', 'inter', 'trans', 'extra', 'ultra', 'fore',
  'over', 'anti', 'micro', 'multi', 'pseudo', 'semi', 'super',
  'auto', 'pre', 'mis', 'dis', 'non', 'out', 'sub', 'mid', 'neo',
  'uni', 'tri', 'vice', 'self', 'pro', 'para', 'mono', 'un', 're'
];
const RISKY_PREFIXES = [
  'in', 'im', 'il', 'ir', 'de', 'en', 'be', 'co', 'ex',
  'per', 'com', 'con', 'col', 'cor', 'bi'
];
const PREFIXES = [...CONFIDENT_PREFIXES, ...RISKY_PREFIXES].sort((a, b) => b.length - a.length);
const CONFIDENT_SET = new Set(CONFIDENT_PREFIXES);

// 后缀表（去掉 'y'：happy→hap 误剥）
const SUFFIXES = [
  'ational', 'fulness', 'lessness', 'ization', 'isation', 'bility',
  'ments', 'ment', 'ness', 'tion', 'sion', 'ation', 'ions', 'ion',
  'ously', 'ious', 'eous', 'ous', 'ively', 'ive', 'ably', 'ibly',
  'able', 'ible', 'ally', 'ful', 'less', 'ists', 'ist', 'isms', 'ism',
  'ers', 'ors', 'ies', 'ing', 'ed', 'ly', 'er', 'or',
  'ity', 'ety', 'ty', 'al', 'en', 'ish', 'es', 's', 'ic', 'ical'
].sort((a, b) => b.length - a.length);

// ─── 学段域：词根网络跨词书存在，教材分册的漫游池放宽到整个学段 ───
// 考试词书本身是聚合层（senior⊇junior、cet4⊇senior），直接用自身；
// PEP 教材分册并入对应学段域，否则一册几百词的池子让星系功能失去意义
const DOMAIN_MAP: Record<string, string[]> = {
  // 初中域：2024 新版 4 册 + 经典版九年级 + 中考大纲
  pepj7_1: ['pepj7_1', 'pepj7_2', 'pepj8_1', 'pepj8_2', 'pepj9', 'junior'],
  pepj7_2: ['pepj7_1', 'pepj7_2', 'pepj8_1', 'pepj8_2', 'pepj9', 'junior'],
  pepj8_1: ['pepj7_1', 'pepj7_2', 'pepj8_1', 'pepj8_2', 'pepj9', 'junior'],
  pepj8_2: ['pepj7_1', 'pepj7_2', 'pepj8_1', 'pepj8_2', 'pepj9', 'junior'],
  pepj9:   ['pepj7_1', 'pepj7_2', 'pepj8_1', 'pepj8_2', 'pepj9', 'junior'],
  // 高中域：现行必修 + 选择性必修 6 册 + 高考大纲
  pepgz1:   ['pepgz1', 'pepgz2', 'pepgz3', 'pepgzx1', 'pepgzx2', 'pepgzx3', 'senior'],
  pepgz2:   ['pepgz1', 'pepgz2', 'pepgz3', 'pepgzx1', 'pepgzx2', 'pepgzx3', 'senior'],
  pepgz3:   ['pepgz1', 'pepgz2', 'pepgz3', 'pepgzx1', 'pepgzx2', 'pepgzx3', 'senior'],
  pepgzx1:  ['pepgz1', 'pepgz2', 'pepgz3', 'pepgzx1', 'pepgzx2', 'pepgzx3', 'senior'],
  pepgzx2:  ['pepgz1', 'pepgz2', 'pepgz3', 'pepgzx1', 'pepgzx2', 'pepgzx3', 'senior'],
  pepgzx3:  ['pepgz1', 'pepgz2', 'pepgz3', 'pepgzx1', 'pepgzx2', 'pepgzx3', 'senior'],
  // 小学域：经典版 8 册
  pep3_1: ['pep3_1', 'pep3_2', 'pep4_1', 'pep4_2', 'pep5_1', 'pep5_2', 'pep6_1', 'pep6_2'],
  pep3_2: ['pep3_1', 'pep3_2', 'pep4_1', 'pep4_2', 'pep5_1', 'pep5_2', 'pep6_1', 'pep6_2'],
  pep4_1: ['pep3_1', 'pep3_2', 'pep4_1', 'pep4_2', 'pep5_1', 'pep5_2', 'pep6_1', 'pep6_2'],
  pep4_2: ['pep3_1', 'pep3_2', 'pep4_1', 'pep4_2', 'pep5_1', 'pep5_2', 'pep6_1', 'pep6_2'],
  pep5_1: ['pep3_1', 'pep3_2', 'pep4_1', 'pep4_2', 'pep5_1', 'pep5_2', 'pep6_1', 'pep6_2'],
  pep5_2: ['pep3_1', 'pep3_2', 'pep4_1', 'pep4_2', 'pep5_1', 'pep5_2', 'pep6_1', 'pep6_2'],
  pep6_1: ['pep3_1', 'pep3_2', 'pep4_1', 'pep4_2', 'pep5_1', 'pep5_2', 'pep6_1', 'pep6_2'],
  pep6_2: ['pep3_1', 'pep3_2', 'pep4_1', 'pep4_2', 'pep5_1', 'pep5_2', 'pep6_1', 'pep6_2']
};

// 词书 → 漫游域（考试词书用自身）
function resolveDomain(bookId: string): string[] {
  return DOMAIN_MAP[bookId] || [bookId];
}

// 词 → 收录词书（域内），用于标注"跨册漫游"的扩展词
type WordToBooks = Map<string, string[]>;

interface BookIndex {
  wordMap: Map<string, WordItem>;
  rootMap: Map<string, WordItem[]>;
  wordToBooks: WordToBooks;
}

// 缓存键 = 域（同域词书共享索引）
const indexCache: Record<string, BookIndex> = {};

// ─── 运行时词根计算（enrich 管线的 JS 移植） ────────────────────
function stemCandidates(s: string): string[] {
  const t: string[] = [];
  if (s.endsWith('i')) t.push(s.slice(0, -1) + 'y');
  t.push(s + 'e');
  if (s.endsWith('e')) t.push(s.slice(0, -1));
  if (s.length > 2 && s[s.length - 1] === s[s.length - 2]) t.push(s.slice(0, -1));
  if (s.endsWith('ie')) t.push(s.slice(0, -2) + 'y');
  const rank = (c: string) => {
    if (ROOT_GLOSS[c] && c.length >= 4) return 0;
    return 1;
  };
  return [...t, s].sort((a, b) => rank(a) - rank(b));
}

function acceptStem(cand: string, prefix: string, bookSet: Set<string>): boolean {
  if (cand.length < 3) return false;
  if (ROOT_GLOSS[cand]) return true;
  if (bookSet.has(cand)) return true;
  return CONFIDENT_SET.has(prefix) && cand.length >= 4;
}

function stripAffixes(word: string, bookSet: Set<string>, depth: number): string {
  if (depth >= 3 || word.length < 4) return word;
  let best = word;
  for (const pre of PREFIXES) {
    if (word.startsWith(pre) && word.length - pre.length >= 3) {
      const rest = word.slice(pre.length);
      let hit = false;
      for (const cand of stemCandidates(rest)) {
        if (acceptStem(cand, pre, bookSet)) {
          best = stripAffixes(cand, bookSet, depth + 1);
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
  }
  for (const suf of SUFFIXES) {
    if (best.endsWith(suf) && best.length - suf.length >= 3) {
      const rest = best.slice(0, best.length - suf.length);
      let hit = false;
      for (const cand of stemCandidates(rest)) {
        if ((ROOT_GLOSS[cand] && cand.length >= 4) || bookSet.has(cand)) {
          const deeper = stripAffixes(cand, bookSet, depth + 1);
          if (deeper.length < best.length || deeper !== best) best = deeper;
          hit = true;
          break;
        }
      }
      if (hit) break;
    }
  }
  return best;
}

// 从某词的释义提取第一个义项作 rootGloss：“n. 希望; 愿望” → “希望”
function firstSense(meaning: string): string {
  if (!meaning) return '';
  let m = meaning.replace(/^[a-z]{1,4}\.\s*/i, '');
  m = m.split(/[，,；;]/)[0].trim();
  return m.length > 8 ? m.slice(0, 8) : m;
}

// 编辑距离 ≤1
function editDistLe1(a: string, b: string): boolean {
  const la = a.length, lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  if (la === lb) {
    let diff = 0;
    for (let i = 0; i < la; i++) if (a[i] !== b[i]) diff++;
    return diff === 1;
  }
  const s = la < lb ? a : b;
  const l = la < lb ? b : a;
  let i = 0, j = 0, skipped = false;
  while (i < s.length && j < l.length) {
    if (s[i] === l[j]) { i++; j++; }
    else if (!skipped) { skipped = true; j++; }
    else return false;
  }
  return true;
}

// 词库缺字段时，现场补齐 root / rootGloss / relatedWords
// 注意：域聚合后不同词书字段覆盖率不同，必须逐词补齐（不能因个别词有字段而跳过整批）
function runtimeEnrich(words: WordItem[], wordMap: Map<string, WordItem>): void {
  const bookSet = new Set(words.map(w => w.word.toLowerCase()));

  // root：只补缺 root 的词
  for (const w of words) {
    if (w.root) continue;
    const lower = w.word.toLowerCase();
    if (lower !== w.word) continue; // 只处理小写基础词
    const stem = stripAffixes(lower, bookSet, 0);
    if (stem !== lower && stem.length >= 3) {
      w.root = stem;
      if (ROOT_GLOSS[stem]) {
        w.rootGloss = ROOT_GLOSS[stem];
      } else {
        const stemWord = wordMap.get(stem) || words.find(x => x.word.toLowerCase() === stem);
        if (stemWord) w.rootGloss = firstSense(stemWord.meaning || '');
      }
    }
  }

  // relatedWords：按首字母分桶算形近词（每词最多4个，避免列表过长），只补缺失的
  const buckets: Record<string, string[]> = {};
  for (const w of words) {
    const k = w.word[0].toLowerCase();
    if (!buckets[k]) buckets[k] = [];
    buckets[k].push(w.word);
  }
  for (const k of Object.keys(buckets)) {
    const group = [...new Set(buckets[k])].sort();
    for (const a of group) {
      const wi = wordMap.get(a);
      if (!wi || wi.relatedWords || a.length < 3) continue;
      const la = a.toLowerCase();
      const cands: string[] = [];
      for (const b of group) {
        if (a === b) continue;
        if (editDistLe1(la, b.toLowerCase())) {
          cands.push(b);
          if (cands.length >= 4) break;
        }
      }
      if (cands.length) {
        wi.relatedWords = cands.join(',');
      }
    }
  }
}

async function ensureIndex(bookId: string): Promise<BookIndex> {
  const ids = resolveDomain(bookId);
  const key = ids.join(',');
  if (indexCache[key]) return indexCache[key];

  // 逐本加载，单本失败不影响整个域
  const books = await Promise.all(
    ids.map(id => getBookWords(id).catch(() => [] as WordItem[]))
  );

  // 合并：同词保留根字段更全的版本，并记录词 → 收录词书
  const wordMap = new Map<string, WordItem>();
  const wordToBooks: WordToBooks = new Map();
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    for (const w of books[i]) {
      const exist = wordMap.get(w.word);
      if (!exist) {
        wordMap.set(w.word, w);
      } else if (!exist.root && w.root) {
        wordMap.set(w.word, {
          ...exist,
          root: w.root,
          rootGloss: w.rootGloss || exist.rootGloss,
          relatedWords: w.relatedWords || exist.relatedWords
        });
      }
      let list = wordToBooks.get(w.word);
      if (!list) {
        list = [];
        wordToBooks.set(w.word, list);
      }
      if (!list.includes(id)) list.push(id);
    }
  }

  // 种子包补齐：逐词应用（域内每本书的种子都补，不因某本有字段而跳过）
  for (const id of ids) {
    const seeds = familySeeds[id];
    if (!seeds) continue;
    for (const seed of seeds) {
      const item = wordMap.get(seed[0]);
      if (!item) continue;
      if (seed[1] && !item.root) item.root = seed[1];
      if (seed[2] && !item.rootGloss) item.rootGloss = seed[2];
      if (seed[3] && !item.relatedWords) item.relatedWords = seed[3];
    }
  }

  const wordsAll = [...wordMap.values()];

  // 仍缺字段的现场计算
  runtimeEnrich(wordsAll, wordMap);

  const rootMap = new Map<string, WordItem[]>();
  for (const w of wordsAll) {
    if (!w.root) continue;
    const list = rootMap.get(w.root) || [];
    list.push(w);
    rootMap.set(w.root, list);
  }

  const idx: BookIndex = { wordMap, rootMap, wordToBooks };
  indexCache[key] = idx;
  return idx;
}

// 词族查询结果
export interface FamilyResult {
  center: WordItem | null;
  root: string;
  rootGloss: string;
  family: WordItem[];
  similar: WordItem[];
  inMainBook: boolean; // 中心词是否收录于用户主词书（域漫游可能跨册，需标注）
}

// 查询某词的词族信息（词书 = 用户当前词书的漫游域）
export async function getFamily(word: string, bookId?: string): Promise<FamilyResult> {
  const bid = bookId || getCurrentBookId();
  const idx = await ensureIndex(bid);
  const center = idx.wordMap.get(word) || null;

  if (!center) {
    return { center: null, root: '', rootGloss: '', family: [], similar: [], inMainBook: false };
  }

  const root = center.root || '';
  const rootGloss = center.rootGloss || '';

  let family: WordItem[] = [];
  if (root) {
    family = (idx.rootMap.get(root) || [])
      .filter(w => w.word !== word)
      .sort((a, b) =>
        (b.isHighFreq ? 1 : 0) - (a.isHighFreq ? 1 : 0) || a.word.length - b.word.length
      )
      .slice(0, 12);
  }

  let similar: WordItem[] = [];
  if (center.relatedWords) {
    similar = (center.relatedWords as string)
      .split(',')
      .map(s => idx.wordMap.get(s.trim()) || ({ word: s.trim() } as WordItem))
      .filter(w => w.word && w.word !== word)
      .slice(0, 12);
  }

  const wordBooks = idx.wordToBooks.get(word) || [];
  const inMainBook = wordBooks.includes(bid);

  return { center, root, rootGloss, family, similar, inMainBook };
}

// 随机挑一个「有词族」的高频词（星系首页漫游入口）
// 注意候选池过小会导致连续漫游重复：优先「词族≥3 且高频」，
// 若不足 20 个则放宽到「词族≥2」补齐，保证随机性
export async function randomFamilyWord(bookId?: string): Promise<string | null> {
  const bid = bookId || getCurrentBookId();
  const idx = await ensureIndex(bid);

  const pool: string[] = [];
  const seen = new Set<string>();

  // 第一优先：词族 ≥3 且高频（观赏性好：环绕节点多）
  for (const [, members] of idx.rootMap) {
    if (members.length >= 3) {
      for (const m of members) {
        if (m.isHighFreq && !seen.has(m.word)) {
          seen.add(m.word);
          pool.push(m.word);
        }
      }
    }
  }

  // 池子太小：放宽到全部「词族 ≥2」的词
  if (pool.length < 20) {
    for (const [, members] of idx.rootMap) {
      if (members.length >= 2) {
        for (const m of members) {
          if (!seen.has(m.word)) {
            seen.add(m.word);
            pool.push(m.word);
          }
        }
      }
    }
  }

  if (!pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}
