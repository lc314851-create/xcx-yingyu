#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
build-word-index.py —— 生成个人词书匹配用的统一索引表

## 为什么需要它

个人词书匹配原本查 `wordbooks` 集合（28 本官方词书，48,026 条）。实测发现两个问题：
  1. 数据库里缺 3 本（zsb 整本 0 条、pep5_1 少 27、pep6_2 少 2）
  2. 只有考纲词汇，考纲之外的词（文学词、术语）全部匹配不到
     —— 实测《傲慢与偏见》词次覆盖 95.0%，医学文本仅 81.3%

本脚本把「28 本官方词书」与「ECDICT 中带词频记录的词」合并成一张索引，
匹配只查这一张表，既绕开缺书问题，又大幅提升覆盖率。

## 裁剪口径（实测依据）

| 口径 | 词形数 | PP词次 | PP词种 | 医学词次 |
|------|--------|--------|--------|---------|
| 现有 28 本词书        | 16,550  | 95.0% | 85.9% | 81.3% |
| **+ ECDICT 高频词**  | **58,992** | **99.4%** | **97.0%** | **100%** |
| + ECDICT 柯林斯星级词 | 19,909  | 95.4% | 88.3% | 81.3% |
| ECDICT 全量          | 400,847 | 99.7% | 99.6% | 100% |

→ 取第二行：用 1/7 的规模拿到全量 93% 的收益。
  第三行几乎无收益（星级词本就是考纲词，已被覆盖）。

## 用法

    python3 scripts/build-word-index.py /path/to/ecdict.csv
    # 输出 wordbooks_json/wordindex.json
