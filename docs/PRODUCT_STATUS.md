# AlgoVault — Full product status (brutal audit)

**Last updated:** May 2026  
**Repo:** `E:\algblo`  
**Reference plan:** `ops_product_hardening_66918430.plan.md` (Cursor plan — Ops Product Hardening)

---

## 1. What is this product? (The aim)

AlgoVault is a **humanitarian aid operations platform** on **Algorand testnet**, aimed at NGO / disaster operators (WHO/OCHA-aligned workflows in copy only — **not** an official UN partnership).

**Core promise in the product narrative:** compress the time between **disaster detection** and **verified USDC reaching beneficiaries**, using:

1. **Live disaster signals** (primarily GDACS)
2. **On-chain institutional campaigns** (DisasterVault — USDC, multi-approver)
3. **Community ALGO appeals** (CommunityDonationHub — individual emergencies)
4. **Optional alerts** (Telegram bot / WhatsApp deep links)
5. **Public proof** (Lora Explorer + indexer-backed transaction tables)

**Secondary / legacy layer:** **Savings Guardian** (`VITE_APP_ID`) — personal ALGO savings vault, milestones, Guardian AI chat — hidden behind `VITE_SHOW_SANDBOX=false` by default. The **pitch story** is humanitarian ops; savings is a sandbox demo.

---

## 2. Architecture (three on-chain apps + frontend)

| App | Env var | Your `.env` value | Role |
|-----|---------|-------------------|------|
| **Savings Guardian** | `VITE_APP_ID` | `758811663` | Personal savings, badges, deposit/withdraw (sandbox) |
| **DisasterVault** | `VITE_DISASTER_APP_ID` | `762592323` | USDC disaster campaigns, approvals, disburse |
| **Community appeals** | `VITE_APPEALS_APP_ID` | `762592091` | ALGO appeals, admin approve, donate, withdraw |

**Network:** Algorand **testnet** via AlgoNode (`VITE_ALGOD_*`, `VITE_INDEXER_*`).

**Frontend:** React 18 + Vite + TypeScript + Zustand (persisted) + `@txnlab/use-wallet-react` (Pera, Defly).

**“Backend” in this repo:** There is **no separate production API server** for the main UI. Runtime pieces:

| Piece | What it does | Runs when |
|-------|----------------|-----------|
| **Vite dev server** | Serves React; middleware for `/api/event-brief`, `/api/disaster-intel` | `npm run dev` |
| **GDACS proxy** | `/gdacs-api` → `gdacs.org` | Dev proxy in `vite.config.ts` |
| **Browser → Indexer** | Reads txs, app state, proof table | Ops pages |
| **Browser → Algod** | Submits signed txs via Pera | Create campaign, approve, disburse, appeals |
| **`npm run bot`** | Telegram bot + GDACS poller + optional chain listener | Separate Node process |
| **`npm run agent:service:DISABLED`** | Legacy Guardian agent — **do not run**; use `npm run bot` only |

Production deploy would need Vite middleware routes reimplemented (Vercel serverless, etc.) or a small Express host.

---

## 3. The plan — what it asked for vs what we did

Source: **Ops Product Hardening** plan (all todos marked completed in plan file).

### 3.1 Done as planned (or substantially)

