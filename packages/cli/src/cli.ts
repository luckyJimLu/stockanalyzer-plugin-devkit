import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  buildPluginDirectory,
  createPluginTemplate,
  probePluginDirectory,
  releasePluginDirectory,
  testPluginDirectory,
  validatePluginFile,
} from './tooling.js'

function usage(): string {
  return [
    'StockAnalyzer Plugin DevKit',
    '  create <目录> [插件ID] [名称]',
    '  build <目录>',
    '  test <目录>',
    '  probe <目录>',
    '  release <目录> [文件.stockplugin]',
    '  validate <文件.stockplugin>',
  ].join('\n')
}

function positional(args: readonly string[]): readonly string[] {
  const values: string[] = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index]?.startsWith('--')) {
      index += 1
      continue
    }
    values.push(args[index] as string)
  }
  return values
}

export async function runPluginCli(args: readonly string[]): Promise<number> {
  const command = args[0]
  const values = positional(args.slice(1))
  if (!command || command === 'help' || command === '--help') {
    process.stdout.write(`${usage()}\n`)
    return 0
  }
  if (command === 'create') {
    if (!values[0]) throw new Error('create 缺少插件目录')
    const result = await createPluginTemplate(values[0], { id: values[1], name: values[2] })
    process.stdout.write(`已生成插件模板 ${result.directory}\n`)
    process.stdout.write(`插件 ${result.manifest.id}@${result.manifest.version}\n`)
    return 0
  }
  if (command === 'build') {
    if (!values[0]) throw new Error('build 缺少插件目录')
    process.stdout.write(`已构建 ${await buildPluginDirectory(values[0])}\n`)
    return 0
  }
  if (command === 'probe') {
    if (!values[0]) throw new Error('probe 缺少插件目录')
    const result = await probePluginDirectory(values[0])
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
    return 0
  }
  if (command === 'test') {
    if (!values[0]) throw new Error('test 缺少插件目录')
    const result = await testPluginDirectory(values[0])
    process.stdout.write(`沙箱测试通过 ${result.manifest.id}@${result.manifest.version}\n`)
    return 0
  }
  if (command === 'release') {
    if (!values[0]) throw new Error('release 缺少插件目录')
    const result = await releasePluginDirectory(values[0], values[1])
    process.stdout.write(`已生成 ${result.outputPath}\n`)
    process.stdout.write(`插件 ${result.validation.manifest.id}@${result.validation.manifest.version}\n`)
    process.stdout.write(`SHA-256 ${result.validation.packageHash}\n`)
    return 0
  }
  if (command === 'validate') {
    if (!values[0]) throw new Error('validate 缺少插件文件')
    const result = await validatePluginFile(values[0])
    process.stdout.write(`校验通过 ${result.manifest.id}@${result.manifest.version}\n`)
    process.stdout.write(`SHA-256 ${result.packageHash}\n`)
    return 0
  }
  throw new Error(`未知命令: ${command}\n${usage()}`)
}

const executedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : ''
if (import.meta.url === executedPath) {
  runPluginCli(process.argv.slice(2)).then(
    (code) => { process.exitCode = code },
    (error: unknown) => {
      process.stderr.write(`插件工具失败：${(error as Error).message}\n`)
      process.exitCode = 1
    },
  )
}
