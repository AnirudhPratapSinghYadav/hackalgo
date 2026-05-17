/**
 * Prevent duplicate Telegram getUpdates pollers (409 Conflict).
 * Kills other bot.ts node processes before starting Guardian.
 */
import { execSync } from 'node:child_process'
import process from 'node:process'

const self = process.pid

function listBotPids(): number[] {
  if (process.platform === 'win32') {
    try {
      const out = execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"name=\'node.exe\'\\" | Where-Object { $_.CommandLine -match \'scripts[/\\\\]bot[/\\\\]bot\\.ts\' } | Select-Object -ExpandProperty ProcessId"',
        { encoding: 'utf8' },
      )
      return out
        .split(/\r?\n/)
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0 && n !== self)
    } catch {
      return []
    }
  }
  try {
    const out = execSync(`pgrep -f "scripts/bot/bot.ts"`, { encoding: 'utf8' })
    return out
      .split(/\s+/)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0 && n !== self)
  } catch {
    return []
  }
}

const others = listBotPids()
if (others.length > 0) {
  console.warn(`[bot] Stopping ${others.length} duplicate Guardian process(es): ${others.join(', ')}`)
  for (const pid of others) {
    try {
      process.kill(pid, 'SIGTERM')
    } catch {
      /* already gone */
    }
  }
}
