"use strict";
// utils/vocabEstimate.ts
// 词汇量估值与词书推荐（纯函数，可在 Node 中直接回归测试）
//
// 模型（经典分层法）：
//   - 每层正确率 r_i 用 m-估计 (答对数+1)/(题数+2)，避免 0/100 假象
//   - 等渗平滑：高层（更难）掌握率不高于低层，eff_i = min(r_i, eff_{i-1})
//   - 词汇量估值 = Σ (本层累计量 - 上层累计量) × eff_i
//   - 推荐词书 = 掌握率第一个跌破 80% 的层次（全过则最后一层）
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateVocab = estimateVocab;
function estimateVocab(bands, correctCounts, questionsPerBand) {
    // m-估计平滑正确率
    var rates = correctCounts.map(function (c) { return (c + 1) / (questionsPerBand + 2); });
    // 等渗平滑（高层不高于低层）
    var eff = [];
    var prev = rates[0];
    for (var _i = 0, rates_1 = rates; _i < rates_1.length; _i++) {
        var r = rates_1[_i];
        prev = Math.min(r, prev);
        eff.push(prev);
    }
    // 累计词汇量估值
    var est = 0;
    var prevCum = 0;
    bands.forEach(function (b, i) {
        est += (b.cumulative - prevCum) * eff[i];
        prevCum = b.cumulative;
    });
    // 推荐：掌握率第一个跌破 80% 的层次；全过则最后一层
    var recommendIndex = bands.length - 1;
    for (var i = 0; i < eff.length; i++) {
        if (eff[i] < 0.8) {
            recommendIndex = i;
            break;
        }
    }
    return { estimate: Math.round(est), rates: eff, recommendIndex: recommendIndex };
}
