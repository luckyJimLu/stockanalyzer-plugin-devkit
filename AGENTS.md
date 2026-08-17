# AGENTS.md — StockAnalyzer Plugin DevKit

本文是面向 Codex、CI 代理和其他自动化开发工具的仓库约定。它只约束
`stockanalyzer-plugin-devkit`，不替代插件宿主 StockAnalyzer 的项目规范。

## 目标与当前范围

- 本仓库为 StockAnalyzer 提供 TypeScript 插件契约、SDK、校验核心和 CLI。
- 当前发布基线是 `indicator-only`：插件可以读取宿主传入的 OHLCV Bar，并返回
  `line` 或 `histogram` 序列。
- `strategy` 类型已保留在契约中，但在宿主提供逐 Bar、因果下单 API 前，DevKit
  不执行策略回测，也不能通过修改 manifest 绕过这个限制。
- 插件最终以确定性的 `.stockplugin` 归档导入 StockAnalyzer；本仓库不负责远程
  下载、自动安装或在线市场发布。

## 目录与依赖方向

```text
packages/contracts/  公共 manifest、Bar、Study 输入输出类型
packages/sdk/        defineIndicator、definePlugin 等作者 API
packages/core/       manifest、路径、兼容性、SHA-256 校验
packages/cli/        create/build/probe/test/release/validate
templates/           可复制的插件开发说明
examples/            可重复运行的完整示例（当前含 SMA）
docs/                API、manifest、安全、兼容性和 CLI 文档
```

依赖方向保持为 `contracts → sdk → core → cli`（CLI 可以组合前三者）。业务插件
只通过 `@stockanalyzer/plugin-sdk` 和 `@stockanalyzer/plugin-contracts` 的公开导出
开发，不得引用 `packages/*/src` 的内部路径。

## 开发环境与验证命令

要求 Node.js 20+、npm 10+。首次安装和完整验证：

```powershell
npm ci
npm run check
npm run plugin:test -- examples/sma
npm run plugin:release -- examples/sma
```

涉及归档或发布逻辑时，额外执行：

```powershell
npm run plugin:probe -- examples/sma
npm run plugin:validate -- <文件.stockplugin>
npm pack --workspaces --dry-run
```

提交前必须保证类型检查、Vitest、QuickJS probe 和示例 release 全部通过。不要把
`node_modules`、`dist`、`.stockplugin`、`.env`、真实行情数据或密钥提交到 Git。

## 插件实现约定

1. 先在插件目录的 `ALGORITHM.md` 写清楚目标、参数、预热期、缺失值、因果性、
   多周期行为和验收样例，再修改 `src/index.ts`。
2. `run()` 必须是确定性的纯计算：不得读取未来 Bar，不得依赖网络、DOM、Storage、
   Node API、动态 `import()`、随机数、真实时间或 Promise。
3. 每个 output 的 `values` 长度必须等于输入 Bar 数；无足够历史数据时使用 `null`，
   不要用未来数据补齐。
4. 修改参数、输出或 manifest 时，同步更新 `plugin.fixture.json`、插件 README、
   相关 `docs/` 和至少一个 Vitest/fixture 验收用例。
5. 使用 `npm run plugin:release -- <目录>` 生成归档；发布包采用白名单，只包含
   manifest、入口 bundle、README、LICENSE/NOTICE 和 `checksums.json`。

## AI/Codex 协作流程

可以让 Codex 根据自然语言设计指标，但必须采用“需求澄清 → 算法文档 → 代码
实现 → fixture 验证 → 沙箱发布”的顺序。推荐提示词：

```text
阅读本插件的 ALGORITHM.md、src/index.ts、plugin.fixture.json，以及仓库
docs/sdk-api.md。先列出目标、参数边界、预热期、缺失值、因果性和验收样例；
对所有未定义且会改变结果的事项提问，确认后再改 TypeScript。禁止未来数据、
网络、DOM、Storage、Node、动态 import、随机数和真实时间。完成后执行
npm run plugin:test -- <目录> 和 npm run plugin:release -- <目录>，返回归档路径、
SHA-256 和验证结果。
```

AI 生成的代码和人工代码使用同一套 QuickJS 沙箱、大小限制、完整性校验和宿主
人工导入确认，不得因为代码由 AI 生成而放宽权限。

## 文档、代码与 Git 约定

- 文档、注释、错误信息和提交信息默认使用中文；公开 API 名称保留英文。
- TypeScript 保持 strict、ESM 和显式类型；不要为了通过检查使用 `any` 或关闭
  tsconfig 规则。
- 新增公共契约时同步更新 `docs/sdk-api.md`、`docs/compatibility.md`，并在
  `packages/*/src/__tests__` 或对应 fixture 中补测试。
- 提交信息使用清晰的中文动词短句。提交前检查 `git diff --check` 和
  `git status --short`，只提交本次任务相关文件。
- 发布前确认 workspace 包版本、依赖版本和 `package-lock.json` 一致；不要手工
  修改生成的 `dist` 文件来替代源码修改。

## 安全边界

插件是不可信代码，所有运行都应经过 QuickJS-WASM Sandbox Worker。禁止引入网络
请求、宿主对象、任意 npm 包或文件系统能力。发现权限扩大、动态代码执行、未来
数据泄露或归档白名单绕过时，应先补安全测试并停止发布，不要仅在 README 中做
免责声明。
