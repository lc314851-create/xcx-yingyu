# 英语补词达人 · 项目待办清单

> 最后更新：2026-08-23

---

## ✅ 阶段一：核心体验打磨（已完成）

- [x] 单词卡片翻面动画（CSS 3D rotateY 翻面，正面单词/背面释义+例句）
- [x] 单词发音功能（wx.createInnerAudioContext + 有道TTS，支持英音/美音切换）
- [x] 四选一选择题模式（给单词选释义，同词书随机出干扰项）
- [x] SRS 间隔记忆算法升级（Leitner 盒子系统，连续答对4次+跨度7天=已掌握）
- [x] 完成一轮结果页重做（全屏结果页替代 showModal，进度环+正确率+鼓励语）
- [x] 拼写模式（看释义打字拼单词，拼对绿色/拼错红色+显示正确答案）
- [x] 学习模式切换器（卡片/选择/拼写三模式切换，记忆用户偏好）

---

## ✅ 阶段二：挑战模式（差异化招牌功能）（已完成）

> ⚠️ 合规要点：个人主体无游戏类目，所有文案和交互必须围绕「学习答题」包装，不可出现「游戏/Boss/血条/暴击/伤害」等词

- [x] 挑战模式核心循环（进度条 + 出题 + 答对推进进度 + 连续答对奖励 + 通关判定）
- [x] 关卡系统（每个词书对应一个区域，每区域 10 关难度递增，记录已通关次到本地 + 云端）
- [x] 题型变化（每 5 题切换一次出题方式：四选一 / 拼写 / 看释义选词，增加多样性）
- [x] 通关奖励系统（解锁徽章 / 解锁新关卡，纯学习激励，无虚拟货币）
- [x] 挑战页 UI 与动画（进度条推进动画 / 通关结算页 / 连续答对鼓励特效）

---

## ✅ 阶段三：增长与留存（已完成）

- [x] 分享打卡海报（canvas 绘制，含今日学习量 / 连续天数 / 正确率 / 励志语，可保存相册 + 分享好友）
- [x] 学习日历热力图（最近 30 天学习情况，GitHub 风格贡献图，纯 CSS + 本地数据）
- [x] 订阅消息学习提醒（学完引导授权订阅，当天未学习推送提醒，wx.requestSubscribeMessage）
- [x] 学习排行榜（本周榜 + 总榜，云端 users 集合按 weeklyLearned / totalWords 排序）
- [x] 生词本 / 错题本（不认识的词自动收集，可单独学习 / 重做，支持手动添加移除）

---

## ✅ 阶段四：内容扩展（已完成）

- [x] 每日金句 / 英语谚语（首页今日金句卡片，中英对照 + 核心生词高亮，可一键加入生词本）
- [x] 名言警句填空练习（挖空句子关键词四选一填入，答完显示完整释义 + 作者背景）
- [x] 拼词拼写练习（给释义 + 字母池，依次点击拼出单词，无计时计分，纯练习模式）
- [ ] ~~完整消消乐拼词~~（暂缓：消除机制游戏感太强，个人主体审核风险高）

---

## ✅ 阶段五：技术优化与发布（已完成）

- [x] 词库改用云存储 JSON 文件下载（替代云函数分页拉取，秒开 + CDN 缓存）
- [x] ECDICT 更多字段导入（词根标签 / 同义反义 / 形近词 / 词频星级，用于排序和辅助记忆）
- [x] 单词搜索功能（任意页面搜索入口，输入单词查释义 / 音标 / 所属词书 / 是否已学）
- [x] booklist 页整合（统一词书选择入口，弹窗加进度条，词书按难度排序 + 颜色区分级别）
- [x] 合规自查与发布打磨（隐私声明更新 / 挑战玩法避开「游戏」字眼 / 无付费元素 / 提交审核）

---

## 📝 已知 Bug 修复记录

- [x] 发音功能：修复同一单词多次点击不播放问题（InnerAudioContext 实例竞态 + tempFilePath 缓存失效）
- [x] 首页统计：修复「已掌握」数字不更新问题（Leitner 算法统计改为基于 box 等级）
- [x] 记忆方法说明：加入首页学习小贴士卡片

