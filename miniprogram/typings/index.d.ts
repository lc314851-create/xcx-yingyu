// 全局类型声明（宽松版）
// 适用于未安装 miniprogram-api-typings 的环境；
// 后续想用完整 wx API 类型，可安装 miniprogram-api-typings 并调整 tsconfig

declare const wx: any;
declare function App(options: any): void;
declare function Page(options: any): void;
declare function Component(options: any): void;
declare function Behavior(options: any): any;
declare function getApp(): any;

interface IAppOption {
  globalData: {
    cloudEnv: string;
    userInfo?: any;
    openid: string;
  };
  onLaunch?: () => void;
}