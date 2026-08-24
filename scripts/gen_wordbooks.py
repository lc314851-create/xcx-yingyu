#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_wordbooks.py - 从 ECDICT 数据库筛选各等级词汇并生成 JSON 文件
用于导入云开发数据库

设计原则：
1. 每本词书包含该标签的全部词汇，允许跨词书重复
   - 初中：zk 标签的全部词
   - 高中：gk 标签的全部词
   - 四级：cet4 标签的全部词
   - 六级：cet6 标签的全部词
   - 考研：ky 标签的全部词
   - 雅思/托福/GRE：各自标签的全部词
   同一个词可以同时出现在多本词书中，这是合理的

2. 标注高频词：BNC 词频前 5000 或当代语料库词频前 5000 的视为高频词
   - isHighFreq: true/false

3. 小程序端支持选择"高频词学习"或"完整学习"
"""

import csv
import json
import os
import sys
import re
import sqlite3
import zipfile

sys.stdout.reconfigure(encoding='utf-8')

CSV_PATH = os.path.join(os.path.dirname(__file__), '..', 'ecdict.csv')
SQLITE_ZIP = os.path.join(os.path.dirname(__file__), '..', 'ecdict-sqlite.zip')
SQLITE_PATH = os.path.join(os.path.dirname(__file__), '..', 'ecdict.db')
OUTPUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'wordbooks_json')

# 高频词阈值：BNC 或当代语料库词频前 5000
HIGH_FREQ_THRESHOLD = 5000

# 词书定义：(id, 名称, tag)
LEVEL_TAGS = [
    ('junior',  '初中词汇', 'zk'),
    ('senior',  '高中词汇', 'gk'),
    ('cet4',    '四级词汇', 'cet4'),
    ('cet6',    '六级词汇', 'cet6'),
    ('postgrad','考研词汇', 'ky'),
    ('ielts',   '雅思词汇', 'ielts'),
    ('toefl',   '托福词汇', 'toefl'),
    ('gre',     'GRE词汇',  'gre'),
]


def clean_translation(translation):
    """清理翻译"""
    if not translation:
        return ''
    text = translation.strip()
    text = text.replace('\r\n', ' ').replace('\r', ' ').replace('\n', ' ')
    text = text.replace('\\r\\n', ' ').replace('\\n', ' ').replace('\\r', ' ')
    parts = re.split(r'[。；]', text)
    first = parts[0].strip()
    if len(first) > 80:
        cut = first[:80]
        last_comma = max(cut.rfind('，'), cut.rfind('；'), cut.rfind(','))
        if last_comma > 40:
            first = cut[:last_comma]
        else:
            first = cut + '…'
    return first


def clean_phonetic(phonetic):
    """清理音标"""
    if not phonetic:
        return ''
    p = phonetic.strip()
    if not p.startswith('/'):
        p = '/' + p + '/'
    return p


def is_high_freq(bnc, frq):
    """判断是否高频词：BNC 或当代语料库词频前 5000"""
    try:
        bnc_val = int(bnc) if bnc else 999999
    except ValueError:
        bnc_val = 999999
    try:
        frq_val = int(frq) if frq else 999999
    except ValueError:
        frq_val = 999999
    return bnc_val <= HIGH_FREQ_THRESHOLD or frq_val <= HIGH_FREQ_THRESHOLD


def extract_sqlite():
    """从 zip 中解压 SQLite 数据库"""
    if os.path.exists(SQLITE_PATH):
        print(f'SQLite 已存在: {SQLITE_PATH} ({os.path.getsize(SQLITE_PATH) // 1024 // 1024} MB)')
        return True
    if not os.path.exists(SQLITE_ZIP):
        print(f'ZIP 文件不存在: {SQLITE_ZIP}，将回退到 CSV 基础版')
        return False
    print(f'解压 SQLite: {SQLITE_ZIP}')
    with zipfile.ZipFile(SQLITE_ZIP, 'r') as z:
        db_files = [n for n in z.namelist() if n.endswith('.db')]
        if not db_files:
            print('ZIP 中未找到 .db 文件')
            return False
        print(f'  找到数据库文件: {db_files[0]}')
        with z.open(db_files[0]) as src, open(SQLITE_PATH, 'wb') as dst:
            dst.write(src.read())
    print(f'  解压完成: {SQLITE_PATH} ({os.path.getsize(SQLITE_PATH) // 1024 // 1024} MB)')
    return True


def process_from_sqlite():
    """从 SQLite 数据库处理（完整版）"""
    conn = sqlite3.connect(SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # 统计总数
    cursor.execute('SELECT COUNT(*) FROM stardict')
    total = cursor.fetchone()[0]
    print(f'SQLite 总词条数: {total}')

    all_books = {}
    for book_id, book_name, tag in LEVEL_TAGS:
        # 查询包含该标签的全部词（tag 字段空格分隔，如 "zk gk cet4"）
        # 用 ' ' || tag || ' ' 确保精确匹配空格分隔的 tag
        query = f"SELECT * FROM stardict WHERE (' ' || tag || ' ') LIKE '% {tag} %' AND word != '' AND translation != ''"
        cursor.execute(query)
        rows = cursor.fetchall()

        words = []
        for row in rows:
            word = row['word'].strip()
            if not word or ' ' in word:
                continue

            phonetic = clean_phonetic(row['phonetic'] or '')
            translation = clean_translation(row['translation'] or '')
            if not translation:
                continue

            bnc = str(row['bnc'] or '')
            frq = str(row['frq'] or '')
            high_freq = is_high_freq(bnc, frq)

            # ECDICT 扩展字段
            root = row['root'] or '' if 'root' in row.keys() else ''
            synonyms = ''
            if 'synonym' in row.keys():
                synonyms = (row['synonym'] or '').strip()
            antonyms = ''
            if 'antonym' in row.keys():
                antonyms = (row['antonym'] or '').strip()
            related_words = ''
            if 'relate' in row.keys():
                related_words = (row['relate'] or '').strip()
            # 词频
            try:
                frequency = int(row['frq'] or 0) if 'frq' in row.keys() else 0
            except (ValueError, TypeError):
                frequency = 0
            # 词频星级（0-5）
            try:
                star = int(row['collins'] or 0) if 'collins' in row.keys() else 0
            except (ValueError, TypeError):
                star = 0

            words.append({
                'word': word,
                'phonetic': phonetic,
                'meaning': translation,
                'example': f'Learn the word "{word}".',
                'isHighFreq': high_freq,
                'root': root,
                'synonyms': synonyms,
                'antonyms': antonyms,
                'relatedWords': related_words,
                'frequency': frequency,
                'star': star
            })

        # 词内去重（同一个词在同一本书里不重复出现）
        seen = set()
        unique_words = []
        for w in words:
            if w['word'] not in seen:
                seen.add(w['word'])
                unique_words.append(w)

        high_freq_count = sum(1 for w in unique_words if w['isHighFreq'])
        print(f'{book_name} ({tag}): {len(unique_words)} 词 (高频 {high_freq_count} 词)')
        all_books[book_id] = unique_words

    conn.close()
    return all_books


def process_from_csv():
    """从 CSV 处理（基础版回退）"""
    print(f'读取 CSV: {CSV_PATH}')
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        all_rows = list(reader)
    print(f'总词条数: {len(all_rows)}')

    all_books = {}
    for book_id, book_name, tag in LEVEL_TAGS:
        words = []
        for row in all_rows:
            tags = set((row.get('tag', '') or '').split())
            if tag not in tags:
                continue

            word = row.get('word', '').strip()
            if not word or ' ' in word:
                continue

            phonetic = clean_phonetic(row.get('phonetic', ''))
            translation = clean_translation(row.get('translation', ''))
            if not translation:
                continue

            bnc = str(row.get('bnc', '') or '')
            frq = str(row.get('frq', '') or '')
            high_freq = is_high_freq(bnc, frq)

            # ECDICT 扩展字段
            root = row.get('root', '') or ''
            synonyms = (row.get('synonym', '') or '').strip()
            antonyms = (row.get('antonym', '') or '').strip()
            related_words = (row.get('relate', '') or '').strip()
            try:
                frequency = int(row.get('frq', 0) or 0)
            except (ValueError, TypeError):
                frequency = 0
            try:
                star = int(row.get('collins', 0) or 0)
            except (ValueError, TypeError):
                star = 0

            words.append({
                'word': word,
                'phonetic': phonetic,
                'meaning': translation,
                'example': f'Learn the word "{word}".',
                'isHighFreq': high_freq,
                'root': root,
                'synonyms': synonyms,
                'antonyms': antonyms,
                'relatedWords': related_words,
                'frequency': frequency,
                'star': star
            })

        seen = set()
        unique_words = []
        for w in words:
            if w['word'] not in seen:
                seen.add(w['word'])
                unique_words.append(w)

        high_freq_count = sum(1 for w in unique_words if w['isHighFreq'])
        print(f'{book_name} ({tag}): {len(unique_words)} 词 (高频 {high_freq_count} 词)')
        all_books[book_id] = unique_words

    return all_books


def save_books(all_books):
    """保存词库到 JSON 文件"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    books_meta = []
    for book_id, book_name, tag in LEVEL_TAGS:
        words = all_books[book_id]
        high_freq_count = sum(1 for w in words if w['isHighFreq'])

        full_path = os.path.join(OUTPUT_DIR, f'{book_id}.json')
        with open(full_path, 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, indent=2)
        print(f'  -> {book_id}.json: {len(words)} 词 (高频 {high_freq_count})')

        books_meta.append({
            'id': book_id,
            'name': book_name,
            'tag': tag,
            'wordCount': len(words),
            'highFreqCount': high_freq_count
        })

    meta_path = os.path.join(OUTPUT_DIR, 'books_meta.json')
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(books_meta, f, ensure_ascii=False, indent=2)

    print(f'\n=== 词库汇总 ===')
    total = 0
    total_hf = 0
    for b in books_meta:
        print(f"  {b['name']}: {b['wordCount']} 词 (高频 {b['highFreqCount']} 词)")
        total += b['wordCount']
        total_hf += b['highFreqCount']
    print(f"  总计: {total} 词 (高频 {total_hf} 词，去重后约 {total - total_hf} 普通词)")


def main():
    if extract_sqlite():
        print('\n=== 使用 SQLite 完整版数据库 ===')
        all_books = process_from_sqlite()
    else:
        print('\n=== 使用 CSV 基础版（回退）===')
        all_books = process_from_csv()

    save_books(all_books)


if __name__ == '__main__':
    main()