---

## 🎨 四路线改造（2026-08-24）— 差异化：告别"标准背单词App"

### A 视觉重塑 ·「拾词手账」人格
- [x] 全局设计系统重写：米纸底 + 松绿墨 + 朱砂印 + 荧光黄标注，替换原"通用设计系统蓝"
- [x] 手账元素：和纸胶带（card-taped）、车线内框、横线便签单词卡、印章角标、虚线剪贴线
- [x] 衬线字体应用于英文单词与数字（Georgia/Songti SC）
- [x] 11 个页面 wxss 全量配色迁移 + 海报 canvas 配色同步
- [x] 视觉风格沿用「手账」设计系统，但小程序名称经确认**保持「英语补词达人」**（搜一搜关键词命中率高），2026-08-27 已把海报/样式注释中残留的「拾词手账」改回

### B 词根星系（招牌玩法）
- [x] 数据管线重建 scripts/enrich_wordbooks.py：词根剥离（前后缀递归+词根表149词）、形近词计算（编辑距离）、释义清洗（去 [计][医] 领域噪声）、占位例句清除、音标西里尔字符修复
- [x] 词根星系页（pages/galaxy）：中心词 + 双环轨道词族节点、同根词族/形近易混切换、点击漫游、随机漫游
- [x] 背单词页卡片背面「漫游词族 ›」入口

### C 情景剧本（场景化学习）
- [x] 6 个原创双语剧本（咖啡馆/机场/面试/看医生/网购退货/问路）
- [x] 情景剧本页（pages/scene）：剧本对白 → 关键词点拨 → 场景演练四选一 → 朱砂印章结算
- [x] 演练错题自动收入生词本（scene_{id} 来源标记）

### D 记忆体检（个人遗忘曲线）
- [x] 记忆体检页（pages/memory）：R=e^(-Δt/S) 个人保持率模型
- [x] 记忆稳定度评分、往后7天遗忘曲线预测、最可能忘记的词 Top10、易混词对（与词根星系联动跳转）

### E 登录与排行榜（2026-08-24）
- [x] 新增 syncUser 云函数：服务端合并统计+资料、自动去重、规避客户端权限读不到他人文档
- [x] 新增 getRanking 云函数：服务端读全量用户排序返回本周/总榜 Top50 + 我的排名
- [x] login 云函数返回用户资料（昵称/头像）
- [x] 我的页登录：微信头像 chooseAvatar + 昵称 input 弹窗，头像上传云存储存 fileID
- [x] 排行榜展示真实昵称与头像（无资料显示默认）
- [x] 统计同步/恢复/资料更新统一走 syncUser 云函数

### F 双语阅读（2026-08-24）
- [x] 10 篇分级双语短文（生活/暖心/成长/科普/职场/自然/人文/哲思）
- [x] 句子级中英对齐 + 三种显示模式（中英/英文/中文）+ 字号调节
- [x] 逐句朗读：百度→有道→Google TTS 多源降级，卡拉OK式当前句高亮、自动推进
- [x] 点任意单词查释义（关键词优先，否则查当前词书）+ 发音
- [x] 关键词一键收入生词本、读完标记
- [x] 首页/我的页入口
- [x] 朗读改云函数方案：tts 云函数服务端生成百度TTS音频→云存储缓存→fileID直播（免域名白名单，同句只生成一次）

## [2026-08-27] P0 · 单词进度云端同步（已完成）
- utils/store.ts：新增 mergeProgress / syncProgressToCloud / restoreProgressFromCloud / queueProgressSync
- recordWordProgress 学习动作自动触发 8s 去抖上云；App.onHide 立即落云
- app.ts 登录成功后静默恢复当前词书进度并合并本地
- cloudfunctions/syncUser：服务端按同规则合并（box 大者胜，box 同取 lastSeen 新者，累计取较大值），多文档去重回写

