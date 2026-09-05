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
  rootGloss?: string;     // 词根中文释义
  lemma?: string;         // 原型词（派生词的词干）
  synonyms?: string;      // 同义词（逗号分隔）
  antonyms?: string;      // 反义词（逗号分隔）
  relatedWords?: string;  // 形近词（逗号分隔）
  frequency?: number;     // 词频
  star?: number;          // 词频星级 0~5
  posTag?: 'func' | 'content'; // 词性分类：func=虚词（介/连/代/冠/助等）content=实词
}

export interface WordBook {
  id: string;
  name: string;
  desc: string;
  level: string;
  words: WordItem[];
}

// 学习模式：全部 / 高频词 / 虚词 / 实词
export type StudyMode = 'all' | 'highFreq' | 'func' | 'content';
