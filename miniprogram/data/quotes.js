"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fillBlankData = exports.quotes = void 0;
exports.getDailyQuote = getDailyQuote;
exports.getRandomFillBlank = getRandomFillBlank;
exports.quotes = [
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
function getDailyQuote() {
    const now = new Date();
    const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
    return exports.quotes[dayOfYear % exports.quotes.length];
}
exports.fillBlankData = [
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
function getRandomFillBlank(lastIndex = -1) {
    let index = Math.floor(Math.random() * exports.fillBlankData.length);
    if (exports.fillBlankData.length > 1) {
        while (index === lastIndex) {
            index = Math.floor(Math.random() * exports.fillBlankData.length);
        }
    }
    return { item: exports.fillBlankData[index], index };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVvdGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsicXVvdGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQXdoQkEsc0NBSUM7QUErSEQsZ0RBUUM7QUF6cEJZLFFBQUEsTUFBTSxHQUFZO0lBQzdCO1FBQ0UsRUFBRSxFQUFFLHlCQUF5QjtRQUM3QixFQUFFLEVBQUUsT0FBTztRQUNYLEtBQUssRUFBRSxDQUFDLFVBQVUsRUFBRSxTQUFTLENBQUM7S0FDL0I7SUFDRDtRQUNFLEVBQUUsRUFBRSx3Q0FBd0M7UUFDNUMsRUFBRSxFQUFFLFNBQVM7UUFDYixLQUFLLEVBQUUsQ0FBQyxNQUFNLEVBQUUsS0FBSyxDQUFDO0tBQ3ZCO0lBQ0Q7UUFDRSxFQUFFLEVBQUUsbUJBQW1CO1FBQ3ZCLEVBQUUsRUFBRSxZQUFZO1FBQ2hCLEtBQUssRUFBRSxDQUFDLE1BQU0sRUFBRSxNQUFNLENBQUM7S0FDeEI7SUFDRDtRQUNFLEVBQUUsRUFBRSxrQ0FBa0M7UUFDdEMsRUFBRSxFQUFFLFdBQVc7UUFDZixLQUFLLEVBQUUsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLE1BQU0sQ0FBQztLQUNsQztJQUNEO1FBQ0UsRUFBRSxFQUFFLGtDQUFrQztRQUN0QyxFQUFFLEVBQUUsU0FBUztRQUNiLEtBQUssRUFBRSxDQUFDLFFBQVEsRUFBRSxPQUFPLEVBQUUsTUFBTSxDQUFDO0tBQ25DO0lBQ0Q7UUFDRSxFQUFFLEVBQUUscUJBQXFCO1FBQ3pCLEVBQUUsRUFBRSxTQUFTO1FBQ2IsTUFBTSxFQUFFLGVBQWU7UUFDdkIsS0FBSyxFQUFFLENBQUMsV0FBVyxFQUFFLE9BQU8sQ0FBQztLQUM5QjtJQUNEO1FBQ0UsRUFBRSxFQUFFLG1DQUFtQztRQUN2QyxFQUFFLEVBQUUsVUFBVTtRQUNkLEtBQUssRUFBRSxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsUUFBUSxDQUFDO0tBQ3hDO0lBQ0Q7UUFDRSxFQUFFLEVBQUUsOEJBQThCO1FBQ2xDLEVBQUUsRUFBRSxx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QUMsQ0FBQztJQUM3RCxJQUFJLHFCQUFhLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQzdCLE9BQU8sS0FBSyxLQUFLLFNBQVMsRUFBRSxDQUFDO1lBQzNCLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsR0FBRyxxQkFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzNELENBQUM7SUFDSCxDQUFDO0lBQ0QsT0FBTyxFQUFFLElBQUksRUFBRSxxQkFBYSxDQUFDLEtBQUssQ0FBQyxFQUFFLEtBQUssRUFBRSxDQUFDO0FBQy9DLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBkYXRhL3F1b3Rlcy50cyAtIOavj+aXpemHkeWPpSAvIOiLseivreiwmuivrVxuLy8g5YaF572u5LiA5om557uP5YW46Iux6K+t6LCa6K+t5ZKM5ZCN6KiA77yM5Lit6Iux5a+554Wn77yM5qCH5rOo5qC45b+D55Sf6K+NXG5cbmV4cG9ydCBpbnRlcmZhY2UgUXVvdGUge1xuICBlbjogc3RyaW5nOyAgICAgICAgICAvLyDoi7Hmlofljp/mlodcbiAgemg6IHN0cmluZzsgICAgICAgICAgLy8g5Lit5paH57+76K+RXG4gIGF1dGhvcj86IHN0cmluZzsgICAgIC8vIOS9nOiAhe+8iOWPr+mAie+8iVxuICB3b3Jkczogc3RyaW5nW107ICAgICAvLyDmoLjlv4PnlJ/or43liJfooahcbn1cblxuZXhwb3J0IGNvbnN0IHF1b3RlczogUXVvdGVbXSA9IFtcbiAge1xuICAgIGVuOiAnUHJhY3RpY2UgbWFrZXMgcGVyZmVjdC4nLFxuICAgIHpoOiAn54af6IO955Sf5ben44CCJyxcbiAgICB3b3JkczogWydwcmFjdGljZScsICdwZXJmZWN0J11cbiAgfSxcbiAge1xuICAgIGVuOiAnV2hlcmUgdGhlcmUgaXMgYSB3aWxsLCB0aGVyZSBpcyBhIHdheS4nLFxuICAgIHpoOiAn5pyJ5b+X6ICF5LqL56uf5oiQ44CCJyxcbiAgICB3b3JkczogWyd3aWxsJywgJ3dheSddXG4gIH0sXG4gIHtcbiAgICBlbjogJ05vIHBhaW4sIG5vIGdhaW4uJyxcbiAgICB6aDogJ+ayoeacieS7mOWHuuWwseayoeacieaUtuiOt+OAgicsXG4gICAgd29yZHM6IFsncGFpbicsICdnYWluJ11cbiAgfSxcbiAge1xuICAgIGVuOiAnVGhlIGVhcmx5IGJpcmQgY2F0Y2hlcyB0aGUgd29ybS4nLFxuICAgIHpoOiAn5pep6LW355qE6bif5YS/5pyJ6Jmr5ZCD44CCJyxcbiAgICB3b3JkczogWydlYXJseScsICdjYXRjaCcsICd3b3JtJ11cbiAgfSxcbiAge1xuICAgIGVuOiAnQWN0aW9ucyBzcGVhayBsb3VkZXIgdGhhbiB3b3Jkcy4nLFxuICAgIHpoOiAn6KGM5Yqo6IOc5LqO6KiA6L6e44CCJyxcbiAgICB3b3JkczogWydhY3Rpb24nLCAnc3BlYWsnLCAnbG91ZCddXG4gIH0sXG4gIHtcbiAgICBlbjogJ0tub3dsZWRnZSBpcyBwb3dlci4nLFxuICAgIHpoOiAn55+l6K+G5bCx5piv5Yqb6YeP44CCJyxcbiAgICBhdXRob3I6ICdGcmFuY2lzIEJhY29uJyxcbiAgICB3b3JkczogWydrbm93bGVkZ2UnLCAncG93ZXInXVxuICB9LFxuICB7XG4gICAgZW46ICdGYWlsdXJlIGlzIHRoZSBtb3RoZXIgb2Ygc3VjY2Vzcy4nLFxuICAgIHpoOiAn5aSx6LSl5piv5oiQ5Yqf5LmL5q+N44CCJyxcbiAgICB3b3JkczogWydmYWlsdXJlJywgJ3N1Y2Nlc3MnLCAnbW90aGVyJ11cbiAgfSxcbiAge1xuICAgIGVuOiAnUm9tZSB3YXMgbm90IGJ1aWx0IGluIGEgZGF5LicsXG4gICAgemg6ICfnvZfpqazkuI3mmK/kuIDlpKnlu7rmiJDnmoTjgILvvIjkvJ/kuJrpnZ7kuIDml6XkuYvlip/vvIknLFxuICAgIHdvcmRzOiBbJ2J1aWx0JywgJ2RheSddXG4gIH0sXG4gIHtcbiAgICBlbjogJ0Egam91cm5leSBvZiBhIHRob3VzYW5kIG1pbGVzIGJlZ2lucyB3aXRoIGEgc2luZ2xlIHN0ZXAuJyxcbiAgICB6aDogJ+WNg+mHjOS5i+ihjO+8jOWni+S6jui2s+S4i+OAgicsXG4gICAgd29yZHM6IFsnam91cm5leScsICd0aG91c2FuZCcsICdtaWxlJywgJ2JlZ2luJywgJ3N0ZXAnXVxuICB9LFxuICB7XG4gICAgZW46ICdCZXR0ZXIgbGF0ZSB0aGFuIG5ldmVyLicsXG4gICAgemg6ICfov5/lgZrmgLvmr5TkuI3lgZrlpb3jgIInLFxuICAgIHdvcmRzOiBbJ2xhdGUnLCAnbmV2ZXInXVxuICB9LFxuICB7XG4gICAgZW46ICdFdmVyeSBjbG91ZCBoYXMgYSBzaWx2ZXIgbGluaW5nLicsXG4gICAgemg6ICfmr4/mnLXkuYzkupHpg73mnInpk7bovrnjgILvvIjpu5HmmpfkuK3mgLvmnInkuIDkuJ3lhYnmmI7vvIknLFxuICAgIHdvcmRzOiBbJ2Nsb3VkJywgJ3NpbHZlcicsICdsaW5pbmcnXVxuICB9LFxuICB7XG4gICAgZW46ICdUaGUgb25seSB3YXkgdG8gZG8gZ3JlYXQgd29yayBpcyB0byBsb3ZlIHdoYXQgeW91IGRvLicsXG4gICAgemg6ICfmiJDlsLHkvJ/lpKfkuovkuJrnmoTllK/kuIDmlrnms5XvvIzlsLHmmK/ng63niLHkvaDmiYDlgZrnmoTkuovjgIInLFxuICAgIGF1dGhvcjogJ1N0ZXZlIEpvYnMnLFxuICAgIHdvcmRzOiBbJ2dyZWF0JywgJ3dvcmsnLCAnbG92ZSddXG4gIH0sXG4gIHtcbiAgICBlbjogJ1N0YXkgaHVuZ3J5LCBzdGF5IGZvb2xpc2guJyxcbiAgICB6aDogJ+axguefpeiLpemlpe+8jOiZmuW/g+iLpeaEmuOAgicsXG4gICAgYXV0aG9yOiAnU3RldmUgSm9icycsXG4gICAgd29yZHM6IFsnaHVuZ3J5JywgJ2Zvb2xpc2gnXVxuICB9LFxuICB7XG4gICAgZW46ICdUaGUgZnV0dXJlIGJlbG9uZ3MgdG8gdGhvc2Ugd2hvIGJlbGlldmUgaW4gdGhlIGJlYXV0eSBvZiB0aGVpciBkcmVhbXMuJyxcbiAgICB6aDogJ+acquadpeWxnuS6jumCo+S6m+ebuOS/oeaipuaDs+S5i+e+jueahOS6uuOAgicsXG4gICAgYXV0aG9yOiAnRWxlYW5vciBSb29zZXZlbHQnLFxuICAgIHdvcmRzOiBbJ2Z1dHVyZScsICdiZWxvbmcnLCAnYmVsaWV2ZScsICdiZWF1dHknLCAnZHJlYW0nXVxuICB9LFxuICB7XG4gICAgZW46ICdHZW5pdXMgaXMgb25lIHBlcmNlbnQgaW5zcGlyYXRpb24gYW5kIG5pbmV0eS1uaW5lIHBlcmNlbnQgcGVyc3BpcmF0aW9uLicsXG4gICAgemg6ICflpKnmiY3mmK/nmb7liIbkuYvkuIDnmoTngbXmhJ/liqDkuIrnmb7liIbkuYvkuZ3ljYHkuZ3nmoTmsZfmsLTjgIInLFxuICAgIGF1dGhvcjogJ1Rob21hcyBFZGlzb24nLFxuICAgIHdvcmRzOiBbJ2dlbml1cycsICdwZXJjZW50JywgJ2luc3BpcmF0aW9uJywgJ3BlcnNwaXJhdGlvbiddXG4gIH0sXG4gIHtcbiAgICBlbjogJ0lmIHlvdSB3YW50IHRvIGdvIGZhc3QsIGdvIGFsb25lLiBJZiB5b3Ugd2FudCB0byBnbyBmYXIsIGdvIHRvZ2V0aGVyLicsXG4gICAgemg6ICfmg7PotbDlvpflv6vvvIzlsLHni6zoh6rotbDvvJvmg7PotbDlvpfov5zvvIzlsLHkuIDotbfotbDjgIInLFxuICAgIHdvcmRzOiBbJ2Zhc3QnLCAnYWxvbmUnLCAnZmFyJywgJ3RvZ2V0aGVyJ11cbiAgfSxcbiAge1xuICAgIGVuOiAnRWR1Y2F0aW9uIGlzIHRoZSBtb3N0IHBvd2VyZnVsIHdlYXBvbiB3aGljaCB5b3UgY2FuIHVzZSB0byBjaGFuZ2UgdGhlIHdvcmxkLicsXG4gICAgemg6ICfmlZnogrLmmK/kvaDog73nlKjmnaXmlLnlj5jkuJbnlYznmoTmnIDmnInlipvnmoTmrablmajjgIInLFxuICAgIGF1dGhvcjogJ05lbHNvbiBNYW5kZWxhJyxcbiAgICB3b3JkczogWydlZHVjYXRpb24nLCAncG93ZXJmdWwnLCAnd2VhcG9uJywgJ3VzZScsICdjaGFuZ2UnLCAnd29ybGQnXVxuICB9LFxuICB7XG4gICAgZW46ICdTdWNjZXNzIGlzIG5vdCBmaW5hbCwgZmFpbHVyZSBpcyBub3QgZmF0YWw6IGl0IGlzIHRoZSBjb3VyYWdlIHRvIGNvbnRpbnVlIHRoYXQgY291bnRzLicsXG4gICAgemg6ICfmiJDlip/kuI3mmK/nu4jngrnvvIzlpLHotKXkuZ/pnZ7mnKvml6XvvJvph43opoHnmoTmmK/nu6fnu63liY3ooYznmoTli4fmsJTjgIInLFxuICAgIGF1dGhvcjogJ1dpbnN0b24gQ2h1cmNoaWxsJyxcbiAgICB3b3JkczogWydzdWNjZXNzJywgJ2ZpbmFsJywgJ2ZhaWx1cmUnLCAnZmF0YWwnLCAnY291cmFnZScsICdjb250aW51ZScsICdjb3VudCddXG4gIH0sXG4gIHtcbiAgICBlbjogJ1RoZSBiZXN0IHRpbWUgdG8gcGxhbnQgYSB0cmVlIHdhcyAyMCB5ZWFycyBhZ28uIFRoZSBzZWNvbmQgYmVzdCB0aW1lIGlzIG5vdy4nLFxuICAgIHpoOiAn56eN5LiA5qO15qCR5pyA5aW955qE5pe26Ze05piv5LqM5Y2B5bm05YmN77yM5YW25qyh5piv546w5Zyo44CCJyxcbiAgICB3b3JkczogWydiZXN0JywgJ3RpbWUnLCAncGxhbnQnLCAndHJlZScsICdhZ28nLCAnc2Vjb25kJywgJ25vdyddXG4gIH0sXG4gIHtcbiAgICBlbjogJ0xpZmUgaXMgbGlrZSByaWRpbmcgYSBiaWN5Y2xlLiBUbyBrZWVwIHlvdXIgYmFsYW5jZSwgeW91IG11c3Qga2VlcCBtb3ZpbmcuJyxcbiAgICB6aDogJ+eUn+a0u+WwseWDj+mqkeiHquihjOi9puOAguimgeS/neaMgeW5s+ihoe+8jOWwseW/hemhu+S4jeaWreWJjei/m+OAgicsXG4gICAgYXV0aG9yOiAnQWxiZXJ0IEVpbnN0ZWluJyxcbiAgICB3b3JkczogWydsaWZlJywgJ3JpZGluZycsICdiaWN5Y2xlJywgJ2tlZXAnLCAnYmFsYW5jZScsICdtb3ZpbmcnXVxuICB9LFxuICB7XG4gICAgZW46ICdOb3RoaW5nIGlzIGltcG9zc2libGUgdG8gYSB3aWxsaW5nIGhlYXJ0LicsXG4gICAgemg6ICflv4PkuYvmiYDmhL/vvIzml6DmiYDkuI3miJDjgIInLFxuICAgIHdvcmRzOiBbJ25vdGhpbmcnLCAnaW1wb3NzaWJsZScsICd3aWxsaW5nJywgJ2hlYXJ0J11cbiAgfSxcbiAge1xuICAgIGVuOiAnQSBzbW9vdGggc2VhIG5ldmVyIG1hZGUgYSBza2lsbGVkIHNhaWxvci4nLFxuICAgIHpoOiAn5bmz6Z2Z55qE5rW35rSL6YCg5bCx5LiN5LqG54af57uD55qE5rC05omL44CCJyxcbiAgICB3b3JkczogWydzbW9vdGgnLCAnc2VhJywgJ3NraWxsZWQnLCAnc2FpbG9yJ11cbiAgfSxcbiAge1xuICAgIGVuOiAnRG8gbm90IGdvIHdoZXJlIHRoZSBwYXRoIG1heSBsZWFkLCBnbyBpbnN0ZWFkIHdoZXJlIHRoZXJlIGlzIG5vIHBhdGggYW5kIGxlYXZlIGEgdHJhaWwuJyxcbiAgICB6aDogJ+S4jeimgei1sOWIq+S6uui1sOi/h+eahOi3r++8jOWOu+ayoeaciei3r+eahOWcsOaWue+8jOeVmeS4i+iHquW3seeahOi2s+i/ueOAgicsXG4gICAgYXV0aG9yOiAnUmFscGggV2FsZG8gRW1lcnNvbicsXG4gICAgd29yZHM6IFsncGF0aCcsICdsZWFkJywgJ2luc3RlYWQnLCAnbGVhdmUnLCAndHJhaWwnXVxuICB9LFxuICB7XG4gICAgZW46ICdXaGV0aGVyIHlvdSB0aGluayB5b3UgY2FuIG9yIHlvdSB0aGluayB5b3UgY2FuXFwndCwgeW91XFwncmUgcmlnaHQuJyxcbiAgICB6aDogJ+aXoOiuuuS9oOiupOS4uuS9oOihjOi/mOaYr+S4jeihjO+8jOS9oOmDveaYr+WvueeahOOAgicsXG4gICAgYXV0aG9yOiAnSGVucnkgRm9yZCcsXG4gICAgd29yZHM6IFsnd2hldGhlcicsICd0aGluaycsICdyaWdodCddXG4gIH0sXG4gIHtcbiAgICBlbjogJ1RoZSBtYW4gd2hvIG1vdmVzIG1vdW50YWlucyBiZWdpbnMgYnkgY2Fycnlpbmcgc21hbGwgc3RvbmVzLicsXG4gICAgemg6ICfnp7vlsbHkuYvkurrlp4vkuo7mkKzotbDlsI/nn7PjgIInLFxuICAgIHdvcmRzOiBbJ21vdmUnLCAnbW91bnRhaW4nLCAnYmVnaW4nLCAnY2FycnknLCAnc21hbGwnLCAnc3RvbmUnXVxuICB9LFxuICB7XG4gICAgZW46ICdEbyB3aGF0IHlvdSBjYW4sIHdpdGggd2hhdCB5b3UgaGF2ZSwgd2hlcmUgeW91IGFyZS4nLFxuICAgIHpoOiAn55So5L2g5oul5pyJ55qE77yM5Zyo5L2g5omA5Zyo55qE5Zyw5pa577yM5YGa5L2g6IO95YGa55qE44CCJyxcbiAgICBhdXRob3I6ICdUaGVvZG9yZSBSb29zZXZlbHQnLFxuICAgIHdvcmRzOiBbJ3doYXQnLCAnY2FuJywgJ2hhdmUnLCAnd2hlcmUnXVxuICB9LFxuICB7XG4gICAgZW46ICdBbiBpbnZlc3RtZW50IGluIGtub3dsZWRnZSBwYXlzIHRoZSBiZXN0IGludGVyZXN0LicsXG4gICAgemg6ICflr7nnn6Xor4bnmoTmipXotYTlm57miqXmnIDkuLDljprjgIInLFxuICAgIGF1dGhvcjogJ0JlbmphbWluIEZyYW5rbGluJyxcbiAgICB3b3JkczogWydpbnZlc3RtZW50JywgJ2tub3dsZWRnZScsICdwYXknLCAnaW50ZXJlc3QnXVxuICB9LFxuICB7XG4gICAgZW46ICdRdWFsaXR5IGlzIG5vdCBhbiBhY3QsIGl0IGlzIGEgaGFiaXQuJyxcbiAgICB6aDogJ+WTgei0qOS4jeaYr+S4gOenjeihjOS4uu+8jOiAjOaYr+S4gOenjeS5oOaDr+OAgicsXG4gICAgYXV0aG9yOiAnQXJpc3RvdGxlJyxcbiAgICB3b3JkczogWydxdWFsaXR5JywgJ2FjdCcsICdoYWJpdCddXG4gIH0sXG4gIHtcbiAgICBlbjogJ1RoZSBqb3VybmV5IG9mIGEgdGhvdXNhbmQgbWlsZXMgYmVnaW5zIHdpdGggb25lIHN0ZXAuJyxcbiAgICB6aDogJ+WNg+mHjOS5i+ihjO+8jOWni+S6jui2s+S4i+OAgicsXG4gICAgd29yZHM6IFsnam91cm5leScsICd0aG91c2FuZCcsICdtaWxlJywgJ2JlZ2luJywgJ3N0ZXAnXVxuICB9LFxuICB7XG4gICAgZW46ICdCZWxpZXZlIHlvdSBjYW4gYW5kIHlvdSBhcmUgaGFsZndheSB0aGVyZS4nLFxuICAgIHpoOiAn55u45L+h5L2g6IO977yM5L2g5bCx5bey57uP5oiQ5Yqf5LqG5LiA5Y2K44CCJyxcbiAgICBhdXRob3I6ICdUaGVvZG9yZSBSb29zZXZlbHQnLFxuICAgIHdvcmRzOiBbJ2JlbGlldmUnLCAnaGFsZndheSddXG4gIH0sXG4gIHtcbiAgICBlbjogJ1ByYWN0aWNlIHdoYXQgeW91IHByZWFjaC4nLFxuICAgIHpoOiAn6KiA6KGM5LiA6Ie077yM6Lqr5L2T5Yqb6KGM44CCJyxcbiAgICB3b3JkczogW1wicHJhY3RpY2VcIiwgXCJwcmVhY2hcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnVHdvIGhlYWRzIGFyZSBiZXR0ZXIgdGhhbiBvbmUuJyxcbiAgICB6aDogJ+S4ieS4quiHreearuWMoO+8jOmhtuS4quivuOiRm+S6ruOAgicsXG4gICAgd29yZHM6IFtcImhlYWRcIiwgXCJiZXR0ZXJcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnV2hlbiBpbiBSb21lLCBkbyBhcyB0aGUgUm9tYW5zIGRvLicsXG4gICAgemg6ICflhaXkuaHpmo/kv5fjgIInLFxuICAgIHdvcmRzOiBbXCJyb21lXCIsIFwicm9tYW5cIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnVGhlIGdyYXNzIGlzIGFsd2F5cyBncmVlbmVyIG9uIHRoZSBvdGhlciBzaWRlLicsXG4gICAgemg6ICfov5nlsbHmnJvnnYDpgqPlsbHpq5jjgIInLFxuICAgIHdvcmRzOiBbXCJncmFzc1wiLCBcImdyZWVuXCIsIFwic2lkZVwiXVxuICB9LFxuICB7XG4gICAgZW46ICdBIGZyaWVuZCBpbiBuZWVkIGlzIGEgZnJpZW5kIGluZGVlZC4nLFxuICAgIHpoOiAn5oKj6Zq+6KeB55yf5oOF44CCJyxcbiAgICB3b3JkczogW1wiZnJpZW5kXCIsIFwibmVlZFwiLCBcImluZGVlZFwiXVxuICB9LFxuICB7XG4gICAgZW46ICdTdHJpa2Ugd2hpbGUgdGhlIGlyb24gaXMgaG90LicsXG4gICAgemg6ICfotoHng63miZPpk4HjgIInLFxuICAgIHdvcmRzOiBbXCJzdHJpa2VcIiwgXCJpcm9uXCIsIFwiaG90XCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0RvIG5vdCBwdXQgYWxsIHlvdXIgZWdncyBpbiBvbmUgYmFza2V0LicsXG4gICAgemg6ICfkuI3opoHmiorpuKHom4vmlL7lnKjlkIzkuIDkuKrnr67lrZDph4zjgIInLFxuICAgIHdvcmRzOiBbXCJlZ2dcIiwgXCJiYXNrZXRcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnVGltZSBmbGllcyB3aGVuIHlvdSBhcmUgaGF2aW5nIGZ1bi4nLFxuICAgIHpoOiAn5qyi5LmQ5pe25YWJ6L+H5b6X5b+r44CCJyxcbiAgICB3b3JkczogW1widGltZVwiLCBcImZsaWVzXCIsIFwiZnVuXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0hhc3RlIG1ha2VzIHdhc3RlLicsXG4gICAgemg6ICfmrLLpgJ/liJnkuI3ovr7jgIInLFxuICAgIHdvcmRzOiBbXCJoYXN0ZVwiLCBcIndhc3RlXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0l0IG5ldmVyIHJhaW5zIGJ1dCBpdCBwb3Vycy4nLFxuICAgIHpoOiAn5LiN6bij5YiZ5bey77yM5LiA6bij5oOK5Lq644CC77yI56W45LiN5Y2V6KGM77yJJyxcbiAgICB3b3JkczogW1wicmFpblwiLCBcInBvdXJcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnS2lsbCB0d28gYmlyZHMgd2l0aCBvbmUgc3RvbmUuJyxcbiAgICB6aDogJ+S4gOeureWPjOmbleOAgicsXG4gICAgd29yZHM6IFtcImJpcmRcIiwgXCJzdG9uZVwiXVxuICB9LFxuICB7XG4gICAgZW46ICdMb3ZlIG1lLCBsb3ZlIG15IGRvZy4nLFxuICAgIHpoOiAn54ix5bGL5Y+K5LmM44CCJyxcbiAgICB3b3JkczogW1wibG92ZVwiLCBcImRvZ1wiXVxuICB9LFxuICB7XG4gICAgZW46ICdNYW55IGhhbmRzIG1ha2UgbGlnaHQgd29yay4nLFxuICAgIHpoOiAn5Lq65aSa5aW95Yqe5LqL44CCJyxcbiAgICB3b3JkczogW1wiaGFuZFwiLCBcImxpZ2h0XCIsIFwid29ya1wiXVxuICB9LFxuICB7XG4gICAgZW46ICdPdXQgb2Ygc2lnaHQsIG91dCBvZiBtaW5kLicsXG4gICAgemg6ICfnnLzkuI3op4HvvIzlv4PkuI3ng6bjgIInLFxuICAgIHdvcmRzOiBbXCJzaWdodFwiLCBcIm1pbmRcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnVGhlIHBlbiBpcyBtaWdodGllciB0aGFuIHRoZSBzd29yZC4nLFxuICAgIHpoOiAn56yU6ICV5by65LqO5YmR5LyQ44CCJyxcbiAgICB3b3JkczogW1wicGVuXCIsIFwibWlnaHRpZXJcIiwgXCJzd29yZFwiXVxuICB9LFxuICB7XG4gICAgZW46ICdUaW1lIGlzIG1vbmV5LicsXG4gICAgemg6ICfkuIDlr7jlhYnpmLTkuIDlr7jph5HjgIInLFxuICAgIHdvcmRzOiBbXCJ0aW1lXCIsIFwibW9uZXlcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnWW91IGNhbm5vdCBqdWRnZSBhIGJvb2sgYnkgaXRzIGNvdmVyLicsXG4gICAgemg6ICfkurrkuI3lj6/osoznm7jjgIInLFxuICAgIHdvcmRzOiBbXCJqdWRnZVwiLCBcImJvb2tcIiwgXCJjb3ZlclwiXVxuICB9LFxuICB7XG4gICAgZW46ICdBIHBpY3R1cmUgaXMgd29ydGggYSB0aG91c2FuZCB3b3Jkcy4nLFxuICAgIHpoOiAn5LiA5Zu+6IOc5Y2D6KiA44CCJyxcbiAgICB3b3JkczogW1wicGljdHVyZVwiLCBcIndvcnRoXCIsIFwidGhvdXNhbmRcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnQWxsIHJvYWRzIGxlYWQgdG8gUm9tZS4nLFxuICAgIHpoOiAn5p2h5p2h5aSn6Lev6YCa572X6ams44CCJyxcbiAgICB3b3JkczogW1wicm9hZFwiLCBcImxlYWRcIiwgXCJyb21lXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0FuIGFwcGxlIGEgZGF5IGtlZXBzIHRoZSBkb2N0b3IgYXdheS4nLFxuICAgIHpoOiAn5LiA5aSp5LiA6Iu55p6c77yM5Yy755Sf6L+c56a75oiR44CCJyxcbiAgICB3b3JkczogW1wiYXBwbGVcIiwgXCJkb2N0b3JcIiwgXCJhd2F5XCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0JlYXV0eSBpcyBpbiB0aGUgZXllIG9mIHRoZSBiZWhvbGRlci4nLFxuICAgIHpoOiAn5oOF5Lq655y86YeM5Ye66KW/5pa944CCJyxcbiAgICB3b3JkczogW1wiYmVhdXR5XCIsIFwiZXllXCIsIFwiYmVob2xkZXJcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnQ3VyaW9zaXR5IGtpbGxlZCB0aGUgY2F0LicsXG4gICAgemg6ICflpb3lpYflrrPmrbvnjKvjgIInLFxuICAgIHdvcmRzOiBbXCJjdXJpb3NpdHlcIiwgXCJraWxsXCIsIFwiY2F0XCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0RvIG5vdCBjb3VudCB5b3VyIGNoaWNrZW5zIGJlZm9yZSB0aGV5IGhhdGNoLicsXG4gICAgemg6ICflsI/puKHlrbXlh7rliY3vvIzliKvmgKXnnYDmlbDjgIInLFxuICAgIHdvcmRzOiBbXCJjb3VudFwiLCBcImNoaWNrZW5zXCIsIFwiaGF0Y2hcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnRWFzeSBjb21lLCBlYXN5IGdvLicsXG4gICAgemg6ICfmnaXlvpflrrnmmJPvvIzljrvlvpfkuZ/lv6vjgIInLFxuICAgIHdvcmRzOiBbXCJlYXN5XCIsIFwiY29tZVwiLCBcImdvXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0V2ZXJ5IGRvZyBoYXMgaXRzIGRheS4nLFxuICAgIHpoOiAn5Lq65Lq655qG5pyJ5b6X5oSP5pe244CCJyxcbiAgICB3b3JkczogW1wiZG9nXCIsIFwiZGF5XCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0ZvcnR1bmUgZmF2b3JzIHRoZSBib2xkLicsXG4gICAgemg6ICflpb3ov5DnnLfpob7li4fogIXjgIInLFxuICAgIGF1dGhvcjogJ1ZpcmdpbCcsXG4gICAgd29yZHM6IFtcImZvcnR1bmVcIiwgXCJmYXZvclwiLCBcImJvbGRcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnR3JlYXQgbWluZHMgdGhpbmsgYWxpa2UuJyxcbiAgICB6aDogJ+iLsembhOaJgOingeeVpeWQjOOAgicsXG4gICAgd29yZHM6IFtcImdyZWF0XCIsIFwibWluZFwiLCBcInRoaW5rXCIsIFwiYWxpa2VcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnSWYgYXQgZmlyc3QgeW91IGRvIG5vdCBzdWNjZWVkLCB0cnksIHRyeSBhZ2Fpbi4nLFxuICAgIHpoOiAn5aaC5p6c5Yid5qyh5LiN5oiQ5Yqf77yM5YaN5o6l5YaN5Y6J44CCJyxcbiAgICB3b3JkczogW1wic3VjY2VlZFwiLCBcInRyeVwiLCBcImFnYWluXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0xhdWdodGVyIGlzIHRoZSBiZXN0IG1lZGljaW5lLicsXG4gICAgemg6ICfnrJHmmK/mnIDlpb3nmoToia/oja/jgIInLFxuICAgIHdvcmRzOiBbXCJsYXVnaHRlclwiLCBcImJlc3RcIiwgXCJtZWRpY2luZVwiXVxuICB9LFxuICB7XG4gICAgZW46ICdUbyBiZSwgb3Igbm90IHRvIGJlLCB0aGF0IGlzIHRoZSBxdWVzdGlvbi4nLFxuICAgIHpoOiAn55Sf5a2Y6L+Y5piv5q+B54Gt77yM6L+Z5piv5LiA5Liq6Zeu6aKY44CCJyxcbiAgICBhdXRob3I6ICdTaGFrZXNwZWFyZScsXG4gICAgd29yZHM6IFtcInF1ZXN0aW9uXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0kgdGhpbmssIHRoZXJlZm9yZSBJIGFtLicsXG4gICAgemg6ICfmiJHmgJ3mlYXmiJHlnKjjgIInLFxuICAgIGF1dGhvcjogJ0Rlc2NhcnRlcycsXG4gICAgd29yZHM6IFtcInRoaW5rXCIsIFwidGhlcmVmb3JlXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ1RoYXQgd2hpY2ggZG9lcyBub3Qga2lsbCB1cyBtYWtlcyB1cyBzdHJvbmdlci4nLFxuICAgIHpoOiAn6YKj5Lqb5p2A5LiN5q275oiR5Lus55qE77yM5L2/5oiR5Lus5pu05by65aSn44CCJyxcbiAgICBhdXRob3I6ICdOaWV0enNjaGUnLFxuICAgIHdvcmRzOiBbXCJraWxsXCIsIFwic3Ryb25nXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0luIHRoZSBtaWRkbGUgb2YgZGlmZmljdWx0eSBsaWVzIG9wcG9ydHVuaXR5LicsXG4gICAgemg6ICflm7Dpmr7kuYvkuK3olbTol4/mnLrpgYfjgIInLFxuICAgIGF1dGhvcjogJ0FsYmVydCBFaW5zdGVpbicsXG4gICAgd29yZHM6IFtcImRpZmZpY3VsdHlcIiwgXCJsaWVcIiwgXCJvcHBvcnR1bml0eVwiXVxuICB9LFxuICB7XG4gICAgZW46ICdUaGUgb25seSBsaW1pdCB0byBvdXIgcmVhbGl6YXRpb24gb2YgdG9tb3Jyb3cgd2lsbCBiZSBvdXIgZG91YnRzIG9mIHRvZGF5LicsXG4gICAgemg6ICflrp7njrDmmI7lpKnnkIbmg7PnmoTllK/kuIDpmpznoo3vvIzmmK/ku4rlpKnnmoTnlpHomZHjgIInLFxuICAgIGF1dGhvcjogJ0ZyYW5rbGluIFJvb3NldmVsdCcsXG4gICAgd29yZHM6IFtcImxpbWl0XCIsIFwicmVhbGl6YXRpb25cIiwgXCJkb3VidFwiLCBcInRvZGF5XCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ1dlIG1ha2UgYSBsaXZpbmcgYnkgd2hhdCB3ZSBnZXQsIGJ1dCB3ZSBtYWtlIGEgbGlmZSBieSB3aGF0IHdlIGdpdmUuJyxcbiAgICB6aDogJ+aIkeS7rOmdoOaJgOW+l+iwi+eUn++8jOmdoOe7meS6iOeUn+a0u+OAgicsXG4gICAgYXV0aG9yOiAnV2luc3RvbiBDaHVyY2hpbGwnLFxuICAgIHdvcmRzOiBbXCJsaXZpbmdcIiwgXCJnZXRcIiwgXCJnaXZlXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0JlIHRoZSBjaGFuZ2UgdGhhdCB5b3Ugd2lzaCB0byBzZWUgaW4gdGhlIHdvcmxkLicsXG4gICAgemg6ICfmrLLlj5jkuJbnlYzvvIzlhYjlj5jlhbbouqvjgIInLFxuICAgIGF1dGhvcjogJ01haGF0bWEgR2FuZGhpJyxcbiAgICB3b3JkczogW1wiY2hhbmdlXCIsIFwid2lzaFwiLCBcIndvcmxkXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0xpdmUgYXMgaWYgeW91IHdlcmUgdG8gZGllIHRvbW9ycm93LiBMZWFybiBhcyBpZiB5b3Ugd2VyZSB0byBsaXZlIGZvcmV2ZXIuJyxcbiAgICB6aDogJ+WDj+aYjuWkqeWwseimgeatu+WOu+mCo+agt+eUn+a0u++8jOWDj+awuOi/nOS4jeS8muatu+WOu+mCo+agt+WtpuS5oOOAgicsXG4gICAgYXV0aG9yOiAnTWFoYXRtYSBHYW5kaGknLFxuICAgIHdvcmRzOiBbXCJsaXZlXCIsIFwiZGllXCIsIFwibGVhcm5cIiwgXCJmb3JldmVyXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0l0IGRvZXMgbm90IG1hdHRlciBob3cgc2xvd2x5IHlvdSBnbyBhcyBsb25nIGFzIHlvdSBkbyBub3Qgc3RvcC4nLFxuICAgIHpoOiAn5LiN5oCV5oWi77yM5Y+q5oCV5YGc44CCJyxcbiAgICBhdXRob3I6ICdDb25mdWNpdXMnLFxuICAgIHdvcmRzOiBbXCJtYXR0ZXJcIiwgXCJzbG93bHlcIiwgXCJzdG9wXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ091ciBncmVhdGVzdCBnbG9yeSBpcyBub3QgaW4gbmV2ZXIgZmFsbGluZywgYnV0IGluIHJpc2luZyBldmVyeSB0aW1lIHdlIGZhbGwuJyxcbiAgICB6aDogJ+acgOS8n+Wkp+eahOWFieiNo+S4jeWcqOS6juS7juS4jei3jOWAku+8jOiAjOWcqOS6juavj+asoei3jOWAkuWQjumDveiDveeIrOi1t+OAgicsXG4gICAgYXV0aG9yOiAnQ29uZnVjaXVzJyxcbiAgICB3b3JkczogW1wiZ2xvcnlcIiwgXCJmYWxsaW5nXCIsIFwicmlzaW5nXCIsIFwiZmFsbFwiXVxuICB9LFxuICB7XG4gICAgZW46ICdUaGUgbWFuIHdobyBtb3ZlcyBhIG1vdW50YWluIGJlZ2lucyBieSBjYXJyeWluZyBhd2F5IHNtYWxsIHN0b25lcy4nLFxuICAgIHpoOiAn56e75bGx5LmL5Lq677yM5aeL5LqO5pCs6L+Q5bCP5Z2X55+z5aS044CCJyxcbiAgICBhdXRob3I6ICdDb25mdWNpdXMnLFxuICAgIHdvcmRzOiBbXCJtb3ZlXCIsIFwibW91bnRhaW5cIiwgXCJjYXJyeVwiLCBcInN0b25lXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0kgaGF2ZSBub3QgZmFpbGVkLiBJIGhhdmUganVzdCBmb3VuZCB0ZW4gdGhvdXNhbmQgd2F5cyB0aGF0IHdpbGwgbm90IHdvcmsuJyxcbiAgICB6aDogJ+aIkeayoeacieWksei0pe+8jOWPquaYr+WPkeeOsOS6huS4gOS4h+enjeihjOS4jemAmueahOaWueazleOAgicsXG4gICAgYXV0aG9yOiAnVGhvbWFzIEVkaXNvbicsXG4gICAgd29yZHM6IFtcImZhaWxcIiwgXCJmb3VuZFwiLCBcInRob3VzYW5kXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ1RlbGwgbWUgYW5kIEkgZm9yZ2V0LiBUZWFjaCBtZSBhbmQgSSByZW1lbWJlci4gSW52b2x2ZSBtZSBhbmQgSSBsZWFybi4nLFxuICAgIHpoOiAn5ZGK6K+J5oiR77yM5oiR5Lya5b+Y6K6w77yb5pWZ57uZ5oiR77yM5oiR5Lya6K6w5L2P77yb6K6p5oiR5Y+C5LiO77yM5oiR5omN6IO95a2m5Lya44CCJyxcbiAgICBhdXRob3I6ICdCZW5qYW1pbiBGcmFua2xpbicsXG4gICAgd29yZHM6IFtcImZvcmdldFwiLCBcInRlYWNoXCIsIFwicmVtZW1iZXJcIiwgXCJpbnZvbHZlXCIsIFwibGVhcm5cIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnVHdlbnR5IHllYXJzIGZyb20gbm93IHlvdSB3aWxsIGJlIG1vcmUgZGlzYXBwb2ludGVkIGJ5IHRoZSB0aGluZ3MgeW91IGRpZCBub3QgZG8gdGhhbiBieSB0aGUgb25lcyB5b3UgZGlkLicsXG4gICAgemg6ICfkuozljYHlubTlkI7vvIzorqnkvaDmm7TpgZfmhr7nmoTkuI3mmK/lgZrov4fnmoTkuovvvIzogIzmmK/msqHlgZrnmoTkuovjgIInLFxuICAgIGF1dGhvcjogJ01hcmsgVHdhaW4nLFxuICAgIHdvcmRzOiBbXCJ0d2VudHlcIiwgXCJkaXNhcHBvaW50ZWRcIiwgXCJ0aGluZ1wiXVxuICB9LFxuICB7XG4gICAgZW46ICdUaGUgc2VjcmV0IG9mIGdldHRpbmcgYWhlYWQgaXMgZ2V0dGluZyBzdGFydGVkLicsXG4gICAgemg6ICflj5blvpfpooblhYjnmoTnp5jor4DvvIzlsLHmmK/lvIDlp4vooYzliqjjgIInLFxuICAgIGF1dGhvcjogJ01hcmsgVHdhaW4nLFxuICAgIHdvcmRzOiBbXCJzZWNyZXRcIiwgXCJhaGVhZFwiLCBcInN0YXJ0XCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0RyZWFtcyBkbyBub3Qgd29yayB1bmxlc3MgeW91IGRvLicsXG4gICAgemg6ICfkuI3ooYzliqjvvIzmoqbmg7PlsLHmmK/nqbrmg7PjgIInLFxuICAgIGF1dGhvcjogJ0pvaG4gQy4gTWF4d2VsbCcsXG4gICAgd29yZHM6IFtcImRyZWFtXCIsIFwid29ya1wiXVxuICB9LFxuICB7XG4gICAgZW46ICdJdCBhbHdheXMgc2VlbXMgaW1wb3NzaWJsZSB1bnRpbCBpdCBpcyBkb25lLicsXG4gICAgemg6ICfkuovmg4XmgLvmmK/lnKjlrozmiJDkuYvliY3mmL7lvpfkuI3lj6/og73jgIInLFxuICAgIGF1dGhvcjogJ05lbHNvbiBNYW5kZWxhJyxcbiAgICB3b3JkczogW1wic2VlbVwiLCBcImltcG9zc2libGVcIiwgXCJkb25lXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0EgcmVhZGVyIGxpdmVzIGEgdGhvdXNhbmQgbGl2ZXMgYmVmb3JlIGhlIGRpZXMuIFRoZSBtYW4gd2hvIG5ldmVyIHJlYWRzIGxpdmVzIG9ubHkgb25lLicsXG4gICAgemg6ICfor7vkuabkurrnu4/ljobljYPnp43kurrnlJ/vvIzkuI3or7vkuabnmoTkurrlj6rmtLvkuIDmrKHjgIInLFxuICAgIGF1dGhvcjogJ0dlb3JnZSBSLlIuIE1hcnRpbicsXG4gICAgd29yZHM6IFtcInJlYWRlclwiLCBcInRob3VzYW5kXCIsIFwiZGllXCIsIFwicmVhZFwiXVxuICB9LFxuICB7XG4gICAgZW46ICdZb3UgYXJlIG5ldmVyIHRvbyBvbGQgdG8gc2V0IGFub3RoZXIgZ29hbCBvciB0byBkcmVhbSBhIG5ldyBkcmVhbS4nLFxuICAgIHpoOiAn6K6+5a6a5paw55uu5qCH44CB6L+96YCQ5paw5qKm5oOz77yM5rC46L+c6YO95LiN5pma44CCJyxcbiAgICBhdXRob3I6ICdDLlMuIExld2lzJyxcbiAgICB3b3JkczogW1wib2xkXCIsIFwiZ29hbFwiLCBcImRyZWFtXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ1RoZSBiZXN0IHRpbWUgdG8gcGxhbnQgYSB0cmVlIHdhcyB0d2VudHkgeWVhcnMgYWdvLiBUaGUgc2Vjb25kIGJlc3QgdGltZSBpcyBub3cuJyxcbiAgICB6aDogJ+enjeS4gOajteagkeacgOWlveeahOaXtumXtOaYr+S6jOWNgeW5tOWJje+8jOWFtuasoeaYr+eOsOWcqOOAgicsXG4gICAgd29yZHM6IFtcInBsYW50XCIsIFwidHJlZVwiLCBcImJlc3RcIiwgXCJhZ29cIiwgXCJub3dcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnRmFsbCBzZXZlbiB0aW1lcywgc3RhbmQgdXAgZWlnaHQuJyxcbiAgICB6aDogJ+i3jOWAkuS4g+asoe+8jOermei1t+adpeWFq+asoeOAgicsXG4gICAgd29yZHM6IFtcImZhbGxcIiwgXCJzZXZlblwiLCBcInN0YW5kXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ1N0YXJzIGNhbm5vdCBzaGluZSB3aXRob3V0IGRhcmtuZXNzLicsXG4gICAgemg6ICfmsqHmnInpu5HmmpfvvIzmmJ/ovrDml6Dms5Xpl6rogIDjgIInLFxuICAgIHdvcmRzOiBbXCJzdGFyXCIsIFwic2hpbmVcIiwgXCJkYXJrbmVzc1wiXVxuICB9LFxuICB7XG4gICAgZW46ICdMaXR0bGUgYnkgbGl0dGxlLCBvbmUgdHJhdmVscyBmYXIuJyxcbiAgICB6aDogJ+enr+i3rOatpe+8jOiHtOWNg+mHjOOAgicsXG4gICAgYXV0aG9yOiAnSi5SLlIuIFRvbGtpZW4nLFxuICAgIHdvcmRzOiBbXCJsaXR0bGVcIiwgXCJ0cmF2ZWxcIiwgXCJmYXJcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnTm90aGluZyBpcyBpbXBvc3NpYmxlLCB0aGUgd29yZCBpdHNlbGYgc2F5cyBcIkkgYW0gcG9zc2libGVcIiEnLFxuICAgIHpoOiAn5rKh5pyJ5LuA5LmI5LiN5Y+v6IO977yMXCLkuI3lj6/og71cIui/meS4quivjeacrOi6q+WwseiXj+edgFwi5oiR5piv5Y+v6IO955qEXCLvvIEnLFxuICAgIGF1dGhvcjogJ0F1ZHJleSBIZXBidXJuJyxcbiAgICB3b3JkczogW1wiaW1wb3NzaWJsZVwiLCBcIndvcmRcIiwgXCJwb3NzaWJsZVwiXVxuICB9LFxuICB7XG4gICAgZW46ICdLZWVwIHlvdXIgZmFjZSBhbHdheXMgdG93YXJkIHRoZSBzdW5zaGluZSwgYW5kIHNoYWRvd3Mgd2lsbCBmYWxsIGJlaGluZCB5b3UuJyxcbiAgICB6aDogJ+awuOi/nOmdouWQkemYs+WFie+8jOmYtOW9seWwseS8muiQveWcqOi6q+WQjuOAgicsXG4gICAgYXV0aG9yOiAnV2FsdCBXaGl0bWFuJyxcbiAgICB3b3JkczogW1wiZmFjZVwiLCBcInRvd2FyZFwiLCBcInN1bnNoaW5lXCIsIFwic2hhZG93XCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ1doYXQgd2Uga25vdyBpcyBhIGRyb3AsIHdoYXQgd2UgZG8gbm90IGtub3cgaXMgYW4gb2NlYW4uJyxcbiAgICB6aDogJ+W3suefpeaYr+S4gOa7tOawtO+8jOacquefpeaYr+axqua0i+Wkp+a1t+OAgicsXG4gICAgYXV0aG9yOiAnSXNhYWMgTmV3dG9uJyxcbiAgICB3b3JkczogW1wia25vd1wiLCBcImRyb3BcIiwgXCJvY2VhblwiXVxuICB9LFxuICB7XG4gICAgZW46ICdEb3VidCBraWxscyBtb3JlIGRyZWFtcyB0aGFuIGZhaWx1cmUgZXZlciB3aWxsLicsXG4gICAgemg6ICfmr5TotbflpLHotKXvvIzmgIDnlpHmibzmnYDkuobmm7TlpJrmoqbmg7PjgIInLFxuICAgIHdvcmRzOiBbXCJkb3VidFwiLCBcImtpbGxcIiwgXCJkcmVhbVwiLCBcImZhaWx1cmVcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnRG8gbm90IHdhdGNoIHRoZSBjbG9jay4gRG8gd2hhdCBpdCBkb2VzLiBLZWVwIGdvaW5nLicsXG4gICAgemg6ICfliKvnm6/nnYDml7bpkp/nnIvvvIzlrablroPkuIDnm7TotbDjgIInLFxuICAgIGF1dGhvcjogJ1NhbSBMZXZlbnNvbicsXG4gICAgd29yZHM6IFtcImNsb2NrXCIsIFwia2VlcFwiLCBcImdvaW5nXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ1BlcnNldmVyYW5jZSBpcyBub3QgYSBsb25nIHJhY2U7IGl0IGlzIG1hbnkgc2hvcnQgcmFjZXMgb25lIGFmdGVyIHRoZSBvdGhlci4nLFxuICAgIHpoOiAn5Z2a5oyB5LiN5piv5LiA5Zy66ZW/6LeR77yM6ICM5piv5LiA5Zy65o6l5LiA5Zy655qE55+t6LeR44CCJyxcbiAgICBhdXRob3I6ICdXYWx0ZXIgRWxsaW90JyxcbiAgICB3b3JkczogW1wicGVyc2V2ZXJhbmNlXCIsIFwicmFjZVwiLCBcInNob3J0XCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0dyZWF0IHRoaW5ncyBhcmUgZG9uZSBieSBhIHNlcmllcyBvZiBzbWFsbCB0aGluZ3MgYnJvdWdodCB0b2dldGhlci4nLFxuICAgIHpoOiAn5Lyf5aSn55qE5oiQ5bCx77yM5rqQ5LqO5LiA57O75YiX5bCP5LqL55qE5rGH6IGa44CCJyxcbiAgICBhdXRob3I6ICdWaW5jZW50IFZhbiBHb2doJyxcbiAgICB3b3JkczogW1wic2VyaWVzXCIsIFwic21hbGxcIiwgXCJ0b2dldGhlclwiXVxuICB9LFxuICB7XG4gICAgZW46ICdTaW1wbGljaXR5IGlzIHRoZSB1bHRpbWF0ZSBzb3BoaXN0aWNhdGlvbi4nLFxuICAgIHpoOiAn5aSn6YGT6Iez566A44CCJyxcbiAgICBhdXRob3I6ICdMZW9uYXJkbyBkYSBWaW5jaScsXG4gICAgd29yZHM6IFtcInNpbXBsaWNpdHlcIiwgXCJ1bHRpbWF0ZVwiLCBcInNvcGhpc3RpY2F0aW9uXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ0xlYXJuaW5nIG5ldmVyIGV4aGF1c3RzIHRoZSBtaW5kLicsXG4gICAgemg6ICflrabkuaDmsLjov5zkuI3kvJrorqnlpKfohJHnlrLmg6vjgIInLFxuICAgIGF1dGhvcjogJ0xlb25hcmRvIGRhIFZpbmNpJyxcbiAgICB3b3JkczogW1wibGVhcm5pbmdcIiwgXCJleGhhdXN0XCIsIFwibWluZFwiXVxuICB9LFxuICB7XG4gICAgZW46ICdUaGUgbW9yZSB0aGF0IHlvdSByZWFkLCB0aGUgbW9yZSB0aGluZ3MgeW91IHdpbGwga25vdy4nLFxuICAgIHpoOiAn6K+75b6X6LaK5aSa77yM55+l6YGT5b6X6LaK5aSa44CCJyxcbiAgICBhdXRob3I6ICdEci4gU2V1c3MnLFxuICAgIHdvcmRzOiBbXCJyZWFkXCIsIFwibW9yZVwiLCBcImtub3dcIl1cbiAgfSxcbiAge1xuICAgIGVuOiAnUGxheSBpcyB0aGUgaGlnaGVzdCBmb3JtIG9mIHJlc2VhcmNoLicsXG4gICAgemg6ICfnjqnogI3mmK/mnIDpq5jlvaLlvI/nmoTnoJTnqbbjgIInLFxuICAgIGF1dGhvcjogJ0FsYmVydCBFaW5zdGVpbicsXG4gICAgd29yZHM6IFtcInBsYXlcIiwgXCJoaWdoZXN0XCIsIFwiZm9ybVwiLCBcInJlc2VhcmNoXCJdXG4gIH0sXG4gIHtcbiAgICBlbjogJ09uY2UgeW91IGxlYXJuIHRvIHJlYWQsIHlvdSB3aWxsIGJlIGZvcmV2ZXIgZnJlZS4nLFxuICAgIHpoOiAn5LiA5pem5a2m5Lya6ZiF6K+777yM5L2g5bCG5rC46L+c6Ieq55Sx44CCJyxcbiAgICBhdXRob3I6ICdGcmVkZXJpY2sgRG91Z2xhc3MnLFxuICAgIHdvcmRzOiBbXCJsZWFyblwiLCBcInJlYWRcIiwgXCJmb3JldmVyXCIsIFwiZnJlZVwiXVxuICB9LFxuICB7XG4gICAgZW46ICdXb3JkcyBhcmUsIGluIG15IG5vdC1zby1odW1ibGUgb3Bpbmlvbiwgb3VyIG1vc3QgaW5leGhhdXN0aWJsZSBzb3VyY2Ugb2YgbWFnaWMuJyxcbiAgICB6aDogJ+S+neaIkeS5i+inge+8jOivjeivreaYr+aIkeS7rOacgOWPluS5i+S4jeWwveeahOmtlOWKm+a6kOazieOAgicsXG4gICAgYXV0aG9yOiAnSi5LLiBSb3dsaW5nJyxcbiAgICB3b3JkczogW1wid29yZFwiLCBcImh1bWJsZVwiLCBcIm9waW5pb25cIiwgXCJzb3VyY2VcIiwgXCJtYWdpY1wiXVxuICB9LFxuXTtcblxuLy8g5qC55o2u5pel5pyf6I635Y+W5LuK5pel6YeR5Y+l77yI5oyJ5aSp6L2u5o2i77yM5ZCM5LiA5aSp6L+U5Zue5ZCM5LiA5p2h77yJXG5leHBvcnQgZnVuY3Rpb24gZ2V0RGFpbHlRdW90ZSgpOiBRdW90ZSB7XG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGRheU9mWWVhciA9IE1hdGguZmxvb3IoKG5vdy5nZXRUaW1lKCkgLSBuZXcgRGF0ZShub3cuZ2V0RnVsbFllYXIoKSwgMCwgMCkuZ2V0VGltZSgpKSAvIDg2NDAwMDAwKTtcbiAgcmV0dXJuIHF1b3Rlc1tkYXlPZlllYXIgJSBxdW90ZXMubGVuZ3RoXTtcbn1cblxuLy8g4pSA4pSA4pSAIOWhq+epuue7g+S5oOaVsOaNriDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcbmV4cG9ydCBpbnRlcmZhY2UgRmlsbEJsYW5rSXRlbSB7XG4gIGVuOiBzdHJpbmc7ICAgICAgICAgIC8vIOiLseaWh+WPpeWtkO+8iOWQqyBfX18g5Y2g5L2N56ym77yJXG4gIHpoOiBzdHJpbmc7ICAgICAgICAgIC8vIOS4reaWh+e/u+ivkVxuICBhdXRob3I/OiBzdHJpbmc7ICAgICAvLyDkvZzogIVcbiAgYW5zd2VyOiBzdHJpbmc7ICAgICAgLy8g5q2j56Gu562U5qGIXG4gIG9wdGlvbnM6IHN0cmluZ1tdOyAgIC8vIOWbm+mAieS4gOmAiemhue+8iOWQq+ato+ehruetlOahiO+8jOaJk+S5seWQjuS9v+eUqO+8iVxuICBhdXRob3JJbmZvPzogc3RyaW5nOyAvLyDkvZzogIXog4zmma9cbn1cblxuZXhwb3J0IGNvbnN0IGZpbGxCbGFua0RhdGE6IEZpbGxCbGFua0l0ZW1bXSA9IFtcbiAge1xuICAgIGVuOiAnUHJhY3RpY2UgbWFrZXMgX19fLicsXG4gICAgemg6ICfnhp/og73nlJ/lt6fjgIInLFxuICAgIGFuc3dlcjogJ3BlcmZlY3QnLFxuICAgIG9wdGlvbnM6IFsncGVyZmVjdCcsICdiZXR0ZXInLCAnZWFzeScsICdmYXN0J10sXG4gICAgYXV0aG9ySW5mbzogJ+iLseivreiwmuivre+8jOW8uuiwg+WPjeWkjee7g+S5oOeahOmHjeimgeaApydcbiAgfSxcbiAge1xuICAgIGVuOiAnV2hlcmUgdGhlcmUgaXMgYSBfX18sIHRoZXJlIGlzIGEgd2F5LicsXG4gICAgemg6ICfmnInlv5fogIXkuovnq5/miJDjgIInLFxuICAgIGFuc3dlcjogJ3dpbGwnLFxuICAgIG9wdGlvbnM6IFsnd2lsbCcsICdob3BlJywgJ2RyZWFtJywgJ3dpc2gnXSxcbiAgICBhdXRob3JJbmZvOiAn6Iux6K+t6LCa6K+t77yM5oSP5Li65pyJ5Yaz5b+D5bCx5pyJ5Yqe5rOVJ1xuICB9LFxuICB7XG4gICAgZW46ICdBY3Rpb25zIHNwZWFrIGxvdWRlciB0aGFuIF9fXy4nLFxuICAgIHpoOiAn6KGM5Yqo6IOc5LqO6KiA6L6e44CCJyxcbiAgICBhbnN3ZXI6ICd3b3JkcycsXG4gICAgb3B0aW9uczogWyd3b3JkcycsICd2b2ljZXMnLCAnc291bmRzJywgJ3RhbGtzJ10sXG4gICAgYXV0aG9ySW5mbzogJ+iLseivreiwmuivre+8jOW8uuiwg+ihjOWKqOavlOiogOivreabtOacieWKmydcbiAgfSxcbiAge1xuICAgIGVuOiAnS25vd2xlZGdlIGlzIF9fXy4nLFxuICAgIHpoOiAn55+l6K+G5bCx5piv5Yqb6YeP44CCJyxcbiAgICBhdXRob3I6ICdGcmFuY2lzIEJhY29uJyxcbiAgICBhbnN3ZXI6ICdwb3dlcicsXG4gICAgb3B0aW9uczogWydwb3dlcicsICd3ZWFsdGgnLCAnbW9uZXknLCAnZmFtZSddLFxuICAgIGF1dGhvckluZm86ICflvJfmnJfopb/mlq/Ct+Wfueague+8iDE1NjEtMTYyNu+8ie+8jOiLseWbveWTsuWtpuWutuOAgeenkeWtpuWutidcbiAgfSxcbiAge1xuICAgIGVuOiAnRmFpbHVyZSBpcyB0aGUgX19fIG9mIHN1Y2Nlc3MuJyxcbiAgICB6aDogJ+Wksei0peaYr+aIkOWKn+S5i+avjeOAgicsXG4gICAgYW5zd2VyOiAnbW90aGVyJyxcbiAgICBvcHRpb25zOiBbJ21vdGhlcicsICdmYXRoZXInLCAnb3JpZ2luJywgJ3N0YXJ0J10sXG4gICAgYXV0aG9ySW5mbzogJ+iLseivreiwmuivre+8jOaEj+S4uuS7juWksei0peS4reaxsuWPluaVmeiureaJjeiDveaIkOWKnydcbiAgfSxcbiAge1xuICAgIGVuOiAnUm9tZSB3YXMgbm90IGJ1aWx0IGluIGEgX19fLicsXG4gICAgemg6ICfnvZfpqazkuI3mmK/kuIDlpKnlu7rmiJDnmoTjgIInLFxuICAgIGFuc3dlcjogJ2RheScsXG4gICAgb3B0aW9uczogWydkYXknLCAneWVhcicsICdtb250aCcsICd3ZWVrJ10sXG4gICAgYXV0aG9ySW5mbzogJ+iLseivreiwmuivre+8jOaEj+S4uuS8n+Wkp+aIkOWwsemcgOimgeaXtumXtOenr+e0rydcbiAgfSxcbiAge1xuICAgIGVuOiAnVGhlIGVhcmx5IGJpcmQgY2F0Y2hlcyB0aGUgX19fLicsXG4gICAgemg6ICfml6notbfnmoTpuJ/lhL/mnInomavlkIPjgIInLFxuICAgIGFuc3dlcjogJ3dvcm0nLFxuICAgIG9wdGlvbnM6IFsnd29ybScsICdmb29kJywgJ3NlZWQnLCAnZmx5J10sXG4gICAgYXV0aG9ySW5mbzogJ+iLseivreiwmuivre+8jOW8uuiwg+aXqeihjOWKqOacieS8mOWKvydcbiAgfSxcbiAge1xuICAgIGVuOiAnU3RheSBodW5ncnksIHN0YXkgX19fLicsXG4gICAgemg6ICfmsYLnn6Xoi6XppaXvvIzomZrlv4Poi6XmhJrjgIInLFxuICAgIGF1dGhvcjogJ1N0ZXZlIEpvYnMnLFxuICAgIGFuc3dlcjogJ2Zvb2xpc2gnLFxuICAgIG9wdGlvbnM6IFsnZm9vbGlzaCcsICdjdXJpb3VzJywgJ2JyYXZlJywgJ2NhbG0nXSxcbiAgICBhdXRob3JJbmZvOiAn5Y+y6JKC5aSrwrfkuZTluIPmlq/vvIgxOTU1LTIwMTHvvInvvIzoi7nmnpzlhazlj7jliJvlp4vkurrvvIwyMDA15bm05pav5Z2m56aP5q+V5Lia5YW456S85ryU6K6yJ1xuICB9LFxuICB7XG4gICAgZW46ICdHZW5pdXMgaXMgb25lIHBlcmNlbnQgaW5zcGlyYXRpb24gYW5kIG5pbmV0eS1uaW5lIHBlcmNlbnQgX19fLicsXG4gICAgemg6ICflpKnmiY3mmK/nmb7liIbkuYvkuIDnmoTngbXmhJ/liqDkuIrnmb7liIbkuYvkuZ3ljYHkuZ3nmoTmsZfmsLTjgIInLFxuICAgIGF1dGhvcjogJ1Rob21hcyBFZGlzb24nLFxuICAgIGFuc3dlcjogJ3BlcnNwaXJhdGlvbicsXG4gICAgb3B0aW9uczogWydwZXJzcGlyYXRpb24nLCAncHJhY3RpY2UnLCAncGF0aWVuY2UnLCAnZWZmb3J0J10sXG4gICAgYXV0aG9ySW5mbzogJ+aJmOmprOaWr8K354ix6L+q55Sf77yIMTg0Ny0xOTMx77yJ77yM576O5Zu95Y+R5piO5a6277yM5oul5pyJ5Y2D5L2Z6aG55LiT5YipJ1xuICB9LFxuICB7XG4gICAgZW46ICdUaGUgZnV0dXJlIGJlbG9uZ3MgdG8gdGhvc2Ugd2hvIGJlbGlldmUgaW4gdGhlIGJlYXV0eSBvZiB0aGVpciBfX18uJyxcbiAgICB6aDogJ+acquadpeWxnuS6jumCo+S6m+ebuOS/oeaipuaDs+S5i+e+jueahOS6uuOAgicsXG4gICAgYXV0aG9yOiAnRWxlYW5vciBSb29zZXZlbHQnLFxuICAgIGFuc3dlcjogJ2RyZWFtcycsXG4gICAgb3B0aW9uczogWydkcmVhbXMnLCAnaG9wZXMnLCAncGxhbnMnLCAnbWluZHMnXSxcbiAgICBhdXRob3JJbmZvOiAn5Z+D6I6J6K+6wrfnvZfmlq/npo/vvIgxODg0LTE5NjLvvInvvIznvo7lm73liY3nrKzkuIDlpKvkurrjgIHkurrpgZPkuLvkuYnogIUnXG4gIH0sXG4gIHtcbiAgICBlbjogJ0VkdWNhdGlvbiBpcyB0aGUgbW9zdCBwb3dlcmZ1bCBfX18gd2hpY2ggeW91IGNhbiB1c2UgdG8gY2hhbmdlIHRoZSB3b3JsZC4nLFxuICAgIHpoOiAn5pWZ6IKy5piv5L2g6IO955So5p2l5pS55Y+Y5LiW55WM55qE5pyA5pyJ5Yqb55qE5q2m5Zmo44CCJyxcbiAgICBhdXRob3I6ICdOZWxzb24gTWFuZGVsYScsXG4gICAgYW5zd2VyOiAnd2VhcG9uJyxcbiAgICBvcHRpb25zOiBbJ3dlYXBvbicsICd0b29sJywgJ21ldGhvZCcsICdza2lsbCddLFxuICAgIGF1dGhvckluZm86ICfnurPlsJTpgIrCt+abvOW+t+aLie+8iDE5MTgtMjAxM++8ie+8jOWNl+mdnuWJjeaAu+e7n+OAgeWPjeenjeaXj+malOemu+i/kOWKqOmihuiilidcbiAgfSxcbiAge1xuICAgIGVuOiAnUXVhbGl0eSBpcyBub3QgYW4gYWN0LCBpdCBpcyBhIF9fXy4nLFxuICAgIHpoOiAn5ZOB6LSo5LiN5piv5LiA56eN6KGM5Li677yM6ICM5piv5LiA56eN5Lmg5oOv44CCJyxcbiAgICBhdXRob3I6ICdBcmlzdG90bGUnLFxuICAgIGFuc3dlcjogJ2hhYml0JyxcbiAgICBvcHRpb25zOiBbJ2hhYml0JywgJ3NraWxsJywgJ2dpZnQnLCAncnVsZSddLFxuICAgIGF1dGhvckluZm86ICfkuprph4zlo6vlpJrlvrfvvIjliY0zODQt5YmNMzIy77yJ77yM5Y+k5biM6IWK5ZOy5a2m5a62J1xuICB9LFxuICB7XG4gICAgZW46ICdObyBwYWluLCBubyBfX18uJyxcbiAgICB6aDogJ+ayoeacieS7mOWHuuWwseayoeacieaUtuiOt+OAgicsXG4gICAgYW5zd2VyOiAnZ2FpbicsXG4gICAgb3B0aW9uczogWydnYWluJywgJ3Jlc3VsdCcsICdwcml6ZScsICdhd2FyZCddLFxuICAgIGF1dGhvckluZm86ICfoi7Hor63osJror63vvIzmhI/kuLrkuI3lirPml6DojrcnXG4gIH0sXG4gIHtcbiAgICBlbjogJ0Egam91cm5leSBvZiBhIHRob3VzYW5kIG1pbGVzIGJlZ2lucyB3aXRoIGEgc2luZ2xlIF9fXy4nLFxuICAgIHpoOiAn5Y2D6YeM5LmL6KGM77yM5aeL5LqO6Laz5LiL44CCJyxcbiAgICBhbnN3ZXI6ICdzdGVwJyxcbiAgICBvcHRpb25zOiBbJ3N0ZXAnLCAnbW92ZScsICd3YWxrJywgJ3N0YXJ0J10sXG4gICAgYXV0aG9ySW5mbzogJ+WHuuiHquOAiumBk+W+t+e7j+OAi++8jOiLseivreW4uOeUqOiwmuivrSdcbiAgfSxcbiAge1xuICAgIGVuOiAnQmV0dGVyIGxhdGUgdGhhbiBfX18uJyxcbiAgICB6aDogJ+i/n+WBmuaAu+avlOS4jeWBmuWlveOAgicsXG4gICAgYW5zd2VyOiAnbmV2ZXInLFxuICAgIG9wdGlvbnM6IFsnbmV2ZXInLCAnZXZlcicsICdhbHdheXMnLCAnbm9uZSddLFxuICAgIGF1dGhvckluZm86ICfoi7Hor63osJror63vvIzlvLrosIPlj4rml7booYzliqjnmoTph43opoHmgKcnXG4gIH1cbl07XG5cbi8vIOmaj+acuuiOt+WPluS4gOadoeWhq+epuue7g+S5oO+8iOmBv+W8gOS4iuS4gOadoeeahCBpbmRleO+8iVxuZXhwb3J0IGZ1bmN0aW9uIGdldFJhbmRvbUZpbGxCbGFuayhsYXN0SW5kZXg6IG51bWJlciA9IC0xKTogeyBpdGVtOiBGaWxsQmxhbmtJdGVtOyBpbmRleDogbnVtYmVyIH0ge1xuICBsZXQgaW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBmaWxsQmxhbmtEYXRhLmxlbmd0aCk7XG4gIGlmIChmaWxsQmxhbmtEYXRhLmxlbmd0aCA+IDEpIHtcbiAgICB3aGlsZSAoaW5kZXggPT09IGxhc3RJbmRleCkge1xuICAgICAgaW5kZXggPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBmaWxsQmxhbmtEYXRhLmxlbmd0aCk7XG4gICAgfVxuICB9XG4gIHJldHVybiB7IGl0ZW06IGZpbGxCbGFua0RhdGFbaW5kZXhdLCBpbmRleCB9O1xufVxuIl19