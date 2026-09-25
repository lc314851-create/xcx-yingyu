// cloudfunctions/userBook/extract.js
// 纯逻辑模块（不依赖 wx-server-sdk），便于本地离线测试
//
// 抽出来单独放的原因：这部分是功能正确性的核心（词形归一 + 例句回填），
// 也是最容易出错的部分，必须能在没有微信环境的情况下跑测试。
// 对应本地测试脚本：scripts/test-userbook-extract.js

// ─── 不规则变形映射表 ────────────────────────────────────────────
// 覆盖率实测显示：未命中的高频词几乎全是这一类（was/were/been/said/did/made…），
// 而它们的原形 100% 都在官方词库里。补这张表是零数据成本的最大收益项。
// 见 docs/个人词书功能设计方案.md §2.3 / §7.2
const IRREGULAR = {
  // be / have / do
  am: 'be', is: 'be', are: 'be', was: 'be', were: 'be', been: 'be', being: 'be',
  has: 'have', had: 'have', having: 'have',
  does: 'do', did: 'do', done: 'do', doing: 'do',
  // 高频实词
  said: 'say', says: 'say', made: 'make', came: 'come', went: 'go', gone: 'go',
  got: 'get', gotten: 'get', took: 'take', taken: 'take', given: 'give', gave: 'give',
  seen: 'see', saw: 'see', heard: 'hear', told: 'tell', found: 'find',
  thought: 'think', felt: 'feel', left: 'leave', kept: 'keep', held: 'hold',
  brought: 'bring', bought: 'buy', sent: 'send', spent: 'spend', built: 'build',
  lost: 'lose', met: 'meet', paid: 'pay', ran: 'run', sat: 'sit', stood: 'stand',
  understood: 'understand', wrote: 'write', written: 'write', spoke: 'speak',
  spoken: 'speak', broke: 'break', broken: 'break', chose: 'choose', chosen: 'choose',
  drove: 'drive', driven: 'drive', fell: 'fall', fallen: 'fall', grew: 'grow',
  grown: 'grow', knew: 'know', known: 'know', put: 'put', cut: 'cut', let: 'let',
  set: 'set', rose: 'rise', risen: 'rise', shown: 'show', drew: 'draw', drawn: 'draw',
  began: 'begin', begun: 'begin',
  threw: 'throw', thrown: 'throw', flew: 'fly', flown: 'fly', led: 'lead',
  fed: 'feed', fought: 'fight', caught: 'catch', taught: 'teach', sold: 'sell',
  won: 'win', wore: 'wear', worn: 'wear', sang: 'sing', sung: 'sing', shut: 'shut',
  laid: 'lay', lay: 'lie', ate: 'eat', eaten: 'eat', drank: 'drink', drunk: 'drink',
  slept: 'sleep', dealt: 'deal', meant: 'mean', rode: 'ride',
  ridden: 'ride', rang: 'ring', rung: 'ring', hid: 'hide', hidden: 'hide',
  hurt: 'hurt', cost: 'cost', spread: 'spread', bore: 'bear',
  // 不规则复数（实测 men/women 落不进原形）
  men: 'man', women: 'woman', children: 'child', feet: 'foot',
  teeth: 'tooth', mice: 'mouse', geese: 'goose', people: 'person',
  born: 'bear', tore: 'tear', torn: 'tear',
  // 第二批补充（实测语料里出现的漏网词）
  became: 'become',
  forgot: 'forget', forgotten: 'forget',
  beat: 'beat', beaten: 'beat', bit: 'bite', bitten: 'bite',
  blew: 'blow', blown: 'blow', burst: 'burst', cast: 'cast', dug: 'dig',
  froze: 'freeze', frozen: 'freeze', hung: 'hang', lent: 'lend', lit: 'light',
  shot: 'shoot', sought: 'seek', spun: 'spin', stole: 'steal', stolen: 'steal',
  struck: 'strike', swam: 'swim', swum: 'swim', swore: 'swear', sworn: 'swear',
  swung: 'swing', woke: 'wake', woken: 'wake', wound: 'wind', lying: 'lie',
  knelt: 'kneel', shone: 'shine', shrank: 'shrink', shrunk: 'shrink',
  sank: 'sink', sunk: 'sink', slid: 'slide',
  // 缩写 / 特殊
  cannot: 'can', cant: 'can', dont: 'do', doesnt: 'do', didnt: 'do',
  isnt: 'be', arent: 'be', wasnt: 'be', werent: 'be',
  havent: 'have', hasnt: 'have', hadnt: 'have',
  wont: 'will', wouldnt: 'will', couldnt: 'can', shouldnt: 'should',
  lets: 'let', thats: 'that'
};

