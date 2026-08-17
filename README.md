# StockAnalyzer Plugin DevKit

StockAnalyzer 的官方指标插件开发工具包。开发者只需要 clone 本仓库，就可以创建 TypeScript 指标、在本地 QuickJS 沙箱中测试、生成确定性的 `.stockplugin`，再导入 StockAnalyzer。

当前版本是 indicator-only 公测版：插件可以读取宿主提供的当前及历史 OHLCV Bar，输出 line/histogram 数值序列；不能访问网络、DOM、Storage、Node、动态 import、真实时间或随机数。

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

## 推荐的 Codex 提示词

```text
阅读插件目录中的 ALGORITHM.md、src/index.ts 和本仓库 docs/sdk-api.md。
先补齐目标、参数、因果性、缺失值、预热期和验收样例；把所有会改变计算结果但未定义的事项列成问题。
确认规则后再修改 TypeScript。禁止未来数据、网络、DOM、Storage、随机数和真实时间。
最后执行 npm run plugin:test -- <插件目录> 和 npm run plugin:release -- <插件目录>，修复所有错误并返回生成文件路径。
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

## 开发工具包发布

`packages/*` 是 npm workspace。主应用应依赖带版本的 `@stockanalyzer/plugin-contracts`、`@stockanalyzer/plugin-sdk`、`@stockanalyzer/plugin-core` 和 `@stockanalyzer/plugin-cli`，不要复制源码或引用本仓库内部路径。版本策略见 [`docs/compatibility.md`](docs/compatibility.md)。

## 许可证

MIT，见 [`LICENSE`](LICENSE)。插件作者可以为自己的插件选择兼容的许可证，manifest 中应如实填写。
