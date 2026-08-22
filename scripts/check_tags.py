import sqlite3
conn = sqlite3.connect('ecdict.db')
cursor = conn.cursor()

# 查看 tag 字段的样本
cursor.execute("SELECT word, tag FROM stardict WHERE tag LIKE '%cet4%' LIMIT 10")
print('=== cet4 样本 ===')
for r in cursor.fetchall():
    print(f'  {r[0]}: tag=[{r[1]}]')

cursor.execute("SELECT word, tag FROM stardict WHERE tag LIKE '%ky%' LIMIT 10")
print('\n=== ky 样本 ===')
for r in cursor.fetchall():
    print(f'  {r[0]}: tag=[{r[1]}]')

cursor.execute("SELECT word, tag FROM stardict WHERE tag LIKE '%zk%' LIMIT 10")
print('\n=== zk 样本 ===')
for r in cursor.fetchall():
    print(f'  {r[0]}: tag=[{r[1]}]')

# 统计每个 tag 的数量
for tag in ['zk', 'gk', 'cet4', 'cet6', 'ky', 'ielts', 'toefl', 'gre']:
    cursor.execute(f"SELECT COUNT(*) FROM stardict WHERE tag LIKE '%{tag}%'")
    like_count = cursor.fetchone()[0]
    cursor.execute(f"SELECT COUNT(*) FROM stardict WHERE (' ' || tag || ' ') LIKE '% {tag} %'")
    word_count = cursor.fetchone()[0]
    print(f'\n{tag}: LIKE=%{tag}% = {like_count}, 精确匹配 = {word_count}')

# 看看 tag 的分布
cursor.execute("SELECT tag, COUNT(*) as cnt FROM stardict WHERE tag != '' GROUP BY tag ORDER BY cnt DESC LIMIT 30")
print('\n=== Top 30 tags ===')
for r in cursor.fetchall():
    print(f'  [{r[0]}]: {r[1]}')

conn.close()
