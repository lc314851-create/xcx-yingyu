# 2026-08-27 功能升级变更说明

## 一、本次新增内容

### 1. 人教版教材同步词书（21 册）
- 数据来源：有道背单词官方词库（kajweb/dict 开源镜像），人教版教材分册
- 覆盖：小学三年级上 ~ 六年级下（8册）、初中七年级上 ~ 九年级全册（5册）、高中必修1~5 + 选修6~8（8册）
- 数据加工：转换为本项目 WordItem 格式，并用本地 ECDICT 补齐词频 frequency / 词频星级 star 字段，isHighFreq 按词频 ≤10000 判定
- 新增文件：`wordbooks_json/pep*.json` 共 21 个；`wordbooks_json/books_meta.json` 已追加对应条目

### 2. 今日复习计划页（SRS 可视化）
- 新增页面 `miniprogram/pages/plan/`：
  - 记忆盒子分布图（7 个盒子的词数分布、各盒复习间隔说明、掌握区高亮）
  - 今日到期词列表：每个词附「为什么今天复习它」的理由文案（含逾期天数提示）
  - 未来 7 天到期预测柱状图
  - 底部「开始今日复习」，通过 bc_review_mode 标志进入 words 页纯复习轮次
- `utils/store.ts` 新增 `getReviewPlan(bookId)` 聚合函数
- 「我的」页热力图上方新增入口卡片（显示今日到期摘要），onShow 实时刷新

## 一.5、教材版本修正（2026-08-27 第二次变更）

初版导入的 21 册词书为旧版（2012课标）教材词汇，已按现行教材全面修正：

| 学段 | 现状 | 数据源 |
|------|------|--------|
| 初中七上/七下/八上/八下 | **2024 新版教材**（与 2026 秋现行课本一致），共 676/574/549/603 词 | duoduo-words（含音标/音节/例句） |
| 高中必修一~三 + 选择性必修一~三 | **现行 2019 课标教材**，共 385~467 词/册 | cyforkk/pep-english-words |
| 小学三~六年级 8 册 | 2024 新版 PEP 尚无开源词表，暂以「PEP经典版」命名（如实标注 2012 课标），排在列表末尾 | 保留旧数据 |
| 九年级 | 2024 新版九年级 2026 秋才启用、暂无开源词表，标「PEP经典版」待更新 | 保留旧数据 |

> 已删除：旧体系高中必修四/五、选修六~八（教材已停用）。
> 待办：关注小学 2024 新版 PEP 与九年级新版词表的开源数据，可用后替换并去掉「经典版」后缀。7~8 年级数据已覆盖当前滚动换新的全部现行分册。

## 一.6、教材同步独立专区（2026-08-27 第三次变更）

- 新增页面 pages/textbook/：学段三分组（初中新版 / 高中现行 / 经典版），分册卡片带学习进度条，点选直接切词书去背
- 词书选择页不再列出教材分册（列表过滤 pep 前缀），顶部新增绿色「教材同步」通栏入口
- 挑战模式：为教材分册补齐区域命名（getAreaMeta），区域选择器仍只列考试词书
- 数据链路不变：词书仍从云存储 wordbooks/{bookId}.json 读取

## 二、上线前必须手动完成（重要）

1. **上传词书 JSON 到云存储**：把 `wordbooks_json/` 下所有 `pep*.json` 上传到云开发存储的 `wordbooks/` 目录（保持文件名不变），再上传更新后的 `books_meta.json`。可用项目内现成的 `scripts/import-to-cloudbase.js` 或开发者工具手动上传。
2. 上传后清掉小程序端缓存测试一次（或等 7 天缓存过期 / 改 CACHE_PREFIX）。

## 三、修改过的源码清单

| 文件 | 改动 |
|------|------|
| miniprogram/utils/wordService.ts | BOOK_META 追加 21 本人教版词书元数据 |
| miniprogram/pages/booklist/booklist.ts | 追加教材词书排序权重与青色系主题色（排在最前突出卖点） |
| miniprogram/pages/words/words.ts | FALLBACK_BOOKS 增加初中教材分册 |
| miniprogram/utils/store.ts | 追加 getReviewPlan 及相关类型 |
| miniprogram/pages/plan/* | 全新页面 |
| miniprogram/pages/mine/mine.{ts,wxml,wxss} | 复习计划入口卡片 + goPlan/loadPlanSummary，onShow 合并刷新 |
| miniprogram/app.json | 注册 pages/plan/plan |

> TypeScript 编译检查：本次改动文件 0 错误（仓库中历史遗留的其他文件的既有警告未处理）。

## 四、待办建议（后续迭代）

- 小学/高中教材词书可选做 TTS 发音包（tools/tts_gen.py 可复用）
- booklist 页可考虑按「教材同步 / 考试词汇」分组 Tab，避免列表过长
- 挑战模式 AREA_META 暂未为教材词书配置关卡区域（默认显示"未知区域"，可在 store.ts 的 AREA_META 中补充）
