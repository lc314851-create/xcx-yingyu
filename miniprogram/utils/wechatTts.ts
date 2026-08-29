// utils/wechatTts.ts
// 微信同声传译插件（WechatSI）封装 —— 腾讯官方 TTS，合规免费
// 插件提供 textToSpeech 接口，返回一个临时 mp3 URL（有效期有限），
// 因此调用后必须立即 downloadFile 持久化到本地再播放。
//
// 前置要求（二选一，缺一则本模块静默不可用）：
//   1. 小程序管理后台「设置-第三方设置-插件管理」添加"同声传译"插件
//   2. app.json 已注册 plugins.WechatSI

// 插件类型声明（无官方 @types，最小化声明）
declare function requirePlugin(name: string): any;

interface TextToSpeechResult {
  retcode: number;   // 0 = 成功
  filename: string;  // mp3 临时下载地址
}

let translator: any = null;
let pluginBroken = false; // 初始化/调用失败后标记，后续直接走降级链路

function getTranslator(): any {
  if (translator) return translator;
  if (pluginBroken) return null;
  try {
    translator = requirePlugin('WechatSI');
  } catch (e) {
    // app.json 未生效或后台未添加插件：标记坏路，避免每次播放都抛异常
    console.warn('[wechatTts] 同声传译插件不可用，TTS 走云端降级', e);
    pluginBroken = true;
    translator = null;
  }
  return translator;
}

/**
 * 用官方插件合成整句语音，下载为本地临时文件并回调
 * 返回 true 表示已发起合成（结果异步回调）；false 表示插件不可用
 */
export function synthesizeSentence(
  text: string,
  onReady: (tempFilePath: string) => void,
  onFail: (err?: any) => void
): boolean {
  const t = getTranslator();
  if (!t || !text) return false;

  try {
    t.textToSpeech({
      lang: 'en_US',
      tts: true,
      content: text.slice(0, 1000), // 插件对 content 长度有限制，防御性截断
      success: (res: TextToSpeechResult) => {
        if (!res || res.retcode !== 0 || !res.filename) {
          onFail(res);
          return;
        }
        wx.downloadFile({
          url: res.filename,
          timeout: 8000,
          success: (dl) => {
            if (dl.statusCode === 200 && dl.tempFilePath) {
              onReady(dl.tempFilePath);
            } else {
              onFail(dl);
            }
          },
          fail: onFail
        });
      },
      fail: onFail
    });
  } catch (e) {
    pluginBroken = true;
    return false;
  }
  return true;
}
