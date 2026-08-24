// pages/leaderboard/leaderboard.ts
// 学习排行榜：本周榜 + 总榜
import { getStats } from '../../utils/store';

interface RankItem {
  rank: number;
  nickname: string;
  count: number;
  isMe: boolean;
}

Page({
  data: {
    tab: 'weekly' as 'weekly' | 'total',
    weeklyList: [] as RankItem[],
    totalList: [] as RankItem[],
    // 当前展示的列表（由 tab 切换时计算）
    currentList: [] as RankItem[],
    myWeekly: 0,
    myTotal: 0,
    myWeeklyRank: 0,
    myTotalRank: 0,
    loading: true,
    // 本地兜底数据
    hasCloud: true
  },

  onLoad() {
    this.loadLeaderboard();
  },

  onShow() {
    this.loadLeaderboard();
  },

  onPullDownRefresh() {
    this.loadLeaderboard(true);
  },

  // 切换 tab
  onTabChange(e: any) {
    const tab = e.currentTarget.dataset.tab as 'weekly' | 'total';
    this.setData({
      tab,
      currentList: tab === 'weekly' ? this.data.weeklyList : this.data.totalList
    });
  },

  async loadLeaderboard(force?: boolean) {
    this.setData({ loading: true });

    // 先获取自己的统计数据
    const myStats = getStats();
    this.setData({
      myWeekly: myStats.weeklyLearned,
      myTotal: myStats.totalWords
    });

    const app = getApp() as any;
    const openid = app.globalData.openid;

    if (!openid || !wx.cloud) {
      this.setData({ loading: false, hasCloud: false });
      // 无云端时，展示自己的数据作为兜底
      this.setData({
        weeklyList: [{ rank: 1, nickname: '我', count: myStats.weeklyLearned, isMe: true }],
        totalList: [{ rank: 1, nickname: '我', count: myStats.totalWords, isMe: true }],
        currentList: [{ rank: 1, nickname: '我', count: myStats.weeklyLearned, isMe: true }],
        myWeeklyRank: 1,
        myTotalRank: 1
      });
      return;
    }

    try {
      const db = wx.cloud.database();
      const _ = db.command;

      // 获取本周榜（按 weeklyLearned 降序，取前 50）
      const weeklyRes = await db.collection('users')
        .where({ 'stats.weeklyLearned': _.gt(0) })
        .orderBy('stats.weeklyLearned', 'desc')
        .limit(50)
        .get();

      const weeklyList: RankItem[] = (weeklyRes.data || []).map((item: any, idx: number) => {
        const stats = item.stats || {};
        return {
          rank: idx + 1,
          nickname: item.nickname || '同学',
          count: stats.weeklyLearned || 0,
          isMe: item._openid === openid
        };
      });

      // 获取总榜（按 totalWords 降序，取前 50）
      const totalRes = await db.collection('users')
        .where({ 'stats.totalWords': _.gt(0) })
        .orderBy('stats.totalWords', 'desc')
        .limit(50)
        .get();

      const totalList: RankItem[] = (totalRes.data || []).map((item: any, idx: number) => {
        const stats = item.stats || {};
        return {
          rank: idx + 1,
          nickname: item.nickname || '同学',
          count: stats.totalWords || 0,
          isMe: item._openid === openid
        };
      });

      // 找到我的排名
      let myWeeklyRank = 0;
      let myTotalRank = 0;
      for (const item of weeklyList) {
        if (item.isMe) { myWeeklyRank = item.rank; break; }
      }
      for (const item of totalList) {
        if (item.isMe) { myTotalRank = item.rank; break; }
      }

      // 如果我不在榜内，计算我的实际排名
      if (myWeeklyRank === 0) {
        // 统计比我 weeklyLearned 多的人数
        const higherCount = await db.collection('users')
          .where({ 'stats.weeklyLearned': _.gt(myStats.weeklyLearned) })
          .count();
        myWeeklyRank = (higherCount?.total || 0) + 1;
      }
      if (myTotalRank === 0) {
        const higherCount = await db.collection('users')
          .where({ 'stats.totalWords': _.gt(myStats.totalWords) })
          .count();
        myTotalRank = (higherCount?.total || 0) + 1;
      }

      this.setData({
        weeklyList,
        totalList,
        currentList: this.data.tab === 'weekly' ? weeklyList : totalList,
        myWeeklyRank,
        myTotalRank,
        loading: false,
        hasCloud: true
      });
    } catch (err) {
      console.error('获取排行榜失败', err);
      const fallback = [{ rank: 1, nickname: '我', count: this.data.tab === 'weekly' ? myStats.weeklyLearned : myStats.totalWords, isMe: true }];
      this.setData({
        loading: false,
        hasCloud: false,
        weeklyList: [{ rank: 1, nickname: '我', count: myStats.weeklyLearned, isMe: true }],
        totalList: [{ rank: 1, nickname: '我', count: myStats.totalWords, isMe: true }],
        currentList: fallback,
        myWeeklyRank: 1,
        myTotalRank: 1
      });
    }

    if (force) {
      wx.stopPullDownRefresh();
    }
  },

  // 获取排名后缀
  getRankSuffix(rank: number): string {
    if (rank === 1) return 'NO.1';
    if (rank === 2) return 'NO.2';
    if (rank === 3) return 'NO.3';
    return `第${rank}名`;
  }
});
