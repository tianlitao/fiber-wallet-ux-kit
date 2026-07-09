# Fiber Wallet UX Kit

Reusable browser wallet and payment UX infrastructure for CKB Fiber Network.

This project is prepared for **Gone in 60ms: Fiber Network Infrastructure Hackathon** under the **Wallet and Payment UX Infrastructure** category. It is not positioned as a consumer wallet product. It is a working reference kit for wallets, apps, and payment teams that need to integrate Fiber node startup, channel lifecycle flows, invoices, QR payments, mobile scanning, and CKB wallet signing into a browser experience.

## Links

- Repository: [tianlitao/fiber-wallet-ux-kit](https://github.com/tianlitao/fiber-wallet-ux-kit)
- Hosted demo: [fiber-wallet-ux-kit.tianlitao3399.workers.dev](http://fiber-wallet-ux-kit.tianlitao3399.workers.dev/)

## Infrastructure gap

Fiber opens a powerful payment-channel design space, but application developers still need reusable patterns for:

- starting a Fiber node in the browser with the right runtime checks;
- managing a local Fiber identity without requiring users to run native software;
- opening and funding channels through an external CKB wallet;
- showing channel readiness, peer connectivity, invoices, payments, and errors in user-facing flows;
- handling `SharedArrayBuffer`, `COOP/COEP`, static hosting, and mobile UX.

Fiber Wallet UX Kit packages those integration patterns into a runnable Next.js reference implementation.

## What works

- Localized `/en` and `/zh` app routes.
- Browser-side Fiber node startup through `@nervosnetwork/fiber-js`.
- Runtime guardrails for `SharedArrayBuffer` and cross-origin isolation.
- Local 12-word Fiber identity wallet encrypted with a browser password.
- Clear identity recovery boundary: the mnemonic restores the Fiber node identity, while channel state remains browser-local in the Fiber runtime database.
- CKB Testnet wallet connection through `@ckb-ccc/connector-react`.
- Default-peer channel setup flow against `fiber.nervosscan.com`.
- External funding transaction signing through the connected CKB wallet.
- Channel list, close, and force-close actions.
- Invoice creation, parsing, lookup, QR display, and large QR modal.
- Payment send, keysend, status polling, scan-to-pay, and recent activity storage.
- Cloudflare Pages static export with required COOP/COEP headers.
- Vitest coverage for i18n, dashboard identity-wallet flows, Fiber context, channels, invoices, payments, and mobile flows.

## Demo flow

1. Open `/en`.
2. Create or import the local 12-word Fiber identity wallet.
3. Set a local password and unlock the wallet.
4. Start the browser Fiber node.
5. Connect a CKB Testnet wallet through CCC.
6. Open a channel with `fiber.nervosscan.com` using at least 600 CKB.
7. Create an invoice and show the QR payment request.
8. Use the Payments page to scan or paste an invoice and inspect payment status.

See [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md) for a short recording script.

## Architecture

The app is intentionally structured as a frontend integration kit:

- `lib/fiberContext.tsx` owns Fiber runtime lifecycle, node status, peer connection checks, and cleanup.
- `lib/fiberIdentityWallet/*` owns mnemonic validation, password encryption, storage, and Fiber key derivation.
- `@nervosnetwork/fiber-js` persists Fiber runtime data in browser IndexedDB. This kit does not export or migrate the channel database across browsers.
- `app/[locale]/channels/page.tsx` demonstrates external channel funding with CCC transaction signing.
- `app/[locale]/invoices/page.tsx` demonstrates Fiber invoice creation, parsing, lookup, QR display, and local recent history.
- `app/[locale]/payments/page.tsx` demonstrates invoice payment, keysend, scanner integration, status polling, and local recent history.
- `public/_headers` configures Cloudflare Pages headers required for browser Fiber WASM startup.

See [docs/TECHNICAL_BREAKDOWN.md](./docs/TECHNICAL_BREAKDOWN.md) for a deeper implementation breakdown.

## Local development

Install dependencies:

```bash
npm install
```

Start the local dev server:

```bash
npm run dev
```

Open:

```text
https://localhost:3000
```

`npm run dev` uses Next.js experimental HTTPS because browser wallet and isolation flows are closer to production behavior over HTTPS.

## Quality checks

```bash
npm run lint
npm test
npm run build
```

## Cloudflare Pages deployment

This project is configured as a static Next.js export. The build output is `out/`, not `.next/`.

Recommended Cloudflare Pages settings:

```text
Build command: npm run build
Build output directory: out
Deploy command: leave empty
```

Manual Pages deploy:

```bash
npm run build
npx wrangler pages deploy out --project-name fiber-wallet-ux-kit
```

If your Cloudflare project is configured to run `npx wrangler deploy`, the repository includes `wrangler.toml` with `out/` configured as static assets.

## Why `public/_headers` matters

Fiber node startup needs `SharedArrayBuffer`, which requires a cross-origin-isolated page:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Fiber runtime routes keep these headers so the app stays cross-origin isolated. `/joyid-sign-bridge` is a deliberate exception: it uses `Cross-Origin-Opener-Policy: same-origin-allow-popups` and omits `COEP` so JoyID popup authentication and signing can keep a usable opener relationship.

## Current limitations

- The default channel flow targets `fiber.nervosscan.com` on CKB Testnet.
- Channel funding currently assumes a connected CCC-compatible CKB wallet with enough testnet CKB.
- The 12-word mnemonic restores the local Fiber identity, not the full channel database. Existing channels depend on the browser-local Fiber IndexedDB state and are not currently portable through mnemonic import alone.
- Recent invoice and payment history are stored locally in the browser.
- Amount parsing should be hardened further before production use.
- The project is a reusable infrastructure reference, not audited production wallet software.

## Hackathon submission material

- [docs/HACKATHON_SUBMISSION.md](./docs/HACKATHON_SUBMISSION.md)
- [docs/TECHNICAL_BREAKDOWN.md](./docs/TECHNICAL_BREAKDOWN.md)
- [docs/DEMO_SCRIPT.md](./docs/DEMO_SCRIPT.md)

## Roadmap

- Extract the wallet/payment flows into reusable React components and hooks.
- Add a payment readiness API for capacity, peer connectivity, and route confidence checks.
- Add a documented channel database backup or migration path after upstream Fiber recovery semantics are ready for production use.
- Add structured payment failure diagnostics with recovery suggestions.
- Add a developer SDK wrapper for invoice/payment intents.
- Add richer channel health metrics and alerting hooks.
- Expand multi-asset invoice and payment request support.
- Add e2e browser tests for hosted demos and mobile viewports.
