# Hackathon Gap Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add exact CKB amount handling, reusable payment readiness and diagnostics, visible channel capacity, complete submission materials, and Chrome end-to-end verification.

**Architecture:** Keep Fiber RPC calls behind a focused `lib/paymentInfrastructure` boundary. Pure functions calculate channel capacity and classify errors; one async preflight function adds Fiber's real `dry_run`, and a small React hook manages UI state without importing the app context.

**Tech Stack:** Next.js 14, React 18, TypeScript, `@nervosnetwork/fiber-js` 0.8.1, Vitest, Testing Library, Playwright 1.61, Google Chrome.

---

## File Map

- Modify `lib/fiberConfig.ts`: exact string-to-shannon parsing and exact display formatting.
- Create `lib/paymentInfrastructure/types.ts`: stable readiness and diagnostic contracts.
- Create `lib/paymentInfrastructure/diagnostics.ts`: pure Fiber error classification.
- Create `lib/paymentInfrastructure/readiness.ts`: capacity calculation and async dry-run preflight.
- Create `lib/paymentInfrastructure/usePaymentReadiness.ts`: request lifecycle and stale-result handling.
- Create `lib/paymentInfrastructure/index.ts`: public module exports.
- Modify `app/[locale]/payments/page.tsx`: readiness UI and preflight-before-send behavior.
- Modify `app/[locale]/channels/page.tsx`: aggregate usable capacity summary.
- Modify `lib/i18n/messages/en.ts` and `lib/i18n/messages/zh.ts`: localized labels and recovery actions.
- Modify `next.config.mjs`: exclude the JoyID bridge from app-wide COEP in development.
- Create `playwright.config.ts` and `tests/e2e/runtime.spec.ts`: real Chrome checks.
- Create `LICENSE` and `docs/SUBMISSION_CHECKLIST.md`: open-source and submission deliverables.
- Modify `README.md`, `docs/HACKATHON_SUBMISSION.md`, `docs/TECHNICAL_BREAKDOWN.md`, and `docs/DEMO_SCRIPT.md`: HTTPS links, readiness semantics, API example, and video actions.

### Task 1: Exact CKB Amounts

**Files:**
- Modify: `lib/fiberConfig.ts`
- Modify: `tests/lib/fiberConfig.test.ts`

- [ ] **Step 1: Write failing parsing and formatting tests**

Add imports for `ckbToShannons` and `shannonsToDisplay`, then add:

```ts
describe("CKB amount helpers", () => {
  it.each([
    ["0", "0x0"],
    ["1", "0x5f5e100"],
    ["1.00000001", "0x5f5e101"],
    [" 600.5 ", "0xdfb424880"],
  ])("parses %s exactly", (input, expected) => {
    expect(ckbToShannons(input)).toBe(expected);
  });

  it.each(["", "-1", "+1", "1e2", ".5", "1.", "1.000000001", "abc"])(
    "rejects invalid amount %s",
    (input) => expect(() => ckbToShannons(input)).toThrow(),
  );

  it("formats large values without Number precision loss", () => {
    expect(shannonsToDisplay("900719925474099300000000")).toBe(
      "9007199254740993.0000",
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npx vitest run tests/lib/fiberConfig.test.ts
```

Expected: invalid-input cases and the large exact formatting case fail.

- [ ] **Step 3: Replace floating-point conversion with exact fixed-point logic**

Implement the helpers around:

```ts
const SHANNONS_PER_CKB = 100_000_000n;
const CKB_AMOUNT_PATTERN = /^(0|[1-9]\d*)(?:\.(\d{1,8}))?$/;

export function ckbToShannons(input: string): `0x${string}` {
  const value = input.trim();
  const match = CKB_AMOUNT_PATTERN.exec(value);
  if (!match) throw new Error("Enter a valid CKB amount with up to 8 decimals.");

  const whole = BigInt(match[1]);
  const fractional = BigInt((match[2] ?? "").padEnd(8, "0") || "0");
  const shannons = whole * SHANNONS_PER_CKB + fractional;
  return `0x${shannons.toString(16)}`;
}

export function shannonsToDisplay(value: string): string {
  const shannons = BigInt(value);
  const whole = shannons / SHANNONS_PER_CKB;
  const fourDecimals = (shannons % SHANNONS_PER_CKB) / 10_000n;
  return `${whole}.${fourDecimals.toString().padStart(4, "0")}`;
}
```

