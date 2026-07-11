# Node Pubkey Copy Design

## Goal

Let users copy the running Fiber node's complete public key from the Dashboard
without expanding the long identifier in the layout.

## Interaction

- Render the Node Pubkey information tile as a semantic button.
- Keep the existing truncated public key visible.
- Copy the complete `nodeInfo.pubkey` value when the tile is clicked or
  keyboard-activated.
- Show localized `Copied` feedback for two seconds after a successful copy.
- Show localized `Copy failed` feedback when the Clipboard API is unavailable
  or rejects the write, while leaving the action available for another attempt.
- Reset transient feedback when the node public key changes.

## Visual And Accessibility Rules

- Preserve the existing Dashboard grid dimensions and dark visual style.
- Add a compact action label inside the tile instead of introducing a new icon
  dependency.
- Give the button a localized accessible name that identifies the Node Pubkey
  copy action.
- Provide visible hover and keyboard focus states.
- Use an `aria-live` region for copy-result feedback.

## Testing

- Verify that activating the Node Pubkey tile writes the complete, untruncated
  public key to the Clipboard API.
- Verify localized success feedback.
- Verify localized failure feedback when clipboard access is unavailable.
- Run the focused Dashboard test, the full Vitest suite, lint, and production
  build.
