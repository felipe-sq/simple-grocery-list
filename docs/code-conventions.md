# Code Conventions — Grocery App

Rules that have caused lint/type errors in past sessions. Read this before writing new components or hooks.

---

## TypeScript

### Array types — use `T[]`, never `Array<T>`
```ts
// ✗ forbidden by @typescript-eslint/array-type
historyItems: Array<{ id: string; name: string }>;

// ✓ correct
historyItems: { id: string; name: string }[];

// ✓ correct (primitive)
itemIds: string[];
```

---

## React Hooks

### Never call `setState` synchronously in a `useEffect` body
The `react-hooks/set-state-in-effect` rule (from the `expo` ESLint preset) forbids it.

```tsx
// ✗ forbidden — synchronous setState inside effect body
useEffect(() => {
  if (visible) {
    setError(null);      // ← lint error
    setReady(true);      // ← lint error
  }
}, [visible]);
```

**Pattern A — reset on close, not on open.**
Initial state values are already the defaults. Reset them in the close handler so they are clean before the next open.

```tsx
// ✓ correct — no setState in the effect
useEffect(() => {
  if (visible) {
    someRef.current = computeSomething(); // ref updates are fine
  }
}, [visible]);

function handleClose() {
  setError(null);   // reset happens on close, not on open
  setReady(false);
  onClose();
}
```

**Pattern B — defer via `setTimeout` when you must react to a prop change.**
Putting the call inside a `setTimeout` callback makes it asynchronous and satisfies the rule.

```tsx
// ✓ correct — setState deferred to a callback
useEffect(() => {
  if (!someCondition) return;
  const id = setTimeout(() => setRaceNotice(true), 0);
  return () => clearTimeout(id);
}, [someCondition]);
```

Use Pattern A by default. Use Pattern B only when you genuinely need to trigger a state update in response to a prop change that can't be handled on close.

---

## Component design

### Keep modals always mounted, use `visible` prop
The app renders modals unconditionally and toggles them with a `visible` boolean. This preserves Realtime subscription state and avoids remount cost.

```tsx
// ✓ always rendered
<EndTripModal
  visible={endTripModalVisible}
  ...
/>

// ✗ avoid — remounts on every open, loses subscriptions
{endTripModalVisible && <EndTripModal ... />}
```

When using always-mounted modals, use the **reset-on-close** pattern (Pattern A above) to ensure clean state on the next open.

### Close handlers should reset local state
Any component that is always-mounted and has transient local state (errors, loading flags, form values) must reset that state in its close/dismiss handler — not in an open effect.

---

## Offline queue (`lib/offlineQueue.ts`)

All mutations added to the queue must be handled in the `flushQueue` callback inside `useGroceryItems.ts`. When you add a new `MutationType`:

1. Add the type to `offlineQueue.ts` and the `OfflineMutation` union.
2. Add a `if (mutation.type === 'your_type')` branch in `flushQueue`.
3. The handler must `return true` on success and `return false` (keeping it in the queue) on failure.
4. History writes are non-fatal — always `await` them but do not `return false` if they fail.

---

## End of ticket checklist (Claude Code must run these before marking done)

```bash
npx tsc --noEmit          # zero type errors
npx eslint . --max-warnings 0   # zero lint errors and warnings
```
