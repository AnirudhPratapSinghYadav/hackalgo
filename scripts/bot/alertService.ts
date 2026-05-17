/**
 * @deprecated Use `npm run bot` — single process for interactive commands + proactive alerts.
 * Running this alongside `npm run bot` duplicates GDACS/chain polling.
 */
console.error(
  '[alert:service] Deprecated. Use: npm run bot\n' +
    '  One Guardian process handles Telegram commands and operational alerts.',
)
process.exit(1)
