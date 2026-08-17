# 安全模型

## 构建阶段

- esbuild 将源码和 SDK 合并为单文件 IIFE。
- 禁止动态 `import()`。
- bundle 不得超过 256 KiB，归档不得超过 1 MiB。
- 发布打包采用白名单，只包含 manifest、入口 bundle、README、LICENSE/NOTICE 和 checksums。
- `.env`、源码、fixture 和算法笔记不会进入归档。

## 运行阶段

宿主在 QuickJS-WASM Sandbox Worker 中执行 bundle，并在执行前清除网络、DOM、Storage、Worker、Node、WebAssembly、eval、随机数和真实时间。

执行结果必须是可序列化对象，输出序列长度必须与输入 Bar 数量一致，所有数值必须为有限数或 `null`。

## 权限

插件不能通过代码扩大权限。多周期数据只能通过 manifest 权限和同步 `requirements()` 声明；脚本不能自行请求其他 symbol 或 timeframe。

## 信任边界

本地 `.stockplugin` 默认不是签名包。用户必须手工导入并确认，主应用还会重新校验 checksums 和 QuickJS probe。DevKit 不支持远程脚本下载或自动安装。