- [ ] **Step 4: Replace `Number(amount) < 600` in the channel form**

Parse once with `ckbToShannons`, compare `BigInt(fundingAmount)` against
`60_000_000_000n`, and pass the parsed value to Fiber. Catch parsing errors and
show the existing form error surface. Add explicit positive-amount validation
to invoice and keysend forms before invoking Fiber.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npx vitest run tests/lib/fiberConfig.test.ts tests/pages/channels.test.tsx tests/pages/invoices-payments.test.tsx
git add lib/fiberConfig.ts app/\[locale\]/channels/page.tsx app/\[locale\]/invoices/page.tsx app/\[locale\]/payments/page.tsx tests/lib/fiberConfig.test.ts
git commit -m "fix: parse CKB amounts exactly"
```

Expected: focused tests pass and `rg -n "parseFloat\\(|Number\\(amount" app lib`
returns no CKB amount conversion.

### Task 2: Stable Payment Diagnostics

**Files:**
- Create: `lib/paymentInfrastructure/types.ts`
- Create: `lib/paymentInfrastructure/diagnostics.ts`
- Create: `tests/lib/paymentDiagnostics.test.ts`

- [ ] **Step 1: Write failing diagnostic classification tests**

Cover one representative message for every code:

```ts
it.each([
  ["failed to build route: no path found", "route_not_found"],
  ["outbound liquidity is insufficient", "insufficient_outbound_capacity"],
  ["invoice currency does not match asset", "asset_mismatch"],
  ["fee exceeds max fee amount", "fee_limit"],
  ["payment timeout", "timeout"],
  ["invalid invoice", "invalid_request"],
  ["unexpected worker crash", "unknown"],
])("classifies %s", (message, code) => {
  expect(diagnosePaymentError(new Error(message))).toMatchObject({
    code,
    technicalDetail: message,
  });
});
```

Also assert that `unknown` is not recoverable and that known route/capacity
errors are recoverable.

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run:

```bash
npx vitest run tests/lib/paymentDiagnostics.test.ts
```

Expected: FAIL because `@/lib/paymentInfrastructure/diagnostics` does not exist.

- [ ] **Step 3: Define public contracts**

Create:

```ts
export type PaymentDiagnosticCode =
  | "node_not_running"
  | "peer_disconnected"
  | "no_usable_channel"
  | "insufficient_outbound_capacity"
  | "route_not_found"
  | "asset_mismatch"
  | "fee_limit"
  | "timeout"
  | "invalid_request"
  | "unknown";

export interface PaymentDiagnostic {
  code: PaymentDiagnosticCode;
  severity: "warning" | "error";
  recoverable: boolean;
  messageKey: `paymentsPage.diagnostics.${PaymentDiagnosticCode}`;
  technicalDetail: string;
}
```

- [ ] **Step 4: Implement ordered pure classification**

Use `getErrorMessage(error).toLowerCase()` and an ordered table. Check
insufficient outbound liquidity before the broader route pattern. Preserve the
unmodified message as `technicalDetail`, and return `unknown` only after all
specific checks.

- [ ] **Step 5: Run tests and commit**

Run:

```bash
npx vitest run tests/lib/paymentDiagnostics.test.ts
git add lib/paymentInfrastructure/types.ts lib/paymentInfrastructure/diagnostics.ts tests/lib/paymentDiagnostics.test.ts
git commit -m "feat: add payment diagnostics"
```

Expected: all diagnostic tests pass.

### Task 3: Reusable Payment Readiness

**Files:**
- Modify: `lib/paymentInfrastructure/types.ts`
- Create: `lib/paymentInfrastructure/readiness.ts`
- Create: `lib/paymentInfrastructure/index.ts`
- Create: `tests/lib/paymentReadiness.test.ts`

- [ ] **Step 1: Write failing local-capacity tests**

Use minimal `Channel` fixtures and assert that only enabled channels whose state
contains `Normal` or `Ready` contribute:

```ts
expect(summarizeUsableChannels(channels)).toEqual({
  usableChannelCount: 2,
  outboundCapacity: 300n,
  inboundCapacity: 700n,
});
```

Include disabled, pending, and shutdown fixtures that must not contribute.

- [ ] **Step 2: Write failing async preflight tests**

Use a client with `sendPayment: vi.fn()` and verify:

```ts
expect(client.sendPayment).toHaveBeenCalledWith({
  invoice: "fibt1invoice",
  allow_self_payment: true,
  dry_run: true,
});
```

Add a keysend case with `target_pubkey`, exact hexadecimal `amount`,
`keysend: true`, and `dry_run: true`. Add blocked cases for stopped node,
disconnected peer, no usable channel, insufficient known capacity, and a
rejected dry run classified through `diagnosePaymentError`.

- [ ] **Step 3: Run tests and verify failure**

Run:

```bash
npx vitest run tests/lib/paymentReadiness.test.ts
```

Expected: FAIL because readiness exports do not exist.

- [ ] **Step 4: Implement readiness types and pure summary**

Define:

```ts
export type PaymentRequest =
  | { mode: "invoice"; invoice: string }
  | { mode: "keysend"; targetPubkey: string; amount: `0x${string}` };

