// cloudfunctions/sendReminder/index.js
//
// ⚠️ 功能状态（2026-08-31）：学习提醒与每周周报均已下线（微信一次性订阅机制需重复授权，
//    体验繁琐；周报模板体验不佳）。config.json 触发器已清空，本云函数保留代码待恢复：
//    - dailyScan  + dailyReminder 触发器（每日 09:00）→ 恢复「学习提醒」
//    - weekly     + weeklyReport 触发器（周日 20:00）→ 恢复「每周周报」
//
// 订阅消息发送：
//   - action = 'daily'  （默认）：向指定 openid 发送当日学习提醒（旧链路，单用户）
//   - action = 'dailyScan'：扫描已订阅且当天未学习的用户批量发送（定时触发器调用）
//   - action = 'weekly' ：扫描全量 weeklySubscribed 用户，聚合本周学习数据发送周报
//
// ⚠️ 上线前必须：
//   1. 在微信公众平台「订阅消息」申请模板，替换下方两个模板 ID
//      （REMINDER_TEMPLATE_ID 对应每日提醒、WEEKLY_TEMPLATE_ID 对应每周周报）
//   2. 模板字段名以你申请到的为准（示例用了常见的 thing1/thing2/date3）
//   3. miniprogramState 从 'developer' 改为 'formal'（正式环境）
//   4. 部署后确认定时触发器已生效（config.json）
//
// 注意：一次性订阅消息每次授权只能推送一条；发送后该次授权即被消费，
// 用户再次授权才能收到下一条——这是微信订阅消息的固有机制。

const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

// ⚠️ 替换为你自己在微信公众平台创建的订阅消息模板 ID
const DAILY_TEMPLATE_ID = '_NbJeeBuWsnMnvNDljQ7fS4WZSepxC9THCQx4zeo3-A';
const WEEKLY_TEMPLATE_ID = 'HKofr7-lr1w8swoa-p7M-pyNRPMRXxbSuSSWrIjKl-I';

function pad(n) {
  return n < 10 ? '0' + n : '' + n;
}

function dateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function mondayStr(d) {
  const day = d.getDay() || 7; // 周日=0 转 7
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  return dateStr(monday);
}

// ─── 每日提醒（单用户，兼容旧调用） ───
async function sendDaily(openid, streak = 0) {
  try {
    const result = await cloud.openapi.subscribeMessage.send({
      touser: openid,
      templateId: DAILY_TEMPLATE_ID,
      // 签到提醒模板字段：
      //   thing1  = 活动名称（≤20字）
      //   thing9  = 温馨提醒（≤20字）
      //   time12  = 提醒时间
      //   number3 = 连续签到天数
      data: {
        thing1: { value: '英语补词达人' },
        thing9: { value: '今天的单词还没学哦' },
        time12: { value: dateStr(new Date()) },
        number3: { value: streak }
      },
      miniprogramState: 'developer' // 正式上线改 'formal'
    });
    return { success: true, result };
  } catch (err) {
    console.error('发送每日提醒失败:', err);
    return { success: false, error: err.errMsg || String(err) };
  }
}

// ─── 每日提醒全量扫描（定时触发器调用）：扫已订阅且当天未学习的用户 ───
// 依赖 syncUser 写入 users.reminderSubscribed=true（客户端订阅授权后同步）
async function sendDailyScan() {
  const db = cloud.database();
  const today = dateStr(new Date());

  // 扫描已订阅每日提醒的用户（先覆盖小体量，量大后加分页）
  const subscribed = await db
    .collection('users')
    .where({ reminderSubscribed: true })
    .limit(100)
    .get();
  const users = subscribed.data || [];

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of users) {
    if (!u._openid) continue;

    // 当天已学习不发（提醒语义是"还没学"）
    const history = u.history || {};
    if ((history[today] || 0) > 0) {
      skipped++;
      continue;
    }
    const stats = u.stats || {};
    if (stats.lastStudyDate === today) {
      skipped++;
      continue;
    }

    try {
      await sendDaily(u._openid, stats.streakDays || 0);
      sent++;
    } catch (err) {
      failed++;
      // 43101=一次性订阅额度已消费/未授权，属常态，只记录
      console.error('每日提醒发送失败', u._openid, err.errMsg || String(err));
    }
  }

  return { success: true, action: 'dailyScan', scanned: users.length, sent, skipped, failed };
}

// ─── 每周周报（全量扫描 + 聚合） ───
async function sendWeekly() {
  const db = cloud.database();
  const now = new Date();
  const monday = mondayStr(now);
  const today = dateStr(now);

  // 扫描已订阅周报的用户（最多 100，先覆盖小体量；量大后加分页）
  const subscribed = await db
    .collection('users')
    .where({ weeklySubscribed: true })
    .limit(100)
    .get();
  const users = subscribed.data || [];

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const u of users) {
    if (!u._openid) continue;

    // 本周学习量：history 聚合（本周一 ~ 今天）
    let weekCount = 0;
    const history = u.history || {};
    for (const day of Object.keys(history)) {
      if (day >= monday && day <= today) weekCount += history[day] || 0;
    }
    const stats = u.stats || {};
    const streak = stats.streakDays || 0;
    const total = stats.totalWords || 0;

    // 本周没学不发（省额度，也避免用户反感）
    if (weekCount <= 0) {
      skipped++;
      continue;
    }

    try {
      // 每日推壁纸更新通知模板字段：
      //   thing1 = 更新内容（≤20字）→ 本周学习量
      //   date2  = 更新时间 → 日期
      //   name3  = 作者（≤10字）→ 应用名
      //   thing4 = 来源（≤20字）→ 打卡+累计
      await cloud.openapi.subscribeMessage.send({
        touser: u._openid,
        templateId: WEEKLY_TEMPLATE_ID,
        data: {
          thing1: { value: `本周学了${weekCount}个单词` },
          date2: { value: today },
          name3: { value: '英语补词达人' },
          thing4: { value: `连续${streak}天·累计${total}词` }
        },
        miniprogramState: 'developer' // 正式上线改 'formal'
      });
      sent++;
    } catch (err) {
      failed++;
      // 43101=用户未授权/额度已用尽（一次性订阅的常态），只记录不中断
      console.error('周报发送失败', u._openid, err.errMsg || String(err));
    }
  }

  return { success: true, action: 'weekly', scanned: users.length, sent, skipped, failed };
}

exports.main = async (event) => {
  const action = (event && event.action) || '';

  // 定时触发器调用不带参数：有 openid 视为单用户每日提醒（旧链路），否则全量扫描
  if (action === 'daily' || (!action && event && event.openid)) {
    const { openid } = event;
    if (!openid) return { success: false, msg: '缺少 openid' };
    return sendDaily(openid);
  }

  if (action === 'dailyScan' || !action) {
    return sendDailyScan();
  }

  if (action === 'weekly') {
    return sendWeekly();
  }

  return { success: false, msg: 'unknown action' };
};