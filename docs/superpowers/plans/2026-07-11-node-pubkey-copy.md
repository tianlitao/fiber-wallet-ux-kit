# Node Pubkey Copy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the running node's Dashboard public-key tile copy the complete
Node Pubkey with localized success and failure feedback.

**Architecture:** Extend the existing `InfoCard` with an optional action while
keeping noninteractive cards unchanged. `FiberIdentityWalletCard` owns the
clipboard operation and transient result state because it already owns the
displayed node information.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, project i18n, Vitest,
Testing Library

---

### Task 1: Define Node Pubkey Copy Behavior

**Files:**
- Modify: `tests/pages/dashboard.test.tsx`
- Modify: `lib/i18n/messages/en.ts`
- Modify: `lib/i18n/messages/zh.ts`

- [ ] **Step 1: Write the failing success test**

Render the Dashboard with a running node and a full test public key. Stub
`navigator.clipboard.writeText`, activate the localized copy button, and assert
that the complete key is written while the localized success text appears.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- tests/pages/dashboard.test.tsx
```

Expected: FAIL because no `复制节点公钥` button exists.

- [ ] **Step 3: Add localized interaction strings**

Add these keys under `dashboard`:

```ts
copyNodePubkey: "Copy Node Pubkey",
nodePubkeyCopied: "Copied",
nodePubkeyCopyFailed: "Copy failed",
```

and:

```ts
copyNodePubkey: "复制节点公钥",
nodePubkeyCopied: "已复制",
nodePubkeyCopyFailed: "复制失败",
```

### Task 2: Implement Copy And Feedback

**Files:**
- Modify: `components/FiberIdentityWalletCard.tsx`
- Test: `tests/pages/dashboard.test.tsx`

- [ ] **Step 1: Implement the minimal clipboard action**

Track `idle`, `copied`, and `failed` copy states. Copy the unmodified
`nodeInfo.pubkey`, show the corresponding localized result, and reset copied
feedback after two seconds. Treat a missing Clipboard API or rejected write as
`failed`.

- [ ] **Step 2: Make only Node Pubkey interactive**

Extend `InfoCard` with optional `onClick`, `actionLabel`, and `feedback`
properties. Render a semantic `button` only when `onClick` exists; preserve the
existing `div` markup for Version, Channels, Connected Peers, and Min CKB
Funding. Add hover, visible focus, and `aria-live="polite"` feedback.

- [ ] **Step 3: Run the focused test and verify GREEN**

Run:

```bash
npm test -- tests/pages/dashboard.test.tsx
```

Expected: all Dashboard tests pass.

- [ ] **Step 4: Add and verify the failure test**

Make `writeText` reject, click the Node Pubkey tile, and assert that `复制失败`
appears while the button remains enabled.

### Task 3: Verify The Change

**Files:**
- Verify: `components/FiberIdentityWalletCard.tsx`
- Verify: `tests/pages/dashboard.test.tsx`
- Verify: `lib/i18n/messages/en.ts`
- Verify: `lib/i18n/messages/zh.ts`

- [ ] **Step 1: Run full quality checks**

```bash
npm run lint
npm test
npm run build
```

Expected: all commands exit successfully.

- [ ] **Step 2: Inspect the final diff**

Run:

```bash
git diff --check
git diff -- components/FiberIdentityWalletCard.tsx tests/pages/dashboard.test.tsx lib/i18n/messages/en.ts lib/i18n/messages/zh.ts
```

Expected: no whitespace errors and no unrelated runtime changes.
