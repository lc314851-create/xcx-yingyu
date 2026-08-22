// data/types.ts
// 词库数据类型定义

export interface WordItem {
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  isHighFreq?: boolean; // 是否高频词
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
