export function formatUsdc(amount: number): string {
  return `$${amount.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC`
}

export function formatAlgo(amount: number): string {
  return `${amount.toLocaleString('en-US', { maximumFractionDigits: 4 })} ALGO`
}

export function truncateAddress(addr: string, head = 6, tail = 4): string {
  if (addr.length <= head + tail + 3) return addr
  return `${addr.slice(0, head)}...${addr.slice(-tail)}`
}

export function formatCategory(category: string): string {
  return category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export function credibilityScore(up: number, down: number): number {
  return up - down
}

export function fundingPercent(raised: number, required: number): number {
  if (required <= 0) return 0
  return Math.min((raised / required) * 100, 100)
}
