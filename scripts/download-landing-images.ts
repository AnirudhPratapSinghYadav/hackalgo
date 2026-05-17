/**
 * One-time: download Gemini/Imagen images into public/images/landing/
 * Run: npx tsx scripts/download-landing-images.ts
 */
import 'dotenv/config'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT_DIR = join(process.cwd(), 'public', 'images', 'landing')

const IMAGES: { name: string; prompt: string }[] = [
  {
    name: 'opening',
    prompt:
      'Documentary photograph, black and white with slight warm tone, an Indian mother holding a young child standing outside a partially collapsed mud-brick home after flooding, water receding, devastated but dignified expression, rural India, photojournalism style, no text',
  },
  {
    name: 'scale',
    prompt:
      'Documentary photograph, warm black and white, wide shot of Indian disaster relief workers carrying supplies through flooded village streets, real people, urgent movement, photojournalism aesthetic, natural light, no text overlay',
  },
  {
    name: 'cause',
    prompt:
      'Documentary photograph, black and white, close-up of weathered Indian hands holding a crumpled government aid form, blurred background of a government office waiting room, photojournalism style, emotionally resonant, no text',
  },
  {
    name: 'verify',
    prompt:
      'Documentary photograph, black and white, Indian NDMA field officer on a mobile phone in a flooded rural area, satellite dish in background, calm and focused expression, photojournalism style, natural light',
  },
  {
    name: 'deliver',
    prompt:
      'Documentary photograph, black and white, rural Indian woman holding a basic mobile phone showing a digital wallet interface, relief and surprise in her expression, flooded village in background, photojournalism style',
  },
  {
    name: 'prove',
    prompt:
      'Documentary photograph, black and white, Indian donor looking at a laptop screen showing a transaction record, thoughtful expression, home office setting, photojournalism aesthetic',
  },
  {
    name: 'close',
    prompt:
      'Documentary photograph, black and white, aerial view of a flooded Indian village at dawn, a single light visible in one home, roads submerged, quiet and desolate, photojournalism, National Geographic style',
  },
]

async function tryImagen(prompt: string, apiKey: string): Promise<Buffer | null> {
  const models = [
    'imagen-4.0-generate-001',
    'imagen-4.0-fast-generate-001',
    'imagen-3.0-generate-002',
    'imagen-3.0-generate-001',
  ]

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9' },
      }),
    })
    const text = await res.text()
    if (!res.ok) {
      console.log(`  [${model}] ${res.status}: ${text.slice(0, 120)}`)
      continue
    }
    const json = JSON.parse(text) as Record<string, unknown>
    const b64 =
      (json?.predictions as { bytesBase64Encoded?: string }[] | undefined)?.[0]?.bytesBase64Encoded ??
      (json?.generatedImages as { image?: { imageBytes?: string } }[] | undefined)?.[0]?.image?.imageBytes

    if (typeof b64 === 'string' && b64.length > 100) {
      return Buffer.from(b64, 'base64')
    }
  }
  return null
}

async function tryGeminiFlashImage(prompt: string, apiKey: string): Promise<Buffer | null> {
  const models = ['gemini-2.5-flash-image', 'gemini-3.1-flash-image-preview', 'gemini-3-pro-image-preview']

  for (const model of models) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
      }),
    })
    const text = await res.text()
    if (!res.ok) {
      console.log(`  [${model}] ${res.status}: ${text.slice(0, 120)}`)
      continue
    }
    const json = JSON.parse(text) as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string; mimeType?: string } }[] } }[]
    }
    const parts = json?.candidates?.[0]?.content?.parts ?? []
    for (const part of parts) {
      const data = part?.inlineData?.data
      if (typeof data === 'string' && data.length > 100) {
        return Buffer.from(data, 'base64')
      }
    }
  }
  return null
}

async function generateImage(prompt: string, apiKey: string): Promise<Buffer | null> {
  let buf = await tryImagen(prompt, apiKey)
  if (buf) return buf
  buf = await tryGeminiFlashImage(prompt, apiKey)
  return buf
}

async function main() {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    console.error('Set GEMINI_API_KEY in .env')
    process.exit(1)
  }

  await mkdir(OUT_DIR, { recursive: true })
  console.log(`Saving to ${OUT_DIR}\n`)

  let ok = 0
  for (const { name, prompt } of IMAGES) {
    process.stdout.write(`→ ${name} ... `)
    const buf = await generateImage(prompt, apiKey)
    if (!buf) {
      console.log('FAILED')
      continue
    }
    const path = join(OUT_DIR, `${name}.jpg`)
    await writeFile(path, buf)
    console.log(`OK (${(buf.length / 1024).toFixed(0)} KB)`)
    ok++
    await new Promise((r) => setTimeout(r, 2000))
  }

  console.log(`\nDone: ${ok}/${IMAGES.length} images`)
  if (ok === 0) process.exit(1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
