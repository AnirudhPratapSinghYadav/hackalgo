# Demo wallets (finale)

Generated via `npm run wallets:generate`. **Do not commit mnemonics.**

| Role | Address |
|------|---------|
| Admin + approver 0 | `PG5A366SSB63BDDDUVJTSHMOJUIZTMCGDDOKWX3XKEFMWNG3Z7ZQMUNY2A` |
| Approver 1 | `H57K5LX43NYVP5YFLLMMNF4IUC4E7TYQS5ZJWTESW3XBNWUPV7OIVYGQI4` |
| Approver 2 | `XAF5VLIHIQCO6ASHZGCACCFOUTOHAC6EIT2WFY42JIDMHOBX7QLOGV43FE` |

Fund approvers 1–2 at https://bank.testnet.algorand.network

**After updating approvers in `.env`, create a NEW campaign.** Existing on-chain campaigns keep the old approver list in their boxes.

Mnemonics for approvers 1–2 were printed when you ran `npm run wallets:generate` — import into Pera before the demo.
