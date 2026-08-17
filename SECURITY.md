# 安全策略

请不要在公开 issue 中提交 API Key、插件包中的敏感数据或可利用的沙箱逃逸代码。安全问题请通过仓库维护者的私下渠道报告，并提供复现步骤、Node 版本、DevKit 版本和最小插件样例。

插件运行时的安全边界由 StockAnalyzer 宿主 QuickJS-WASM Sandbox Worker 最终执行；DevKit 的本地 probe 用于提前发现问题，但不能替代生产宿主的重新校验。