export interface PaymentReadinessResult {
  status: "ready" | "warning" | "blocked";
  checkedAt: number;
  summary: ChannelCapacitySummary;
  diagnostic?: PaymentDiagnostic;
}
```

Use `BigInt(channel.local_balance)` and `BigInt(channel.remote_balance)` for
capacity totals.

- [ ] **Step 5: Implement local checks and Fiber dry run**

`checkPaymentReadiness` accepts `{ fiber, nodeStatus, peerConnected, channels,
request }`. Return blocked diagnostics before calling Fiber when a prerequisite
is known to fail. Otherwise build the invoice or keysend payload, call
`sendPayment` with `dry_run: true`, and return `ready`. Convert thrown errors
through `diagnosePaymentError`.

- [ ] **Step 6: Export the public module and run tests**

Export types, `diagnosePaymentError`, `summarizeUsableChannels`,
`assessLocalReadiness`, and `checkPaymentReadiness` from `index.ts`.

Run:

```bash
npx vitest run tests/lib/paymentDiagnostics.test.ts tests/lib/paymentReadiness.test.ts
git add lib/paymentInfrastructure tests/lib/paymentDiagnostics.test.ts tests/lib/paymentReadiness.test.ts
git commit -m "feat: add payment readiness preflight"
```

Expected: all readiness and diagnostics tests pass.

### Task 4: React Readiness Hook

**Files:**
- Create: `lib/paymentInfrastructure/usePaymentReadiness.ts`
- Modify: `lib/paymentInfrastructure/index.ts`
- Create: `tests/lib/usePaymentReadiness.test.tsx`

- [ ] **Step 1: Write failing hook lifecycle tests**

Use `renderHook` and verify:

```ts
const { result } = renderHook(() => usePaymentReadiness(options));
await act(async () => result.current.check(request));
expect(result.current.result?.status).toBe("ready");
act(() => result.current.invalidate());
expect(result.current.result).toBeNull();
```

Add a deferred-promise case where request A resolves after request B; only B may
update the final result. Assert `checking` is true while the latest call is
pending.

- [ ] **Step 2: Run the test and verify failure**

Run:

```bash
npx vitest run tests/lib/usePaymentReadiness.test.tsx
```

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement the hook**

Use a monotonic `requestIdRef`, `useState` for result/checking, and:

```ts
const check = useCallback(async (request: PaymentRequest) => {
  const requestId = ++requestIdRef.current;
  setChecking(true);
  const next = await checkPaymentReadiness({ ...options, request });
  if (requestId === requestIdRef.current) {
    setResult(next);
    setChecking(false);
  }
  return next;
}, [options]);

