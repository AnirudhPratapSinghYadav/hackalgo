const PREFIX = 'algovault-doc-img:'

function hashPrompt(prompt: string): string {
  let h = 0
  for (let i = 0; i < prompt.length; i++) {
    h = (h << 5) - h + prompt.charCodeAt(i)
    h |= 0
  }
  return String(h >>> 0)
}

export function readCachedImage(prompt: string): string | null {
  try {
    const key = PREFIX + hashPrompt(prompt)
    const v = sessionStorage.getItem(key)
    return v && v.startsWith('data:image') ? v : null
  } catch {
    return null
  }
}

export function writeCachedImage(prompt: string, dataUrl: string): void {
  try {
    const key = PREFIX + hashPrompt(prompt)
    sessionStorage.setItem(key, dataUrl)
  } catch {
    // quota or private mode
  }
}