## [2026-08-27] P1 · 产品收敛（已完成）
- 首页宫格收敛为 4 格：词根星系 / 记忆体检 / 挑战模式 + 更多玩法（虚线弱化样式）
- 名言填空、拼词练习、学习排行、情景剧本、双语阅读 折叠进「更多玩法」ActionSheet，页面未删除
- 今日金句卡片内的「名言填空 ›」作为内容场景化入口保留
- 首页副标题改为「词根记忆 × 遗忘曲线 · 科学背单词」，强化品类搜索词
- 待办：小程序后台简介补充“背单词”关键词；长期押注词根星系+记忆体检做深

## [2026-08-27] P2 · TTS 合规整改（已完成）
- 新增 utils/wechatTts.ts：封装微信同声传译插件（WechatSI，官方免费），textToSpeech 合成后立即下载持久化
- 整句 TTS 主链路：本地缓存 → 官方插件 → tts 云函数（降级保留）→ onError；百度 gettts 直连兜底已移除（客户端）
- app.json 注册 WechatSI 插件
- ⚠️ 需人工操作：微信公众平台「设置-第三方设置-插件管理」添加“同声传译”插件，否则自动走云函数降级
- 单词发音仍走有道 dictvoice（业界通行做法，暂无官方单词级发音替代）；tts 云函数内的百度抓取仅作最后降级，建议后续换官方付费 TTS API


- app.json 已移除 WechatSI 插件注册（个人主体无法授权，避免编译报错）
- utils/wechatTts.ts 保留：企业认证后在 app.json 加回 plugins 即自动启用，代码零改动


## [2026-08-27] 单词音频预生成（脚本已就绪，待跑全量）
- tools/tts_gen.py：跨词书去重收集 14930 个唯一单词；md5(小写词) 命名与云存储 tts/{前2位}/ 规范一致
- 三级防重复：manifest 账本断点续跑 → 账本丢失可 --rebuild 扫本地重建 → 二级查重补记账
- 烟测 15/15 成功；--stats 查进度；全量预计 1.6 词/s 约 2.6 小时
- 产物 _output_tts/mp3（每词约 21KB，全量约 320MB）
- 待办：① 全量跑 python tools/tts_gen.py ② mp3 整夹拖入云存储 tts/ 下 ③ 编写 importTts 云函数按 manifest 写 tts_cache 索引并生成客户端 word→fileID 分片索引 ④ playAudio 接索引命中静态音频、未命中回落有道

## [2026-08-28] P3 · SM-2 排程引擎升级（已完成）
- 每词独立 ease/rep/interval：前 4 次答对固定 1/2/4/7 天，第 5 次起间隔 × ease 逐步拉长
- box 保留为 rep 展示映射，统计/排行榜/搜索/教材页零改动；旧 Leitner 数据自动回填
- syncUser 云端合并同步改「rep→interval→lastSeen」深度规则
- 记忆体检稳定度 S = interval/ln(1/0.9)，计划页到期理由引用真实间隔
- 烟测 scripts/smoke-test/smoke_sm2.js（25 断言），npm run smoke 一键跑

## [2026-08-28] P4 · 词汇量测试（已完成）
- pages/vocabtest：分层抽样 30 题 + m-估计/等渗平滑估值 + 推荐词书 + 错词收入生词本 + 分享
- 入口：首页选书弹窗顶部 + 更多玩法首位
- utils/vocabEstimate.ts 纯函数模型（smoke_vocab.js 7 断言）
- 待办：上线后统计「测试→切换词书」转化率，决定是否升级为启动首屏

## [2026-08-28] P5 · 用户纠错上报（已完成）
- cloudfunctions/reportWord：wordReports 集合去重写入 + users.wordReportCount 累计
- 卡片背面「词条有误？报告一下」→ 四类问题 + 200 字说明
- 「我的」页「词库共建人」徽章（提交 N 次）
- 待办：开发者定期到云开发控制台按 status='pending' 修词并标 fixed；修词后 bump 词库缓存版本（wordService CACHE_PREFIX）

