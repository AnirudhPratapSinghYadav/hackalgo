# AlgoVault — AlgoBharat Ecosystem Integrations

| Integration | Status | Justification |
|-------------|--------|---------------|
| **Pera / use-wallet** | ✅ Implemented | Wallet connect + `signTransactions` in `src/services/algorand.ts` |
| **Gora Oracle** | 🟡 Stubbed | `src/integrations/gora.ts` — GDACS live feed today; swap to Gora API with `VITE_GORA_API_KEY` |
| **DID / Verifiable Credentials** | 🟡 Stubbed | `src/integrations/did.ts` — ARC-72 / VC anchoring planned Phase 2 |
| **Falcon (post-quantum)** | 🟡 Stubbed | `src/integrations/falcon.ts` — interface for long-term record signatures |
| **DisasterVault (native)** | ✅ Implemented | PuyaPy contract + `src/integrations/disasterVaultChain.ts` |
| **Tinyman** | 🔴 Not needed | No AMM/swaps on humanitarian disbursement rail |
| **Folks Finance** | 🔴 Not needed | No lending on relief vault |
| **Wormhole** | 🔴 Not needed | Single-chain Algorand scope for Round 3 |
| **Saber** | 🔴 Not needed | Non-Algorand AMM |
| **X-Chain Wallet** | 🔴 Not needed | Pera covers testnet wallet UX |
| **Haystack** | 🟡 Stubbed | Discovery optional; see `ecosystemStubs.ts` |

## Feature flag

Set `VITE_USE_REAL_CONTRACT=true` and `VITE_DISASTER_APP_ID` to route `platformStore` on-chain actions through the integration layer. Mock/demo store paths remain for UI development.

## Deploy

```bash
npx tsx scripts/deploy_disaster_vault.ts
```

Requires `DEPLOYER_MNEMONIC` in `.env`.

## Omnichannel bot (Telegram + WhatsApp)

Run: `npm run bot`

| Command | Description |
|---------|-------------|
| `/subscribe flood` | GDACS disaster alerts by type/region |
| `/list` `/campaign <id>` | Live DisasterVault reads |
| `/register` `/verify` `/approve` | Approver auth + Pera deeplink |
| `/donate <id> <usdc>` | Unsigned USDC donate group for Pera |
| `!appeal "title" amount addr` | On-chain appeal via `BOT_MNEMONIC` |

Webhook: `POST /bot/whatsapp` (Twilio). Test locally with `ngrok http 3000`.
