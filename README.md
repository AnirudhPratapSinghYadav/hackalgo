# AlgoVault (Algorand) — Proof‑First Savings Vault

AlgoVault is a **live, non‑custodial savings vault** on Algorand. It’s built for one thing: **trust you can verify**.

Every deposit is an **atomic grouped transaction** (Payment + App Call). Savings progress is tracked in **on‑chain local state**. Rules (like milestone thresholds) live in **on‑chain global state**. Withdrawals are executed by the smart contract using **inner transactions**. Milestone badges are **real on‑chain assets**, and every action has a **Lora explorer link**.

If it can’t be verified on-chain, we don’t show it as “real”.

---

## Live deployment

**Production (Vercel):** [https://algohack-phi.vercel.app/](https://algohack-phi.vercel.app/)

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
- `VITE_AGENT_BASE_URL` (recommended; e.g. `https://<your-backend-domain>`)

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

## Guardian AI Agent (Telegram + WhatsApp) — `scripts/agent_service.ts`

This repo includes a production-style “Guardian” agent service:
- **Telegram**: polling bot
- **WhatsApp**: Twilio webhook (`POST /whatsapp`)
- **Gemini**: crisis verification + structured brief output
- **Algorand**: reads vault balances + (when applicable) triggers `agentic_release()` securely
- **Lora**: proof links for verification (tx/app/account)

### Run locally

```bash
npm run agent:service
```

Health endpoints (used by the UI):
- `GET http://localhost:3000/api/agent-status`
- `GET http://localhost:3000/api/audit-log`

### Agent env vars (backend)

Put these in the backend environment (local `.env` or Render/Railway):
- `TELEGRAM_BOT_TOKEN`
- `GEMINI_API_KEY`
- `AGENT_MNEMONIC`
- `APP_ID`
- `ALGOD_SERVER` (default: AlgoNode TestNet)
- `ALGOD_PORT` (default: `443`)
- `ALGOD_TOKEN` (often empty for AlgoNode)
- `PORT` (default: `3000`)

---

## WhatsApp Notes (Twilio) — why it “may not work”

WhatsApp support is real, but it has **external constraints** that can make it look “broken” even when your code is correct.

### Common reasons WhatsApp fails
- **Twilio Sandbox vs Production**:
  - Sandbox requires users to **join** the sandbox first.
  - Production requires your WhatsApp sender/profile to be **approved**.
- **Webhook URL mismatch**:
  - Twilio must be configured to send inbound messages to your server:
    - `https://<your-backend-domain>/whatsapp`
  - If you restart ngrok / change domains and don’t update Twilio, messages go to the old URL.
- **Templates / interactive messages**:
  - “Buttons” in WhatsApp are not free-form like Telegram.
  - Interactive buttons typically require approved templates and specific Twilio APIs.

### What we support reliably (recommended)
- **Clickable payment links** (e.g. `algorand://...`) and proof links (Lora URLs).
- A “one-tap” experience on WhatsApp is best-effort via deep links; true in-chat buttons depend on Twilio/WhatsApp configuration.

### Best UX: Telegram for buttons, WhatsApp for reach
- Telegram supports an inline **button** (URL) that opens the Algorand payment link.
- WhatsApp is kept simple and robust: clear text + links.

---

## Hosting (recommended)

### Frontend on Vercel
1. Import the GitHub repo into Vercel
2. Set env vars:
   - `VITE_APP_ID`
   - `VITE_NETWORK=testnet`
   - `VITE_ALGOD_SERVER`, `VITE_ALGOD_PORT`, `VITE_ALGOD_TOKEN`
   - `VITE_INDEXER_SERVER`, `VITE_INDEXER_PORT`
   - `VITE_GEMINI_API_KEY` (optional)
   - `VITE_AGENT_BASE_URL=https://<your-backend-domain>` (recommended)
3. Deploy

### Backend agent on Render / Railway / Fly
1. Deploy a Node service that runs:
   - `npm install`
   - `npm run agent:service`
2. Set env vars listed in “Agent env vars (backend)”
3. Confirm it’s live:
   - `GET https://<your-backend-domain>/api/agent-status`
4. Configure Twilio WhatsApp webhook:
   - `POST https://<your-backend-domain>/whatsapp`

Important:
- **Lora is not backend hosting**. Lora is used for proof/verification links.

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