## [2026-08-28] P6 · 留存三件套（已完成）
- **复习计划上首页**：今日到期数主角卡（含未来 3 天预测、开始复习/查看全部入口），复用 SM-2 getReviewPlan
- **每周学习周报**：mine 页「每周学习周报」订阅入口；syncUser 云端记录 weeklySubscribed；sendReminder 升级 weekly 全量聚合发送（本周学习量/连续打卡/累计词数）+ config.json 定时触发器（每周日 20:00）
- **考频排序**：背单词新词队列按 ECDICT 词频降序，常见词先学；高频词筛选模式保留
- ⚠️ 待人工：① sendReminder 部署到云开发并确认定时触发器生效 ② 正式上线把 sendReminder 的 miniprogramState 改 'formal'
- 模板 ID 已填入：签到提醒 `_NbJeeBuWsnMnvNDljQ7fS4WZSepxC9THCQx4zeo3-A`（每日提醒）、每日推壁纸更新通知 `HKofr7-lr1w8swoa-p7M-pyNRPMRXxbSuSSWrIjKl-I`（周报）；字段名已按模板详情页调整（thing1/thing9/time12/number3 + thing1/date2/name3/thing4）
## [2026-08-31] P8 · 学习提醒链路补全（代码已完成，待部署 ⚠️）

> 问题：检查发现每日提醒发送链路是断的——客户端从不调用 sendReminder（daily 无触发器）、订阅状态未上云、miniprogramState 未改 formal。

### 已补全的代码（需部署后生效）
- ✅ 客户端订阅授权结果同步云端：`store.ts` 新增 `setReminderSubscribedCloud`，words/mine 授权入口自动写入 `users.reminderSubscribed`
- ✅ `syncUser` 支持 `reminderSubscribed` 字段（新用户建档 + 老用户回写）
- ✅ `sendReminder` 新增 `action='dailyScan'`：扫描已订阅且**当天未学习**的用户发送提醒（连续天数取真实 streak）
- ✅ `sendReminder/config.json` 新增每日 09:00 定时触发器 `dailyReminder`
- ✅ 定时触发（无 action 参数）自动走 dailyScan；旧 `{action:'daily', openid}` 调用兼容

### ⚠️ 待人工部署（云开发控制台）
1. 部署 `sendReminder`（含新 config.json，确认两个定时触发器生效：dailyReminder 每日09:00 / weeklyReport 周日20:00）
2. 部署 `syncUser`
3. 公众平台核对两个订阅消息模板 ID 有效、字段名与代码一致（thing1/thing9/time12/number3）
4. 正式上线前：sendReminder 两处 `miniprogramState` 改 `'formal'`

### 机制说明（一次性订阅固有）
授权一次仅可推送一条；发送后额度即消耗，用户需下次学完再授权（words 结果页入口已覆盖）

## [2026-08-31] P9 · 每周学习周报下线（模板体验不佳，代码注释保留）

- mine 页入口注释（wxml `onToggleWeekly` 行注释）
- mine.ts `onToggleWeekly` / weeklyOn 状态注释；store.ts `requestWeeklySubscribe`/`isWeeklySubscribed`/`setWeeklySubscribed`/`setWeeklySubscribedCloud` 注释保留
- sendReminder config.json 移除 weeklyReport 触发器（云端 sendWeekly 代码保留，未被触发）
- 恢复条件：重新申请更合适的周报模板后，取消注释即可（同步恢复 config 触发器）

## [2026-08-31] P10 · 学习提醒下线（一次性订阅需重复授权，用户烦扰；代码注释保留）