// 直引号 + 弯引号（用户从网页 / Word 复制来的常是弯的）
const APOS = "'\u2019";

// ─── 兜底虚词表 ──────────────────────────────────────────────────
// 正常路径靠词库的 posTag === 'func' 过滤虚词，但实测该字段不可靠：
//   · 16550 个去重词里 2579 个根本没有 posTag（含 is / at / do / will）
//   · her / his / my / have 被错标成 content
// 所以改为「posTag === 'func' 或 命中本表」双保险。
// 另外词库漏收的 8 个基础词里，只有 an 无法靠词形还原命中，
// 不兜住的话用户会看到「an 未收录」，像是功能坏了。
// ─── 兜底虚词表 ──────────────────────────────────────────────────
// 正常路径靠词库的 posTag === 'func' 过滤虚词，但实测该字段不可靠：
//   · 去重 16550 词里 2579 个根本没有 posTag（含 is / at / do / will）
//   · her / his / my / have 被错标成 content
//   · 更麻烦的是 *_import.jsonl 导出时丢了 posTag，**数据库里可能压根没有这个字段**
//     （scripts/measure-posTag-impact.js 可量化影响）
// 所以改为「posTag === 'func' 或 命中本表」双保险，本表必须能独立兜住过滤。
//
// 本表 = 词库标记为 func 的安全子集 ∪ 词库漏标的基础虚词，共 188 个。
// 兼类词（like / half / provided 等）刻意不收：它们当动词或名词时不该被过滤。
// 词库漏收的 8 个基础词里只有 an 无法靠词形还原命中，不兜住的话
// 用户会看到「an 未收录」，像是功能坏了。
const FUNCTION_WORDS = new Set([
  'a', 'about', 'across', 'after', 'again', 'against',
  'albeit', 'all', 'along', 'already', 'also', 'although',
  'always', 'am', 'among', 'amongst', 'an', 'and',
  'another', 'any', 'anybody', 'anyone', 'anything', 'are',
  'around', 'as', 'at', 'back', 'be', 'because',
  'been', 'before', 'being', 'beneath', 'between', 'beyond',
  'both', 'but', 'by', 'can', 'could', 'despite',
  'did', 'do', 'does', 'doing', 'done', 'down',
  'during', 'each', 'even', 'ever', 'every', 'everybody',
  'everyone', 'everything', 'few', 'for', 'from', 'had',
  'has', 'have', 'having', 'he', 'her', 'here',
  'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it',
  'its', 'itself', 'just', 'many', 'may', 'me',
  'might', 'mine', 'more', 'most', 'much', 'must',
  'my', 'myself', 'near', 'never', 'no', 'nobody',
  'none', 'nor', 'not', 'now', 'of', 'often',
  'on', 'one', 'oneself', 'only', 'onto', 'or',
  'other', 'ought', 'our', 'ours', 'ourselves', 'outside',
  'over', 'own', 'quite', 'rather', 'same', 'shall',
  'she', 'should', 'since', 'so', 'some', 'somebody',
  'someone', 'something', 'sometimes', 'still', 'such', 'than',
  'that', 'the', 'their', 'theirs', 'them', 'themselves',
  'then', 'there', 'these', 'they', 'this', 'those',
  'though', 'through', 'throughout', 'till', 'to', 'too',
  'toward', 'under', 'unless', 'unlike', 'up', 'upon',
  'us', 'usually', 'very', 'was', 'we', 'well',
  'were', 'what', 'whatever', 'when', 'where', 'whereas',
  'whether', 'which', 'whichever', 'while', 'whilst', 'who',
  'whoever', 'whom', 'whose', 'why', 'will', 'with',
  'within', 'without', 'would', 'yes', 'yet', 'you',
  'your', 'yours'
]);

