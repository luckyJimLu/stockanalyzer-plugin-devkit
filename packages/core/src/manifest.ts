import {
  PLUGIN_MANIFEST_SCHEMA_VERSION,
  STUDY_API_VERSION,
  STUDY_ENGINE_VERSION,
  type LocalizedPluginText,
  type PluginManifest,
  type PluginPermissions,
  type PluginStudyContribution,
  type StudyKind,
} from '@stockanalyzer/plugin-contracts'

export const PLUGIN_ICON_NAMES = Object.freeze([
  'activity', 'badge-dollar-sign', 'chart-candlestick', 'chart-line',
  'chart-no-axes-combined', 'gauge', 'layers-3', 'trending-up',
] as const)

export const PLUGIN_PACKAGE_LIMITS = Object.freeze({
  maxArchiveBytes: 1024 * 1024,
  maxUncompressedBytes: 4 * 1024 * 1024,
  maxBundleBytes: 256 * 1024,
  maxFiles: 32,
})

export interface PluginCompatibilityTarget {
  readonly apiVersion: string
  readonly engineVersion: string
}

const PLUGIN_ID = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/
const STUDY_ID = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const EXPORT_NAME = /^[A-Za-z_$][\w$]*$/
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/
const LOCALE = /^[a-z]{2}(?:-[A-Z]{2})?$/

function record(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`插件 manifest ${field} 必须是对象`)
  }
  return value as Record<string, unknown>
}

function exactKeys(value: Record<string, unknown>, allowed: readonly string[], field: string): void {
  const extras = Object.keys(value).filter((key) => !allowed.includes(key))
  if (extras.length > 0) throw new Error(`插件 manifest ${field} 包含未知字段: ${extras.join(', ')}`)
}

function text(value: unknown, field: string, maximum = 160): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`插件 manifest ${field} 必须是非空字符串`)
  const normalized = value.trim()
  if (normalized.length > maximum) throw new Error(`插件 manifest ${field} 超过 ${maximum} 字符`)
  return normalized
}

function localized(value: unknown, field: string): LocalizedPluginText {
  const source = record(value, field)
  const result: Record<string, string> = {}
  for (const [locale, content] of Object.entries(source)) {
    if (!LOCALE.test(locale)) throw new Error(`插件 manifest ${field} 语言代码无效: ${locale}`)
    result[locale] = text(content, `${field}.${locale}`, field === 'description' ? 500 : 80)
  }
  if (Object.keys(result).length === 0) throw new Error(`插件 manifest ${field} 至少包含一种语言`)
  return Object.freeze(result)
}

function semver(value: unknown, field: string): string {
  const normalized = text(value, field, 40)
  if (!SEMVER.test(normalized)) throw new Error(`插件 manifest ${field} 必须是 x.y.z 版本`)
  return normalized
}

function versionParts(value: string): readonly [number, number, number] {
  const match = SEMVER.exec(value)
  if (!match) throw new Error(`无效语义版本: ${value}`)
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function compatible(range: unknown, target: string): string {
  const value = text(range, 'apiVersion', 40)
  if (!value.startsWith('^')) throw new Error('插件 manifest apiVersion 首期只支持 ^x.y.z')
  const minimum = semver(value.slice(1), 'apiVersion')
  const [minimumMajor, minimumMinor, minimumPatch] = versionParts(minimum)
  const [targetMajor, targetMinor, targetPatch] = versionParts(target)
  if (minimumMajor !== targetMajor
    || targetMinor < minimumMinor
    || (targetMinor === minimumMinor && targetPatch < minimumPatch)) {
    throw new Error(`插件 API ${value} 与宿主 ${target} 不兼容`)
  }
  return value
}

function contribution(value: unknown, ids: Set<string>, index: number): PluginStudyContribution {
  const source = record(value, `contributes.studies[${index}]`)
  exactKeys(source, ['id', 'kind', 'export'], `contributes.studies[${index}]`)
  const id = text(source.id, `contributes.studies[${index}].id`, 80)
  if (!STUDY_ID.test(id)) throw new Error(`插件 Study id 无效: ${id}`)
  if (ids.has(id)) throw new Error(`插件 Study id 重复: ${id}`)
  ids.add(id)
  if (!['indicator', 'strategy', 'library'].includes(String(source.kind))) {
    throw new Error(`插件 Study kind 不受支持: ${String(source.kind)}`)
  }
  const exportName = text(source.export, `contributes.studies[${index}].export`, 80)
  if (!EXPORT_NAME.test(exportName)) throw new Error(`插件 Study export 无效: ${exportName}`)
  return Object.freeze({ id, kind: source.kind as StudyKind, export: exportName })
}

function permissions(value: unknown): PluginPermissions {
  const source = record(value, 'permissions')
  exactKeys(source, ['marketData', 'fundamentals', 'corporateActions'], 'permissions')
  const marketData = record(source.marketData, 'permissions.marketData')
  exactKeys(marketData, ['symbols', 'timeframes'], 'permissions.marketData')
  if (!['chart', 'declared', 'none'].includes(String(marketData.symbols))) {
    throw new Error('插件 manifest permissions.marketData.symbols 无效')
  }
  if (!['chart', 'declared'].includes(String(marketData.timeframes))) {
    throw new Error('插件 manifest permissions.marketData.timeframes 无效')
  }
  if (typeof source.fundamentals !== 'boolean' || typeof source.corporateActions !== 'boolean') {
    throw new Error('插件 manifest 基础权限必须是布尔值')
  }
  return Object.freeze({
    marketData: Object.freeze({
      symbols: marketData.symbols as PluginPermissions['marketData']['symbols'],
      timeframes: marketData.timeframes as PluginPermissions['marketData']['timeframes'],
    }),
    fundamentals: source.fundamentals,
    corporateActions: source.corporateActions,
  })
}

export function normalizePluginPath(value: unknown, field = 'path'): string {
  const path = text(value, field, 240)
  if (path.includes('\\') || path.startsWith('/') || path.includes('\0')
    || path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`插件 ${field} 必须是安全的包内相对路径`)
  }
  return path
}

