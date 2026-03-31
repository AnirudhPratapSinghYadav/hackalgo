# AlgoVault — Full Hackathon Build Report (A→Z)

This document is your **single source of truth** for preparing a **demo script, video narration, and PPT**. It lists **every real feature**, **how it works on Algorand**, **where it lives in the code**, and **how to prove it on Lora**.

---

## 0) Project identity (what we built)

**Product**: AlgoVault — a live, on-chain, non-custodial savings and behavioral-protection platform on Algorand.  
**Core promise**: **Everything visible is derived from chain state, indexer data, wallet state, or confirmed tx results.**  
**Proof model**: Every action has a **Lora explorer link**, and a dedicated **Protocol Explorer** page explains the exact Algorand primitives used.

**Network**: TestNet  
**App ID**: `758024719` (from `.env`)  
**Algod**: `https://testnet-api.algonode.cloud`  
**Indexer**: `https://testnet-idx.algonode.cloud`  

---

## 1) Architecture at a glance

### Data sources (strict)
- **Wallet**: `@txnlab/use-wallet-react` (Pera + Defly)
- **Algod** (state reads + confirmations): global/local state, app info, pending txn, boxes
- **Indexer** (history/analytics): transaction history, grouped activity, report datasets
- **Explorer**: Lora links for tx/group/app/account/asset proofs
- **AI (Gemini)**: explanations only; **never invents numbers** (uses chain-backed context)

### Algorand primitives used (mapping)
| Feature | Primitive | Storage | Tx Type / Shape | Proof on Lora |
|---|---|---|---|---|
| Opt-in | App opt-in | Local state allocation | `appl` opt-in | Tx link |
| Deposit | **Payment + App Call** | Local state update | **Atomic group** (2 txns) | **Group link** |
| Withdraw | App Call + **inner payment** | Local state update | `appl` + inner tx | Tx + inner tx |
| Milestones | Global state | `milestone_1/2/3` uint64 | read-only | Protocol Explorer tables |
| Streak | Local state | `user_streak` uint64 | updated on deposit | State tables + transitions |
| Badges | Contract inner ASA mint | Asset | `appl` + inner AssetConfig/Transfer | Asset + mint tx |
| Notes (JSON) | Tx note bytes | n/a | attached to txns | note panel (pretty JSON) |
| Boxes | App boxes (if used) | box key/value bytes | box ops | boxes proof panel |

---

## 2) Wallet + network stack (mobile-safe)

### What we enforce
- **WalletConnect removed** completely (reliability + evaluator simplicity).
- Wallet network and explorer network are derived from the same config (no mismatches).

### Where
- `src/main.tsx`: `WalletManager` with `[WalletId.PERA, WalletId.DEFLY]`
- `src/services/networkConfig.ts`: derives:
  - `walletNetworkId`
  - algod/indexer endpoints
  - Lora network segment

---

## 3) No hardcoding rule (milestones + UI truth)

### What was fixed
Hardcoded milestone thresholds like `10 / 50 / 100` were removed across the product. Milestones are now **strictly** loaded from Algorand **global state** keys:
- `milestone_1`
- `milestone_2`
- `milestone_3`

If milestones are missing or invalid on-chain, the UI shows a clear **loading/error state** and **does not fall back** to fake constants.

### Where
- **Source of truth**: `src/services/algorand.ts`
  - `getGlobalStats()` returns `{ milestones: { m1, m2, m3 } }` from global state
  - `getMilestonesFromGlobalState()` for reuse
- **Consumers**:
  - `src/pages/Dashboard.tsx` (progress + milestone UI + chatbot context)
  - `src/components/ProgressJourney.tsx` (journey thresholds)
  - `src/components/MilestoneCard.tsx` (badge unlock thresholds)
  - `src/report/*` (weekly report milestone progress)

---

## 4) Opt-in (required for local state)

### What it does
Opt-in creates the user’s local state entry for the application, enabling on-chain tracking.

### How it works on-chain
- **Transaction**: Application opt-in (`appl` opt-in)
- **Note**: structured JSON note is attached for human readability on Lora

### Where
- `src/services/algorand.ts` → `optInToVault()`

