# Edge Case Audit — T-026
**Date:** 2026-06-18
**Auditor:** Claude Code (T-026)
**Source doc:** `docs/ux-flows.md` v1.0
**Result:** 49 Pass / 1 Fixed / 2 Deferred-by-design (not bugs)

---

## How to read this table

| Status | Meaning |
|--------|---------|
| **Pass** | Implemented and verified in code |
| **Fixed** | Was missing; implemented in this session |
| **Deferred** | Explicitly deferred by the UX spec (not a bug) |

---

## Flow 1 — Adding Items by Typing

| EC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| EC1-1 | No suggestions match — dropdown does not appear | Pass | `SuggestionsDropdown` only renders when `suggestions.length > 0` |
| EC1-2 | Aisle not yet created — "+ New aisle" inline field | Pass | `AislePicker` shows `+ New aisle` row; creates aisle and selects it |
| EC1-3 | Item already on active list — hard-blocked | Pass | `AddItemSheet.handleSubmit()` queries for case-insensitive duplicate before writing; inline error shown |
| EC1-4 | Store has no aisles — inline prompt, must create one to save | Pass | `AislePicker.openPicker()` jumps straight to create input when `aisles.length === 0`; "No aisles yet — add one to get started." note shown; `canSubmit` requires `selectedAisle !== null` |
| EC1-5 | Store changed in sheet — aisle picker resets | Pass | `setSelectedAisle(null)` called on every store change in the picker |
| EC1-6 | Offline — item saved locally with ⚠ icon, syncs on reconnect | Pass | `useGroceryItems.addItem()` detects offline via `isConnectedRef`, writes optimistic row with `pending_sync: true`, enqueues; flushed on reconnect |
| EC1-7 | Dismiss mid-entry — "Discard this item?" confirm | Pass | `AddItemSheet.handleClose()` checks `isDirtyRef.current` and fires `Alert.alert` before discarding |

---

## Flow 2 — Adding Items by Voice

| EC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| EC2-1 | Aisle unknown — amber "——", [Add All] blocked | Pass | `VoiceItemCard` renders amber "——" when `aisleId === null`; `VoiceReviewSheet` blocks add when `hasUnknownAisle` |
| EC2-2 | No speech / silence — retry or type instead | Pass | `ListeningOverlay` handles `state === 'no-speech'` and done+empty; shows [Retry] [Type Instead] |
| EC2-3 | Partial parse — unparsed card starts in edit mode | Pass | `VoiceItemCard` initialises `editing = !item.parsed`; raw text pre-fills name field |
| EC2-4 | Duplicate items in batch — merged by summing qty | Pass | `parseVoiceInput` merges same-name items by accumulating `qty` |
| EC2-5 | Duplicate already on active list — per-item toast | Pass | `VoiceReviewSheet.handleAdd()` runs duplicate check per item before writing; sets `item.error` inline |
| EC2-6 | Mic permission denied — [Open Settings] deep link | Pass | `ListeningOverlay` handles `state === 'permission-denied'`; shows `Linking.openSettings()` button |
| EC2-7 | Add only some items — checkbox per card | Pass | Each `VoiceItemCard` has a checkbox; button label switches to "Add Selected (N)" |

---

## Flow 3 — Adding Items by Barcode Scan

| EC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| EC3-1 | Barcode not in Open Food Facts — manual name entry | Pass | `useBarcodeScanner` returns `name: null`; `AddItemSheet` shows "Product not found. Enter a name manually." notice |
| EC3-2 | Barcode previously scanned — filled from history, "📋 From your history" label | Pass | `useBarcodeScanner` queries `item_history` first; `AddItemSheet` shows label and pre-fills store+aisle |
| EC3-3 | Long/unhelpful product name — editable, saved name is what gets stored | Pass | Name field is editable; user's edit is what goes into `grocery_items` and `item_history` |
| EC3-4 | Camera permission denied — [Open Settings] deep link | Pass | `BarcodeScanner` handles `!permission.granted`; shows `Linking.openSettings()` or re-request button |
| EC3-5 | Offline, not in local history — "Can't look up this product offline." | Pass | `useBarcodeScanner` catches `fetch` errors and returns `offline: true`; `AddItemSheet` shows notice |
| EC3-6 | Multiple barcodes in frame — locks on first, [Rescan] shown | Pass | `scanned` flag in `BarcodeScanner` ignores subsequent scans; `handleRescan` resets it |
| EC3-7 | Scan from inside Add Item sheet — fills name only, keeps store/aisle | Pass | `StoreScreen` uses `scanMode === 'sheet'` path, calls `addItemSheetRef.current?.setNameFromBarcode()` which only updates name |

