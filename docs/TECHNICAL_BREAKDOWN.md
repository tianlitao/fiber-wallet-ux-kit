# Technical Breakdown

## System shape

Fiber Wallet UX Kit is a static-exportable Next.js app that runs Fiber integration logic in the browser. It combines a local Fiber identity wallet, Fiber node lifecycle management, CKB wallet connection, channel funding, invoices, payments, and mobile-friendly QR flows.

The implementation keeps the Fiber node identity separate from the CKB funding wallet:

- The local Fiber identity wallet is a 12-word mnemonic encrypted in browser storage.
- The derived Fiber key starts the Fiber node.
- The connected CCC wallet signs CKB channel funding transactions.

## Fiber runtime lifecycle

`lib/fiberContext.tsx` provides `FiberProvider` and `useFiber()`.

Responsibilities:

- Check whether `SharedArrayBuffer` is available.
- Check whether the page is cross-origin isolated.
- Dynamically import `@nervosnetwork/fiber-js`.
- Start the Fiber WASM node with the testnet config from `lib/fiberConfig.ts`.
- Store node status, node info, errors, and default peer connectivity.
- Connect to `fiber.nervosscan.com`.
- Poll peer connectivity while the node is running.
- Stop the Fiber worker on cleanup.

This boundary gives page components a simple interface: start, stop, refresh node info, and read status.

## Local Fiber identity wallet

`lib/fiberIdentityWallet/*` implements the local identity layer.

Responsibilities:

- Generate a 12-word BIP39 mnemonic.
- Validate imported 12-word mnemonics.
- Derive a 32-byte Fiber key with HKDF.
- Encrypt the mnemonic with PBKDF2 and AES-GCM.
- Store the encrypted record locally.
- Unlock the record with the user password before starting Fiber.

This makes the browser experience self-contained while preserving a clear recovery model: the 12-word mnemonic is the only recovery method.

## CKB wallet signing and channel funding

`app/[locale]/channels/page.tsx` demonstrates a complete external channel funding flow:

1. Connect to the default Fiber peer.
2. Resolve the connected wallet lock script.
3. Resolve funding lock cell deps for known CCC lock types.
4. Request an unsigned funding transaction from Fiber with `openChannelWithExternalFunding`.
5. Convert the Fiber transaction shape into a CCC transaction.
6. Prepare and sign only the wallet-owned inputs.
7. Restore Fiber's original transaction structure except the signed user witness.
8. Submit the signed funding transaction back to Fiber.
9. Resume the flow after JoyID redirect signing when possible.

This flow is the most important reusable infrastructure pattern in the project because it bridges Fiber channel negotiation with external CKB wallet signing.

## JoyID bridge

Fiber runtime pages need `COOP/COEP` headers for `SharedArrayBuffer`. JoyID wallet flows can require redirect or popup behavior that is incompatible with isolated pages.

The project uses:

- `public/_headers` to isolate the main app.
- `/joyid-bridge` to remove isolation headers for JoyID interaction.
- `lib/joyid/bridge.ts` to persist bridge requests.
- `lib/joyid/redirect.ts` to consume auth and signing redirect results.
- `lib/joyid/JoyIdRedirectCkbSigner.ts` to expose a CCC-compatible signer wrapper.

## Invoice and payment infrastructure

`app/[locale]/invoices/page.tsx` demonstrates:

- creating Fiber invoices with random preimages;
- parsing invoice strings;
- looking up invoices by payment hash;
- displaying compact and large QR codes;
- keeping local recent invoice history.

`app/[locale]/payments/page.tsx` demonstrates:

- paying pasted invoices;
- keysend payments;
- QR scanning through camera or fallback upload;
- status polling for created or inflight payments;
- keeping local recent payment history.

## Static deployment

The app uses `output: "export"` in `next.config.mjs`, so it can be deployed as static files. `public/_headers` is required on Cloudflare Pages to preserve the browser runtime requirements for Fiber WASM.

## Test strategy

The Vitest suite covers:

- i18n routing and messages;
- local Fiber identity wallet crypto and storage;
- Fiber runtime support errors;
- JoyID bridge request and redirect state;
- channel funding resume behavior;
- dashboard, onboarding, channels, invoices, and payments pages;
- mobile invoice and payment paths;
- QR card and scanner components.

## Production hardening notes

- Replace floating-point CKB parsing with strict fixed-point string parsing.
- Extract channel funding into a reusable hook or service.
- Add structured Fiber error categories and recovery guidance.
- Add route confidence and liquidity readiness checks before sending payments.
- Add e2e tests in a real browser with `crossOriginIsolated` verification.
- Add configurable peers, assets, and network selection.
