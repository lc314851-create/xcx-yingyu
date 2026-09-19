"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../../utils/store");
const wordService_1 = require("../../utils/wordService");
const index_1 = require("../../data/index");
const quotes_1 = require("../../data/quotes");
Page({
    data: {
        greetingText: '',
        heroTitle: '今天也要加油学英语！',
        heroSub: '与课本同步 · 词根记忆 × 个人遗忘曲线',
        learnedToday: 0,
        streakDays: 0,
        totalWords: 0,
        checkedIn: false,
        currentBookName: '初中词汇',
        currentBookTotal: 0,
        masteredCount: 0,
        knownCount: 0,
        dueCount: 0,
        currentBookId: 'junior',
        showPlanCard: false,
        todayWordCount: 0,
        planDueToday: 0,
        planForecast: [],
        quote: null,
        quoteWords: []
    },
    onLoad() {
        this.updateGreeting();
        this.loadStats();
        this.loadQuote();
    },
    onShow() {
        this.updateGreeting();
        this.setData({
            currentBookId: (0, store_1.getCurrentBookId)(),
            showPlanCard: (0, store_1.hasSelectedBook)(),
            todayWordCount: (0, store_1.getTodayLearnedWords)().length
        });
        this.loadStats();
        this.loadQuote();
        if (!(0, store_1.getStats)().totalWords) {
            (0, store_1.restoreStatsFromCloud)().then(() => this.loadStats());
        }
        // 每次进入首页都从云端拉取当前词书的最新进度与统计（修复 PC 端与手机端不一致）：
        // PC 端启动时登录链路容易超时，仅靠启动时的恢复不够；恢复完成后刷新今日已学词数
        if (getApp().globalData.openid || wx.getStorageSync('bc_openid')) {
            (0, store_1.restoreProgressFromCloud)((0, store_1.getCurrentBookId)());
            (0, store_1.restoreStatsFromCloud)().then(() => {
                this.loadStats();
                this.setData({ todayWordCount: (0, store_1.getTodayLearnedWords)().length });
            });
        }
    },
    updateGreeting() {
        const hour = new Date().getHours();
        let greeting = '';
        let title = '';
        if (hour < 6) {
            greeting = '夜深了，注意休息';
            title = '坚持学习的人最耀眼';
        }
        else if (hour < 9) {
            greeting = '早上好';
            title = '新的一天，从单词开始';
        }
        else if (hour < 12) {
            greeting = '上午好';
            title = '今天也要加油学英语！';
        }
        else if (hour < 14) {
            greeting = '中午好';
            title = '午间小憩，温故知新';
        }
        else if (hour < 18) {
            greeting = '下午好';
            title = '继续努力，不要停下';
        }
        else if (hour < 22) {
            greeting = '晚上好';
            title = '晚间复习，记忆更深';
        }
        else {
            greeting = '夜深了';
            title = '坚持学习的人最耀眼';
        }
        this.setData({ greetingText: greeting, heroTitle: title });
    },
    async loadStats() {
        const stats = (0, store_1.getStats)();
        const bookId = (0, store_1.getCurrentBookId)();
        const localBook = index_1.wordBooks.find(b => b.id === bookId);
        let bookName = localBook?.name || '初中词汇';
        let bookTotal = localBook?.words.length || 0;
        try {
            const book = await (0, wordService_1.getBookById)(bookId);
            if (book && book.words.length > 0) {
                bookName = book.name;
                bookTotal = book.words.length;
            }
        }
        catch (e) {
            console.error('获取词书信息失败', e);
        }
        const progressStats = (0, store_1.getBookProgressStats)(bookId);
        this.setData({
            learnedToday: stats.learnedToday,
            streakDays: stats.streakDays,
            totalWords: stats.totalWords,
            checkedIn: stats.checkedIn,
            currentBookName: bookName,
            currentBookTotal: bookTotal,
            masteredCount: progressStats.masteredCount,
            knownCount: progressStats.knownCount,
            dueCount: progressStats.dueCount
        });
        this.refreshPlan();
    },
    refreshPlan() {
        const bookId = (0, store_1.getCurrentBookId)();
        const plan = (0, store_1.getReviewPlan)(bookId);
        const forecast = [
            { label: '今天', count: plan.dueToday },
            ...plan.forecast.slice(0, 2)
        ];
        this.setData({
            planDueToday: plan.dueToday,
            planForecast: forecast
        });
    },
    onPlanTap() {
        if (!(0, store_1.hasSelectedBook)()) {
            wx.navigateTo({ url: '/pages/booklist/booklist' });
            return;
        }
        if (this.data.planDueToday > 0) {
            this.goReview();
        }
        else {
            this.goWords();
        }
    },
    goTodayReview() {
        wx.setStorageSync('bc_today_review', 1);
        wx.switchTab({ url: '/pages/words/words' });
    },
    goPlan() {
        wx.navigateTo({ url: '/pages/plan/plan' });
    },
    changeBook() {
        wx.navigateTo({ url: '/pages/booklist/booklist' });
    },
    goWords() {
        if (!(0, store_1.hasSelectedBook)()) {
            wx.navigateTo({ url: '/pages/booklist/booklist' });
            return;
        }
        wx.setStorageSync('bc_new_round', 1);
        wx.switchTab({
            url: '/pages/words/words'
        });
    },
    goReview() {
        const due = this.data.planDueToday || this.data.dueCount;
        if (!due || due <= 0) {
            wx.showToast({ title: '这会儿没有要复习的词，去学新词吧', icon: 'none' });
            return;
        }
        wx.setStorageSync('bc_review_mode', 1);
        wx.switchTab({
            url: '/pages/words/words'
        });
    },
    goMine() {
        wx.switchTab({
            url: '/pages/mine/mine'
        });
    },
    goSearch() {
        wx.navigateTo({
            url: '/pages/search/search'
        });
    },
    goGalaxy() {
        wx.navigateTo({
            url: '/pages/galaxy/galaxy'
        });
    },
    goMemory() {
        wx.navigateTo({
            url: '/pages/memory/memory'
        });
    },
    goWrongBook() {
        wx.navigateTo({
            url: '/pages/wrongbook/wrongbook'
        });
    },
    goVocabTest() {
        wx.navigateTo({
            url: '/pages/vocabtest/vocabtest'
        });
    },
    goTextbook() {
        wx.navigateTo({
            url: '/pages/booklist/booklist?tab=textbook'
        });
    },
    goQuotes() {
        wx.navigateTo({
            url: '/pages/quotes/quotes'
        });
    },
    loadQuote() {
        const q = (0, quotes_1.getDailyQuote)();
        this.setData({
            quote: q,
            quoteWords: q.words
        });
    },
    onShareAppMessage() {
        return {
            title: '英语补词达人 · 与课本同步的背单词神器',
            path: '/pages/index/index'
        };
    },
    onShareTimeline() {
        return {
            title: '英语补词达人 · 与课本同步的背单词神器'
        };
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLDZDQUFrSztBQUNsSyx5REFBc0Q7QUFHdEQsNENBQTJEO0FBQzNELDhDQUF5RDtBQUV6RCxJQUFJLENBQUM7SUFDSCxJQUFJLEVBQUU7UUFFSixZQUFZLEVBQUUsRUFBRTtRQUNoQixTQUFTLEVBQUUsWUFBWTtRQUN2QixPQUFPLEVBQUUsdUJBQXVCO1FBQ2hDLFlBQVksRUFBRSxDQUFDO1FBQ2YsVUFBVSxFQUFFLENBQUM7UUFDYixVQUFVLEVBQUUsQ0FBQztRQUNiLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLGVBQWUsRUFBRSxNQUFNO1FBQ3ZCLGdCQUFnQixFQUFFLENBQUM7UUFDbkIsYUFBYSxFQUFFLENBQUM7UUFDaEIsVUFBVSxFQUFFLENBQUM7UUFDYixRQUFRLEVBQUUsQ0FBQztRQUNYLGFBQWEsRUFBRSxRQUFRO1FBRXZCLFlBQVksRUFBRSxLQUFLO1FBRW5CLGNBQWMsRUFBRSxDQUFDO1FBQ2pCLFlBQVksRUFBRSxDQUFDO1FBQ2YsWUFBWSxFQUFFLEVBQXdDO1FBRXRELEtBQUssRUFBRSxJQUFvQjtRQUMzQixVQUFVLEVBQUUsRUFBYztLQUMzQjtJQUVELE1BQU07UUFDSixJQUFJLENBQUMsY0FBYyxFQUFFLENBQUM7UUFDdEIsSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxTQUFTLEVBQUUsQ0FBQztJQUNuQixDQUFDO0lBRUQsTUFBTTtRQUVKLElBQUksQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUN0QixJQUFJLENBQUMsT0FBTyxDQUFDO1lBQ1gsYUFBYSxFQUFFLElBQUEsd0JBQWdCLEdBQUU7WUFDakMsWUFBWSxFQUFFLElBQUEsdUJBQWUsR0FBRTtZQUMvQixjQUFjLEVBQUUsSUFBQSw0QkFBb0IsR0FBRSxDQUFDLE1BQU07U0FDOUMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxDQUFDLFNB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Q0FBQztJQUNMLENBQUM7SUFHRCxpQkFBaUI7UUFDZixPQUFPO1lBQ0wsS0FBSyxFQUFFLHNCQUFzQjtZQUM3QixJQUFJLEVBQUUsb0JBQW9CO1NBQzNCLENBQUM7SUFDSixDQUFDO0lBR0QsZUFBZTtRQUNiLE9BQU87WUFDTCxLQUFLLEVBQUUsc0JBQXNCO1NBQzlCLENBQUM7SUFDSixDQUFDO0NBQ0YsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gcGFnZXMvaW5kZXgvaW5kZXgudHNcbmltcG9ydCB7IGdldFN0YXRzLCBnZXRDdXJyZW50Qm9va0lkLCBoYXNTZWxlY3RlZEJvb2ssIGdldEJvb2tQcm9ncmVzc1N0YXRzLCBnZXRSZXZpZXdQbGFuLCByZXN0b3JlU3RhdHNGcm9tQ2xvdWQsIGdldFRvZGF5TGVhcm5lZFdvcmRzIH0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHsgZ2V0Qm9va0J5SWQgfSBmcm9tICcuLi8uLi91dGlscy93b3JkU2VydmljZSc7XG5cbi8vIOacrOWcsOenjeWtkOivjeW6k++8iOWFkeW6le+8iVxuaW1wb3J0IHsgd29yZEJvb2tzIGFzIGxvY2FsQm9va3MgfSBmcm9tICcuLi8uLi9kYXRhL2luZGV4JztcbmltcG9ydCB7IGdldERhaWx5UXVvdGUsIFF1b3RlIH0gZnJvbSAnLi4vLi4vZGF0YS9xdW90ZXMnO1xuXG5QYWdlKHtcbiAgZGF0YToge1xuICAgIC8vIEhlcm8g6Zeu5YCZXG4gICAgZ3JlZXRpbmdUZXh0OiAnJyxcbiAgICBoZXJvVGl0bGU6ICfku4rlpKnkuZ/opoHliqDmsrnlraboi7Hor63vvIEnLFxuICAgIGhlcm9TdWI6ICfkuI7or77mnKzlkIzmraUgwrcg6K+N5qC56K6w5b+GIMOXIOS4quS6uumBl+W/mOabsue6vycsXG4gICAgbGVhcm5lZFRvZGF5OiAwLFxuICAgIHN0cmVha0RheXM6IDAsXG4gICAgdG90YWxXb3JkczogMCxcbiAgICBjaGVja2VkSW46IGZhbHNlLFxuICAgIGN1cnJlbnRCb29rTmFtZTogJ+WIneS4reivjeaxhycsXG4gICAgY3VycmVudEJvb2tUb3RhbDogMCxcbiAgICBtYXN0ZXJlZENvdW50OiAwLFxuICAgIGtub3duQ291bnQ6IDAsXG4gICAgZHVlQ291bnQ6IDAsXG4gICAgY3VycmVudEJvb2tJZDogJ2p1bmlvcicsXG4gICAgLy8g5LuK5pel5aSN5Lmg6K6h5YiS5Y2h54mHXG4gICAgc2hvd1BsYW5DYXJkOiBmYWxzZSxcbiAgICAvLyDku4rml6Xlrabov4for43mlbDvvIjku4rml6XlpI3nm5jovbvph4/ljaHvvIlcbiAgICB0b2RheVdvcmRDb3VudDogMCxcbiAgICBwbGFuRHVlVG9kYXk6IDAsXG4gICAgcGxhbkZvcmVjYXN0OiBbXSBhcyB7IGxhYmVsOiBzdHJpbmc7IGNvdW50OiBudW1iZXIgfVtdLFxuICAgIC8vIOS7iuaXpemHkeWPpVxuICAgIHF1b3RlOiBudWxsIGFzIFF1b3RlIHwgbnVsbCxcbiAgICBxdW90ZVdvcmRzOiBbXSBhcyBzdHJpbmdbXVxuICB9LFxuXG4gIG9uTG9hZCgpIHtcbiAgICB0aGlzLnVwZGF0ZUdyZWV0aW5nKCk7XG4gICAgdGhpcy5sb2FkU3RhdHMoKTtcbiAgICB0aGlzLmxvYWRRdW90ZSgpO1xuICB9LFxuXG4gIG9uU2hvdygpIHtcbiAgICAvLyDpppbmrKHkvb/nlKjkuI3lho3lvLrliLbot7PpgInkuabpobXvvJrlhYjorqnnlKjmiLfmtY/op4jpppbpobXvvIzngrnlhbfkvZPlip/og73ml7blho3lvJXlr7zpgInkuaZcbiAgICB0aGlzLnVwZGF0ZUdyZWV0aW5nKCk7XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIGN1cnJlbnRCb29rSWQ6IGdldEN1cnJlbnRCb29rSWQoKSxcbiAgICAgIHNob3dQbGFuQ2FyZDogaGFzU2VsZWN0ZWRCb29rKCksXG4gICAgICB0b2RheVdvcmRDb3VudDogZ2V0VG9kYXlMZWFybmVkV29yZHMoKS5sZW5ndGhcbiAgICB9KTtcbiAgICB0aGlzLmxvYWRTdGF0cygpO1xuICAgIHRoaXMubG9hZFF1b3RlKCk7XG5cbiAgICAvLyDmnKzlnLDnu5/orqHkuLrnqbrvvIjlpoLliJrmuIXnvJPlrZjvvInvvJrpnZnpu5jku47kupHnq6/mgaLlpI3ljoblj7LvvIzpgb/lhY3pppbpobXlh7rnjrAgMCDnmoTlgYfosaFcbiAgICBpZiAoIWdldFN0YXRzKCkudG90YWxXb3Jkcykge1xuICAgICAgcmVzdG9yZVN0YXRzRnJvbUNsb3VkKCkudGhlbigoKSA9PiB0aGlzLmxvYWRTdGF0cygpKTtcbiAgICB9XG4gIH0sXG5cbiAgLy8g5qC55o2u5pe26Ze05pu05paw6Zeu5YCZ6K+tXG4gIHVwZGF0ZUdyZWV0aW5nKCkge1xuICAgIGNvbnN0IGhvdXIgPSBuZXcgRGF0ZSgpLmdldEhvdXJzKCk7XG4gICAgbGV0IGdyZWV0aW5nID0gJyc7XG4gICAgbGV0IHRpdGxlID0gJyc7XG4gICAgaWYgKGhvdXIgPCA2KSB7XG4gICAgICBncmVldGluZyA9ICflpJzmt7HkuobvvIzms6jmhI/kvJHmga8nO1xuICAgICAgdGl0bGUgPSAn5Z2a5oyB5a2m5Lmg55qE5Lq65pyA6ICA55y8JztcbiAgICB9IGVsc2UgaWYgKGhvdXIgPCA5KSB7XG4gICAgICBncmVldGluZyA9ICfml6nkuIrlpb0nO1xuICAgICAgdGl0bGUgPSAn5paw55qE5LiA5aSp77yM5LuO5Y2V6K+N5byA5aeLJztcbiAgICB9IGVsc2UgaWYgKGhvdXIgPCAxMikge1xuICAgICAgZ3JlZXRpbmcgPSAn5LiK5Y2I5aW9JztcbiAgICAgIHRpdGxlID0gJ+S7iuWkqeS5n+imgeWKoOayueWtpuiLseivre+8gSc7XG4gICAgfSBlbHNlIGlmIChob3VyIDwgMTQpIHtcbiAgICAgIGdyZWV0aW5nID0gJ+S4reWNiOWlvSc7XG4gICAgICB0aXRsZSA9ICfljYjpl7TlsI/mhqnvvIzmuKnmlYXnn6XmlrAnO1xuICAgIH0gZWxzZSBpZiAoaG91ciA8IDE4KSB7XG4gICAgICBncmVldGluZyA9ICfkuIvljYjlpb0nO1xuICAgICAgdGl0bGUgPSAn57un57ut5Yqq5Yqb77yM5LiN6KaB5YGc5LiLJztcbiAgICB9IGVsc2UgaWYgKGhvdXIgPCAyMikge1xuICAgICAgZ3JlZXRpbmcgPSAn5pma5LiK5aW9JztcbiAgICAgIHRpdGxlID0gJ+aZmumXtOWkjeS5oO+8jOiusOW/huabtOa3sSc7XG4gICAgfSBlbHNlIHtcbiAgICAgIGdyZWV0aW5nID0gJ+WknOa3seS6hic7XG4gICAgICB0aXRsZSA9ICflnZrmjIHlrabkuaDnmoTkurrmnIDogIDnnLwnO1xuICAgIH1cbiAgICB0aGlzLnNldERhdGEoeyBncmVldGluZ1RleHQ6IGdyZWV0aW5nLCBoZXJvVGl0bGU6IHRpdGxlIH0pO1xuICB9LFxuXG4gIGFzeW5jIGxvYWRTdGF0cygpIHtcbiAgICBjb25zdCBzdGF0cyA9IGdldFN0YXRzKCk7XG4gICAgY29uc3QgYm9va0lkID0gZ2V0Q3VycmVudEJvb2tJZCgpO1xuXG4gICAgLy8g5YWI5LuO5pys5Zyw6I635Y+W6K+N5Lmm5ZCN56ewXG4gICAgY29uc3QgbG9jYWxCb29rID0gbG9jYWxCb29rcy5maW5kKGIgPT4gYi5pZCA9PT0gYm9va0lkKTtcbiAgICBsZXQgYm9va05hbWUgPSBsb2NhbEJvb2s/Lm5hbWUgfHwgJ+WIneS4reivjeaxhyc7XG4gICAgbGV0IGJvb2tUb3RhbCA9IGxvY2FsQm9vaz8ud29yZHMubGVuZ3RoIHx8IDA7XG5cbiAgICAvLyDlvILmraXku47kupHnq6/ojrflj5blh4bnoa7mlbDmja5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYm9vayA9IGF3YWl0IGdldEJvb2tCeUlkKGJvb2tJZCk7XG4gICAgICBpZiAoYm9vayAmJiBib29rLndvcmRzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgYm9va05hbWUgPSBib29rLm5hbWU7XG4gICAgICAgIGJvb2tUb3RhbCA9IGJvb2sud29yZHMubGVuZ3RoO1xuICAgICAgfVxuICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ+iOt+WPluivjeS5puS/oeaBr+Wksei0pScsIGUpO1xuICAgIH1cblxuICAgIC8vIOS9v+eUqOe7n+S4gOeahOe7n+iuoeWHveaVsO+8jOWfuuS6jiBMZWl0bmVyIGJveCDnrYnnuqdcbiAgICBjb25zdCBwcm9ncmVzc1N0YXRzID0gZ2V0Qm9va1Byb2dyZXNzU3RhdHMoYm9va0lkKTtcblxuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBsZWFybmVkVG9kYXk6IHN0YXRzLmxlYXJuZWRUb2RheSxcbiAgICAgIHN0cmVha0RheXM6IHN0YXRzLnN0cmVha0RheXMsXG4gICAgICB0b3RhbFdvcmRzOiBzdGF0cy50b3RhbFdvcmRzLFxuICAgICAgY2hlY2tlZEluOiBzdGF0cy5jaGVja2VkSW4sXG4gICAgICBjdXJyZW50Qm9va05hbWU6IGJvb2tOYW1lLFxuICAgICAgY3VycmVudEJvb2tUb3RhbDogYm9va1RvdGFsLFxuICAgICAgbWFzdGVyZWRDb3VudDogcHJvZ3Jlc3NTdGF0cy5tYXN0ZXJlZENvdW50LFxuICAgICAga25vd25Db3VudDogcHJvZ3Jlc3NTdGF0cy5rbm93bkNvdW50LFxuICAgICAgZHVlQ291bnQ6IHByb2dyZXNzU3RhdHMuZHVlQ291bnRcbiAgICB9KTtcblxuICAgIC8vIOS7iuaXpeWkjeS5oOiuoeWIku+8iFNNLTIg5Yiw5pyf6IGa5ZCI77yM5pys5Zyw5ZCM5q2l6K6h566X77yJXG4gICAgdGhpcy5yZWZyZXNoUGxhbigpO1xuICB9LFxuXG4gIC8vIOWIt+aWsOmmlumhteOAjOS7iuaXpeWkjeS5oOiuoeWIkuOAjeWNoeeJh1xuICByZWZyZXNoUGxhbigpIHtcbiAgICBjb25zdCBib29rSWQgPSBnZXRDdXJyZW50Qm9va0lkKCk7XG4gICAgY29uc3QgcGxhbiA9IGdldFJldmlld1BsYW4oYm9va0lkKTtcbiAgICBjb25zdCBmb3JlY2FzdCA9IFtcbiAgICAgIHsgbGFiZWw6ICfku4rlpKknLCBjb3VudDogcGxhbi5kdWVUb2RheSB9LFxuICAgICAgLi4ucGxhbi5mb3JlY2FzdC5zbGljZSgwLCAyKSAvLyDmmI7lpKkgLyDlkI7lpKlcbiAgICBdO1xuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBwbGFuRHVlVG9kYXk6IHBsYW4uZHVlVG9kYXksXG4gICAgICBwbGFuRm9yZWNhc3Q6IGZvcmVjYXN0XG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g6K6h5YiS5Y2h54K55Ye777ya5pyJ5Yiw5pyf6K+N55u05o6l5byA5aSN5Lmg6L2u77yM5ZCm5YiZ5Y675a2m5paw6K+NXG4gIG9uUGxhblRhcCgpIHtcbiAgICBpZiAoIWhhc1NlbGVjdGVkQm9vaygpKSB7XG4gICAgICB3eC5uYXZpZ2F0ZVRvKHsgdXJsOiAnL3BhZ2VzL2Jvb2tsaXN0L2Jvb2tsaXN0JyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKHRoaXMuZGF0YS5wbGFuRHVlVG9kYXkgPiAwKSB7XG4gICAgICB0aGlzLmdvUmV2aWV3KCk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMuZ29Xb3JkcygpO1xuICAgIH1cbiAgfSxcblxuICAvLyDku4rml6XlpI3nm5jvvJrmnKzova7lj6rph43liLfku4rlpKnlrabov4fnmoTor41cbiAgZ29Ub2RheVJldmlldygpIHtcbiAgICB3eC5zZXRTdG9yYWdlU3luYygnYmNfdG9kYXlfcmV2aWV3JywgMSk7XG4gICAgd3guc3dpdGNoVGFiKHsgdXJsOiAnL3BhZ2VzL3dvcmRzL3dvcmRzJyB9KTtcbiAgfSxcblxuICAvLyDmn6XnnIvlrozmlbTlpI3kuaDorqHliJLpobVcbiAgZ29QbGFuKCkge1xuICAgIHd4Lm5hdmlnYXRlVG8oeyB1cmw6ICcvcGFnZXMvcGxhbi9wbGFuJyB9KTtcbiAgfSxcblxuICAvLyDliIfmjaLor43kuabvvJrov5vlhaXor43kuabpgInmi6npobXvvIjlvZPliY3or43kuabmjqjojZDljaEgKyDogIPor5Uv5pWZ5p2Q5YiG57uE5YiX6KGo77yJXG4gIGNoYW5nZUJvb2soKSB7XG4gICAgd3gubmF2aWdhdGVUbyh7IHVybDogJy9wYWdlcy9ib29rbGlzdC9ib29rbGlzdCcgfSk7XG4gIH0sXG5cbiAgZ29Xb3JkcygpIHtcbiAgICAvLyDmnKrpgInor43kuabvvJrlhYjlvJXlr7zpgInkuabvvIjlu7bov5/liLDnlKjmiLflrp7pmYXpnIDopoHml7bvvIlcbiAgICBpZiAoIWhhc1NlbGVjdGVkQm9vaygpKSB7XG4gICAgICB3eC5uYXZpZ2F0ZVRvKHsgdXJsOiAnL3BhZ2VzL2Jvb2tsaXN0L2Jvb2tsaXN0JyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgLy8g5Li75Yqo54K54oCc5a2m5paw6K+N4oCd77ya6YCa55+lIHdvcmRzIOmhteW8gOaWsOeahOS4gOi9ru+8iOi3s+i/h+WFtuKAnOaVsOaNruacquWPmOi3s+i/h+mHjeW7uuKAneWuiOWNq++8iVxuICAgIHd4LnNldFN0b3JhZ2VTeW5jKCdiY19uZXdfcm91bmQnLCAxKTtcbiAgICB3eC5zd2l0Y2hUYWIoe1xuICAgICAgdXJsOiAnL3BhZ2VzL3dvcmRzL3dvcmRzJ1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOebtOi+vuKAnOW+heWkjeS5oOKAne+8muWPquWkjeS5oOWIsOacn+W+heWkjeS5oOivjVxuICBnb1JldmlldygpIHtcbiAgICAvLyDkuI5cIuS7iuaXpeWkjeS5oOiuoeWIklwi5Y2h54mH5ZCM5LiA5pWw5o2u5rqQ77yIU00tMiDliLDmnJ/vvInvvIzpgb/lhY3kuKTlpZflj6PlvoTmiZPmnrbvvJpcbiAgICAvLyDljaHniYfmmL7npLogMyDkuKrlvoXlpI3kuaDvvIzngrnov5vmnaXljbTor7TmsqHmnInor41cbiAgICBjb25zdCBkdWUgPSB0aGlzLmRhdGEucGxhbkR1ZVRvZGF5IHx8IHRoaXMuZGF0YS5kdWVDb3VudDtcbiAgICBpZiAoIWR1ZSB8fCBkdWUgPD0gMCkge1xuICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfov5nkvJrlhL/msqHmnInopoHlpI3kuaDnmoTor43vvIzljrvlrabmlrDor43lkKcnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIHd4LnNldFN0b3JhZ2VTeW5jKCdiY19yZXZpZXdfbW9kZScsIDEpO1xuICAgIHd4LnN3aXRjaFRhYih7XG4gICAgICB1cmw6ICcvcGFnZXMvd29yZHMvd29yZHMnXG4gICAgfSk7XG4gIH0sXG5cbiAgZ29NaW5lKCkge1xuICAgIHd4LnN3aXRjaFRhYih7XG4gICAgICB1cmw6ICcvcGFnZXMvbWluZS9taW5lJ1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOi3s+i9rOaQnOWNleivjVxuICBnb1NlYXJjaCgpIHtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogJy9wYWdlcy9zZWFyY2gvc2VhcmNoJ1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOi3s+i9rOivjeagueaYn+ezu1xuICBnb0dhbGF4eSgpIHtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogJy9wYWdlcy9nYWxheHkvZ2FsYXh5J1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOi3s+i9rOiusOW/huS9k+ajgFxuICBnb01lbW9yeSgpIHtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogJy9wYWdlcy9tZW1vcnkvbWVtb3J5J1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOabtOWkmueOqeazleW3suaSpOmUgO+8iDIwMjYtMDgtMzEg5pS25pWb5ZCO5LuF5YmpIDIg6aG577yM55u05o6l5pS+5Ye65Yiw6aaW6aG15a6r5qC877yJXG4gIC8vIOi3s+i9rOeUn+ivjeacrFxuICBnb1dyb25nQm9vaygpIHtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogJy9wYWdlcy93cm9uZ2Jvb2svd3Jvbmdib29rJ1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOi3s+i9rOivjeaxh+mHj+a1i+ivlVxuICBnb1ZvY2FiVGVzdCgpIHtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogJy9wYWdlcy92b2NhYnRlc3Qvdm9jYWJ0ZXN0J1xuICAgIH0pO1xuICB9LFxuXG4gIC8vIOi3s+i9rOaVmeadkOWQjOatpeS4k+WMuu+8iOebtOi+vuivjeS5pumhteeahOaVmeadkCBUYWLvvIlcbiAgZ29UZXh0Ym9vaygpIHtcbiAgICB3eC5uYXZpZ2F0ZVRvKHtcbiAgICAgIHVybDogJy9wYWdlcy9ib29rbGlzdC9ib29rbGlzdD90YWI9dGV4dGJvb2snXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g6Lez6L2s6YeR5Y+l6ZuG77yI5pu05aSa6YeR5Y+l77yJXG4gIGdvUXVvdGVzKCkge1xuICAgIHd4Lm5hdmlnYXRlVG8oe1xuICAgICAgdXJsOiAnL3BhZ2VzL3F1b3Rlcy9xdW90ZXMnXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5Yqg6L295LuK5pel6YeR5Y+lXG4gIGxvYWRRdW90ZSgpIHtcbiAgICBjb25zdCBxID0gZ2V0RGFpbHlRdW90ZSgpO1xuICAgIHRoaXMuc2V0RGF0YSh7XG4gICAgICBxdW90ZTogcSxcbiAgICAgIHF1b3RlV29yZHM6IHEud29yZHNcbiAgICB9KTtcbiAgfSxcblxuICAvLyDovazlj5Hnu5nlpb3lj4tcbiAgb25TaGFyZUFwcE1lc3NhZ2UoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiAn6Iux6K+t6KGl6K+N6L6+5Lq6IMK3IOS4juivvuacrOWQjOatpeeahOiDjOWNleivjeelnuWZqCcsXG4gICAgICBwYXRoOiAnL3BhZ2VzL2luZGV4L2luZGV4J1xuICAgIH07XG4gIH0sXG5cbiAgLy8g5YiG5Lqr5Yiw5pyL5Y+L5ZyI77yI5Y2V6aG15qih5byP77yJXG4gIG9uU2hhcmVUaW1lbGluZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6ICfoi7Hor63ooaXor43ovr7kurogwrcg5LiO6K++5pys5ZCM5q2l55qE6IOM5Y2V6K+N56We5ZmoJ1xuICAgIH07XG4gIH0sXG59KTtcbiJdfQ==