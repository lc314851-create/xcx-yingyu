# -*- coding: utf-8 -*-
"""
单词发音批量预生成脚本
========================
功能：
  1. 从项目 wordbooks_json/*.json 收集全部单词，跨词书去重
  2. 逐个调用百度翻译 gettts（与项目 tts 云函数同源）生成美音 mp3
  3. 按 md5(小写词) 命名保存到 _output_tts/mp3/{前2位}/{hash}.mp3
     —— 与现有 tts 云函数/云存储路径规范完全一致，可整夹拖入云存储
  4. _output_tts/manifest.json 记录全部进度，是唯一账本：
     - 已在账本中的词直接跳过（断点续跑，绝不重复生成）
     - 账本意外丢失时可按本地文件重建（--rebuild）
用法：
  python tts_gen.py                 # 全量生成（从上次中断处继续）
  python tts_gen.py --limit 50     # 只跑 50 个新词（烟测/分批）
  python tts_gen.py --stats        # 只看当前进度统计
"""
import hashlib
import http.client
import json
import os
import random
import re
import socket
import ssl
import sys
import time

PROJECT_ROOT = r"E:\MyProjects\xcx-yingyu"
BOOKS_DIR = os.path.join(PROJECT_ROOT, "wordbooks_json")
OUT_DIR = os.path.join(PROJECT_ROOT, "_output_tts")
MP3_DIR = os.path.join(OUT_DIR, "mp3")
MANIFEST = os.path.join(OUT_DIR, "manifest.json")

ACCENT = "us"          # 本轮只生成美音
MIN_BYTES = 800        # 百度返回小于该值视为无效音频
SPF = 0.55             # 每 0.55 秒一次 ≈ 每秒不到 2 次，降低风控概率
FAIL_BACKOFF_MAX = 120 # 单次最长退避秒数


# ─────────────────────── 词收集 ───────────────────────

def collect_words():
    """读全部词书 JSON，产出全局去重词表。容忍多种 JSON 结构。"""
    words = []
    seen = set()
    for name in sorted(os.listdir(BOOKS_DIR)):
        if not name.endswith(".json") or "bak" in name or "meta" in name:
            continue
        path = os.path.join(BOOKS_DIR, name)
        try:
            text = open(path, encoding="utf-8").read()
            try:
                data = json.loads(text)
            except json.JSONDecodeError:
                # JSONL：每行一个独立 JSON 词条
                data = [json.loads(line) for line in text.splitlines() if line.strip()]
        except Exception as e:
            print(f"[warn] 跳过无法解析的词书 {name}: {e}")
            continue
        # 兼容 {words:[...]} 与 [...] 两种结构；词条可能是 str 或 dict
        items = data.get("words") if isinstance(data, dict) else data
        n = 0
        for it in items or []:
            w = it.get("word") if isinstance(it, dict) else it
            if not isinstance(w, str):
                continue
            w = w.strip().lower()
            # 词组/短语/含数字等留待人工确认，主循环只收纯字母词形
            if w and w.isascii() and re.fullmatch(r"[a-z][a-z'\-]*", w):
                if w not in seen:
                    seen.add(w)
                    words.append(w)
                    n += 1
        print(f"  {name}: 新增 {n}")
    return words


def word_hash(word: str) -> str:
    """与项目 tts 云函数一致的 md5(小写文本) 哈希。"""
    return hashlib.md5(word.lower().encode("utf-8")).hexdigest()


def mp3_path_for(h: str) -> str:
    return os.path.join(MP3_DIR, h[:2], f"{h}.mp3")


# ─────────────────────── 账本 ───────────────────────

def load_manifest():
    if os.path.exists(MANIFEST):
        try:
            return json.load(open(MANIFEST, encoding="utf-8"))
        except Exception:
            print("[warn] manifest 解析失败，尝试从本地文件重建")
    return rebuild_manifest()


def rebuild_manifest():
    """账本丢失时的兜底：扫描 mp3 目录，凡合法大小的文件视为已完成。"""
    m = {}
    if not os.path.isdir(MP3_DIR):
        return m
    for sub in os.listdir(MP3_DIR):
        subdir = os.path.join(MP3_DIR, sub)
        if not os.path.isdir(subdir):
            continue
        for f in os.listdir(subdir):
            p = os.path.join(subdir, f)
            h, ext = os.path.splitext(f)
            if ext != ".mp3":
                continue
            size = os.path.getsize(p)
            if size >= MIN_BYTES:
                m[h] = {"bytes": size}
    if m:
        save_manifest(m)
        print(f"[info] 已从本地文件重建账本：{len(m)} 条")
    return m


