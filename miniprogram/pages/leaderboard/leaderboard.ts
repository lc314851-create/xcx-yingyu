// pages/leaderboard/leaderboard.ts
// 学习排行榜：本周榜 + 总榜
import { getStats } from '../../utils/store';

interface RankItem {
  rank: number;
  nickname: string;
  avatarUrl: string;
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
        weeklyList: [{ rank: 1, nickname: '我', avatarUrl: '', count: myStats.weeklyLearned, isMe: true }],
        totalList: [{ rank: 1, nickname: '我', avatarUrl: '', count: myStats.totalWords, isMe: true }],
        currentList: [{ rank: 1, nickname: '我', avatarUrl: '', count: myStats.weeklyLearned, isMe: true }],
        myWeeklyRank: 1,
        myTotalRank: 1
      });
      return;
    }

    try {
      // 走 getRanking 云函数：服务端读全量用户并排序，规避客户端权限读不到他人文档
      const res = await wx.cloud.callFunction({ name: 'getRanking', data: {} });
      const r = res.result || {};

      const weeklyList: RankItem[] = (r.weekly || []).map((item: any, idx: number) => ({
        rank: idx + 1,
        nickname: item.nickname || '同学',
        avatarUrl: item.avatarUrl || '',
        count: item.count || 0,
        isMe: item.openid === openid
      }));

      const totalList: RankItem[] = (r.total || []).map((item: any, idx: number) => ({
        rank: idx + 1,
        nickname: item.nickname || '同学',
        avatarUrl: item.avatarUrl || '',
        count: item.count || 0,
        isMe: item.openid === openid
      }));

      this.setData({
        weeklyList,
        totalList,
        currentList: this.data.tab === 'weekly' ? weeklyList : totalList,
        myWeeklyRank: r.myWeeklyRank || 0,
        myTotalRank: r.myTotalRank || 0,
        loading: false,
        hasCloud: true
      });
    } catch (err) {
      console.error('获取排行榜失败', err);
      const fallback = [{ rank: 1, nickname: '我', avatarUrl: '', count: this.data.tab === 'weekly' ? myStats.weeklyLearned : myStats.totalWords, isMe: true }];
      this.setData({
        loading: false,
        hasCloud: false,
        weeklyList: [{ rank: 1, nickname: '我', avatarUrl: '', count: myStats.weeklyLearned, isMe: true }],
        totalList: [{ rank: 1, nickname: '我', avatarUrl: '', count: myStats.totalWords, isMe: true }],
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
