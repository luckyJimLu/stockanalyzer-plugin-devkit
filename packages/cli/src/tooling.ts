import { createRequire } from 'node:module'
import {
  mkdir,
  readFile,
  stat,
  writeFile,
} from 'node:fs/promises'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { strFromU8, strToU8, unzipSync, zipSync, type Zippable } from 'fflate'
import { build } from 'esbuild'
import * as RELEASE_SYNC_MODULE from '@jitl/quickjs-wasmfile-release-sync'
import {
  newQuickJSWASMModuleFromVariant,
  shouldInterruptAfterDeadline,
  type QuickJSContext,
} from 'quickjs-emscripten-core'
import {
  PLUGIN_MANIFEST_SCHEMA_VERSION,
  STUDY_API_VERSION,
  STUDY_ENGINE_VERSION,
  type PluginFixture,
  type PluginManifest,
  type PluginSandboxBar,
  type PluginStudyExecutionInput,
  type PluginStudyExecutionResult,
} from '@stockanalyzer/plugin-contracts'
import {
  PLUGIN_PACKAGE_LIMITS,
  normalizePluginPath,
  parseChecksums,
  sha256,
  validatePluginManifest,
} from '@stockanalyzer/plugin-core'

const require = createRequire(import.meta.url)
const SDK_ENTRY = require.resolve('@stockanalyzer/plugin-sdk')
const RELEASE_SYNC = (RELEASE_SYNC_MODULE as unknown as {
  readonly default: Parameters<typeof newQuickJSWASMModuleFromVariant>[0]
}).default
const SOURCE_ENTRY = 'src/index.ts'
const MANIFEST_PATH = 'stockanalyzer.plugin.json'
const CHECKSUM_PATH = 'checksums.json'
const ENTRY_EXPORT = 'main'
const textEncoder = new TextEncoder()
const DETERMINISTIC_MTIME = new Date('1980-01-01T00:00:00.000Z')

export interface PluginTemplateOptions {
  readonly id?: string
  readonly name?: string
  readonly author?: string
  readonly description?: string
}

export interface PluginTemplateResult {
  readonly directory: string
  readonly manifest: PluginManifest
}

export interface PluginValidation {
  readonly manifest: PluginManifest
  readonly packageHash: string
  readonly packageBytes: number
  readonly fileCount: number
}

function textFile(lines: readonly string[]): string {
  return `${lines.join('\n')}\n`
}

function slug(value: string): string {
  const result = value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  return /^[a-z]/.test(result) ? result : `study-${result || 'plugin'}`
}

function manifestFor(directory: string, options: PluginTemplateOptions): PluginManifest {
  const studyId = slug(basename(directory))
  const name = options.name?.trim() || basename(directory)
  return validatePluginManifest({
    schemaVersion: PLUGIN_MANIFEST_SCHEMA_VERSION,
    id: options.id?.trim() || `dev.local.${studyId}`,
    version: '1.0.0',
    apiVersion: `^${STUDY_API_VERSION}`,
    engine: { minimum: STUDY_ENGINE_VERSION },
    name: { 'zh-CN': name },
    description: { 'zh-CN': options.description?.trim() || `${name} 指标插件` },
    author: { name: options.author?.trim() || 'Developer' },
    license: 'MIT',
    icon: 'chart-line',
    entry: 'dist/plugin.iife.js',
    contributes: { studies: [{ id: studyId, kind: 'indicator', export: ENTRY_EXPORT }] },
    permissions: {
      marketData: { symbols: 'chart', timeframes: 'chart' },
      fundamentals: false,
      corporateActions: false,
    },
    integrity: { algorithm: 'sha256', manifest: CHECKSUM_PATH },
  })
}