def save_manifest(m):
    tmp = MANIFEST + ".tmp"
    json.dump(m, open(tmp, "w", encoding="utf-8"), ensure_ascii=False)
    os.replace(tmp, MANIFEST)  # 原子写，避免中断写坏账本


# ─────────────────────── 合成 ───────────────────────

_ctx = ssl.create_default_context()
_conn = None  # 保持连接复用，减少握手次数


def _http_get_tts(url_path: str):
    """单次请求百度 gettts，返回 bytes 或抛异常。"""
    global _conn
    for attempt in range(4):  # 含连接重试
        try:
            if _conn is None:
                _conn = http.client.HTTPSConnection("fanyi.baidu.com", timeout=10, context=_ctx)
            _conn.request(
                "GET",
                url_path,
                headers={
                    "Referer": "https://fanyi.baidu.com",
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                    "Accept": "audio/mpeg, */*",
                },
            )
            resp = _conn.getresponse()
            body = resp.read()
            ct = (resp.getheader("Content-Type") or "").lower()
            status = resp.status
            if status == 200 and "audio" in ct and len(body) > MIN_BYTES:
                return body
            raise RuntimeError(f"bad resp status={status} ct={ct} len={len(body)}")
        except (OSError, RuntimeError) as e:
            _conn = None  # 出错换新连接
            err = e
            time.sleep(min(2 ** attempt, 8))
    raise RuntimeError(f"多次重试仍失败: {err}")


def synthesize(word: str) -> bytes:
    path = "/gettts?lan=en&text=" + __import__("urllib.parse", fromlist=["quote"]).quote(
        word.lower()
    ) + "&spd=3&source=web"
    return _http_get_tts(path)


# ─────────────────────── 主流程 ───────────────────────

def main():
    limit = None
    stats_only = False
    args = sys.argv[1:]
    for i, a in enumerate(args):
        if a == "--limit":
            limit = int(args[i + 1])
        elif a == "--stats":
            stats_only = True

    os.makedirs(MP3_DIR, exist_ok=True)
    os.makedirs(OUT_DIR, exist_ok=True)

    words = collect_words()
    manifest = load_manifest()

    todo = [w for w in words if word_hash(w) not in manifest]
    print(f"\n总词数(去重后): {len(words)} | 账本已有: {len(manifest)} | 待生成: {len(todo)}")
    if stats_only:
        return

    if limit:
        todo = todo[:limit]
        print(f"--limit 生效，本轮只处理 {len(todo)} 个\n")

    ok = fail = skip_local = 0
    consec_fail = 0
    t0 = time.time()

    for idx, w in enumerate(todo, 1):
        h = word_hash(w)
        p = mp3_path_for(h)

        # 三级查重最后一道：本地已有合法文件（如其他会话生成）则补记账
        if os.path.exists(p) and os.path.getsize(p) > MIN_BYTES:
            manifest[h] = {"bytes": os.path.getsize(p)}
            skip_local += 1
            continue

        try:
            os.makedirs(os.path.dirname(p), exist_ok=True)  # 确保 hash 前 2 位二级目录存在
            audio = synthesize(w)
            tmp = p + ".part"
            open(tmp, "wb").write(audio)
            os.replace(tmp, p)
            manifest[h] = {"bytes": len(audio)}
            ok += 1
            consec_fail = 0
        except Exception as e:
            fail += 1
            consec_fail += 1
            backoff = min(5 * consec_fail, FAIL_BACKOFF_MAX)
            print(f"[{idx}/{len(todo)}] ✗ {w}: {e} — 冷却 {backoff}s")
            time.sleep(backoff)
            continue

        # 进度可视化 + 定期落盘
        if idx % 10 == 0 or idx == len(todo):
            rate = idx / max(time.time() - t0, 1)
            eta_min = (len(todo) - idx) / max(rate, 0.01) / 60
            print(
                f"[{idx}/{len(todo)}] ✓率{ok / idx:.0%} "
                f"| {rate:.1f}词/s | ETA {eta_min:.0f}min | 最新: {w}"
            )
        if idx % 30 == 0:
            save_manifest(manifest)

        time.sleep(SPF + random.uniform(0, 0.15))  # 叠加随机抖动更像人操作

    save_manifest(manifest)
    print(f"\n完成: 成功 {ok} | 本地已有补记 {skip_local} | 失败 {fail}")
    print(f"manifest 条目总数: {len(manifest)}")
    print(f"下一步: 将 {MP3_DIR} 整夹拖入微信云存储（保持目录结构），再做云端索引导入。")


if __name__ == "__main__":
    main()