---

## Flow 4 — Shopping Mode: Checking Off Items

| EC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| EC4-1 | Accidental check — instant uncheck, item returns to sort position | Pass | `toggleItem` is a symmetric toggle; unchecked items sort by `sort_order` in `buildAisleGroups` |
| EC4-2 | Another member adds item while shopping — animated in | Pass | Realtime `postgres_changes` subscription on `grocery_items` re-fetches; `LayoutAnimation` applied on subsequent loads |
| EC4-3 | Simultaneous check by two members — last-write-wins | Pass | Both devices write independently; Supabase last-write-wins; no conflict UI needed |
| EC4-4 | All aisle items checked — aisle auto-collapses | Pass | `isCollapsed()` returns true when `group.items.every(i => i.checked) && !manuallyExpanded.has(id)`; header still tappable to expand |
| EC4-5 | All items across all aisles checked — "Everything's in the cart 🛒" | Pass | `allChecked` banner rendered; End Trip button style changes to draw attention |
| EC4-6 | Long-press item — context menu with edit/move/delete | Pass | `ItemContextMenu` modal; delete shows inline confirm within the same menu (single tap, no second modal) |
| EC4-7 | Offline check-off — local + ⚠ icon, syncs on reconnect | Pass | `toggleItem` enqueues `toggle_item` mutation when `!isConnectedRef.current`; item gets `pending_sync: true`, ⚠ rendered in `GroceryItemRow` |

---

## Flow 5 — Shopping Mode: End Trip

| EC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| EC5-1 | No checked items — notice instead of modal | Pass | `handleEndTripPress` fires `Alert.alert` when `!hasChecked`; modal never opens |
| EC5-2 | No items at all — End Trip button hidden | Pass | End Trip button and footer are inside the `items.length > 0` branch only |
| EC5-3 | All unchecked in modal — grayed End Trip button + note | Pass | `EndTripModal` disables Confirm and shows "Check off items before ending your trip." when `checkedItems.length === 0` |
| EC5-4 | Race condition — another member ends trip first | Pass | `EndTripModal` watches for all initial checked items disappearing via realtime; shows notice + auto-dismisses after 3 s. `endTrip()` returns `raceLost: true` on row-count mismatch |
| EC5-5 | Wrong store tab — cancel always available | Pass | `EndTripModal` always shows [Cancel]; no action until confirmed |
| EC5-6 | Empty list after trip — empty state | Pass | After optimistic removal, `items.length === 0` triggers empty state with "Your list is empty" copy |
| EC5-7 | Offline at End Trip — local apply + queued history writes | Pass | `endTrip()` detects offline, applies optimistic removal, enqueues `end_trip` mutation |

---

## Flow 6 — Staples List: Browsing & Copying

| EC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| EC6-1 | Mixed stores, target aisle doesn't exist — picker | Pass | `findAisleMismatches` detects missing aisles; `AisleMismatchModal` shown before copy executes |
| EC6-2 | Item already on target list — "Already on list", cannot re-select | Pass | `checkDuplicates` pre-screens; `duplicateIds` set; `StapleRow` shows amber "Already on list" label; row not selectable |
| EC6-3 | No items selected — [Add to List] disabled | Pass | Button disabled when `validSelectedCount === 0` |
| EC6-4 | Long-press in selection mode — select all in store / select all | Pass | `handleLongPressItem` shows `Alert.alert` with two select-all options |
| EC6-5 | Staples list empty — empty state | Pass | `items.length === 0` renders empty state with "+ Add a Staple" CTA |
| EC6-6 | Search staples — inline filter, clears on exit | Pass | `TextInput` with `onChangeText` → `setSearchQuery`; `buildStoreGroups` filters client-side; `handleSearchClose` resets query |

