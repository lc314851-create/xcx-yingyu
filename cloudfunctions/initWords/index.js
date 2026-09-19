// cloudfunctions/initWords/index.js
// 云函数：初始化/批量导入词库到云开发数据库 + 上传 JSON 到云存储
// 调用方式：
//   wx.cloud.callFunction({ name: 'initWords', data: { action: 'import', bookId: 'junior', words: [...] } })
//   wx.cloud.callFunction({ name: 'initWords', data: { action: 'check' } })
//   wx.cloud.callFunction({ name: 'initWords', data: { action: 'getMeta' } })
//   wx.cloud.callFunction({ name: 'initWords', data: { action: 'uploadFile', bookId: 'junior' } })

const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();
const _ = db.command;

// 词书元数据
const BOOK_META = [
  { id: 'junior', name: '初中词汇', level: '初中', tag: 'zk' },
  { id: 'senior', name: '高中词汇', level: '高中', tag: 'gk' },
  { id: 'cet4', name: '四级词汇', level: '四级', tag: 'cet4' },
  { id: 'cet6', name: '六级词汇', level: '六级', tag: 'cet6' },
  { id: 'zsb', name: '专升本词汇', level: '专升本', tag: 'zsb' },
  { id: 'postgrad', name: '考研词汇', level: '考研', tag: 'ky' },
  { id: 'ielts', name: '雅思词汇', level: '雅思', tag: 'ielts' },
  { id: 'toefl', name: '托福词汇', level: '托福', tag: 'toefl' },
  { id: 'gre', name: 'GRE词汇', level: 'GRE', tag: 'gre' },
  // 人教版教材同步分册
  { id: 'pepj7_1', name: '人教版七年级上册', level: '初一', tag: 'pep' },
  { id: 'pepj7_2', name: '人教版七年级下册', level: '初一', tag: 'pep' },
  { id: 'pepj8_1', name: '人教版八年级上册', level: '初二', tag: 'pep' },
  { id: 'pepj8_2', name: '人教版八年级下册', level: '初二', tag: 'pep' },
  { id: 'pepj9', name: 'PEP经典版九年级', level: '初三', tag: 'pep' },
  { id: 'pepgz1', name: '人教版必修第一册', level: '高一', tag: 'pep' },
  { id: 'pepgz2', name: '人教版必修第二册', level: '高一', tag: 'pep' },
  { id: 'pepgz3', name: '人教版必修第三册', level: '高二', tag: 'pep' },
  { id: 'pepgzx1', name: '人教版选择性必修一', level: '高二', tag: 'pep' },
  { id: 'pepgzx2', name: '人教版选择性必修二', level: '高二', tag: 'pep' },
  { id: 'pepgzx3', name: '人教版选择性必修三', level: '高三', tag: 'pep' },
  { id: 'pep3_1', name: 'PEP经典版三年级上', level: '小学', tag: 'pep' },
  { id: 'pep3_2', name: 'PEP经典版三年级下', level: '小学', tag: 'pep' },
  { id: 'pep4_1', name: 'PEP经典版四年级上', level: '小学', tag: 'pep' },
  { id: 'pep4_2', name: 'PEP经典版四年级下', level: '小学', tag: 'pep' },
  { id: 'pep5_1', name: 'PEP经典版五年级上', level: '小学', tag: 'pep' },
  { id: 'pep5_2', name: 'PEP经典版五年级下', level: '小学', tag: 'pep' },
  { id: 'pep6_1', name: 'PEP经典版六年级上', level: '小学', tag: 'pep' },
  { id: 'pep6_2', name: 'PEP经典版六年级下', level: '小学', tag: 'pep' }
];

