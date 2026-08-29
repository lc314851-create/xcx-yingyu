// utils/vocabEstimate.ts
// 词汇量估值与词书推荐（纯函数，可在 Node 中直接回归测试）
//
// 模型（经典分层法）：
//   - 每层正确率 r_i 用 m-估计 (答对数+1)/(题数+2)，避免 0/100 假象
//   - 等渗平滑：高层（更难）掌握率不高于低层，eff_i = min(r_i, eff_{i-1})
//   - 词汇量估值 = Σ (本层累计量 - 上层累计量) × eff_i
//   - 推荐词书 = 掌握率第一个跌破 80% 的层次（全过则最后一层）

export interface VocabBandMeta {
  label: string;
  cumulative: number; // 覆盖到本层的目标累计词汇量
}

export interface VocabEstimateResult {
  estimate: number;        // 词汇量估值（取整）
  rates: number[];         // 等渗平滑后各层掌握度 0~1
  recommendIndex: number;  // 推荐词书下标
}

export function estimateVocab(
  bands: VocabBandMeta[],
  correctCounts: number[],
  questionsPerBand: number
): VocabEstimateResult {
  // m-估计平滑正确率
  const rates = correctCounts.map(c => (c + 1) / (questionsPerBand + 2));
  // 等渗平滑（高层不高于低层）
  const eff: number[] = [];
  let prev = rates[0];
  for (const r of rates) {
    prev = Math.min(r, prev);
    eff.push(prev);
  }
  // 累计词汇量估值
  let est = 0;
  let prevCum = 0;
  bands.forEach((b, i) => {
    est += (b.cumulative - prevCum) * eff[i];
    prevCum = b.cumulative;
  });
  // 推荐：掌握率第一个跌破 80% 的层次；全过则最后一层
  let recommendIndex = bands.length - 1;
  for (let i = 0; i < eff.length; i++) {
    if (eff[i] < 0.8) {
      recommendIndex = i;
      break;
    }
  }
  return { estimate: Math.round(est), rates: eff, recommendIndex };
}