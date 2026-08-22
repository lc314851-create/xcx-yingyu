// data/index.ts - 词库索引：汇总所有词书
// 注意：各词书文件只包含自己的独立词汇，层级关系在这里组装，避免模块循环依赖
import { WordBook } from './types';
import { juniorWords } from './junior';
import { seniorWords } from './senior';
import { cet4Words } from './cet4';
import { cet6Words } from './cet6';
import { postgradWords } from './postgrad';

export { WordItem, WordBook } from './types';

// 词书列表（用于词书选择页面）
export const wordBooks: WordBook[] = [
  {
    id: 'junior',
    name: '初中词汇',
    desc: '初中大纲词汇，适合初中阶段',
    level: '初中',
    words: juniorWords
  },
  {
    id: 'senior',
    name: '高中词汇',
    desc: '高中大纲词汇，包含初中全部 + 高中扩展',
    level: '高中',
    words: [...juniorWords, ...seniorWords]
  },
  {
    id: 'cet4',
    name: '四级词汇',
    desc: '大学四级词汇，包含高中全部 + 四级扩展',
    level: '四级',
    words: [...juniorWords, ...seniorWords, ...cet4Words]
  },
  {
    id: 'cet6',
    name: '六级词汇',
    desc: '大学六级词汇，包含四级全部 + 六级扩展',
    level: '六级',
    words: [...juniorWords, ...seniorWords, ...cet4Words, ...cet6Words]
  },
  {
    id: 'postgrad',
    name: '考研词汇',
    desc: '考研大纲词汇，包含六级全部 + 考研扩展',
    level: '考研',
    words: [...juniorWords, ...seniorWords, ...cet4Words, ...cet6Words, ...postgradWords]
  }
];

// 按 id 获取词书
export function getBookById(id: string): WordBook | undefined {
  return wordBooks.find((b) => b.id === id);
}
