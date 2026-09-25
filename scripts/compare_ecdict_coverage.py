#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
compare_ecdict_coverage.py —— 对比「现有 28 本词书」与「ECDICT 全量」的匹配覆盖率

目的：回答"换成单张全量索引表，到底能多匹配多少"，而不是凭"更全"这个感觉。

用法：
    python3 scripts/compare_ecdict_coverage.py /tmp/ecdict.csv
"""
import csv
import json
import os
import re
import sys
import collections

BASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EC = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ecdict.csv'

WORD_RE = re.compile(r"^[A-Za-z][A-Za-z'\u2019\-]*$")
TOK = re.compile(r"[A-Za-z][A-Za-z'\u2019\-]*")

# ─── 1. 现有 28 本词书 ────────────────────────────────────────────
meta = json.load(open(os.path.join(BASE, 'wordbooks_json/books_meta.json'), encoding='utf-8'))
cur = set()
for b in meta:
    p = os.path.join(BASE, 'wordbooks_json', b['id'] + '.json')
    for w in json.load(open(p, encoding='utf-8')):
        k = (w.get('word') or '').strip().lower()
        if k:
            cur.add(k)

# ─── 2. ECDICT 全量 ──────────────────────────────────────────────
print('读取 ECDICT …')
ec_all, ec_zh, ec_word = set(), set(), set()
with open(EC, encoding='utf-8', newline='') as f:
    for row in csv.DictReader(f):
        w = (row.get('word') or '').strip().lower()
        if not w:
            continue
        ec_all.add(w)
        if (row.get('translation') or '').strip():
            ec_zh.add(w)
        if WORD_RE.match(w):
            ec_word.add(w)
            if (row.get('translation') or '').strip():
                ec_word.add(w)

print(f"ECDICT 总词条（去重）      : {len(ec_all):,}")
print(f"  其中有中文释义           : {len(ec_zh):,}")
print(f"  纯英文词形（无空格/符号） : {len(ec_word):,}")
print()

# ─── 3. 与现有词库的关系 ─────────────────────────────────────────
only_ec = ec_word - cur
print(f"现有 28 本词书去重词形      : {len(cur):,}")
print(f"ECDICT 纯词形 ⊃ 现有词库？  : {len(cur - ec_word)} 个现有词不在 ECDICT（应为 0）")
print(f"ECDICT 能新增的词形        : {len(only_ec):,}  ← 这就是'更全'的实际增量")
print()

# 增量词的分布（按字母分布抽样看看是什么词）
sample = sorted(only_ec)[:0]
print('增量词抽样：', ', '.join(sorted(only_ec)[::max(1, len(only_ec)//24)][:24]))
print()

# ─── 4. 覆盖率对比（用同样的语料）────────────────────────────────
CORPORA = {
    '分级新闻（简单）': (
        "The teacher gave us a book and told us to read it carefully. "
        "An old man was sitting on the bench, and he was watching the birds fly over the lake. "
        "Many students said they would study harder, but few actually did."
    ),
    '经济学人风（中等）': (
        "Electronic waste is now the fastest-growing waste stream in the world. "
        "Governments have been trying to regulate it for years, but the rules were written "
        "before the problem became urgent. Many companies said they would recycle old devices, "
        "yet few actually did it. Studies show that only about twenty percent of discarded "
        "electronics are properly collected. Consumers are often unaware that their old phones "
        "contain valuable metals, and they simply throw them away."
    ),
    '文学（较难）': (
        "Elizabeth's father had told her that Mr Darcy was a proud man, and she believed him. "
        "She had not seen such behaviour before, and it made her uneasy. Her sister's friend "
        "said the same thing, though nobody listened. They were standing near the window when "
        "the carriage arrived, and the servants were running to open the gate."
    ),
    '专业（医学术语）': (
        "The patient presented with acute abdominal pain and a history of hypertension. "
        "Computed tomography revealed a small lesion in the pancreas. The surgeon recommended "
        "a laparoscopic resection, and the biopsy confirmed the diagnosis of adenocarcinoma."
    ),
}

print(f"{'语料':<20} {'词次':>6} {'不同词':>7} {'现有词库':>9} {'ECDICT全量':>11} {'提升':>7}")
print('-' * 68)
for name, text in CORPORA.items():
    toks = [t.lower().replace('\u2019', "'") for t in TOK.findall(text)]
    toks = [t for t in toks if len(t) > 1]
    if not toks:
        continue

    def cov(d):
        hit = sum(1 for t in toks if t in d)
        return hit / len(toks)

    c_cur, c_ec = cov(cur), cov(ec_word)
    print(f"{name:<20} {len(toks):>6} {len(set(toks)):>7} "
          f"{c_cur*100:>8.1f}% {c_ec*100:>10.1f}% {(c_ec-c_cur)*100:>+6.1f}pp")

print()
print('注：此为"原形直查"口径，未叠加词形归一回退；实际生产链路会更高。')
