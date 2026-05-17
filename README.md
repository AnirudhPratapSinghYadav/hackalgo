# AlgoVault — Humanitarian Ops on Algorand (AlgoHack India 2026)

**Judge story:** Live disaster feed → admin creates USDC campaign → **two distinct approver wallets** sign → CSV disburse → proof tab with real blockchain transaction links.

`VITE_DEMO_STRICT=true` means no fake metrics or seed transaction hashes in the operations UI.

---

## Testnet contracts (do not redeploy for the demo)

| App | ID | Role |
|-----|-----|------|
| DisasterVault | `762592323` | Relief campaigns, approvals, disburse |
| CommunityDonationHub | `762592091` | Community appeals |

Approvers are stored **per campaign** at `create_campaign`. After changing `VITE_DISASTER_APPROVER_*`, always **create a new campaign**.

---

## Quickstart

### 1) Install

```bash
npm install
```

### 2) Environment

```bash
cp .env.example .env
```

Required:

- `VITE_DISASTER_APP_ID=762592323`, `VITE_APPEALS_APP_ID=762592091`
- `VITE_ADMIN_ADDRESS` — operations wallet (Pera #1)
- `VITE_DISASTER_APPROVER_1` and `VITE_DISASTER_APPROVER_2` — **must differ** from admin and each other
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` — for proactive alerts (`npm run services`)
- `GEMINI_API_KEY` — situation briefs (server-only; optional but recommended)
- `GNEWS_API_KEY` — news context for briefs (optional)

**Get `TELEGRAM_CHAT_ID`:** message [@userinfobot](https://t.me/userinfobot) on Telegram; paste the numeric id into `.env`.

Generate approver wallets:

```bash
npm run wallets:generate
```

Fund at [https://bank.testnet.algorand.network](https://bank.testnet.algorand.network). See [docs/DEMO_WALLETS.md](docs/DEMO_WALLETS.md).

### 3) Run (two terminals)

**Terminal 1 — web + event brief API:**

```bash
npm run dev:all
```

**Terminal 2 — Telegram alerts + command bot:**

```bash
npm run services
```

This starts `alert:service` (automatic GDACS + on-chain notifications) and `bot` (responds to `/approve`, `/campaigns`, etc.).

### 4) Pre-demo funding

```bash
npm run fund:humanitarian
npm run optin:usdc
```

---

## Judge demo script (5 steps)

| Step | Action |
|------|--------|
| 1 | Open `http://localhost:5173/` → **Enter Operations** → connect operations wallet at `/access` |
| 2 | **Active Events** — confirm map/table and **Last synced** |
| 3 | Open event drawer — situation brief (or styled fallback if API off) |
| 4 | **Create campaign** → auto-navigate to **Approvals** |
| 5 | Approver 1 + Approver 2 sign → **Release & proof** → CSV disburse → proof tab |

Import all three Pera wallets before going on stage.

---

## Architecture

- **Event brief:** `server/eventBriefHandler.ts` — Vite dev middleware + `npm run start:server` (port `BRIEF_PORT=3001`)
- **Alerts:** `scripts/bot/alertService.ts` — GDACS every 15 min, chain every 2 min → `TELEGRAM_CHAT_ID`
- **Errors:** `src/lib/contractErrorMap.ts` — plain English for all on-chain failures

Savings sandbox routes redirect to `/operations` when `VITE_SHOW_SANDBOX=false`.

---

## Verification

```bash
npm run verify:lora
npm run verify:deployment
```

Full audit: [docs/PRODUCT_STATUS.md](docs/PRODUCT_STATUS.md)
