// cloudfunctions/initWords/index.js
// 云函数：初始化/批量导入词库到云开发数据库
// 调用方式：wx.cloud.callFunction({ name: 'initWords', data: { action: 'import', bookId: 'junior', words: [...] } })
//           wx.cloud.callFunction({ name: 'initWords', data: { action: 'check' } })
//           wx.cloud.callFunction({ name: 'initWords', data: { action: 'getMeta' } })

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
  { id: 'postgrad', name: '考研词汇', level: '考研', tag: 'ky' },
  { id: 'ielts', name: '雅思词汇', level: '雅思', tag: 'ielts' },
  { id: 'toefl', name: '托福词汇', level: '托福', tag: 'toefl' },
  { id: 'gre', name: 'GRE词汇', level: 'GRE', tag: 'gre' }
];

exports.main = async (event, context) => {
  const { action, bookId, words } = event;

  try {
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
      const result = {};
      for (const meta of BOOK_META) {
        const totalRes = await db.collection('wordbooks')
          .where({ bookId: meta.id })
          .count();
        const hfRes = await db.collection('wordbooks')
          .where({ bookId: meta.id, isHighFreq: true })
          .count();
        result[meta.id] = {
          ...meta,
          wordCount: totalRes.total,
          highFreqCount: hfRes.total
        };
      }
      return { books: result };
    }

    // 3. 获取某词书的词汇（云函数有管理员权限，不受数据库权限限制）
    //    支持分批获取：传入 page 和 pageSize，避免单次返回超过 1MB 限制
    if (action === 'getWords' && bookId) {
      const page = event.page || 0;
      const pageSize = event.pageSize || 500;
      const offset = page * pageSize;

      const res = await db.collection('wordbooks')
        .where({ bookId })
        .skip(offset)
        .limit(pageSize)
        .field({ word: true, phonetic: true, meaning: true, isHighFreq: true })
        .get();

      const words = res.data.map(item => ({
        word: item.word,
        phonetic: item.phonetic || '',
        meaning: item.meaning || '',
        isHighFreq: item.isHighFreq || false
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
              isHighFreq: w.isHighFreq || false
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

    return {
      error: 'Invalid action. Use: check | getMeta | getWords | import | clear'
    };
  } catch (err) {
    console.error('initWords error:', err);
    return {
      error: err.message || 'Unknown error'
    };
  }
};
