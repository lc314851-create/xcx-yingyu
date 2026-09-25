// cloudfunctions/userBook/index.js
// 云函数：个人词书（用户自定义上传）
//
// 职责：把用户粘贴的英文文本抽成词条，与官方 wordbooks 词库反向匹配后，
//       存成仅创建者可见的个人词书，支持 命名 / 改名 / 删除。
//
// 调用：
//   wx.cloud.callFunction({ name:'userBook', data:{ action:'create', name, source, rawText, tokens } })
//   wx.cloud.callFunction({ name:'userBook', data:{ action:'list' } })
//   wx.cloud.callFunction({ name:'userBook', data:{ action:'get', bookId } })
//   wx.cloud.callFunction({ name:'userBook', data:{ action:'rename', bookId, name, desc } })
//   wx.cloud.callFunction({ name:'userBook', data:{ action:'remove', bookId } })
//
// 安全红线：每个 action 都以 OPENID 为唯一权限依据，查改删一律带 _openid 约束。
// 纯逻辑（词形归一、分词、例句回填）在 extract.js，可离线测试。
//
// 设计说明见 docs/个人词书功能设计方案.md

const cloud = require('wx-server-sdk');
const { expandForms, buildWords, tokenize } = require('./extract');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

const COL_BOOKS = 'userBooks';
const COL_WORDBOOKS = 'wordbooks';
const COL_USERS = 'users';
const PROGRESS_FIELD_PREFIX = 'progress_';

// ─── 上限（保护云开发额度，与 docs 方案 §5.4 保持一致）───────────
const LIMITS = {
  rawTextLen: 20000,   // 单次粘贴字符数
  tokens: 300,         // 单次候选词数
  wordsPerBook: 500,   // 单本词数
  booksPerUser: 20,    // 每人词书数
  createsPerDay: 10,   // 每人每日创建次数
  nameLen: 20,
  descLen: 60
};

// ─── 入参校验 ────────────────────────────────────────────────────
function cleanText(v, max) {
  if (typeof v !== 'string') return '';
  return v.trim().slice(0, max);
}

