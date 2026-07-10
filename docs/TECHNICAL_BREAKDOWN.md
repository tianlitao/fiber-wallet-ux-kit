# Technical Breakdown

## System shape

Fiber Wallet UX Kit is a static-exportable Next.js app that runs Fiber integration logic in the browser. It combines a local Fiber identity wallet, Fiber node lifecycle management, CKB wallet connection, channel funding, invoices, payments, and mobile-friendly QR flows.

The implementation keeps the Fiber node identity separate from the CKB funding wallet:

- The local Fiber identity wallet is a 12-word mnemonic encrypted in browser storage.
- The derived Fiber key starts the Fiber node.
- The connected CCC wallet signs CKB channel funding transactions.
- Fiber channel runtime state is persisted separately by `fiber-js` in browser IndexedDB.

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

This makes the browser identity experience self-contained while preserving a clear recovery boundary: the 12-word mnemonic is the only recovery method for the Fiber identity key. It is not a complete channel-state backup.

Channel data is maintained by the Fiber runtime database in browser IndexedDB, using the `databasePrefix` passed to `fiber-js` at startup. Importing the same mnemonic in another browser derives the same Fiber node identity, but it does not migrate the original browser's channel database. This kit intentionally exposes identity creation and import semantics without claiming cross-browser channel recovery.

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

This flow is the most important reusable infrastructure pattern in the project because it bridges Fiber channel negotiation with external CKB wallet signing.

## Why JoyID uses a bridge page

JoyID connection and transaction signing both go through `/joyid-sign-bridge` instead of redirecting the main app window directly to JoyID.

The bridge exists for three reasons:

- Fiber runtime pages need `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` so browser Fiber can use `SharedArrayBuffer`.
- JoyID popup flows need a page that can keep a usable popup relationship with JoyID, so `/joyid-sign-bridge` uses `Cross-Origin-Opener-Policy: same-origin-allow-popups` and does not inherit the app-wide `COEP` header.
- Wallet connection and funding-signature approval should feel like the same wallet operation. The main app keeps its route, Fiber state, and form state, while the bridge owns the short-lived JoyID popup and passes the result back through local storage.

This makes JoyID behavior consistent across wallet connect and channel funding signatures. It also keeps the cross-origin isolation requirement scoped to the Fiber app pages instead of forcing the entire wallet approval flow to run under the same headers.

## Cross-origin isolation

Fiber runtime pages need `COOP/COEP` headers for `SharedArrayBuffer`. The project applies those headers to the app routes through `public/_headers`, while `/joyid-sign-bridge` is a deliberate exception for JoyID popup interoperability.

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

## Reusable payment readiness and diagnostics

`lib/paymentInfrastructure` is a page-independent integration boundary. It
exports:

- `summarizeUsableChannels`, a pure aggregate of enabled `Ready` or `Normal`
  channel capacity;
- `diagnosePaymentError`, a stable mapping from Fiber/RPC failures to
  actionable diagnostic codes;
- `checkPaymentReadiness`, a local prerequisite assessment followed by a real
  Fiber payment dry run;
- `usePaymentReadiness`, a React lifecycle wrapper that invalidates stale
  results and prevents out-of-order requests from overwriting newer checks.

Another wallet or component can use the API without importing this app's
context:

```ts
const result = await checkPaymentReadiness({
  fiber,
  nodeStatus: "running",
  peerConnected: true,
  channels,
  request: { mode: "invoice", invoice },
});

if (result.status === "ready") {
  await fiber.sendPayment({ invoice });
}
```

The dry run proves that Fiber found a viable route at the time of the check. It
does not reserve route liquidity, so the real payment can still fail if network
conditions change.

CKB amounts are parsed and formatted with strings and `bigint` in
`lib/fiberConfig.ts`. No CKB input path converts through JavaScript
floating-point numbers.

## Static deployment

The app uses `output: "export"` in `next.config.mjs`, so it can be deployed as static files. `public/_headers` is required on Cloudflare Pages to preserve the browser runtime requirements for Fiber WASM.

## Test strategy

The Vitest suite covers:

- i18n routing and messages;
- local Fiber identity wallet crypto and storage;
- Fiber runtime support errors;
- dashboard identity-wallet flows, channels, invoices, and payments pages;
- mobile invoice and payment paths;
- exact CKB amount boundaries, payment diagnostics, readiness, and stale hook
  requests;
- QR card and scanner components.
- Google Chrome HTTPS, cross-origin isolation, localized routes, JoyID bridge
  headers, and desktop/mobile layout through Playwright.

## Production hardening notes

- Extract channel funding into a reusable hook or service.
- Add an explicit channel database backup or migration mechanism only after the recovery and concurrency semantics are well defined.
- Add configurable peers, assets, and network selection.
- Audit wallet signing, browser storage, and payment flows before production
  use.