- mine 页入口注释（`onToggleReminder` 行注释）；mine.ts 方法/字段/onShow 注释，import 移除
- words.ts 结果页入口 `onSubscribeReminder` 注释、结果页 wxml/wxss 入口注释、data/onShow/finishRound 的 reminderSubscribed 引用注释
- store.ts `requestReminderSubscribe`/`isReminderSubscribed`/`setReminderSubscribed`/`setReminderSubscribedCloud`/SUBSCRIBE_KEY/REMINDER_TEMPLATE_ID 注释保留
- sendReminder config.json 触发器已清空（dailyReminder + weeklyReport 均移除）；云函数代码保留
- **P8 部署清单作废**（sendReminder/syncUser 无需再部署；两处 miniprogramState 无需再改）
- 恢复条件：若未来申请到「长期订阅」类模板或产品上需要，取消注释 + 恢复 config 触发器即可
- 订阅消息模板 ID 保留在代码注释中（`_NbJeeBuWsnMnvNDljQ7fS4WZSepxC9THCQx4zeo3-A`）

## [2026-08-31] P7 · 功能收敛（竞争力聚焦）（已完成）

> 背景：18 页面功能过载，个人维护面失控；正面比拼大厂背单词 App 必输，唯一护城河是「人教课本同步」（最新版逐册词表）。

### 已下架 6 个外围功能（页面已删 + app.json 移除）
- ❌ 挑战模式（pages/challenge）：游戏化贴合规红线、维护最重
- ❌ 学习排行榜（pages/leaderboard）：冷启动空榜劝退
- ❌ 双语阅读（pages/story）：内容一次性，个人运营不动
- ❌ 情景剧本（pages/scene）：同上
- ❌ 名言填空（pages/fillblank）：玩具属性
- ❌ 拼词练习（pages/spelling）：与背单词页「拼写模式」重复
- 首页「更多玩法」收敛为：词汇量测试 + 搜单词
- 首页副标题改为「与课本同步 · 词根记忆 × 个人遗忘曲线」
- 类型错误基线 20 → 7（被删页面带走 13 个历史错误）

### 后续排期（聚焦护城河）
- [ ] **P0 教材同步补全**：小学 2024 新版 PEP + 九年级新版词表（TODO 2026-08-27 遗留，优先级提到最高）
- [ ] **P1 听写模式**：课本单词听音默写（学生/家长刚需场景，打透教材同步）
- [ ] **P2 主页叙事深化**：词书详情加「数据来源：2024版人教七上·676词·与现行课本一致」背书文案；简介/海报同步「课本同步」关键词
- [ ] **P3 记忆体检 + 复习计划**包装为「AI 个人复习计划」叙事（SM-2 真模型是卖点）
- [ ] **P4 增长链路**：词汇量测试上线后统计「测试 → 切换词书」转化率，决定是否升级启动首屏
- [ ] **P5 云函数清理**：getRanking 随 leaderboard 下线（无人调用即可删除）；sendReminder 部署 + 模板 + miniprogramState='formal' 上线 checklist


## [2026-09-05] P11 · 词性筛选（虚词/实词）+ 今日单词导出（代码已完成）

### 词性标注与筛选
- scripts/enrich_wordbooks.py：加载 ECDICT pos/collins 字段，新增 pos_tag_of()——虚词=介词/连词/代词/限定词/助动词/感叹词（权重≥50%）+ 人工补充表（be系动词/情态动词/do/the/not/it 等），词条写入 posTag: 'func' | 'content'
- 全部 8 本主词书重跑生成（cet4 虚词 69、junior 174 等）；修复 total 权重只累加虚词导致的误判 bug
- 新增高频核心词书 highfreq.json：跨书去重按 Collins 星级降序取 1800 词（虚词 131 / 实词 1669），books_meta.json 已追加
- types.ts WordItem 增加 posTag；StudyMode 扩为 all/highFreq/func/content
- store.ts getStudyMode/setStudyMode 扩宽；words.ts 过滤逻辑扩展（全部/高频/虚词/实词 + 空书提示）
- words 页顶部新增「范围：全部」按钮（ActionSheet 四选，激活态高亮 scope-on）；旧 toggleStudyMode 兼容转发
- booklist 注册 highfreq 卡片（新分组「高频核心」置顶，金棕色主题）
- wordService CACHE_PREFIX 升级 v3（旧缓存词条无 posTag，必须失效重拉）

