// pages/quotes/quotes.ts
// 金句集：每日金句的归档入口。克制版内容页：
//   - 今日句置顶标注「今日」
//   - 每句可一键复制（发朋友圈 / 写作文 / 当签名）
//   - 每句可生成「金句海报」：保存相册 / 分享图片给好友或朋友圈
import { quotes, getDailyQuote, Quote } from '../../data/quotes';

interface QuoteRow extends Quote {
  isToday: boolean;
}

Page({
  data: {
    list: [] as QuoteRow[],
    total: 0,
    // 海报
    showPoster: false,
    posterPath: '',
    posterEn: '',
    posterZh: '',
    posterAuthor: '',
    posterDate: '',
    saving: false
  },

  onLoad() {
    const today = getDailyQuote();
    const list: QuoteRow[] = quotes.map(q => ({
      ...q,
      isToday: q === today
    }));
    this.setData({ list, total: quotes.length });
  },

  // ─── 复制金句（含作者署名） ───
  onCopy(e: any) {
    const en = e.currentTarget.dataset.en as string;
    const author = e.currentTarget.dataset.author as string;
    const text = author ? `“${en}” —— ${author}` : `“${en}”`;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      }
    });
  },

  // ─── 金句海报 ───
  onPoster(e: any) {
    const en = e.currentTarget.dataset.en as string;
    const zh = e.currentTarget.dataset.zh as string;
    const author = e.currentTarget.dataset.author as string;
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    this.setData({ showPoster: true, posterPath: '', posterEn: en, posterZh: zh, posterAuthor: author, posterDate: dateStr }, () => {
      // 等弹层渲染出 canvas 节点后再绘制
      setTimeout(() => this.drawQuotePoster(), 120);
    });
  },

  drawQuotePoster() {
    const query = wx.createSelectorQuery();
    query.select('#quoteCanvas')
      .fields({ node: true, size: true })
      .exec((res: any) => {
        if (!res || !res[0] || !res[0].node) {
          console.error('canvas 节点获取失败');
          wx.showToast({ title: '海报生成失败', icon: 'none' });
          return;
        }
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio || 2;

        // 海报尺寸（逻辑像素 300 x 400，3:4 竖版）
        const cssW = 300;
        const cssH = 400;
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        ctx.scale(dpr, dpr);

        this.renderQu(ctx, cssW, cssH, canvas);
      });
  },

  renderQu(ctx: any, w: number, h: number, canvas: any) {
    // ── 背景：淡雅纸绿渐变 ──
    const bg = ctx.createLinearGradient(0, 0, w * 0.6, h);
    bg.addColorStop(0, '#F3F1E6');
    bg.addColorStop(0.6, '#E8EDE2');
    bg.addColorStop(1, '#DEE8DC');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // 氛围光斑：右上角一抹柔和松绿
    const glow = ctx.createRadialGradient(w - 40, 70, 10, w - 40, 70, 150);
    glow.addColorStop(0, 'rgba(143, 188, 156, 0.18)');
    glow.addColorStop(1, 'rgba(143, 188, 156, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    // ── 单条淡金细框 ──
    ctx.strokeStyle = 'rgba(176, 148, 88, 0.6)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, 16, 16, w - 32, h - 32, 10);
    ctx.stroke();

    // ── 装饰引号（松绿半透明） ──
    ctx.fillStyle = 'rgba(47, 87, 70, 0.22)';
    ctx.font = 'bold 80px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('“', 52, 104);

    // ── 金句内容：垂直居中排版 ──

    const cardX = 34;
    const cardY = 44;
    const cardW = w - 68;
    const cardH = 248;

    // 关键：测量前先设置字体，否则 wrapWords 按默认小字号测量导致实际渲染溢出
    ctx.font = 'bold 26px Georgia, serif';
    const enLines = this.wrapWords(ctx, this.data.posterEn, cardW).slice(0, 3);
    ctx.font = '14px sans-serif';
    const zhLines = this.wrapText(ctx, this.data.posterZh, cardW).slice(0, 2);
    const enLineH = 36;
    const zhLineH = 22;
    const gap = 16;
    const authorH = this.data.posterAuthor ? 22 : 0;
    const totalH = enLines.length * enLineH + gap + zhLines.length * zhLineH + authorH;

    let y = cardY + (cardH - totalH) / 2 + enLineH * 0.8;

    // 英文（衬线大字 · 松墨）
    ctx.fillStyle = '#24473A';
    ctx.font = 'bold 26px Georgia, serif';
    enLines.forEach((line: string, i: number) => {
      ctx.fillText(line, w / 2, y + i * enLineH);
    });
    y += enLines.length * enLineH + gap;

    // 中文（灰绿）
    ctx.fillStyle = '#5C6B5E';
    ctx.font = '14px sans-serif';
    zhLines.forEach((line: string, i: number) => {
      ctx.fillText(line, w / 2, y + i * zhLineH);
    });
    y += zhLines.length * zhLineH;

    // 作者（灰金小字）
    if (this.data.posterAuthor) {
      ctx.fillStyle = '#8A7C4E';
      ctx.font = 'italic 12px Georgia, serif';
      ctx.fillText('—— ' + this.data.posterAuthor, w / 2, y + 20);
    }

    // ── 金色分隔饰线（中间菱形） ──
    const dy = 322;
    ctx.strokeStyle = 'rgba(47, 87, 70, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, dy);
    ctx.lineTo(w / 2 - 12, dy);
    ctx.moveTo(w / 2 + 12, dy);
    ctx.lineTo(w - 70, dy);
    ctx.stroke();
    ctx.fillStyle = '#8A7C4E';
    ctx.save();
    ctx.translate(w / 2, dy);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-3.5, -3.5, 7, 7);
    ctx.restore();

    // ── 底部信息 ──
    ctx.fillStyle = '#2F5746';
    ctx.font = 'bold 13px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.data.posterDate, w / 2, 350);

    ctx.fillStyle = 'rgba(47, 87, 70, 0.45)';
    ctx.font = '10px sans-serif';
    ctx.fillText('英语补词达人 · 每天一句，补回落下的词', w / 2, h - 18);

    // ── 导出 ──
    wx.canvasToTempFilePath({
      canvas: canvas,
      success: (res: any) => {
        this.setData({ posterPath: res.tempFilePath });
      },
      fail: () => {
        wx.showToast({ title: '图片生成失败', icon: 'none' });
      }
    });
  },

  // 英文折行：按单词折，不把词切开
  wrapWords(ctx: any, text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const test = line ? line + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  },

  // 文本折行（按字符宽度，中文用）
  wrapText(ctx: any, text: string, maxWidth: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const ch of text) {
      const test = line + ch;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = ch;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  },

  // 圆角矩形辅助
  roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  onClosePoster() {
    this.setData({ showPoster: false, posterPath: '' });
  },

  // 保存金句海报到相册
  onSavePoster() {
    if (!this.data.posterPath) {
      wx.showToast({ title: '海报正在生成，马上就好', icon: 'none' });
      return;
    }
    if (this.data.saving) return;
    this.setData({ saving: true });
    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterPath,
      success: () => {
        wx.showToast({ title: '已保存到相册', icon: 'success' });
      },
      fail: (err: any) => {
        if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启「保存到相册」权限',
            confirmText: '去设置',
            success: (res: any) => {
              if (res.confirm) wx.openSetting();
            }
          });
        } else {
          wx.showToast({ title: '保存失败', icon: 'none' });
        }
      },
      complete: () => {
        this.setData({ saving: false });
      }
    });
  },

  // 分享金句海报图片（原生分享菜单：好友 / 朋友圈）
  onSharePoster() {
    if (!this.data.posterPath) {
      wx.showToast({ title: '海报正在生成，马上就好', icon: 'none' });
      return;
    }
    if (wx.showShareImageMenu) {
      wx.showShareImageMenu({ path: this.data.posterPath });
    } else {
      // 低版本兜底：提示保存后手动发送
      wx.showModal({
        title: '分享金句',
        content: '请先保存到相册，再从相册分享给好友或朋友圈',
        showCancel: false,
        confirmText: '知道了'
      });
    }
  },

  // 小程序卡片转发（右上角菜单）
  onShareAppMessage() {
    const en = this.data.list && this.data.list.length > 0 ? this.data.list[0].en : '每日金句';
    return {
      title: `“${en}” —— 英语补词达人每日金句`,
      path: '/pages/quotes/quotes'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '每日金句 · 补回落下的词'
    };
  },
});