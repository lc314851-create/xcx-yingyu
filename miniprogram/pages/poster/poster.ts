// pages/poster/poster.ts
// 分享打卡海报：canvas 2D 绘制 → 保存相册
import { getStats } from '../../utils/store';

// 励志语列表
const MOTIVATIONS = [
  '每天进步一点点，坚持就是胜利！',
  '不积跬步，无以至千里。',
  '词汇量就是你的英语底气。',
  '今天多学一个词，明天少查一次词典。',
  '坚持学习的人，运气不会太差。'
];

Page({
  data: {
    canvasReady: false,
    posterPath: '',     // 生成的图片临时路径
    saving: false,
    // 展示用数据
    learnedToday: 0,
    streakDays: 0,
    totalWords: 0,
    rate: 0,
    motivation: '',
    dateStr: ''
  },

  // 从结果页传入正确率，否则从本地统计读取
  onLoad(opts: any) {
    const stats = getStats();
    const rate = opts && opts.rate ? parseInt(opts.rate) : (stats.learnedToday > 0 ? 100 : 0);
    const motivation = MOTIVATIONS[Math.floor(Math.random() * MOTIVATIONS.length)];
    const now = new Date();
    const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

    this.setData({
      learnedToday: stats.learnedToday,
      streakDays: stats.streakDays,
      totalWords: stats.totalWords,
      rate,
      motivation,
      dateStr
    });

    // 延迟绘制，等 canvas 渲染
    setTimeout(() => this.drawPoster(), 100);
  },

  drawPoster() {
    const query = wx.createSelectorQuery();
    query.select('#posterCanvas')
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

        // 海报尺寸（逻辑像素 300 x 420，约 3:4 竖版）
        const cssW = 300;
        const cssH = 450;
        canvas.width = cssW * dpr;
        canvas.height = cssH * dpr;
        ctx.scale(dpr, dpr);

        this.render(ctx, cssW, cssH, canvas);
      });
  },

  render(ctx: any, w: number, h: number, canvas: any) {
    // ── 背景：白色 ──
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);

    // ── 顶部渐变区域 ──
    const grad = ctx.createLinearGradient(0, 0, 0, 160);
    grad.addColorStop(0, '#2F5746');
    grad.addColorStop(1, '#5F8F7A');
    ctx.fillStyle = grad;
    // 圆角矩形
    this.roundRect(ctx, 15, 15, w - 30, 150, 16);
    ctx.fill();

    // ── 顶部标题 ──
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('英语补词达人', w / 2, 55);

    ctx.font = '13px sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillText(this.data.dateStr, w / 2, 80);

    ctx.font = 'bold 36px sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`已连续 ${this.data.streakDays} 天`, w / 2, 125);

    // ── 中部数据卡片 ──
    const cardY = 190;
    const cardH = 110;
    this.roundRect(ctx, 30, cardY, w - 60, cardH, 14);
    ctx.fillStyle = '#F7F3EA';
    ctx.fill();

    // 三列数据
    const colW = (w - 60) / 3;
    const dataItems = [
      { val: String(this.data.learnedToday), label: '今日学习' },
      { val: String(this.data.rate) + '%', label: '正确率' },
      { val: String(this.data.totalWords), label: '累计单词' }
    ];
    dataItems.forEach((item, i) => {
      const cx = 30 + colW * (i + 0.5);
      ctx.fillStyle = '#2F5746';
      ctx.font = 'bold 28px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.val, cx, cardY + 50);

      ctx.fillStyle = '#8A8F99';
      ctx.font = '12px sans-serif';
      ctx.fillText(item.label, cx, cardY + 75);
    });

    // 分隔线
    ctx.strokeStyle = '#E0E5EC';
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      const x = 30 + colW * i;
      ctx.beginPath();
      ctx.moveTo(x, cardY + 25);
      ctx.lineTo(x, cardY + cardH - 25);
      ctx.stroke();
    }

    // ── 励志语 ──
    ctx.fillStyle = '#1F2430';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    // 长文本折行
    const motto = this.data.motivation;
    ctx.fillText(motto.length > 14 ? motto.substring(0, 14) : motto, w / 2, 340);
    if (motto.length > 14) {
      ctx.fillText(motto.substring(14), w / 2, 362);
    }

    // ── 进度环（简化：圆弧 + 百分比） ──
    const ringX = w / 2;
    const ringY = 410;
    const ringR = 28;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, 0, Math.PI * 2);
    ctx.strokeStyle = '#EBE4D3';
    ctx.lineWidth = 6;
    ctx.stroke();

    const angle = (this.data.rate / 100) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(ringX, ringY, ringR, -Math.PI / 2, -Math.PI / 2 + angle);
    ctx.strokeStyle = '#2F5746';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.fillStyle = '#2F5746';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.data.rate + '%', ringX, ringY + 5);

    // ── 底部水印 ──
    ctx.fillStyle = '#B0B6C0';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('英语补词达人 · 免费英语学习工具', w / 2, h - 18);

    // ── 导出图片 ──
    wx.canvasToTempFilePath({
      canvas: canvas,
      success: (res: any) => {
        this.setData({ posterPath: res.tempFilePath, canvasReady: true });
      },
      fail: () => {
        wx.showToast({ title: '图片生成失败', icon: 'none' });
      }
    });
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

  // 保存到相册
  onSavePoster() {
    if (!this.data.posterPath) {
      wx.showToast({ title: '海报还在生成中...', icon: 'none' });
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
          // 拒绝授权，引导设置
          wx.showModal({
            title: '需要相册权限',
            content: '请在设置中开启「保存到相册」权限',
            confirmText: '去设置',
            success: (res) => {
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

  // 预览大图
  onPreviewPoster() {
    if (!this.data.posterPath) return;
    wx.previewImage({
      urls: [this.data.posterPath]
    });
  },

  onBack() {
    wx.navigateBack();
  },

  // 转发给好友
  onShareAppMessage() {
    return {
      title: '英语补词达人 · 生词海报',
      path: '/pages/poster/poster'
    };
  },

  // 分享到朋友圈（单页模式）
  onShareTimeline() {
    return {
      title: '英语补词达人 · 生词海报'
    };
  },
});