### Proof on Lora
- The tx exists under the user wallet history and targets the App ID `758024719`
- Note panel shows JSON (in Protocol Explorer, it renders pretty JSON when available)

---

## 5) Deposit (atomic group: payment + app call)

### What it does
Deposits ALGO into the vault and updates the user’s on-chain local state.

### How it works on-chain (critical)
This is an **atomic group** of 2 transactions:
1. **Payment**: user → app address, amount = deposit
2. **App Call**: user → app id, ARC-4 selector + args (references payment by index)

If either fails, both fail.

### Where
- `src/services/algorand.ts` → `depositToVault()`
- UI entrypoint: `src/components/DepositForm.tsx`

### Proof on Lora
- Open the **group link**: it shows both txns with same group id
- The payment receiver is the **derived app address** (`algosdk.getApplicationAddress(APP_ID)`), not hardcoded
- Notes are JSON and readable in Protocol Explorer

---

## 6) Withdraw (contract-controlled, inner tx visible)

### What it does
Withdraws ALGO from the vault under smart contract rules.

### How it works on-chain
- **Outer tx**: App call (`appl`) by user to contract method `withdraw(...)`
- **Inner tx**: contract sends ALGO via **inner payment** (app → user)

### Compatibility hardening (important)
The app supports:
- **Full-pack contract** selector for withdraw (with penalty sink arg)
- **Legacy minimal** selector fallback for older deployments (detects on-chain TEAL and switches)

### Where
- `src/services/algorand.ts` → `withdrawFromVault()` + `detectContractMode()`
- UI: `src/components/WithdrawForm.tsx`

### Proof on Lora
- Withdraw tx exists as app call
- Inner transaction appears under that tx on Lora (payment from app)

---

## 7) Local state (per-wallet truth)

### What we track (examples)
From local state we read keys like:
- `user_total` (microALGO)
- `user_streak`
- `user_milestone`
- `last_deposit`
Plus (full-pack): lock/dream settings in local state.

### How we read it (consistency rule)
All local state reads were standardized to:
- `algod.accountInformation(address)` → parse `apps-local-state`

### Where
- `src/services/algorand.ts` → `getUserStats()`, `getUserExtraState()`, `isOptedIn()`

---

## 8) Global state (app-wide truth)

### What we track (examples)
- `milestone_1/2/3` (microALGO thresholds)
- total deposit metrics and other rules/flags exposed via `getGlobalStats()`

### Where
- `src/services/algorand.ts` → `getGlobalStats()` and global-state decoding helpers

---

## 9) Streak tracking (on-chain)

### What it is
Deposit streak is tracked as a **uint64 in local state** and displayed in UI.

### Where
- `src/services/algorand.ts` → `getUserStats()` returns `streak`
- UI: Dashboard + stats cards

### Proof
Protocol Explorer shows:
- local state `user_streak`
- before/after transitions for specific rounds (state transition engine)

---

## 10) Milestone badges (real assets + ARC-69 + uniqueness)

### What it does
Users mint milestone badges as **real Algorand assets (ASA)** controlled by the contract (minted by inner transactions).

### ARC-69 metadata requirement (critical)
Badge mints/claims include a JSON note using ARC-69 conventions, e.g.:
```json
{
  "standard": "arc69",
  "description": "Vault Starter Badge",
  "properties": {
    "wallet": "<address>",
    "milestone": 1,
    "vault_type": "<type>",
    "earned_date": "<timestamp>"
  }
}
```

### Unique per wallet
- Deterministic badge SVG generation for UI (seeded by wallet + milestone)
- Identity also persisted in tx note so it’s visible on-chain

### Where
- Badge claim + tx note: `src/services/algorand.ts` (badge claim flow)
- UI: `src/components/MilestoneCard.tsx` (badge vault + claim UI)
- Decode utilities: `src/utils/algorandDecode.ts` (ARC-69 + JSON decode)

### Proof on Lora
- Badge claim tx has:
  - ARC-69 JSON in note
  - inner asset mint/config visible
- Asset link shows creator and supply consistent with badge design (1 total, 0 decimals where used)

---

## 11) History (Indexer-backed, explorer-linked)

### What it does
Shows live transaction history derived from indexer (not mocked).