function sourceTemplate(studyId: string): string {
  return textFile([
    "import { defineIndicator, definePlugin } from '@stockanalyzer/plugin-sdk'",
    '',
    '/** 先完善 ALGORITHM.md，再将这里替换为确定性的因果指标。 */',
    'const main = defineIndicator({',
    '  run({ bars, inputs }) {',
    '    const requestedLength = Number(inputs.length ?? 20)',
    '    const length = Number.isFinite(requestedLength)',
    '      ? Math.max(1, Math.min(500, Math.round(requestedLength)))',
    '      : 20',
    '    const values = bars.map((_, index) => {',
    '      if (index + 1 < length) return null',
    '      let sum = 0',
    '      for (let offset = 0; offset < length; offset += 1) {',
    '        sum += bars[index - offset].close',
    '      }',
    '      return sum / length',
    '    })',
    '    return { outputs: [{ id: studyId, title: \'自定义指标\', type: \'line\', values }] }',
    '  },',
    '})',
    '',
    'globalThis.StockAnalyzerPlugin = definePlugin({ main })',
  ]).replace('id: studyId', `id: '${studyId}'`)
}

function algorithmTemplate(name: string, studyId: string): string {
  return textFile([
    `# ${name}：算法设计`,
    '',
    '> 先定义规则，再修改代码。Codex 应把未明确但会改变结果的事项列为问题。',
    '',
    '## 1. 目标',
    '',
    '- 指标解决什么问题：',
    '- 适用市场与周期：',
    '- 不适用场景：',
    '',
    '## 2. 输入与参数',
    '',
    '| 参数 | 类型 | 默认值 | 合法范围 | 含义 |',
    '|---|---|---:|---|---|',
    '| `length` | number | 20 | 1–500 | 示例回看长度 |',
    '',
    '## 3. 计算规则',
    '',
    '1. 只允许使用当前及历史 Bar，不得引用未来数据。',
    '2. 明确预热期、缺失值、零成交量和非法参数的处理。',
    '3. 明确每个输出序列的公式、颜色语义和期望数量级。',
    '',
    '## 4. 输出',
    '',
    '| id | 类型 | 含义 |',
    '|---|---|---|',
    `| \`${studyId}\` | line | 主指标线 |`,
    '',
    '## 5. 验收样例',
    '',
    '- 常规行情：',
    '- 数据不足：',
    '- 极端价格或成交量：',
    '- 参数边界：',
    '',
    '## 6. Codex 实施约束',
    '',
    '- 保持确定性；禁止网络、DOM、Storage、真实时间和随机数。',
    '- 输出数组长度必须与 `bars` 相同；不可计算的位置返回 `null`。',
    '- 先补充算法验收条件，再修改 `src/index.ts`。',
    '- 完成后执行 `npm run plugin:test -- <插件目录>` 和 `npm run plugin:release -- <插件目录>`。',
  ])
}

function readmeTemplate(name: string): string {
  return textFile([
    `# ${name}`,
    '',
    '## 使用 Codex 设计算法',
    '',
    '> 阅读本目录的 ALGORITHM.md、src/index.ts 和 docs/sdk-api.md。先补齐算法规则、因果性、参数边界与验收样例，再实现 TypeScript；最后执行 plugin:release，修复全部校验错误并告诉我生成文件路径。',
    '',
    '## 命令',
    '',
    '```powershell',
    'npm run plugin:build -- <插件目录>',
    'npm run plugin:test -- <插件目录>',
    'npm run plugin:release -- <插件目录>',
    '```',
    '',
    '生成的 `.stockplugin` 在 StockAnalyzer 中通过“指标 → 管理本地插件”导入。',
  ])
}

function fixtureTemplate(): PluginFixture {
  const bars: PluginSandboxBar[] = []
  for (let index = 0; index < 32; index += 1) {
    const close = 100 + index + Math.sin(index / 3) * 2
    bars.push({ time: index + 1, open: close - 0.5, high: close + 1, low: close - 1, close, volume: 1000 + index * 10 })
  }
  return Object.freeze({ chartSymbol: 'DEMO', chartInterval: '1d', bars: Object.freeze(bars), inputs: { length: 20 } })
}

