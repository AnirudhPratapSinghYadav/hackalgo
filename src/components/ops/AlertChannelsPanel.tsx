import { ExternalLink } from 'lucide-react'
import {
  getTelegramBotUrl,
  getTelegramBotUsername,
  isTelegramConfigured,
} from '../../lib/alertingConfig'
import { TelegramIcon } from './AlertChannelIcons'

const TG_BLUE = '#2AABEE'
const TG_BLUE_DARK = '#229ED9'

type Variant = 'ops' | 'compact'

interface AlertChannelsPanelProps {
  variant?: Variant
  /** Telegram deep-link start param */
  telegramStart?: string
  className?: string
}

function CommandChip({ children }: { children: string }) {
  return (
    <span className="inline-block font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/20 text-white/90">
      {children}
    </span>
  )
}

/** Telegram Guardian — sole operational alert channel. */
export default function AlertChannelsPanel({
  variant = 'ops',
  telegramStart = 'ops',
  className = '',
}: AlertChannelsPanelProps) {
  const tgConfigured = isTelegramConfigured()
  const tgUrl = getTelegramBotUrl(telegramStart)
  const tgUser = getTelegramBotUsername()
  const gradient = `linear-gradient(145deg, ${TG_BLUE} 0%, ${TG_BLUE_DARK} 100%)`

  return (
    <div className={className}>
      {variant === 'ops' ? (
        <p className="text-xs text-text-secondary leading-relaxed mb-4">
          Operational alerts and approver commands are delivered via Telegram Guardian. Run one background
          Guardian process for GDACS and on-chain notifications.
        </p>
      ) : null}

      {!tgConfigured ? (
        <div
          className={`rounded-xl border border-dashed border-border-medium bg-bg-elevated/50 ${
            variant === 'compact' ? 'p-4' : 'p-5'
          }`}
        >
          <div className="flex items-center gap-3 opacity-40">
            <div
              className="w-11 h-11 rounded-full flex items-center justify-center"
              style={{ background: TG_BLUE }}
            >
              <TelegramIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Telegram Guardian</p>
              <p className="text-xs text-text-tertiary mt-0.5">Set VITE_TELEGRAM_BOT_USERNAME in .env</p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className={`rounded-xl text-white shadow-lg overflow-hidden max-w-md ${
            variant === 'compact' ? 'p-4' : 'p-5'
          }`}
          style={{ background: gradient }}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex-shrink-0 w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center shadow-inner ring-1 ring-white/30"
                aria-hidden
              >
                <TelegramIcon className="w-7 h-7 text-white drop-shadow-sm" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-mono uppercase tracking-widest text-white/75">Guardian alerts</p>
                <p className="text-base font-semibold text-white truncate">Telegram</p>
                <p className="text-xs text-white/85 font-mono truncate mt-0.5">@{tgUser}</p>
              </div>
            </div>
            <span className="flex-shrink-0 w-2 h-2 rounded-full bg-white animate-pulse mt-2" title="Configured" />
          </div>

          <div className="flex flex-wrap gap-1.5 mt-4">
            {['/status', '/events', '/list', '/approve'].map((c) => (
              <CommandChip key={c}>{c}</CommandChip>
            ))}
          </div>

          {tgUrl ? (
            <a
              href={tgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full rounded-xl bg-white text-sm font-semibold py-3 px-4 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all"
              style={{ color: TG_BLUE_DARK }}
            >
              <TelegramIcon className="w-4 h-4" />
              Open in Telegram
              <ExternalLink className="w-3.5 h-3.5 opacity-60" />
            </a>
          ) : null}
        </div>
      )}

      {variant === 'ops' && tgConfigured ? (
        <p className="text-[10px] font-mono text-text-tertiary mt-4">
          Guardian must run as a single background service. Duplicate instances will stop alerts from delivering.
        </p>
      ) : null}
    </div>
  )
}