### Enhancements implemented
- Group awareness (group id + group size)
- Decoded method selector where possible
- Every row has Lora link(s)
- Performance: deferred fetch and memoization to keep UI responsive

### Where
- `src/services/algorand.ts` → history fetch + enrichment
- `src/components/TransactionHistory.tsx` → UI with group drawer/modal

---

## 12) Protocol Explorer (the judge-proof page)

### Why it exists
To make every feature **auditable** and **explainer-grade**:
- shows which primitive/storage/tx type each feature uses
- shows decoded state tables
- shows decoded tx groups and inner txns
- decodes app args selectors, logs, and notes
- provides box proof (used/not used)

### Where
- Route: `src/App.tsx` → `/protocol`
- UI: `src/pages/ProtocolExplorer.tsx`
- Decode helpers: `src/utils/algorandDecode.ts`
- Data helpers: `src/services/algorand.ts` (`getGlobalStateTable`, `getLocalStateTable`, `getProtocolTransactions`, `getBoxProof`, etc.)

### “Boxes don’t appear” (final behavior)
The page explicitly shows:
- **“This contract does not use boxes (verified)”** if `getApplicationBoxes()` returns empty.
If boxes exist, it lists them with decoded key/value previews.

### Notes as JSON (human readable)
If a note decodes to JSON, Protocol Explorer renders it as pretty JSON.

---

## 13) Weekly Savings Report Studio (live analytics + proof + PDF + share)

### What it does
A mobile-first report module derived only from live chain/indexer data:
- graphs (based on confirmed txns/state)
- transaction proof table with explorer links
- PDF download built from live data at time of export
- share actions (copy/share/WhatsApp deep link)

### Where
- `src/report/WeeklySavingsReport.tsx`
- `src/report/reportData.ts`
- `src/report/reportCharts.tsx`
- (PDF/share utilities under `src/report/*` as implemented)

---

## 14) Behavioral modules (full-pack only, safely gated)

These are enabled only if the deployed contract supports them (capability detection prevents broken UI paths).

### Savings Pact
- UX hardened: no stuck “pending”
- Gemini Pact Guide panel: explains from real parameters (no fake)
- Where: `src/pages/SavingsPact.tsx`, `src/services/algorand.ts`, `src/services/aiService.ts`

### Temptation Lock
- Local-state backed config
- Gemini Lock Summary panel added
- Where: `src/pages/TemptationLock.tsx`, `src/services/algorand.ts`, `src/services/aiService.ts`

### Dream Board
- Stores URI + title via app call
- Now includes JSON note on tx for Lora readability
- Where: `src/pages/DreamBoard.tsx`, `src/services/algorand.ts`

---

## 15) “Lora perfect” rule (JSON notes everywhere)

### What we did
We attach structured JSON notes to transactions we construct so explorer viewers can read intent quickly. This includes:
- opt-in
- deposit (both txns in group)
- withdraw
- pact create / penalty
- lock enable / disable
- dream board set
- badge claim (ARC-69 note)

### Where
- `src/services/algorand.ts` → `buildActionNote(...)` + applied to txn construction sites
- Protocol Explorer renders JSON notes as formatted JSON blocks

---

## 16) Performance + UX hardening (mobile-first)

### Problems solved
- “0 → real value after 5–6s” perception improved by:
  - explicit loading states/skeletons (no fake zeros)
  - memoizing heavy components (`React.memo`)
  - stabilizing props (`useMemo`)
  - caching/deduping Algod reads (10s TTL)
  - deferring indexer history fetch slightly to avoid blocking first render

### Where
- UI pages: `src/pages/Dashboard.tsx`, `src/pages/CommunityReserve.tsx`, `src/pages/GuardianVault.tsx`, `src/pages/DreamBoard.tsx`, `src/pages/TemptationLock.tsx`, etc.
- Heavy components: `src/components/TransactionHistory.tsx`, `src/components/ProgressJourney.tsx`
- Cache layer: `src/services/algorand.ts`

---

## 17) Environment + deployment (Vercel readiness)

### Environment variables (frontend)
From `.env`:
- `VITE_APP_ID=758024719`
- `VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud`
- `VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud`
- `VITE_NETWORK=testnet`
- `VITE_GEMINI_API_KEY=...`

