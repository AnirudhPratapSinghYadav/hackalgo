# AlgoVault Verification Report

Date: 2026-03-31
Delivery mode: LocalNet-first, then Testnet handoff
Primary frontend network: Algorand Testnet (AlgoNode)
Current frontend App ID: 758024719

## Automated Checks Completed

1. Frontend build
   - Command: `npm run build`
   - Result: pass

2. Contract artifact rebuild
   - Command: `algokit project run build`
   - Result: pass (artifacts and typed clients regenerated)

3. Smart contract tests (Python)
   - Command: `poetry run pytest`
   - Result: `1 passed, 4 skipped`
   - Skip reason: deployer mnemonic is not configured with a valid 25-word phrase in this environment

4. ARC-4 selector verification (computed from ABI signatures in frontend service)
   - `opt_in()void` = `30c6d58a`
   - `deposit(pay)uint64` = `3298e7c0`
   - `claim_badge(uint64)uint64` = `37ebb7da`
   - `withdraw(uint64,address)void` = `f9c2775e`
   - `setup_savings_pact(address,uint64,uint64,uint64)void` = enabled in service
   - `apply_pact_penalty(address,pay)uint64` = enabled in service
   - `set_temptation_lock(uint64,uint64,address)void` = enabled in service
   - `disable_temptation_lock()void` = enabled in service
   - `set_dream_board(byte[],byte[])void` = enabled in service

5. Security check for AI secrets
   - Frontend uses `/api/coach` only
   - Backend provider is Gemini with `GEMINI_API_KEY` server env
   - No browser-side key usage in `src/`

## Manual E2E Checklist (Judge Flow)

Use this exact order for demo:

1. Connect wallet (Pera/Defly/WalletConnect)
2. Verify network badge is correct
3. Opt into vault
4. Deposit 1 ALGO (grouped payment + app call)
5. Refresh dashboard and confirm updated savings/global values
6. Open transaction history and verify latest row + explorer link
7. Claim badge when threshold reached
8. Configure Temptation Lock (goal + penalty bps + sink)
9. Withdraw before goal and verify penalty behavior
10. Create Savings Pact (partner + cadence + required amount + penalty amount)
11. Execute pact penalty flow and verify grouped transaction
12. Save Dream Board title + image URL, then reload and verify persistence
13. Open robot FAB and verify Gemini advice fetch + refresh
14. Repeat deposit from phone wallet and confirm history/Lora visibility

## LocalNet Runbook

1. Start LocalNet:
   - `algokit localnet start`
2. Build contracts:
   - `cd savings_vault/projects/savings_vault`
   - `algokit project run build`
3. Run tests:
   - `poetry run pytest`
4. Deploy:
   - `algokit project deploy localnet`
5. Bind frontend to LocalNet app:
   - set `VITE_APP_ID=<localnet_app_id>`
   - set `VITE_NETWORK=localnet`

## Testnet Handoff Steps

1. Set valid 25-word `DEPLOYER_MNEMONIC` in:
   - `savings_vault/projects/savings_vault/.env.testnet`
2. Deploy upgraded contract:
   - `cd savings_vault/projects/savings_vault`
   - `algokit project run build`
   - `algokit project deploy testnet`
3. Update frontend env:
   - `VITE_APP_ID=<new_testnet_app_id>`
   - App address is derived from `VITE_APP_ID` via `algosdk.getApplicationAddress` (do not set `VITE_APP_ADDRESS`).
   - `VITE_ALGOD_SERVER=https://testnet-api.algonode.cloud`
   - `VITE_ALGOD_PORT=443`
   - `VITE_ALGOD_TOKEN=`
   - `VITE_INDEXER_SERVER=https://testnet-idx.algonode.cloud`
   - `VITE_INDEXER_PORT=443`
   - `VITE_NETWORK=testnet`
4. Final build check:
   - `npm run build`

## Known Blockers

- Testnet redeploy from this machine is blocked until `DEPLOYER_MNEMONIC` is corrected.
- Full Pack SavingsVault is deployed on testnet at App ID `758024719` (Pact / Lock / Dream supported).
