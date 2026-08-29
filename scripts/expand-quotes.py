# 向 quotes.ts 的 quotes 数组追加扩充金句（避免与现有重复）
import io, json, re

FP = 'miniprogram/data/quotes.ts'
src = io.open(FP, encoding='utf-8').read()

# 提取现有英文句子做去重
existing = set(re.findall(r"en: '((?:[^'\\]|\\.)*)'", src))

NEW = [
  # ── 经典谚语 ──
  ('Every cloud has a silver lining.', '黑暗中总有一线光明。', '', ['cloud', 'silver', 'lining']),
  ('Practice what you preach.', '言行一致，身体力行。', '', ['practice', 'preach']),
  ('Two heads are better than one.', '三个臭皮匠，顶个诸葛亮。', '', ['head', 'better']),
  ('When in Rome, do as the Romans do.', '入乡随俗。', '', ['rome', 'roman']),
  ('The grass is always greener on the other side.', '这山望着那山高。', '', ['grass', 'green', 'side']),
  ('A friend in need is a friend indeed.', '患难见真情。', '', ['friend', 'need', 'indeed']),
  ('Strike while the iron is hot.', '趁热打铁。', '', ['strike', 'iron', 'hot']),
  ('Do not put all your eggs in one basket.', '不要把鸡蛋放在同一个篮子里。', '', ['egg', 'basket']),
  ('Time flies when you are having fun.', '欢乐时光过得快。', '', ['time', 'fly', 'fun']),
  ('Haste makes waste.', '欲速则不达。', '', ['haste', 'waste']),
  ('It never rains but it pours.', '不鸣则已，一鸣惊人。（祸不单行）', '', ['rain', 'pour']),
  ('Kill two birds with one stone.', '一箭双雕。', '', ['bird', 'stone']),
  ('Love me, love my dog.', '爱屋及乌。', '', ['love', 'dog']),
  ('Many hands make light work.', '人多好办事。', '', ['hand', 'light', 'work']),
  ('Out of sight, out of mind.', '眼不见，心不烦。', '', ['sight', 'mind']),
  ('The pen is mightier than the sword.', '笔耕强于剑伐。', '', ['pen', 'mighty', 'sword']),
  ('Time is money.', '一寸光阴一寸金。', '', ['time', 'money']),
  ('You cannot judge a book by its cover.', '人不可貌相。', '', ['judge', 'cover']),
  ('A picture is worth a thousand words.', '一图胜千言。', '', ['picture', 'worth', 'thousand']),
  ('All roads lead to Rome.', '条条大路通罗马。', '', ['road', 'lead', 'rome']),
  ('An apple a day keeps the doctor away.', '一天一苹果，医生远离我。', '', ['apple', 'doctor', 'away']),
  ('Beauty is in the eye of the beholder.', '情人眼里出西施。', '', ['beauty', 'eye', 'beholder']),
  ('Curiosity killed the cat.', '好奇害死猫。', '', ['curiosity', 'kill', 'cat']),
  ('Do not count your chickens before they hatch.', '小鸡孵出前，别急着数。', '', ['count', 'chicken', 'hatch']),
  ('Easy come, easy go.', '来得容易，去得也快。', '', ['easy', 'come', 'go']),
  ('Every dog has its day.', '人人皆有得意时。', '', ['dog', 'day']),
  ('Fortune favors the bold.', '好运眷顾勇者。', 'Virgil', ['fortune', 'favor', 'bold']),
  ('Great minds think alike.', '英雄所见略同。', '', ['great', 'mind', 'think', 'alike']),
  ('If at first you do not succeed, try, try again.', '如果初次不成功，再接再厉。', '', ['succeed', 'try', 'again']),
  ('Laughter is the best medicine.', '笑是最好的良药。', '', ['laughter', 'best', 'medicine']),

  # ── 名人名言 ──
  ('To be, or not to be, that is the question.', '生存还是毁灭，这是一个问题。', 'Shakespeare', ['question']),
  ('I think, therefore I am.', '我思故我在。', 'Descartes', ['think', 'therefore']),
  ('That which does not kill us makes us stronger.', '那些杀不死我们的，使我们更强大。', 'Nietzsche', ['kill', 'strong']),
  ('In the middle of difficulty lies opportunity.', '困难之中蕴藏机遇。', 'Albert Einstein', ['difficulty', 'lie', 'opportunity']),
  ('Life is like riding a bicycle. To keep your balance, you must keep moving.', '人生如骑自行车，想保持平衡就得往前走。', 'Albert Einstein', ['bicycle', 'balance', 'move']),
  ('The only limit to our realization of tomorrow will be our doubts of today.', '实现明天理想的唯一障碍，是今天的疑虑。', 'Franklin Roosevelt', ['limit', 'realization', 'doubt', 'today']),
  ('Success is not final, failure is not fatal: it is the courage to continue that counts.', '成功不是终点，失败也非末日：重要的是继续前行的勇气。', 'Winston Churchill', ['success', 'final', 'fatal', 'courage', 'continue', 'count']),
  ('We make a living by what we get, but we make a life by what we give.', '我们靠所得谋生，靠给予生活。', 'Winston Churchill', ['living', 'get', 'give']),
  ('Be the change that you wish to see in the world.', '欲变世界，先变其身。', 'Mahatma Gandhi', ['change', 'wish', 'world']),
  ('Live as if you were to die tomorrow. Learn as if you were to live forever.', '像明天就要死去那样生活，像永远不会死去那样学习。', 'Mahatma Gandhi', ['live', 'die', 'learn', 'forever']),
  ('The journey of a thousand miles begins with one step.', '千里之行，始于足下。', 'Lao Tzu', ['journey', 'thousand', 'step']),
  ('It does not matter how slowly you go as long as you do not stop.', '不怕慢，只怕停。', 'Confucius', ['matter', 'slowly', 'stop']),
  ('Our greatest glory is not in never falling, but in rising every time we fall.', '最伟大的光荣不在于从不跌倒，而在于每次跌倒后都能爬起。', 'Confucius', ['glory', 'fall', 'rise']),
  ('The man who moves a mountain begins by carrying away small stones.', '移山之人，始于搬运小块石头。', 'Confucius', ['move', 'mountain', 'carry', 'stone']),
  ('Genius is one percent inspiration and ninety-nine percent perspiration.', '天才是百分之一的灵感加百分之九十九的汗水。', 'Thomas Edison', ['genius', 'percent', 'inspiration', 'perspiration']),
  ('I have not failed. I have just found ten thousand ways that will not work.', '我没有失败，只是发现了一万种行不通的方法。', 'Thomas Edison', ['fail', 'found', 'thousand']),
  ('An investment in knowledge pays the best interest.', '投资知识，收益最佳。', 'Benjamin Franklin', ['investment', 'knowledge', 'pay', 'interest']),
  ('Tell me and I forget. Teach me and I remember. Involve me and I learn.', '告诉我，我会忘记；教给我，我会记住；让我参与，我才能学会。', 'Benjamin Franklin', ['forget', 'teach', 'remember', 'involve', 'learn']),
  ('Twenty years from now you will be more disappointed by the things you did not do than by the ones you did.', '二十年后，让你更遗憾的不是做过的事，而是没做的事。', 'Mark Twain', ['twenty', 'disappointed', 'thing']),
  ('The secret of getting ahead is getting started.', '取得领先的秘诀，就是开始行动。', 'Mark Twain', ['secret', 'ahead', 'start']),
  ('Dreams do not work unless you do.', '不行动，梦想就是空想。', 'John C. Maxwell', ['dream', 'work']),
  ('Do what you can, with what you have, where you are.', '用你所有的，在你所在之处，做你能做的。', 'Theodore Roosevelt', ['can', 'have', 'where']),
  ('It always seems impossible until it is done.', '事情总是在完成之前显得不可能。', 'Nelson Mandela', ['seem', 'impossible', 'done']),
  ('Education is the most powerful weapon which you can use to change the world.', '教育是你用来改变世界的最强大武器。', 'Nelson Mandela', ['education', 'powerful', 'weapon', 'change']),
  ('A reader lives a thousand lives before he dies. The man who never reads lives only one.', '读书人经历千种人生，不读书的人只活一次。', 'George R.R. Martin', ['reader', 'thousand', 'die', 'read']),
  ('You are never too old to set another goal or to dream a new dream.', '设定新目标、追逐新梦想，永远都不晚。', 'C.S. Lewis', ['old', 'goal', 'dream']),
  ('The best time to plant a tree was twenty years ago. The second best time is now.', '种一棵树最好的时间是二十年前，其次是现在。', '', ['plant', 'tree', 'best', 'ago', 'now']),
  ('Fall seven times, stand up eight.', '跌倒七次，站起来八次。', '', ['fall', 'seven', 'stand']),
  ('Stars cannot shine without darkness.', '没有黑暗，星辰无法闪耀。', '', ['star', 'shine', 'darkness']),
  ('Little by little, one travels far.', '积跬步，致千里。', 'J.R.R. Tolkien', ['little', 'travel', 'far']),
  ('Nothing is impossible, the word itself says "I am possible"!', '没有什么不可能，"不可能"这个词本身就藏着"我是可能的"！', 'Audrey Hepburn', ['impossible', 'word', 'possible']),
  ('Keep your face always toward the sunshine, and shadows will fall behind you.', '永远面向阳光，阴影就会落在身后。', 'Walt Whitman', ['face', 'toward', 'sunshine', 'shadow']),
  ('What we know is a drop, what we do not know is an ocean.', '已知是一滴水，未知是汪洋大海。', 'Isaac Newton', ['know', 'drop', 'ocean']),
  ('If you want to go fast, go alone. If you want to go far, go together.', '独行快，众行远。', '', ['fast', 'alone', 'together']),
  ('A smooth sea never made a skilled sailor.', '风平浪静练不出好水手。', '', ['smooth', 'sea', 'skilled', 'sailor']),
  ('Doubt kills more dreams than failure ever will.', '比起失败，怀疑扼杀了更多梦想。', '', ['doubt', 'kill', 'dream', 'failure']),
  ('Do not watch the clock. Do what it does. Keep going.', '别盯着时钟看，学它一直走。', 'Sam Levenson', ['watch', 'clock', 'keep', 'going']),
  ('Perseverance is not a long race; it is many short races one after the other.', '坚持不是一场长跑，而是一场接一场的短跑。', 'Walter Elliot', ['perseverance', 'race', 'short']),
  ('Great things are done by a series of small things brought together.', '伟大的成就，源于一系列小事的汇聚。', 'Vincent Van Gogh', ['series', 'small', 'together']),
  ('Simplicity is the ultimate sophistication.', '大道至简。', 'Leonardo da Vinci', ['simplicity', 'ultimate', 'sophistication']),
  ('Learning never exhausts the mind.', '学习永远不会让大脑疲惫。', 'Leonardo da Vinci', ['learning', 'exhaust', 'mind']),
  ('The more that you read, the more things you will know.', '读得越多，知道得越多。', 'Dr. Seuss', ['read', 'more', 'know']),
  ('Play is the highest form of research.', '玩耍是最高形式的研究。', 'Albert Einstein', ['play', 'highest', 'form', 'research']),
  ('Once you learn to read, you will be forever free.', '一旦学会阅读，你将永远自由。', 'Frederick Douglass', ['learn', 'read', 'forever', 'free']),
  ('Words are, in my not-so-humble opinion, our most inexhaustible source of magic.', '依我之见，词语是我们最取之不尽的魔力源泉。', 'J.K. Rowling', ['word', 'humble', 'opinion', 'source', 'magic']),
]

block = []
added = 0
for en, zh, author, words in NEW:
    if en in existing:
        continue
    existing.add(en)
    lines = [
      '  {',
      f"    en: '{en}',",
      f"    zh: '{zh}',",
    ]
    if author:
      lines.append(f"    author: '{author}',")
    lines.append('    words: ' + json.dumps(words, ensure_ascii=False))
    lines.append('  },')
    block.append('\n'.join(lines))
    added += 1

anchor = "  }\n];"
idx = src.find(anchor)
assert idx > 0, 'anchor not found'
insert = ',\n' + '\n'.join(block) + '\n];'
src = src[:idx] + insert + src[idx + len(anchor):]

io.open(FP, 'w', encoding='utf-8').write(src)
print(f'added {added}, total now {len(existing)}')