### 今日单词导出（中英对照）
- utils/todayExport.ts：collectTodayRows() 聚合今日学习词（扫全部 bc_progress_* 按 lastSeen 自然日过滤）+ 词书释义映射；buildTsv() 制表符文本（粘贴进 WPS/Excel 自动成表）；exportImage() canvas 绘制手账风中英对照表（米纸底/松绿墨/朱砂√×，最多 40 词/页）保存相册
- store.ts 新增 getTodayLearnedWords()
- 入口：① words 结果页「导出今日单词表 ›」② mine 页「更多」宫格「导出今日单词」；两页各挂隐藏 2d canvas
- 烟测 npm run smoke 全部通过；tsc 改动文件零报错

### ⚠️ 待人工部署（云开发控制台）
1. 上传 wordbooks_json/*.json（含新增 highfreq.json 与 books_meta.json）到云存储 wordbooks/ 目录
2. 微信开发者工具真机验证：虚词筛选（切到 junior 词书虚词量最多）、导出文本粘贴 Excel、导出图片保存相册

### [2026-09-05] 经验沉淀 · 今日单词导出功能开发复盘

#### 1. xlsx 无依赖生成方案（可直接复用）
- todayExport.ts 内置手写 xlsx 生成器（~200 行，零第三方依赖）：
  `utf8Bytes`(UTF-8 手工编码) + `crc32` + `makeZip`(仅存储模式的 zip 容器) + OOXML 五件套
  ([Content_Types].xml / _rels/.rels / xl/workbook.xml / xl/_rels/workbook.xml.rels / xl/worksheets/sheet1.xml / xl/styles.xml)
- 复用场景：生词本导出、周报导出等，只需换 rows 数据源和 sheet 构建
- 字符串单元格用 inlineStr（`<c t="inlineStr"><is><t>`），免维护 sharedStrings
- 注意：写入用 `fs.writeFileSync`（同步），保证 `wx.shareFileMessage` 在用户点击的同步链路里，否则报"不在用户操作中"

#### 2. 踩过的坑
- **[Content_Types].xml 严格校验**：Override 必须在 </Types> 之内。手机微信预览宽容能放过去，
  桌面版 WPS 直接报"无法打开文件"——**不同端解析器宽容度差异大，必须在桌面 WPS 验证**
- **样式表不能省**：缺 xl/styles.xml 时部分解析器渲染空白表（打开正常但没内容）
- **worksheet 要带 `<dimension>`**：部分解析器依赖它定位有效区域
- 验证格式有效性：openpyxl 太宽容测不出结构性问题，要对每个 XML 部件做严格解析
  （本项目用 Node 跑真实 TS 函数生成 + Python zipfile/ElementTree 严格校验的组合）

#### 3. canvas 导出图片经验
- 微信 canvas 有像素上限，超限生成失败：用固定 dpr=2 + 按行数分页（每页 ~30 行），
  而不是压缩 dpr 换单张图（会发虚）
- 中文释义两行排版：行距 ≥20px，否则 11px 汉字上下叠字；换行前先剔除 [电]/[医] 类
  学科标签噪声和释义里的 \n（ECDICT 释义带换行符，canvas 不认但会打乱排版）

#### 4. 流程教训
- **"做不了"≠"不值得做"**：最初判断"xlsx 要引大库做不了"是错的，穷尽方案后再下结论；
  格式公开且结构简单（zip+XML）的场景，手写实现可能零依赖就够
- **改数据格式必须升缓存版本号**：词条新增字段（如 posTag）时旧缓存缺字段会导致筛选失效，
  CACHE_PREFIX v2→v3 强制失效重拉
- **开发者工具"清全部缓存"=恢复出厂**：会清掉选书记录和学习进度，别用它验证数据更新
  （v3 版本号会自动失效旧词书缓存，直接编译即可）；它只适合模拟全新用户

#### 5. 待办提醒
- [ ] 云存储 wordbooks/ 上传新版 JSON（posTag + highfreq.json + books_meta）
- [ ] 真机验证：虚词筛选、三种导出、桌面 WPS 打开 xlsx
- [ ] shareFileMessage 需真机验证（开发者工具不支持）
