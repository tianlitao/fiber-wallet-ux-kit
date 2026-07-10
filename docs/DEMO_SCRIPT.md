# Demo Script

Target length: 2 to 3 minutes.

## Opening

Fiber Wallet UX Kit is a reusable browser wallet and payment UX infrastructure kit for CKB Fiber Network. It is submitted under the Wallet and Payment UX Infrastructure category.

The goal is to show how wallets and apps can integrate Fiber node startup, local identity, channel lifecycle flows, invoices, QR payments, mobile scanning, and CKB wallet signing without each team rebuilding those patterns from scratch.

## Flow

1. Open the hosted demo at `https://fiber-wallet-ux-kit.tianlitao3399.workers.dev/en`.
2. Show the Dashboard identity wallet card.
3. Create or import the 12-word Fiber identity wallet.
4. Set a local password.
5. Unlock the identity wallet from the Dashboard and start the Fiber node.
6. Point out the runtime status, node pubkey, connected peers, and default peer readiness.
7. Connect a CKB Testnet wallet through CCC.
8. Open the Channels page.
9. Show usable channel count plus aggregate outbound and inbound capacity.
10. Show the default peer and explain that the flow abstracts the channel setup path.
11. Open a channel with at least 600 CKB when testnet funds are available.
12. Open the Invoices page.
13. Create an invoice and show the QR card and large QR modal.
14. Open the Payments page.
15. Paste an invoice and run Check readiness to show a successful Fiber dry run.
16. Show one blocked readiness result and its recovery guidance, such as a
    disconnected peer or unavailable channel.
17. Show keysend mode, scanner entry, and payment status polling.
18. Open `lib/paymentInfrastructure/index.ts` to show the reusable exports.
19. Close by showing the documentation files and the full test commands.

## Voiceover points

- This is infrastructure, not only an app UI.
- The Fiber node runs in the browser through `@nervosnetwork/fiber-js`.
- The identity wallet is local and encrypted.
- The 12-word mnemonic restores the Fiber identity, while channel runtime state remains local to the browser database in this demo.
- CKB funding signatures stay with the user's connected wallet.
- Cloudflare Pages headers enable `SharedArrayBuffer`.
- Cloudflare Pages headers keep Fiber runtime pages cross-origin isolated.
- The project includes tests and is designed to be extracted into reusable SDK-style modules.
- Readiness uses Fiber's real `dry_run`; it finds a route at check time but does
  not reserve liquidity.

## Closing

The kit now exposes exact amount handling, payment readiness, diagnostics, and
channel capacity as reusable infrastructure. The next step is to package the
remaining channel and invoice flows for broader wallet and merchant
integrations.

## Recording and Upload Checklist

- Record both readiness success and blocked recovery states.
- Show channel outbound and inbound capacity.
- Show the public `lib/paymentInfrastructure` exports.
- Keep wallet addresses, seed words, passwords, and private data out of the
  recording.
- Upload the final video to a publicly accessible URL.
- Add that URL to `docs/HACKATHON_SUBMISSION.md`.
- Add the same repository, demo, and video URLs to the CKBoost submission.