| Plan item | Status | Notes |
|-----------|--------|-------|
| Fix campaign workflow (`approval_pending` after create, sync from chain) | ✅ | `platformStore.linkEventOnChainCampaign`, `syncEventCampaignFromChain` |
| Verification queue filters chain status **1** only | ✅ | `Verification.tsx` |
| Merge Audit + Beneficiaries into Disbursements tabs | ✅ | Release + Payment proof; nav renamed “Release & proof” |
| `api/event-brief` + Gemini + GNews | ✅ | Vite plugin in `vite.config.ts` (dev only unless ported) |
| Event detail drawer on Active Events | ✅ | `EventDetailDrawer.tsx` |
| Map `?focus=` deep link | ✅ | `MapView.tsx` |
| `loraHumanReadable` + `LoraProofCard` | ✅ | Settings, disburse proof, community cards |
| Remove pilot/live banners from ops | ✅ | Copy toned down; legal in Settings collapse |
| Settings WHO/OCHA + alert channels UI | ✅ | `HumanitarianStandardsPanel`, `AlertChannelsPanel` |
| Contract hardening + `bootstrap_humanitarian.ts` | ✅ | `contract.py` asserts; script exists |
| Community feed images + UX | ✅ | `crisisImages.ts`, `AppealFeedCard` |
| Indexer-only proof (no fake audit rows in strict mode) | ✅ | `fetchLedgerProofRecords`, `VITE_DEMO_STRICT=true` |
| GDACS map coordinate fix | ✅ | `gdacsGeometry`, `gdacsAlertLevel`, persist migrate v2/v3 |
| NaN% confidence fix | ✅ | GDACS `Green`/`alertscore` mapping |

### 3.2 Partially done / diverged

| Plan item | Reality |
|-----------|---------|
| **15-minute backend cron** for GDACS | **Not** a standalone cron in the web app. GDACS loads on **app bootstrap** + manual **Refresh events** + **bot** `gdacsPoller` if `npm run bot` is running. |
| **GNews in README only** | `VITE_GNEWS_API_KEY` optional; brief works without it (fallback summary). |
| **Simplify Settings to 3 panels only** | Settings has wallet, Lora, fund addresses, field alerts, WHO/OCHA, apps explainer, legal — **more than 3 panels**. |
| **Remove Gemini bot completely** | Gemini removed from **ops bot path**; still used for **event-brief** API and Dashboard AI chat / `agent:service`. |
| **Single unified app ID** | Explicitly **out of scope** in plan — still 3 apps, explained in `AppsExplainer`. |
| **Beneficiaries page** | Route **redirects** to Disbursements; file may still exist but not in nav. |

### 3.3 Not in plan but built

- Cinematic **Landing** scroll story (`Landing.tsx`)
- **Access** page (`/access`) for ops wallet gate
- Persist migrations for stale GDACS pins and NaN confidence
- `fund:humanitarian`, `verify:deployment` scripts
- Premium ops tokens / Pera “waiting” UX

---

## 4. Landing page — why it was “invisible” and fix

**The landing was never deleted.** Route `/` → `Landing.tsx` (~640 lines, story acts, SDGs, wallet gateway).

**Root cause (fixed in this pass):** `ChainBootstrapGate` used `useLocation()` **outside** `<BrowserRouter>`. That breaks React Router hooks — the gate could not detect `/` as a public route and either errored or blocked the tree.

**Earlier issue:** Gate showed “Loading live chain…” for **all** routes including `/` until bootstrap finished.

**Fix applied:**

1. `ChainBootstrapGate` moved **inside** `BrowserRouter` in `AppRouter.tsx`.
2. Public routes (`/`, `/access`, `/about`, `/protocol`, `/legal/*`) **skip** the loading blocker.

**How to see it:**

1. Open **`http://localhost:5173/`** (not `/operations`, not `/dashboard` — those redirect to ops).
2. **Hard refresh** (Ctrl+Shift+R).
3. If dev server was started before the fix, restart: `npm run dev`.

---

## 5. Is the user wallet hardcoded?

**No — the connected wallet is whatever you connect in Pera/Defly.**

**Yes — several *roles* are hardcoded via `.env` addresses:**

| Concept | Env | Your value | Meaning |
|---------|-----|------------|---------|
| **Campaign admin** (only wallet that can `create_campaign`) | `VITE_ADMIN_ADDRESS` | `PG5A366S…UNY2A` | Must match on-chain DisasterVault admin after bootstrap |
| **Approvers** (can `submit_approval`) | `VITE_DISASTER_APPROVER_0..2` | Same address 3× | Contract needs **distinct** approvers for threshold 2 — **operational bug if all identical** |
| **Appeals admin** | `VITE_ADMIN_ADDRESS` | Same | `admin_approve` on appeals hub |

