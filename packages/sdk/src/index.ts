import type {
  PluginExportMap,
  PluginStudyDefinition,
  PluginStudyExecutionInput,
  PluginStudyExecutionResult,
} from '@stockanalyzer/plugin-contracts'

export type {
  PluginExportMap,
  PluginInputValue,
  PluginNumericOutput,
  PluginRequestedData,
  PluginSandboxBar,
  PluginStudyExecutionInput,
  PluginStudyExecutionResult,
  PluginStudyRequirementsInput,
  StudyDataField,
  StudyDataRequirement,
  StudyTimeframeMerge,
} from '@stockanalyzer/plugin-contracts'

export type PluginIndicatorDefinition = Omit<PluginStudyDefinition, 'kind'> & {
  readonly kind: 'indicator'
}

/** 声明一个只使用当前及历史 Bar 的指标。 */
export function defineIndicator(
  definition: Omit<PluginIndicatorDefinition, 'kind'>,
): PluginIndicatorDefinition {
  return Object.freeze({ kind: 'indicator', ...definition })
}

/** 返回可赋给 globalThis.StockAnalyzerPlugin 的唯一导出表。 */
export function definePlugin(exports: PluginExportMap): PluginExportMap {
  if (!exports || typeof exports !== 'object' || Array.isArray(exports)) {
    throw new TypeError('插件导出必须是对象')
  }
  return Object.freeze({ ...exports })
}

export type IndicatorRunner = (
  input: PluginStudyExecutionInput,
) => PluginStudyExecutionResult

declare global {
  // eslint-disable-next-line no-var
  var StockAnalyzerPlugin: PluginExportMap | undefined
}
