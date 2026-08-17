import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { unzipSync } from 'fflate'
import { afterEach, describe, expect, it } from 'vitest'
import {
  buildPluginDirectory,
  createPluginTemplate,
  packPluginDirectory,
  releasePluginDirectory,
  validatePluginFile,
} from '../tooling.js'

const temporaryDirectories: string[] = []

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  temporaryDirectories.push(directory)
  return directory
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true, force: true })))
})

describe('StockAnalyzer Plugin DevKit', () => {
  it('从模板生成、沙箱测试、确定性打包并校验', async () => {
    const parent = await temporaryDirectory('stockanalyzer-devkit-')
    const root = join(parent, 'sma')
    await createPluginTemplate(root, {
      id: 'dev.example.sma',
      name: 'SMA 示例',
    })

    const first = await releasePluginDirectory(root, join(parent, 'first.stockplugin'))
    const second = await releasePluginDirectory(root, join(parent, 'second.stockplugin'))
    expect(first.validation.packageHash).toBe(second.validation.packageHash)
    const validated = await validatePluginFile(first.outputPath)
    expect(validated.manifest.id).toBe('dev.example.sma')
    expect(validated.fileCount).toBe(4)
  })

  it('只打包发布白名单，拒绝把源码与环境变量带入插件', async () => {
    const parent = await temporaryDirectory('stockanalyzer-safe-pack-')
    const root = join(parent, 'safe-indicator')
    await createPluginTemplate(root)
    await buildPluginDirectory(root)
    await writeFile(join(root, '.env'), 'DEEP_SECRET=do-not-pack\n')
    const result = await packPluginDirectory(root, join(parent, 'safe.stockplugin'))
    const files = unzipSync(new Uint8Array(await readFile(result.outputPath)))
    expect(Object.keys(files).sort()).toEqual([
      'README.md',
      'checksums.json',
      'dist/plugin.iife.js',
      'stockanalyzer.plugin.json',
    ])
  })
})