**Implication:** You must **connect Pera as `VITE_ADMIN_ADDRESS`** to create campaigns. Any other wallet sees “Wrong wallet” / disabled Create — **by design**, not a UI bug.

**Demo mode:** “Demo Access” on landing clears wallet and sets demo role — **does not** bypass admin for real on-chain `create_campaign`.

---

## 6. Hardcoded / env-driven behavior (strict list)

### 6.1 Environment variables (`.env`)

```env
# On-chain apps
VITE_APP_ID=758811663
VITE_DISASTER_APP_ID=762592323
VITE_APPEALS_APP_ID=762592091
VITE_USE_REAL_CONTRACT=true
VITE_DEMO_STRICT=true                    # No seed fake data; empty + live only
VITE_ADMIN_ADDRESS=PG5A366S…           # Admin + approver role
VITE_DISASTER_APPROVER_0/1/2=…         # Same address in your file
VITE_STABLECOIN_ASSET_ID=31566704        # Testnet USDC
VITE_NETWORK=testnet
VITE_ALGOD_* / VITE_INDEXER_*

# Alerts (frontend display + wa.me / t.me links)
VITE_TELEGRAM_BOT_USERNAME=AlgoVault_Guardian_bot
VITE_TWILIO_WHATSAPP_NUMBER=+14155238886

# AI (server middleware + optional client)
VITE_GEMINI_API_KEY=…
# Optional: VITE_GNEWS_API_KEY, VITE_GORA_API_KEY, VITE_SHOW_SANDBOX=true

# Campaign defaults (if unset in UI)
VITE_CAMPAIGN_EXPIRY_ROUNDS=2000000      # default in Events.tsx
VITE_CAMPAIGN_TARGET_MICRO_USDC=10000000 # 10 USDC default target
```

**Secrets in `.env` (never commit):** `TELEGRAM_BOT_TOKEN`, `AGENT_MNEMONIC`, Twilio tokens — used only by `npm run bot` / `agent:service`.

### 6.2 Hardcoded in source (not from env)

| Item | Location | Value / behavior |
|------|----------|------------------|
| Landing story images | `Landing.tsx` `DOC.*` | Wikimedia Commons URLs |
| Local landing assets (unused in main story) | `public/images/landing/*.jpg` | Referenced in `landingImages.ts` but story uses Wikimedia |
| Default USDC asset | `disasterVaultChain.ts` | `31566704` if env missing |
| Confidence formula | `gdacsAlertLevel.ts` | `55 + tier*12`, max 95 |
| Ops strict empty state | `emptyPlatformState` | When `VITE_DEMO_STRICT=true` |
| Sandbox routes | `AppRouter.tsx` | Only if `VITE_SHOW_SANDBOX=true` |
| `/dashboard` redirect | Router | → `/operations` |
| Legacy `/lab/*` | Router | → `/sandbox/*` |

### 6.3 Persisted in browser (localStorage)

| Key | Content |
|-----|---------|
| `algovault-platform-v1` | Crises, events, donations, campaigns, session (migrate v3 strips bad coords/confidence) |
| `algovault-ops` | Demo mode flag |

---

## 7. Feature map — every major surface

### 7.1 Public narrative

| Route | Page | What it does |
|-------|------|----------------|
| `/` | **Landing** | Scroll story, stats, protocol steps, SDGs, institutional links, Pera/Defly/Demo → `/operations` |
| `/access` | **Access** | Wallet connect / demo for ops |
| `/about`, `/protocol` | Marketing / protocol copy |
| `/legal/*` | Terms, privacy, disclaimers (testnet pilot language) |

### 7.2 Community (public)

| Route | What it does |
|-------|----------------|
| `/community/feed` | Appeal cards, donate CTA, filters |
| `/community/campaigns` | Campaign list view |
| `/community/crises` | Crisis list |
| `/community/crises/:id` | Crisis detail |
| `/submit-crisis` | Submit appeal on-chain (`create_appeal`) |
| `/crisis/:id/donate`, `/appeal/:id/donate` | Donate ALGO |
| `/appeal/:id/withdraw` | Beneficiary withdraw |
| `/verify-crisis/:id` | Verifier flow |

