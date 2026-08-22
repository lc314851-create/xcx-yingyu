import csv, sys, json
sys.stdout.reconfigure(encoding='utf-8')

# 验证数据准确性：抽查几个关键词
test_words = {
    'abandon': 'cet4',
    'ability': 'zk',
    'achieve': 'zk',
    'absolute': 'cet4',
    'analyze': 'cet4',
    'beautiful': 'zk',
    'consequence': 'cet6',
    'phenomenon': 'cet4',
    'sophisticated': 'cet6',
    'abundant': 'cet4',
}

with open('e:/MyProjects/xcx-yingyu/ecdict.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        w = row.get('word', '').strip()
        if w in test_words:
            tag = row.get('tag', '') or ''
            expected = test_words[w]
            if expected in tag:
                print(f'[OK] {w}: tag="{tag}" -> 包含 {expected}')
            else:
                print(f'[MISS] {w}: tag="{tag}" -> 期望 {expected}')
            del test_words[w]
            if not test_words:
                break

# 统计各标签数量
with open('e:/MyProjects/xcx-yingyu/ecdict.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    tag_counts = {}
    for row in reader:
        tags = (row.get('tag', '') or '').split()
        for t in tags:
            tag_counts[t] = tag_counts.get(t, 0) + 1

print('\n=== ECDICT 各标签词数统计 ===')
for tag in ['zk', 'gk', 'cet4', 'cet6', 'ky', 'ielts', 'toefl', 'gre']:
    print(f'  {tag}: {tag_counts.get(tag, 0)} 词')
