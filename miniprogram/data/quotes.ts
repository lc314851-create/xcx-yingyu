// data/quotes.ts - 每日金句 / 英语谚语
// 内置一批经典英语谚语和名言，中英对照，标注核心生词

export interface Quote {
  en: string;          // 英文原文
  zh: string;          // 中文翻译
  author?: string;     // 作者（可选）
  words: string[];     // 核心生词列表
}

export const quotes: Quote[] = [
  {
    en: 'Practice makes perfect.',
    zh: '熟能生巧。',
    words: ['practice', 'perfect']
  },
  {
    en: 'Where there is a will, there is a way.',
    zh: '有志者事竟成。',
    words: ['will', 'way']
  },
  {
    en: 'No pain, no gain.',
    zh: '没有付出就没有收获。',
    words: ['pain', 'gain']
  },
  {
    en: 'The early bird catches the worm.',
    zh: '早起的鸟儿有虫吃。',
    words: ['early', 'catch', 'worm']
  },
  {
    en: 'Actions speak louder than words.',
    zh: '行动胜于言辞。',
    words: ['action', 'speak', 'loud']
  },
  {
    en: 'Knowledge is power.',
    zh: '知识就是力量。',
    author: 'Francis Bacon',
    words: ['knowledge', 'power']
  },
  {
    en: 'Failure is the mother of success.',
    zh: '失败是成功之母。',
    words: ['failure', 'success', 'mother']
  },
  {
    en: 'Rome was not built in a day.',
    zh: '罗马不是一天建成的。（伟业非一日之功）',
    words: ['build', 'day']
  },
  {
    en: 'A journey of a thousand miles begins with a single step.',
    zh: '千里之行，始于足下。',
    words: ['journey', 'thousand', 'mile', 'begin', 'step']
  },
  {
    en: 'Better late than never.',
    zh: '迟做总比不做好。',
    words: ['late', 'never']
  },
  {
    en: 'Every cloud has a silver lining.',
    zh: '每朵乌云都有银边。（黑暗中总有一丝光明）',
    words: ['cloud', 'silver', 'lining']
  },
  {
    en: 'The only way to do great work is to love what you do.',
    zh: '成就伟大事业的唯一方法，就是热爱你所做的事。',
    author: 'Steve Jobs',
    words: ['great', 'work', 'love']
  },
  {
    en: 'Stay hungry, stay foolish.',
    zh: '求知若饥，虚心若愚。',
    author: 'Steve Jobs',
    words: ['hungry', 'foolish']
  },
  {
    en: 'The future belongs to those who believe in the beauty of their dreams.',
    zh: '未来属于那些相信梦想之美的人。',
    author: 'Eleanor Roosevelt',
    words: ['future', 'belong', 'believe', 'beauty', 'dream']
  },
  {
    en: 'Genius is one percent inspiration and ninety-nine percent perspiration.',
    zh: '天才是百分之一的灵感加上百分之九十九的汗水。',
    author: 'Thomas Edison',
    words: ['genius', 'percent', 'inspiration', 'perspiration']
  },
  {
    en: 'If you want to go fast, go alone. If you want to go far, go together.',
    zh: '想走得快，就独自走；想走得远，就一起走。',
    words: ['fast', 'alone', 'far', 'together']
  },
  {
    en: 'Education is the most powerful weapon which you can use to change the world.',
    zh: '教育是你能用来改变世界的最有力的武器。',
    author: 'Nelson Mandela',
    words: ['education', 'powerful', 'weapon', 'use', 'change', 'world']
  },
  {
    en: 'Success is not final, failure is not fatal: it is the courage to continue that counts.',
    zh: '成功不是终点，失败也非末日；重要的是继续前行的勇气。',
    author: 'Winston Churchill',
    words: ['success', 'final', 'failure', 'fatal', 'courage', 'continue', 'count']
  },
  {
    en: 'The best time to plant a tree was 20 years ago. The second best time is now.',
    zh: '种一棵树最好的时间是二十年前，其次是现在。',
    words: ['best', 'time', 'plant', 'tree', 'ago', 'second', 'now']
  },
  {
    en: 'Life is like riding a bicycle. To keep your balance, you must keep moving.',
    zh: '生活就像骑自行车。要保持平衡，就必须不断前进。',
    author: 'Albert Einstein',
    words: ['life', 'ride', 'bicycle', 'keep', 'balance', 'move']
  },
  {
    en: 'Nothing is impossible to a willing heart.',
    zh: '心之所愿，无所不成。',
    words: ['nothing', 'impossible', 'willing', 'heart']
  },
  {
    en: 'A smooth sea never made a skilled sailor.',
    zh: '平静的海洋造就不了熟练的水手。',
    words: ['smooth', 'sea', 'skilled', 'sailor']
  },
  {
    en: 'Do not go where the path may lead, go instead where there is no path and leave a trail.',
    zh: '不要走别人走过的路，去没有路的地方，留下自己的足迹。',
    author: 'Ralph Waldo Emerson',
    words: ['path', 'lead', 'instead', 'leave', 'trail']
  },
  {
    en: 'Whether you think you can or you think you can\'t, you\'re right.',
    zh: '无论你认为你行还是不行，你都是对的。',
    author: 'Henry Ford',
    words: ['whether', 'think', 'right']
  },
  {
    en: 'The man who moves mountains begins by carrying small stones.',
    zh: '移山之人始于搬走小石。',
    words: ['move', 'mountain', 'begin', 'carry', 'small', 'stone']
  },
  {
    en: 'Do what you can, with what you have, where you are.',
    zh: '用你拥有的，在你所在的地方，做你能做的。',
    author: 'Theodore Roosevelt',
    words: ['what', 'can', 'have', 'where']
  },
  {
    en: 'An investment in knowledge pays the best interest.',
    zh: '对知识的投资回报最丰厚。',
    author: 'Benjamin Franklin',
    words: ['investment', 'knowledge', 'pay', 'interest']
  },
  {
    en: 'Quality is not an act, it is a habit.',
    zh: '品质不是一种行为，而是一种习惯。',
    author: 'Aristotle',
    words: ['quality', 'act', 'habit']
  },
  {
    en: 'The journey of a thousand miles begins with one step.',
    zh: '千里之行，始于足下。',
    words: ['journey', 'thousand', 'mile', 'begin', 'step']
  },
  {
    en: 'Believe you can and you are halfway there.',
    zh: '相信你能，你就已经成功了一半。',
    author: 'Theodore Roosevelt',
    words: ['believe', 'halfway']
  }
];

// 根据日期获取今日金句（按天轮换，同一天返回同一条）
export function getDailyQuote(): Quote {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  return quotes[dayOfYear % quotes.length];
}
