# 兼容性与版本策略

当前基线：

| 项目 | 当前值 | 用途 |
|---|---:|---|
| manifest schema | 1 | manifest JSON 结构 |
| Study API | 1.0.0 | SDK 输入、输出和权限语义 |
| Engine | 0.1.0 | 宿主运行时最低版本 |
| Sandbox protocol | 2 | 宿主 Worker 内部通信 |
| DevKit/npm packages | 0.1.0 | 开发工具发布版本 |

插件 manifest 中的 `apiVersion: "^1.0.0"` 表示兼容同一 API 主版本。宿主只在自己的 API 版本不低于插件最低版本且主版本相同时接受插件。

DevKit 的 npm 包版本可以独立于 API 版本发布：

- 修复 CLI 或文档，不改变插件行为：patch。
- 增加兼容能力：minor。
- 删除或改变 SDK 契约：major，并同步提高 `apiVersion`。

主应用应依赖已发布的固定版本，不引用 DevKit 仓库的相对源码。每次 DevKit 发布前，CI 应构建示例 `.stockplugin` 并在主应用兼容性 fixture 中完成导入、probe 和 indicator 执行。

动态 strategy 仍未进入本兼容基线；逐 Bar 因果订单 API 完成后会单独发布新的能力和迁移说明。