const invalidate = useCallback(() => {
  requestIdRef.current += 1;
  setChecking(false);
  setResult(null);
}, []);
```

Memoize the caller-provided options in page code so hook callbacks do not churn.

- [ ] **Step 4: Export, test, and commit**

Run:

```bash
npx vitest run tests/lib/usePaymentReadiness.test.tsx
git add lib/paymentInfrastructure tests/lib/usePaymentReadiness.test.tsx
git commit -m "feat: add payment readiness hook"
```

Expected: lifecycle and stale-response tests pass.

### Task 5: Payments Readiness UI

**Files:**
- Modify: `app/[locale]/payments/page.tsx`
- Modify: `lib/i18n/messages/en.ts`
- Modify: `lib/i18n/messages/zh.ts`
- Modify: `tests/pages/invoices-payments.test.tsx`
- Modify: `tests/pages/mobile-payments.test.tsx`

- [ ] **Step 1: Write failing page tests**

Add deterministic Fiber mocks for `listChannels` and `sendPayment`. Cover:

```ts
fireEvent.change(screen.getByLabelText("Invoice"), {
  target: { value: "fibt1invoice" },
});
fireEvent.click(screen.getByRole("button", { name: "Check readiness" }));
await screen.findByText("Ready to pay");
expect(fiber.sendPayment).toHaveBeenCalledWith(
  expect.objectContaining({ invoice: "fibt1invoice", dry_run: true }),
);
```

Add tests proving input changes clear the result, Send performs a dry run before
the real request, and a rejected dry run prevents any call with
`dry_run !== true`. Add a Chinese assertion for the blocked recovery message.

- [ ] **Step 2: Run focused page tests and verify failure**

Run:

```bash
npx vitest run tests/pages/invoices-payments.test.tsx tests/pages/mobile-payments.test.tsx
```

Expected: readiness controls are not found.

- [ ] **Step 3: Make the payment form visible in prerequisite states**

Replace the Payments page's early node/peer returns with a compact prerequisite
banner above the form. Pass nullable Fiber runtime facts to `SendPayment`; keep
real send and readiness controls disabled only while required data is absent or
a request is running. This lets users inspect what is missing instead of seeing
an empty workflow.

- [ ] **Step 4: Add readiness controls and localized result**

Add `PaymentReadinessPanel` with a command button, text status, recovery action,
and technical detail. Use existing restrained panel styling and no invented
confidence percentage. Call `invalidate()` from every request field and mode
change.

- [ ] **Step 5: Preflight the real send**

Build one `PaymentRequest`, await `check(request)`, and stop when status is
`blocked`. For `ready` or `warning`, call the existing real `sendPayment`
without `dry_run`. Route real-send failures through `diagnosePaymentError` so
the same recovery wording is used.

- [ ] **Step 6: Add English and Chinese messages**

Add labels for check/checking, ready/warning/blocked, stale semantics, the
non-guarantee note, and every diagnostic code under `paymentsPage.diagnostics`.
Use direct recovery language such as opening/funding a channel, reconnecting the
peer, checking asset type, or increasing the fee limit.

- [ ] **Step 7: Run tests and commit**

Run:

```bash
npx vitest run tests/pages/invoices-payments.test.tsx tests/pages/mobile-payments.test.tsx tests/i18n/messages.test.ts
git add app/\[locale\]/payments/page.tsx lib/i18n/messages/en.ts lib/i18n/messages/zh.ts tests/pages/invoices-payments.test.tsx tests/pages/mobile-payments.test.tsx
git commit -m "feat: add payment readiness UX"
```

Expected: localized readiness flows pass.

### Task 6: Channel Capacity Summary

**Files:**
- Modify: `app/[locale]/channels/page.tsx`
- Modify: `lib/i18n/messages/en.ts`
- Modify: `lib/i18n/messages/zh.ts`
- Modify: `tests/pages/channels.test.tsx`

- [ ] **Step 1: Write a failing capacity-summary page test**

Return enabled Normal/Ready channels plus disabled and shutdown channels from
`listChannels`. Assert the UI shows the usable count and exact aggregate
outbound/inbound values while excluding unusable balances.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npx vitest run tests/pages/channels.test.tsx
```

Expected: capacity summary labels are missing.

- [ ] **Step 3: Render the reusable summary**

Call `summarizeUsableChannels(channels)` with `useMemo` and render three compact
metrics in an unframed responsive grid above the channel list. Format totals by
converting each `bigint` to a decimal string before `shannonsToDisplay`.

- [ ] **Step 4: Add localized labels, test, and commit**

Run:

```bash
npx vitest run tests/pages/channels.test.tsx tests/i18n/messages.test.ts
git add app/\[locale\]/channels/page.tsx lib/i18n/messages/en.ts lib/i18n/messages/zh.ts tests/pages/channels.test.tsx
git commit -m "feat: show usable channel capacity"
```

Expected: channel tests pass in English and Chinese.

### Task 7: License and Submission Documentation

**Files:**
- Create: `LICENSE`
- Create: `docs/SUBMISSION_CHECKLIST.md`
- Modify: `README.md`
- Modify: `docs/HACKATHON_SUBMISSION.md`
- Modify: `docs/TECHNICAL_BREAKDOWN.md`
- Modify: `docs/DEMO_SCRIPT.md`

- [ ] **Step 1: Add the MIT license**

Use the standard MIT text with:

```text
Copyright (c) 2026 tianlitao
```

