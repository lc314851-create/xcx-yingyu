// utils/familyService.ts
// 词根星系数据服务：同根词族聚合 + 形近词关联
// 依赖单词增强字段 root / rootGloss / relatedWords / lemma（enrich 管线生成）

import { WordItem } from '../data/types';
import { getBookWords } from './wordService';
import { getCurrentBookId } from './store';

// 每词书的索引缓存（避免每次进页重建）
interface BookIndex {
  wordMap: Map<string, WordItem>;
  rootMap: Map<string, WordItem[]>; // root → 所属词（含rootGloss相同）
}

const indexCache: Record<string, BookIndex> = {};

async function ensureIndex(bookId: string): Promise<BookIndex> {
  if (indexCache[bookId]) return indexCache[bookId];

  const words = await getBookWords(bookId);
  const wordMap = new Map<string, WordItem>();
  const rootMap = new Map<string, WordItem[]>();

  for (const w of words) {
    wordMap.set(w.word, w);
  }
  for (const w of words) {
    if (!w.root) continue;
    const list = rootMap.get(w.root) || [];
    list.push(w);
    rootMap.set(w.root, list);
  }

  const idx: BookIndex = { wordMap, rootMap };
  indexCache[bookId] = idx;
  return idx;
}

// 词族查询结果
export interface FamilyResult {
  center: WordItem | null;
  root: string;
  rootGloss: string;
  family: WordItem[];   // 同根词（不含自身）
  similar: WordItem[];  // 形近词（不含自身）
}

// 查询某词的词族信息（词书 = 用户当前词书）
export async function getFamily(word: string, bookId?: string): Promise<FamilyResult> {
  const bid = bookId || getCurrentBookId();
  const idx = await ensureIndex(bid);
  const center = idx.wordMap.get(word) || null;

  if (!center) {
    return { center: null, root: '', rootGloss: '', family: [], similar: [] };
  }

  const root = center.root || '';
  const rootGloss = center.rootGloss || '';

  let family: WordItem[] = [];
  if (root) {
    family = (idx.rootMap.get(root) || [])
      .filter(w => w.word !== word)
      // 高星级优先，其次短词优先
      .sort((a, b) => (b.star || 0) - (a.star || 0) || a.word.length - b.word.length)
      .slice(0, 12);
  }

  let similar: WordItem[] = [];
  if (center.relatedWords) {
    similar = center.relatedWords
      .split(',')
      .map(s => idx.wordMap.get(s.trim()) || ({ word: s.trim() } as WordItem))
      .filter(w => w.word && w.word !== word)
      .slice(0, 12);
  }

  return { center, root, rootGloss, family, similar };
}

// 随机挑一个「有词族」的高频词（星系首页漫游入口）
export async function randomFamilyWord(bookId?: string): Promise<string | null> {
  const bid = bookId || getCurrentBookId();
  const idx = await ensureIndex(bid);

  const candidates: string[] = [];
  for (const [, members] of idx.rootMap) {
    if (members.length >= 3) {
      for (const m of members) {
        if (m.isHighFreq) candidates.push(m.word);
      }
    }
  }
  if (!candidates.length) {
    for (const [, members] of idx.rootMap) {
      if (members.length >= 2) candidates.push(members[0].word);
    }
  }
  if (!candidates.length) return null;
  return candidates[Math.floor(Math.random() * candidates.length)];
}
