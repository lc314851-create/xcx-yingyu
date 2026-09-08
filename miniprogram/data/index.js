"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wordBooks = void 0;
exports.getBookById = getBookById;
const junior_1 = require("./junior");
const senior_1 = require("./senior");
const cet4_1 = require("./cet4");
const cet6_1 = require("./cet6");
const postgrad_1 = require("./postgrad");
exports.wordBooks = [
    {
        id: 'junior',
        name: '初中词汇',
        desc: '中考大纲词汇',
        level: '初中',
        words: junior_1.juniorWords
    },
    {
        id: 'senior',
        name: '高中词汇',
        desc: '高考大纲词汇',
        level: '高中',
        words: [...junior_1.juniorWords, ...senior_1.seniorWords]
    },
    {
        id: 'cet4',
        name: '四级词汇',
        desc: '大学英语四级考试词汇',
        level: '四级',
        words: [...junior_1.juniorWords, ...senior_1.seniorWords, ...cet4_1.cet4Words]
    },
    {
        id: 'cet6',
        name: '六级词汇',
        desc: '大学英语六级考试词汇',
        level: '六级',
        words: [...junior_1.juniorWords, ...senior_1.seniorWords, ...cet4_1.cet4Words, ...cet6_1.cet6Words]
    },
    {
        id: 'postgrad',
        name: '考研词汇',
        desc: '考研大纲词汇',
        level: '考研',
        words: [...junior_1.juniorWords, ...senior_1.seniorWords, ...cet4_1.cet4Words, ...cet6_1.cet6Words, ...postgrad_1.postgradWords]
    }
];
function getBookById(id) {
    return exports.wordBooks.find((b) => b.id === id);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFtREEsa0NBRUM7QUFsREQscUNBQXVDO0FBQ3ZDLHFDQUF1QztBQUN2QyxpQ0FBbUM7QUFDbkMsaUNBQW1DO0FBQ25DLHlDQUEyQztBQUs5QixRQUFBLFNBQVMsR0FBZTtJQUNuQztRQUNFLEVBQUUsRUFBRSxRQUFRO1FBQ1osSUFBSSxFQUFFLE1BQU07UUFDWixJQUFJLEVBQUUsUUFBUTtRQUNkLEtBQUssRUFBRSxJQUFJO1FBQ1gsS0FBSyxFQUFFLG9CQUFXO0tBQ25CO0lBQ0Q7UUFDRSxFQUFFLEVBQUUsUUFBUTtRQUNaLElBQUksRUFBRSxNQUFNO1FBQ1osSUFBSSxFQUFFLFFBQVE7UUFDZCxLQUFLLEVBQUUsSUFBSTtRQUNYLEtBQUssRUFBRSxDQUFDLEdBQUcsb0JBQVcsRUFBRSxHQUFHLG9CQUFXLENBQUM7S0FDeEM7SUFDRDtRQUNFLEVBQUUsRUFBRSxNQUFNO1FBQ1YsSUFBSSxFQUFFLE1BQU07UUFDWixJQUFJLEVBQUUsWUFBWTtRQUNsQixLQUFLLEVBQUUsSUFBSTtRQUNYLEtBQUssRUFBRSxDQUFDLEdBQUcsb0JBQVcsRUFBRSxHQUFHLG9CQUFXLEVBQUUsR0FBRyxnQkFBUyxDQUFDO0tBQ3REO0lBQ0Q7UUFDRSxFQUFFLEVBQUUsTUFBTTtRQUNWLElBQUksRUFBRSxNQUFNO1FBQ1osSUFBSSxFQUFFLFlBQVk7UUFDbEIsS0FBSyxFQUFFLElBQUk7UUFDWCxLQUFLLEVBQUUsQ0FBQyxHQUFHLG9CQUFXLEVBQUUsR0FBRyxvQkFBVyxFQUFFLEdBQUcsZ0JBQVMsRUFBRSxHQUFHLGdCQUFTLENBQUM7S0FDcEU7SUFDRDtRQUNFLEVBQUUsRUFBRSxVQUFVO1FBQ2QsSUFBSSxFQUFFLE1BQU07UUFDWixJQUFJLEVBQUUsUUFBUTtRQUNkLEtBQUssRUFBRSxJQUFJO1FBQ1gsS0FBSyxFQUFFLENBQUMsR0FBRyxvQkFBVyxFQUFFLEdBQUcsb0JBQVcsRUFBRSxHQUFHLGdCQUFTLEVBQUUsR0FBRyxnQkFBUyxFQUFFLEdBQUcsd0JBQWEsQ0FBQztLQUN0RjtDQUNGLENBQUM7QUFHRixTQUFnQixXQUFXLENBQUMsRUFBVTtJQUNwQyxPQUFPLGlCQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFDO0FBQzVDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvLyBkYXRhL2luZGV4LnRzIC0g6K+N5bqT57Si5byV77ya5rGH5oC75omA5pyJ6K+N5LmmXG4vLyDms6jmhI/vvJrlkITor43kuabmlofku7blj6rljIXlkKvoh6rlt7HnmoTni6znq4vor43msYfvvIzlsYLnuqflhbPns7vlnKjov5nph4znu4Too4XvvIzpgb/lhY3mqKHlnZflvqrnjq/kvp3otZZcbmltcG9ydCB7IFdvcmRCb29rIH0gZnJvbSAnLi90eXBlcyc7XG5pbXBvcnQgeyBqdW5pb3JXb3JkcyB9IGZyb20gJy4vanVuaW9yJztcbmltcG9ydCB7IHNlbmlvcldvcmRzIH0gZnJvbSAnLi9zZW5pb3InO1xuaW1wb3J0IHsgY2V0NFdvcmRzIH0gZnJvbSAnLi9jZXQ0JztcbmltcG9ydCB7IGNldDZXb3JkcyB9IGZyb20gJy4vY2V0Nic7XG5pbXBvcnQgeyBwb3N0Z3JhZFdvcmRzIH0gZnJvbSAnLi9wb3N0Z3JhZCc7XG5cbmV4cG9ydCB7IFdvcmRJdGVtLCBXb3JkQm9vayB9IGZyb20gJy4vdHlwZXMnO1xuXG4vLyDor43kuabliJfooajvvIjnlKjkuo7or43kuabpgInmi6npobXpnaLvvIlcbmV4cG9ydCBjb25zdCB3b3JkQm9va3M6IFdvcmRCb29rW10gPSBbXG4gIHtcbiAgICBpZDogJ2p1bmlvcicsXG4gICAgbmFtZTogJ+WIneS4reivjeaxhycsXG4gICAgZGVzYzogJ+S4reiAg+Wkp+e6suivjeaxhycsXG4gICAgbGV2ZWw6ICfliJ3kuK0nLFxuICAgIHdvcmRzOiBqdW5pb3JXb3Jkc1xuICB9LFxuICB7XG4gICAgaWQ6ICdzZW5pb3InLFxuICAgIG5hbWU6ICfpq5jkuK3or43msYcnLFxuICAgIGRlc2M6ICfpq5jogIPlpKfnurLor43msYcnLFxuICAgIGxldmVsOiAn6auY5LitJyxcbiAgICB3b3JkczogWy4uLmp1bmlvcldvcmRzLCAuLi5zZW5pb3JXb3Jkc11cbiAgfSxcbiAge1xuICAgIGlkOiAnY2V0NCcsXG4gICAgbmFtZTogJ+Wbm+e6p+ivjeaxhycsXG4gICAgZGVzYzogJ+Wkp+WtpuiLseivreWbm+e6p+iAg+ivleivjeaxhycsXG4gICAgbGV2ZWw6ICflm5vnuqcnLFxuICAgIHdvcmRzOiBbLi4uanVuaW9yV29yZHMsIC4uLnNlbmlvcldvcmRzLCAuLi5jZXQ0V29yZHNdXG4gIH0sXG4gIHtcbiAgICBpZDogJ2NldDYnLFxuICAgIG5hbWU6ICflha3nuqfor43msYcnLFxuICAgIGRlc2M6ICflpKflraboi7Hor63lha3nuqfogIPor5Xor43msYcnLFxuICAgIGxldmVsOiAn5YWt57qnJyxcbiAgICB3b3JkczogWy4uLmp1bmlvcldvcmRzLCAuLi5zZW5pb3JXb3JkcywgLi4uY2V0NFdvcmRzLCAuLi5jZXQ2V29yZHNdXG4gIH0sXG4gIHtcbiAgICBpZDogJ3Bvc3RncmFkJyxcbiAgICBuYW1lOiAn6ICD56CU6K+N5rGHJyxcbiAgICBkZXNjOiAn6ICD56CU5aSn57qy6K+N5rGHJyxcbiAgICBsZXZlbDogJ+iAg+eglCcsXG4gICAgd29yZHM6IFsuLi5qdW5pb3JXb3JkcywgLi4uc2VuaW9yV29yZHMsIC4uLmNldDRXb3JkcywgLi4uY2V0NldvcmRzLCAuLi5wb3N0Z3JhZFdvcmRzXVxuICB9XG5dO1xuXG4vLyDmjIkgaWQg6I635Y+W6K+N5LmmXG5leHBvcnQgZnVuY3Rpb24gZ2V0Qm9va0J5SWQoaWQ6IHN0cmluZyk6IFdvcmRCb29rIHwgdW5kZWZpbmVkIHtcbiAgcmV0dXJuIHdvcmRCb29rcy5maW5kKChiKSA9PiBiLmlkID09PSBpZCk7XG59XG4iXX0=