// ─── 规则化后缀候选（不含不规则表、不含连字符拆分）─────────────────
function suffixForms(w) {
  const out = [];
  const push = (s) => {
    if (s && s.length > 1 && out.indexOf(s) === -1) out.push(s);
  };
  if (w.endsWith('ies') && w.length > 4) push(w.slice(0, -3) + 'y');   // studies → study
  if (w.endsWith('ied') && w.length > 4) push(w.slice(0, -3) + 'y');   // replied → reply
  if (w.endsWith('ily') && w.length > 4) push(w.slice(0, -3) + 'y');   // easily → easy
  if (w.endsWith('es') && w.length > 3) {
    push(w.slice(0, -2));
    push(w.slice(0, -1));
  }
  if (w.endsWith('s') && !w.endsWith('ss')) push(w.slice(0, -1));
  if (w.endsWith('ing') && w.length > 4) {
    const s = w.slice(0, -3);
    push(s);
    push(s + 'e');
    if (s.length > 2 && s[s.length - 1] === s[s.length - 2]) push(s.slice(0, -1)); // running → run
  }
  if (w.endsWith('ed') && w.length > 3) {
    const s = w.slice(0, -2);
    push(s);
    push(w.slice(0, -1));
    if (s.length > 2 && s[s.length - 1] === s[s.length - 2]) push(s.slice(0, -1)); // stopped → stop
  }
  if (w.endsWith('est') && w.length > 4) {
    const s = w.slice(0, -3);
    push(s);
    push(s + 'e');                                                    // largest → large
    if (s.length > 2 && s[s.length - 1] === s[s.length - 2]) push(s.slice(0, -1)); // biggest → big
  }
  if (w.endsWith('er') && w.length > 3) {
    const s = w.slice(0, -2);
    push(s);
    push(s + 'e');                                                    // larger → large
    if (s.length > 2 && s[s.length - 1] === s[s.length - 2]) push(s.slice(0, -1)); // bigger → big
  }
  if (w.endsWith('ly') && w.length > 4) push(w.slice(0, -2));
  return out;
}

// ─── 词形展开：原形 + 不规则表 + 规则化后缀还原 ────────────────────
// 返回按优先级排序的候选集：[原词, 不规则原形, 去所有格, 去复数/时态…]
function expandForms(w) {
  const out = [w];
  const push = (s) => {
    if (s && s.length > 1 && out.indexOf(s) === -1) out.push(s);
  };
  if (IRREGULAR[w]) push(IRREGULAR[w]);

  // 所有格 / 缩写：teacher's → teacher
  if (w.length > 3 && APOS.indexOf(w[w.length - 2]) >= 0 && w[w.length - 1] === 's') {
    push(w.slice(0, -2));
  }

  // 连字符复合词（fastest-growing / well-known）：整体几乎不在词库里，
  // 拆开各自归一后命中率显著更高。整体不做后缀规则（-ing 挂在整体上没意义）
  if (w.indexOf('-') > 0) {
    for (const part of w.split('-')) {
      if (part.length < 2) continue;
      push(part);
      if (IRREGULAR[part]) push(IRREGULAR[part]);
      for (const f of suffixForms(part)) push(f);
    }
    return out;
  }

  for (const f of suffixForms(w)) push(f);
  return out;
}

