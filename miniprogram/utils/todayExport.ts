// todayExport.ts - 今日学习单词导出（中英对照）
// 方式一：制表符文本复制到剪贴板（粘贴进 WPS/Excel 即成表格）
// 方式二：canvas 绘制中英对照表格图片（自动分页），保存到相册

import { getTodayLearnedWords } from './store';
import { getBookById } from './wordService';

export interface TodayRow {
  word: string;
  meaning: string;
  phonetic: string;
  known: boolean;
}

/**
 * 聚合今日学过的单词，并从词书解析中英释义。
 * 涉及多本词书时逐本拉取（wordService 内部有本地缓存，开销小）。
 */
export async function collectTodayRows(): Promise<TodayRow[]> {
  const todays = getTodayLearnedWords();
  if (todays.length === 0) return [];

  const meaningMaps = new Map<string, Map<string, { meaning: string; phonetic: string }>>();
  const rows: TodayRow[] = [];

  for (const t of todays) {
    let m = meaningMaps.get(t.bookId);
    if (!m) {
      m = new Map();
      try {
        const book = await getBookById(t.bookId);
        for (const w of (book ? book.words : [])) {
          m.set(w.word.toLowerCase(), { meaning: w.meaning || '', phonetic: w.phonetic || '' });
        }
      } catch (e) {
        console.error('[导出] 词书释义获取失败', t.bookId, e);
      }
      meaningMaps.set(t.bookId, m);
    }
    const info = m.get(t.word.toLowerCase());
    rows.push({
      word: t.word,
      meaning: info ? info.meaning : '',
      phonetic: info ? info.phonetic : '',
      known: t.known
    });
  }
  return rows;
}

/** 制表符分隔文本，首行为表头；粘贴到 WPS/Excel 自动分列 */
export function buildTsv(rows: TodayRow[], title = '今日学习单词'): string {
  const dateStr = formatDate(new Date());
  const lines = [`${title} ${dateStr}`, '单词\t音标\t释义\t掌握情况'];
  for (const r of rows) {
    lines.push(`${r.word}\t${r.phonetic}\t${r.meaning}\t${r.known ? '认识' : '不认识'}`);
  }
  return lines.join('\n');
}

export function exportText(rows: TodayRow[], title = '今日学习单词'): void {
  wx.setClipboardData({
    data: buildTsv(rows, title),
    success: () => {
      wx.showModal({
        title: '已复制到剪贴板',
        content: `共 ${rows.length} 个单词。打开 WPS/Excel 粘贴，即可得到中英对照表格。`,
        showCancel: false,
        confirmText: '知道了'
      });
    },
    fail: () => {
      wx.showToast({ title: '复制失败，请重试', icon: 'none' });
    }
  });
}

// ─── 图片导出（分页高清）─────────────────────────────

const CSS_W = 420;          // 画布 CSS 宽度
const HEADER_H = 64;
const ROW_H1 = 36;          // 单行释义行高
const ROW_H2 = 58;          // 两行释义行高
const ROW_H3 = 78;          // 三行释义行高
const FOOTER_H = 46;
const PAD = 16;
const MAX_PIX = 3900;       // 单页画布像素上限（留安全余量）
const DPR = 2;              // 固定 2 倍图，清晰度不妥协

// 释义预处理：剔除 [电]/[医] 学科标签噪声，压平 \n
function cleanMeaning(s: string): string {
  return s.replace(/\s*\[[^\]]{1,4}\]\s*/g, ' ')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** 按宽度把文本切成最多 maxLines 行，超出补省略号 */
