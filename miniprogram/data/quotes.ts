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

// ─── 填空练习数据 ──────────────────────────────────────────
export interface FillBlankItem {
  en: string;          // 英文句子（含 ___ 占位符）
  zh: string;          // 中文翻译
  author?: string;     // 作者
  answer: string;      // 正确答案
  options: string[];   // 四选一选项（含正确答案，打乱后使用）
  authorInfo?: string; // 作者背景
}

export const fillBlankData: FillBlankItem[] = [
  {
    en: 'Practice makes ___.',
    zh: '熟能生巧。',
    answer: 'perfect',
    options: ['perfect', 'better', 'easy', 'fast'],
    authorInfo: '英语谚语，强调反复练习的重要性'
  },
  {
    en: 'Where there is a ___, there is a way.',
    zh: '有志者事竟成。',
    answer: 'will',
    options: ['will', 'hope', 'dream', 'wish'],
    authorInfo: '英语谚语，意为有决心就有办法'
  },
  {
    en: 'Actions speak louder than ___.',
    zh: '行动胜于言辞。',
    answer: 'words',
    options: ['words', 'voices', 'sounds', 'talks'],
    authorInfo: '英语谚语，强调行动比言语更有力'
  },
  {
    en: 'Knowledge is ___.',
    zh: '知识就是力量。',
    author: 'Francis Bacon',
    answer: 'power',
    options: ['power', 'wealth', 'money', 'fame'],
    authorInfo: '弗朗西斯·培根（1561-1626），英国哲学家、科学家'
  },
  {
    en: 'Failure is the ___ of success.',
    zh: '失败是成功之母。',
    answer: 'mother',
    options: ['mother', 'father', 'origin', 'start'],
    authorInfo: '英语谚语，意为从失败中汲取教训才能成功'
  },
  {
    en: 'Rome was not built in a ___.',
    zh: '罗马不是一天建成的。',
    answer: 'day',
    options: ['day', 'year', 'month', 'week'],
    authorInfo: '英语谚语，意为伟大成就需要时间积累'
  },
  {
    en: 'The early bird catches the ___.',
    zh: '早起的鸟儿有虫吃。',
    answer: 'worm',
    options: ['worm', 'food', 'seed', 'fly'],
    authorInfo: '英语谚语，强调早行动有优势'
  },
  {
    en: 'Stay hungry, stay ___.',
    zh: '求知若饥，虚心若愚。',
    author: 'Steve Jobs',
    answer: 'foolish',
    options: ['foolish', 'curious', 'brave', 'calm'],
    authorInfo: '史蒂夫·乔布斯（1955-2011），苹果公司创始人，2005年斯坦福毕业典礼演讲'
  },
  {
    en: 'Genius is one percent inspiration and ninety-nine percent ___.',
    zh: '天才是百分之一的灵感加上百分之九十九的汗水。',
    author: 'Thomas Edison',
    answer: 'perspiration',
    options: ['perspiration', 'practice', 'patience', 'effort'],
    authorInfo: '托马斯·爱迪生（1847-1931），美国发明家，拥有千余项专利'
  },
  {
    en: 'The future belongs to those who believe in the beauty of their ___.',
    zh: '未来属于那些相信梦想之美的人。',
    author: 'Eleanor Roosevelt',
    answer: 'dreams',
    options: ['dreams', 'hopes', 'plans', 'minds'],
    authorInfo: '埃莉诺·罗斯福（1884-1962），美国前第一夫人、人道主义者'
  },
  {
    en: 'Education is the most powerful ___ which you can use to change the world.',
    zh: '教育是你能用来改变世界的最有力的武器。',
    author: 'Nelson Mandela',
    answer: 'weapon',
    options: ['weapon', 'tool', 'method', 'skill'],
    authorInfo: '纳尔逊·曼德拉（1918-2013），南非前总统、反种族隔离运动领袖'
  },
  {
    en: 'Quality is not an act, it is a ___.',
    zh: '品质不是一种行为，而是一种习惯。',
    author: 'Aristotle',
    answer: 'habit',
    options: ['habit', 'skill', 'gift', 'rule'],
    authorInfo: '亚里士多德（前384-前322），古希腊哲学家'
  },
  {
    en: 'No pain, no ___.',
    zh: '没有付出就没有收获。',
    answer: 'gain',
    options: ['gain', 'result', 'prize', 'award'],
    authorInfo: '英语谚语，意为不劳无获'
  },
  {
    en: 'A journey of a thousand miles begins with a single ___.',
    zh: '千里之行，始于足下。',
    answer: 'step',
    options: ['step', 'move', 'walk', 'start'],
    authorInfo: '出自《道德经》，英语常用谚语'
  },
  {
    en: 'Better late than ___.',
    zh: '迟做总比不做好。',
    answer: 'never',
    options: ['never', 'ever', 'always', 'none'],
    authorInfo: '英语谚语，强调及时行动的重要性'
  }
];

// 随机获取一条填空练习（避开上一条的 index）
export function getRandomFillBlank(lastIndex: number = -1): { item: FillBlankItem; index: number } {
  let index = Math.floor(Math.random() * fillBlankData.length);
  if (fillBlankData.length > 1) {
    while (index === lastIndex) {
      index = Math.floor(Math.random() * fillBlankData.length);
    }
  }
  return { item: fillBlankData[index], index };
}
