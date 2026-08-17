# Manifest 参考

最小指标 manifest：

```json
{
  "schemaVersion": 1,
  "id": "dev.example.sma",
  "version": "1.0.0",
  "apiVersion": "^1.0.0",
  "engine": { "minimum": "0.1.0" },
  "name": { "zh-CN": "简单移动平均" },
  "description": { "zh-CN": "示例指标" },
  "author": { "name": "Developer" },
  "license": "MIT",
  "icon": "chart-line",
  "entry": "dist/plugin.iife.js",
  "contributes": {
    "studies": [{ "id": "sma", "kind": "indicator", "export": "main" }]
  },
  "permissions": {
    "marketData": { "symbols": "chart", "timeframes": "chart" },
    "fundamentals": false,
    "corporateActions": false
  },
  "integrity": { "algorithm": "sha256", "manifest": "checksums.json" }
}
```

限制：

- `id` 使用反向域名风格，例如 `dev.example.sma`。
- `version` 使用三段语义化版本。
- `entry` 必须是 `dist/` 下的 JavaScript bundle。
- `icon` 必须使用宿主白名单名称。
- 同一 manifest 中 Study id 不得重复。
- 未知字段会被拒绝，避免开发者误以为存在未实现权限。

`apiVersion` 与 `engine.minimum` 是兼容性声明，不是 npm 包版本；升级规则见 [`compatibility.md`](compatibility.md)。
