# 去除重复插入的分享方法块（保留第一处）
import io, os

ROOT = os.path.join(os.path.dirname(__file__), '..', 'miniprogram', 'pages')

SHARE = {
    'index':    ('英语补词达人 · 与课本同步的背单词神器', True),
    'words':    ('我在用词根记忆法背单词，一起来！', True),
    'booklist': ('选一本词书，开始补回落下的单词', True),
    'plan':     ('我的今日复习计划 · 按遗忘曲线科学背词', True),
    'galaxy':   ('词根星系 · 一次记住一串词', True),
    'memory':   ('记忆体检 · 算准复习日不忘词', True),
    'search':   ('查一个词，补一个词', True),
    'wrongbook':('错题本 · 答错过的不再错', True),
    'mine':     ('英语补词达人 · 每天一句，补回落下的词', True),
    'poster':   ('英语补词达人 · 生词海报', True),
    'privacy':  ('英语补词达人 · 隐私政策', False),
    'quotes':   ('每日金句 · 补回落下的词', True),
    'vocabtest':('测测你的词汇量', True),
}

def block(page, title, timeline):
    s = ""
    if page not in ('quotes', 'vocabtest'):
        s += (
            "\n  // 转发给好友\n"
            "  onShareAppMessage() {\n"
            "    return {\n"
            f"      title: '{title}',\n"
            f"      path: '/pages/{page}/{page}'\n"
            "    };\n"
            "  },\n"
        )
    if timeline:
        s += (
            "\n  // 分享到朋友圈（单页模式）\n"
            "  onShareTimeline() {\n"
            "    return {\n"
            f"      title: '{title}'\n"
            "    };\n"
            "  },\n"
        )
    return s

fixed = []
for page, (title, timeline) in SHARE.items():
    fp = os.path.join(ROOT, page, page + '.ts')
    with io.open(fp, 'r', encoding='utf-8') as f:
        src = f.read()
    b = block(page, title, timeline)
    n = src.count(b)
    if n > 1:
        # 保留第一处，删除其余
        parts = src.split(b)
        src = parts[0] + b + ''.join(parts[1:])
        with io.open(fp, 'w', encoding='utf-8') as f:
            f.write(src)
        fixed.append(f'{page}(x{n}->{1})')
    elif n == 1:
        fixed.append(f'{page}(ok)')
    else:
        fixed.append(f'{page}(MISSING!)')

print('; '.join(fixed))
