// pages/memory/memory.ts
// 记忆体检：基于每个词的真实排程（SM-2 变体）拟合「自己的」记忆保持曲线
// R = e^(-Δt/S)：R=当前可检索概率，Δt=距离上次学习的天数，S=稳定度
// S 由真实复习间隔推导：词在「间隔到期日」的保持率理论值为 0.9，
// 即 e^(-interval/S) = 0.9 → S = interval / ln(1/0.9) ≈ interval × 9.49
// 旧 Leitner 数据（无 interval 字段）按 box 回填间隔后同模型计算

import { getAllProgress, getStats, getCurrentBookId, WordProgress } from '../../utils/store';
import { getBookWords } from '../../utils/wordService';
import { playAudio } from '../../utils/audio';

const DAY = 24 * 60 * 60 * 1000;

// 旧 Leitner box → 间隔天数（老数据回填；新数据直接用 p.interval）
const BOX_INTERVAL_DAYS: Record<number, number> = {
  1: 0, 2: 1, 3: 2, 4: 4, 5: 7, 6: 15, 7: 30
};

// ln(1/0.9)，即「到期日保持率 0.9」的幂次常数
const LN_INV_09 = -Math.log(0.9); // ≈ 0.1054

// 稳定度（天）：由排程间隔推导；间隔为 0（刚答错）给最小稳定度 0.5 天
function stabilityDays(p: WordProgress): number {
  const interval = p.interval && p.interval > 0
    ? p.interval
    : (BOX_INTERVAL_DAYS[p.box] || 0);
  return Math.max(interval / LN_INV_09, 0.5);
}

function retrievability(p: WordProgress, now: number): number {
  const s = stabilityDays(p);
  const dt = Math.max(0, (now - p.lastSeen) / DAY);
  return Math.exp(-dt / s);
}

interface RiskWord {
  word: string;
  meaning: string;
  r: number;       // 0~100 保持率
  days: number;    // 几天没见
  wrong?: boolean; // 是否答错过（box1，最危险）
}

interface ConfusePair {
  a: string;
  b: string;
  aMeaning: string;
  bMeaning: string;
  weakSide: string; // 哪一侧记忆更弱
}

Page({
  data: {
    loading: true,
    hasData: false,
    bookName: '',
    // 总览
    stabilityScore: 0,      // 0~100 记忆稳定度
    learnedCount: 0,        // 已学过的词数
    weeklyLearned: 0,
    streakDays: 0,
    // 曲线（今天起逐日的预测保持率 0~100）
    curve: [] as { label: string; v: number }[],
    // 高危遗忘词
    riskWords: [] as RiskWord[],
    // 易混词对
    confusePairs: [] as ConfusePair[],
    reportDate: ''
  },

  async onLoad() {
    await this.buildReport();
  },

  async buildReport() {
    const now = Date.now();
    const bookId = getCurrentBookId();
    const progress = getAllProgress(bookId);
    const learned = Object.values(progress).filter(p => (p.box || 1) >= 2);

    if (learned.length < 3) {
      this.setData({ loading: false, hasData: false });
      return;
    }

    // 词义对照（当前词书）
    const words = await getBookWords(bookId);
    const meaningMap = new Map<string, string>();
    const dataMap = new Map<string, any>();
    for (const w of words) {
      meaningMap.set(w.word, w.meaning);
      dataMap.set(w.word, w);
    }

    // ─── 记忆稳定度：所有已学词的平均保持率 ───
    let sumR = 0;
    for (const p of learned) sumR += retrievability(p, now);
    const stabilityScore = Math.round((sumR / learned.length) * 100);

    // ─── 个人遗忘曲线：往后 7 天的预测保持率 ───
    const curve = [];
    for (let d = 0; d <= 7; d++) {
      let s = 0;
      for (const p of learned) {
        const stable = stabilityDays(p);
        const dt = Math.max(0, (now - p.lastSeen) / DAY) + d;
        s += Math.exp(-dt / stable);
      }
      curve.push({
        label: d === 0 ? '今天' : `+${d}天`,
        v: Math.round((s / learned.length) * 100)
      });
    }




        // ─── 高危遗忘词：保持率最低的前10个 ───
    // 除已学词（box≥2）外，额外并入学过但当前处于 box1 的词（答错过的）：
    // 它们是真正最危险的词，赋予固定低保持率，确保置顶展示
    const WRONG_R = 5; // 答错词的固定保持率（%），低于任何未答错词
    const learnedArr = Object.values(progress).filter(p => (p.box || 1) >= 1 && p.lastSeen > 0);
    const riskWords: RiskWord[] = learnedArr
      .map(p => {
        const wrong = (p.box || 1) <= 1;
        return {
          word: p.word,
          meaning: meaningMap.get(p.word) || '',
          r: wrong ? WRONG_R : Math.round(retrievability(p, now) * 100),
          days: Math.floor((now - p.lastSeen) / DAY),
          wrong
        };
      })
      .filter(x => x.meaning)
      .sort((a, b) => a.r - b.r)
      .slice(0, 10);

    // ─── 易混词对：双方都学过、且至少一方保持率不佳的形近词 ───
    const confusePairs: ConfusePair[] = [];
    const seenPair = new Set<string>();
    for (const p of learned) {
      const dw = dataMap.get(p.word);
      if (!dw || !dw.relatedWords) continue;
      for (const rel of dw.relatedWords.split(',').map((x: string) => x.trim())) {
        if (rel <= p.word) continue; // 每对只算一次
        const rp = progress[rel];
        if (!rp || (rp.box || 1) < 2) continue;
        const key = `${p.word}+${rel}`;
        if (seenPair.has(key)) continue;
        const r1 = retrievability(p, now);
        const r2 = retrievability(rp, now);
        if (Math.max(r1, r2) > 0.85) continue; // 两边都很牢，不用提醒
        seenPair.add(key);
        confusePairs.push({
          a: p.word,
          b: rel,
          aMeaning: meaningMap.get(p.word) || '',
          bMeaning: meaningMap.get(rel) || '',
          weakSide: r1 < r2 ? 'a' : 'b'
        });
        if (confusePairs.length >= 6) break;
      }
      if (confusePairs.length >= 6) break;
    }

    const stats = getStats();
    const dateObj = new Date();
    const reportDate = `${dateObj.getMonth() + 1}月${dateObj.getDate()}日`;

    this.setData({
      loading: false,
      hasData: true,
      bookName: bookId,
      stabilityScore,
      learnedCount: learned.length,
      weeklyLearned: stats.weeklyLearned,
      streakDays: stats.streakDays,
      curve,
      riskWords,
      confusePairs,
      reportDate
    });
  },

  onWordTap(e: any) {
    playAudio(e.currentTarget.dataset.word as string);
  },

  // 去复习：把高危词清单带给背单词页，一键复习这一轮（一次性标志，words 页 onShow 消费）
  goReview() {
    const riskWords = this.data.riskWords.map((w: RiskWord) => w.word);
    if (riskWords.length > 0) {
      wx.setStorageSync('bc_memory_words', {
        bookId: getCurrentBookId(),
        words: riskWords
      });
    }
    wx.switchTab({ url: '/pages/words/words' });
  },

  // 漫游词族对比易混词
  onPairTap(e: any) {
    const word = e.currentTarget.dataset.word as string;
    wx.navigateTo({ url: `/pages/galaxy/galaxy?word=${encodeURIComponent(word)}` });
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '记忆体检 · 算准复习日不忘词',
      path: '/pages/memory/memory'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '记忆体检 · 算准复习日不忘词'
    };
  },
});
