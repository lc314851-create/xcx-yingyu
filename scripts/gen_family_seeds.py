#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_family_seeds.py — 生成词族种子包 data/familySeeds.ts

从增强后的 wordbooks_json/*.json 提取词根/形近关系，
打包成主包可承受的紧凑 TS 模块，让「词根星系」在云库是旧数据时
也能工作（familyService 会用它给云端词条"补词根字段"）。

裁剪策略：
1. 只保留「族群 >= 2」或「有形近词」的词——星系里能显示出来的才打包
2. 不带 meaning（星系节点释义用云端词库自己的）
3. 空字段用空串占位，保留数组定长格式 [word, root, gloss, similar]
"""

import json
import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
BASE = os.path.join(os.path.dirname(__file__), '..')
JSON_DIR = os.path.join(BASE, 'wordbooks_json')
OUT = os.path.join(BASE, 'miniprogram', 'data', 'familySeeds.ts')

BOOKS = ['junior', 'senior', 'cet4', 'cet6', 'postgrad', 'ielts', 'toefl', 'gre']

lines = [
    '// data/familySeeds.ts - 词族种子包（自动生成，勿手改）',
    '// 由 scripts/gen_family_seeds.py 从增强词库生成',
    '// 格式：[word, root, rootGloss, relatedWords]，空字段为 ""',
    '',
    'export type FamilySeedTuple = [string, string, string, string];',
    '',
    'export const familySeeds: Record<string, FamilySeedTuple[]> = {'
]

total_bytes = 0
for book in BOOKS:
    path = os.path.join(JSON_DIR, f'{book}.json')
    if not os.path.exists(path):
        continue
    with open(path, encoding='utf-8') as f:
        words = json.load(f)

    # 词根 → 族群
    root_groups = {}
    for w in words:
        if w.get('root'):
            root_groups.setdefault(w['root'], []).append(w['word'])

    rows = []
    for w in words:
        root = w.get('root', '')
        gloss = w.get('rootGloss', '')
        similar = w.get('relatedWords', '')
        has_group = root and len(root_groups.get(root, [])) >= 2
        if not has_group and not similar:
            continue
        escaped = (w['word'], root, gloss, similar)
        escaped = tuple(s.replace('\\', '\\\\').replace('"', '\\"') for s in escaped)
        rows.append('  ["' + '","'.join(escaped) + '"],')

    block = f'  {book}: [\n' + '\n'.join(rows) + '\n  ],'
    sz = len(block.encode('utf-8'))
    total_bytes += sz
    lines.append(block)
    print(f'{book}: {len(rows)} 词 ({sz // 1024}KB)')

lines.append('};')
lines.append('')

with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
    f.write('\n'.join(lines))

total_kb = os.path.getsize(OUT) // 1024
print(f'─' * 40)
print(f'输出: {OUT}')
print(f'总大小: {total_kb}KB（主包预算内）' if total_kb < 900 else f'总大小: {total_kb}KB（⚠ 接近主包上限，需裁剪）')