### Rules enforced
- **Never set** `VITE_APP_ADDRESS` (app address must be derived)
- Build must pass cleanly (`npm run build`)

---

## 18) Demo script (recording checklist)

### Segment A — Connect + Opt-in (20–30s)
1. Open app, connect **Pera**.
2. If prompted, click **Opt-in**.
3. Open the **Lora tx link** and show:
   - app id is `758024719`
   - note JSON is readable (Protocol Explorer also shows pretty JSON)

### Segment B — Deposit (30–45s)
1. Deposit a small amount (e.g., 1–2 ALGO).
2. Open **Lora group link**:
   - Tx 1: payment user → app address
   - Tx 2: app call with selector (deposit)
3. Back in UI: total saved updates from on-chain local state.

### Segment C — Protocol Explorer proof (45–60s)
1. Open `/protocol`.
2. Show:
   - global milestones table (no hardcoded thresholds)
   - local state table
   - grouped tx breakdown
   - notes rendered as JSON
   - boxes section (“verified none” or count)

### Segment D — Badge claim (30–45s)
1. If milestone reached, claim a badge.
2. Open Lora:
   - show ARC-69 JSON note
   - show asset/inner txn proof

### Segment E — Withdraw (20–30s)
1. Withdraw a small amount.
2. Open Lora:
   - app call
   - inner payment

### Segment F — Weekly Report (30–45s)
1. Open report.
2. Show charts + proof table (all rows link to Lora).
3. Download PDF and open it briefly.
4. Tap share/copy/WhatsApp.

### Optional — Behavioral tools (60–90s)
- Savings Pact “Explain this pact” (Gemini)
- Temptation Lock “Explain this lock” (Gemini)
Emphasize: explanations use real values; enforcement is on-chain.

---

## 19) PPT outline (slide-by-slide)

1. **Problem**: building a consistent savings habit needs accountability + transparency.
2. **Solution**: AlgoVault = non-custodial savings vault + proof-first UX.
3. **Why Algorand**: fast finality, low fees, local/global state, atomic groups, inner txns, ASAs.
4. **Architecture**: Wallet → atomic deposit group → on-chain state → indexer history → Lora proof.
5. **Core flows**: opt-in, deposit, withdraw, milestones, badges, history.
6. **Trust layer**: Protocol Explorer (state tables, groups, inner txns, logs/notes, boxes proof).
7. **Report Studio**: live analytics + PDF + share, derived from real chain data.
8. **Mobile readiness**: Pera-first, no WalletConnect, loading/error states, performance hardening.
9. **Proof slide**: screenshots of Lora group, ARC-69 note JSON, inner txn, asset link.
10. **Close**: what’s next (split bill / guardian/community expansions if desired).

---

## 20) File map (quick reference)

- Wallet/network:
  - `src/main.tsx`
  - `src/services/networkConfig.ts`
- Blockchain service + proof helpers:
  - `src/services/algorand.ts`
  - `src/utils/algorandDecode.ts`
- Core UX:
  - `src/pages/Dashboard.tsx`
  - `src/components/DepositForm.tsx`
  - `src/components/WithdrawForm.tsx`
  - `src/components/TransactionHistory.tsx`
  - `src/components/ProgressJourney.tsx`
  - `src/components/MilestoneCard.tsx`
- Protocol Explorer:
  - `src/pages/ProtocolExplorer.tsx`
  - `src/App.tsx` (route)
- Behavioral tools:
  - `src/pages/SavingsPact.tsx`
  - `src/pages/TemptationLock.tsx`
  - `src/pages/DreamBoard.tsx`
  - `src/services/aiService.ts` (Gemini explanations)
- Report Studio:
  - `src/report/WeeklySavingsReport.tsx`
  - `src/report/reportData.ts`
  - `src/report/reportCharts.tsx`

---

## 21) Brutal honesty: what judges can verify in 60 seconds

If a judge does only this, they’ll still see it’s real:
1. Make one deposit.
2. Open Lora group link → see payment + app call grouped.
3. Open `/protocol` → see decoded global/local state and decoded note JSON.
4. Withdraw → see inner payment.

