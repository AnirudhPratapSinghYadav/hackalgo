/** Plain-English translations for on-chain / algosdk errors shown in ops UI. */

const RULES: { match: RegExp; message: string }[] = [
  { match: /overspend/i, message: "The relief vault doesn't have enough USDC. Fund the contract before disbursing." },
  { match: /transaction rejected|rejected by ledger/i, message: 'Transaction was rejected in Pera. Please try again.' },
  { match: /invalid round|round expired/i, message: 'This campaign has expired. Create a new campaign for this disaster.' },
  { match: /unauthorized|not authorized|caller must/i, message: 'Your wallet is not authorized for this action.' },
  { match: /below min tx fee/i, message: 'Network fee too low. Please retry in a moment.' },
  { match: /box not found/i, message: 'Campaign data not found on-chain. Create a new campaign.' },
  { match: /logic eval error/i, message: 'The smart contract rejected this action. Check campaign status and wallet role.' },
  { match: /network request failed|failed to fetch/i, message: 'Cannot reach the blockchain network. Check your connection and try again.' },
]

export function humanizeContractError(raw: unknown): string {
  const text =
    typeof raw === 'string'
      ? raw
      : raw instanceof Error
        ? raw.message
        : raw && typeof raw === 'object' && 'message' in raw
          ? String((raw as { message: unknown }).message)
          : 'Something went wrong. Please try again.'

  for (const { match, message } of RULES) {
    if (match.test(text)) return message
  }

  if (text.length > 160) return 'Something went wrong. Please try again.'
  return text
}
