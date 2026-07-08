# Demo Script

Target length: 2 to 3 minutes.

## Opening

Fiber Wallet UX Kit is a reusable browser wallet and payment UX infrastructure kit for CKB Fiber Network. It is submitted under the Wallet and Payment UX Infrastructure category.

The goal is to show how wallets and apps can integrate Fiber node startup, local identity, channel lifecycle flows, invoices, QR payments, mobile scanning, and CKB wallet signing without each team rebuilding those patterns from scratch.

## Flow

1. Open the hosted demo at `/en`.
2. Show the Dashboard identity wallet card.
3. Create or import the 12-word Fiber identity wallet.
4. Set a local password.
5. Unlock the identity wallet from the Dashboard and start the Fiber node.
6. Point out the runtime status, node pubkey, connected peers, and default peer readiness.
7. Connect a CKB Testnet wallet through CCC.
8. Open the Channels page.
9. Show the default peer and explain that the flow abstracts the channel setup path.
10. Open a channel with at least 600 CKB when testnet funds are available.
11. Open the Invoices page.
12. Create an invoice and show the QR card and large QR modal.
13. Open the Payments page.
14. Show invoice paste mode, keysend mode, scanner entry, and payment status polling.
15. Close by showing the documentation files and test commands.

## Voiceover points

- This is infrastructure, not only an app UI.
- The Fiber node runs in the browser through `@nervosnetwork/fiber-js`.
- The identity wallet is local and encrypted.
- CKB funding signatures stay with the user's connected wallet.
- Cloudflare Pages headers enable `SharedArrayBuffer`.
- Cloudflare Pages headers keep Fiber runtime pages cross-origin isolated.
- The project includes tests and is designed to be extracted into reusable SDK-style modules.

## Closing

The next step is to extract these flows into reusable hooks, SDK components, readiness checks, and payment diagnostics so other Fiber wallets, merchants, and services can integrate faster.
