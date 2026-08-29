// utils/wordReport.ts
// 词条纠错上报（经 reportWord 云函数写入 wordReports 集合）
// 与「词库共建人」激励：累计上报次数本地缓存、云端为准

export type ReportType = 'meaning' | 'phonetic' | 'example' | 'other';

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  meaning: '释义有误',
  phonetic: '音标有误',
  example: '例句/翻译有误',
  other: '其他问题'
};

export interface ReportResult {
  ok: boolean;
  already?: boolean; // 同一词同一类型已上报过
  total?: number;    // 该用户累计共建次数
}

// 已上报词集合（本地防重复）
const REPORTED_KEY = 'bc_reported_words';
const BUILDER_COUNT_KEY = 'bc_builder_count';

export function isWordReported(word: string): boolean {
  const set = wx.getStorageSync(REPORTED_KEY) || {};
  return !!set[word.toLowerCase()];
}

function markWordReported(word: string): void {
  const set = wx.getStorageSync(REPORTED_KEY) || {};
  set[word.toLowerCase()] = true;
  wx.setStorageSync(REPORTED_KEY, set);
}

// 共建次数（本地缓存展示；reportWord 成功后按云端 Total 刷新，取较大值）
export function getBuilderCount(): number {
  return wx.getStorageSync(BUILDER_COUNT_KEY) || 0;
}

export function reportWord(
  word: string,
  bookId: string,
  type: ReportType,
  description: string
): Promise<ReportResult> {
  if (!wx.cloud) return Promise.resolve({ ok: false });
  markWordReported(word); // 立即本地标记，防重复点击
  return wx.cloud
    .callFunction({
      name: 'reportWord',
      data: { word, bookId, type, description: description || '' }
    })
    .then((res: any) => {
      const r = (res && res.result) || { ok: false };
      if (r.ok && r.total) {
        const prev = getBuilderCount();
        if (r.total > prev) wx.setStorageSync(BUILDER_COUNT_KEY, r.total);
      }
      return r;
    })
    .catch((err: any) => {
      console.error('纠错上报失败', err);
      return { ok: false };
    });
}