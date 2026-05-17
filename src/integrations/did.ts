/**
 * DID / Verifiable Credentials — beneficiary identity (ARC-72 ready).
 * Production: anchor credential hash in ASA or app box; verify via ARC-72 composable credentials.
 */

export interface BeneficiaryCredentialMetadata {
  walletAddress: string
  displayName?: string
  region?: string
  kycLevel?: 'none' | 'basic' | 'enhanced'
  issuedAt: string
}

export interface VerifiableCredentialStub {
  id: string
  issuer: string
  subject: string
  metadata: BeneficiaryCredentialMetadata
  /** JWT-like stub — replace with ARC-72 on-chain asset in production */
  jwt: string
}

function b64url(obj: unknown): string {
  return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/** Issue ARC-72-stub JWT credential for demo. */
export async function issueBeneficiaryCredential(
  walletAddress: string,
  metadata: Omit<BeneficiaryCredentialMetadata, 'walletAddress' | 'issuedAt'>,
): Promise<VerifiableCredentialStub> {
  const header = { alg: 'none', typ: 'ARC-72-stub' }
  const payload = {
    sub: walletAddress,
    iss: 'did:algo:algovault-pilot',
    iat: Math.floor(Date.now() / 1000),
    ...metadata,
  }
  const jwt = `${b64url(header)}.${b64url(payload)}.stub-signature-replace-with-arc72`
  return {
    id: `vc:algovault:${walletAddress.slice(0, 12)}:${Date.now()}`,
    issuer: 'did:algo:algovault-pilot',
    subject: walletAddress,
    metadata: { walletAddress, ...metadata, issuedAt: new Date().toISOString() },
    jwt,
  }
}

export function verifyCredential(credential: VerifiableCredentialStub): boolean {
  const parts = credential.jwt.split('.')
  if (parts.length !== 3) return false
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload.sub === credential.subject && parts[2].startsWith('stub-signature')
  } catch {
    return false
  }
}
