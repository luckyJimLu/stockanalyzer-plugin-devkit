# 贡献指南

## 本地验证

```powershell
npm ci
npm run check
npm run plugin:test -- examples/sma
npm run plugin:release -- examples/sma
```

新增 SDK 或契约时必须同步：

- `docs/` 中的 API 或兼容性说明。
- 至少一个可重复的 Vitest 用例。
- 一个不会访问未来数据的示例或 fixture。
- manifest schema、API version 或 sandbox protocol 的变更说明。

## 边界

DevKit 不接受网络请求、动态 import、宿主对象、Node API 或跳过 QuickJS 测试的插件能力。策略插件在逐 Bar 因果订单 API 发布前保持关闭。

## 提交

提交信息使用中文或中英混合的清晰动词短句。Pull Request 需要说明行为变化、兼容性影响和执行过的命令；不要把 `.stockplugin`、`node_modules`、`.env` 或真实行情密钥提交到仓库。