### 7.3 Operations (institutional — wallet or demo required)

| Route | What it does |
|-------|----------------|
| `/operations` | Command center overview |
| `/operations/events` | GDACS incidents, create DisasterVault campaign, drawer + brief |
| `/operations/verification` | `submit_approval` queue (status 1 on chain) |
| `/operations/community-queue` | Approve/reject community appeals |
| `/operations/disbursements` | **Release:** CSV beneficiaries + disburse; **Proof:** indexer + Lora |
| `/operations/map` | Leaflet map, GDACS pins, `?focus=` |
| `/operations/settings` | Wallet, Lora links, fund addresses, Telegram/WhatsApp cards, WHO/OCHA |

Redirects: `/operations/beneficiaries` → disbursements; `/operations/audit` → disbursements?tab=proof.

### 7.4 Sandbox (hidden unless `VITE_SHOW_SANDBOX=true`)

| Route | What it does |
|-------|----------------|
| `/sandbox/savings` | Original savings Dashboard |
| `/sandbox/vault/guardian`, `/community`, `/pact`, etc. | Savings gamification |
| `/internal/explorer` | Protocol explorer |

---

## 8. End-to-end flows (planned vs actual)

### Phase 1 — Detection & campaign creation

| Step | Plan | Actual |
|------|------|--------|
| Cron every 15m GDACS | Backend cron | Bootstrap on load + manual refresh + optional bot poller |
| Store in `platformStore` | ✅ | `replaceGdacsDisasterEvents` / `mergeLiveDisasterEvents` |
| Admin creates campaign | ✅ | Events → Create (admin wallet only) |
| On-chain `create_campaign` | ✅ | `disasterVaultChain.createCampaign` |
| Status = active (1) | ✅ | Store `approval_pending` until approvals |

### Phase 2 — Multi-sig approval

| Step | Actual |
|------|--------|
| Approvers on Verification page | ✅ |
| `submit_approval` via Pera | ✅ |
| Status → 2 when threshold met | ✅ if approvers are **distinct** on-chain |
| **Failure mode** | Same address listed 3× → threshold 2 may be impossible with one key |

### Phase 3 — Disburse

| Step | Actual |
|------|--------|
| CSV import | ✅ Embedded in Disbursements |
| `disburse` | ✅ Admin-signed tx |
| Proof tab | ✅ Indexer `fetchLedgerProofRecords` |

### Phase 4 — Community appeals

| Step | Actual |
|------|--------|
| Submit / approve / donate / withdraw | ✅ Wired to `communityDonation.ts` |
| Ops queue | ✅ `CommunityQueue.tsx` |

### Phase 5 — Telegram / WhatsApp

| Step | Actual |
|------|--------|
| `/subscribe`, `/campaign`, `/approve` | ✅ In `scripts/bot/` if `npm run bot` + `TELEGRAM_BOT_TOKEN` |
| WhatsApp | Deep link only in UI (`wa.me`); Twilio in agent service, not full ops bot in browser |
| **Not running by default** | User must start bot separately |

---

## 9. Smart contracts (backend on-chain)

**DisasterVault** (`savings_vault/projects/disaster_vault/`):

- `bootstrap(admin, treasury)` — once
- `create_campaign` — admin only
- `donate` — USDC to campaign (asserts active, not expired)
- `submit_approval` — allow-listed approvers
- `disburse` — approved only, inner ASA transfers
- `expire` — refunds per rules

**Scripts:**

- `npm run bootstrap:humanitarian` — fails if admin already set (expected after first run)
- `npm run fund:humanitarian` — fund app accounts with ALGO
- `npm run deploy:disaster-vault` — deploy new instance

**CommunityDonationHub** — separate project (appeals); admin from `VITE_ADMIN_ADDRESS`.

---

## 10. What is NOT working (honest list)

