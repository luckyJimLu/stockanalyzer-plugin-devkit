# StockAnalyzer Plugin DevKit

StockAnalyzer 的官方 TypeScript 插件开发工具包。它把“算法设计、脚本编写、
QuickJS 沙箱验证、确定性打包、人工导入”收敛成一条可重复的本地流程，适合开发
者、Codex 和 CI 共同使用。

仓库规范和自动化代理约定见 [`AGENTS.md`](AGENTS.md)。

当前版本为 `0.1.x` indicator-only 公测版：插件读取宿主传入的 OHLCV Bar，输出
`line`/`histogram` 序列。插件不能访问网络、DOM、Storage、Node、文件系统、动态
`import()`、随机数或真实时间。`strategy` 已预留协议类型，但在宿主提供逐 Bar
因果下单 API 前不会执行策略回测。

## 快速开始

环境要求：Node.js 20 或更高版本。

```powershell
git clone https://github.com/luckyJimLu/stockanalyzer-plugin-devkit.git
cd stockanalyzer-plugin-devkit
npm ci

# 目录必须尚不存在；插件 ID 和名称可省略
npm run plugin:create -- plugins/my-indicator dev.example.my-indicator "我的指标"

# 先阅读并完善 plugins/my-indicator/ALGORITHM.md，再让 Codex 修改 src/index.ts
npm run plugin:test -- plugins/my-indicator
npm run plugin:release -- plugins/my-indicator
```

默认生成的包位于插件目录同级：

```text
dev.example.my-indicator-1.0.0.stockplugin
```

在 StockAnalyzer 中打开 `/analysis`，进入“指标 → 管理本地插件”，选择该文件，核对权限后确认探测即可。

## 推荐工作流

1. 用 `plugin:create` 创建插件目录。
2. 在 `ALGORITHM.md` 写清目标、公式、参数边界、预热期、缺失值、因果性和验收样例。
3. 修改 `src/index.ts`，只使用 `@stockanalyzer/plugin-sdk` 的公开 API。
4. 在 `plugin.fixture.json` 增加确定性的 Bar、参数和边界案例。
5. 运行 `plugin:test`（自动构建并在 QuickJS 沙箱中 probe、执行 fixture）。
6. 运行 `plugin:release`，再把生成的 `.stockplugin` 导入 StockAnalyzer 验收。

AI 生成的代码和人工代码使用同一套沙箱、完整性校验、包大小限制和宿主导入确认，
不会获得额外权限。

## 推荐的 Codex 提示词

```text
阅读插件目录中的 ALGORITHM.md、src/index.ts、plugin.fixture.json 和本仓库 docs/sdk-api.md。
先列出目标、参数边界、预热期、缺失值、因果性和验收样例；把所有会改变计算结果但未定义的事项列成问题。
确认规则后再修改 TypeScript。禁止未来数据、网络、DOM、Storage、Node、动态 import、随机数和真实时间。
最后执行 npm run plugin:test -- <插件目录> 和 npm run plugin:release -- <插件目录>，修复所有错误并返回归档路径、SHA-256 和验证结果。
```

## 仓库结构

```text
packages/contracts/  公开 manifest、输入输出和多周期契约
packages/sdk/        defineIndicator、definePlugin
packages/core/       manifest、兼容性、路径和 checksums 校验
packages/cli/        create/build/test/probe/release/validate
templates/           模板说明
examples/             可运行示例指标
docs/                 API、安全、兼容性和 CLI 文档
```

## 命令

```powershell
npm run plugin:create -- <目录> [插件ID] [名称]
npm run plugin:build -- <目录>
npm run plugin:probe -- <目录>
npm run plugin:test -- <目录>
npm run plugin:release -- <目录> [输出.stockplugin]
npm run plugin:validate -- <文件.stockplugin>
```

`release` 会依次执行 TypeScript IIFE 构建、QuickJS probe、fixture 执行、发布白名单打包、SHA-256 生成和归档校验。

DevKit 本身的完整检查：

```powershell
npm ci
npm run check
npm run plugin:test -- examples/sma
npm run plugin:probe -- examples/sma
npm run plugin:release -- examples/sma
npm pack --workspaces --dry-run
```

## 插件公开 API

```ts
import { defineIndicator, definePlugin } from '@stockanalyzer/plugin-sdk'

const main = defineIndicator({
  run({ bars, inputs }) {
    const length = Math.max(1, Math.round(Number(inputs.length ?? 20)))
    const values = bars.map((_, index) => {
      if (index + 1 < length) return null
      return bars.slice(index - length + 1, index + 1)
        .reduce((sum, bar) => sum + bar.close, 0) / length
    })
    return { outputs: [{ id: 'sma', title: 'SMA', type: 'line', values }] }
  },
})

globalThis.StockAnalyzerPlugin = definePlugin({ main })
```

详细定义见 [`docs/sdk-api.md`](docs/sdk-api.md) 和 [`docs/manifest.md`](docs/manifest.md)。

## 重要边界

- `strategy` 可以在协议中保留，但当前 DevKit 不执行动态策略；等待宿主提供逐 Bar 因果下单 API。
- 参数目前通过 `plugin.fixture.json` 和 UI JSON 传入，不提供自动参数面板元数据。
- 插件包只发布 manifest、入口 bundle、README、LICENSE/NOTICE 和 checksums；源码、算法笔记、fixture 和 `.env` 不会被打入包。
- 插件导入仍要求用户人工确认，DevKit 不提供远程自动安装和在线市场。

`validate` 只校验 `.stockplugin` 的归档结构、manifest、SHA-256、入口大小和动态
`import()`，不会执行插件代码，适合 CI 或导入前检查。发布归档采用白名单，源码、
`ALGORITHM.md`、fixture、`.env` 和 `node_modules` 不会被打包。

## 开发工具包发布

`packages/*` 是 npm workspace。主应用应依赖带版本的 `@stockanalyzer/plugin-contracts`、`@stockanalyzer/plugin-sdk`、`@stockanalyzer/plugin-core` 和 `@stockanalyzer/plugin-cli`，不要复制源码或引用本仓库内部路径。版本策略见 [`docs/compatibility.md`](docs/compatibility.md)。

更多约定见 [`AGENTS.md`](AGENTS.md)、[`CONTRIBUTING.md`](CONTRIBUTING.md) 和
[`docs/security.md`](docs/security.md)。

## 许可证

MIT，见 [`LICENSE`](LICENSE)。插件作者可以为自己的插件选择兼容的许可证，manifest 中应如实填写。
