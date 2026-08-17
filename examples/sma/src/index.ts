import { defineIndicator, definePlugin } from '@stockanalyzer/plugin-sdk'

const main = defineIndicator({
  run({ bars, inputs }) {
    const length = Math.max(1, Math.min(500, Math.round(Number(inputs.length ?? 20))))
    const values = bars.map((_, index) => {
      if (index + 1 < length) return null
      let sum = 0
      for (let offset = 0; offset < length; offset += 1) sum += bars[index - offset].close
      return sum / length
    })
    return { outputs: [{ id: 'sma', title: 'SMA', type: 'line', values }] }
  },
})

globalThis.StockAnalyzerPlugin = definePlugin({ main })
