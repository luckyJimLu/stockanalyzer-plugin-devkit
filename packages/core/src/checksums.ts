import { createHash } from 'node:crypto'
import {
  PLUGIN_CHECKSUM_SCHEMA_VERSION,
  type PluginChecksums,
} from '@stockanalyzer/plugin-contracts'

export function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex')
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${field} 必须是对象`)
  return value as Record<string, unknown>
}

/** 验证 checksums.json 的结构和 SHA-256 字段格式。 */
export function validatePluginChecksums(value: unknown): PluginChecksums {
  const source = object(value, 'checksums.json')
  if (source.schemaVersion !== PLUGIN_CHECKSUM_SCHEMA_VERSION || source.algorithm !== 'sha256') {
    throw new Error('checksums.json schemaVersion/algorithm 不受支持')
  }
  const files = object(source.files, 'checksums.json.files')
  for (const [path, hash] of Object.entries(files)) {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path) || typeof hash !== 'string' || !/^[a-f0-9]{64}$/.test(hash)) {
      throw new Error(`checksums.json 文件项无效: ${path}`)
    }
  }
  return Object.freeze({
    schemaVersion: 1,
    algorithm: 'sha256',
    files: Object.freeze(files as Record<string, string>),
  })
}

export function parseChecksums(bytes: Uint8Array): PluginChecksums {
  try {
    return validatePluginChecksums(JSON.parse(new TextDecoder().decode(bytes)) as unknown)
  } catch (error) {
    throw new Error(`checksums.json 无效: ${(error as Error).message}`)
  }
}