"""
import csv
import json
import os
import re
import sys
import time

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
JSON_DIR = os.path.join(BASE, 'wordbooks_json')
# 索引直接生成到云函数目录：随代码一起部署，云函数运行时无需联网下载
OUT = os.path.join(BASE, 'cloudfunctions', 'userBook', 'wordindex.json')
WORD_RE = re.compile(r"^[A-Za-z][A-Za-z'\u2019\-]*$")

# 领域标签垃圾（与 enrich_wordbooks.py 保持一致）
JUNK_RE = re.compile(r'\[(计|医|经|化|物|数|法|农|机|电|建|矿|冶|纺|军|航|船|铁|食|药|心|植|动|生|地|天|气|海|环|能|通|邮|广|戏|体|心|哲|宗|心|语|心)\]')
POS_TAG = re.compile(r'^[a-zA-Z]{1,6}\.$')


# ─── 从 extract.js 同步不规则变形表（单一来源，避免两边规则漂移）──
def load_irregular_keys():
    """从 cloudfunctions/userBook/extract.js 解析 IRREGULAR 的键。
    这些词是变形词，不应作为独立词条入库（匹配时靠词形归一还原到原形）。"""
    src = os.path.join(BASE, 'cloudfunctions', 'userBook', 'extract.js')
    txt = open(src, encoding='utf-8').read()
    m = re.search(r'const IRREGULAR = \{(.*?)\n\}', txt, re.S)
    if not m:
        return set()
    return set(re.findall(r"([A-Za-z']+):\s*'", m.group(1)))


# 兼类词例外：虽被标了词元，但它们本身就是值得单独学习的真词，
# 剔掉会让 "turn left" 落到 leave、"a rose" 落到 rise。
KEEP_ORIGINAL = {
    'born', 'left', 'rose', 'found', 'felt', 'saw', 'wound', 'bore', 'bit',
    'lay', 'read', 'hurt', 'cost', 'spread', 'shut', 'cut', 'hit', 'put',
    'set', 'let', 'held', 'meant', 'dealt', 'kept', 'built', 'brought',
    'bought', 'sent', 'spent', 'sold', 'won', 'wore',
    'evening', 'interesting', 'willing', 'running',
}


# 兼类词例外：虽被标了词元，但它们本身就是值得单独学习的真词，
# 剔掉会让 "turn left" 落到 leave、"a rose" 落到 rise。
KEEP_ORIGINAL = {
    'born', 'left', 'rose', 'found', 'felt', 'saw', 'wound', 'bore', 'bit',
    'lay', 'read', 'hurt', 'cost', 'spread', 'shut', 'cut', 'hit', 'put',
    'set', 'let', 'held', 'meant', 'dealt', 'kept', 'built', 'brought',
    'bought', 'sent', 'spent', 'sold', 'won', 'wore',
    'evening', 'interesting', 'willing', 'running',
}


def is_inflection(word, exchange, irregular_keys):
    """判断某词是否只是另一个词的变形（不应作为独立词条收录）。

    依据 ECDICT 的 exchange 字段：含 `0:词元` 且词元不等于自身 → 是变形。
    兼类词用 KEEP_ORIGINAL 豁免（left/rose/found/evening…）。
    exchange 为空但命中 IRREGULAR 表的（was / were），也判为变形。"""
    if word in KEEP_ORIGINAL:
        return False
    m = re.search(r'0:([^/\s]+)', exchange or '')
    if m:
        return m.group(1) != word
    return word in irregular_keys


def clean_meaning(raw, maxlen=60):
    """释义清洗：截去领域标签，保留前两段，截断 maxlen 字（复用 enrich 的口径）"""
    if not raw:
        return ''
    text = raw.replace('\r\n', ' ').replace('\n', ' ').replace('\\n', ' ')
    out = []
    for seg in re.split(r'[;；]', text):
        m = JUNK_RE.search(seg)
        if m:
            seg = seg[:m.start()]
        seg = seg.strip().rstrip('，,、 ')
        if not seg or POS_TAG.match(seg):
            continue
        out.append(seg)
        if len(out) >= 2:
            break
    r = '; '.join(out)
    if len(r) > maxlen:
        r = r[:maxlen].rstrip('，,、 ') + '…'
    return r


def main():
    ec_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(BASE, 'ecdict.csv')
    if not os.path.exists(ec_path):
        print('找不到 ECDICT 文件：' + ec_path)
        print('可从 https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv 获取')
        sys.exit(1)

    # ─── 0. 预取官方词书的 ECDICT exchange 信息（用于判定变形）─────
    irregular_keys = load_irregular_keys()
    meta = json.load(open(os.path.join(JSON_DIR, 'books_meta.json'), encoding='utf-8'))
    official = {}
    word_book = {}          # word -> 来自哪本官方词书（只记 first-seen，够用）
    for b in meta:
        p = os.path.join(JSON_DIR, b['id'] + '.json')
        if not os.path.exists(p):
            continue
        for w in json.load(open(p, encoding='utf-8')):
            k = (w.get('word') or '').strip().lower()
            if not k:
                continue
            if k not in official:
                official[k] = w
            word_book.setdefault(k, b['id'])

    print('预取官方词书 exchange 信息 …')
    official_exchange = {}
    with open(ec_path, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            w = (row.get('word') or '').strip().lower()
            if w in official and w not in official_exchange:
                official_exchange[w] = row.get('exchange') or ''

    # ─── 1. 官方 28 本词书（tier=1，释义已清洗过，优先）────────────
    index = {}
    for k, w in official.items():
        if is_inflection(k, official_exchange.get(k, ''), irregular_keys):
            continue   # went / books / studies 这类变形条目，靠词形归一还原
        index[k] = [
            w.get('phonetic') or '',
            (w.get('meaning') or '').strip(),
            1 if w.get('isHighFreq') else 0,
            1,            # tier: 1 = 官方词书
            word_book.get(k, ''),
            0             # frq
        ]

    off_count = len(index)

    # ─── 2. ECDICT 增量（tier=2）──────────────────────────────────
    added = 0
    with open(ec_path, encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            w = (row.get('word') or '').strip().lower().replace('\u2019', "'")
            if not w or not WORD_RE.match(w) or w in index:
                continue
            if is_inflection(w, row.get('exchange') or '', irregular_keys):
                continue
            # 裁剪口径：必须有词频数据（bnc 或 frq > 0）
            try:
                bnc = int(row.get('bnc') or 0)
                frq = int(row.get('frq') or 0)
            except (ValueError, TypeError):
                continue
            if bnc <= 0 and frq <= 0:
                continue
            meaning = clean_meaning(row.get('translation') or '')
            if not meaning:
                continue
            index[w] = [
                (row.get('phonetic') or '').strip(),
                meaning,
                1,     # 有词频数据，视作高频
                2,     # tier: 2 = ECDICT 增量
                '',
                max(bnc, frq)
            ]
            added += 1

    print('官方词书词形     : %s' % format(off_count, ','))
    print('ECDICT 增量词形  : %s' % format(added, ','))
    print('索引合计         : %s' % format(len(index), ','))

    # ─── 3. 输出 ─────────────────────────────────────────────────
    # 用数组而非对象：58k 条下体积能省 40% 左右
    rows = [[k] + v for k, v in sorted(index.items())]
    payload = json.dumps({
        'v': 2,
        'generated': time.strftime('%Y-%m-%d'),
        'official': off_count,
        'ecdict': added,
        'count': len(rows),
        'rows': rows
    }, ensure_ascii=False, separators=(',', ':'))
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(payload)

    size = os.path.getsize(OUT)
    print('')
    print('已写出 %s' % OUT)
    print('  大小 %.1f MB（未压缩）/ 单条均摊 %.0f 字节' % (size / 1048576, size / len(rows)))
    print('')
    print('字段顺序: [word, phonetic, meaning, isHighFreq, tier, from, frq]')
    print('部署：重新部署 userBook 云函数即可生效（索引随代码包上传）')
    print('  tier 1 = 官方词书（释义精选）  tier 2 = ECDICT 增量（兜底）')


if __name__ == '__main__':
    main()