// ─── 分词 + 归一（客户端与服务端共用同一套规则，避免两边不一致）─────
function tokenize(text) {
  if (typeof text !== 'string' || !text) return [];
  const raw = text.match(/[A-Za-z][A-Za-z'\u2019\-]*/g) || [];
  const seen = Object.create(null);
  const out = [];
  for (const t of raw) {
    // 弯引号统一成直引号，再去掉首尾的连字符/撇号
    const w = t.toLowerCase().replace(/\u2019/g, "'").replace(/^['\-]+|['\-]+$/g, '');
    if (w.length < 2 || w.length > 30) continue;   // 去掉 a / I 这类长度 1 的词
    if (!/^[a-z][a-z'\-]*$/.test(w)) continue;
    if (seen[w]) continue;
    seen[w] = 1;
    out.push(w);
  }
  return out;
}

function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── 从原文中取该词所在的句子，回填例句 ───────────────────────────
// 官方词库例句覆盖率仅 1.2%，但用户上传的原文里本来就有上下文，
// 且比词典例句更贴合他的记忆锚点。见方案 §7.4
function pickSentence(text, candidates) {
  if (!text) return '';
  const sents = text.match(/[^.!?\n]+[.!?]?/g) || [];
  for (const raw of sents) {
    const s = raw.trim();
    if (s.length < 8) continue;
    for (const c of candidates) {
      if (!c) continue;
      if (new RegExp('\\b' + escapeRe(c) + '\\b', 'i').test(s)) {
        return s.slice(0, 160);
      }
    }
  }
  return '';
}

// ─── 从词库命中结果里挑最佳条目 ──────────────────────────────────
// 同一个词在多本书里都有：优先取高频标记的那条
function betterHit(prev, next) {
  if (!prev) return next;
  if (!prev.isHighFreq && next.isHighFreq) return next;
  return prev;
}

// ─── 把候选词与词库命中结果组装成个人词书词条 ─────────────────────
// tokens    : 客户端抽出的候选词数组
// hitByForm : { 词形 -> 词库记录 }
// rawText   : 原文，用于回填例句
function buildWords(tokens, hitByForm, rawText) {
  const picked = Object.create(null);
  const missed = [];
  let funcFiltered = 0;

  for (const t of tokens) {
    const forms = expandForms(t);
    let hit = null;
    let usedForm = t;
    for (const f of forms) {                 // 按优先级取第一个命中
      if (hitByForm[f]) { hit = hitByForm[f]; usedForm = f; break; }
    }
    if (!hit) {
      // 查不到，但本身是虚词（如词库漏收的 an）→ 静默归入虚词，不报「未收录」
      if (FUNCTION_WORDS.has(t)) { funcFiltered++; continue; }
      missed.push(t);
      continue;
    }
    const base = (hit.word || usedForm).toLowerCase();
    if (picked[base]) continue;              // 归一后重复（ran / running 都归到 run）
    // 虚词过滤：posTag 不可靠（2579 词缺字段、her/his/my 被错标 content），
    // 所以叠加兜底虚词表做双保险
    if (hit.posTag === 'func' || FUNCTION_WORDS.has(base)) { funcFiltered++; continue; }

    picked[base] = {
      word: base,
      phonetic: hit.phonetic || '',
      meaning: hit.meaning || '',
      // 官方例句覆盖仅 1.2%，空的话用原文里该词所在的句子回填
      example: hit.example || pickSentence(rawText, [t, usedForm, base]),
      isHighFreq: !!hit.isHighFreq,
      from: hit.bookId || '',
      matchedForm: t === base ? '' : t    // 原文里的形态，便于词卡显示「原文中是 running」
    };
  }

  return {
    words: Object.keys(picked).map((k) => picked[k]),
    missed,
    funcFiltered
  };
}

module.exports = {
  IRREGULAR,
  FUNCTION_WORDS,
  expandForms,
  tokenize,
  pickSentence,
  betterHit,
  buildWords
};
