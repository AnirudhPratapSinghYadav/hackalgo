declare const process: { env: Record<string, string | undefined> }

type ImageRequest = {
  prompt?: string
}

async function tryImagen(prompt: string, apiKey: string): Promise<string | null> {
  const models = [
    'imagen-3.0-generate-002',
    'imagen-3.0-generate-001',
    'imagen-3.0-fast-generate-001',
  ]

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { sampleCount: 1 },
        }),
      })

      if (!res.ok) continue

      const json: any = await res.json()
      const b64 =
        json?.predictions?.[0]?.bytesBase64Encoded ??
        json?.generatedImages?.[0]?.image?.imageBytes ??
        json?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data

      if (typeof b64 === 'string' && b64.length > 100) {
        return `data:image/png;base64,${b64}`
      }
    } catch {
      // try next model
    }
  }

  return null
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const apiKey = process.env.GEMINI_API_KEY ?? process.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    res.status(503).json({ error: 'Missing GEMINI_API_KEY', imageUrl: null })
    return
  }

  try {
    const body = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as ImageRequest
    const prompt = String(body?.prompt ?? '').trim()
    if (!prompt) {
      res.status(400).json({ error: 'Missing prompt', imageUrl: null })
      return
    }

    const imageUrl = await tryImagen(prompt, apiKey)
    if (!imageUrl) {
      res.status(200).json({ imageUrl: null, fallback: true })
      return
    }

    res.status(200).json({ imageUrl })
  } catch (error: any) {
    res.status(500).json({ error: 'Image generation failed', detail: String(error?.message ?? error), imageUrl: null })
  }
}
