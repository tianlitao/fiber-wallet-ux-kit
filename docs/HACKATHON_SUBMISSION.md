# Hackathon Submission

## Project summary

**Fiber Wallet UX Kit** is reusable browser wallet and payment UX infrastructure for CKB Fiber Network. It demonstrates how wallets and app developers can integrate Fiber node startup, local Fiber identity management, channel lifecycle flows, invoice QR flows, payment sending, mobile scan-to-pay, and CKB wallet signing in a static web app.

The project is a working reference kit rather than a consumer wallet product. Its purpose is to make Fiber easier to use, integrate, operate, and productize for future developers, wallets, merchants, and services.

## Selected category

**Category 1: Wallet and Payment UX Infrastructure**

## Team members

- Project maintainer: tianlitao
- Contributors: tianlitao

## Repository link

[tianlitao/fiber-wallet-ux-kit](https://github.com/tianlitao/fiber-wallet-ux-kit)

## Hosted demo

[fiber-wallet-ux-kit.tianlitao3399.workers.dev](https://fiber-wallet-ux-kit.tianlitao3399.workers.dev/)

## Video demonstration

**Status: maintainer action required.** Record and upload the demonstration
using [DEMO_SCRIPT.md](./DEMO_SCRIPT.md), then place the public video URL here
and in the final CKBoost submission.

## Fiber infrastructure gap addressed

Fiber developers need more than low-level APIs. They need reusable browser integration patterns that answer practical questions:

- How does a web app start a Fiber node safely?
- How should a wallet manage a local Fiber identity?
- How does channel funding work when CKB signing is delegated to an external wallet?
- How should Fiber readiness, peer connectivity, channel state, invoices, payment status, and failure states appear in a wallet UI?
- How can a static deployment satisfy `SharedArrayBuffer` isolation for browser Fiber flows?

Fiber Wallet UX Kit addresses those gaps with a runnable, tested reference implementation.

## What is fully working

- Browser Fiber node lifecycle with runtime isolation checks.
- Local encrypted 12-word Fiber identity wallet.
- Identity recovery through mnemonic import, with channel database portability kept out of scope for the hackathon demo.
- CCC wallet connection on CKB Testnet.
- Default-peer channel setup flow with external funding transaction signing.
- Channel listing, exact usable-capacity summary, and close actions.
- Invoice creation, parsing, lookup, and QR display.
- Invoice payment, keysend payment, scanner fallback, status polling, and recent activity.
- Exact fixed-point CKB amount parsing with operation-specific validation.
- Reusable payment readiness APIs, a React hook, and stable diagnostic codes.
- Fiber `dry_run` preflight before real payment, with localized recovery guidance.
- English and Chinese routes.
- Static export and Cloudflare Pages headers.
- Unit and page-level test coverage plus Google Chrome end-to-end checks.

## What is limited or needs production hardening

- The default peer is hardcoded to `fiber.nervosscan.com`.
- The hackathon flow targets CKB Testnet.
- Channel funding depends on wallet support and sufficient testnet CKB.
- The 12-word mnemonic restores the Fiber node identity, not the complete Fiber channel database. Channel state is browser-local in the Fiber runtime's IndexedDB storage.
- A successful dry run finds a viable route at check time but does not reserve liquidity or guarantee settlement.
- Recent activity is browser-local rather than synced or indexed.
- The UI is a reference implementation, not an audited production wallet.

## Implementation status

- **Working:** browser Fiber lifecycle, encrypted local identity, external
  channel funding, exact amounts, channel capacity, invoices, QR flows,
  readiness preflight, payment diagnostics, payment submission, localization,
  static deployment, and automated browser checks.
- **Mocked only in automated tests:** funded channel and payment RPC responses
  are deterministic test doubles so CI does not require testnet funds. The app
  itself calls the real `fiber-js` APIs.
- **Production hardening remaining:** security audit, portable channel database
  recovery, configurable networks/peers/assets, remote activity indexing, and
  broader wallet compatibility testing.

## Technical breakdown

See [TECHNICAL_BREAKDOWN.md](./TECHNICAL_BREAKDOWN.md).

## Demo instructions

See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

## Future roadmap

- Extract the remaining channel-funding and invoice flows into reusable hooks
  and components.
- Add a safe channel database backup or migration flow once the underlying Fiber recovery model is production-ready.
- Add merchant checkout primitives and hosted payment page examples.
- Add multi-asset invoice and payment request support.
- Add richer node and channel health monitoring.

## AI allowance claim

AI tooling was used for analysis, documentation, test design, and implementation
assistance. No separate AI allowance amount is claimed in this repository; any
award-related claim will follow the organizer's eligibility and disclosure
rules.
