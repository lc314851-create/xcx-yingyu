# 2026-08-28 三大竞争力改造变更说明

> 目标：免费个人主体小程序「英语补词达人」的留存 / 转化 / 内容可信度三块地基。
> 全部功能保持免费、纯学习包装、无游戏化字眼，符合个人主体合规边界。

## 一、SM-2 排程引擎（替代 Leitner 固定盒子，驱动全链路）

- **新调度模型**（`utils/store.ts`）：
  - 每词独立状态：`ease`（个人难度系数 1.3~2.5）、`rep`（连续答对次数）、`interval`（当前间隔天数）
  - 前 4 次连续答对固定 1/2/4/7 天（与「连续答对4次=已掌握」宣传一致）；第 5 次起间隔 = round(上间隔 × ease)，随掌握度逐步拉长（7→18→45→…天）
  - 答错：rep/interval 归零、立即可复习、ease -0.2（词更难了）；答对 ease +0.05
- **向后兼容**：`box` 保留为 rep 的展示映射（1~7），统计/排行榜/搜索/教材页等既有消费方**零改动**；旧 Leitner 数据在读写时自动回填 rep/interval/ease
- **云端同规**：`cloudfunctions/syncUser` 的 mergeWordProgress 同步改为「rep 优先、interval 次之、lastSeen 兜底」的深度合并，服务端/客户端策略一致
- **记忆体检接入真实模型**（`pages/memory`）：稳定度 S = interval / ln(1/0.9)（到期日保持率 0.9），不再是 box 固定映射；旧数据按 box 回填间隔后同模型计算
- **复习计划理由个性化**（`getReviewPlan`）：到期理由直接引用每个词的真实间隔（"本次间隔 45 天，比计划晚了 2 天"）
- 首页记忆方法文案同步更新

## 二、词汇量测试（转化 + 增长钩子）

- 新增页面 `pages/vocabtest/`：分层抽样 30 题（初中/高中/四级/六级/考研 各 6 题，只测本级新增词），四选一选释义，带发音与即时对错反馈
- **估值模型**（`utils/vocabEstimate.ts`，纯函数可测）：
  - m-估计 (答对数+1)/(题数+2) 防 0/100 假象
  - 等渗平滑：高层掌握率不高于低层
  - 词汇量 = Σ 层级增量 × 平滑掌握度
  - 推荐 = 掌握率第一个跌破 80% 的层（全过则考研）
- 结果页：词汇量估值 + 推荐词书一键切换 + 各层掌握度条形图 + 错词列表可一键收入生词本（来源标记为对应层词书）
- 分享文案："我的词汇量约 XXXX 词，来测测你的！"
- 入口：首页选词书弹窗顶部「不确定选哪本？先测词汇量 ›」+ 首页「更多玩法」首位

## 三、用户纠错上报（内容可信度 + 共建社区感）

- 新增云函数 `cloudfunctions/reportWord`：写入 `wordReports` 集合（每用户每词每类型去重防刷），users 文档累计 `wordReportCount`
- 客户端 `utils/wordReport.ts`：本地已上报词标记（防重复提交）、共建次数缓存
- 卡片背面新增「词条有误？报告一下」入口（上报后变「已上报纠错 ✓」），弹窗四类问题选择（释义/音标/例句/其他）+ 200 字补充说明
- 激励：「我的」页底部展示「词库共建人 · 已提交 N 次纠错反馈」徽章
- 处理流程：开发者去云开发控制台按 status='pending' 筛选处理，修完把词库 JSON 改对并标 status='fixed'

## 四、回归烟测（新增）

- `scripts/smoke-test/smoke_sm2.js`：SM-2 排程 25 项断言（含旧数据兼容、云端合并策略、到期理由）
- `scripts/smoke-test/smoke_vocab.js`：词汇量估值 7 项断言（含等渗平滑与推荐边界）
- `npm run smoke` 一键编译纯函数模块并跑全部断言

## 五、修改文件清单

| 文件 | 改动 |
|------|------|
| miniprogram/utils/store.ts | SM-2 排程 + 深度合并 + 个性化复习计划；box 兼容层 |
| miniprogram/utils/vocabEstimate.ts | 新增：词汇量估值纯函数 |
| miniprogram/utils/wordReport.ts | 新增：纠错上报客户端封装 |
| miniprogram/pages/vocabtest/* | 新增：词汇量测试页 |
| miniprogram/pages/memory/memory.{ts,wxml} | 稳定度按真实间隔推导 |
| miniprogram/pages/words/words.{ts,wxml,wxss} | 卡片背面上报入口 + 上报弹窗 |
| miniprogram/pages/mine/mine.{ts,wxml,wxss} | 共建人徽章 |
| miniprogram/pages/index/index.{ts,wxml,wxss} | 测试入口（更多玩法 + 选书弹窗） |
| miniprogram/app.json | 注册 vocabtest 页；nav 标题保持「英语补词达人」 |
| miniprogram/app.wxss | 设计系统注释品牌恢复 |
| miniprogram/pages/poster/poster.ts | 海报水印恢复「英语补词达人」 |
| cloudfunctions/reportWord/ | 新增云函数 |
| cloudfunctions/syncUser/index.js | 进度合并同步 SM-2 深度规则 |
| scripts/smoke-test/* | 新增回归烟测 |
| package.json | 新增 npm run smoke |

> TypeScript 编译检查：本次全部改动文件 0 错误（仓库中 21 处历史遗留警告未处理）。
> 待办：云函数需要开发者工具「上传并部署」reportWord；需要手动在微信公众平台确认词库数据更新流程。

## 六、P1 留存三件套（2026-08-28 第二次变更）

### 1. 复习计划上首页
- 首页新增「今日复习计划」主角卡（词书卡下方）：今日到期数大数字 + 今天/明天/后天到期预测 + 「开始今日复习」/「去学新词」按钮 + 「查看全部 ›」跳 plan 页
- 数据源为刚升级的 SM-2 `getReviewPlan`，onShow/换词书实时刷新；有到期词绿色主按钮，无到期词弱化为「去学新词」

### 2. 每周学习周报（订阅消息链路补全）
- `utils/store.ts`：新增 `WEEKLY_TEMPLATE_ID` 占位、`requestWeeklySubscribe()`、`isWeeklySubscribed()`、云端记录 `setWeeklySubscribedCloud()`
- `cloudfunctions/syncUser`：支持写入 `weeklySubscribed` 字段（sendReminder 周报扫描依据）
- `cloudfunctions/sendReminder` 升级：
  - `action='daily'` 兼容旧单用户每日提醒调用
  - `action='weekly'` 全量扫描 weeklySubscribed 用户 → 按 history 聚合本周学习词数 → 发送周报（本周 X 词 / 连续打卡 N 天·累计 Y 词）
  - 新增 `config.json` 定时触发器（每周日 20:00），自动批量发送
- mine 页「设置」新增「每周学习周报」入口（状态：已订阅/未订阅）
- ⚠️ **待人工操作**：① 公众平台申请周报模板替换 `WEEKLY_TEMPLATE_ID` ② 部署 sendReminder 并确认触发器 ③ 上线改 `miniprogramState='formal'`
- 机制说明：一次性订阅一次授权一条消息，周报发出后需再次授权才有下一条——学完单词的授权引导已覆盖此复用场景

### 3. 考频排序
- words 页新词队列按 ECDICT `frequency` 降序（常见词先学），高频词筛选模式（isHighFreq）保留不变