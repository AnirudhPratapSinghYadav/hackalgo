interface Props {
  vaultName: string
  purpose: string
  goalAlgo: number
  savedAlgo: number
  appId: number
  onClose: () => void
}

export default function QRClaimCard({ vaultName, purpose, goalAlgo, savedAlgo, appId, onClose }: Props) {
  const progressPct = goalAlgo > 0 ? Math.min(100, (savedAlgo / goalAlgo) * 100) : 0
  // QR should be usable for *verification*. Embed a Lora app link + human-readable fields.
  const loraAppUrl = `https://lora.algokit.io/testnet/application/${appId}`
  const qrPayload = [
    `AlgoVault Guardian Vault`,
    `Vault: ${vaultName}`,
    `Purpose: ${purpose}`,
    `App ID: ${appId}`,
    `Verify: ${loraAppUrl}`,
    goalAlgo > 0 ? `Goal: ${goalAlgo} ALGO` : '',
  ].filter(Boolean).join(' | ')
  const qrData = encodeURIComponent(qrPayload)
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}&bgcolor=ffffff&color=1e1b4b`

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        {/* THE CARD */}
        <div className="bg-white rounded-2xl overflow-hidden shadow-2xl print:shadow-none" id="qr-claim-card">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#2563EB] to-[#7c3aed] px-6 py-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              <span className="text-xs font-bold text-white/60 uppercase tracking-wider">AlgoVault</span>
            </div>
            <h3 className="text-white font-bold text-xl">{vaultName}</h3>
            <p className="text-white/60 text-sm">{purpose}</p>
          </div>

          {/* QR Code */}
          <div className="px-6 py-6 flex flex-col items-center">
            <div className="w-48 h-48 rounded-xl border-2 border-gray-100 overflow-hidden mb-4 flex items-center justify-center bg-white">
              <img
                src={qrUrl}
                alt="QR Claim Code"
                className="w-44 h-44"
                loading="lazy"
              />
            </div>

            <p className="text-sm font-semibold text-gray-900 mb-1">Scan to claim when eligible</p>
            <p className="text-xs text-gray-500 text-center leading-relaxed mb-4">
              This QR code links to the guardian vault on Algorand. The beneficiary can use it to access or verify the fund.
            </p>

            {/* Progress */}
            {goalAlgo > 0 && (
              <div className="w-full">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="font-medium text-gray-600">{savedAlgo.toFixed(2)} ALGO saved</span>
                  <span className="font-medium text-gray-400">{goalAlgo.toFixed(0)} ALGO goal</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                </div>
                <p className="text-xs text-gray-400 mt-1 text-center">{progressPct.toFixed(0)}% complete</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-400">
                <span className="font-mono">App ID: {appId}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Algorand Testnet
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2.5 mt-4 print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 bg-white text-gray-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
          >
            Print Card
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gradient-to-r from-[#2563EB] to-[#7c3aed] text-white text-sm font-semibold rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