async function ensureNewDirectory(directory: string): Promise<string> {
  const root = resolve(directory)
  try {
    await stat(root)
    throw new Error(`目标目录已存在，拒绝覆盖: ${root}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  await mkdir(root, { recursive: true })
  return root
}

export async function createPluginTemplate(directory: string, options: PluginTemplateOptions = {}): Promise<PluginTemplateResult> {
  const root = await ensureNewDirectory(directory)
  const manifest = manifestFor(root, options)
  const studyId = manifest.contributes.studies[0]?.id
  if (!studyId) throw new Error('模板缺少 Study id')
  await mkdir(join(root, 'src'))
  await writeFile(join(root, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  await writeFile(join(root, SOURCE_ENTRY), sourceTemplate(studyId), 'utf8')
  await writeFile(join(root, 'ALGORITHM.md'), algorithmTemplate(manifest.name['zh-CN'] ?? '指标', studyId), 'utf8')
  await writeFile(join(root, 'README.md'), readmeTemplate(manifest.name['zh-CN'] ?? '指标'), 'utf8')
  await writeFile(join(root, 'plugin.fixture.json'), `${JSON.stringify(fixtureTemplate(), null, 2)}\n`, 'utf8')
  return Object.freeze({ directory: root, manifest })
}

export async function buildPluginDirectory(directory: string): Promise<string> {
  const root = resolve(directory)
  const manifest = validatePluginManifest(JSON.parse(await readFile(join(root, MANIFEST_PATH), 'utf8')) as unknown)
  const source = join(root, SOURCE_ENTRY)
  const output = join(root, ...manifest.entry.split('/'))
  await stat(source)
  await mkdir(dirname(output), { recursive: true })
  await build({
    entryPoints: [source],
    outfile: output,
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    sourcemap: false,
    minify: false,
    legalComments: 'none',
    charset: 'utf8',
    alias: { '@stockanalyzer/plugin-sdk': SDK_ENTRY },
  })
  return output
}

async function optionalFile(root: string, path: string): Promise<readonly [string, Uint8Array] | null> {
  try {
    const absolute = join(root, path)
    const info = await stat(absolute)
    if (!info.isFile()) return null
    return [path, new Uint8Array(await readFile(absolute))]
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

function decodeArchive(archive: Uint8Array): Map<string, Uint8Array> {
  if (archive.byteLength === 0 || archive.byteLength > PLUGIN_PACKAGE_LIMITS.maxArchiveBytes) throw new Error('插件包大小超过限制')
  const decoded = unzipSync(archive)
  const files = new Map<string, Uint8Array>()
  let uncompressed = 0
  for (const [rawPath, bytes] of Object.entries(decoded)) {
    const path = normalizePluginPath(rawPath, 'archive path')
    if (files.has(path)) throw new Error(`插件包包含重复路径: ${path}`)
    uncompressed += bytes.byteLength
    if (files.size >= PLUGIN_PACKAGE_LIMITS.maxFiles || uncompressed > PLUGIN_PACKAGE_LIMITS.maxUncompressedBytes) throw new Error('插件包文件数或解压大小超过限制')
    files.set(path, bytes)
  }
  return files
}

export function validatePluginArchive(archive: Uint8Array): PluginValidation {
  const files = decodeArchive(archive)
  const manifestBytes = files.get(MANIFEST_PATH)
  const checksumBytes = files.get(CHECKSUM_PATH)
  if (!manifestBytes || !checksumBytes) throw new Error('插件包缺少 manifest 或 checksums.json')
  const manifest = validatePluginManifest(JSON.parse(strFromU8(manifestBytes)) as unknown)
  const checksums = parseChecksums(checksumBytes)
  const actualPaths = [...files.keys()].filter((path) => path !== CHECKSUM_PATH).sort()
  const declaredPaths = Object.keys(checksums.files).sort()
  if (JSON.stringify(actualPaths) !== JSON.stringify(declaredPaths)) throw new Error('checksums.json 未覆盖插件包全部文件')
  for (const path of actualPaths) {
    if (sha256(files.get(path) as Uint8Array) !== checksums.files[path]) throw new Error(`插件文件完整性校验失败: ${path}`)
  }
  const entry = files.get(manifest.entry)
  if (!entry) throw new Error(`插件入口不存在: ${manifest.entry}`)
  if (entry.byteLength > PLUGIN_PACKAGE_LIMITS.maxBundleBytes) throw new Error('插件 bundle 超过 256 KiB')
  if (/\bimport\s*\(/.test(strFromU8(entry))) throw new Error('插件 bundle 禁止动态 import()')
  return Object.freeze({ manifest, packageHash: sha256(archive), packageBytes: archive.byteLength, fileCount: files.size })
}

export async function packPluginDirectory(directory: string, outputPath?: string): Promise<{ readonly outputPath: string; readonly validation: PluginValidation }> {
  const root = resolve(directory)
  const manifest = validatePluginManifest(JSON.parse(await readFile(join(root, MANIFEST_PATH), 'utf8')) as unknown)
  const files = new Map<string, Uint8Array>()
  for (const path of [MANIFEST_PATH, manifest.entry, 'README.md', 'LICENSE', 'NOTICE']) {
    const item = await optionalFile(root, path)
    if (item) files.set(item[0], item[1])
  }
  if (!files.has(manifest.entry)) throw new Error(`插件入口不存在: ${manifest.entry}`)
  const hashes: Record<string, string> = {}
  for (const path of [...files.keys()].sort()) hashes[path] = sha256(files.get(path) as Uint8Array)
  files.set(CHECKSUM_PATH, strToU8(`${JSON.stringify({ schemaVersion: 1, algorithm: 'sha256', files: hashes }, null, 2)}\n`))
  const zip: Zippable = {}
  for (const path of [...files.keys()].sort()) zip[path] = [files.get(path) as Uint8Array, { level: 9, mtime: DETERMINISTIC_MTIME }]
  const archive = zipSync(zip, { level: 9, mtime: DETERMINISTIC_MTIME })
  const validation = validatePluginArchive(archive)
  const target = resolve(outputPath ?? join(dirname(root), `${manifest.id}-${manifest.version}.stockplugin`))
  if (extname(target).toLowerCase() !== '.stockplugin') throw new Error('插件输出文件必须使用 .stockplugin 扩展名')
  await writeFile(target, archive)
  return { outputPath: target, validation }
}

function lockdown(): string {
  return `(() => { for (const name of ['fetch','XMLHttpRequest','WebSocket','EventSource','window','document','navigator','location','localStorage','sessionStorage','indexedDB','caches','Worker','process','require','module','Deno','WebAssembly','console']) { try { Object.defineProperty(globalThis,name,{value:undefined,writable:false,configurable:false}); } catch (_) {} } try { Object.defineProperty(Math,'random',{value:()=>{throw new Error('未授权随机数')}}); Object.defineProperty(Date,'now',{value:()=>0}); } catch (_) {} })()`
}

function evaluate(context: QuickJSContext, source: string, filename: string): unknown {
  const result = context.evalCode(source, filename)
  if (result.error) {
    const error = context.dump(result.error)
    result.error.dispose()
    throw new Error(typeof error === 'object' && error && 'message' in error ? String(error.message) : String(error))
  }
  const value = context.dump(result.value)
  result.value.dispose()
  return value
}

async function sandbox(bundle: string, expression: string): Promise<unknown> {
  if (textEncoder.encode(bundle).byteLength > PLUGIN_PACKAGE_LIMITS.maxBundleBytes) throw new Error('插件 bundle 超过 256 KiB')
  const quickJs = await newQuickJSWASMModuleFromVariant(RELEASE_SYNC)
  const runtime = quickJs.newRuntime()
  runtime.setMemoryLimit(32 * 1024 * 1024)
  runtime.setMaxStackSize(1 * 1024 * 1024)
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(Date.now() + 1_000))
  const context = runtime.newContext()
  try {
    evaluate(context, lockdown(), 'stockanalyzer-lockdown.js')
    evaluate(context, bundle, 'dist/plugin.iife.js')
    return evaluate(context, expression, 'stockanalyzer-host.js')
  } finally {
    context.dispose()
    runtime.dispose()
  }
}

function probeExpression(manifest: PluginManifest): string {
  return `(() => { const registry = globalThis.StockAnalyzerPlugin; if (!registry || typeof registry !== 'object') throw new Error('插件未声明 globalThis.StockAnalyzerPlugin'); return ${JSON.stringify(manifest.contributes.studies)}.map((item) => { const definition = registry[item.export]; if (!definition || definition.kind !== item.kind || typeof definition.run !== 'function') throw new Error('插件 export 不符合 manifest: ' + item.export); return { studyId: item.id, exportName: item.export, kind: item.kind }; }); })()`
}

function runExpression(exportName: string, input: PluginStudyExecutionInput): string {
  return `(() => { const definition = globalThis.StockAnalyzerPlugin[${JSON.stringify(exportName)}]; const result = definition.run(${JSON.stringify(input)}); if (result && typeof result.then === 'function') throw new Error('插件 run() 不允许返回 Promise'); return result; })()`
}

function validateResult(value: unknown, count: number): PluginStudyExecutionResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('插件结果必须是对象')
  const source = value as { outputs?: unknown }
  if (!Array.isArray(source.outputs) || source.outputs.length === 0) throw new Error('插件结果至少包含一个 outputs')
  const outputs = source.outputs.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('插件 output 必须是对象')
    const output = item as { id?: unknown; type?: unknown; values?: unknown }
    if (typeof output.id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(output.id)) throw new Error('插件 output id 无效')
    if (output.type !== 'line' && output.type !== 'histogram') throw new Error(`插件 output ${output.id} type 无效`)
    if (!Array.isArray(output.values) || output.values.length !== count) throw new Error(`插件 output ${output.id} 长度必须等于 Bar 数`)
    if (output.values.some((item) => item !== null && (typeof item !== 'number' || !Number.isFinite(item)))) throw new Error(`插件 output ${output.id} 含非法数值`)
    return { id: output.id, type: output.type, values: output.values } as PluginStudyExecutionResult['outputs'][number]
  })
  return { outputs }
}

async function readFixture(root: string): Promise<PluginFixture> {
  try {
    return JSON.parse(await readFile(join(root, 'plugin.fixture.json'), 'utf8')) as PluginFixture
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return fixtureTemplate()
  }
}

export async function probePluginDirectory(directory: string): Promise<readonly unknown[]> {
  await buildPluginDirectory(directory)
  const root = resolve(directory)
  const manifest = validatePluginManifest(JSON.parse(await readFile(join(root, MANIFEST_PATH), 'utf8')) as unknown)
  const bundle = await readFile(join(root, manifest.entry), 'utf8')
  return (await sandbox(bundle, probeExpression(manifest))) as readonly unknown[]
}

export async function testPluginDirectory(directory: string): Promise<PluginValidation> {
  await buildPluginDirectory(directory)
  const root = resolve(directory)
  const manifest = validatePluginManifest(JSON.parse(await readFile(join(root, MANIFEST_PATH), 'utf8')) as unknown)
  const bundle = await readFile(join(root, manifest.entry), 'utf8')
  const contributions = await sandbox(bundle, probeExpression(manifest)) as readonly { studyId: string; exportName: string; kind: string }[]
  const fixture = await readFixture(root)
  for (const contribution of contributions) {
    if (contribution.kind !== 'indicator') throw new Error('DevKit 首版 test 只执行 indicator，strategy 需要宿主逐 Bar API')
    const input: PluginStudyExecutionInput = { bars: fixture.bars, inputs: fixture.inputs }
    const result = await sandbox(bundle, runExpression(contribution.exportName, input))
    validateResult(result, fixture.bars.length)
  }
  return Object.freeze({ manifest, packageHash: '', packageBytes: 0, fileCount: contributions.length })
}

export async function releasePluginDirectory(directory: string, outputPath?: string): Promise<{ readonly outputPath: string; readonly validation: PluginValidation }> {
  await testPluginDirectory(directory)
  return packPluginDirectory(directory, outputPath)
}

export async function validatePluginFile(path: string): Promise<PluginValidation> {
  const archive = new Uint8Array(await readFile(resolve(path)))
  return validatePluginArchive(archive)
}
