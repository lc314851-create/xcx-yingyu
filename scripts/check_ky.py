import csv, sys
sys.stdout.reconfigure(encoding='utf-8')

# 检查 ECDICT 考研词汇
with open('e:/MyProjects/xcx-yingyu/ecdict.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    all_rows = list(reader)

# 各标签统计
tag_counts = {}
for row in all_rows:
    tags = (row.get('tag', '') or '').split()
    for t in tags:
        tag_counts[t] = tag_counts.get(t, 0) + 1

print('=== ECDICT 各标签词数 ===')
for tag in ['zk', 'gk', 'cet4', 'cet6', 'ky']:
    print(f'  {tag}: {tag_counts.get(tag, 0)} 词')

# 考研词汇中，哪些同时也在其他标签里？
ky_rows = [r for r in all_rows if 'ky' in (r.get('tag') or '')]
print(f'\n考研标签总词数: {len(ky_rows)}')

# 统计考研词中同时出现的其他标签
other_tags = {}
for row in ky_rows:
    tags = (row.get('tag', '') or '').split()
    for t in tags:
        if t != 'ky':
            other_tags[t] = other_tags.get(t, 0) + 1

print('\n考研词汇中同时包含的其他标签:')
for tag, count in sorted(other_tags.items(), key=lambda x: -x[1]):
    print(f'  {tag}: {count} 词')

# 检查是否有 stardict.7z 压缩版的线索
print('\n=== ECDICT 仓库说明 ===')
print('ecdict.csv 是基础版（22万词条）')
print('stardict.7z 是完整版（约77万词条，含更多大纲词汇）')
print('当前下载的是 CSV 基础版，可能收录的大纲词汇不全')

# 检查考研词中的简单词
simple_words = [r for r in ky_rows if r['word'] in ['a', 'the', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'shall', 'should', 'may', 'might', 'must']]
print(f'\n考研标签中包含的基础简单词: {[r["word"] for r in simple_words]}')
print(f'简单词数量: {len(simple_words)}')

# 考研标签中词频分布
print('\n考研标签中BNC词频分布:')
high_freq = [r for r in ky_rows if r.get('bnc') and int(r['bnc']) < 2000]
mid_freq = [r for r in ky_rows if r.get('bnc') and 2000 <= int(r['bnc']) < 10000]
low_freq = [r for r in ky_rows if r.get('bnc') and int(r['bnc']) >= 10000]
no_freq = [r for r in ky_rows if not r.get('bnc') or r['bnc'] == '']
print(f'  高频词(BNC<2000): {len(high_freq)}')
print(f'  中频词(2000-10000): {len(mid_freq)}')
print(f'  低频词(>=10000): {len(low_freq)}')
print(f'  无词频数据: {len(no_freq)}')
