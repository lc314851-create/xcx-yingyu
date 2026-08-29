# 修复插入分享方法后缺少的逗号
import io, os, glob

ROOT = os.path.join(os.path.dirname(__file__), '..', 'miniprogram', 'pages')
fixed = []
for fp in glob.glob(os.path.join(ROOT, '*', '*.ts')):
    with io.open(fp, 'r', encoding='utf-8') as f:
        src = f.read()
    orig = src
    # 情况1：前一个方法是 "  }" 结尾
    src = src.replace("\n  }\n\n  // 转发给好友", "\n  },\n\n  // 转发给好友")
    # 情况2：privacy 这种 "  data: {}" 结尾
    src = src.replace("  data: {}\n\n  // 转发给好友", "  data: {},\n\n  // 转发给好友")
    if src != orig:
        with io.open(fp, 'w', encoding='utf-8') as f:
            f.write(src)
        fixed.append(os.path.basename(fp))

print('comma fixed:', ', '.join(fixed) if fixed else 'none')
