/** StockAnalyzer 插件公共契约。主应用与 DevKit 通过这些版本字段协商兼容性。 */
export const PLUGIN_MANIFEST_SCHEMA_VERSION = 1 as const
export const PLUGIN_CHECKSUM_SCHEMA_VERSION = 1 as const
export const PLUGIN_SANDBOX_PROTOCOL_VERSION = 2 as const
export const STUDY_API_VERSION = '1.0.0'
export const STUDY_ENGINE_VERSION = '0.1.0'

export type StudyKind = 'indicator' | 'strategy' | 'library'
export type LocalizedPluginText = Readonly<Record<string, string>>
export type PluginInputValue = boolean | number | string | null
export type StudyDataField = 'open' | 'high' | 'low' | 'close' | 'volume'
export type StudyTimeframeMerge = 'confirmed' | 'developing'

export interface PluginAuthor {
  readonly name: string
  readonly url?: string
}

export interface PluginStudyContribution {
  readonly id: string
  readonly kind: StudyKind
  readonly export: string
}

export interface PluginPermissions {
  readonly marketData: {
    readonly symbols: 'chart' | 'declared' | 'none'
    readonly timeframes: 'chart' | 'declared'
  }
  readonly fundamentals: boolean
  readonly corporateActions: boolean
}

export interface PluginManifest {
  readonly schemaVersion: 1
  readonly id: string
  readonly version: string
  readonly apiVersion: string
  readonly engine: { readonly minimum: string }
  readonly name: LocalizedPluginText
  readonly description: LocalizedPluginText
  readonly author: PluginAuthor
  readonly license: string
  readonly icon: string
  readonly entry: string
  readonly contributes: { readonly studies: readonly PluginStudyContribution[] }
  readonly permissions: PluginPermissions
  readonly integrity: { readonly algorithm: 'sha256'; readonly manifest: 'checksums.json' }
}

export interface PluginChecksums {
  readonly schemaVersion: 1
  readonly algorithm: 'sha256'
  readonly files: Readonly<Record<string, string>>
}

export interface PluginSandboxBar {
  readonly time: number
  readonly open: number
  readonly high: number
  readonly low: number
  readonly close: number
  readonly volume?: number | null
}

export interface PluginStudyRequirementsInput {
  readonly chartSymbol: string
  readonly chartInterval: string
  readonly inputs: Readonly<Record<string, PluginInputValue>>
}

export interface StudyDataRequirement {
  readonly id: string
  readonly symbol: string
  readonly interval: string
  readonly fields: readonly StudyDataField[]
  readonly lookbackBars: number
  readonly merge?: StudyTimeframeMerge
}

export interface PluginRequestedData {
  readonly id: string
  readonly symbol: string
  readonly interval: string
  readonly merge: StudyTimeframeMerge
  readonly repaints: boolean
  readonly fields: Readonly<Partial<Record<StudyDataField, readonly (number | null)[]>>>
}

export interface PluginStudyExecutionInput {
  readonly bars: readonly PluginSandboxBar[]
  readonly inputs: Readonly<Record<string, PluginInputValue>>
  readonly requested?: Readonly<Record<string, PluginRequestedData>>
}

export interface PluginNumericOutput {
  readonly id: string
  readonly title?: string
  readonly type: 'line' | 'histogram'
  readonly values: readonly (number | null)[]
}

export interface PluginStudyExecutionResult {
  readonly outputs: readonly PluginNumericOutput[]
  readonly diagnostics?: readonly string[]
}

export interface PluginStudyDefinition {
  readonly kind: StudyKind
  readonly requirements?: (
    input: PluginStudyRequirementsInput,
  ) => readonly StudyDataRequirement[]
  readonly run: (input: PluginStudyExecutionInput) => PluginStudyExecutionResult
}

export type PluginExportMap = Readonly<Record<string, PluginStudyDefinition>>

export interface PluginFixture {
  readonly chartSymbol?: string
  readonly chartInterval?: string
  readonly bars: readonly PluginSandboxBar[]
  readonly inputs: Readonly<Record<string, PluginInputValue>>
}
