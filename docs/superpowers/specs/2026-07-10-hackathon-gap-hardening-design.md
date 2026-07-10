# Hackathon Gap Hardening Design

**Date:** 2026-07-10

## Context

Fiber Wallet UX Kit targets the Wallet and Payment UX Infrastructure category of
the Gone in 60ms: Fiber Network Infrastructure Hackathon. The existing project
already demonstrates a browser Fiber node, encrypted local identity, externally
funded channels, invoices, QR payments, mobile scanning, and payment status
tracking.

The hackathon rewards functional completeness, reusable infrastructure, payment
confidence, failure diagnostics, integration potential, documentation, and
maintainability. The remaining repository-controlled gaps are:

- payment readiness is inferred only after a payment fails;
- low-level Fiber failures are not exposed through a stable diagnostic model;
- CKB input conversion uses floating-point parsing;
- reusable payment infrastructure is still embedded in page code;
- the repository has no explicit open-source license;
- browser-level isolation and responsive flows are not covered by end-to-end
  tests;
- submission documentation has an incomplete video deliverable and uses HTTP
  demo links.

Registration, video hosting, and final CKBoost submission remain maintainer
actions because they require the maintainer's wallet, accounts, and recorded
voice or screen content.

## Goals

1. Provide a real "Can I pay?" preflight using Fiber's `dry_run` support.
2. Convert low-level payment failures into stable, actionable diagnostics.
3. Replace floating-point CKB conversion with exact fixed-point parsing.
4. Expose readiness and diagnostics through reusable TypeScript APIs and a React
   hook rather than page-local logic.
5. Make channel capacity and payment readiness visible in the existing UI.
6. Complete repository-controlled submission and open-source deliverables.
7. Verify critical hosted-runtime assumptions in a real Chrome browser.

## Non-goals

- Publishing an npm package during this change.
- Extracting the full channel external-funding flow into a standalone SDK.
- Guaranteeing that a route remains available after a successful dry run.
- Backing up or migrating Fiber's browser-local channel database.
- Adding mainnet, arbitrary peer, or multi-asset configuration.
- Recording or uploading the maintainer's final demonstration video.

## Architecture

### Exact CKB amounts

`lib/fiberConfig.ts` will keep the public `ckbToShannons` and
`shannonsToDisplay` helpers so existing callers do not need a migration layer.
Their implementations will use strings and `bigint` only.

`ckbToShannons` will:

- trim surrounding whitespace;
- accept unsigned decimal CKB values with up to eight fractional digits;
- reject empty, signed, exponential, non-numeric, and over-precision values;
- return a Fiber-compatible hexadecimal quantity;
- preserve exact values without conversion through JavaScript `number`.

Callers will enforce operation-specific minimums such as the 600 CKB channel
minimum. Zero is representable by the generic converter but payment and invoice
forms will reject non-positive amounts.

`shannonsToDisplay` will format hexadecimal or decimal shannon quantities
without converting through `number`. It will preserve the current four-decimal
default display while avoiding precision loss for large values.

### Payment diagnostics

`lib/paymentInfrastructure/diagnostics.ts` will define stable diagnostic codes:

- `node_not_running`
- `peer_disconnected`
- `no_usable_channel`
- `insufficient_outbound_capacity`
- `route_not_found`
- `asset_mismatch`
- `fee_limit`
- `timeout`
- `invalid_request`
- `unknown`

The diagnostic object will include code, severity, recoverability, a
localization key, and the original technical detail. Classification will be
pure and ordered from specific to general so tests can cover each mapping.
Unknown messages remain visible as technical detail and are never presented as
a known diagnosis.

### Payment readiness

`lib/paymentInfrastructure/readiness.ts` will expose two layers:

1. A pure local assessment that accepts node status, peer connectivity,
   channels, and an optional amount. It reports usable channels and aggregate
   outbound/inbound capacity without making network calls.
2. An asynchronous preflight that accepts a Fiber-compatible client and either
   an invoice request or keysend request. It first performs the local
   assessment, then calls `sendPayment` with `dry_run: true`.

The asynchronous result will be one of:

- `ready`: local checks and Fiber route dry run succeeded;
- `warning`: local information is incomplete but the request can still be
  checked or submitted;
- `blocked`: a known prerequisite or Fiber dry run failed.

