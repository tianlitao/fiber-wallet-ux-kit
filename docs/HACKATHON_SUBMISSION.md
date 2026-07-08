# Hackathon Submission

## Project summary

**Fiber Wallet UX Kit** is reusable browser wallet and payment UX infrastructure for CKB Fiber Network. It demonstrates how wallets and app developers can integrate Fiber node startup, local Fiber identity management, channel lifecycle flows, invoice QR flows, payment sending, mobile scan-to-pay, and CKB wallet signing in a static web app.

The project is a working reference kit rather than a consumer wallet product. Its purpose is to make Fiber easier to use, integrate, operate, and productize for future developers, wallets, merchants, and services.

## Selected category

**Category 1: Wallet and Payment UX Infrastructure**

## Team members

- Project maintainer: add name before submission
- Contributors: add names before submission

## Repository link

Add GitHub repository URL before submission.

## Hosted demo

Add deployed demo URL before submission.

## Video demonstration

Add video URL before submission.

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
- CCC wallet connection on CKB Testnet.
- Default-peer channel setup flow with external funding transaction signing.
- Channel listing and close actions.
- Invoice creation, parsing, lookup, and QR display.
- Invoice payment, keysend payment, scanner fallback, status polling, and recent activity.
- English and Chinese routes.
- Static export and Cloudflare Pages headers.
- Unit and page-level test coverage.

## What is limited or needs production hardening

- The default peer is hardcoded to `fiber.nervosscan.com`.
- The hackathon flow targets CKB Testnet.
- Channel funding depends on wallet support and sufficient testnet CKB.
- Amount parsing should be replaced with strict fixed-point parsing before production use.
- Recent activity is browser-local rather than synced or indexed.
- The UI is a reference implementation, not an audited production wallet.

## Technical breakdown

See [TECHNICAL_BREAKDOWN.md](./TECHNICAL_BREAKDOWN.md).

## Demo instructions

See [DEMO_SCRIPT.md](./DEMO_SCRIPT.md).

## Future roadmap

- Extract reusable hooks and components for wallet/app integration.
- Add a payment readiness module for peer, channel, route, and capacity checks.
- Add structured failure diagnostics and recovery flows.
- Add merchant checkout primitives and hosted payment page examples.
- Add multi-asset invoice and payment request support.
- Add richer node and channel health monitoring.
- Add Playwright e2e tests for hosted demos and mobile browsers.

## AI allowance claim

AI tooling was used for analysis, documentation, packaging, and implementation assistance. Claim details can be added after final submission if eligible.
