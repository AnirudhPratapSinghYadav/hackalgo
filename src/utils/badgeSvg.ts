const BADGE_META: Record<number, { name: string; icon: string }> = {
  1: { name: 'Vault Starter', icon: '🥉' },
  2: { name: 'Vault Builder', icon: '🥈' },
  3: { name: 'Vault Master', icon: '🥇' },
}

function hashSeed(address: string): number[] {
  const seed = address.slice(0, 8)
  const values: number[] = []
  for (let i = 0; i < seed.length; i++) {
    values.push(seed.charCodeAt(i))
  }
  return values
}

function seedToHsl(vals: number[], offset: number): string {
  const h = (vals[(0 + offset) % vals.length] * 7 + vals[(1 + offset) % vals.length] * 13) % 360
  const s = 55 + (vals[(2 + offset) % vals.length] % 30)
  const l = 45 + (vals[(3 + offset) % vals.length] % 20)
  return `hsl(${h}, ${s}%, ${l}%)`
}

function seedToHslLight(vals: number[], offset: number): string {
  const h = (vals[(0 + offset) % vals.length] * 7 + vals[(1 + offset) % vals.length] * 13) % 360
  const s = 40 + (vals[(2 + offset) % vals.length] % 25)
  const l = 75 + (vals[(3 + offset) % vals.length] % 15)
  return `hsl(${h}, ${s}%, ${l}%)`
}

export function generateBadgeSvg(address: string, level: number): string {
  const vals = hashSeed(address)
  const meta = BADGE_META[level] ?? { name: `Level ${level}`, icon: '🏅' }
  const primary = seedToHsl(vals, level * 2)
  const secondary = seedToHsl(vals, level * 2 + 4)
  const accent = seedToHslLight(vals, level * 3)
  const seed8 = address.slice(0, 8)

  const patternRotation = (vals[0] + level * 30) % 360
  const starPoints = 4 + (vals[1] % 4)
  const starRadius = 8 + (vals[2] % 6)

  let stars = ''
  for (let i = 0; i < starPoints; i++) {
    const angle = (i / starPoints) * Math.PI * 2 + patternRotation * (Math.PI / 180)
    const r = starRadius + (vals[(i + level) % vals.length] % 8)
    const cx = 100 + Math.cos(angle) * (35 + r)
    const cy = 90 + Math.sin(angle) * (30 + r)
    const size = 2 + (vals[(i + 2) % vals.length] % 3)
    stars += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${size}" fill="${accent}" opacity="0.5"/>`
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
  <defs>
    <linearGradient id="bg-${seed8}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
  </defs>
  <rect width="200" height="200" rx="24" fill="url(#bg-${seed8})"/>
  ${stars}
  <circle cx="100" cy="80" r="38" fill="white" opacity="0.15"/>
  <text x="100" y="95" text-anchor="middle" font-size="42">${meta.icon}</text>
  <text x="100" y="140" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="13" fill="white">${meta.name}</text>
  <text x="100" y="160" text-anchor="middle" font-family="monospace" font-size="9" fill="white" opacity="0.7">${seed8}...${address.slice(-4)}</text>
  <text x="100" y="180" text-anchor="middle" font-family="system-ui,sans-serif" font-size="8" fill="white" opacity="0.5">Level ${level} · AlgoVault</text>
</svg>`
}

export function badgeSvgToDataUri(address: string, level: number): string {
  const svg = generateBadgeSvg(address, level)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}