A successful dry run means Fiber found a viable route at check time. UI and
documentation will explicitly avoid claiming that it reserves liquidity or
guarantees later settlement.

### Reusable React integration

`lib/paymentInfrastructure/usePaymentReadiness.ts` will own preflight loading,
result, stale-state invalidation, and unexpected errors. It will accept the
Fiber client and runtime facts as arguments rather than importing the app's
context directly. This keeps the hook reusable in another wallet integration.

`lib/paymentInfrastructure/index.ts` will export the public types, pure
diagnostic and readiness functions, and hook. A short example in the technical
documentation will show how another component can integrate the module.

## UI Design

### Payments

The send-payment form will contain a compact readiness section below the
invoice or keysend fields:

- a check action runs the dry-run preflight;
- the result shows ready, warning, or blocked status;
- known failures show one recovery action in plain language;
- technical detail remains available in the result rather than being discarded;
- changing the invoice, target, amount, or payment mode marks the result stale.

The normal Send action will run the same preflight immediately before the real
payment. A blocked result prevents submission. A ready result proceeds without
requiring a second confirmation.

The control will not imply a guarantee or display invented route percentages.

### Channels

The channel page will show an unframed capacity summary above the channel list:

- number of enabled channels in `Normal` or `Ready` state;
- aggregate outbound capacity from local balances;
- aggregate inbound capacity from remote balances.

Closed, shutdown, disabled, and pending channels will not count as usable.

### Localization and accessibility

All new user-facing text will be added to the existing English and Chinese
message dictionaries. Status will use text in addition to color. Buttons will
keep explicit accessible names, disabled state, and loading feedback.

## Submission Hardening

- Add an MIT license for the repository.
- Change hosted demo links to HTTPS.
- Add a submission checklist mapping every required deliverable to its current
  location and completion state.
- Mark the video URL as the only content deliverable that still requires a
  maintainer-provided link.
- Include a concise recording checklist based on the existing demo script.
- Clarify what is fully working, what is limited, and what needs production
  hardening.
- Document payment readiness semantics and public module usage.

The local commits that are ahead of `origin/main` will be reported to the
maintainer. Pushing and CKBoost submission are separate explicit actions.

## Browser Verification

Playwright will be added as a development dependency and configured to use the
installed Google Chrome channel against the project's HTTPS development server.
The configuration will ignore the local development certificate error.

End-to-end coverage will verify:

- the English dashboard loads over HTTPS;
- application pages report `crossOriginIsolated === true`;
- English and Chinese routes render and navigate;
- the mobile payment form remains within the viewport without incoherent
  overlap;
- the JoyID signing bridge does not inherit the app-wide COEP header.

The suite will not depend on a funded wallet, live channel creation, or a
specific external route. Unit and page tests will cover readiness dry-run
behavior with deterministic Fiber clients.

## Testing

Unit tests will cover:

- exact CKB parsing and formatting boundaries;
- invalid, signed, exponential, and over-precision inputs;
- usable-channel and aggregate-capacity calculations;
- each known diagnostic category and unknown fallback;
- ready, warning, and blocked preflight results;
- `dry_run: true` request construction for invoice and keysend modes.

Page tests will cover:

- readiness checks and localized results;
- stale results after input changes;
- automatic preflight before a real send;
- blocking a real send when preflight fails;
- channel capacity summary rendering.

Existing lint, Vitest, and production build checks must remain green. Chrome
end-to-end tests must pass before the work is considered complete.

## Error Handling

- Validation errors will be shown before invoking Fiber.
- Fiber dry-run failures will be classified through the shared diagnostics
  module.
- A diagnostic classification bug must not hide the original Fiber message.
- Readiness state will use request identity to prevent a slower, stale response
  from replacing a newer result.
- Live route changes between preflight and payment remain possible and will use
  the same diagnostic mapping if the real payment fails.

## Acceptance Criteria

1. No CKB input path uses floating-point conversion.
2. Invoice and keysend requests can be dry-run checked from the Payments page.
3. A blocked preflight prevents the matching real payment request.
4. Readiness and error diagnostics are exported independently of page code.
5. Channel usable capacity is visible and computed only from enabled,
   ready-state channels.
6. New behavior is localized in English and Chinese.
7. The repository includes an MIT license and a complete submission checklist.
8. Demo URLs use HTTPS and the remaining video action is explicit.
9. Lint, Vitest, production build, and Chrome end-to-end checks pass.

