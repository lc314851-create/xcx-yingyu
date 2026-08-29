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
    words: ['built', 'day']
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
    words: ['life', 'riding', 'bicycle', 'keep', 'balance', 'moving']
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
  },
  {
    en: 'Practice what you preach.',
    zh: '言行一致，身体力行。',
    words: ["practice", "preach"]
  },
  {
    en: 'Two heads are better than one.',
    zh: '三个臭皮匠，顶个诸葛亮。',
    words: ["head", "better"]
  },
  {
    en: 'When in Rome, do as the Romans do.',
    zh: '入乡随俗。',
    words: ["rome", "roman"]
  },
  {
    en: 'The grass is always greener on the other side.',
    zh: '这山望着那山高。',
    words: ["grass", "green", "side"]
  },
  {
    en: 'A friend in need is a friend indeed.',
    zh: '患难见真情。',
    words: ["friend", "need", "indeed"]
  },
  {
    en: 'Strike while the iron is hot.',
    zh: '趁热打铁。',
    words: ["strike", "iron", "hot"]
  },
  {
    en: 'Do not put all your eggs in one basket.',
    zh: '不要把鸡蛋放在同一个篮子里。',
    words: ["egg", "basket"]
  },
  {
    en: 'Time flies when you are having fun.',
    zh: '欢乐时光过得快。',
    words: ["time", "flies", "fun"]
  },
  {
    en: 'Haste makes waste.',
    zh: '欲速则不达。',
    words: ["haste", "waste"]
  },
  {
    en: 'It never rains but it pours.',
    zh: '不鸣则已，一鸣惊人。（祸不单行）',
    words: ["rain", "pour"]
  },
  {
    en: 'Kill two birds with one stone.',
    zh: '一箭双雕。',
    words: ["bird", "stone"]
  },
  {
    en: 'Love me, love my dog.',
    zh: '爱屋及乌。',
    words: ["love", "dog"]
  },
  {
    en: 'Many hands make light work.',
    zh: '人多好办事。',
    words: ["hand", "light", "work"]
  },
  {
    en: 'Out of sight, out of mind.',
    zh: '眼不见，心不烦。',
    words: ["sight", "mind"]
  },
  {
    en: 'The pen is mightier than the sword.',
    zh: '笔耕强于剑伐。',
    words: ["pen", "mightier", "sword"]
  },
  {
    en: 'Time is money.',
    zh: '一寸光阴一寸金。',
    words: ["time", "money"]
  },
  {
    en: 'You cannot judge a book by its cover.',
    zh: '人不可貌相。',
    words: ["judge", "book", "cover"]
  },
  {
    en: 'A picture is worth a thousand words.',
    zh: '一图胜千言。',
    words: ["picture", "worth", "thousand"]
  },
  {
    en: 'All roads lead to Rome.',
    zh: '条条大路通罗马。',
    words: ["road", "lead", "rome"]
  },
  {
    en: 'An apple a day keeps the doctor away.',
    zh: '一天一苹果，医生远离我。',
    words: ["apple", "doctor", "away"]
  },
  {
    en: 'Beauty is in the eye of the beholder.',
    zh: '情人眼里出西施。',
    words: ["beauty", "eye", "beholder"]
  },
  {
    en: 'Curiosity killed the cat.',
    zh: '好奇害死猫。',
    words: ["curiosity", "kill", "cat"]
  },
  {
    en: 'Do not count your chickens before they hatch.',
    zh: '小鸡孵出前，别急着数。',
    words: ["count", "chickens", "hatch"]
  },
  {
    en: 'Easy come, easy go.',
    zh: '来得容易，去得也快。',
    words: ["easy", "come", "go"]
  },
  {
    en: 'Every dog has its day.',
    zh: '人人皆有得意时。',
    words: ["dog", "day"]
  },
  {
    en: 'Fortune favors the bold.',
    zh: '好运眷顾勇者。',
    author: 'Virgil',
    words: ["fortune", "favor", "bold"]
  },
  {
    en: 'Great minds think alike.',
    zh: '英雄所见略同。',
    words: ["great", "mind", "think", "alike"]
  },
  {
    en: 'If at first you do not succeed, try, try again.',
    zh: '如果初次不成功，再接再厉。',
    words: ["succeed", "try", "again"]
  },
  {
    en: 'Laughter is the best medicine.',
    zh: '笑是最好的良药。',
    words: ["laughter", "best", "medicine"]
  },
  {
    en: 'To be, or not to be, that is the question.',
    zh: '生存还是毁灭，这是一个问题。',
    author: 'Shakespeare',
    words: ["question"]
  },
  {
    en: 'I think, therefore I am.',
    zh: '我思故我在。',
    author: 'Descartes',
    words: ["think", "therefore"]
  },
  {
    en: 'That which does not kill us makes us stronger.',
    zh: '那些杀不死我们的，使我们更强大。',
    author: 'Nietzsche',
    words: ["kill", "strong"]
  },
  {
    en: 'In the middle of difficulty lies opportunity.',
    zh: '困难之中蕴藏机遇。',
    author: 'Albert Einstein',
    words: ["difficulty", "lie", "opportunity"]
  },
  {
    en: 'The only limit to our realization of tomorrow will be our doubts of today.',
    zh: '实现明天理想的唯一障碍，是今天的疑虑。',
    author: 'Franklin Roosevelt',
    words: ["limit", "realization", "doubt", "today"]
  },
  {
    en: 'We make a living by what we get, but we make a life by what we give.',
    zh: '我们靠所得谋生，靠给予生活。',
    author: 'Winston Churchill',
    words: ["living", "get", "give"]
  },
  {
    en: 'Be the change that you wish to see in the world.',
    zh: '欲变世界，先变其身。',
    author: 'Mahatma Gandhi',
    words: ["change", "wish", "world"]
  },
  {
    en: 'Live as if you were to die tomorrow. Learn as if you were to live forever.',
    zh: '像明天就要死去那样生活，像永远不会死去那样学习。',
    author: 'Mahatma Gandhi',
    words: ["live", "die", "learn", "forever"]
  },
  {
    en: 'It does not matter how slowly you go as long as you do not stop.',
    zh: '不怕慢，只怕停。',
    author: 'Confucius',
    words: ["matter", "slowly", "stop"]
  },
  {
    en: 'Our greatest glory is not in never falling, but in rising every time we fall.',
    zh: '最伟大的光荣不在于从不跌倒，而在于每次跌倒后都能爬起。',
    author: 'Confucius',
    words: ["glory", "falling", "rising", "fall"]
  },
  {
    en: 'The man who moves a mountain begins by carrying away small stones.',
    zh: '移山之人，始于搬运小块石头。',
    author: 'Confucius',
    words: ["move", "mountain", "carry", "stone"]
  },
  {
    en: 'I have not failed. I have just found ten thousand ways that will not work.',
    zh: '我没有失败，只是发现了一万种行不通的方法。',
    author: 'Thomas Edison',
    words: ["fail", "found", "thousand"]
  },
  {
    en: 'Tell me and I forget. Teach me and I remember. Involve me and I learn.',
    zh: '告诉我，我会忘记；教给我，我会记住；让我参与，我才能学会。',
    author: 'Benjamin Franklin',
    words: ["forget", "teach", "remember", "involve", "learn"]
  },
  {
    en: 'Twenty years from now you will be more disappointed by the things you did not do than by the ones you did.',
    zh: '二十年后，让你更遗憾的不是做过的事，而是没做的事。',
    author: 'Mark Twain',
    words: ["twenty", "disappointed", "thing"]
  },
  {
    en: 'The secret of getting ahead is getting started.',
    zh: '取得领先的秘诀，就是开始行动。',
    author: 'Mark Twain',
    words: ["secret", "ahead", "start"]
  },
  {
    en: 'Dreams do not work unless you do.',
    zh: '不行动，梦想就是空想。',
    author: 'John C. Maxwell',
    words: ["dream", "work"]
  },
  {
    en: 'It always seems impossible until it is done.',
    zh: '事情总是在完成之前显得不可能。',
    author: 'Nelson Mandela',
    words: ["seem", "impossible", "done"]
  },
  {
    en: 'A reader lives a thousand lives before he dies. The man who never reads lives only one.',
    zh: '读书人经历千种人生，不读书的人只活一次。',
    author: 'George R.R. Martin',
    words: ["reader", "thousand", "die", "read"]
  },
  {
    en: 'You are never too old to set another goal or to dream a new dream.',
    zh: '设定新目标、追逐新梦想，永远都不晚。',
    author: 'C.S. Lewis',
    words: ["old", "goal", "dream"]
  },
  {
    en: 'The best time to plant a tree was twenty years ago. The second best time is now.',
    zh: '种一棵树最好的时间是二十年前，其次是现在。',
    words: ["plant", "tree", "best", "ago", "now"]
  },
  {
    en: 'Fall seven times, stand up eight.',
    zh: '跌倒七次，站起来八次。',
    words: ["fall", "seven", "stand"]
  },
  {
    en: 'Stars cannot shine without darkness.',
    zh: '没有黑暗，星辰无法闪耀。',
    words: ["star", "shine", "darkness"]
  },
  {
    en: 'Little by little, one travels far.',
    zh: '积跬步，致千里。',
    author: 'J.R.R. Tolkien',
    words: ["little", "travel", "far"]
  },
  {
    en: 'Nothing is impossible, the word itself says "I am possible"!',
    zh: '没有什么不可能，"不可能"这个词本身就藏着"我是可能的"！',
    author: 'Audrey Hepburn',
    words: ["impossible", "word", "possible"]
  },
  {
    en: 'Keep your face always toward the sunshine, and shadows will fall behind you.',
    zh: '永远面向阳光，阴影就会落在身后。',
    author: 'Walt Whitman',
    words: ["face", "toward", "sunshine", "shadow"]
  },
  {
    en: 'What we know is a drop, what we do not know is an ocean.',
    zh: '已知是一滴水，未知是汪洋大海。',
    author: 'Isaac Newton',
    words: ["know", "drop", "ocean"]
  },
  {
    en: 'Doubt kills more dreams than failure ever will.',
    zh: '比起失败，怀疑扼杀了更多梦想。',
    words: ["doubt", "kill", "dream", "failure"]
  },
  {
    en: 'Do not watch the clock. Do what it does. Keep going.',
    zh: '别盯着时钟看，学它一直走。',
    author: 'Sam Levenson',
    words: ["clock", "keep", "going"]
  },
  {
    en: 'Perseverance is not a long race; it is many short races one after the other.',
    zh: '坚持不是一场长跑，而是一场接一场的短跑。',
    author: 'Walter Elliot',
    words: ["perseverance", "race", "short"]
  },
  {
    en: 'Great things are done by a series of small things brought together.',
    zh: '伟大的成就，源于一系列小事的汇聚。',
    author: 'Vincent Van Gogh',
    words: ["series", "small", "together"]
  },
  {
    en: 'Simplicity is the ultimate sophistication.',
    zh: '大道至简。',
    author: 'Leonardo da Vinci',
    words: ["simplicity", "ultimate", "sophistication"]
  },
  {
    en: 'Learning never exhausts the mind.',
    zh: '学习永远不会让大脑疲惫。',
    author: 'Leonardo da Vinci',
    words: ["learning", "exhaust", "mind"]
  },
  {
    en: 'The more that you read, the more things you will know.',
    zh: '读得越多，知道得越多。',
    author: 'Dr. Seuss',
    words: ["read", "more", "know"]
  },
  {
    en: 'Play is the highest form of research.',
    zh: '玩耍是最高形式的研究。',
    author: 'Albert Einstein',
    words: ["play", "highest", "form", "research"]
  },
  {
    en: 'Once you learn to read, you will be forever free.',
    zh: '一旦学会阅读，你将永远自由。',
    author: 'Frederick Douglass',
    words: ["learn", "read", "forever", "free"]
  },
  {
    en: 'Words are, in my not-so-humble opinion, our most inexhaustible source of magic.',
    zh: '依我之见，词语是我们最取之不尽的魔力源泉。',
    author: 'J.K. Rowling',
    words: ["word", "humble", "opinion", "source", "magic"]
  },
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
