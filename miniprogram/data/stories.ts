// data/stories.ts
// 双语短文故事：句子级中英对齐，支持逐句朗读跟读
// keyWords 自带音标与释义（数据自包含），供文内点拨与生词收集

export interface StorySentence {
  en: string;
  zh: string;
}

export interface StoryWord {
  word: string;
  phonetic: string;
  meaning: string;
}

export interface Story {
  id: string;
  title: string;
  enTitle: string;
  level: 'easy' | 'medium' | 'hard';
  category: string;
  intro: string;
  sentences: StorySentence[];
  keyWords: StoryWord[];
}

export const stories: Story[] = [
  {
    id: 'coffee-morning',
    title: '咖啡馆的早晨',
    enTitle: 'A Coffee Shop Morning',
    level: 'easy',
    category: '生活',
    intro: '一杯热咖啡，治愈平凡的一天。',
    sentences: [
      { en: 'The sun rose slowly over the quiet street.', zh: '太阳在安静的街道上慢慢升起。' },
      { en: 'Inside the small coffee shop, the air smelled warm and sweet.', zh: '小咖啡馆里，空气闻起来又暖又香。' },
      { en: 'Lily stood in line, checking her phone for the time.', zh: '莉莉排着队，看了眼手机上的时间。' },
      { en: 'The young man in front of her was holding three cups.', zh: '她前面那位年轻人正端着三杯咖啡。' },
      { en: '"The third one is for my colleague who never comes in," he smiled.', zh: '"第三杯是给一个从来不进店的同事带的，"他笑着说。' },
      { en: 'Lily smiled back and ordered a simple latte.', zh: '莉莉回以微笑，点了一杯简单的拿铁。' },
      { en: 'Two minutes later, the barista handed her the warm cup.', zh: '两分钟后，咖啡师把温热的杯子递给她。' },
      { en: 'Outside, the morning was finally waking up.', zh: '门外，这座城市正在慢慢苏醒。' },
      { en: 'Sometimes happiness is just a cup of coffee and a kind smile.', zh: '有时，幸福不过是一杯咖啡和一个善意的微笑。' }
    ],
    keyWords: [
      { word: 'sunrise', phonetic: "/'sʌnraiz/", meaning: 'n. 日出' },
      { word: 'line', phonetic: '/lain/', meaning: 'n. 队伍；线' },
      { word: 'colleague', phonetic: "/'kɔli:g/", meaning: 'n. 同事' },
      { word: 'barista', phonetic: "/bə'ri:stə/", meaning: 'n. 咖啡师' },
      { word: 'warm', phonetic: '/wɔ:m/', meaning: 'a. 温暖的' },
      { word: 'kind', phonetic: '/kaind/', meaning: 'a. 友善的；种类' },
      { word: 'wake up', phonetic: '/weik ʌp/', meaning: 'phr. 醒来；唤醒' }
    ]
  },
  {
    id: 'rainy-airport',
    title: '机场的雨天',
    enTitle: 'A Rainy Day at the Airport',
    level: 'easy',
    category: '旅行',
    intro: '航班延误了，但她学到一课：别慌。',
    sentences: [
      { en: 'The airport was noisy with hundreds of voices.', zh: '机场里人声嘈杂，几百个声音混在一起。' },
      { en: 'Rain tapped against the huge glass windows.', zh: '雨水敲打着巨大的玻璃窗。' },
      { en: 'On the screen, many flights showed the word "delayed".', zh: '屏幕上，许多航班都显示着"延误"两个字。' },
      { en: 'Mia checked her boarding pass and sighed.', zh: '米娅看了看登机牌，叹了口气。' },
      { en: 'Her flight to Shanghai was delayed by three hours.', zh: '她飞往上海的航班延误了三个小时。' },
      { en: 'Instead of worrying, she found a quiet corner to read.', zh: '她没有干着急，而是找了个安静的角落看书。' },
      { en: 'Two hours passed without her even noticing.', zh: '两个小时悄悄过去，她甚至都没察觉。' },
      { en: 'When boarding was announced, she felt calm and ready.', zh: '当登机广播响起时，她平静而从容。' },
      { en: 'Sometimes, a little patience turns bad luck into rest.', zh: '有时候，一点耐心能把坏运气变成一次休息。' }
    ],
    keyWords: [
      { word: 'delay', phonetic: "/di'lei/", meaning: 'v./n. 延误；推迟' },
      { word: 'boarding pass', phonetic: "/'bɔ:diŋ pa:s/", meaning: 'phr. 登机牌' },
      { word: 'sigh', phonetic: '/sai/', meaning: 'v./n. 叹气' },
      { word: 'corner', phonetic: "/'kɔ:nə/", meaning: 'n. 角落' },
      { word: 'announce', phonetic: "/ə'nauns/", meaning: 'v. 宣布；广播' },
      { word: 'patience', phonetic: "/'peiʃəns/", meaning: 'n. 耐心' },
      { word: 'calm', phonetic: '/ka:m/', meaning: 'a. 平静的' }
    ]
  },
  {
    id: 'lost-puppy',
    title: '走失的小狗',
    enTitle: 'The Lost Puppy',
    level: 'easy',
    category: '暖心',
    intro: '一只小狗，让整个小区的心软了下来。',
    sentences: [
      { en: 'After school, Tom saw a small brown dog sitting alone.', zh: '放学后，汤姆看到一只棕色的小狗独自坐着。' },
      { en: 'It looked at him with big, worried eyes.', zh: '它用一双大而担忧的眼睛望着他。' },
      { en: 'Tom knelt down and offered it half of his sandwich.', zh: '汤姆蹲下来，把三明治分了一半给它。' },
      { en: 'The dog ate quickly, then followed him home.', zh: '小狗飞快地吃完，然后一路跟着他回了家。' },
      { en: 'Tom posted a photo in the community group that evening.', zh: '当天晚上，汤姆在小区群里发了一张照片。' },
      { en: 'Within an hour, a little girl answered, crying with joy.', zh: '一小时内，一个小女孩回复了，喜极而泣。' },
      { en: 'It turned out the puppy had slipped out of her garden.', zh: '原来，小狗是从她家花园里溜出来的。' },
      { en: 'Tom felt warm inside, watching them run to each other.', zh: '看着她们奔向彼此，汤姆心里暖暖的。' },
      { en: 'A small act of kindness can bring two hearts together.', zh: '一个小小的善举，能让两颗心紧紧相连。' }
    ],
    keyWords: [
      { word: 'puppy', phonetic: "/'pʌpi/", meaning: 'n. 小狗' },
      { word: 'kneel', phonetic: '/ni:l/', meaning: 'v. 跪下；蹲下' },
      { word: 'offer', phonetic: "/'ɔfə/", meaning: 'v. 提供；主动给' },
      { word: 'community', phonetic: "/kə'mju:nəti/", meaning: 'n. 社区；群体' },
      { word: 'slip', phonetic: '/slip/', meaning: 'v. 溜走；滑' },
      { word: 'joy', phonetic: '/dʒɔi/', meaning: 'n. 喜悦' },
      { word: 'kindness', phonetic: "/'kaindnis/", meaning: 'n. 善良；好意' }
    ]
  },
  {
    id: 'first-english-class',
    title: '第一节英语课',
    enTitle: 'My First English Class',
    level: 'easy',
    category: '校园',
    intro: '第一次开口说英语，谁都会紧张。',
    sentences: [
      { en: 'On the first day of school, I walked into the English classroom with a racing heart.', zh: '开学第一天，我心跳加速地走进英语教室。' },
      { en: 'The teacher wrote her name on the board: Ms. Green.', zh: '老师在黑板上写下她的名字：格林老师。' },
      { en: '"Hello everyone, today we will talk about our dreams," she said.', zh: '"大家好，今天我们来聊聊梦想，"她说。' },
      { en: 'My hands were sweating when she looked at me.', zh: '当她看向我时，我手心直冒汗。' },
      { en: 'I stood up and whispered, "I want to see the sea one day."', zh: '我站起来，小声说："我想有一天去看看大海。"' },
      { en: 'The class went quiet for a moment.', zh: '教室里安静了一瞬。' },
      { en: 'Then Ms. Green smiled and said, "That is a beautiful dream, and I believe you will."', zh: '然后格林老师笑了："这是个美好的梦想，我相信你一定能实现。"' },
      { en: 'From that moment, English no longer felt so scary.', zh: '从那一刻起，英语好像没那么可怕了。' },
      { en: 'It is not about being perfect; it is about trying.', zh: '重要的不是说得完美，而是敢于尝试。' }
    ],
    keyWords: [
      { word: 'racing', phonetic: "/'reisiŋ/", meaning: 'a. 狂跳的；疾驰的' },
      { word: 'sweat', phonetic: '/swet/', meaning: 'v./n. 出汗；汗' },
      { word: 'whisper', phonetic: "/'wispə/", meaning: 'v. 低语；耳语' },
      { word: 'dream', phonetic: '/dri:m/', meaning: 'n. 梦想；梦' },
      { word: 'scary', phonetic: "/'skeəri/", meaning: 'a. 吓人的' },
      { word: 'perfect', phonetic: "/'pə:fikt/", meaning: 'a. 完美的' },
      { word: 'try', phonetic: '/trai/', meaning: 'v. 尝试' }
    ]
  },
  {
    id: 'small-habits',
    title: '小习惯的力量',
    enTitle: 'The Power of Small Habits',
    level: 'medium',
    category: '成长',
    intro: '每天进步 1%，一年后你会强 37 倍。',
    sentences: [
      { en: 'We often think success comes from one great moment.', zh: '我们总以为成功来自某个了不起的瞬间。' },
      { en: 'But more often, it is built from tiny habits repeated daily.', zh: '但更多时候，它是由每天重复的微小习惯堆砌而成。' },
      { en: 'Imagine improving yourself by just one percent every day.', zh: '想象一下，每天只让自己进步百分之一。' },
      { en: 'It seems too small to notice at first.', zh: '起初，它小到几乎察觉不到。' },
      { en: 'Yet after a year, that one percent compounds to nearly thirty-seven times better.', zh: '但一年之后，这百分之一会复利放大到接近三十七倍的进步。' },
      { en: 'A habit is like a routine that your brain stops resisting.', zh: '习惯，是一种你的大脑不再抗拒的日常程序。' },
      { en: 'The trick is to make the habit tiny and the trigger clear.', zh: '诀窍是把习惯变得足够小，把触发它的信号变得足够清晰。' },
      { en: 'Instead of "read for an hour", try "read one page".', zh: '与其说"读一小时书"，不如试试"读一页"。' },
      { en: 'Small actions create momentum, and momentum creates change.', zh: '小行动带来势头，势头带来改变。' },
      { en: 'You do not rise to the level of your goals; you fall to the level of your systems.', zh: '你不会上升到目标的高度，而是会落到自己系统的水平。' },
      { en: 'So start small, stay consistent, and let time do the heavy lifting.', zh: '所以，从小处开始，保持稳定，把剩下的交给时间。' }
    ],
    keyWords: [
      { word: 'habit', phonetic: "/'hæbit/", meaning: 'n. 习惯' },
      { word: 'compound', phonetic: '/kəmˈpaʊnd/', meaning: 'v. 复利增长；使加重' },
      { word: 'routine', phonetic: "/ru:'ti:n/", meaning: 'n. 常规；例行程序' },
      { word: 'resist', phonetic: "/ri'zist/", meaning: 'v. 抵抗；抗拒' },
      { word: 'trigger', phonetic: "/'trigə/", meaning: 'n. 触发器；扳机' },
      { word: 'momentum', phonetic: "/məu'mentəm/", meaning: 'n. 势头；动量' },
      { word: 'consistent', phonetic: "/kən'sistənt/", meaning: 'a. 持续的；一致的' }
    ]
  },
  {
    id: 'coffee-history',
    title: '咖啡如何改变世界',
    enTitle: 'How Coffee Changed the World',
    level: 'medium',
    category: '科普',
    intro: '从山羊的发现，到全球清晨的香气。',
    sentences: [
      { en: 'Legend says a shepherd once noticed his goats dancing with energy.', zh: '传说有位牧羊人发现他的山羊精神得跳起舞来。' },
      { en: 'They had eaten bright red berries from a mysterious plant.', zh: '它们吃了某种神秘植物上鲜红的浆果。' },
      { en: 'That plant, of course, was coffee.', zh: '那种植物，自然就是咖啡。' },
      { en: 'From Africa, coffee spread to the Middle East and then to Europe.', zh: '咖啡从非洲传到中东，再传到欧洲。' },
      { en: 'In the seventeenth century, coffeehouses became places of lively discussion.', zh: '十七世纪，咖啡馆成了热闹议论的场所。' },
      { en: 'Writers, traders and scientists gathered there to exchange ideas.', zh: '作家、商人和科学家聚在那里交换想法。' },
      { en: 'Many historians believe these conversations helped fuel the Age of Enlightenment.', zh: '许多历史学家相信，这些交谈推动了启蒙时代。' },
      { en: 'Today, over two billion cups are drunk around the world every day.', zh: '如今，全世界每天要喝掉二十多亿杯咖啡。' },
      { en: 'A small berry shaped politics, art and the rhythm of our mornings.', zh: '一颗小小的浆果，塑造了政治、艺术，以及我们每个早晨的节奏。' }
    ],
    keyWords: [
      { word: 'shepherd', phonetic: "/'ʃepəd/", meaning: 'n. 牧羊人' },
      { word: 'berry', phonetic: "/'beri/", meaning: 'n. 浆果' },
      { word: 'mysterious', phonetic: "/mis'tiəriəs/", meaning: 'a. 神秘的' },
      { word: 'spread', phonetic: '/spred/', meaning: 'v. 传播；蔓延' },
      { word: 'exchange', phonetic: "/iks'tʃeindʒ/", meaning: 'v./n. 交换' },
      { word: 'fuel', phonetic: '/fjuəl/', meaning: 'v./n. 助长；燃料' },
      { word: 'rhythm', phonetic: "/'riðəm/", meaning: 'n. 节奏' }
    ]
  },
  {
    id: 'big-city-interview',
    title: '大城市的一场面试',
    enTitle: 'A Job Interview in a Big City',
    level: 'medium',
    category: '职场',
    intro: '紧张不是敌人，准备才是朋友。',
    sentences: [
      { en: 'The skyscraper seemed to touch the clouds as Jack entered the lobby.', zh: '杰克走进大堂时，摩天大楼仿佛直入云霄。' },
      { en: 'His new suit felt stiff and his palms were cold.', zh: '他的新西装显得僵硬，手心冰凉。' },
      { en: 'The elevator rose thirty floors in silence.', zh: '电梯在沉默中上升了三十层。' },
      { en: 'In the meeting room, the interviewer asked a simple question: "Why us?"', zh: '在会议室里，面试官问了一个简单的问题："为什么选我们？"' },
      { en: 'Jack paused, then spoke from his heart about learning and growth.', zh: '杰克停顿了一下，然后发自内心地谈起学习与成长。' },
      { en: 'He talked about mistakes he had made and lessons he had kept.', zh: '他谈起自己犯过的错，和一直记着的教训。' },
      { en: 'The interviewer leaned back and smiled.', zh: '面试官向后靠了靠，露出微笑。' },
      { en: '"Honesty and curiosity," she said, "are exactly what we are looking for."', zh: '"诚实和好奇心，"她说，"正是我们在找的。"' },
      { en: 'Confidence, Jack learned, does not mean knowing everything.', zh: '杰克明白了，自信并不意味着什么都懂。' },
      { en: 'It means being brave enough to say, "I can learn."', zh: '而是敢于说出："我可以学。"' }
    ],
    keyWords: [
      { word: 'skyscraper', phonetic: "/'skaiˌskreipə/", meaning: 'n. 摩天大楼' },
      { word: 'lobby', phonetic: "/'lɔbi/", meaning: 'n. 大堂；门厅' },
      { word: 'elevator', phonetic: "/'eliveitə/", meaning: 'n. 电梯' },
      { word: 'interviewer', phonetic: "/'intəvju:ə/", meaning: 'n. 面试官' },
      { word: 'curiosity', phonetic: "/,kjuəri'ɔsəti/", meaning: 'n. 好奇心' },
      { word: 'honesty', phonetic: "/'ɔnisti/", meaning: 'n. 诚实' },
      { word: 'brave', phonetic: '/breiv/', meaning: 'a. 勇敢的' }
    ]
  },
  {
    id: 'echo-mountain',
    title: '会回话的山',
    enTitle: 'The Mountain That Calls Back',
    level: 'medium',
    category: '自然',
    intro: '你对大山喊什么，大山就回你什么。',
    sentences: [
      { en: 'At dawn, a small group of hikers began climbing the grey mountain.', zh: '黎明时分，一小队徒步者开始攀登那座灰色的山。' },
      { en: 'The air was thin and cold, and the path was steep.', zh: '空气稀薄而寒冷，山路陡峭。' },
      { en: 'Halfway up, a young girl stopped and shouted into the valley.', zh: '爬到一半，一个小女孩停下来，朝山谷大喊。' },
      { en: '"Hello!" she cried, and the mountain answered, "Hello!"', zh: '"你好！"她喊道，大山回应道："你好！"' },
      { en: 'Everyone laughed at the magic of the echo.', zh: '大家都被这回声的奇妙逗笑了。' },
      { en: 'Her mother whispered, "Whatever you say to the mountain, it gives back."', zh: '妈妈轻声说："你对大山说什么，它就会还给你什么。"' },
      { en: 'The girl thought for a while, then shouted, "I am brave!"', zh: '女孩想了想，又喊："我很勇敢！"' },
      { en: 'The mountain carried her voice far across the rocks.', zh: '大山把她的声音传过重重岩石。' },
      { en: 'And somewhere inside her, the words seemed to take root.', zh: '而在这位女孩心里，这句话仿佛生了根。' }
    ],
    keyWords: [
      { word: 'hiker', phonetic: "/'haikə/", meaning: 'n. 徒步者；远足者' },
      { word: 'dawn', phonetic: '/dɔ:n/', meaning: 'n. 黎明' },
      { word: 'steep', phonetic: '/sti:p/', meaning: 'a. 陡峭的' },
      { word: 'valley', phonetic: "/'væli/", meaning: 'n. 山谷' },
      { word: 'echo', phonetic: "/'ekəu/", meaning: 'n./v. 回声；回荡' },
      { word: 'whisper', phonetic: "/'wispə/", meaning: 'v. 低语' },
      { word: 'take root', phonetic: '/teik ru:t/', meaning: 'phr. 生根；扎根' }
    ]
  },
  {
    id: 'library-history',
    title: '图书馆的千年旅程',
    enTitle: 'The Thousand-Year Journey of the Library',
    level: 'hard',
    category: '人文',
    intro: '人类把记忆放在纸页里，一代代传递。',
    sentences: [
      { en: 'Nearly two thousand years ago, the great library of Alexandria stood as a beacon of human knowledge.', zh: '约两千年前，伟大的亚历山大图书馆是人类知识的灯塔。' },
      { en: 'Scholars traveled from distant lands to study its scrolls.', zh: '学者们从远方而来，研读它的卷轴。' },
      { en: 'When the library was destroyed, a whole era of wisdom was lost forever.', zh: '当它被毁时，整整一个时代的智慧永远失落了。' },
      { en: 'Yet the idea of the library refused to disappear.', zh: '然而，图书馆这一理念拒绝消失。' },
      { en: 'Monks in Europe carefully copied manuscripts by candlelight, preserving fragments of the past.', zh: '欧洲的僧侣借着烛光精心抄写手稿，保存下过去的碎片。' },
      { en: 'Centuries later, the printing press made books affordable to ordinary people.', zh: '几百年后，印刷术让普通人也能买得起书。' },
      { en: 'Public libraries spread across cities, opening doors to anyone who wished to learn.', zh: '公共图书馆在城市中蔓延，向任何想学习的人敞开了大门。' },
      { en: 'Today, a single library can hold millions of volumes, and a smartphone can hold millions more.', zh: '今天，一座图书馆可藏百万册书，一部手机能装下的还要多得多。' },
      { en: 'What never changes is the promise behind every shelf.', zh: '永远不变的，是每一排书架背后的承诺。' },
      { en: 'That someone, somewhere, cared enough to write it down and keep it safe.', zh: '那就是：有人在某个地方，足够在乎地把它们写下来并好好保存。' }
    ],
    keyWords: [
      { word: 'beacon', phonetic: "/'bi:kən/", meaning: 'n. 灯塔；信标' },
      { word: 'scholar', phonetic: "/'skɔlə/", meaning: 'n. 学者' },
      { word: 'scroll', phonetic: '/skrəul/', meaning: 'n. 卷轴' },
      { word: 'wisdom', phonetic: "/'wizdəm/", meaning: 'n. 智慧' },
      { word: 'monk', phonetic: '/mʌŋk/', meaning: 'n. 僧侣；修士' },
      { word: 'manuscript', phonetic: "/'mænjuskript/", meaning: 'n. 手稿' },
      { word: 'fragment', phonetic: "/'frægmənt/", meaning: 'n. 碎片；片段' },
      { word: 'preserve', phonetic: "/pri'zə:v/", meaning: 'v. 保存；保护' }
    ]
  },
  {
    id: 'invisible-currency',
    title: '时间：无形的货币',
    enTitle: 'Time: The Invisible Currency',
    level: 'hard',
    category: '哲思',
    intro: '你如何度过每一天，就是你如何度过一生。',
    sentences: [
      { en: 'Money can be earned, saved, and spent, but time can only be spent.', zh: '钱可以赚、可以存、可以花，但时间只能花掉。' },
      { en: 'Every morning, each of us receives the same daily deposit: eighty-six thousand four hundred seconds.', zh: '每天早晨，我们每个人都收到同样一笔日存款：八万六千四百秒。' },
      { en: 'There is no bank to store it and no way to recover a wasted hour.', zh: '没有银行能替你储存，浪费掉的一小时也无法取回。' },
      { en: 'Yet most of us treat time as if it were endlessly renewable.', zh: '然而大多数人把时间当作可以无限再生的东西。' },
      { en: 'We scroll, we wait, we postpone what actually matters.', zh: '我们刷着屏幕，干等着，把真正重要的事一再推迟。' },
      { en: 'The wise do not try to own time; they try to inhabit it.', zh: '聪明的人不试图占有时间，而是试图真正地活在时间里。' },
      { en: 'They choose a few deep things over many shallow ones.', zh: '他们宁可选择几件深刻的事，也不要许多浅薄的事。' },
      { en: 'Attention, in the end, is the purest form of love.', zh: '说到底，注意力是最纯粹的一种爱。' },
      { en: "So ask yourself tonight: where did this day's deposit go?", zh: '所以今晚问问自己：今天的存款，都花到哪里去了？' }
    ],
    keyWords: [
      { word: 'currency', phonetic: "/'kʌrənsi/", meaning: 'n. 货币；通货' },
      { word: 'deposit', phonetic: "/di'pɔzit/", meaning: 'n. 存款；押金' },
      { word: 'recover', phonetic: "/ri'kʌvə/", meaning: 'v. 收回；恢复' },
      { word: 'renewable', phonetic: "/ri'nju:əbl/", meaning: 'a. 可再生的' },
      { word: 'postpone', phonetic: '/pəustˈpəun/', meaning: 'v. 推迟' },
      { word: 'inhabit', phonetic: "/in'hæbit/", meaning: 'v. 居住于；栖居' },
      { word: 'shallow', phonetic: "/'ʃæləu/", meaning: 'a. 浅薄的；浅的' },
      { word: 'attention', phonetic: "/ə'tenʃən/", meaning: 'n. 注意力' }
    ]
  }
];
