# SDK API

## `defineIndicator(definition)`

声明一个指标贡献项。`definition.run` 是同步函数，不得返回 Promise。

```ts
type PluginStudyExecutionInput = {
  bars: readonly {
    time: number
    open: number
    high: number
    low: number
    close: number
    volume?: number | null
  }[]
  inputs: Readonly<Record<string, boolean | number | string | null>>
  requested?: Readonly<Record<string, PluginRequestedData>>
}

type PluginStudyExecutionResult = {
  outputs: readonly {
    id: string
    title?: string
    type: 'line' | 'histogram'
    values: readonly (number | null)[]
  }[]
  diagnostics?: readonly string[]
}
```

约束：

- `outputs` 至少包含一个元素。
- 每个 `values` 长度必须等于 `bars.length`。
- 计算不可用时返回 `null`，不要使用 `NaN` 或 `Infinity`。
- 输出 ID 使用小写 kebab-case。
- 不要修改输入数组或输入对象。

## `definePlugin(exports)`

把导出表固定为 `globalThis.StockAnalyzerPlugin` 的内容。manifest 中的 `contributes.studies[].export` 必须与导出 key 完全一致。

```ts
globalThis.StockAnalyzerPlugin = definePlugin({
  main: defineIndicator({ run })
})
```

## 多周期 `requirements`

指标可同步声明高周期依赖。宿主会先检查权限、加载并对齐数据，再把等长序列放入 `requested`。

```ts
const main = defineIndicator({
  requirements: ({ chartSymbol }) => [{
    id: 'daily-close',
    symbol: chartSymbol,
    interval: '1d',
    fields: ['close'],
    lookbackBars: 250,
    merge: 'confirmed',
  }],
  run({ bars, requested }) {
    const daily = requested?.['daily-close']?.fields.close
    return { outputs: [{ id: 'daily-close', type: 'line', values: daily ?? bars.map(() => null) }] }
  },
})
```

多周期插件必须在 manifest 中声明 `permissions.marketData.timeframes: "declared"`。`developing` 会标记重绘风险，不能用于权威回测；当前 API 不提供 `lookahead`。

## 禁止能力

沙箱中不可用：网络、DOM、Storage、Worker、Node API、动态 import、eval、真实时间和随机数。SDK 不提供访问宿主对象的逃生通道。
