import { config } from '../config.js'

export function guardianUsage(): string {
  return [
    '*AlgoVault Guardian*',
    'Operational alerting for disaster response on Algorand testnet.',
    '',
    '/status — network, contracts, alert channel',
    '/events — latest GDACS incidents',
    '/campaigns — active relief campaigns',
    '/campaign <id> — campaign detail',
    '/approve <id> — sign approval in Pera (after /register + /verify)',
    '/register <address> + /verify <signature>',
    '/ping — service check',
    '/subscribe <topic> — e.g. all, flood, region:Kerala',
    '',
    `Operations console: ${config.publicAppUrl}/operations`,
  ].join('\n')
}