---

## Flow 7 — Staples List: Adding & Editing

| EC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| EC7-1 | Delete a staple — inline confirm, no modal | Pass | `AddStapleSheet` shows `deleteConfirming` state inline; requires single tap on [Delete] to confirm |
| EC7-2 | Save with no name — button disabled + inline error | Pass | `canSubmit = name.trim().length > 0`; `handleSubmit` shows "Item name is required." if bypassed |
| EC7-3 | No default store/aisle — allowed | Pass | Only `name` is required; `selectedStoreId` and `selectedAisle` can remain null |
| EC7-4 | Duplicate staple name — warn but allow | Pass | `Alert.alert` with [Save Anyway] [Cancel]; skip check when offline |
| EC7-5 | Edit staple doesn't affect copied grocery items | Pass | Only `staple_items` row is updated; no cascade to `grocery_items` |

---

## Flow 8 — Aisle & Store Configuration

| EC ID | Description | Status | Notes |
|-------|-------------|--------|-------|
| EC8-1 | Rename aisle to duplicate name — blocked | Pass | Both `AisleRow` and `AddAisleRow` check `storeAisles` for case-insensitive match before saving |
| EC8-2 | Delete aisle with items — prompt for target aisle | **Fixed** | Added "Delete aisle" button inside `AisleRow` edit state. `stores.tsx` queries item count: if items exist, prompts user to pick a target aisle (Alert with one button per other aisle); if no items, simple confirm. Items are moved via `UPDATE grocery_items SET aisle_id=...`, then aisle deleted. Note: "Leave unassigned" option is deferred — `aisle_id` is non-nullable in the current schema and list view has no unassigned section. |
| EC8-3 | Aisle limit (10) — "+ Add aisle" hidden, notice shown | Pass | `StoreSection` hides `AddAisleRow` and shows "Maximum of 10 aisles reached." when `aisles.length >= MAX_AISLES` |
| EC8-4 | Rename store to duplicate name — blocked | Pass | `StoreHeader` checks `allStores` for case-insensitive name match before saving |
| EC8-5 | Delete store — deferred v1 | Deferred | Per spec: "Not available in v1." Placeholder note "To remove a store, contact support." shown in `StoreSection` |
| EC8-6 | Reorder stores (tab order) — deferred v1 | Deferred | Per spec: "Not supported in v1. Tab order is fixed to creation order." No drag handles on store rows |
| EC8-7 | Add 4th store — hidden + notice | Pass | `stores.tsx` hides "Add a store" row when `stores.length >= MAX_STORES`; shows "Maximum of 3 stores reached. Rename an existing store to switch." |

---

## Summary

| Flow | Total ECs | Pass | Fixed | Deferred |
|------|-----------|------|-------|----------|
| Flow 1 — Add by Typing | 7 | 7 | 0 | 0 |
| Flow 2 — Voice Input | 7 | 7 | 0 | 0 |
| Flow 3 — Barcode Scan | 7 | 7 | 0 | 0 |
| Flow 4 — Check Off | 7 | 7 | 0 | 0 |
| Flow 5 — End Trip | 7 | 7 | 0 | 0 |
| Flow 6 — Staples Copy | 6 | 6 | 0 | 0 |
| Flow 7 — Staples CRUD | 5 | 5 | 0 | 0 |
| Flow 8 — Config | 7 | 4 | 1 | 2 |
| **Total** | **53** | **50** | **1** | **2** |

> EC8-5 and EC8-6 are deferred by the UX spec, not implementation gaps.
> EC8-2's "Leave unassigned" sub-option is noted as a v2 item (requires schema change to allow nullable `aisle_id` and a corresponding list view update).