- [ ] **Step 2: Add the deliverables matrix**

Create a table with every announcement requirement: summary, category, team,
open repository, runnable instructions, hosted HTTPS demo, video, technical
breakdown, infrastructure gap, roadmap, AI claim, working/mocked/production
status, registration, and CKBoost submission. Mark only video upload,
registration confirmation, and final CKBoost submission as maintainer actions.

- [ ] **Step 3: Document the reusable API**

Add this shape to the technical breakdown:

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

Explain that dry run does not reserve liquidity.

- [ ] **Step 4: Harden submission links and claims**

Change all hosted demo links to
`https://fiber-wallet-ux-kit.tianlitao3399.workers.dev/`. Update working and
production-hardening lists with exact amount parsing, readiness, diagnostics,
and Chrome tests. Keep the video field explicitly pending rather than inventing
a URL.

- [ ] **Step 5: Add a final recording checklist**

Extend the demo script with readiness success/failure, channel capacity, the
technical module export, and a final instruction to add the uploaded URL to
`docs/HACKATHON_SUBMISSION.md` and CKBoost.

- [ ] **Step 6: Check links and commit**

Run:

```bash
rg -n "http://fiber-wallet|TBD|TODO|will be added" README.md docs
git diff --check
git add LICENSE README.md docs
git commit -m "docs: complete hackathon submission materials"
```

Expected: no HTTP demo link, hidden placeholder, or whitespace error remains.

### Task 8: Chrome End-to-End Verification

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `next.config.mjs`
- Create: `playwright.config.ts`
- Create: `tests/e2e/runtime.spec.ts`

- [ ] **Step 1: Install Playwright with the writable cache**

Run:

```bash
npm_config_cache=/tmp/codex-npm-cache npm install --save-dev @playwright/test@1.61.1
```

Expected: package and lockfile include `@playwright/test`; no browser download
is needed because tests use installed Google Chrome.

- [ ] **Step 2: Write failing browser tests**

Configure `channel: "chrome"`, `ignoreHTTPSErrors: true`, desktop and mobile
projects, and an HTTPS `webServer` running `npm run dev -- --hostname
127.0.0.1`.

Write tests that assert:

```ts
await page.goto("/en");
expect(await page.evaluate(() => crossOriginIsolated)).toBe(true);

const bridge = await request.get("/joyid-sign-bridge");
expect(bridge.headers()["cross-origin-opener-policy"]).toBe(
  "same-origin-allow-popups",
);
expect(bridge.headers()["cross-origin-embedder-policy"]).toBeUndefined();
```

Also navigate English/Chinese routes and, on the mobile project, assert the
payment form and bottom tab bar bounding boxes do not overlap.

- [ ] **Step 3: Run E2E and observe the JoyID header failure**

Run:

```bash
npx playwright test
```

Expected before the config fix: the bridge still receives app-wide COEP in the
Next development server.

- [ ] **Step 4: Exclude the bridge from general development headers**

Change the general source to a Next-compatible negative lookahead:

```js
{
  source: "/:path((?!joyid-sign-bridge).*)",
  headers: [
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
  ],
}
```

Keep the explicit bridge `same-origin-allow-popups` rule and the production
`public/_headers` behavior.

- [ ] **Step 5: Add scripts and run Chrome E2E**

Add:

```json
"test:e2e": "playwright test"
```

Run:

```bash
npm run test:e2e
```

Expected: desktop Chrome and mobile-emulated Chrome projects pass.

- [ ] **Step 6: Run the complete verification suite**

Run:

```bash
npm run lint
npm test
npm run build
npm run test:e2e
git diff --check
```

Expected: lint has no errors, all Vitest tests pass, static export succeeds,
Chrome tests pass, and diff check is clean.

- [ ] **Step 7: Commit browser verification**

```bash
git add package.json package-lock.json next.config.mjs playwright.config.ts tests/e2e/runtime.spec.ts
git commit -m "test: verify runtime flows in Chrome"
```

## Final Audit

- [ ] Compare `docs/HACKATHON_SUBMISSION.md` against every deliverable in the
  announcement.
- [ ] Run `git status --short --branch` and report commits ahead of
  `origin/main`.
- [ ] Report the exact tests, build, and Chrome results.
- [ ] Report remaining maintainer actions: confirm CKBoost registration, upload
  the demonstration video, add its URL, push the branch, and submit before
  2026-07-15 23:59 UTC.