function validTokens(arr) {
  if (!Array.isArray(arr)) return [];
  const seen = Object.create(null);
  const out = [];
  for (const t of arr) {
    if (typeof t !== 'string') continue;
    const w = t.trim().toLowerCase().replace(/\u2019/g, "'");
    if (w.length < 2 || w.length > 30) continue;
    if (!/^[a-z][a-z'\-]*$/.test(w)) continue;
    if (seen[w]) continue;
    seen[w] = 1;
    out.push(w);
    if (out.length >= LIMITS.tokens) break;
  }
  return out;
}

function newBookId() {
  const r = () => Math.floor(Math.random() * 36 ** 4).toString(36).padStart(4, '0');
  return 'u_' + r() + r();
}

// 云函数时区可能是 UTC，统一按东八区取「今天 00:00」
function todayStart() {
  const cn = new Date(Date.now() + 8 * 3600 * 1000);
  cn.setUTCHours(0, 0, 0, 0);
  return new Date(cn.getTime() - 8 * 3600 * 1000);
}

// ─── 集合自建 ────────────────────────────────────────────────────
// 云开发数据库的集合需要先存在才能读写。这里在冷启动时自动建一次，
// 避免部署后还要去控制台手动建集合。已存在时 createCollection 会报错，忽略即可。
let collectionsReady = false;
async function ensureCollections() {
  if (collectionsReady) return;
  try {
    await db.createCollection(COL_BOOKS);
    console.log('userBook: 已创建集合', COL_BOOKS);
  } catch (err) {
    // 已存在时 createCollection 会报错，属正常路径，静默忽略
    const msg = (err && (err.errMsg || err.message)) || '';
    if (msg.indexOf('exist') < 0) {
      console.error('userBook: 创建集合失败', msg);
    }
  }
  collectionsReady = true;
}

// ─── 统一词索引（随代码包部署，冷启动懒加载）───────────────────────
// 54,905 词形 / 4.1 MB，由 scripts/build-word-index.py 生成
//   tier 1 = 官方词书（释义精选）  tier 2 = ECDICT 高频增量（兜底）
// 加载后常驻内存，匹配变成纯内存查找：
//   · 不消耗数据库读配额
//   · 彻底绕开「28 本词书导入不全」的问题（索引含 zsb 全部词）
let WORD_INDEX = null;
let INDEX_BROKEN = false;

function loadWordIndex() {
  if (WORD_INDEX) return WORD_INDEX;
  if (INDEX_BROKEN) return null;
  try {
    const meta = require('./wordindex.json');
    const rows = meta.rows || [];
    const map = Object.create(null);
    for (const r of rows) {
      // r = [word, phonetic, meaning, isHighFreq, tier, from, frq]
      map[r[0]] = {
        word: r[0],
        phonetic: r[1] || '',
        meaning: r[2] || '',
        isHighFreq: !!r[3],
        bookId: r[5] || ''
      };
    }
    WORD_INDEX = map;
    console.log('userBook: 词索引 v' + meta.v + ' 已加载，' +
      rows.length + ' 词形（' + meta.generated + ' 生成，官方 ' + meta.official +
      ' / ECDICT ' + meta.ecdict + '）');
  } catch (err) {
    console.error('userBook: 词索引加载失败，本次回退查数据库', err);
    INDEX_BROKEN = true;
  }
  return WORD_INDEX;
}

// ─── 主入口 ──────────────────────────────────────────────────────
exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext();
  if (!OPENID) return { ok: false, error: 'no openid' };

  const action = (event && event.action) || '';

  try {
    await ensureCollections();
    switch (action) {
      case 'create': return await doCreate(event || {}, OPENID);
      case 'list': return await doList(OPENID);
      case 'get': return await doGet(event || {}, OPENID);
      case 'rename': return await doRename(event || {}, OPENID);
      case 'remove': return await doRemove(event || {}, OPENID);
      case 'removeWord': return await doRemoveWord(event || {}, OPENID);
      default:
        return { ok: false, error: 'Invalid action. Use: create | list | get | rename | remove | removeWord' };
    }
  } catch (err) {
    console.error('userBook error:', action, err);
    return { ok: false, error: (err && err.message) || 'Unknown error' };
  }
};

// ─── create：抽词匹配 + 建书 ──────────────────────────────────────
async function doCreate(event, OPENID) {
  const name = cleanText(event.name, LIMITS.nameLen);
  const desc = cleanText(event.desc, LIMITS.descLen);
  const source = ['paste', 'txt', 'image'].indexOf(event.source) >= 0 ? event.source : 'paste';
  const rawText = cleanText(event.rawText, LIMITS.rawTextLen);
  // 分词在服务端做：客户端与服务端共用 extract.js 的同一套规则，
  // 避免两边各自实现一份、日后改了规则对不上
  const tokens = validTokens(event.tokens || tokenize(rawText));

  if (!name) return { ok: false, error: 'empty_name', message: '请先给词书起个名字' };
  if (!rawText) {
    return { ok: false, error: 'empty_rawText', message: '请先粘贴包含单词的英文内容' };
  }
  if (tokens.length === 0) {
    return { ok: false, error: 'no_tokens', message: '没有识别到英文单词，请检查粘贴的内容' };
  }

  const col = db.collection(COL_BOOKS);

  // 1) 配额校验：每人词书数 + 每日创建次数
  const mine = await col.where({ _openid: OPENID }).limit(1000).get();
  const docs = mine.data || [];
  if (docs.length >= LIMITS.booksPerUser) {
    return {
      ok: false,
      error: 'quota_books',
      message: '最多只能保存 ' + LIMITS.booksPerUser + ' 本个人词书，请先删掉一些'
    };
  }
  const since = todayStart().getTime();
  const createdToday = docs.filter((d) => {
    const t = d.createTime ? new Date(d.createTime).getTime() : 0;
    return t >= since;
  }).length;
  if (createdToday >= LIMITS.createsPerDay) {
    return {
      ok: false,
      error: 'quota_daily',
      message: '今天的创建次数已用完（每日 ' + LIMITS.createsPerDay + ' 次），明天再来'
    };
  }

  // 2) 词形展开 → 候选词形集合（去重后批量查库）
  const allForms = [];
  const seenForm = Object.create(null);
  for (const t of tokens) {
    for (const f of expandForms(t)) {
      if (!seenForm[f]) { seenForm[f] = 1; allForms.push(f); }
    }
  }

  // 3) 匹配：优先查内存索引（零数据库读配额）；索引不可用时回退查 wordbooks 集合
  const hitByForm = Object.create(null);
  const idx = loadWordIndex();

  if (idx) {
    for (const f of allForms) {
      const r = idx[f];
      if (r) hitByForm[f] = r;
    }
  } else {
    // 降级路径：分批查官方词库（in 数组不宜过大；跨书重复在 buildWords 里归一）
    const BATCH = 80;
    for (let i = 0; i < allForms.length; i += BATCH) {
      const res = await db.collection(COL_WORDBOOKS)
        .where({ word: _.in(allForms.slice(i, i + BATCH)) })
        .field({
          word: true, phonetic: true, meaning: true, example: true,
          bookId: true, isHighFreq: true, posTag: true
        })
        .limit(1000)
        .get();

      for (const r of (res.data || [])) {
        const key = (r.word || '').toLowerCase();
        if (!key) continue;
        const prev = hitByForm[key];
        // 同一词在多本书里都有：优先取高频标记的那条
        if (!prev || (!prev.isHighFreq && r.isHighFreq)) hitByForm[key] = r;
      }
    }
  }

  // 4) 归到原形，去重 + 过滤虚词 + 回填例句
  const built = buildWords(tokens, hitByForm, rawText);
  const missed = built.missed;

  let words = built.words;
  let truncated = 0;
  if (words.length > LIMITS.wordsPerBook) {
    truncated = words.length - LIMITS.wordsPerBook;
    words = words.slice(0, LIMITS.wordsPerBook);
  }
  if (words.length === 0) {
    return {
      ok: false,
      error: 'no_match',
      message: '没能在词库中匹配到单词，请确认粘贴的是英文内容',
      missedSamples: missed.slice(0, 10)
    };
  }

  // 5) 写入（bookId 加 u_ 前缀，避免与官方词书的进度字段 progress_${bookId} 撞车）
  const bookId = newBookId();
  const stats = {
    total: words.length,
    matched: words.length,
    missed: missed.length,
    funcFiltered: built.funcFiltered,
    truncated
  };

  await col.add({
    data: {
      _openid: OPENID,
      bookId,
      name,
      desc,
      source,
      rawText,
      words,
      stats,
      missedSamples: missed.slice(0, 10),
      createTime: db.serverDate(),
      updateTime: db.serverDate()
    }
  });

  return { ok: true, bookId, name, words, stats, missedSamples: missed.slice(0, 10) };
}

// ─── list：只返回元信息，不带 words ──────────────────────────────
async function doList(OPENID) {
  const res = await db.collection(COL_BOOKS)
    .where({ _openid: OPENID })
    .field({
      bookId: true, name: true, desc: true, source: true,
      stats: true, createTime: true, updateTime: true
    })
    .orderBy('createTime', 'desc')
    .limit(100)
    .get();

  const books = (res.data || []).map((d) => ({
    bookId: d.bookId,
    name: d.name,
    desc: d.desc || '',
    source: d.source || 'paste',
    total: (d.stats && d.stats.total) || 0,
    missed: (d.stats && d.stats.missed) || 0,
    createTime: d.createTime,
    updateTime: d.updateTime
  }));

  return { ok: true, books };
}

// ─── get：取整本（用于背书）─────────────────────────────────────
async function doGet(event, OPENID) {
  const bookId = cleanText(event.bookId, 40);
  if (!bookId) return { ok: false, error: 'empty bookId' };

  const res = await db.collection(COL_BOOKS)
    .where({ bookId, _openid: OPENID })   // 两个条件缺一不可，否则可越权读他人词书
    .limit(1)
    .get();

  const doc = (res.data || [])[0];
  if (!doc) return { ok: false, error: 'not found' };

  return {
    ok: true,
    book: {
      bookId: doc.bookId,
      name: doc.name,
      desc: doc.desc || '',
      source: doc.source || 'paste',
      words: doc.words || [],
      stats: doc.stats || null
    }
  };
}

// ─── rename：改名 / 改简介（永不改 bookId）───────────────────────
async function doRename(event, OPENID) {
  const bookId = cleanText(event.bookId, 40);
  const name = cleanText(event.name, LIMITS.nameLen);
  if (!bookId) return { ok: false, error: 'empty bookId' };
  if (!name) return { ok: false, error: 'empty_name', message: '名字不能为空' };

  const patch = { name, updateTime: db.serverDate() };
  if (typeof event.desc === 'string') patch.desc = cleanText(event.desc, LIMITS.descLen);

  const res = await db.collection(COL_BOOKS)
    .where({ bookId, _openid: OPENID })
    .update({ data: patch });

  if (!res.stats || res.stats.updated === 0) return { ok: false, error: 'not found' };
  return { ok: true, bookId, name };
}

// ─── remove：删除 + 级联清理 ─────────────────────────────────────
// 漏掉级联会导致：用户重新上传同名书时读到旧进度；生词本里残留已删词书的词
async function doRemove(event, OPENID) {
  const bookId = cleanText(event.bookId, 40);
  if (!bookId) return { ok: false, error: 'empty bookId' };
  if (bookId.indexOf('u_') !== 0) return { ok: false, error: 'invalid_bookId' };

  // 1) 删词书本体
  const del = await db.collection(COL_BOOKS)
    .where({ bookId, _openid: OPENID })
    .remove();
  if (!del.stats || del.stats.removed === 0) return { ok: false, error: 'not found' };

  // 2) 清 users 里的 progress_u_xxx；3) 清生词本里来源是这本书的词
  const fieldKey = PROGRESS_FIELD_PREFIX + bookId;
  let progressCleared = 0;
  try {
    const users = await db.collection(COL_USERS).where({ _openid: OPENID }).limit(100).get();
    for (const d of (users.data || [])) {
      const patch = { updateTime: db.serverDate() };
      let need = false;
      if (d[fieldKey]) { patch[fieldKey] = _.remove(); need = true; }
      if (Array.isArray(d.wrongBook)) {
        const kept = d.wrongBook.filter((it) => !it || it.from !== bookId);
        if (kept.length !== d.wrongBook.length) { patch.wrongBook = kept; need = true; }
      }
      if (need) {
        await db.collection(COL_USERS).doc(d._id).update({ data: patch });
        progressCleared++;
      }
    }
  } catch (err) {
    // 级联失败不回滚词书删除：孤儿进度只是冗余数据，不影响正确性
    console.error('级联清理失败（不影响词书删除）', err);
  }

  return { ok: true, bookId, progressCleared };
}

// ─── removeWord：从某本个人词书里删掉一个词 ───────────────────────
// 详情页「逐个删词」用。只删词，不动整本书。
async function doRemoveWord(event, OPENID) {
  const bookId = cleanText(event.bookId, 40);
  const word = cleanText(event.word, 40).toLowerCase();
  if (!bookId || !word) return { ok: false, error: 'invalid params' };
  if (bookId.indexOf('u_') !== 0) return { ok: false, error: 'invalid_bookId' };

  const res = await db.collection(COL_BOOKS)
    .where({ bookId, _openid: OPENID })     // 越权校验，缺一不可
    .field({ words: true, stats: true })
    .limit(1)
    .get();

  const doc = (res.data || [])[0];
  if (!doc) return { ok: false, error: 'not found' };

  const before = doc.words || [];
  const words = before.filter((x) => x && x.word !== word);
  if (words.length === before.length) return { ok: false, error: 'word not found' };

  await db.collection(COL_BOOKS).doc(doc._id).update({
    data: {
      words,
      'stats.total': words.length,
      'stats.matched': words.length,
      updateTime: db.serverDate()
    }
  });

  return { ok: true, bookId, word, total: words.length };
}
