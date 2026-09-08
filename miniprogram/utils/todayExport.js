"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectTodayRows = collectTodayRows;
exports.buildTsv = buildTsv;
exports.exportText = exportText;
exports.exportImage = exportImage;
exports.exportExcelFile = exportExcelFile;
exports.showExportSheet = showExportSheet;
const store_1 = require("./store");
const wordService_1 = require("./wordService");
async function collectTodayRows() {
    const todays = (0, store_1.getTodayLearnedWords)();
    if (todays.length === 0)
        return [];
    const meaningMaps = new Map();
    const rows = [];
    for (const t of todays) {
        let m = meaningMaps.get(t.bookId);
        if (!m) {
            m = new Map();
            try {
                const book = await (0, wordService_1.getBookById)(t.bookId);
                for (const w of (book ? book.words : [])) {
                    m.set(w.word.toLowerCase(), { meaning: w.meaning || '', phonetic: w.phonetic || '' });
                }
            }
            catch (e) {
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
function buildTsv(rows, title = '今日学习单词') {
    const dateStr = formatDate(new Date());
    const lines = [`${title} ${dateStr}`, '单词\t音标\t释义\t掌握情况'];
    for (const r of rows) {
        lines.push(`${r.word}\t${r.phonetic}\t${r.meaning}\t${r.known ? '认识' : '不认识'}`);
    }
    return lines.join('\n');
}
function exportText(rows, title = '今日学习单词') {
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
const CSS_W = 420;
const HEADER_H = 64;
const ROW_H1 = 36;
const ROW_H2 = 58;
const ROW_H3 = 78;
const FOOTER_H = 46;
const PAD = 16;
const MAX_PIX = 3900;
const DPR = 2;
function cleanMeaning(s) {
    return s.replace(/\s*\[[^\]]{1,4}\]\s*/g, ' ')
        .replace(/\s*\n+\s*/g, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
function wrapText(ctx, text, maxW, maxLines) {
    const lines = [];
    let rest = text;
    while (rest && lines.length < maxLines) {
        if (ctx.measureText(rest).width <= maxW) {
            lines.push(rest);
            rest = '';
        }
        else {
            let cut = rest.length;
            while (cut > 1 && ctx.measureText(rest.slice(0, cut)).width > maxW)
                cut--;
            lines.push(rest.slice(0, cut));
            rest = rest.slice(cut);
        }
    }
    if (rest && lines.length) {
        let last = lines[lines.length - 1];
        while (last.length > 1 && ctx.measureText(last + '…').width > maxW)
            last = last.slice(0, -1);
        lines[lines.length - 1] = last + '…';
    }
    return lines;
}
function renderPage(canvas, rows, pageIdx, pageTotal, totalCount, title = '今日学习 · 中英对照', footText = '英语补词达人 · 今日学习成果') {
    return new Promise((resolve, reject) => {
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
        ctx.fillStyle = '#F7F3E8';
        ctx.fillRect(0, 0, CSS_W, cssH);
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
        ctx.fillStyle = '#F5E27A';
        ctx.fillRect(PAD, HEADER_H, CSS_W - PAD * 2, 3);
        const markX = CSS_W - PAD - 14;
        let cursorY = HEADER_H + PAD;
        layout.forEach((it, i) => {
            const r = it.row;
            const midY = cursorY + it.h / 2;
            if (i % 2 === 1) {
                ctx.fillStyle = 'rgba(47, 62, 51, 0.04)';
                ctx.fillRect(PAD, cursorY, CSS_W - PAD * 2, it.h);
            }
            ctx.fillStyle = '#2F3E33';
            ctx.font = 'bold 14px Georgia, serif';
            ctx.textAlign = 'left';
            let word = r.word;
            if (ctx.measureText(word).width > 118) {
                while (word.length > 2 && ctx.measureText(word + '…').width > 118)
                    word = word.slice(0, -1);
                word += '…';
            }
            ctx.fillText(word, PAD, midY);
            ctx.fillStyle = '#5C6B60';
            ctx.font = '11px sans-serif';
            const n = it.lines.length;
            if (n === 1) {
                ctx.fillText(it.lines[0], PAD + 130, midY);
            }
            else {
                const firstTop = midY - ((n - 1) * 20) / 2;
                it.lines.forEach((line, li) => {
                    ctx.fillText(line, PAD + 130, firstTop + li * 20);
                });
            }
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            if (r.known) {
                ctx.fillStyle = '#4A7A5C';
                ctx.fillText('√', markX, midY);
            }
            else {
                ctx.fillStyle = '#C25450';
                ctx.fillText('×', markX, midY);
            }
            cursorY += it.h;
        });
        const footY = cssH - FOOTER_H / 2 - 4;
        ctx.fillStyle = '#B0B6C0';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(footText, CSS_W / 2, footY);
        wx.canvasToTempFilePath({
            canvas,
            success: (res) => resolve(res.tempFilePath),
            fail: (err) => reject(err)
        });
    });
}
function saveToAlbum(filePath) {
    return new Promise((resolve, reject) => {
        wx.saveImageToPhotosAlbum({
            filePath,
            success: () => resolve(),
            fail: (err) => reject(err)
        });
    });
}
function handleAlbumError(err, done) {
    if (err && err.errMsg && err.errMsg.indexOf('auth') > -1) {
        wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启「保存到相册」权限',
            confirmText: '去设置',
            success: (s) => {
                if (s.confirm)
                    wx.openSetting();
            }
        });
    }
    else {
        wx.showToast({ title: '保存失败', icon: 'none' });
    }
    if (done)
        done(false);
}
async function exportImage(rows, canvas, done, title = '今日学习 · 中英对照', footText = '英语补词达人 · 今日学习成果') {
    if (!canvas || !rows.length) {
        wx.showToast({ title: rows.length ? '画布未就绪' : '今天还没有学习记录', icon: 'none' });
        if (done)
            done(false);
        return;
    }
    const avgRowH = 52;
    const rowsPerPage = Math.max(10, Math.floor((MAX_PIX / DPR - HEADER_H - FOOTER_H - PAD * 2) / avgRowH));
    const pages = [];
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
                    await new Promise(r => setTimeout(r, 600));
                }
                else {
                    wx.showToast({ title: '已保存到相册', icon: 'success' });
                }
            }
            catch (err) {
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
                success: (s) => {
                    if (s.confirm)
                        wx.openSetting();
                }
            });
        }
        if (done)
            done(true);
    }
    catch (err) {
        wx.hideLoading();
        handleAlbumError(err, done);
    }
}
function utf8Bytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c >= 0xD800 && c <= 0xDBFF && i + 1 < str.length) {
            const c2 = str.charCodeAt(i + 1);
            if (c2 >= 0xDC00 && c2 <= 0xDFFF) {
                c = 0x10000 + ((c - 0xD800) << 10) + (c2 - 0xDC00);
                i++;
            }
        }
        if (c < 0x80)
            out.push(c);
        else if (c < 0x800)
            out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
        else if (c < 0x10000)
            out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
        else
            out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return new Uint8Array(out);
}
const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++)
            c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();