/** 严格解析 manifest，并检查 API 与引擎版本兼容性。 */
export function validatePluginManifest(
  value: unknown,
  target: PluginCompatibilityTarget = {
    apiVersion: STUDY_API_VERSION,
    engineVersion: STUDY_ENGINE_VERSION,
  },
): PluginManifest {
  const source = record(value, 'root')
  exactKeys(source, [
    'schemaVersion', 'id', 'version', 'apiVersion', 'engine', 'name', 'description',
    'author', 'license', 'icon', 'entry', 'contributes', 'permissions', 'integrity',
  ], 'root')
  if (source.schemaVersion !== PLUGIN_MANIFEST_SCHEMA_VERSION) throw new Error(`插件 manifest schemaVersion 不受支持: ${String(source.schemaVersion)}`)
  const id = text(source.id, 'id', 120)
  if (!PLUGIN_ID.test(id)) throw new Error(`插件 id 必须使用反向域名风格: ${id}`)
  const version = semver(source.version, 'version')
  const apiVersion = compatible(source.apiVersion, target.apiVersion)
  const engine = record(source.engine, 'engine')
  exactKeys(engine, ['minimum'], 'engine')
  const minimumEngine = semver(engine.minimum, 'engine.minimum')
  const [minimumMajor, minimumMinor, minimumPatch] = versionParts(minimumEngine)
  const [targetMajor, targetMinor, targetPatch] = versionParts(target.engineVersion)
  if (minimumMajor > targetMajor || (minimumMajor === targetMajor && (minimumMinor > targetMinor || (minimumMinor === targetMinor && minimumPatch > targetPatch)))) {
    throw new Error(`插件要求引擎 >=${minimumEngine}，当前为 ${target.engineVersion}`)
  }
  const author = record(source.author, 'author')
  exactKeys(author, ['name', 'url'], 'author')
  const authorName = text(author.name, 'author.name', 100)
  const authorUrl = author.url == null ? undefined : text(author.url, 'author.url', 240)
  if (authorUrl && !/^https:\/\//.test(authorUrl)) throw new Error('插件 author.url 只允许 https URL')
  const icon = text(source.icon, 'icon', 80)
  if (!(PLUGIN_ICON_NAMES as readonly string[]).includes(icon)) throw new Error(`插件 icon 不在宿主白名单: ${icon}`)
  const entry = normalizePluginPath(source.entry, 'entry')
  if (!entry.startsWith('dist/') || !entry.endsWith('.js')) throw new Error('插件 entry 必须是 dist/ 下的 JavaScript bundle')
  const contributes = record(source.contributes, 'contributes')
  exactKeys(contributes, ['studies'], 'contributes')
  if (!Array.isArray(contributes.studies) || contributes.studies.length === 0) throw new Error('插件 manifest 至少贡献一个 Study')
  const ids = new Set<string>()
  const studies = contributes.studies.map((item, index) => contribution(item, ids, index))
  const integrity = record(source.integrity, 'integrity')
  exactKeys(integrity, ['algorithm', 'manifest'], 'integrity')
  if (integrity.algorithm !== 'sha256' || integrity.manifest !== 'checksums.json') throw new Error('插件完整性必须使用 sha256/checksums.json')
  return Object.freeze({
    schemaVersion: 1,
    id,
    version,
    apiVersion,
    engine: Object.freeze({ minimum: minimumEngine }),
    name: localized(source.name, 'name'),
    description: localized(source.description, 'description'),
    author: Object.freeze({ name: authorName, ...(authorUrl ? { url: authorUrl } : {}) }),
    license: text(source.license, 'license', 80),
    icon,
    entry,
    contributes: Object.freeze({ studies: Object.freeze(studies) }),
    permissions: permissions(source.permissions),
    integrity: Object.freeze({ algorithm: 'sha256', manifest: 'checksums.json' }),
  })
}