function wrapText(ctx: any, text: string, maxW: number, maxLines: number): string[] {
  const lines: string[] = [];
  let rest = text;
  while (rest && lines.length < maxLines) {
    if (ctx.measureText(rest).width <= maxW) {
      lines.push(rest);
      rest = '';
    } else {
      let cut = rest.length;
      while (cut > 1 && ctx.measureText(rest.slice(0, cut)).width > maxW) cut--;
      lines.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
  }
  if (rest && lines.length) {
    let last = lines[lines.length - 1];
    while (last.length > 1 && ctx.measureText(last + '…').width > maxW) last = last.slice(0, -1);
    lines[lines.length - 1] = last + '…';
  }
  return lines;
}

/** 在 canvas 上绘制一页并返回临时文件路径 */
function renderPage(
  canvas: any,
  rows: TodayRow[],
  pageIdx: number,
  pageTotal: number,
  totalCount: number,
  title = '今日学习 · 中英对照',
  footText = '英语补词达人 · 今日学习成果'
): Promise<string> {
  return new Promise((resolve, reject) => {
    // 预排版：先量出每词释义需要几行，再算本页高度
    const ctx0 = canvas.getContext('2d');
    ctx0.font = '11px sans-serif';
    const meaningMaxW = CSS_W - PAD * 3 - 130 - 26;

    const layout = rows.map(r => {
      const lines = wrapText(ctx0, cleanMeaning(r.meaning) || '—', meaningMaxW, 3);
      const h = lines.length >= 3 ? ROW_H3 : (lines.length === 2 ? ROW_H2 : ROW_H1);
      return { row: r, lines, h };
    });

    const cssH = HEADER_H + layout.reduce((s, it) => s + it.h, 0) + FOOTER_H + PAD * 2;
    canvas.width = CSS_W * DPR;
    canvas.height = cssH * DPR;
    const ctx = canvas.getContext('2d');
    ctx.scale(DPR, DPR);

    // 米纸底
    ctx.fillStyle = '#F7F3E8';
    ctx.fillRect(0, 0, CSS_W, cssH);

    // 标题
    ctx.fillStyle = '#2F3E33';
    ctx.font = 'bold 18px Georgia, "Songti SC", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, PAD, 30);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#8A9388';
    const dateStr = formatDate(new Date());
    const pageStr = pageTotal > 1 ? ` · 第 ${pageIdx + 1}/${pageTotal} 页` : '';
    ctx.fillText(`${dateStr} · 共 ${totalCount} 词${pageStr}`, PAD, 52);

    // 表头分隔线（荧光黄高亮条）
    ctx.fillStyle = '#F5E27A';
    ctx.fillRect(PAD, HEADER_H, CSS_W - PAD * 2, 3);

    // 表格行
    const markX = CSS_W - PAD - 14;
    let cursorY = HEADER_H + PAD;
    layout.forEach((it, i) => {
      const r = it.row;
      const midY = cursorY + it.h / 2;
      if (i % 2 === 1) {
        ctx.fillStyle = 'rgba(47, 62, 51, 0.04)';
        ctx.fillRect(PAD, cursorY, CSS_W - PAD * 2, it.h);
      }
      // 单词
      ctx.fillStyle = '#2F3E33';
      ctx.font = 'bold 14px Georgia, serif';
      ctx.textAlign = 'left';
      let word = r.word;
      if (ctx.measureText(word).width > 118) {
        while (word.length > 2 && ctx.measureText(word + '…').width > 118) word = word.slice(0, -1);
        word += '…';
      }
      ctx.fillText(word, PAD, midY);
      // 释义（最多三行，行距 20px）
      ctx.fillStyle = '#5C6B60';
      ctx.font = '11px sans-serif';
      const n = it.lines.length;
      if (n === 1) {
        ctx.fillText(it.lines[0], PAD + 130, midY);
      } else {
        const firstTop = midY - ((n - 1) * 20) / 2;
        it.lines.forEach((line, li) => {
          ctx.fillText(line, PAD + 130, firstTop + li * 20);
        });
      }
      // 掌握标记
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      if (r.known) {
        ctx.fillStyle = '#4A7A5C';
        ctx.fillText('√', markX, midY);
      } else {
        ctx.fillStyle = '#C25450';
        ctx.fillText('×', markX, midY);
      }
      cursorY += it.h;
    });

    // 页脚
    const footY = cssH - FOOTER_H / 2 - 4;
    ctx.fillStyle = '#B0B6C0';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(footText, CSS_W / 2, footY);

    wx.canvasToTempFilePath({
      canvas,
      success: (res: any) => resolve(res.tempFilePath),
      fail: (err: any) => reject(err)
    });
  });
}

/** 保存单张图片到相册（reject 时携带是否权限问题） */
function saveToAlbum(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.saveImageToPhotosAlbum({
      filePath,
      success: () => resolve(),
      fail: (err: any) => reject(err)
    });
  });
}

function handleAlbumError(err: any, done?: (ok: boolean) => void): void {
  if (err && err.errMsg && err.errMsg.indexOf('auth') > -1) {
    wx.showModal({
      title: '需要相册权限',
      content: '请在设置中开启「保存到相册」权限',
      confirmText: '去设置',
      success: (s: any) => {
        if (s.confirm) wx.openSetting();
      }
    });
  } else {
    wx.showToast({ title: '保存失败', icon: 'none' });
  }
  if (done) done(false);
}

/**
 * 分页绘制并保存到相册：每页约 30 词，固定 2 倍高清，释义最多 3 行。
 */
