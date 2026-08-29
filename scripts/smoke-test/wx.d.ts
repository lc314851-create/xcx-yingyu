// 供 tsc 单独编译 utils/store.ts 做纯逻辑烟测用的 wx 全局声明
declare const wx: any;
declare function getApp(): any;