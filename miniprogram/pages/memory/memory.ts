// pages/memory/memory.ts
// 记忆体检：基于 Leitner 进度数据，为每个用户拟合「自己的」记忆保持曲线
// R = e^(-Δt/S)：R=当前可检索概率，Δt=距离上次学习的天数，S=稳定度（随 box 等级增长）

import { getAllProgress, getStats, getCurrentBookId, WordProgress } from '../../utils/store';
import { getBookWords } from '../../utils/wordService';
import { playAudio } from '../../utils/audio';

const DAY = 24 * 60 * 60 * 1000;

// box → 稳定度天数（记忆能保持多久的估计）
const STABILITY_DAYS: Record<number, number> = {
  1: 0.5, 2: 1, 3: 2, 4: 4, 5: 7, 6: 15, 7: 30
};

function retrievability(p: WordProgress, now: number): number {
  const s = STABILITY_DAYS[p.box] || 1;
  const dt = Math.max(0, (now - p.lastSeen) / DAY);
  return Math.exp(-dt / s);
}

interface RiskWord {
  word: string;
  meaning: string;
  r: number;       // 0~100 保持率
  days: number;    // 几天没见
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
        const stable = STABILITY_DAYS[p.box] || 1;
        const dt = Math.max(0, (now - p.lastSeen) / DAY) + d;
        s += Math.exp(-dt / stable);
      }
      curve.push({
        label: d === 0 ? '今天' : `+${d}天`,
        v: Math.round((s / learned.length) * 100)
      });
    }

    // ─── 高危遗忘词：保持率最低的前10个 ───
    const riskWords: RiskWord[] = learned
      .map(p => ({
        word: p.word,
        meaning: meaningMap.get(p.word) || '',
        r: Math.round(retrievability(p, now) * 100),
        days: Math.floor((now - p.lastSeen) / DAY)
      }))
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

  // 去复习
  goReview() {
    wx.switchTab({ url: '/pages/words/words' });
  },

  // 漫游词族对比易混词
  onPairTap(e: any) {
    const word = e.currentTarget.dataset.word as string;
    wx.navigateTo({ url: `/pages/galaxy/galaxy?word=${encodeURIComponent(word)}` });
  }
});
