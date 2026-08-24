// data/scenes.ts
// 情景剧本：把词汇放进真实生活场景，先读剧本，再做场景词演练
// 每个关键词自带音标与释义（数据自包含，不依赖词书），context 为该词在剧本中的语境句

export interface SceneWord {
  word: string;
  phonetic: string;
  meaning: string;
  context: string; // 剧中语境句（英文）
}

export interface SceneLine {
  speaker: 'A' | 'B';
  en: string;
  zh: string;
}

export interface Scene {
  id: string;
  title: string;     // 中文名
  enTitle: string;   // 英文名
  subtitle: string;  // 一句话介绍
  level: 'easy' | 'medium' | 'hard';
  setting: string;   // 场景设定说明
  dialogue: SceneLine[];
  keyWords: SceneWord[];
}

export const scenes: Scene[] = [
  {
    id: 'coffee',
    title: '咖啡馆点单',
    enTitle: 'At the Coffee Shop',
    subtitle: '点一杯拿铁，从 size 说到 oat milk',
    level: 'easy',
    setting: '午后，你走进街角的小咖啡馆，吧台后的店员正在擦拭咖啡机。',
    dialogue: [
      { speaker: 'B', en: 'Hi there! What can I get for you today?', zh: '你好呀！今天想喝点什么？' },
      { speaker: 'A', en: 'A latte, please. Medium size.', zh: '一杯拿铁，中杯谢谢。' },
      { speaker: 'B', en: 'Sure. Would you like it with regular milk or oat milk?', zh: '好的。要普通牛奶还是燕麦奶？' },
      { speaker: 'A', en: 'Oat milk. And less sugar, please.', zh: '燕麦奶，另外少放糖。' },
      { speaker: 'B', en: 'Got it. For here or takeaway?', zh: '没问题。堂食还是外带？' },
      { speaker: 'A', en: 'Takeaway. Could I have the receipt as well?', zh: '外带。也请把小票给我。' }
    ],
    keyWords: [
      { word: 'order', phonetic: "/'ɔ:də/", meaning: 'n./v. 点单；命令；顺序', context: 'What can I get for you today?' },
      { word: 'size', phonetic: '/saiz/', meaning: 'n. 尺寸；大小', context: 'Medium size.' },
      { word: 'regular', phonetic: "/'regjulə/", meaning: 'a. 普通的；常规的；有规律的', context: 'Regular milk or oat milk?' },
      { word: 'sugar', phonetic: "/'ʃugə/", meaning: 'n. 糖', context: 'Less sugar, please.' },
      { word: 'takeaway', phonetic: "/'teikəwei/", meaning: 'n./a. 外带（的）', context: 'For here or takeaway?' },
      { word: 'receipt', phonetic: "/ri'si:t/", meaning: 'n. 收据；小票', context: 'Could I have the receipt?' },
      { word: 'counter', phonetic: "/'kauntə/", meaning: 'n. 柜台', context: 'Standing at the counter.' },
      { word: 'flavor', phonetic: "/'fleivə/", meaning: 'n. 风味；口味', context: 'A new flavor of latte.' }
    ]
  },
  {
    id: 'airport',
    title: '机场值机',
    enTitle: 'Airport Check-in',
    subtitle: '托运行李、选座、赶登机口，一套走完',
    level: 'medium',
    setting: '清晨的国际航站楼，你拖着行李箱走到值机柜台前。',
    dialogue: [
      { speaker: 'B', en: 'Good morning. May I see your passport, please?', zh: '早上好，请出示您的护照。' },
      { speaker: 'A', en: 'Here you are. I have one suitcase to check in.', zh: '给您。我有一只行李箱要托运。' },
      { speaker: 'B', en: 'Please put it on the scale. Any window seat or aisle seat?', zh: '请放到传送带上。要靠窗还是靠走道的座位？' },
      { speaker: 'A', en: 'Window seat, please. What time does boarding start?', zh: '靠窗的谢谢。几点开始登机？' },
      { speaker: 'B', en: 'Boarding begins at 8:40 at Gate 12. Please keep your boarding pass handy.', zh: '8点40分在12号登机口开始登机，请拿好登机牌。' }
    ],
    keyWords: [
      { word: 'passport', phonetic: "/'pa:spɔ:t/", meaning: 'n. 护照', context: 'May I see your passport?' },
      { word: 'check in', phonetic: '/tʃek in/', meaning: 'phr. 办理值机；登记入住', context: 'I have one suitcase to check in.' },
      { word: 'suitcase', phonetic: "/'su:tkeis/", meaning: 'n. 行李箱', context: 'One suitcase to check in.' },
      { word: 'aisle', phonetic: '/ail/', meaning: 'n. 走道；通道', context: 'Window seat or aisle seat?' },
      { word: 'boarding pass', phonetic: "/'bɔ:diŋ pa:s/", meaning: 'phr. 登机牌', context: 'Keep your boarding pass handy.' },
      { word: 'gate', phonetic: '/geit/', meaning: 'n. 登机口；大门', context: 'Boarding at Gate 12.' },
      { word: 'delay', phonetic: "/di'lei/", meaning: 'n./v. 延误；推迟', context: 'The flight is delayed.' },
      { word: 'luggage', phonetic: "/'lʌgidʒ/", meaning: 'n. 行李', context: 'Where is the luggage claim?' }
    ]
  },
  {
    id: 'interview',
    title: '求职面试',
    enTitle: 'Job Interview',
    subtitle: '被问到薪资期望时，别只会说 OK',
    level: 'medium',
    setting: '会议室落地窗外是高楼，面试官翻看着你的简历。',
    dialogue: [
      { speaker: 'B', en: 'Thanks for coming. Could you briefly introduce yourself?', zh: '谢谢你来面试。能简单做个自我介绍吗？' },
      { speaker: 'A', en: 'Of course. I have three years of experience in product design.', zh: '当然。我有三年的产品设计经验。' },
      { speaker: 'B', en: 'What do you consider your greatest strength?', zh: '你觉得自己最大的优势是什么？' },
      { speaker: 'A', en: 'I stay calm under pressure and I am good at solving problems.', zh: '我在压力下能保持冷静，并且擅长解决问题。' },
      { speaker: 'B', en: 'What are your salary expectations?', zh: '你的薪资期望是多少？' },
      { speaker: 'A', en: 'Based on my skills and experience, I am expecting around 25,000 yuan per month.', zh: '结合我的技能和经验，我的期望是月薪2万5左右。' }
    ],
    keyWords: [
      { word: 'interview', phonetic: "/'intəvju:/", meaning: 'n. 面试；采访', context: 'Thanks for coming to the interview.' },
      { word: 'briefly', phonetic: "/'bri:fli/", meaning: 'adv. 简短地', context: 'Briefly introduce yourself.' },
      { word: 'experience', phonetic: "/ik'spiəriəns/", meaning: 'n. 经验；经历', context: 'Three years of experience.' },
      { word: 'strength', phonetic: '/streŋθ/', meaning: 'n. 长处；力量', context: 'Your greatest strength?' },
      { word: 'pressure', phonetic: "/'preʃə/", meaning: 'n. 压力', context: 'Stay calm under pressure.' },
      { word: 'salary', phonetic: "/'sæləri/", meaning: 'n. 薪水', context: 'Salary expectations?' },
      { word: 'skill', phonetic: '/skil/', meaning: 'n. 技能', context: 'Based on my skills.' },
      { word: 'confident', phonetic: "/'kɔnfidənt/", meaning: 'a. 自信的', context: 'She sounds very confident.' }
    ]
  },
  {
    id: 'doctor',
    title: '看医生',
    enTitle: 'Seeing a Doctor',
    subtitle: '把"我有点不舒服"说明白',
    level: 'medium',
    setting: '社区医院的诊室里，医生示意你坐下。',
    dialogue: [
      { speaker: 'B', en: 'What seems to be the problem?', zh: '哪里不舒服？' },
      { speaker: 'A', en: 'I have had a sore throat and a cough since yesterday.', zh: '从昨天开始嗓子疼，还有点咳嗽。' },
      { speaker: 'B', en: 'Do you have a fever? Let me take your temperature.', zh: '发烧吗？我先量下体温。' },
      { speaker: 'A', en: 'It was 38.2 this morning.', zh: '今天早上是38度2。' },
      { speaker: 'B', en: 'It looks like a mild infection. I will prescribe some medicine.', zh: '看起来是轻度感染，我给你开点药。' },
      { speaker: 'A', en: 'How often should I take it? And should I avoid any food?', zh: '多久吃一次？有没有什么要忌口的？' }
    ],
    keyWords: [
      { word: 'symptom', phonetic: "/'simptəm/", meaning: 'n. 症状', context: 'What are your symptoms?' },
      { word: 'sore', phonetic: '/sɔ:/', meaning: 'a. 疼痛的', context: 'A sore throat.' },
      { word: 'cough', phonetic: '/kɔf/', meaning: 'n./v. 咳嗽', context: 'A cough since yesterday.' },
      { word: 'fever', phonetic: "/'fi:və/", meaning: 'n. 发烧', context: 'Do you have a fever?' },
      { word: 'temperature', phonetic: "/'temprətʃə/", meaning: 'n. 体温；温度', context: 'Take your temperature.' },
      { word: 'infection', phonetic: "/in'fekʃən/", meaning: 'n. 感染', context: 'A mild infection.' },
      { word: 'prescribe', phonetic: "/pri'skraib/", meaning: 'v. 开（药方）', context: 'Prescribe some medicine.' },
      { word: 'avoid', phonetic: "/ə'vɔid/", meaning: 'v. 避免', context: 'Avoid any food?' }
    ]
  },
  {
    id: 'refund',
    title: '网购退货',
    enTitle: 'Online Shopping Refund',
    subtitle: '码数不合、质量存疑、七天无理由',
    level: 'medium',
    setting: '你收到了等了五天的包裹，拆开后发现外套大了一码。',
    dialogue: [
      { speaker: 'B', en: 'Customer service, how can I help you?', zh: '客服为您服务，有什么可以帮您？' },
      { speaker: 'A', en: 'I would like to return a jacket. It is one size too large.', zh: '我想退一件外套，尺码大了一号。' },
      { speaker: 'B', en: 'I am sorry to hear that. Could you give me your order number?', zh: '很抱歉。能告诉我订单号吗？' },
      { speaker: 'A', en: 'Sure, it is 20261008. Do I need to pay for the return shipping?', zh: '好的，是20261008。退货邮费要我出吗？' },
      { speaker: 'B', en: 'No, shipping is free for quality or size issues. You will receive a full refund within three days.', zh: '不用，质量问题或尺码问题免邮。三天内您会收到全额退款。' },
      { speaker: 'A', en: 'Great. By the way, is the purple color still in stock in size M?', zh: '太好了。顺便问一下，紫色款M码还有货吗？' }
    ],
    keyWords: [
      { word: 'return', phonetic: "/ri'tə:n/", meaning: 'v./n. 退回；归还；返回', context: 'I would like to return a jacket.' },
      { word: 'size', phonetic: '/saiz/', meaning: 'n. 尺码；大小', context: 'One size too large.' },
      { word: 'order number', phonetic: "/'ɔ:də 'nʌmbə/", meaning: 'phr. 订单号', context: 'Give me your order number.' },
      { word: 'shipping', phonetic: "/'ʃipiŋ/", meaning: 'n. 运费；运送', context: 'Pay for the return shipping?' },
      { word: 'refund', phonetic: "/'ri:fʌnd/", meaning: 'n. 退款', context: 'A full refund within three days.' },
      { word: 'quality', phonetic: "/'kwɔləti/", meaning: 'n. 质量', context: 'Quality or size issues.' },
      { word: 'in stock', phonetic: '/in stɔk/', meaning: 'phr. 有货', context: 'Still in stock in size M?' },
      { word: 'review', phonetic: "/ri'vju:/", meaning: 'n./v. 评价；复习；审查', context: 'Leave a five-star review.' }
    ]
  },
  {
    id: 'direction',
    title: '旅行问路',
    enTitle: 'Asking for Directions',
    subtitle: '拐两个弯就到，别只会看地图',
    level: 'easy',
    setting: '陌生城市的老街，导航突然没了信号，你拦住一位遛狗的本地人。',
    dialogue: [
      { speaker: 'A', en: 'Excuse me, could you tell me the way to the old museum?', zh: '打扰一下，请问老博物馆怎么走？' },
      { speaker: 'B', en: 'Sure. Go straight along this street for two blocks.', zh: '当然，沿着这条街直走两个街区。' },
      { speaker: 'A', en: 'And then?', zh: '然后呢？' },
      { speaker: 'B', en: 'Turn left at the corner with the bakery. You will see a red postbox on your right.', zh: '在有面包店的那个路口左转，你会看到右边有个红色邮筒。' },
      { speaker: 'A', en: 'Is it far? How long will it take on foot?', zh: '远吗？走路要多久？' },
      { speaker: 'B', en: 'About ten minutes. You can hardly miss it.', zh: '十分钟左右，很好找的。' }
    ],
    keyWords: [
      { word: 'block', phonetic: '/blɔk/', meaning: 'n. 街区；块', context: 'Two blocks ahead.' },
      { word: 'corner', phonetic: "/'kɔ:nə/", meaning: 'n. 转角；角落', context: 'Turn left at the corner.' },
      { word: 'straight', phonetic: '/streit/', meaning: 'adv. 笔直地', context: 'Go straight along this street.' },
      { word: 'bakery', phonetic: "/'beikəri/", meaning: 'n. 面包店', context: 'The corner with the bakery.' },
      { word: 'postbox', phonetic: "/'pəustbɔks/", meaning: 'n. 邮筒', context: 'A red postbox on your right.' },
      { word: 'on foot', phonetic: '/ɔn fut/', meaning: 'phr. 步行', context: 'How long on foot?' },
      { word: 'miss', phonetic: '/mis/', meaning: 'v. 错过；想念', context: 'You can hardly miss it.' },
      { word: 'nearby', phonetic: "/'niəbai/", meaning: 'adv./a. 附近（的）', context: 'Any café nearby?' }
    ]
  }
];
