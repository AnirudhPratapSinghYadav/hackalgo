# AlgoVault (Algorand) — Proof‑First Savings Vault

AlgoVault is a **live, non‑custodial savings vault** on Algorand. It’s built for one thing: **trust you can verify**.

Every deposit is an **atomic grouped transaction** (Payment + App Call). Savings progress is tracked in **on‑chain local state**. Rules (like milestone thresholds) live in **on‑chain global state**. Withdrawals are executed by the smart contract using **inner transactions**. Milestone badges are **real on‑chain assets**, and every action has a **Lora explorer link**.

If it can’t be verified on-chain, we don’t show it as “real”.

---

## Story mode (what you’re seeing)

You connect a wallet and opt into the vault app.

From that moment:
- Each time you deposit, your ALGO moves into the app account and your savings total updates **on-chain** in the same atomic group.
- Your streak and milestone level are derived from **local state**, not UI guesses.
- Milestone thresholds come from **global state**, not hardcoded constants.
- When you withdraw, the contract enforces the rules and pays out via **inner transactions**.
- When you claim a badge, the contract mints a real badge asset and we attach readable metadata in the **transaction note** (ARC‑69 style where applicable).

For judges/evaluators, we include a **Protocol Explorer** page that turns “web3 claims” into concrete Algorand primitives you can inspect.

---

## What’s in this repo

### Core pages
- **Dashboard**: live vault totals, milestones, history, actions.
- **Protocol Explorer** (`/protocol`): state tables, decoded groups, decoded app args, notes/logs, inner txns, and box proof.
- **Weekly Report Studio** (`/report`): charts + proof table + PDF export + share actions (all derived from live data).

### Behavioral modules (enabled only if contract supports)
- **Savings Pact** (`/pact`): on-chain parameters + Gemini “Explain this pact”.
- **Temptation Lock** (`/temptation-lock`): on-chain lock config + Gemini “Explain this lock”.
- **Dream Board** (`/dream-board`): stores dream details on-chain (full-pack).

---

## Quickstart

### 1) Install

```bash
npm install
```

### 2) Configure environment

Create `.env` (or configure Vercel env vars) with:
- `VITE_APP_ID`
- `VITE_NETWORK` (`testnet` recommended)
- `VITE_ALGOD_SERVER`, `VITE_ALGOD_PORT`, `VITE_ALGOD_TOKEN`
- `VITE_INDEXER_SERVER`, `VITE_INDEXER_PORT`
- `VITE_GEMINI_API_KEY` (optional; UI falls back gracefully without it)

Important:
- **Do not set** `VITE_APP_ADDRESS`. The app address is always derived from the App ID.

### 3) Run

```bash
npm run dev
```

### 4) Build (Vercel readiness)

```bash
npm run build
```

---

## Demo script (2–3 minutes)

1. **Connect wallet** (Pera recommended).
2. **Opt-in** to the vault app (tx link appears).
3. **Deposit** 1–2 ALGO:
   - open the **Lora group link**
   - show the Payment + App Call are in the same atomic group
4. Open **Protocol Explorer** (`/protocol`):
   - show decoded **global milestones**
   - show decoded **local state** (`user_total`, `user_streak`, `user_milestone`)
   - show decoded **notes as JSON**
   - show **inner txns** for withdraw/badge
   - show **boxes proof** (“verified none” or a list)
5. **Withdraw** a small amount:
   - open Lora and show the **inner payment**
6. Open **Weekly Report Studio** (`/report`):
   - show proof table links + download PDF + share

---

## Where the “truth” lives (technical)

- **Network configuration (single source)**: `src/services/networkConfig.ts`
- **All chain interactions**: `src/services/algorand.ts`
- **Decoding utilities** (args/logs/notes/state): `src/utils/algorandDecode.ts`
- **Protocol Explorer UI**: `src/pages/ProtocolExplorer.tsx`

---

## Full A→Z build report

See `report.md` for:
- complete architecture + feature mapping
- every module + file map
- Lora proof paths
- PPT outline + recording checklist