| Issue | Severity | Detail |
|-------|----------|--------|
| **Landing blank / loader** | High | Was Router + bootstrap gate bug — **fix: gate inside BrowserRouter**; restart dev server |
| **Create campaign “wrong wallet”** | Expected | Connect `VITE_ADMIN_ADDRESS` in Pera |
| **Create campaign reject on-chain** | High | App needs ALGO + USDC opt-in; admin must match bootstrapped admin; box/min balance |
| **Same approver 3× in .env** | High | Multi-approval may not reach threshold 2 with one physical wallet |
| **Event brief in production build** | Medium | `/api/event-brief` is **Vite dev middleware** — won't exist on static host without adapter |
| **GNews optional** | Low | Brief works without `VITE_GNEWS_API_KEY` |
| **No automated 15m ingest in UI** | Medium | Plan assumed cron; UI is manual refresh unless bot runs |
| **`agent:service` vs `bot`** | Ops | Plan says run one; both exist |
| **Savings sandbox off** | Info | `VITE_SHOW_SANDBOX=false` hides original dashboard |
| **Strict mode** | Info | No demo seed crises/events — empty until GDACS/indexer hydrate |
| **WhatsApp “bot”** | Medium | UI link only unless Twilio agent running |
| **Gemini in .env exposed to client** | Security | `VITE_GEMINI_API_KEY` is public in browser bundle if used client-side |

---

## 11. Data honesty modes

| `VITE_DEMO_STRICT` | Behavior |
|--------------------|----------|
| `true` (your `.env`) | Start from `emptyPlatformState`; no seeded fake crises/audit; proof table indexer-only |
| `false` | Loads `platformSeed` demo data mixed with live |

| `platformDataMode` | Meaning in UI |
|--------------------|----------------|
| `live` | GDACS / chain hydrated |
| `demo` / `seed` | Seeded narratives (strict off) |

---

## 12. Commands cheat sheet

```bash
npm run dev              # Frontend + /api/* middleware + GDACS proxy
npm run build            # Production bundle (no Vite API routes unless hosted)
npm run bot              # Telegram + GDACS poller (needs TELEGRAM_BOT_TOKEN)
npm run bootstrap:humanitarian
npm run fund:humanitarian
npm run verify:deployment
```

---

## 13. File index (high-signal)

| Area | Paths |
|------|-------|
| Router | `src/router/AppRouter.tsx` |
| Landing | `src/pages/Landing.tsx`, `src/styles/landing.css` |
| Ops | `src/pages/operations/*` |
| Store | `src/store/platformStore.ts` |
| Chain | `src/integrations/disasterVaultChain.ts`, `src/services/communityDonation.ts` |
| Indexer proof | `src/services/platform/indexerBridge.ts` |
| GDACS | `src/services/gdacsIntel.ts`, `src/lib/gdacsAlertLevel.ts`, `src/lib/geo.ts` |
| API (dev) | `vite.config.ts` middleware, `api/*.ts` |
| Contracts | `savings_vault/projects/disaster_vault/smart_contracts/disaster_vault/contract.py` |
| Bot | `scripts/bot/` |
| Plan | `.cursor/plans/ops_product_hardening_66918430.plan.md` or user plans folder |

---

## 14. Summary verdict

- **Product aim:** Humanitarian ops console + community appeals on Algorand testnet, with a cinematic public landing.
- **Plan execution:** ~85–90% of ops hardening plan delivered; main gaps are **automated cron in web app**, **production API hosting for briefs**, and **approver env misconfiguration risk**.
- **Backend:** On-chain contracts + indexer + optional Node bot — **not** a monolithic SaaS API.
- **User wallet:** **Not** hardcoded; **admin/approver addresses in `.env` are** hardcoded roles.
- **Landing:** Still in repo at `/`; visibility bug was **React Router placement of bootstrap gate** — fixed by moving gate inside `BrowserRouter`.

---

*For judges/operators: treat this as testnet pilot software. Sanctions, KYC, and licensing are explicitly out of scope in legal copy.*
