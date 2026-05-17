/**
 * Falcon (post-quantum) signatures — long-term disbursement record integrity.
 * Production: ML-DSA / Falcon in secure enclave; public key on-chain.
 */

export interface FalconSignatureStub {
  algorithm: 'falcon-stub-v1'
  manifestHash: string
  signature: string
}

function hashManifest(parts: string[]): string {
  let h = 0
  const s = parts.join('|')
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h.toString(16).padStart(8, '0')
}

/** Sign disbursement manifest (stub — not post-quantum secure). */
export function signDisbursementManifest(
  campaignId: number,
  beneficiaries: string[],
  amountsMicro: number[],
): FalconSignatureStub {
  const manifestHash = hashManifest([
    String(campaignId),
    ...beneficiaries,
    ...amountsMicro.map(String),
  ])
  return {
    algorithm: 'falcon-stub-v1',
    manifestHash,
    signature: btoa(`falcon-stub:${manifestHash}:${Date.now()}`),
  }
}

export function verifyFalconSignature(sig: FalconSignatureStub, _campaignId: number): boolean {
  return sig.algorithm === 'falcon-stub-v1' && sig.manifestHash.length > 0 && sig.signature.length > 8
}
