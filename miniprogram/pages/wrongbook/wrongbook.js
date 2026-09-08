"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const store_1 = require("../../utils/store");
const audio_1 = require("../../utils/audio");
const todayExport_1 = require("../../utils/todayExport");
Page({
    data: {
        words: [],
        isEmpty: true
    },
    onShow() {
        this.loadWords();
    },
    loadWords() {
        const words = (0, store_1.getWrongBook)();
        this.setData({
            words,
            isEmpty: words.length === 0
        });
    },
    onExport() {
        const rows = this.data.words.map((w) => ({
            word: w.word,
            meaning: w.meaning || '',
            phonetic: '',
            known: true
        }));
        (0, todayExport_1.showExportSheet)(rows, () => this._getExportCanvas(), {
            title: '生词本 · 中英对照',
            footText: '英语补词达人 · 生词本导出',
            namePrefix: '生词本',
            emptyTip: '生词本还是空的',
            buildTsvTitle: '生词本'
        });
    },
    _getExportCanvas() {
        return new Promise((resolve, reject) => {
            wx.createSelectorQuery().in(this)
                .select('#exportCanvas')
                .fields({ node: true })
                .exec((res) => {
                if (res && res[0] && res[0].node)
                    resolve(res[0].node);
                else
                    reject(new Error('canvas 未就绪'));
            });
        });
    },
    onPlayAudio(e) {
        const word = e.currentTarget.dataset.word;
        if (word)
            (0, audio_1.playAudio)(word, 'us');
    },
    onRemove(e) {
        const word = e.currentTarget.dataset.word;
        wx.showModal({
            title: '确认移除',
            content: `确定将「${word}」从生词本移除吗？`,
            success: (res) => {
                if (res.confirm) {
                    (0, store_1.removeFromWrongBook)(word);
                    this.loadWords();
                    wx.showToast({ title: '已移除', icon: 'success' });
                }
            }
        });
    },
    onClearAll() {
        if (this.data.words.length === 0) {
            wx.showToast({ title: '生词本是空的', icon: 'none' });
            return;
        }
        wx.showModal({
            title: '确认清空',
            content: '确定清空所有生词吗？此操作不可撤销。',
            success: (res) => {
                if (res.confirm) {
                    (0, store_1.clearWrongBook)();
                    this.loadWords();
                    wx.showToast({ title: '已清空', icon: 'success' });
                }
            }
        });
    },
    onBack() {
        wx.navigateBack();
    },
    onShareAppMessage() {
        return {
            title: '错题本 · 答错过的不再错',
            path: '/pages/index/index'
        };
    },
    onShareTimeline() {
        return {
            title: '错题本 · 答错过的不再错'
        };
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid3Jvbmdib29rLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid3Jvbmdib29rLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsNkNBQXFHO0FBQ3JHLDZDQUE4QztBQUM5Qyx5REFBb0U7QUFFcEUsSUFBSSxDQUFDO0lBQ0gsSUFBSSxFQUFFO1FBQ0osS0FBSyxFQUFFLEVBQXFCO1FBQzVCLE9BQU8sRUFBRSxJQUFJO0tBQ2Q7SUFFRCxNQUFNO1FBQ0osSUFBSSxDQUFDLFNBQVMsRUFBRSxDQUFDO0lBQ25CLENBQUM7SUFFRCxTQUFTO1FBQ1AsTUFBTSxLQUFLLEdBQUcsSUFBQSxvQkFBWSxHQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLE9BQU8sQ0FBQztZQUNYLEtBQUs7WUFDTCxPQUFPLEVBQUUsS0FBSyxDQUFDLE1BQU0sS0FBSyxDQUFDO1NBQzVCLENBQUMsQ0FBQztJQUNMLENBQUM7SUFHRCxRQUFRO1FBQ04sTUFBTSxJQUFJLEdBQWUsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBZ0IsRUFBRSxFQUFFLENBQUMsQ0FBQztZQUNsRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLElBQUk7WUFDWixPQUFPLEVBQUUsQ0FBQyxDQUFDLE9BQU8sSUFBSSxFQUFFO1lBQ3hCLFFBQVEsRUFBRSxFQUFFO1lBQ1osS0FBSyxFQUFFLElBQUk7U0FDWixDQUFDLENBQUMsQ0FBQztRQUNKLElBQUEsNkJBQWUsRUFBQyxJQUFJLEVBQUUsR0FBRyxFQUFFLENBQUMsSUFBSSxDQUFDLGdCQUFnQixFQUFFLEVBQUU7WUFDbkQsS0FBSyxFQUFFLFlBQVk7WUFDbkIsUUFBUSxFQUFFLGdCQUFnQjtZQUMxQixVQUFVLEVBQUUsS0FBSztZQUNqQixRQUFRLEVBQUUsU0FBUztZQUNuQixhQUFhLEVBQUUsS0FBSztTQUNyQixDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsZ0JBQWdCO1FBQ2QsT0FBTyxJQUFJLE9BQU8sQ0FBQyxD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bmdCb29rLCByZW1vdmVGcm9tV3JvbmdCb29rLCBjbGVhcldyb25nQm9vaywgV3JvbmdCb29rSXRlbSB9IGZyb20gJy4uLy4uL3V0aWxzL3N0b3JlJztcbmltcG9ydCB7IHBsYXlBdWRpbyB9IGZyb20gJy4uLy4uL3V0aWxzL2F1ZGlvJztcbmltcG9ydCB7IHNob3dFeHBvcnRTaGVldCwgVG9kYXlSb3cgfSBmcm9tICcuLi8uLi91dGlscy90b2RheUV4cG9ydCc7XG5cblBhZ2Uoe1xuICBkYXRhOiB7XG4gICAgd29yZHM6IFtdIGFzIFdyb25nQm9va0l0ZW1bXSxcbiAgICBpc0VtcHR5OiB0cnVlXG4gIH0sXG5cbiAgb25TaG93KCkge1xuICAgIHRoaXMubG9hZFdvcmRzKCk7XG4gIH0sXG5cbiAgbG9hZFdvcmRzKCkge1xuICAgIGNvbnN0IHdvcmRzID0gZ2V0V3JvbmdCb29rKCk7XG4gICAgdGhpcy5zZXREYXRhKHtcbiAgICAgIHdvcmRzLFxuICAgICAgaXNFbXB0eTogd29yZHMubGVuZ3RoID09PSAwXG4gICAgfSk7XG4gIH0sXG5cbiAgLy8g5a+85Ye655Sf6K+N5pys77yI5paH5pysIC8g5Zu+54mHIC8gRXhjZWzvvIlcbiAgb25FeHBvcnQoKSB7XG4gICAgY29uc3Qgcm93czogVG9kYXlSb3dbXSA9IHRoaXMuZGF0YS53b3Jkcy5tYXAoKHc6IFdyb25nQm9va0l0ZW0pID0+ICh7XG4gICAgICB3b3JkOiB3LndvcmQsXG4gICAgICBtZWFuaW5nOiB3Lm1lYW5pbmcgfHwgJycsXG4gICAgICBwaG9uZXRpYzogJycsXG4gICAgICBrbm93bjogdHJ1ZVxuICAgIH0pKTtcbiAgICBzaG93RXhwb3J0U2hlZXQocm93cywgKCkgPT4gdGhpcy5fZ2V0RXhwb3J0Q2FudmFzKCksIHtcbiAgICAgIHRpdGxlOiAn55Sf6K+N5pysIMK3IOS4reiLseWvueeFpycsXG4gICAgICBmb290VGV4dDogJ+iLseivreihpeivjei+vuS6uiDCtyDnlJ/or43mnKzlr7zlh7onLFxuICAgICAgbmFtZVByZWZpeDogJ+eUn+ivjeacrCcsXG4gICAgICBlbXB0eVRpcDogJ+eUn+ivjeacrOi/mOaYr+epuueahCcsXG4gICAgICBidWlsZFRzdlRpdGxlOiAn55Sf6K+N5pysJ1xuICAgIH0pO1xuICB9LFxuXG4gIF9nZXRFeHBvcnRDYW52YXMoKTogUHJvbWlzZTxhbnk+IHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgd3guY3JlYXRlU2VsZWN0b3JRdWVyeSgpLmluKHRoaXMpXG4gICAgICAgIC5zZWxlY3QoJyNleHBvcnRDYW52YXMnKVxuICAgICAgICAuZmllbGRzKHsgbm9kZTogdHJ1ZSB9KVxuICAgICAgICAuZXhlYygocmVzOiBhbnkpID0+IHtcbiAgICAgICAgICBpZiAocmVzICYmIHJlc1swXSAmJiByZXNbMF0ubm9kZSkgcmVzb2x2ZShyZXNbMF0ubm9kZSk7XG4gICAgICAgICAgZWxzZSByZWplY3QobmV3IEVycm9yKCdjYW52YXMg5pyq5bCx57uqJykpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgfSxcblxuICAvLyDmkq3mlL7lj5Hpn7NcbiAgb25QbGF5QXVkaW8oZTogYW55KSB7XG4gICAgY29uc3Qgd29yZCA9IGUuY3VycmVudFRhcmdldC5kYXRhc2V0LndvcmQgYXMgc3RyaW5nO1xuICAgIGlmICh3b3JkKSBwbGF5QXVkaW8od29yZCwgJ3VzJyk7XG4gIH0sXG5cbiAgLy8g56e76Zmk55Sf6K+NXG4gIG9uUmVtb3ZlKGU6IGFueSkge1xuICAgIGNvbnN0IHdvcmQgPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC53b3JkIGFzIHN0cmluZztcbiAgICB3eC5zaG93TW9kYWwoe1xuICAgICAgdGl0bGU6ICfnoa7orqTnp7vpmaQnLFxuICAgICAgY29udGVudDogYOehruWumuWwhuOAjCR7d29yZH3jgI3ku47nlJ/or43mnKznp7vpmaTlkJfvvJ9gLFxuICAgICAgc3VjY2VzczogKHJlczogYW55KSA9PiB7XG4gICAgICAgIGlmIChyZXMuY29uZmlybSkge1xuICAgICAgICAgIHJlbW92ZUZyb21Xcm9uZ0Jvb2sod29yZCk7XG4gICAgICAgICAgdGhpcy5sb2FkV29yZHMoKTtcbiAgICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suenu+mZpCcsIGljb246ICdzdWNjZXNzJyB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOa4heepuueUn+ivjeacrFxuICBvbkNsZWFyQWxsKCkge1xuICAgIGlmICh0aGlzLmRhdGEud29yZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+eUn+ivjeacrOaYr+epuueahCcsIGljb246ICdub25lJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgd3guc2hvd01vZGFsKHtcbiAgICAgIHRpdGxlOiAn56Gu6K6k5riF56m6JyxcbiAgICAgIGNvbnRlbnQ6ICfnoa7lrprmuIXnqbrmiYDmnInnlJ/or43lkJfvvJ/mraTmk43kvZzkuI3lj6/mkqTplIDjgIInLFxuICAgICAgc3VjY2VzczogKHJlczogYW55KSA9PiB7XG4gICAgICAgIGlmIChyZXMuY29uZmlybSkge1xuICAgICAgICAgIGNsZWFyV3JvbmdCb29rKCk7XG4gICAgICAgICAgdGhpcy5sb2FkV29yZHMoKTtcbiAgICAgICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3sua4heepuicsIGljb246ICdzdWNjZXNzJyB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pO1xuICB9LFxuXG4gIC8vIOi/lOWbnlxuICBvbkJhY2soKSB7XG4gICAgd3gubmF2aWdhdGVCYWNrKCk7XG4gIH0sXG5cbiAgLy8g6L2s5Y+R57uZ5aW95Y+LXG4gIG9uU2hhcmVBcHBNZXNzYWdlKCkge1xuICAgIHJldHVybiB7XG4gICAgICB0aXRsZTogJ+mUmemimOacrCDCtyDnrZTplJnov4fnmoTkuI3lho3plJknLFxuICAgICAgcGF0aDogJy9wYWdlcy9pbmRleC9pbmRleCdcbiAgICB9O1xuICB9LFxuXG4gIC8vIOWIhuS6q+WIsOaci+WPi+WciO+8iOWNlemhteaooeW8j++8iVxuICBvblNoYXJlVGltZWxpbmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiAn6ZSZ6aKY5pysIMK3IOetlOmUmei/h+eahOS4jeWGjemUmSdcbiAgICB9O1xuICB9LFxufSk7XG4iXX0=