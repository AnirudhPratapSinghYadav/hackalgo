import algosdk from 'algosdk'

export type DecodedAppArg =
  | { index: number; type: 'selector'; rawBase64: string; rawHex: string; method?: string }
  | { index: number; type: 'uint64'; rawBase64: string; value: number }
  | { index: number; type: 'address'; rawBase64: string; value: string }
  | { index: number; type: 'byte[]'; rawBase64: string; valueUtf8: string; valueHex: string }
  | { index: number; type: 'txn_ref'; rawBase64: string; value: number }
  | { index: number; type: 'unknown'; rawBase64: string; rawHex: string }

export type DecodedLog =
  | { index: number; rawBase64: string; kind: 'uint64'; value: number }
  | { index: number; rawBase64: string; kind: 'utf8'; value: string }
  | { index: number; rawBase64: string; kind: 'bytes'; hex: string }

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function base64ToBytes(b64: string): Uint8Array {
  const raw = atob(b64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function tryDecodeJsonFromBytes(bytes: Uint8Array): any | null {
  const s = tryDecodeUtf8(bytes)
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes)
}

export function tryDecodeUtf8(bytes: Uint8Array): string | null {
  try {
    const s = bytesToUtf8(bytes)
    // Guard: avoid returning a string with lots of replacement chars
    const replacementCount = (s.match(/\uFFFD/g) ?? []).length
    if (replacementCount > 0) return null
    return s
  } catch {
    return null
  }
}

export function decodeUint64BE(bytes: Uint8Array): number | null {
  if (bytes.length !== 8) return null
  let x = 0n
  for (const b of bytes) x = (x << 8n) + BigInt(b)
  const n = Number(x)
  return Number.isFinite(n) ? n : null
}

export function decodeArc69Note(noteBase64?: string): {
  rawBase64: string
  utf8?: string
  json?: any
  arc69?: boolean
} | null {
  if (typeof noteBase64 !== 'string' || noteBase64.length === 0) return null
  const bytes = base64ToBytes(noteBase64)
  const utf8 = tryDecodeUtf8(bytes) ?? undefined
  if (!utf8) return { rawBase64: noteBase64 }
  try {
    const json = JSON.parse(utf8)
    const arc69 = typeof json === 'object' && json && json.standard === 'arc69'
    return { rawBase64: noteBase64, utf8, json, arc69 }
  } catch {
    return { rawBase64: noteBase64, utf8 }
  }
}

export function decodeGlobalStateKv(globalState: any[]): Array<{
  keyB64: string
  keyUtf8: string
  type: 'uint64' | 'bytes'
  value: number | string
  valueB64?: string
}> {
  const out: Array<{ keyB64: string; keyUtf8: string; type: 'uint64' | 'bytes'; value: number | string; valueB64?: string }> = []
  for (const e of globalState ?? []) {
    const keyB64 = String(e?.key ?? '')
    const keyBytes = keyB64 ? base64ToBytes(keyB64) : new Uint8Array()
    const keyUtf8 = (tryDecodeUtf8(keyBytes) ?? '').trim()
    if (!keyUtf8) continue
    const v = e?.value ?? {}
    if (typeof v?.uint === 'number') {
      out.push({ keyB64, keyUtf8, type: 'uint64', value: v.uint })
    } else if (typeof v?.bytes === 'string') {
      const vb64 = v.bytes
      const vbytes = base64ToBytes(vb64)
      const vUtf8 = tryDecodeUtf8(vbytes)
      out.push({ keyB64, keyUtf8, type: 'bytes', value: vUtf8 ?? bytesToHex(vbytes), valueB64: vb64 })
    }
  }
  out.sort((a, b) => a.keyUtf8.localeCompare(b.keyUtf8))
  return out
}

export function decodeLocalStateKv(localStateKv: any[]): Array<{
  keyB64: string
  keyUtf8: string
  type: 'uint64' | 'bytes'
  value: number | string
  valueB64?: string
}> {
  // Same encoding rules as global state; keep separate export to make UI explicit.
  return decodeGlobalStateKv(localStateKv)
}

export function decodeAppCallArgs(
  appArgsBase64: string[] | undefined,
  methodRegistry: Record<string, { name: string; argTypes: Array<'uint64' | 'address' | 'byte[]' | 'txn_ref'> }>,
): { selectorHex?: string; method?: string; args: DecodedAppArg[] } {
  const args: DecodedAppArg[] = []
  const list = Array.isArray(appArgsBase64) ? appArgsBase64 : []
  if (list.length === 0) return { args }

  const selectorBytes = base64ToBytes(list[0])
  const selectorHex = bytesToHex(selectorBytes)
  const methodMeta = methodRegistry[selectorHex]
  args.push({
    index: 0,
    type: 'selector',
    rawBase64: list[0],
    rawHex: selectorHex,
    method: methodMeta?.name,
  })

  const abiByteArrayType = algosdk.ABIType.from('byte[]')

  for (let i = 1; i < list.length; i++) {
    const rawBase64 = list[i]
    const bytes = base64ToBytes(rawBase64)
    const declared = methodMeta?.argTypes?.[i - 1]

    if (declared === 'uint64') {
      const n = decodeUint64BE(bytes)
      args.push(n === null ? { index: i, type: 'unknown', rawBase64, rawHex: bytesToHex(bytes) } : { index: i, type: 'uint64', rawBase64, value: n })
      continue
    }
    if (declared === 'address') {
      if (bytes.length === 32) {
        args.push({ index: i, type: 'address', rawBase64, value: algosdk.encodeAddress(bytes) })
      } else {
        args.push({ index: i, type: 'unknown', rawBase64, rawHex: bytesToHex(bytes) })
      }
      continue
    }
    if (declared === 'txn_ref') {
      args.push({ index: i, type: 'txn_ref', rawBase64, value: bytes[0] ?? 0 })
      continue
    }
    if (declared === 'byte[]') {
      try {
        const decoded = abiByteArrayType.decode(bytes) as Uint8Array
        const utf8 = tryDecodeUtf8(decoded) ?? ''
        args.push({ index: i, type: 'byte[]', rawBase64, valueUtf8: utf8, valueHex: bytesToHex(decoded) })
      } catch {
        args.push({ index: i, type: 'unknown', rawBase64, rawHex: bytesToHex(bytes) })
      }
      continue
    }

    // Unknown arg type; still try helpful decodes.
    const asU64 = decodeUint64BE(bytes)
    if (asU64 !== null) {
      args.push({ index: i, type: 'uint64', rawBase64, value: asU64 })
      continue
    }
    if (bytes.length === 32) {
      args.push({ index: i, type: 'address', rawBase64, value: algosdk.encodeAddress(bytes) })
      continue
    }
    const utf8 = tryDecodeUtf8(bytes)
    if (utf8 !== null) {
      args.push({ index: i, type: 'byte[]', rawBase64, valueUtf8: utf8, valueHex: bytesToHex(bytes) })
      continue
    }
    args.push({ index: i, type: 'unknown', rawBase64, rawHex: bytesToHex(bytes) })
  }

  return { selectorHex, method: methodMeta?.name, args }
}

export function decodeLogs(logsBase64: string[] | undefined): DecodedLog[] {
  const logs = Array.isArray(logsBase64) ? logsBase64 : []
  return logs.map((rawBase64, index) => {
    const bytes = base64ToBytes(rawBase64)
    const u64 = decodeUint64BE(bytes)
    if (u64 !== null) return { index, rawBase64, kind: 'uint64', value: u64 }
    const utf8 = tryDecodeUtf8(bytes)
    if (utf8 !== null) return { index, rawBase64, kind: 'utf8', value: utf8 }
    return { index, rawBase64, kind: 'bytes', hex: bytesToHex(bytes) }
  })
}