export async function exportImage(rows: TodayRow[], canvas: any, done?: (ok: boolean) => void, title = '今日学习 · 中英对照', footText = '英语补词达人 · 今日学习成果'): Promise<void> {
  if (!canvas || !rows.length) {
    wx.showToast({ title: rows.length ? '画布未就绪' : '今天还没有学习记录', icon: 'none' });
    if (done) done(false);
    return;
  }

  // 每页行数：按最坏情况（全部两行）估算，保证 cssH*DPR <= MAX_PIX
  const avgRowH = 52;
  const rowsPerPage = Math.max(10, Math.floor((MAX_PIX / DPR - HEADER_H - FOOTER_H - PAD * 2) / avgRowH));
  const pages: TodayRow[][] = [];
  for (let i = 0; i < rows.length; i += rowsPerPage) {
    pages.push(rows.slice(i, i + rowsPerPage));
  }

  wx.showLoading({ title: pages.length > 1 ? `生成 1/${pages.length} 页...` : '生成中...' });

  try {
    let hadAuthFail = false;
    for (let p = 0; p < pages.length; p++) {
      const filePath = await renderPage(canvas, pages[p], p, pages.length, rows.length, title, footText);
      wx.hideLoading();
      try {
        await saveToAlbum(filePath);
        if (pages.length > 1) {
          wx.showToast({ title: `第 ${p + 1}/${pages.length} 张已保存`, icon: 'success' });
          await new Promise(r => setTimeout(r, 600)); // 给 toast 留展示时间
        } else {
          wx.showToast({ title: '已保存到相册', icon: 'success' });
        }
      } catch (err: any) {
        if (err && err.errMsg && err.errMsg.indexOf('auth') > -1) {
          hadAuthFail = true;
          break;
        }
        throw err;
      }
      if (p < pages.length - 1) {
        wx.showLoading({ title: `生成 ${p + 2}/${pages.length} 页...` });
      }
    }
    if (hadAuthFail) {
      wx.showModal({
        title: '需要相册权限',
        content: '请在设置中开启「保存到相册」权限',
        confirmText: '去设置',
        success: (s: any) => {
          if (s.confirm) wx.openSetting();
        }
      });
    }
    if (done) done(true);
  } catch (err: any) {
    wx.hideLoading();
    handleAlbumError(err, done);
  }
}

// ─── 原生 .xlsx 生成（无第三方依赖）─────────────────────
// xlsx 本质是 zip 容器内的若干 XML。此处使用「仅存储不压缩」的 zip，
// 纯手写 zip 头 + CRC32，避免引入 SheetJS 等大体积库。

function utf8Bytes(str: string): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    let c = str.charCodeAt(i);
    if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
      const c2 = str.charCodeAt(i + 1);
      if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
        c = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
        i++;
      }
    }
    if (c < 0x80) out.push(c);
    else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
    else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
  }
  return new Uint8Array(out);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}

interface ZipEntry { name: string; data: Uint8Array; }

/** 打包仅存储（不压缩）的 zip，返回 ArrayBuffer */
function makeZip(entries: ZipEntry[]): ArrayBuffer {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  let total = 0;

  const u16 = (v: number) => new Uint8Array([v & 255, (v >> 8) & 255]);
  const u32 = (v: number) => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);

  for (const e of entries) {
    const nameB = utf8Bytes(e.name);
    const crc = crc32(e.data);
    // 本地文件头
    const head = new Uint8Array(30 + nameB.length);
    head.set([0x50, 0x4B, 0x03, 0x04], 0);   // PK..3.4
    head.set(u16(20), 4);                    // 版本
    head.set(u16(0x0800), 6);                // UTF-8 文件名
    head.set(u16(0), 8);                     // 存储（不压缩）
    head.set(u16(0), 10); head.set(u16(0), 12); // 时间/日期
    head.set(u32(crc), 14);
    head.set(u32(e.data.length), 18);
    head.set(u32(e.data.length), 22);
    head.set(u16(nameB.length), 26);
    head.set(u16(0), 28);
    head.set(nameB, 30);
    chunks.push(head, e.data);
    // 中央目录项
    const cen = new Uint8Array(46 + nameB.length);
    cen.set([0x50, 0x4B, 0x01, 0x02], 0);
    cen.set(u16(20), 4); cen.set(u16(20), 6);
    cen.set(u16(0x0800), 8);
    cen.set(u16(0), 10);
    cen.set(u32(crc), 16);
    cen.set(u32(e.data.length), 20);
    cen.set(u32(e.data.length), 24);
    cen.set(u16(nameB.length), 28);
    cen.set(u32(offset), 42);
    cen.set(nameB, 46);
    central.push(cen);
    offset += head.length + e.data.length;
    total += head.length + e.data.length + cen.length;
  }

  const cdSize = central.reduce((s, c) => s + c.length, 0);
  const eocd = new Uint8Array(22);
  eocd.set([0x50, 0x4B, 0x05, 0x06], 0);
  eocd.set(u16(entries.length), 8);
  eocd.set(u16(entries.length), 10);
  eocd.set(u32(cdSize), 12);
  eocd.set(u32(offset), 16);
  eocd.set(u16(0), 20);

  const all = new Uint8Array(total + eocd.length);
  let pos = 0;
  for (const c of [...chunks, ...central, eocd]) { all.set(c, pos); pos += c.length; }
  return all.buffer;
}

