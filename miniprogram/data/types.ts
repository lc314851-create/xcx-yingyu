// data/types.ts
// 词库数据类型定义

export interface WordItem {
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  isHighFreq?: boolean; // 是否高频词
  // ─── ECDICT 扩展字段（可选） ───────────
  root?: string;          // 词根
  synonyms?: string;      // 同义词（逗号分隔）
  antonyms?: string;      // 反义词（逗号分隔）
  relatedWords?: string;  // 形近词（逗号分隔）
  frequency?: number;     // 词频
  star?: number;          // 词频星级 0~5
}

export interface WordBook {
  id: string;
  name: string;
  desc: string;
  level: string;
  words: WordItem[];
}

// 学习模式
export type StudyMode = 'highFreq' | 'all';
