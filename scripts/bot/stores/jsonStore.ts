import * as fs from 'node:fs'
import * as path from 'node:path'
import { BOT_DATA_DIR } from '../config.js'

export function ensureDataDir(): void {
  if (!fs.existsSync(BOT_DATA_DIR)) fs.mkdirSync(BOT_DATA_DIR, { recursive: true })
}

export function readJson<T>(filename: string, fallback: T): T {
  ensureDataDir()
  const file = path.join(BOT_DATA_DIR, filename)
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as T
  } catch {
    return fallback
  }
}

export function writeJson<T>(filename: string, data: T): void {
  ensureDataDir()
  const file = path.join(BOT_DATA_DIR, filename)
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}
