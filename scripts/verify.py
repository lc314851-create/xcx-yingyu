import json, sys
sys.stdout.reconfigure(encoding='utf-8')

for book_id, name in [('junior','初中'),('senior','高中'),('cet4','四级'),('cet6','六级'),('postgrad','考研')]:
    with open(f'e:/MyProjects/xcx-yingyu/wordbooks_json/{book_id}.json','r',encoding='utf-8') as f:
        d = json.load(f)
    print(f'{name} ({book_id}): {len(d)} 词')
    if len(d) > 2:
        w = d[2]
        print(f'  样本: word={w["word"]}, phonetic={w["phonetic"]}, meaning={w["meaning"]}')
    print()