function crc32(bytes) {
    let c = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++)
        c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
}
function makeZip(entries) {
    const chunks = [];
    const central = [];
    let offset = 0;
    let total = 0;
    const u16 = (v) => new Uint8Array([v & 255, (v >> 8) & 255]);
    const u32 = (v) => new Uint8Array([v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255]);
    for (const e of entries) {
        const nameB = utf8Bytes(e.name);
        const crc = crc32(e.data);
        const head = new Uint8Array(30 + nameB.length);
        head.set([0x50, 0x4B, 0x03, 0x04], 0);
        head.set(u16(20), 4);
        head.set(u16(0x0800), 6);
        head.set(u16(0), 8);
        head.set(u16(0), 10);
        head.set(u16(0), 12);
        head.set(u32(crc), 14);
        head.set(u32(e.data.length), 18);
        head.set(u32(e.data.length), 22);
        head.set(u16(nameB.length), 26);
        head.set(u16(0), 28);
        head.set(nameB, 30);
        chunks.push(head, e.data);
        const cen = new Uint8Array(46 + nameB.length);
        cen.set([0x50, 0x4B, 0x01, 0x02], 0);
        cen.set(u16(20), 4);
        cen.set(u16(20), 6);
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
    for (const c of [...chunks, ...central, eocd]) {
        all.set(c, pos);
        pos += c.length;
    }
    return all.buffer;
}
function xmlEsc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/\n/g, ' ');
}
function exportExcelFile(rows, namePrefix = '今日单词') {
    const col = (ref, v) => `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(v)}</t></is></c>`;
    const rowXml = (idx, cells) => `<row r="${idx}">${cells.join('')}</row>`;
    const body = [rowXml(1, [col('A1', '单词'), col('B1', '音标'), col('C1', '释义'), col('D1', '掌握情况')])];
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
        fs.writeFileSync(filePath, zipBuf, 'binary');
    }
    catch (e) {
        wx.showToast({ title: '文件生成失败', icon: 'none' });
        return;
    }
    wx.shareFileMessage({
        filePath,
        fileName,
        success: () => {
            wx.showToast({ title: '已发送，打开即是Excel表格', icon: 'none' });
        },
        fail: (err) => {
            if (err && err.errMsg && err.errMsg.indexOf('cancel') === -1) {
                wx.showToast({ title: '分享失败（' + (err.errMsg || '').slice(-30) + '）', icon: 'none' });
            }
        }
    });
}
function showExportSheet(rows, getCanvas, opts) {
    if (rows.length === 0) {
        wx.showToast({ title: (opts && opts.emptyTip) || '今天还没有学习记录', icon: 'none' });
        return;
    }
    wx.showActionSheet({
        itemList: ['复制文本', '保存图片', '发送 Excel'],
        success: async (res) => {
            if (res.tapIndex === 0) {
                exportText(rows, (opts && opts.buildTsvTitle) || '今日学习单词');
            }
            else if (res.tapIndex === 1) {
                const canvas = await getCanvas();
                exportImage(rows, canvas, undefined, opts && opts.title, opts && opts.footText);
            }
            else {
                exportExcelFile(rows, (opts && opts.namePrefix) || '今日单词');
            }
        }
    });
}
function formatDate(d) {
    const p = (n) => (n < 10 ? '0' + n : '' + n);
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidG9kYXlFeHBvcnQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0b2RheUV4cG9ydC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQWtCQSw0Q0E4QkM7QUFHRCw0QkFPQztBQUVELGdDQWVDO0FBdUxELGtDQXdEQztBQTRHRCwwQ0E2REM7QUFXRCwwQ0FrQkM7QUE1ZkQsbUNBQStDO0FBQy9DLCtDQUE0QztBQWFyQyxLQUFLLFVBQVUsZ0JBQWdCO0lBQ3BDLE1BQU0sTUFBTSxHQUFHLElBQUEsNEJBQW9CLEdBQUUsQ0FBQztJQUN0QyxJQUFJLE1BQU0sQ0FBQyxNQUFNLEtBQUssQ0FBQztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBRW5DLE1BQU0sV0FBVyxHQUFHLElBQUksR0FBRyxFQUE4RCxDQUFDO0lBQzFGLE1BQU0sSUFBSSxHQUFlLEVBQUUsQ0FBQztJQUU1QixLQUFLLE1BQU0sQ0FBQyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQ3ZCLElBQUksQ0FBQyxHQUFHLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztZQUNQLENBQUMsR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO1lBQ2QsSUFBSSxDQUFDO2dCQUNILE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSx5QkFBVyxFQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQztnQkFDekMsS0FBSyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQztvQkFDekMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFdBQVcsRUFBRSxFQUFFLEVBQUUsT0FBTyxFQUFFLENBQUMsQ0FBQyxPQUFPLElBQUksRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUMsUUFBUSxJQUFJLEVBQUUs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RyxDQUFDLENBQUM7SUFDZixJQUFJLEtBQUssR0FBRyxDQUFDLENBQUM7SUFFZCxNQUFNLEdBQUcsR0FBRyxDQUFDLENBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxVQUFVLENBQUMsQ0FBQyxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFDckUsTUFBTSxHQUFHLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLElBQUksVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUFDLElBQUksRUFBRSxDQUFDLEdBQUcsR0FBRyxFQUFFLENBQUMsQ0FBQyxLQUFLLEVBQUUsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDLENBQUM7SUFFeEcsS0FBSyxNQUFNLENBQUMsSUFBSSxPQUFPLEVBQUUsQ0FBQztRQUN4QixNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ2hDLE1BQU0sR0FBRyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFMUIsTUFBTSxJQUFJLEdBQUcsSUFBSSxVQUFVLENBQUMsRUFBRSxHQUFHLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUMvQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDdEMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDckIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7UUFDcEIsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUMzQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2pDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDakMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ2hDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3JCLElBQUksQ0FBQyxHQUFHLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUUxQixNQUFNLEdBQUcsR0FBRyxJQUFJLFVBQVUsQ0FBQyxFQUFFLEdBQUcsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDO1FBQzlDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUNyQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ3hCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3BCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBQ3RCLEdBQUcsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDaEMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNoQyxHQUFHLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDL0IsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDekIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFDbkIsT0FBTyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQixNQUFNLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUN0QyxLQUFLLElBQUksSUFBSSxDQUFDLE1BQU0sR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sR0FBRyxHQUFHLENBQUMsTUFBTSxDQUFDO0lBQ3BELENBQUM7SUFFRCxNQUFNLE1BQU0sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxD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QztBQUVELFNBQVMsVUFBVSxDQUFDLENBQU87SUFDekIsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFTLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDO0lBQ3JELE9BQU8sR0FBRyxDQUFDLENBQUMsV0FBVyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLEVBQUUsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sRUFBRSxDQUFDLEVBQUUsQ0FBQztBQUN2RSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLy8gdG9kYXlFeHBvcnQudHMgLSDku4rml6XlrabkuaDljZXor43lr7zlh7rvvIjkuK3oi7Hlr7nnhafvvIlcbi8vIOaWueW8j+S4gO+8muWItuihqOespuaWh+acrOWkjeWItuWIsOWJqui0tOadv++8iOeymOi0tOi/myBXUFMvRXhjZWwg5Y2z5oiQ6KGo5qC877yJXG4vLyDmlrnlvI/kuozvvJpjYW52YXMg57uY5Yi25Lit6Iux5a+554Wn6KGo5qC85Zu+54mH77yI6Ieq5Yqo5YiG6aG177yJ77yM5L+d5a2Y5Yiw55u45YaMXG5cbmltcG9ydCB7IGdldFRvZGF5TGVhcm5lZFdvcmRzIH0gZnJvbSAnLi9zdG9yZSc7XG5pbXBvcnQgeyBnZXRCb29rQnlJZCB9IGZyb20gJy4vd29yZFNlcnZpY2UnO1xuXG5leHBvcnQgaW50ZXJmYWNlIFRvZGF5Um93IHtcbiAgd29yZDogc3RyaW5nO1xuICBtZWFuaW5nOiBzdHJpbmc7XG4gIHBob25ldGljOiBzdHJpbmc7XG4gIGtub3duOiBib29sZWFuO1xufVxuXG4vKipcbiAqIOiBmuWQiOS7iuaXpeWtpui/h+eahOWNleivje+8jOW5tuS7juivjeS5puino+aekOS4reiLsemHiuS5ieOAglxuICog5raJ5Y+K5aSa5pys6K+N5Lmm5pe26YCQ5pys5ouJ5Y+W77yId29yZFNlcnZpY2Ug5YaF6YOo5pyJ5pys5Zyw57yT5a2Y77yM5byA6ZSA5bCP77yJ44CCXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjb2xsZWN0VG9kYXlSb3dzKCk6IFByb21pc2U8VG9kYXlSb3dbXT4ge1xuICBjb25zdCB0b2RheXMgPSBnZXRUb2RheUxlYXJuZWRXb3JkcygpO1xuICBpZiAodG9kYXlzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIFtdO1xuXG4gIGNvbnN0IG1lYW5pbmdNYXBzID0gbmV3IE1hcDxzdHJpbmcsIE1hcDxzdHJpbmcsIHsgbWVhbmluZzogc3RyaW5nOyBwaG9uZXRpYzogc3RyaW5nIH0+PigpO1xuICBjb25zdCByb3dzOiBUb2RheVJvd1tdID0gW107XG5cbiAgZm9yIChjb25zdCB0IG9mIHRvZGF5cykge1xuICAgIGxldCBtID0gbWVhbmluZ01hcHMuZ2V0KHQuYm9va0lkKTtcbiAgICBpZiAoIW0pIHtcbiAgICAgIG0gPSBuZXcgTWFwKCk7XG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBib29rID0gYXdhaXQgZ2V0Qm9va0J5SWQodC5ib29rSWQpO1xuICAgICAgICBmb3IgKGNvbnN0IHcgb2YgKGJvb2sgPyBib29rLndvcmRzIDogW10pKSB7XG4gICAgICAgICAgbS5zZXQody53b3JkLnRvTG93ZXJDYXNlKCksIHsgbWVhbmluZzogdy5tZWFuaW5nIHx8ICcnLCBwaG9uZXRpYzogdy5waG9uZXRpYyB8fCAnJyB9KTtcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdb5a+85Ye6XSDor43kuabph4rkuYnojrflj5blpLHotKUnLCB0LmJvb2tJZCwgZSk7XG4gICAgICB9XG4gICAgICBtZWFuaW5nTWFwcy5zZXQodC5ib29rSWQsIG0pO1xuICAgIH1cbiAgICBjb25zdCBpbmZvID0gbS5nZXQodC53b3JkLnRvTG93ZXJDYXNlKCkpO1xuICAgIHJvd3MucHVzaCh7XG4gICAgICB3b3JkOiB0LndvcmQsXG4gICAgICBtZWFuaW5nOiBpbmZvID8gaW5mby5tZWFuaW5nIDogJycsXG4gICAgICBwaG9uZXRpYzogaW5mbyA/IGluZm8ucGhvbmV0aWMgOiAnJyxcbiAgICAgIGtub3duOiB0Lmtub3duXG4gICAgfSk7XG4gIH1cbiAgcmV0dXJuIHJvd3M7XG59XG5cbi8qKiDliLbooajnrKbliIbpmpTmlofmnKzvvIzpppbooYzkuLrooajlpLTvvJvnspjotLTliLAgV1BTL0V4Y2VsIOiHquWKqOWIhuWIlyAqL1xuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkVHN2KHJvd3M6IFRvZGF5Um93W10sIHRpdGxlID0gJ+S7iuaXpeWtpuS5oOWNleivjScpOiBzdHJpbmcge1xuICBjb25zdCBkYXRlU3RyID0gZm9ybWF0RGF0ZShuZXcgRGF0ZSgpKTtcbiAgY29uc3QgbGluZXMgPSBbYCR7dGl0bGV9ICR7ZGF0ZVN0cn1gLCAn5Y2V6K+NXFx06Z+z5qCHXFx06YeK5LmJXFx05o6M5o+h5oOF5Ya1J107XG4gIGZvciAoY29uc3QgciBvZiByb3dzKSB7XG4gICAgbGluZXMucHVzaChgJHtyLndvcmR9XFx0JHtyLnBob25ldGljfVxcdCR7ci5tZWFuaW5nfVxcdCR7ci5rbm93biA/ICforqTor4YnIDogJ+S4jeiupOivhid9YCk7XG4gIH1cbiAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZXhwb3J0VGV4dChyb3dzOiBUb2RheVJvd1tdLCB0aXRsZSA9ICfku4rml6XlrabkuaDljZXor40nKTogdm9pZCB7XG4gIHd4LnNldENsaXBib2FyZERhdGEoe1xuICAgIGRhdGE6IGJ1aWxkVHN2KHJvd3MsIHRpdGxlKSxcbiAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICB3eC5zaG93TW9kYWwoe1xuICAgICAgICB0aXRsZTogJ+W3suWkjeWItuWIsOWJqui0tOadvycsXG4gICAgICAgIGNvbnRlbnQ6IGDlhbEgJHtyb3dzLmxlbmd0aH0g5Liq5Y2V6K+N44CC5omT5byAIFdQUy9FeGNlbCDnspjotLTvvIzljbPlj6/lvpfliLDkuK3oi7Hlr7nnhafooajmoLzjgIJgLFxuICAgICAgICBzaG93Q2FuY2VsOiBmYWxzZSxcbiAgICAgICAgY29uZmlybVRleHQ6ICfnn6XpgZPkuoYnXG4gICAgICB9KTtcbiAgICB9LFxuICAgIGZhaWw6ICgpID0+IHtcbiAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5aSN5Yi25aSx6LSl77yM6K+36YeN6K+VJywgaWNvbjogJ25vbmUnIH0pO1xuICAgIH1cbiAgfSk7XG59XG5cbi8vIOKUgOKUgOKUgCDlm77niYflr7zlh7rvvIjliIbpobXpq5jmuIXvvInilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIDilIBcblxuY29uc3QgQ1NTX1cgPSA0MjA7ICAgICAgICAgIC8vIOeUu+W4gyBDU1Mg5a695bqmXG5jb25zdCBIRUFERVJfSCA9IDY0O1xuY29uc3QgUk9XX0gxID0gMzY7ICAgICAgICAgIC8vIOWNleihjOmHiuS5ieihjOmrmFxuY29uc3QgUk9XX0gyID0gNTg7ICAgICAgICAgIC8vIOS4pOihjOmHiuS5ieihjOmrmFxuY29uc3QgUk9XX0gzID0gNzg7ICAgICAgICAgIC8vIOS4ieihjOmHiuS5ieihjOmrmFxuY29uc3QgRk9PVEVSX0ggPSA0NjtcbmNvbnN0IFBBRCA9IDE2O1xuY29uc3QgTUFYX1BJWCA9IDM5MDA7ICAgICAgIC8vIOWNlemhteeUu+W4g+WDj+e0oOS4iumZkO+8iOeVmeWuieWFqOS9memHj++8iVxuY29uc3QgRFBSID0gMjsgICAgICAgICAgICAgIC8vIOWbuuWumiAyIOWAjeWbvu+8jOa4heaZsOW6puS4jeWmpeWNj1xuXG4vLyDph4rkuYnpooTlpITnkIbvvJrliZTpmaQgW+eUtV0vW+WMu10g5a2m56eR5qCH562+5Zmq5aOw77yM5Y6L5bmzIFxcblxuZnVuY3Rpb24gY2xlYW5NZWFuaW5nKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBzLnJlcGxhY2UoL1xccypcXFtbXlxcXV17MSw0fVxcXVxccyovZywgJyAnKVxuICAgIC5yZXBsYWNlKC9cXHMqXFxuK1xccyovZywgJyAnKVxuICAgIC5yZXBsYWNlKC9cXHN7Mix9L2csICcgJylcbiAgICAudHJpbSgpO1xufVxuXG4vKiog5oyJ5a695bqm5oqK5paH5pys5YiH5oiQ5pyA5aSaIG1heExpbmVzIOihjO+8jOi2heWHuuihpeecgeeVpeWPtyAqL1xuZnVuY3Rpb24gd3JhcFRleHQoY3R4OiBhbnksIHRleHQ6IHN0cmluZywgbWF4VzogbnVtYmVyLCBtYXhMaW5lczogbnVtYmVyKTogc3RyaW5nW10ge1xuICBjb25zdCBsaW5lczogc3RyaW5nW10gPSBbXTtcbiAgbGV0IHJlc3QgPSB0ZXh0O1xuICB3aGlsZSAocmVzdCAmJiBsaW5lcy5sZW5ndGggPCBtYXhMaW5lcykge1xuICAgIGlmIChjdHgubWVhc3VyZVRleHQocmVzdCkud2lkdGggPD0gbWF4Vykge1xuICAgICAgbGluZXMucHVzaChyZXN0KTtcbiAgICAgIHJlc3QgPSAnJztcbiAgICB9IGVsc2Uge1xuICAgICAgbGV0IGN1dCA9IHJlc3QubGVuZ3RoO1xuICAgICAgd2hpbGUgKGN1dCA+IDEgJiYgY3R4Lm1lYXN1cmVUZXh0KHJlc3Quc2xpY2UoMCwgY3V0KSkud2lkdGggPiBtYXhXKSBjdXQtLTtcbiAgICAgIGxpbmVzLnB1c2gocmVzdC5zbGljZSgwLCBjdXQpKTtcbiAgICAgIHJlc3QgPSByZXN0LnNsaWNlKGN1dCk7XG4gICAgfVxuICB9XG4gIGlmIChyZXN0ICYmIGxpbmVzLmxlbmd0aCkge1xuICAgIGxldCBsYXN0ID0gbGluZXNbbGluZXMubGVuZ3RoIC0gMV07XG4gICAgd2hpbGUgKGxhc3QubGVuZ3RoID4gMSAmJiBjdHgubWVhc3VyZVRleHQobGFzdCArICfigKYnKS53aWR0aCA+IG1heFcpIGxhc3QgPSBsYXN0LnNsaWNlKDAsIC0xKTtcbiAgICBsaW5lc1tsaW5lcy5sZW5ndGggLSAxXSA9IGxhc3QgKyAn4oCmJztcbiAgfVxuICByZXR1cm4gbGluZXM7XG59XG5cbi8qKiDlnKggY2FudmFzIOS4iue7mOWItuS4gOmhteW5tui/lOWbnuS4tOaXtuaWh+S7tui3r+W+hCAqL1xuZnVuY3Rpb24gcmVuZGVyUGFnZShcbiAgY2FudmFzOiBhbnksXG4gIHJvd3M6IFRvZGF5Um93W10sXG4gIHBhZ2VJZHg6IG51bWJlcixcbiAgcGFnZVRvdGFsOiBudW1iZXIsXG4gIHRvdGFsQ291bnQ6IG51bWJlcixcbiAgdGl0bGUgPSAn5LuK5pel5a2m5LmgIMK3IOS4reiLseWvueeFpycsXG4gIGZvb3RUZXh0ID0gJ+iLseivreihpeivjei+vuS6uiDCtyDku4rml6XlrabkuaDmiJDmnpwnXG4pOiBQcm9taXNlPHN0cmluZz4ge1xuICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgIC8vIOmihOaOkueJiO+8muWFiOmHj+WHuuavj+ivjemHiuS5iemcgOimgeWHoOihjO+8jOWGjeeul+acrOmhtemrmOW6plxuICAgIGNvbnN0IGN0eDAgPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKTtcbiAgICBjdHgwLmZvbnQgPSAnMTFweCBzYW5zLXNlcmlmJztcbiAgICBjb25zdCBtZWFuaW5nTWF4VyA9IENTU19XIC0gUEFEICogMyAtIDEzMCAtIDI2O1xuXG4gICAgY29uc3QgbGF5b3V0ID0gcm93cy5tYXAociA9PiB7XG4gICAgICBjb25zdCBsaW5lcyA9IHdyYXBUZXh0KGN0eDAsIGNsZWFuTWVhbmluZyhyLm1lYW5pbmcpIHx8ICfigJQnLCBtZWFuaW5nTWF4VywgMyk7XG4gICAgICBjb25zdCBoID0gbGluZXMubGVuZ3RoID49IDMgPyBST1dfSDMgOiAobGluZXMubGVuZ3RoID09PSAyID8gUk9XX0gyIDogUk9XX0gxKTtcbiAgICAgIHJldHVybiB7IHJvdzogciwgbGluZXMsIGggfTtcbiAgICB9KTtcblxuICAgIGNvbnN0IGNzc0ggPSBIRUFERVJfSCArIGxheW91dC5yZWR1Y2UoKHMsIGl0KSA9PiBzICsgaXQuaCwgMCkgKyBGT09URVJfSCArIFBBRCAqIDI7XG4gICAgY2FudmFzLndpZHRoID0gQ1NTX1cgKiBEUFI7XG4gICAgY2FudmFzLmhlaWdodCA9IGNzc0ggKiBEUFI7XG4gICAgY29uc3QgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJyk7XG4gICAgY3R4LnNjYWxlKERQUiwgRFBSKTtcblxuICAgIC8vIOexs+e6uOW6lVxuICAgIGN0eC5maWxsU3R5bGUgPSAnI0Y3RjNFOCc7XG4gICAgY3R4LmZpbGxSZWN0KDAsIDAsIENTU19XLCBjc3NIKTtcblxuICAgIC8vIOagh+mimFxuICAgIGN0eC5maWxsU3R5bGUgPSAnIzJGM0UzMyc7XG4gICAgY3R4LmZvbnQgPSAnYm9sZCAxOHB4IEdlb3JnaWEsIFwiU29uZ3RpIFNDXCIsIHNlcmlmJztcbiAgICBjdHgudGV4dEFsaWduID0gJ2xlZnQnO1xuICAgIGN0eC50ZXh0QmFzZWxpbmUgPSAnbWlkZGxlJztcbiAgICBjdHguZmlsbFRleHQodGl0bGUsIFBBRCwgMzApO1xuICAgIGN0eC5mb250ID0gJzExcHggc2Fucy1zZXJpZic7XG4gICAgY3R4LmZpbGxTdHlsZSA9ICcjOEE5Mzg4JztcbiAgICBjb25zdCBkYXRlU3RyID0gZm9ybWF0RGF0ZShuZXcgRGF0ZSgpKTtcbiAgICBjb25zdCBwYWdlU3RyID0gcGFnZVRvdGFsID4gMSA/IGAgwrcg56ysICR7cGFnZUlkeCArIDF9LyR7cGFnZVRvdGFsfSDpobVgIDogJyc7XG4gICAgY3R4LmZpbGxUZXh0KGAke2RhdGVTdHJ9IMK3IOWFsSAke3RvdGFsQ291bnR9IOivjSR7cGFnZVN0cn1gLCBQQUQsIDUyKTtcblxuICAgIC8vIOihqOWktOWIhumalOe6v++8iOiNp+WFiem7hOmrmOS6ruadoe+8iVxuICAgIGN0eC5maWxsU3R5bGUgPSAnI0Y1RTI3QSc7XG4gICAgY3R4LmZpbGxSZWN0KFBBRCwgSEVBREVSX0gsIENTU19XIC0gUEFEICogMiwgMyk7XG5cbiAgICAvLyDooajmoLzooYxcbiAgICBjb25zdCBtYXJrWCA9IENTU19XIC0gUEFEIC0gMTQ7XG4gICAgbGV0IGN1cnNvclkgPSBIRUFERVJfSCArIFBBRDtcbiAgICBsYXlvdXQuZm9yRWFjaCgoaXQsIGkpID0+IHtcbiAgICAgIGNvbnN0IHIgPSBpdC5yb3c7XG4gICAgICBjb25zdCBtaWRZID0gY3Vyc29yWSArIGl0LmggLyAyO1xuICAgICAgaWYgKGkgJSAyID09PSAxKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAncmdiYSg0NywgNjIsIDUxLCAwLjA0KSc7XG4gICAgICAgIGN0eC5maWxsUmVjdChQQUQsIGN1cnNvclksIENTU19XIC0gUEFEICogMiwgaXQuaCk7XG4gICAgICB9XG4gICAgICAvLyDljZXor41cbiAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzJGM0UzMyc7XG4gICAgICBjdHguZm9udCA9ICdib2xkIDE0cHggR2VvcmdpYSwgc2VyaWYnO1xuICAgICAgY3R4LnRleHRBbGlnbiA9ICdsZWZ0JztcbiAgICAgIGxldCB3b3JkID0gci53b3JkO1xuICAgICAgaWYgKGN0eC5tZWFzdXJlVGV4dCh3b3JkKS53aWR0aCA+IDExOCkge1xuICAgICAgICB3aGlsZSAod29yZC5sZW5ndGggPiAyICYmIGN0eC5tZWFzdXJlVGV4dCh3b3JkICsgJ+KApicpLndpZHRoID4gMTE4KSB3b3JkID0gd29yZC5zbGljZSgwLCAtMSk7XG4gICAgICAgIHdvcmQgKz0gJ+KApic7XG4gICAgICB9XG4gICAgICBjdHguZmlsbFRleHQod29yZCwgUEFELCBtaWRZKTtcbiAgICAgIC8vIOmHiuS5ie+8iOacgOWkmuS4ieihjO+8jOihjOi3nSAyMHB477yJXG4gICAgICBjdHguZmlsbFN0eWxlID0gJyM1QzZCNjAnO1xuICAgICAgY3R4LmZvbnQgPSAnMTFweCBzYW5zLXNlcmlmJztcbiAgICAgIGNvbnN0IG4gPSBpdC5saW5lcy5sZW5ndGg7XG4gICAgICBpZiAobiA9PT0gMSkge1xuICAgICAgICBjdHguZmlsbFRleHQoaXQubGluZXNbMF0sIFBBRCArIDEzMCwgbWlkWSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCBmaXJzdFRvcCA9IG1pZFkgLSAoKG4gLSAxKSAqIDIwKSAvIDI7XG4gICAgICAgIGl0LmxpbmVzLmZvckVhY2goKGxpbmUsIGxpKSA9PiB7XG4gICAgICAgICAgY3R4LmZpbGxUZXh0KGxpbmUsIFBBRCArIDEzMCwgZmlyc3RUb3AgKyBsaSAqIDIwKTtcbiAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICAvLyDmjozmj6HmoIforrBcbiAgICAgIGN0eC5mb250ID0gJ2JvbGQgMTNweCBzYW5zLXNlcmlmJztcbiAgICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcbiAgICAgIGlmIChyLmtub3duKSB7XG4gICAgICAgIGN0eC5maWxsU3R5bGUgPSAnIzRBN0E1Qyc7XG4gICAgICAgIGN0eC5maWxsVGV4dCgn4oiaJywgbWFya1gsIG1pZFkpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY3R4LmZpbGxTdHlsZSA9ICcjQzI1NDUwJztcbiAgICAgICAgY3R4LmZpbGxUZXh0KCfDlycsIG1hcmtYLCBtaWRZKTtcbiAgICAgIH1cbiAgICAgIGN1cnNvclkgKz0gaXQuaDtcbiAgICB9KTtcblxuICAgIC8vIOmhteiEmlxuICAgIGNvbnN0IGZvb3RZID0gY3NzSCAtIEZPT1RFUl9IIC8gMiAtIDQ7XG4gICAgY3R4LmZpbGxTdHlsZSA9ICcjQjBCNkMwJztcbiAgICBjdHguZm9udCA9ICcxMHB4IHNhbnMtc2VyaWYnO1xuICAgIGN0eC50ZXh0QWxpZ24gPSAnY2VudGVyJztcbiAgICBjdHguZmlsbFRleHQoZm9vdFRleHQsIENTU19XIC8gMiwgZm9vdFkpO1xuXG4gICAgd3guY2FudmFzVG9UZW1wRmlsZVBhdGgoe1xuICAgICAgY2FudmFzLFxuICAgICAgc3VjY2VzczogKHJlczogYW55KSA9PiByZXNvbHZlKHJlcy50ZW1wRmlsZVBhdGgpLFxuICAgICAgZmFpbDogKGVycjogYW55KSA9PiByZWplY3QoZXJyKVxuICAgIH0pO1xuICB9KTtcbn1cblxuLyoqIOS/neWtmOWNleW8oOWbvueJh+WIsOebuOWGjO+8iHJlamVjdCDml7bmkLrluKbmmK/lkKbmnYPpmZDpl67popjvvIkgKi9cbmZ1bmN0aW9uIHNhdmVUb0FsYnVtKGZpbGVQYXRoOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+IHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICB3eC5zYXZlSW1hZ2VUb1Bob3Rvc0FsYnVtKHtcbiAgICAgIGZpbGVQYXRoLFxuICAgICAgc3VjY2VzczogKCkgPT4gcmVzb2x2ZSgpLFxuICAgICAgZmFpbDogKGVycjogYW55KSA9PiByZWplY3QoZXJyKVxuICAgIH0pO1xuICB9KTtcbn1cblxuZnVuY3Rpb24gaGFuZGxlQWxidW1FcnJvcihlcnI6IGFueSwgZG9uZT86IChvazogYm9vbGVhbikgPT4gdm9pZCk6IHZvaWQge1xuICBpZiAoZXJyICYmIGVyci5lcnJNc2cgJiYgZXJyLmVyck1zZy5pbmRleE9mKCdhdXRoJykgPiAtMSkge1xuICAgIHd4LnNob3dNb2RhbCh7XG4gICAgICB0aXRsZTogJ+mcgOimgeebuOWGjOadg+mZkCcsXG4gICAgICBjb250ZW50OiAn6K+35Zyo6K6+572u5Lit5byA5ZCv44CM5L+d5a2Y5Yiw55u45YaM44CN5p2D6ZmQJyxcbiAgICAgIGNvbmZpcm1UZXh0OiAn5Y676K6+572uJyxcbiAgICAgIHN1Y2Nlc3M6IChzOiBhbnkpID0+IHtcbiAgICAgICAgaWYgKHMuY29uZmlybSkgd3gub3BlblNldHRpbmcoKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSBlbHNlIHtcbiAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+S/neWtmOWksei0pScsIGljb246ICdub25lJyB9KTtcbiAgfVxuICBpZiAoZG9uZSkgZG9uZShmYWxzZSk7XG59XG5cbi8qKlxuICog5YiG6aG157uY5Yi25bm25L+d5a2Y5Yiw55u45YaM77ya5q+P6aG157qmIDMwIOivje+8jOWbuuWumiAyIOWAjemrmOa4he+8jOmHiuS5ieacgOWkmiAzIOihjOOAglxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZXhwb3J0SW1hZ2Uocm93czogVG9kYXlSb3dbXSwgY2FudmFzOiBhbnksIGRvbmU/OiAob2s6IGJvb2xlYW4pID0+IHZvaWQsIHRpdGxlID0gJ+S7iuaXpeWtpuS5oCDCtyDkuK3oi7Hlr7nnhacnLCBmb290VGV4dCA9ICfoi7Hor63ooaXor43ovr7kurogwrcg5LuK5pel5a2m5Lmg5oiQ5p6cJyk6IFByb21pc2U8dm9pZD4ge1xuICBpZiAoIWNhbnZhcyB8fCAhcm93cy5sZW5ndGgpIHtcbiAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogcm93cy5sZW5ndGggPyAn55S75biD5pyq5bCx57uqJyA6ICfku4rlpKnov5jmsqHmnInlrabkuaDorrDlvZUnLCBpY29uOiAnbm9uZScgfSk7XG4gICAgaWYgKGRvbmUpIGRvbmUoZmFsc2UpO1xuICAgIHJldHVybjtcbiAgfVxuXG4gIC8vIOavj+mhteihjOaVsO+8muaMieacgOWdj+aDheWGte+8iOWFqOmDqOS4pOihjO+8ieS8sOeul++8jOS/neivgSBjc3NIKkRQUiA8PSBNQVhfUElYXG4gIGNvbnN0IGF2Z1Jvd0ggPSA1MjtcbiAgY29uc3Qgcm93c1BlclBhZ2UgPSBNYXRoLm1heCgxMCwgTWF0aC5mbG9vcigoTUFYX1BJWCAvIERQUiAtIEhFQURFUl9IIC0gRk9PVEVSX0ggLSBQQUQgKiAyKSAvIGF2Z1Jvd0gpKTtcbiAgY29uc3QgcGFnZXM6IFRvZGF5Um93W11bXSA9IFtdO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IHJvd3MubGVuZ3RoOyBpICs9IHJvd3NQZXJQYWdlKSB7XG4gICAgcGFnZXMucHVzaChyb3dzLnNsaWNlKGksIGkgKyByb3dzUGVyUGFnZSkpO1xuICB9XG5cbiAgd3guc2hvd0xvYWRpbmcoeyB0aXRsZTogcGFnZXMubGVuZ3RoID4gMSA/IGDnlJ/miJAgMS8ke3BhZ2VzLmxlbmd0aH0g6aG1Li4uYCA6ICfnlJ/miJDkuK0uLi4nIH0pO1xuXG4gIHRyeSB7XG4gICAgbGV0IGhhZEF1dGhGYWlsID0gZmFsc2U7XG4gICAgZm9yIChsZXQgcCA9IDA7IHAgPCBwYWdlcy5sZW5ndGg7IHArKykge1xuICAgICAgY29uc3QgZmlsZVBhdGggPSBhd2FpdCByZW5kZXJQYWdlKGNhbnZhcywgcGFnZXNbcF0sIHAsIHBhZ2VzLmxlbmd0aCwgcm93cy5sZW5ndGgsIHRpdGxlLCBmb290VGV4dCk7XG4gICAgICB3eC5oaWRlTG9hZGluZygpO1xuICAgICAgdHJ5IHtcbiAgICAgICAgYXdhaXQgc2F2ZVRvQWxidW0oZmlsZVBhdGgpO1xuICAgICAgICBpZiAocGFnZXMubGVuZ3RoID4gMSkge1xuICAgICAgICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiBg56ysICR7cCArIDF9LyR7cGFnZXMubGVuZ3RofSDlvKDlt7Lkv53lrZhgLCBpY29uOiAnc3VjY2VzcycgfSk7XG4gICAgICAgICAgYXdhaXQgbmV3IFByb21pc2UociA9PiBzZXRUaW1lb3V0KHIsIDYwMCkpOyAvLyDnu5kgdG9hc3Qg55WZ5bGV56S65pe26Ze0XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICflt7Lkv53lrZjliLDnm7jlhownLCBpY29uOiAnc3VjY2VzcycgfSk7XG4gICAgICAgIH1cbiAgICAgIH0gY2F0Y2ggKGVycjogYW55KSB7XG4gICAgICAgIGlmIChlcnIgJiYgZXJyLmVyck1zZyAmJiBlcnIuZXJyTXNnLmluZGV4T2YoJ2F1dGgnKSA+IC0xKSB7XG4gICAgICAgICAgaGFkQXV0aEZhaWwgPSB0cnVlO1xuICAgICAgICAgIGJyZWFrO1xuICAgICAgICB9XG4gICAgICAgIHRocm93IGVycjtcbiAgICAgIH1cbiAgICAgIGlmIChwIDwgcGFnZXMubGVuZ3RoIC0gMSkge1xuICAgICAgICB3eC5zaG93TG9hZGluZyh7IHRpdGxlOiBg55Sf5oiQICR7cCArIDJ9LyR7cGFnZXMubGVuZ3RofSDpobUuLi5gIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICBpZiAoaGFkQXV0aEZhaWwpIHtcbiAgICAgIHd4LnNob3dNb2RhbCh7XG4gICAgICAgIHRpdGxlOiAn6ZyA6KaB55u45YaM5p2D6ZmQJyxcbiAgICAgICAgY29udGVudDogJ+ivt+WcqOiuvue9ruS4reW8gOWQr+OAjOS/neWtmOWIsOebuOWGjOOAjeadg+mZkCcsXG4gICAgICAgIGNvbmZpcm1UZXh0OiAn5Y676K6+572uJyxcbiAgICAgICAgc3VjY2VzczogKHM6IGFueSkgPT4ge1xuICAgICAgICAgIGlmIChzLmNvbmZpcm0pIHd4Lm9wZW5TZXR0aW5nKCk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuICAgIH1cbiAgICBpZiAoZG9uZSkgZG9uZSh0cnVlKTtcbiAgfSBjYXRjaCAoZXJyOiBhbnkpIHtcbiAgICB3eC5oaWRlTG9hZGluZygpO1xuICAgIGhhbmRsZUFsYnVtRXJyb3IoZXJyLCBkb25lKTtcbiAgfVxufVxuXG4vLyDilIDilIDilIAg5Y6f55SfIC54bHN4IOeUn+aIkO+8iOaXoOesrOS4ieaWueS+nei1lu+8ieKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgOKUgFxuLy8geGxzeCDmnKzotKjmmK8gemlwIOWuueWZqOWGheeahOiLpeW5siBYTUzjgILmraTlpITkvb/nlKjjgIzku4XlrZjlgqjkuI3ljovnvKnjgI3nmoQgemlw77yMXG4vLyDnuq/miYvlhpkgemlwIOWktCArIENSQzMy77yM6YG/5YWN5byV5YWlIFNoZWV0SlMg562J5aSn5L2T56ev5bqT44CCXG5cbmZ1bmN0aW9uIHV0ZjhCeXRlcyhzdHI6IHN0cmluZyk6IFVpbnQ4QXJyYXkge1xuICBjb25zdCBvdXQ6IG51bWJlcltdID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XG4gICAgbGV0IGMgPSBzdHIuY2hhckNvZGVBdChpKTtcbiAgICBpZiAoYyA+PSAweEQ4MDAgJiYgYyA8PSAweERCRkYgJiYgaSArIDEgPCBzdHIubGVuZ3RoKSB7XG4gICAgICBjb25zdCBjMiA9IHN0ci5jaGFyQ29kZUF0KGkgKyAxKTtcbiAgICAgIGlmIChjMiA+PSAweERDMDAgJiYgYzIgPD0gMHhERkZGKSB7XG4gICAgICAgIGMgPSAweDEwMDAwICsgKChjIC0gMHhEODAwKSA8PCAxMCkgKyAoYzIgLSAweERDMDApO1xuICAgICAgICBpKys7XG4gICAgICB9XG4gICAgfVxuICAgIGlmIChjIDwgMHg4MCkgb3V0LnB1c2goYyk7XG4gICAgZWxzZSBpZiAoYyA8IDB4ODAwKSBvdXQucHVzaCgweEMwIHwgKGMgPj4gNiksIDB4ODAgfCAoYyAmIDYzKSk7XG4gICAgZWxzZSBpZiAoYyA8IDB4MTAwMDApIG91dC5wdXNoKDB4RTAgfCAoYyA+PiAxMiksIDB4ODAgfCAoKGMgPj4gNikgJiA2MyksIDB4ODAgfCAoYyAmIDYzKSk7XG4gICAgZWxzZSBvdXQucHVzaCgweEYwIHwgKGMgPj4gMTgpLCAweDgwIHwgKChjID4+IDEyKSAmIDYzKSwgMHg4MCB8ICgoYyA+PiA2KSAmIDYzKSwgMHg4MCB8IChjICYgNjMpKTtcbiAgfVxuICByZXR1cm4gbmV3IFVpbnQ4QXJyYXkob3V0KTtcbn1cblxuY29uc3QgQ1JDX1RBQkxFID0gKCgpID0+IHtcbiAgY29uc3QgdCA9IG5ldyBVaW50MzJBcnJheSgyNTYpO1xuICBmb3IgKGxldCBuID0gMDsgbiA8IDI1NjsgbisrKSB7XG4gICAgbGV0IGMgPSBuO1xuICAgIGZvciAobGV0IGsgPSAwOyBrIDwgODsgaysrKSBjID0gYyAmIDEgPyAweEVEQjg4MzIwIF4gKGMgPj4+IDEpIDogYyA+Pj4gMTtcbiAgICB0W25dID0gYyA+Pj4gMDtcbiAgfVxuICByZXR1cm4gdDtcbn0pKCk7XG5cbmZ1bmN0aW9uIGNyYzMyKGJ5dGVzOiBVaW50OEFycmF5KTogbnVtYmVyIHtcbiAgbGV0IGMgPSAweEZGRkZGRkZGO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGJ5dGVzLmxlbmd0aDsgaSsrKSBjID0gQ1JDX1RBQkxFWyhjIF4gYnl0ZXNbaV0pICYgMHhGRl0gXiAoYyA+Pj4gOCk7XG4gIHJldHVybiAoYyBeIDB4RkZGRkZGRkYpID4+PiAwO1xufVxuXG5pbnRlcmZhY2UgWmlwRW50cnkgeyBuYW1lOiBzdHJpbmc7IGRhdGE6IFVpbnQ4QXJyYXk7IH1cblxuLyoqIOaJk+WMheS7heWtmOWCqO+8iOS4jeWOi+e8qe+8ieeahCB6aXDvvIzov5Tlm54gQXJyYXlCdWZmZXIgKi9cbmZ1bmN0aW9uIG1ha2VaaXAoZW50cmllczogWmlwRW50cnlbXSk6IEFycmF5QnVmZmVyIHtcbiAgY29uc3QgY2h1bmtzOiBVaW50OEFycmF5W10gPSBbXTtcbiAgY29uc3QgY2VudHJhbDogVWludDhBcnJheVtdID0gW107XG4gIGxldCBvZmZzZXQgPSAwO1xuICBsZXQgdG90YWwgPSAwO1xuXG4gIGNvbnN0IHUxNiA9ICh2OiBudW1iZXIpID0+IG5ldyBVaW50OEFycmF5KFt2ICYgMjU1LCAodiA+PiA4KSAmIDI1NV0pO1xuICBjb25zdCB1MzIgPSAodjogbnVtYmVyKSA9PiBuZXcgVWludDhBcnJheShbdiAmIDI1NSwgKHYgPj4gOCkgJiAyNTUsICh2ID4+IDE2KSAmIDI1NSwgKHYgPj4+IDI0KSAmIDI1NV0pO1xuXG4gIGZvciAoY29uc3QgZSBvZiBlbnRyaWVzKSB7XG4gICAgY29uc3QgbmFtZUIgPSB1dGY4Qnl0ZXMoZS5uYW1lKTtcbiAgICBjb25zdCBjcmMgPSBjcmMzMihlLmRhdGEpO1xuICAgIC8vIOacrOWcsOaWh+S7tuWktFxuICAgIGNvbnN0IGhlYWQgPSBuZXcgVWludDhBcnJheSgzMCArIG5hbWVCLmxlbmd0aCk7XG4gICAgaGVhZC5zZXQoWzB4NTAsIDB4NEIsIDB4MDMsIDB4MDRdLCAwKTsgICAvLyBQSy4uMy40XG4gICAgaGVhZC5zZXQodTE2KDIwKSwgNCk7ICAgICAgICAgICAgICAgICAgICAvLyDniYjmnKxcbiAgICBoZWFkLnNldCh1MTYoMHgwODAwKSwgNik7ICAgICAgICAgICAgICAgIC8vIFVURi04IOaWh+S7tuWQjVxuICAgIGhlYWQuc2V0KHUxNigwKSwgOCk7ICAgICAgICAgICAgICAgICAgICAgLy8g5a2Y5YKo77yI5LiN5Y6L57yp77yJXG4gICAgaGVhZC5zZXQodTE2KDApLCAxMCk7IGhlYWQuc2V0KHUxNigwKSwgMTIpOyAvLyDml7bpl7Qv5pel5pyfXG4gICAgaGVhZC5zZXQodTMyKGNyYyksIDE0KTtcbiAgICBoZWFkLnNldCh1MzIoZS5kYXRhLmxlbmd0aCksIDE4KTtcbiAgICBoZWFkLnNldCh1MzIoZS5kYXRhLmxlbmd0aCksIDIyKTtcbiAgICBoZWFkLnNldCh1MTYobmFtZUIubGVuZ3RoKSwgMjYpO1xuICAgIGhlYWQuc2V0KHUxNigwKSwgMjgpO1xuICAgIGhlYWQuc2V0KG5hbWVCLCAzMCk7XG4gICAgY2h1bmtzLnB1c2goaGVhZCwgZS5kYXRhKTtcbiAgICAvLyDkuK3lpK7nm67lvZXpoblcbiAgICBjb25zdCBjZW4gPSBuZXcgVWludDhBcnJheSg0NiArIG5hbWVCLmxlbmd0aCk7XG4gICAgY2VuLnNldChbMHg1MCwgMHg0QiwgMHgwMSwgMHgwMl0sIDApO1xuICAgIGNlbi5zZXQodTE2KDIwKSwgNCk7IGNlbi5zZXQodTE2KDIwKSwgNik7XG4gICAgY2VuLnNldCh1MTYoMHgwODAwKSwgOCk7XG4gICAgY2VuLnNldCh1MTYoMCksIDEwKTtcbiAgICBjZW4uc2V0KHUzMihjcmMpLCAxNik7XG4gICAgY2VuLnNldCh1MzIoZS5kYXRhLmxlbmd0aCksIDIwKTtcbiAgICBjZW4uc2V0KHUzMihlLmRhdGEubGVuZ3RoKSwgMjQpO1xuICAgIGNlbi5zZXQodTE2KG5hbWVCLmxlbmd0aCksIDI4KTtcbiAgICBjZW4uc2V0KHUzMihvZmZzZXQpLCA0Mik7XG4gICAgY2VuLnNldChuYW1lQiwgNDYpO1xuICAgIGNlbnRyYWwucHVzaChjZW4pO1xuICAgIG9mZnNldCArPSBoZWFkLmxlbmd0aCArIGUuZGF0YS5sZW5ndGg7XG4gICAgdG90YWwgKz0gaGVhZC5sZW5ndGggKyBlLmRhdGEubGVuZ3RoICsgY2VuLmxlbmd0aDtcbiAgfVxuXG4gIGNvbnN0IGNkU2l6ZSA9IGNlbnRyYWwucmVkdWNlKChzLCBjKSA9PiBzICsgYy5sZW5ndGgsIDApO1xuICBjb25zdCBlb2NkID0gbmV3IFVpbnQ4QXJyYXkoMjIpO1xuICBlb2NkLnNldChbMHg1MCwgMHg0QiwgMHgwNSwgMHgwNl0sIDApO1xuICBlb2NkLnNldCh1MTYoZW50cmllcy5sZW5ndGgpLCA4KTtcbiAgZW9jZC5zZXQodTE2KGVudHJpZXMubGVuZ3RoKSwgMTApO1xuICBlb2NkLnNldCh1MzIoY2RTaXplKSwgMTIpO1xuICBlb2NkLnNldCh1MzIob2Zmc2V0KSwgMTYpO1xuICBlb2NkLnNldCh1MTYoMCksIDIwKTtcblxuICBjb25zdCBhbGwgPSBuZXcgVWludDhBcnJheSh0b3RhbCArIGVvY2QubGVuZ3RoKTtcbiAgbGV0IHBvcyA9IDA7XG4gIGZvciAoY29uc3QgYyBvZiBbLi4uY2h1bmtzLCAuLi5jZW50cmFsLCBlb2NkXSkgeyBhbGwuc2V0KGMsIHBvcyk7IHBvcyArPSBjLmxlbmd0aDsgfVxuICByZXR1cm4gYWxsLmJ1ZmZlcjtcbn1cblxuZnVuY3Rpb24geG1sRXNjKHM6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBTdHJpbmcocykucmVwbGFjZSgvJi9nLCAnJmFtcDsnKS5yZXBsYWNlKC88L2csICcmbHQ7JykucmVwbGFjZSgvPi9nLCAnJmd0OycpXG4gICAgLnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKS5yZXBsYWNlKC9cXG4vZywgJyAnKTtcbn1cblxuLyoqIOeUn+aIkCAueGxzeCDlubbmi4notbflvq7kv6HliIbkuqvpnaLmnb/lj5HpgIHnu5nlpb3lj4sv5paH5Lu25Lyg6L6T5Yqp5omLICovXG5leHBvcnQgZnVuY3Rpb24gZXhwb3J0RXhjZWxGaWxlKHJvd3M6IFRvZGF5Um93W10sIG5hbWVQcmVmaXggPSAn5LuK5pel5Y2V6K+NJyk6IHZvaWQge1xuICBjb25zdCBjb2wgPSAocmVmOiBzdHJpbmcsIHY6IHN0cmluZykgPT5cbiAgICBgPGMgcj1cIiR7cmVmfVwiIHQ9XCJpbmxpbmVTdHJcIj48aXM+PHQgeG1sOnNwYWNlPVwicHJlc2VydmVcIj4ke3htbEVzYyh2KX08L3Q+PC9pcz48L2M+YDtcbiAgY29uc3Qgcm93WG1sID0gKGlkeDogbnVtYmVyLCBjZWxsczogc3RyaW5nW10pID0+IGA8cm93IHI9XCIke2lkeH1cIj4ke2NlbGxzLmpvaW4oJycpfTwvcm93PmA7XG5cbiAgY29uc3QgYm9keTogc3RyaW5nW10gPSBbcm93WG1sKDEsIFtjb2woJ0ExJywgJ+WNleivjScpLCBjb2woJ0IxJywgJ+mfs+aghycpLCBjb2woJ0MxJywgJ+mHiuS5iScpLCBjb2woJ0QxJywgJ+aOjOaPoeaDheWGtScpXSldO1xuICByb3dzLmZvckVhY2goKHIsIGkpID0+IHtcbiAgICBjb25zdCBuID0gaSArIDI7XG4gICAgYm9keS5wdXNoKHJvd1htbChuLCBbXG4gICAgICBjb2woYEEke259YCwgci53b3JkKSxcbiAgICAgIGNvbChgQiR7bn1gLCByLnBob25ldGljKSxcbiAgICAgIGNvbChgQyR7bn1gLCByLm1lYW5pbmcpLFxuICAgICAgY29sKGBEJHtufWAsIHIua25vd24gPyAn6K6k6K+GJyA6ICfkuI3orqTor4YnKVxuICAgIF0pKTtcbiAgfSk7XG5cbiAgY29uc3QgbGFzdFJvdyA9IHJvd3MubGVuZ3RoICsgMTtcbiAgY29uc3Qgc2hlZXRYbWwgPSBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIiBzdGFuZGFsb25lPVwieWVzXCI/PlxuPHdvcmtzaGVldCB4bWxucz1cImh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9zcHJlYWRzaGVldG1sLzIwMDYvbWFpblwiPjxkaW1lbnNpb24gcmVmPVwiQTE6RCR7bGFzdFJvd31cIi8+PHNoZWV0RGF0YT4ke2JvZHkuam9pbignJyl9PC9zaGVldERhdGE+PC93b3Jrc2hlZXQ+YDtcbiAgY29uc3Qgd29ya2Jvb2tYbWwgPSBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIiBzdGFuZGFsb25lPVwieWVzXCI/PlxuPHdvcmtib29rIHhtbG5zPVwiaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3NwcmVhZHNoZWV0bWwvMjAwNi9tYWluXCIgeG1sbnM6cj1cImh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHNcIj48c2hlZXRzPjxzaGVldCBuYW1lPVwi5LuK5pel5Y2V6K+NXCIgc2hlZXRJZD1cIjFcIiByOmlkPVwicklkMVwiLz48L3NoZWV0cz48L3dvcmtib29rPmA7XG4gIGNvbnN0IHdiUmVsc1htbCA9IGA8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiIHN0YW5kYWxvbmU9XCJ5ZXNcIj8+XG48UmVsYXRpb25zaGlwcyB4bWxucz1cImh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9wYWNrYWdlLzIwMDYvcmVsYXRpb25zaGlwc1wiPjxSZWxhdGlvbnNoaXAgSWQ9XCJySWQxXCIgVHlwZT1cImh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHMvd29ya3NoZWV0XCIgVGFyZ2V0PVwid29ya3NoZWV0cy9zaGVldDEueG1sXCIvPjxSZWxhdGlvbnNoaXAgSWQ9XCJySWQyXCIgVHlwZT1cImh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9vZmZpY2VEb2N1bWVudC8yMDA2L3JlbGF0aW9uc2hpcHMvc3R5bGVzXCIgVGFyZ2V0PVwic3R5bGVzLnhtbFwiLz48L1JlbGF0aW9uc2hpcHM+YDtcbiAgY29uc3Qgcm9vdFJlbHNYbWwgPSBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIiBzdGFuZGFsb25lPVwieWVzXCI/PlxuPFJlbGF0aW9uc2hpcHMgeG1sbnM9XCJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvcGFja2FnZS8yMDA2L3JlbGF0aW9uc2hpcHNcIj48UmVsYXRpb25zaGlwIElkPVwicklkMVwiIFR5cGU9XCJodHRwOi8vc2NoZW1hcy5vcGVueG1sZm9ybWF0cy5vcmcvb2ZmaWNlRG9jdW1lbnQvMjAwNi9yZWxhdGlvbnNoaXBzL29mZmljZURvY3VtZW50XCIgVGFyZ2V0PVwieGwvd29ya2Jvb2sueG1sXCIvPjwvUmVsYXRpb25zaGlwcz5gO1xuICBjb25zdCBjb250ZW50VHlwZXNYbWwgPSBgPD94bWwgdmVyc2lvbj1cIjEuMFwiIGVuY29kaW5nPVwiVVRGLThcIiBzdGFuZGFsb25lPVwieWVzXCI/PlxuPFR5cGVzIHhtbG5zPVwiaHR0cDovL3NjaGVtYXMub3BlbnhtbGZvcm1hdHMub3JnL3BhY2thZ2UvMjAwNi9jb250ZW50LXR5cGVzXCI+PERlZmF1bHQgRXh0ZW5zaW9uPVwicmVsc1wiIENvbnRlbnRUeXBlPVwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLXBhY2thZ2UucmVsYXRpb25zaGlwcyt4bWxcIi8+PERlZmF1bHQgRXh0ZW5zaW9uPVwieG1sXCIgQ29udGVudFR5cGU9XCJhcHBsaWNhdGlvbi94bWxcIi8+PE92ZXJyaWRlIFBhcnROYW1lPVwiL3hsL3dvcmtib29rLnhtbFwiIENvbnRlbnRUeXBlPVwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQubWFpbit4bWxcIi8+PE92ZXJyaWRlIFBhcnROYW1lPVwiL3hsL3dvcmtzaGVldHMvc2hlZXQxLnhtbFwiIENvbnRlbnRUeXBlPVwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwud29ya3NoZWV0K3htbFwiLz48T3ZlcnJpZGUgUGFydE5hbWU9XCIveGwvc3R5bGVzLnhtbFwiIENvbnRlbnRUeXBlPVwiYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc3R5bGVzK3htbFwiLz48L1R5cGVzPmA7XG4gIGNvbnN0IHN0eWxlc1htbCA9IGA8P3htbCB2ZXJzaW9uPVwiMS4wXCIgZW5jb2Rpbmc9XCJVVEYtOFwiIHN0YW5kYWxvbmU9XCJ5ZXNcIj8+XG48c3R5bGVTaGVldCB4bWxucz1cImh0dHA6Ly9zY2hlbWFzLm9wZW54bWxmb3JtYXRzLm9yZy9zcHJlYWRzaGVldG1sLzIwMDYvbWFpblwiPjxmb250cyBjb3VudD1cIjFcIj48Zm9udD48c3ogdmFsPVwiMTFcIi8+PG5hbWUgdmFsPVwiQ2FsaWJyaVwiLz48L2ZvbnQ+PC9mb250cz48ZmlsbHMgY291bnQ9XCIyXCI+PGZpbGw+PHBhdHRlcm5GaWxsIHBhdHRlcm5UeXBlPVwibm9uZVwiLz48L2ZpbGw+PGZpbGw+PHBhdHRlcm5GaWxsIHBhdHRlcm5UeXBlPVwiZ3JheTEyNVwiLz48L2ZpbGw+PC9maWxscz48Ym9yZGVycyBjb3VudD1cIjFcIj48Ym9yZGVyPjxsZWZ0Lz48cmlnaHQvPjx0b3AvPjxib3R0b20vPjxkaWFnb25hbC8+PC9ib3JkZXI+PC9ib3JkZXJzPjxjZWxsU3R5bGVYZnMgY291bnQ9XCIxXCI+PHhmIG51bUZtdElkPVwiMFwiIGZvbnRJZD1cIjBcIiBmaWxsSWQ9XCIwXCIgYm9yZGVySWQ9XCIwXCIvPjwvY2VsbFN0eWxlWGZzPjxjZWxsWGZzIGNvdW50PVwiMVwiPjx4ZiBudW1GbXRJZD1cIjBcIiBmb250SWQ9XCIwXCIgZmlsbElkPVwiMFwiIGJvcmRlcklkPVwiMFwiIHhmSWQ9XCIwXCIvPjwvY2VsbFhmcz48L3N0eWxlU2hlZXQ+YDtcblxuICBjb25zdCB6aXBCdWYgPSBtYWtlWmlwKFtcbiAgICB7IG5hbWU6ICdbQ29udGVudF9UeXBlc10ueG1sJywgZGF0YTogdXRmOEJ5dGVzKGNvbnRlbnRUeXBlc1htbCkgfSxcbiAgICB7IG5hbWU6ICdfcmVscy8ucmVscycsIGRhdGE6IHV0ZjhCeXRlcyhyb290UmVsc1htbCkgfSxcbiAgICB7IG5hbWU6ICd4bC93b3JrYm9vay54bWwnLCBkYXRhOiB1dGY4Qnl0ZXMod29ya2Jvb2tYbWwpIH0sXG4gICAgeyBuYW1lOiAneGwvX3JlbHMvd29ya2Jvb2sueG1sLnJlbHMnLCBkYXRhOiB1dGY4Qnl0ZXMod2JSZWxzWG1sKSB9LFxuICAgIHsgbmFtZTogJ3hsL3N0eWxlcy54bWwnLCBkYXRhOiB1dGY4Qnl0ZXMoc3R5bGVzWG1sKSB9LFxuICAgIHsgbmFtZTogJ3hsL3dvcmtzaGVldHMvc2hlZXQxLnhtbCcsIGRhdGE6IHV0ZjhCeXRlcyhzaGVldFhtbCkgfVxuICBdKTtcblxuICBjb25zdCBmaWxlTmFtZSA9IGAke25hbWVQcmVmaXh9XyR7Zm9ybWF0RGF0ZShuZXcgRGF0ZSgpKX0ueGxzeGA7XG4gIGNvbnN0IGZpbGVQYXRoID0gYCR7d3guZW52LlVTRVJfREFUQV9QQVRIfS8ke2ZpbGVOYW1lfWA7XG4gIGNvbnN0IGZzID0gd3guZ2V0RmlsZVN5c3RlbU1hbmFnZXIoKTtcbiAgdHJ5IHtcbiAgICAvLyDlkIzmraXlhpnvvJrkv53or4Egc2hhcmVGaWxlTWVzc2FnZSDku43lnKjnlKjmiLfngrnlh7vnmoTlkIzmraXpk77ot6/kuK1cbiAgICBmcy53cml0ZUZpbGVTeW5jKGZpbGVQYXRoLCB6aXBCdWYsICdiaW5hcnknKTtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHd4LnNob3dUb2FzdCh7IHRpdGxlOiAn5paH5Lu255Sf5oiQ5aSx6LSlJywgaWNvbjogJ25vbmUnIH0pO1xuICAgIHJldHVybjtcbiAgfVxuICB3eC5zaGFyZUZpbGVNZXNzYWdlKHtcbiAgICBmaWxlUGF0aCxcbiAgICBmaWxlTmFtZSxcbiAgICBzdWNjZXNzOiAoKSA9PiB7XG4gICAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogJ+W3suWPkemAge+8jOaJk+W8gOWNs+aYr0V4Y2Vs6KGo5qC8JywgaWNvbjogJ25vbmUnIH0pO1xuICAgIH0sXG4gICAgZmFpbDogKGVycjogYW55KSA9PiB7XG4gICAgICBpZiAoZXJyICYmIGVyci5lcnJNc2cgJiYgZXJyLmVyck1zZy5pbmRleE9mKCdjYW5jZWwnKSA9PT0gLTEpIHtcbiAgICAgICAgd3guc2hvd1RvYXN0KHsgdGl0bGU6ICfliIbkuqvlpLHotKXvvIgnICsgKGVyci5lcnJNc2cgfHwgJycpLnNsaWNlKC0zMCkgKyAn77yJJywgaWNvbjogJ25vbmUnIH0pO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbi8qKiDlvLnlh7rlr7zlh7rmlrnlvI/pgInmi6nvvIjlpI3liLbmlofmnKwgLyDkv53lrZjlm77niYcgLyDliIbkuqvooajmoLzmlofku7bvvIkgKi9cbmV4cG9ydCBpbnRlcmZhY2UgRXhwb3J0U2hlZXRPcHRzIHtcbiAgdGl0bGU/OiBzdHJpbmc7ICAgICAgIC8vIOWbvueJh+agh+mimFxuICBmb290VGV4dD86IHN0cmluZzsgICAgLy8g5Zu+54mH6aG16ISaXG4gIG5hbWVQcmVmaXg/OiBzdHJpbmc7ICAvLyBFeGNlbCDmlofku7blkI3liY3nvIBcbiAgZW1wdHlUaXA/OiBzdHJpbmc7ICAgIC8vIOaXoOaVsOaNruaPkOekulxuICBidWlsZFRzdlRpdGxlPzogc3RyaW5nOyAvLyDlpI3liLbmlofmnKzpppbooYzmoIfpophcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNob3dFeHBvcnRTaGVldChyb3dzOiBUb2RheVJvd1tdLCBnZXRDYW52YXM6ICgpID0+IFByb21pc2U8YW55Piwgb3B0cz86IEV4cG9ydFNoZWV0T3B0cyk6IHZvaWQge1xuICBpZiAocm93cy5sZW5ndGggPT09IDApIHtcbiAgICB3eC5zaG93VG9hc3QoeyB0aXRsZTogKG9wdHMgJiYgb3B0cy5lbXB0eVRpcCkgfHwgJ+S7iuWkqei/mOayoeacieWtpuS5oOiusOW9lScsIGljb246ICdub25lJyB9KTtcbiAgICByZXR1cm47XG4gIH1cbiAgd3guc2hvd0FjdGlvblNoZWV0KHtcbiAgICBpdGVtTGlzdDogWyflpI3liLbmlofmnKwnLCAn5L+d5a2Y5Zu+54mHJywgJ+WPkemAgSBFeGNlbCddLFxuICAgIHN1Y2Nlc3M6IGFzeW5jIChyZXM6IGFueSkgPT4ge1xuICAgICAgaWYgKHJlcy50YXBJbmRleCA9PT0gMCkge1xuICAgICAgICBleHBvcnRUZXh0KHJvd3MsIChvcHRzICYmIG9wdHMuYnVpbGRUc3ZUaXRsZSkgfHwgJ+S7iuaXpeWtpuS5oOWNleivjScpO1xuICAgICAgfSBlbHNlIGlmIChyZXMudGFwSW5kZXggPT09IDEpIHtcbiAgICAgICAgY29uc3QgY2FudmFzID0gYXdhaXQgZ2V0Q2FudmFzKCk7XG4gICAgICAgIGV4cG9ydEltYWdlKHJvd3MsIGNhbnZhcywgdW5kZWZpbmVkLCBvcHRzICYmIG9wdHMudGl0bGUsIG9wdHMgJiYgb3B0cy5mb290VGV4dCk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBleHBvcnRFeGNlbEZpbGUocm93cywgKG9wdHMgJiYgb3B0cy5uYW1lUHJlZml4KSB8fCAn5LuK5pel5Y2V6K+NJyk7XG4gICAgICB9XG4gICAgfVxuICB9KTtcbn1cblxuZnVuY3Rpb24gZm9ybWF0RGF0ZShkOiBEYXRlKTogc3RyaW5nIHtcbiAgY29uc3QgcCA9IChuOiBudW1iZXIpID0+IChuIDwgMTAgPyAnMCcgKyBuIDogJycgKyBuKTtcbiAgcmV0dXJuIGAke2QuZ2V0RnVsbFllYXIoKX0tJHtwKGQuZ2V0TW9udGgoKSArIDEpfS0ke3AoZC5nZXREYXRlKCkpfWA7XG59XG4iXX0=