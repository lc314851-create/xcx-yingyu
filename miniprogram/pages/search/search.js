"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../../data/index");
const store_1 = require("../../utils/store");
const audio_1 = require("../../utils/audio");
Page({
    data: {
        keyword: '',
        results: [],
        searching: false,
        hasSearched: false
    },
    onInput(e) {
        this.setData({ keyword: e.detail.value });
    },
    onSearch() {
        const kw = this.data.keyword.trim().toLowerCase();
        if (!kw) {
            this.setData({ results: [], hasSearched: false });
            return;
        }
        this.setData({ searching: true, hasSearched: true });
        const results = [];
        const seen = new Set();
        for (const book of index_1.wordBooks) {
            const allProgress = (0, store_1.getAllProgress)(book.id);
            for (const w of book.words) {
                if (w.word.toLowerCase().includes(kw) && !seen.has(w.word)) {
                    seen.add(w.word);
                    const p = allProgress[w.word];
                    let learned = false;
                    let status = '未学习';
                    if (p) {
                        learned = true;
                        const box = p.box || 1;
                        if (box >= 5) {
                            status = '已掌握';
                        }
                        else if (box >= 3) {
                            status = '复习中';
                        }
                        else {
                            status = '学习中';
                        }
                    }
                    results.push({
                        word: w.word,
                        phonetic: w.phonetic,
                        meaning: w.meaning,
                        example: w.example,
                        bookNames: [book.name],
                        learned,
                        status,
                        root: w.root || '',
                        synonyms: w.synonyms || '',
                        antonyms: w.antonyms || '',
                        relatedWords: w.relatedWords || '',
                        star: w.star || 0
                    });
                }
                else if (seen.has(w.word) && results.length > 0) {
                    const existing = results.find(r => r.word === w.word);
                    if (existing && !existing.bookNames.includes(book.name)) {
                        existing.bookNames.push(book.name);
                    }
                }
            }
        }
        results.sort((a, b) => a.word.localeCompare(b.word));
        this.setData({ results, searching: false });
    },
    onClear() {
        this.setData({ keyword: '', results: [], hasSearched: false });
    },
    onPlayAudio(e) {
        const word = e.currentTarget.dataset.word;
        if (word)
            (0, audio_1.playAudio)(word, 'us');
    },
    onShareAppMessage() {
        return {
            title: '查一个词，补一个词',
            path: '/pages/index/index'
        };
    },
    onShareTimeline() {
        return {
            title: '查一个词，补一个词'
        };
    },
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VhcmNoLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VhcmNoLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQ0EsNENBQTZDO0FBQzdDLDZDQUFtRDtBQUNuRCw2Q0FBOEM7QUFpQjlDLElBQUksQ0FBQztJQUNILElBQUksRUFBRTtRQUNKLE9BQU8sRUFBRSxFQUFFO1FBQ1gsT0FBTyxFQUFFLEVBQW9CO1FBQzdCLFNBQVMsRUFBRSxLQUFLO1FBQ2hCLFdBQVcsRUFBRSxLQUFLO0tBQ25CO0lBRUQsT0FBTyxDQUFDLENBQU07UUFDWixJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLENBQUMsQ0FBQztJQUM1QyxDQUFDO0lBRUQsUUFBUTtRQUNOLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ2xELElBQUksQ0FBQyxFQUFFLEVBQUUsQ0FBQztZQUNSLElBQUksQ0FBQyxPQUFPLENBQUMsRUFBRSxPQUFPLEVBQUUsRUFBRSxFQUFFLFdBQVcsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO1lBQ2xELE9BQU87UUFDVCxDQUFDO1FBRUQsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxDQUFDLENBQUM7UUFFckQsTUFBTSxPQUFPLEdBQW1CLEVBQUUsQ0FBQztRQUNuQyxNQUFNLElBQUksR0FBRyxJQUFJLEdBQUcsRUFBVSxDQUFDO1FBRS9CLEtBQUssTUFBTSxJQUFJLElBQUksaUJBQVMsRUFBRSxDQUFDO1lBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUEsc0JBQWMsRUFBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUMsS0FBSyxNQUFNLENBQUMsSUFBSSxJQUFJLENBQUMsS0FBSyxFQUFFLENBQUM7Z0JB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Q2hCLE1BQU0sSUFBSSxHQUFHLENBQUMsQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLElBQWMsQ0FBQztRQUNwRCxJQUFJLElBQUk7WUFBRSxJQUFBLGlCQUFTLEVBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFHRCxpQkFBaUI7UUFDZixPQUFPO1lBQ0wsS0FBSyxFQUFFLFdBQVc7WUFDbEIsSUFBSSxFQUFFLG9CQUFvQjtTQUMzQixDQUFDO0lBQ0osQ0FBQztJQUdELGVBQWU7UUFDYixPQUFPO1lBQ0wsS0FBSyxFQUFFLFdBQVc7U0FDbkIsQ0FBQztJQUNKLENBQUM7Q0FDRixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBwYWdlcy9zZWFyY2gvc2VhcmNoLnRzXG5pbXBvcnQgeyB3b3JkQm9va3MgfSBmcm9tICcuLi8uLi9kYXRhL2luZGV4JztcbmltcG9ydCB7IGdldEFsbFByb2dyZXNzIH0gZnJvbSAnLi4vLi4vdXRpbHMvc3RvcmUnO1xuaW1wb3J0IHsgcGxheUF1ZGlvIH0gZnJvbSAnLi4vLi4vdXRpbHMvYXVkaW8nO1xuXG5pbnRlcmZhY2UgU2VhcmNoUmVzdWx0IHtcbiAgd29yZDogc3RyaW5nO1xuICBwaG9uZXRpYzogc3RyaW5nO1xuICBtZWFuaW5nOiBzdHJpbmc7XG4gIGV4YW1wbGU6IHN0cmluZztcbiAgYm9va05hbWVzOiBzdHJpbmdbXTtcbiAgbGVhcm5lZDogYm9vbGVhbjtcbiAgc3RhdHVzOiBzdHJpbmc7XG4gIHJvb3Q/OiBzdHJpbmc7XG4gIHN5bm9ueW1zPzogc3RyaW5nO1xuICBhbnRvbnltcz86IHN0cmluZztcbiAgcmVsYXRlZFdvcmRzPzogc3RyaW5nO1xuICBzdGFyPzogbnVtYmVyO1xufVxuXG5QYWdlKHtcbiAgZGF0YToge1xuICAgIGtleXdvcmQ6ICcnLFxuICAgIHJlc3VsdHM6IFtdIGFzIFNlYXJjaFJlc3VsdFtdLFxuICAgIHNlYXJjaGluZzogZmFsc2UsXG4gICAgaGFzU2VhcmNoZWQ6IGZhbHNlXG4gIH0sXG5cbiAgb25JbnB1dChlOiBhbnkpIHtcbiAgICB0aGlzLnNldERhdGEoeyBrZXl3b3JkOiBlLmRldGFpbC52YWx1ZSB9KTtcbiAgfSxcblxuICBvblNlYXJjaCgpIHtcbiAgICBjb25zdCBrdyA9IHRoaXMuZGF0YS5rZXl3b3JkLnRyaW0oKS50b0xvd2VyQ2FzZSgpO1xuICAgIGlmICgha3cpIHtcbiAgICAgIHRoaXMuc2V0RGF0YSh7IHJlc3VsdHM6IFtdLCBoYXNTZWFyY2hlZDogZmFsc2UgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgdGhpcy5zZXREYXRhKHsgc2VhcmNoaW5nOiB0cnVlLCBoYXNTZWFyY2hlZDogdHJ1ZSB9KTtcblxuICAgIGNvbnN0IHJlc3VsdHM6IFNlYXJjaFJlc3VsdFtdID0gW107XG4gICAgY29uc3Qgc2VlbiA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gICAgZm9yIChjb25zdCBib29rIG9mIHdvcmRCb29rcykge1xuICAgICAgY29uc3QgYWxsUHJvZ3Jlc3MgPSBnZXRBbGxQcm9ncmVzcyhib29rLmlkKTtcbiAgICAgIGZvciAoY29uc3QgdyBvZiBib29rLndvcmRzKSB7XG4gICAgICAgIGlmICh3LndvcmQudG9Mb3dlckNhc2UoKS5pbmNsdWRlcyhrdykgJiYgIXNlZW4uaGFzKHcud29yZCkpIHtcbiAgICAgICAgICBzZWVuLmFkZCh3LndvcmQpO1xuICAgICAgICAgIGNvbnN0IHAgPSBhbGxQcm9ncmVzc1t3LndvcmRdO1xuICAgICAgICAgIGxldCBsZWFybmVkID0gZmFsc2U7XG4gICAgICAgICAgbGV0IHN0YXR1cyA9ICfmnKrlrabkuaAnO1xuICAgICAgICAgIGlmIChwKSB7XG4gICAgICAgICAgICBsZWFybmVkID0gdHJ1ZTtcbiAgICAgICAgICAgIGNvbnN0IGJveCA9IHAuYm94IHx8IDE7XG4gICAgICAgICAgICBpZiAoYm94ID49IDUpIHtcbiAgICAgICAgICAgICAgc3RhdHVzID0gJ+W3suaOjOaPoSc7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKGJveCA+PSAzKSB7XG4gICAgICAgICAgICAgIHN0YXR1cyA9ICflpI3kuaDkuK0nO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgc3RhdHVzID0gJ+WtpuS5oOS4rSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdHMucHVzaCh7XG4gICAgICAgICAgICB3b3JkOiB3LndvcmQsXG4gICAgICAgICAgICBwaG9uZXRpYzogdy5waG9uZXRpYyxcbiAgICAgICAgICAgIG1lYW5pbmc6IHcubWVhbmluZyxcbiAgICAgICAgICAgIGV4YW1wbGU6IHcuZXhhbXBsZSxcbiAgICAgICAgICAgIGJvb2tOYW1lczogW2Jvb2submFtZV0sXG4gICAgICAgICAgICBsZWFybmVkLFxuICAgICAgICAgICAgc3RhdHVzLFxuICAgICAgICAgICAgcm9vdDogdy5yb290IHx8ICcnLFxuICAgICAgICAgICAgc3lub255bXM6IHcuc3lub255bXMgfHwgJycsXG4gICAgICAgICAgICBhbnRvbnltczogdy5hbnRvbnltcyB8fCAnJyxcbiAgICAgICAgICAgIHJlbGF0ZWRXb3Jkczogdy5yZWxhdGVkV29yZHMgfHwgJycsXG4gICAgICAgICAgICBzdGFyOiB3LnN0YXIgfHwgMFxuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2UgaWYgKHNlZW4uaGFzKHcud29yZCkgJiYgcmVzdWx0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgLy8g5aaC5p6c6K+N5bey5om+5Yiw77yM6KGl5YWF5a6D5omA5bGe55qE5YW25LuW6K+N5LmmXG4gICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSByZXN1bHRzLmZpbmQociA9PiByLndvcmQgPT09IHcud29yZCk7XG4gICAgICAgICAgaWYgKGV4aXN0aW5nICYmICFleGlzdGluZy5ib29rTmFtZXMuaW5jbHVkZXMoYm9vay5uYW1lKSkge1xuICAgICAgICAgICAgZXhpc3RpbmcuYm9va05hbWVzLnB1c2goYm9vay5uYW1lKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyDmjInlrZfmr43mjpLluo9cbiAgICByZXN1bHRzLnNvcnQoKGEsIGIpID0+IGEud29yZC5sb2NhbGVDb21wYXJlKGIud29yZCkpO1xuXG4gICAgdGhpcy5zZXREYXRhKHsgcmVzdWx0cywgc2VhcmNoaW5nOiBmYWxzZSB9KTtcbiAgfSxcblxuICBvbkNsZWFyKCkge1xuICAgIHRoaXMuc2V0RGF0YSh7IGtleXdvcmQ6ICcnLCByZXN1bHRzOiBbXSwgaGFzU2VhcmNoZWQ6IGZhbHNlIH0pO1xuICB9LFxuXG4gIG9uUGxheUF1ZGlvKGU6IGFueSkge1xuICAgIGNvbnN0IHdvcmQgPSBlLmN1cnJlbnRUYXJnZXQuZGF0YXNldC53b3JkIGFzIHN0cmluZztcbiAgICBpZiAod29yZCkgcGxheUF1ZGlvKHdvcmQsICd1cycpO1xuICB9LFxuXG4gIC8vIOi9rOWPkee7meWlveWPi1xuICBvblNoYXJlQXBwTWVzc2FnZSgpIHtcbiAgICByZXR1cm4ge1xuICAgICAgdGl0bGU6ICfmn6XkuIDkuKror43vvIzooaXkuIDkuKror40nLFxuICAgICAgcGF0aDogJy9wYWdlcy9pbmRleC9pbmRleCdcbiAgICB9O1xuICB9LFxuXG4gIC8vIOWIhuS6q+WIsOaci+WPi+WciO+8iOWNlemhteaooeW8j++8iVxuICBvblNoYXJlVGltZWxpbmUoKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHRpdGxlOiAn5p+l5LiA5Liq6K+N77yM6KGl5LiA5Liq6K+NJ1xuICAgIH07XG4gIH0sXG59KTtcbiJdfQ==