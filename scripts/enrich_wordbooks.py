#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
enrich_wordbooks.py - 词库增强管线

为 wordbooks_json/*.json 补充差异化字段并清洗数据：

1. meaning 清洗：丢弃领域标签垃圾段（[计]/[医]/[经]...），保留前2段，截断60字
2. example 清洗：删除占位例句 "Learn the word \"x\"."
3. phonetic 修复：西里尔 ә → 拉丁 ə（小程序字体缺字形）
4. root / rootGloss：前后缀剥离还原词干（多轮递归 + 词干微调），
   命中内置词根表时附中文释义
5. lemma：ECDICT exchange 字段中的原型（1:xxx）
6. relatedWords：形近词（同书内，同首字母，编辑距离<=1），逗号分隔，最多6个

输入：ecdict.db（需已解压）、wordbooks_json/*.json
输出：原地覆盖 wordbooks_json/*.json（.bak 备份一次）
"""

import json
import os
import re
import sqlite3
import shutil
import sys

sys.stdout.reconfigure(encoding='utf-8')

BASE = os.path.join(os.path.dirname(__file__), '..')
DB_PATH = os.path.join(BASE, 'ecdict.db')
JSON_DIR = os.path.join(BASE, 'wordbooks_json')

BOOKS = ['junior', 'senior', 'cet4', 'cet6', 'postgrad', 'ielts', 'toefl', 'gre']

# ─── 常见词根中文释义表 ────────────────────────────────────────
ROOT_GLOSS = {
    'act': '行动', 'ag': '做', 'anim': '生命', 'ann': '年', 'aqua': '水',
    'aud': '听', 'auto': '自己', 'bell': '战争', 'bio': '生命', 'cede': '走',
    'ceed': '走', 'cess': '走', 'cent': '百', 'chron': '时间', 'cid': '切',
    'cis': '切', 'circ': '环', 'cit': '呼叫', 'claim': '喊', 'clam': '喊',
    'clud': '关闭', 'clus': '关闭', 'cogn': '知道', 'cord': '心', 'corp': '身体',
    'cred': '相信', 'cur': '跑', 'curs': '跑', 'cycl': '圆', 'dem': '人民',
    'dent': '牙齿', 'dict': '说', 'duc': '引导', 'duct': '引导', 'dur': '持久',
    'equ': '平等', 'fac': '做', 'fact': '做', 'fect': '做', 'fer': '带来',
    'fid': '信任', 'fin': '结束', 'flect': '弯曲', 'flict': '打击', 'flu': '流',
    'form': '形状', 'frag': '破', 'fract': '破', 'gen': '产生', 'geo': '地球',
    'grad': '步', 'gress': '步', 'gram': '写', 'graph': '写', 'grat': '喜悦',
    'grav': '重', 'habit': '居住', 'her': '粘', 'hes': '粘', 'hibit': '保持',
    'hydr': '水', 'insul': '岛', 'ject': '投', 'jud': '判断', 'junct': '连接',
    'jur': '法律', 'jus': '法律', 'labor': '劳动', 'lat': '带来', 'lect': '选择',
    'leg': '选择', 'lig': '选择', 'liber': '自由', 'loc': '地方', 'log': '说',
    'loqu': '说', 'luc': '光', 'lum': '光', 'magn': '大', 'man': '手',
    'manu': '手', 'mar': '海', 'med': '中间', 'mega': '大', 'memor': '记忆',
    'ment': '心', 'merg': '沉', 'meter': '测量', 'migr': '迁移', 'min': '小',
    'mit': '送', 'miss': '送', 'mob': '动', 'mot': '动', 'mov': '动',
    'mort': '死', 'multi': '多', 'mut': '改变', 'nat': '出生', 'nav': '船',
    'neg': '否认', 'nomin': '名', 'nov': '新', 'numer': '数', 'oper': '工作',
    'opt': '眼睛', 'ord': '顺序', 'ori': '升起', 'par': '相等', 'pass': '感情',
    'pat': '感情', 'path': '感情', 'pel': '推', 'puls': '推', 'pend': '悬挂',
    'pens': '悬挂', 'pet': '寻求', 'phon': '声音', 'photo': '光', 'plac': '取悦',
    'ple': '满', 'plet': '满', 'plic': '折叠', 'ply': '折叠', 'pon': '放',
    'pos': '放', 'popul': '人', 'port': '拿', 'press': '压', 'prim': '第一',
    'priv': '私人', 'prob': '测试', 'put': '想', 'quer': '问', 'quest': '问',
    'qui': '静', 'radi': '光', 'rect': '直', 'rid': '笑', 'rupt': '破',
    'sal': '跳', 'san': '健康', 'scend': '爬', 'sci': '知道', 'scrib': '写',
    'script': '写', 'sect': '切', 'sed': '坐', 'sens': '感觉', 'sent': '感觉',
    'serv': '保持', 'sid': '坐', 'sign': '记号', 'sist': '站', 'sol': '太阳；单独',
    'solv': '松', 'son': '声音', 'spect': '看', 'spir': '呼吸',
    'sta': '站', 'stat': '站', 'stitut': '站', 'struct': '建造', 'sult': '跳',
    'tain': '握', 'tect': '盖', 'tele': '远', 'temp': '时间', 'ten': '握',
    'tend': '伸', 'tens': '伸', 'terr': '地', 'test': '证明', 'therm': '热',
    'tort': '扭', 'tract': '拉', 'trib': '给予', 'trud': '推', 'turb': '搅乱',
    'urb': '城市', 'ut': '用', 'vac': '空', 'vad': '走', 'val': '强',
    'ven': '来', 'vent': '来', 'ver': '真', 'vers': '转', 'vert': '转',
    'vid': '看', 'vis': '看', 'viv': '活', 'vit': '活', 'voc': '声音',
    'vok': '声音', 'volv': '滚', 'vot': '愿望',
    'duce': '引导', 'fuse': '倾倒', 'vide': '看', 'sume': '拿',
    'cept': '拿取', 'cip': '拿取', 'strain': '拉紧', 'strict': '拉紧',
    'prox': '近', 'vince': '征服', 'pel': '推', 'serve': '保持',
    'cline': '倾斜', 'clude': '关闭', 'volve': '滚', 'pel': '推',
    'scend': '爬', 'ploy': '折叠', 'plo': '折叠', 'spond': '承诺',
    'voke': '声音', 'quire': '寻求', 'volve': '滚', 'static': '站',
}

# ─── 前缀 / 后缀表（按长度降序匹配）────────────────────────────
PREFIXES = sorted([
    'counter', 'under', 'inter', 'trans', 'extra', 'ultra', 'fore',
    'over', 'anti', 'micro', 'multi', 'pseudo', 'semi', 'super',
    'auto', 'pre', 'mis', 'dis', 'non', 'out', 'sub', 'mid', 'neo',
    'uni', 'tri', 'vice', 'self', 'pro', 'para', 'mono',
    'un', 'in', 'im', 'il', 'ir', 're', 'de', 'en', 'be', 'co', 'ex',
    'per', 'com', 'con', 'col', 'cor', 'bi',
], key=len, reverse=True)

# 「高置信前缀」：英语中典型派生，允许接任意真实词干
CONFIDENT_PREFIXES = {
    'counter', 'under', 'inter', 'trans', 'extra', 'ultra', 'fore',
    'over', 'anti', 'micro', 'multi', 'pseudo', 'semi', 'super',
    'auto', 'pre', 'mis', 'dis', 'non', 'out', 'sub', 'mid', 'neo',
    'uni', 'tri', 'vice', 'self', 'pro', 'para', 'mono', 'un', 're',
}
# 「风险前缀」：英语/拉丁语系两可，误剥率高，只接受词根表内或当前词书内的词干
RISKY_PREFIXES = {'in', 'im', 'il', 'ir', 'de', 'en', 'be', 'co', 'ex', 'per', 'com', 'con', 'col', 'cor', 'bi'}

SUFFIXES = sorted([
    'ational', 'fulness', 'lessness', 'ization', 'isation', 'bility',
    'ments', 'ment', 'ness', 'tion', 'sion', 'ation', 'ions', 'ion',
    'ously', 'ious', 'eous', 'ous', 'ively', 'ive', 'ably', 'ibly',
    'able', 'ible', 'ally', 'ally', 'ful', 'less', 'ists', 'ist',
    'isms', 'ism', 'ers', 'ors', 'ies', 'ing', 'ed', 'ly', 'er', 'or',
    'ity', 'ety', 'ty', 'al', 'en', 'ish', 'es', 's', 'ic', 'ical',
], key=len, reverse=True)

# ─── 加载 ECDICT ────────────────────────────────────────────────
print('加载 ECDICT 数据库...')
db = sqlite3.connect(DB_PATH)
ecdict = {}
for row in db.execute('SELECT word, phonetic, translation, exchange, pos, collins FROM stardict'):
    w = row[0].lower()
    if w not in ecdict:
        ecdict[w] = row
db.close()
# 真实英语词集：排除 [人名]/[地名]/[计] 缩写等噪声条目
real_words = {
    w for w, row in ecdict.items()
    if row[2] and not row[2].lstrip().startswith('[') and ' ' not in w
    and not re.search(r'人名|地名|姓氏|（姓）', row[2])
}
dict_words = set(ecdict.keys())
print(f'  载入 {len(dict_words)} 词条，真实词 {len(real_words)}')


# ─── 词性分类（虚词/实词）─────────────────────────
# ECDICT pos 编码: n名词 v动词 a形容词 r副词 i介词 c连词 p代词 d限定词
# u助动词 e感叹词 m数词 t不定式标记 o其他
FUNC_POS = {'i', 'c', 'p', 'd', 'u', 'e', 't'}
# 助动词/系动词在 ECDICT 常标为 v，人工补充归入虚词（功能词）
MANUAL_FUNC = {
    'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
    'can', 'could', 'will', 'would', 'shall', 'should', 'may', 'might',
    'must', 'ought', 'do', 'does', 'did', 'done',
    'the', 'a', 'an', 'not', 'no', 'to', 'there', 'it',
}

# 短语派生词：因“in spite of”类短语义项被 ECDICT 标为介词，
# 但单词本身是名词/形容词，强制归为实词
MANUAL_CONTENT = {
    'spite', 'accordance', 'addition', 'behalf', 'conjunction',
    'owing', 'prior', 'former', 'latter', 'worth', 'plenty', 'due',
}

def pos_tag_of(word: str) -> str:
    """返回 'func'(虚词) / 'content'(实词)；查不到时返回 'content'"""
    if word in MANUAL_CONTENT:
        return 'content'
    if word in MANUAL_FUNC:
        return 'func'
    row = ecdict.get(word)
    if not row or not row[4]:
        return 'content'
    func_weight, total = 0.0, 0.0
    for part in row[4].split('/'):
        seg = part.split(':')
        if len(seg) != 2:
            continue
        try:
            wgt = float(seg[1])
        except ValueError:
            continue
        total += wgt
        if seg[0] in FUNC_POS:
            func_weight += wgt
    if total <= 0:
        return 'content'
    return 'func' if func_weight / total >= 0.5 else 'content'

def lemma_of(word: str) -> str:
    """从 exchange 字段提取原型（1:xxx）"""
    row = ecdict.get(word)
    if not row or not row[3]:
        return ''
    for part in row[3].split('/'):
        if part.startswith('1:'):
            return part[2:].lower()
    return ''


def stem_candidates(s: str):
    """词干微调候选：词根表命中优先，其次真实词"""
    transformed = []
    if s.endswith('i'):
        transformed.append(s[:-1] + 'y')      # happi -> happy
    transformed.append(s + 'e')               # writ -> write
    if s.endswith('e'):
        transformed.append(s[:-1])            # vide -> vid
    if len(s) > 2 and s[-1] == s[-2]:
        transformed.append(s[:-1])            # hott -> hot
    if s.endswith('ie'):
        transformed.append(s[:-2] + 'y')
    # 优先：词根表(≥4) > 变换后的真实词 > 词根表短干 > 原词干
    def rank(c):
        if c in ROOT_GLOSS and len(c) >= 4:
            return 0
        if c in real_words and c != s:
            return 1
        if c in ROOT_GLOSS:
            return 2
        return 3
    return sorted(transformed + [s], key=rank)


def accept_stem(cand: str, prefix: str, book_set) -> bool:
    """词干可信度分级：词根表 > 当前词书 > (仅高置信前缀) 真实词典词"""
    if len(cand) < 3:
        return False
    if cand in ROOT_GLOSS:
        return True
    if book_set and cand in book_set:
        return True
    if prefix in CONFIDENT_PREFIXES and cand in real_words and len(cand) >= 3:
        return True
    if prefix in RISKY_PREFIXES and cand in real_words and len(cand) >= 4:
        return True
    return False


def strip_affixes(word: str, book_set, depth: int = 0) -> str:
    """递归剥离词缀，返回最深的词干；剥不动返回原词"""
    if depth >= 3 or len(word) < 4:
        return word
    best = word
    for pre in PREFIXES:
        if word.startswith(pre) and len(word) - len(pre) >= 3:
            rest = word[len(pre):]
            hit = False
            for cand in stem_candidates(rest):
                if accept_stem(cand, pre, book_set):
                    best = strip_affixes(cand, book_set, depth + 1)
                    hit = True
                    break
            if hit:
                break
    w = best
    for suf in SUFFIXES:
        if w.endswith(suf) and len(w) - len(suf) >= 3:
            rest = w[:-len(suf)]
            hit = False
            for cand in stem_candidates(rest):
                if (cand in ROOT_GLOSS and len(cand) >= 4) or cand in real_words or (book_set and cand in book_set):
                    deeper = strip_affixes(cand, book_set, depth + 1)
                    if len(deeper) < len(best) or deeper != best:
                        best = deeper
                    hit = True
                    break
            if hit:
                break
    return best


def find_root(word: str, book_set):
    """递归剥离，返回 (root, gloss)；无法剥离返回 ('','')"""
    stem = strip_affixes(word, book_set)
    if stem == word:
        return '', ''
    if len(stem) < 3:
        return '', ''
    gloss = ROOT_GLOSS.get(stem, '')
    if not gloss:
        row = ecdict.get(stem)
        if row and row[2]:
            # 仅采用「真词义」作释义，剔除 [人名]<意> 等噪声条目
            if not row[2].lstrip().startswith('['):
                gloss_raw = clean_meaning(row[2])
                gloss_raw = re.sub(r'^[a-z]{1,4}\.\s*', '', gloss_raw)  # 去词性前缀
                if gloss_raw and not gloss_raw.lstrip().startswith(('[', '<')):
                    # 只取第一个义项，超过8字截断
                    first = re.split(r'[，,；;]', gloss_raw)[0].strip()
                    gloss = first if len(first) <= 8 else first[:8]
    return stem, gloss


def edit_distance_le1(a: str, b: str) -> bool:
    """编辑距离是否 <=1"""
    la, lb = len(a), len(b)
    if abs(la - lb) > 1:
        return False
    if la == lb:
        diff = sum(1 for x, y in zip(a, b) if x != y)
        return diff == 1
    # 长度差 1：一次插入/删除
    if la > lb:
        a, b = b, a
    i = j = 0
    skipped = False
    while i < len(a) and j < len(b):
        if a[i] == b[j]:
            i += 1; j += 1
        elif not skipped:
            skipped = True; j += 1
        else:
            return False
    return True


DOMAIN_TAG = re.compile(r'\[[^\]]{1,6}\]')
# ECDICT 中的领域/语域标签：命中即截断该段
JUNK_DOMAINS = (
    '计', '经', '医', '化', '律', '物', '机', '电', '数', '体', '军', '农',
    '艺', '文', '语', '哲', '核', '口', '俚', '谚', '古', '罕', '废', '方',
    '书', '喻', '蔑', '谑', '婉', '卑', '误', '人名', '地名', '女子名', '男子名',
    '姓', '生化', '生物', '物理', '化学', '天文', '地理', '历史', '金融',
    '保险', '贸易', '交通', '航海', '航空', '铁路', '电子', '会计', '体育',
    '印刷', '通信', '矿业', '冶金', '船舶', '动力', '建筑', '石油', '地质',
    '生态', '心理', '图情', '美', '英', '法', '德', '拉', '希', '希伯来',
    '口', '俚', '谚', '古', '罕', '废', '方', '书', '喻', '蔑', '谑', '婉',
)
JUNK_RE = re.compile(r'\[(?:' + '|'.join(dict.fromkeys(JUNK_DOMAINS)) + r')[^\]]*\]')
POS_TAG = re.compile(r'^([a-z]{1,4}|vt|vi|v)\.?\s*$')


def clean_meaning(raw: str) -> str:
    """清洗释义：截去领域标签尾巴，保留前两个有效义项，截断60字"""
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
    result = '; '.join(out)
    if len(result) > 60:
        result = result[:60]
        last_comma = max(result.rfind('，'), result.rfind(','))
        if last_comma > 30:
            result = result[:last_comma]
        else:
            result = result.rstrip('，,、 ') + '…'
    return result


def fix_phonetic(p: str) -> str:
    """西里尔 ә(0x04D9) → 拉丁 ə(0x0259)；К→k 等常见混淆"""
    if not p:
        return ''
    table = str.maketrans({'ә': 'ə', 'А': 'A', 'а': 'a', 'е': 'e', 'о': 'o', 'р': 'p', 'с': 'c', 'х': 'x'})
    return p.translate(table)


def is_junk_example(ex: str) -> bool:
    return (not ex) or ex.startswith('Learn the word')


def find_similars(words):
    """形近词：同书内，同首字母，长度差<=1，编辑距离==1"""
    buckets = {}
    for w in words:
        key = w['word'][0]
        buckets.setdefault(key, []).append(w['word'])
    sim_map = {}
    for key, group in buckets.items():
        group = sorted(set(group))
        for i, a0 in enumerate(group):
            a = a0.lower()
            cands = []
            for b0 in group:
                if b0 == a0:
                    continue
                b = b0.lower()
                if abs(len(a) - len(b)) > 1 or abs(len(a) - len(b)) == 0 and len(a) < 3:
                    continue
                if edit_distance_le1(a, b):
                    cands.append(b0)
                if len(cands) >= 6:
                    break
            if cands:
                sim_map[a0] = ','.join(cands)
    return sim_map


# ─── 主流程 ────────────────────────────────────────────────────
stats = {'root': 0, 'similar': 0, 'cleaned': 0, 'junkex': 0, 'phonfix': 0, 'func': 0}

for book in BOOKS:
    path = os.path.join(JSON_DIR, f'{book}.json')
    if not os.path.exists(path):
        print(f'跳过 {book}: 文件不存在')
        continue
    with open(path, encoding='utf-8') as f:
        words = json.load(f)

    if not os.path.exists(path + '.bak'):
        shutil.copy(path, path + '.bak')

    book_set = {w['word'].lower() for w in words}
    sim_map = find_similars(words)

    for w in words:
        raw_meaning = w.get('meaning', '')
        cleaned = clean_meaning(raw_meaning)
        if cleaned != raw_meaning:
            w['meaning'] = cleaned
            stats['cleaned'] += 1

        if is_junk_example(w.get('example', '')):
            w['example'] = ''
            stats['junkex'] += 1

        p0 = w.get('phonetic', '')
        p1 = fix_phonetic(p0)
        if p1 != p0:
            w['phonetic'] = p1
            stats['phonfix'] += 1

        word = w['word'].lower()
        root, gloss = find_root(word, book_set)
        if root:
            w['root'] = root
            if gloss:
                w['rootGloss'] = gloss
            stats['root'] += 1

        lemma = lemma_of(word)
        if lemma and lemma != word:
            w['lemma'] = lemma

        if w['word'] in sim_map:
            w['relatedWords'] = sim_map[w['word']]
            stats['similar'] += 1

        tag = pos_tag_of(word)
        old_tag = w.get('posTag')
        if tag != old_tag:
            w['posTag'] = tag
            if tag == 'func':
                stats['func'] += 1

    with open(path, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, separators=(',', ':'))
    n_root = sum(1 for w in words if w.get('root'))
    n_sim = sum(1 for w in words if w.get('relatedWords'))
    n_func = sum(1 for w in words if w.get('posTag') == 'func')
    print(f'{book}: {len(words)} 词 | 词根 {n_root} | 形近 {n_sim} | 虚词 {n_func}')

print('─' * 50)
print(f'总计: 词根 {stats["root"]} | 形近 {stats["similar"]} | 释义清洗 {stats["cleaned"]} | 垃圾例句 {stats["junkex"]} | 音标修复 {stats["phonfix"]} | 虚词更新 {stats["func"]}')

# ─── 高频核心词书（已下线：2026-09-05 应需求移除书单入口）──────────
if False:
    HIGHFREQ_TARGET = 1800
    print('生成高频核心词书 highfreq.json ...')
    seen, pool = set(), []
    for book in BOOKS:
        path = os.path.join(JSON_DIR, f'{book}.json')
        if not os.path.exists(path):
            continue
        with open(path, encoding='utf-8') as f:
            for w in json.load(f):
                lw = w['word'].lower()
                if lw in seen:
                    continue
                seen.add(lw)
                row = ecdict.get(lw)
                collins = (row[5] if row and row[5] else 0)
                pool.append((collins, len(pool), w))

    pool.sort(key=lambda x: (-x[0], x[1]))
    selected = [w for _, _, w in pool[:HIGHFREQ_TARGET]]
    # 稳定排序：星数降序、同星按原书序
    out_path = os.path.join(JSON_DIR, 'highfreq.json')
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(selected, f, ensure_ascii=False, separators=(',', ':'))
    n_func = sum(1 for w in selected if w.get('posTag') == 'func')
    print(f'highfreq.json: {len(selected)} 词 | 虚词 {n_func} | 实词 {len(selected) - n_func}')

    # 更新 books_meta.json
    meta_path = os.path.join(JSON_DIR, 'books_meta.json')
    with open(meta_path, encoding='utf-8') as f:
        meta = json.load(f)
    entry = {'id': 'highfreq', 'name': '高频核心词', 'tag': '高频',
             'wordCount': len(selected), 'highFreqCount': len(selected)}
    if not any(m.get('id') == 'highfreq' for m in meta):
        meta.append(entry)
    else:
        meta = [entry if m.get('id') == 'highfreq' else m for m in meta]
    with open(meta_path, 'w', encoding='utf-8') as f:
        json.dump(meta, f, ensure_ascii=False, separators=(',', ':'))
    print('books_meta.json 已更新。')
    print('完成。请重新上传 wordbooks_json/*.json 到云存储后生效。')