exports.main = async (event, context) => {
  const { action, bookId, words } = event;

  try {
    // 0. 服务端换取临时下载链接（不受客户端存储权限限制，绕过 empty download url）
    if (action === 'getBookFileUrl' && bookId) {
      const bucket = '636c-cloudbase-d0g1vselq28a99d40-1470230380';
      // DYNAMIC_CURRENT_ENV 是 Symbol，不能进模板字符串，直接写死环境 ID
      const envId = 'cloudbase-d0g1vselq28a99d40';
      const fileID = `cloud://${envId}.${bucket}/wordbooks/${bookId}.json`;
      const res = await cloud.getTempFileURL({ fileList: [fileID] });
      const f = res.fileList && res.fileList[0];
      if (!f || !f.tempFileURL || f.status !== 0) {
        return { ok: false, errMsg: (f && (f.errMsg || f.status)) || 'no url' };
      }
      return { ok: true, url: f.tempFileURL };
    }

    // 1. 检查词库是否已初始化
    if (action === 'check') {
      const countResult = await db.collection('wordbooks').count();
      const total = countResult.total;
      return {
        initialized: total > 0,
        totalRecords: total
      };
    }

    // 2. 获取词书元数据（含高频词数量）
    if (action === 'getMeta') {
      // 并行统计所有词书，避免串行查询超时（词书数量已增至 27 本）
      const stats = await Promise.all(BOOK_META.map(async (meta) => {
        const totalRes = await db.collection('wordbooks')
          .where({ bookId: meta.id })
          .count();
        const hfRes = await db.collection('wordbooks')
          .where({ bookId: meta.id, isHighFreq: true })
          .count();
        return [meta.id, {
          ...meta,
          wordCount: totalRes.total,
          highFreqCount: hfRes.total
        }];
      }));
      const result = {};
      stats.forEach(([id, info]) => { result[id] = info; });
      return { books: result };
    }

    // 3. 获取某词书的词汇（支持分批获取）
    if (action === 'getWords' && bookId) {
      const page = event.page || 0;
      const pageSize = event.pageSize || 500;
      const offset = page * pageSize;

      const res = await db.collection('wordbooks')
        .where({ bookId })
        .skip(offset)
        .limit(pageSize)
        .field({
          word: true,
          phonetic: true,
          meaning: true,
          example: true,
          isHighFreq: true,
          // ECDICT 扩展字段
          root: true,
          rootGloss: true,
          lemma: true,
          synonyms: true,
          antonyms: true,
          relatedWords: true,
          frequency: true,
          star: true
        })
        .get();

      const words = res.data.map(item => ({
        word: item.word,
        phonetic: item.phonetic || '',
        meaning: item.meaning || '',
        example: item.example || '',
        isHighFreq: item.isHighFreq || false,
        // ECDICT 扩展字段（可选）
        root: item.root || '',
        rootGloss: item.rootGloss || '',
        lemma: item.lemma || '',
        synonyms: item.synonyms || '',
        antonyms: item.antonyms || '',
        relatedWords: item.relatedWords || '',
        frequency: item.frequency || 0,
        star: item.star || 0
      }));

      return {
        bookId,
        words,
        count: words.length,
        page,
        pageSize,
        hasMore: words.length === pageSize
      };
    }

    // 4. 导入词汇（分批写入）
    if (action === 'import' && bookId && words && words.length > 0) {
      // 先删除该词书的旧数据
      await db.collection('wordbooks')
        .where({ bookId })
        .remove();

      // 批量插入（每次最多 20 条，云数据库批量限制）
      const batchSize = 20;
      let inserted = 0;
      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize);
        const tasks = batch.map(w =>
          db.collection('wordbooks').add({
            data: {
              bookId,
              word: w.word,
              phonetic: w.phonetic || '',
              meaning: w.meaning || '',
              example: w.example || '',
              isHighFreq: w.isHighFreq || false,
              // ECDICT 扩展字段
              root: w.root || '',
              rootGloss: w.rootGloss || '',
              lemma: w.lemma || '',
              synonyms: w.synonyms || '',
              antonyms: w.antonyms || '',
              relatedWords: w.relatedWords || '',
              frequency: w.frequency || 0,
              star: w.star || 0
            }
          })
        );
        await Promise.all(tasks);
        inserted += batch.length;
      }

      return {
        success: true,
        bookId,
        inserted
      };
    }

    // 5. 清空词库
    if (action === 'clear') {
      const res = await db.collection('wordbooks').where({}).remove();
      return { success: true, removed: res.stats.removed };
    }

    // 6. 上传词书 JSON 到云存储（生成 CDN 缓存文件，前端秒开）
    if (action === 'uploadFile' && bookId) {
      // 从数据库拉取全部词汇
      let allWords = [];
      let page = 0;
      const pageSize = 500;
      let hasMore = true;

      while (hasMore) {
        const res = await db.collection('wordbooks')
          .where({ bookId })
          .skip(page * pageSize)
          .limit(pageSize)
          .field({
            word: true,
            phonetic: true,
            meaning: true,
            example: true,
            isHighFreq: true,
            root: true,
            rootGloss: true,
            lemma: true,
            synonyms: true,
            antonyms: true,
            relatedWords: true,
            frequency: true,
            star: true
          })
          .get();

        if (res.data && res.data.length > 0) {
          allWords = allWords.concat(res.data.map(item => ({
            word: item.word,
            phonetic: item.phonetic || '',
            meaning: item.meaning || '',
            example: item.example || '',
            isHighFreq: item.isHighFreq || false,
            root: item.root || '',
            rootGloss: item.rootGloss || '',
            lemma: item.lemma || '',
            synonyms: item.synonyms || '',
            antonyms: item.antonyms || '',
            relatedWords: item.relatedWords || '',
            frequency: item.frequency || 0,
            star: item.star || 0
          })));
          hasMore = res.data.length === pageSize;
          page++;
        } else {
          hasMore = false;
        }
      }

      if (allWords.length === 0) {
        return { error: `词书 ${bookId} 数据库中无数据` };
      }

      // 写入临时文件并上传到云存储
      const cloudPath = `wordbooks/${bookId}.json`;
      const result = await cloud.uploadFile({
        cloudPath,
        fileContent: Buffer.from(JSON.stringify(allWords), 'utf-8')
      });

      return {
        success: true,
        bookId,
        wordCount: allWords.length,
        fileID: result.fileID,
        cloudPath
      };
    }

    // 7. 上传元数据 JSON 到云存储
    if (action === 'uploadMeta') {
      const metaResult = {};
      for (const meta of BOOK_META) {
        const totalRes = await db.collection('wordbooks')
          .where({ bookId: meta.id })
          .count();
        const hfRes = await db.collection('wordbooks')
          .where({ bookId: meta.id, isHighFreq: true })
          .count();
        metaResult[meta.id] = {
          ...meta,
          wordCount: totalRes.total,
          highFreqCount: hfRes.total
        };
      }

      const cloudPath = 'wordbooks/books_meta.json';
      const result = await cloud.uploadFile({
        cloudPath,
        fileContent: Buffer.from(JSON.stringify({ books: metaResult }), 'utf-8')
      });

      return {
        success: true,
        fileID: result.fileID,
        cloudPath,
        meta: metaResult
      };
    }

    return {
      error: 'Invalid action. Use: check | getMeta | getWords | import | clear | uploadFile | uploadMeta'
    };
  } catch (err) {
    console.error('initWords error:', err);
    return {
      error: err.message || 'Unknown error'
    };
  }
};
