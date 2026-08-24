// pages/search/search.ts
import { wordBooks } from '../../data/index';
import { WordItem } from '../../data/types';
import { getAllProgress, getCurrentBookId } from '../../utils/store';
import { playAudio } from '../../utils/audio';

interface SearchResult {
  word: string;
  phonetic: string;
  meaning: string;
  example: string;
  bookNames: string[];
  learned: boolean;
  status: string;
  root?: string;
  synonyms?: string;
  antonyms?: string;
  relatedWords?: string;
  star?: number;
}

Page({
  data: {
    keyword: '',
    results: [] as SearchResult[],
    searching: false,
    hasSearched: false
  },

  onInput(e: any) {
    this.setData({ keyword: e.detail.value });
  },

  onSearch() {
    const kw = this.data.keyword.trim().toLowerCase();
    if (!kw) {
      this.setData({ results: [], hasSearched: false });
      return;
    }

    this.setData({ searching: true, hasSearched: true });

    const results: SearchResult[] = [];
    const seen = new Set<string>();

    for (const book of wordBooks) {
      const allProgress = getAllProgress(book.id);
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
            } else if (box >= 3) {
              status = '复习中';
            } else {
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
        } else if (seen.has(w.word) && results.length > 0) {
          // 如果词已找到，补充它所属的其他词书
          const existing = results.find(r => r.word === w.word);
          if (existing && !existing.bookNames.includes(book.name)) {
            existing.bookNames.push(book.name);
          }
        }
      }
    }

    // 按字母排序
    results.sort((a, b) => a.word.localeCompare(b.word));

    this.setData({ results, searching: false });
  },

  onClear() {
    this.setData({ keyword: '', results: [], hasSearched: false });
  },

  onPlayAudio(e: any) {
    const word = e.currentTarget.dataset.word as string;
    if (word) playAudio(word, 'us');
  }
});