function xmlEsc(s: string): string {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/\n/g, ' ');
}

/** 生成 .xlsx 并拉起微信分享面板发送给好友/文件传输助手 */
export function exportExcelFile(rows: TodayRow[], namePrefix = '今日单词'): void {
  const col = (ref: string, v: string) =>
    `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
  const rowXml = (idx: number, cells: string[]) => `<row r="${idx}">${cells.join('')}</row>`;

  const body: string[] = [rowXml(1, [col('A1', '单词'), col('B1', '音标'), col('C1', '释义'), col('D1', '掌握情况')])];
  rows.forEach((r, i) => {
    const n = i + 2;
    body.push(rowXml(n, [
      col(`A${n}`, r.word),
      col(`B${n}`, r.phonetic),
      col(`C${n}`, r.meaning),
      col(`D${n}`, r.known ? '认识' : '不认识')
    ]));
  });

  const lastRow = rows.length + 1;
  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:D${lastRow}"/><sheetData>${body.join('')}</sheetData></worksheet>`;
  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="今日单词" sheetId="1" r:id="rId1"/></sheets></workbook>`;
  const wbRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`;
  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="1"><font><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs></styleSheet>`;

  const zipBuf = makeZip([
    { name: '[Content_Types].xml', data: utf8Bytes(contentTypesXml) },
    { name: '_rels/.rels', data: utf8Bytes(rootRelsXml) },
    { name: 'xl/workbook.xml', data: utf8Bytes(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', data: utf8Bytes(wbRelsXml) },
    { name: 'xl/styles.xml', data: utf8Bytes(stylesXml) },
    { name: 'xl/worksheets/sheet1.xml', data: utf8Bytes(sheetXml) }
  ]);

  const fileName = `${namePrefix}_${formatDate(new Date())}.xlsx`;
  const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
  const fs = wx.getFileSystemManager();
  try {
    // 同步写：保证 shareFileMessage 仍在用户点击的同步链路中
    fs.writeFileSync(filePath, zipBuf, 'binary');
  } catch (e) {
    wx.showToast({ title: '文件生成失败', icon: 'none' });
    return;
  }
  wx.shareFileMessage({
    filePath,
    fileName,
    success: () => {
      wx.showToast({ title: '已发送，打开即是Excel表格', icon: 'none' });
    },
    fail: (err: any) => {
      if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
        wx.showToast({ title: '分享失败（' + (err.errMsg || '').slice(-30) + '）', icon: 'none' });
      }
    }
  });
}

/** 弹出导出方式选择（复制文本 / 保存图片 / 分享表格文件） */
export interface ExportSheetOpts {
  title?: string;       // 图片标题
  footText?: string;    // 图片页脚
  namePrefix?: string;  // Excel 文件名前缀
  emptyTip?: string;    // 无数据提示
  buildTsvTitle?: string; // 复制文本首行标题
}

export function showExportSheet(rows: TodayRow[], getCanvas: () => Promise<any>, opts?: ExportSheetOpts): void {
  if (rows.length === 0) {
    wx.showToast({ title: (opts && opts.emptyTip) || '今天还没有学习记录', icon: 'none' });
    return;
  }
  wx.showActionSheet({
    itemList: ['复制文本', '保存图片', '发送 Excel'],
    success: async (res: any) => {
      if (res.tapIndex === 0) {
        exportText(rows, (opts && opts.buildTsvTitle) || '今日学习单词');
      } else if (res.tapIndex === 1) {
        const canvas = await getCanvas();
        exportImage(rows, canvas, undefined, opts && opts.title, opts && opts.footText);
      } else {
        exportExcelFile(rows, (opts && opts.namePrefix) || '今日单词');
      }
    }
  });
}

function formatDate(d: Date): string {
  const p = (n: number) => (n < 10 ? '0' + n : '' + n);
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
