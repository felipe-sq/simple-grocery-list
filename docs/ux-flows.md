# UX Flows — Household Grocery List App
**Version:** 1.0
**Date:** June 14, 2026
**Status:** Draft
**Related:** grocery-app-prd.md v0.3

---

## How to Read This Document

Each flow contains:
- **Entry point** — what triggers the flow
- **Wireframe** — ASCII screen layout at the key moment(s)
- **Step-by-step** — numbered happy path
- **Edge cases** — numbered, labeled, and handled explicitly

Flows covered:
1. Adding Items — Typing
2. Adding Items — Voice
3. Adding Items — Barcode Scan
4. Shopping Mode — Checking Off Items
5. Shopping Mode — End Trip
6. Staples List — Browsing & Copying to Active List
7. Staples List — Adding & Editing a Staple
8. Aisle & Store Configuration

---

## Flow 1 — Adding Items by Typing

### Entry Point
User taps `+` in the top-right of any store tab.

### Wireframe — Add Item Sheet (initial state)
```
╭─────────────────────────────────────╮
│  Add Item                      [✕]  │
│─────────────────────────────────────│
│  Item name                          │
│  ┌───────────────────────────────┐  │
│  │ |                             │  │
│  └───────────────────────────────┘  │
│                                     │
│  (suggestions appear here as        │
│   user types — see below)           │
│                                     │
│  Store          Aisle               │
│  ┌────────────┐ ┌─────────────────┐ │
│  │ Costco   ▾ │ │ Select aisle  ▾ │ │
│  └────────────┘ └─────────────────┘ │
│                                     │
│  Qty      Unit                      │
│  ┌──────┐  ┌──────────────────────┐ │
│  │      │  │ e.g. lbs, cans     ▾ │ │
│  └──────┘  └──────────────────────┘ │
│                                     │
│  Notes (optional)                   │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  └───────────────────────────────┘  │
│                                     │
│         [    Add Item    ]          │
╰─────────────────────────────────────╯
```

### Wireframe — Suggestions Dropdown (mid-typing)
```
╭─────────────────────────────────────╮
│  Add Item                      [✕]  │
│─────────────────────────────────────│
│  Item name                          │
│  ┌───────────────────────────────┐  │
│  │ oat mi|                       │  │
│  └───────────────────────────────┘  │
│  ┌───────────────────────────────┐  │
│  │ 🕐  Oat milk      Costco·Dairy│  │
│  │ 🕐  Oat milk bars  TJ's·Snacks│  │
│  └───────────────────────────────┘  │
│                                     │
│  Store          Aisle               │
│  ┌────────────┐ ┌─────────────────┐ │
│  │ Costco   ▾ │ │ Select aisle  ▾ │ │
│  └────────────┘ └─────────────────┘ │
...
```

### Happy Path
1. User taps `+` on the Costco tab → sheet slides up, Store pre-set to "Costco"
2. Keyboard appears, cursor in Item Name field
3. User types "oat mi" → suggestion dropdown appears, ranked by recency + frequency
4. User taps "Oat milk" → Name fills in; Store and Aisle auto-fill to last-used values ("Costco · Dairy")
5. User optionally sets Qty ("2") and Unit ("cartons")
6. User taps "Add Item" → sheet dismisses; item appears in Dairy section of Costco tab instantly; syncs to all devices

### Edge Cases

**EC1-1 — No suggestions match**
Dropdown does not appear. User types full name and manually selects Aisle. Store remains pre-filled from current tab.

**EC1-2 — Aisle not yet created**
Aisle picker shows existing aisles + an "+ New aisle" option at the bottom. Tapping it opens a single inline text field to name and save the new aisle before returning to the Add Item sheet. New aisle is added to the store's aisle list for all household members.

**EC1-3 — Item already on the active list**
After tapping "Add Item," the app detects a duplicate (same name, same store, case-insensitive). Save is blocked — [Add Item] button does not fire. An inline error appears below the name field: *"Oat milk is already on your Costco list."* User must change the name or cancel.

**EC1-4 — Store has no aisles configured yet**
Aisle picker shows only "+ New aisle." User must create at least one aisle to save the item. Inline prompt: *"No aisles yet — add one to get started."*

**EC1-5 — User adds item from a tab, then changes Store in the sheet**
Aisle picker resets to the aisles for the newly selected store. Previously entered aisle selection is cleared.

**EC1-6 — Network offline**
"Add Item" still works. Item is saved locally, flagged as unsynced (shown with a subtle ⚠ icon on the item row). Syncs automatically on reconnect. Other household members do not see the item until sync completes.

**EC1-7 — User dismisses sheet mid-entry**
Tapping `✕` or swiping down shows: *"Discard this item?"* [Discard] [Keep Editing]. No auto-save of partial entries.

---

## Flow 2 — Adding Items by Voice

### Entry Point
User taps 🎤 in the top-right of any store tab (next to `+`).

### Wireframe — Listening State
```
╭─────────────────────────────────────╮
│                                     │
│                                     │
│           🎤                        │
│     Listening...                    │
│                                     │
│  "Add milk, eggs, and              │
│   two cans of black beans"          │
│                                     │
│         [ Cancel ]                  │
│                                     │
╰─────────────────────────────────────╯
```

### Wireframe — Review State (after speech ends)
```
╭─────────────────────────────────────╮
│  Review Items                  [✕]  │
│─────────────────────────────────────│
│  We heard 3 items. Review before    │
│  adding:                            │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Milk              [Edit ✎]  │    │
│  │ Store: Costco  Aisle: Dairy │    │
│  │ Qty: 1                      │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Eggs              [Edit ✎]  │    │
│  │ Store: Costco  Aisle: ——    │    │  ← aisle unknown, flagged
│  │ Qty: 1                      │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Black beans       [Edit ✎]  │    │
│  │ Store: Costco  Aisle: Canned│    │
│  │ Qty: 2  Unit: cans          │    │
│  └─────────────────────────────┘    │
│                                     │
│  [ Add All (3) ]   [ Cancel ]       │
╰─────────────────────────────────────╯
```

### Happy Path
1. User taps 🎤 on the Costco tab → full-screen listening overlay appears
2. User speaks: *"Add milk, eggs, and two cans of black beans"*
3. Speech ends (silence detected or user taps Done) → Review screen appears
4. App parses utterance into individual items, quantities, and units; auto-fills Store (Costco) and Aisle from history where available
5. User reviews each card — edits any field inline by tapping [Edit ✎]
6. User taps [Add All (3)] → all items saved, sheet dismisses, items appear in correct aisles

### Edge Cases

**EC2-1 — Aisle cannot be inferred**
Item card shows Aisle as "——" highlighted in amber. [Add All] is blocked until all items have an aisle assigned. Inline prompt on the card: *"Tap Edit to assign an aisle."*

**EC2-2 — Speech not recognized / silence**
After 8 seconds of silence or failed recognition: *"We didn't catch that. Try again?"* [Retry] [Type Instead]. "Type Instead" opens Flow 1 sheet.

**EC2-3 — Partial parse (some items unclear)**
Items that couldn't be parsed appear as a card with just a raw text field pre-filled with the heard text. User manually corrects before adding.

**EC2-4 — Duplicate detected in parsed batch**
If two spoken items resolve to the same name, they are merged into one card with combined quantity. User can un-merge via Edit.

**EC2-5 — Duplicate already on active list**
Same behavior as EC1-3 — per-item toast after tapping [Add All], one confirmation per duplicate.

**EC2-6 — Microphone permission denied**
On first tap of 🎤, OS permission prompt appears. If denied: *"Microphone access is needed for voice input. Enable it in Settings."* with a [Open Settings] deep link. 🎤 icon remains visible but tapping shows the same prompt.

**EC2-7 — User wants to add only some parsed items**
Each Review card has a checkbox (checked by default). User unchecks items they don't want. [Add All] becomes [Add Selected (N)].

---

## Flow 3 — Adding Items by Barcode Scan

### Entry Point
User taps 📷 in the top-right of any store tab, or taps the barcode icon inside the Add Item sheet (Flow 1).

### Wireframe — Scanner State
```
╭─────────────────────────────────────╮
│  Scan Barcode              [Cancel] │
│                                     │
│  ┌─────────────────────────────┐    │
│  │                             │    │
│  │      [  camera feed  ]      │    │
│  │                             │    │
│  │   ┌─────────────────────┐   │    │
│  │   │   align barcode     │   │    │
│  │   └─────────────────────┘   │    │
│  │                             │    │
│  └─────────────────────────────┘    │
│                                     │
│      Or enter barcode manually      │
│  ┌───────────────────────────────┐  │
│  │                               │  │
│  └───────────────────────────────┘  │
╰─────────────────────────────────────╯
```

### Wireframe — Match Found
```
╭─────────────────────────────────────╮
│  Add Item                      [✕]  │
│─────────────────────────────────────│
│  Item name                          │
│  ┌───────────────────────────────┐  │
│  │ Oat milk, Oatly 32oz          │  │  ← pre-filled from Open Food Facts
│  └───────────────────────────────┘  │
│                                     │
│  Store          Aisle               │
│  ┌────────────┐ ┌─────────────────┐ │
│  │ Costco   ▾ │ │ Dairy         ▾ │ │  ← auto-filled from history
│  └────────────┘ └─────────────────┘ │
│                                     │
│  Qty      Unit                      │
│  ┌──────┐  ┌──────────────────────┐ │
│  │ 1    │  │ carton             ▾ │ │
│  └──────┘  └──────────────────────┘ │
│                                     │
│         [    Add Item    ]          │
╰─────────────────────────────────────╯
```

### Happy Path
1. User taps 📷 → camera scanner overlay opens, Store pre-set from current tab
2. User aligns barcode in the target box → barcode detected automatically (no tap needed)
3. App sends UPC to Open Food Facts API → product name returned
4. Add Item sheet pre-fills with product name; Store/Aisle auto-fill from `ItemHistory` if this barcode was scanned before
5. User adjusts Qty/Unit, confirms Aisle, taps "Add Item"
6. Item saved; barcode + product name written to `ItemHistory` for future offline recognition

### Edge Cases

**EC3-1 — Barcode not found in Open Food Facts**
Sheet opens with empty Name field and a notice: *"Product not found. Enter a name manually."* All other fields behave as Flow 1. Barcode is still stored on the item for future lookup.

**EC3-2 — Barcode previously scanned by this household**
Name, Store, and Aisle are auto-filled from the cached `ItemHistory` record without an API call. A subtle "📋 From your history" label appears under the name field.

**EC3-3 — Barcode recognized but product name is very long / unhelpful**
Name field is pre-filled but editable. User can shorten it (e.g., "Oatly Oat Milk Original 32 Fl Oz" → "Oat milk"). Edited name is what gets saved to `ItemHistory`, not the Open Food Facts original.

**EC3-4 — Camera permission denied**
Same as EC2-6 — prompt with [Open Settings] deep link.

**EC3-5 — No network, barcode not in local history**
Scanner still opens. On scan: *"Can't look up this product offline."* Falls back to manual name entry (same as EC3-1). Barcode is stored; name lookup attempted automatically on next reconnect and updates the item if still on the list.

**EC3-6 — Multiple barcodes in frame**
Scanner locks onto the first barcode detected and ignores others. If user wants a different product they tap [Rescan].

**EC3-7 — User scans from inside the Add Item sheet (Flow 1 entry)**
After scan resolves, the sheet returns with Name pre-filled. Store and Aisle retain whatever the user had already entered, rather than being overwritten by history defaults.

---

## Flow 4 — Shopping Mode: Checking Off Items

### Entry Point
User opens any store tab while shopping.

### Wireframe — Active List
```
╭─────────────────────────────────────╮
│ Costco              [+ Add] [🎤][📷]│
│─────────────────────────────────────│
│ ▼ Dairy                             │
│   ○  Oat milk (2 cartons)           │
│   ○  Butter                         │
│   ○  Greek yogurt                   │
│                                     │
│ ▼ Produce                           │
│   ○  Bananas (2 bunches)            │
│   ○  Baby spinach                   │
│                                     │
│ ▼ Frozen                            │
│   ○  Cauliflower rice               │
│─────────────────────────────────────│
│              [End Trip]             │
╰─────────────────────────────────────╯
```

### Wireframe — After Checking Items
```
╭─────────────────────────────────────╮
│ Costco              [+ Add] [🎤][📷]│
│─────────────────────────────────────│
│ ▼ Dairy                    2 of 3 ✓ │
│   ○  Oat milk (2 cartons)           │
│   ·  ~~Butter~~              (faded)│
│   ·  ~~Greek yogurt~~        (faded)│
│                                     │
│ ▼ Produce                  2 of 2 ✓ │
│   ·  ~~Bananas (2 bunches)~~ (faded)│
│   ·  ~~Baby spinach~~        (faded)│
│                                     │
│ ▼ Frozen                   0 of 1 ✓ │
│   ○  Cauliflower rice               │
│─────────────────────────────────────│
│              [End Trip]             │
╰─────────────────────────────────────╯
```

### Happy Path
1. User opens Costco tab — sees all unchecked items grouped by aisle
2. User taps circle next to "Butter" → circle fills with checkmark, row gets strikethrough, row fades and moves to bottom of the Dairy section
3. Aisle header updates: "Dairy  2 of 3 ✓"
4. Change syncs to all household members' devices in real time
5. User continues checking items off across aisles

### Edge Cases

**EC4-1 — Accidental check-off**
User taps a checked item again → it unchecks immediately, strikethrough removed, item returns to top of its aisle section in its original sort position. No confirmation required — uncheck is instant and reversible.

**EC4-2 — Another household member adds an item while user is shopping**
New item appears in the correct aisle section with a subtle highlight or animation to indicate it just arrived. Does not interrupt the user's current scroll position.

**EC4-3 — Another household member checks off the same item simultaneously**
Last-write-wins. Both users see the item as checked. No visible conflict — the item simply becomes checked for both.

**EC4-4 — All items in an aisle are checked**
Aisle header shows "Dairy  3 of 3 ✓" and collapses automatically (saves scroll space). User can tap the header to expand and review checked items if needed.

**EC4-5 — All items across all aisles are checked**
A congratulatory state appears above the End Trip button: *"Everything's in the cart 🛒"* End Trip button pulses subtly to draw attention.

**EC4-6 — User long-presses an item**
Context menu appears with: [Edit item] [Move to different aisle] [Delete from list]. Delete requires a single confirmation tap (no modal).

**EC4-7 — Offline check-off**
Check-off is saved locally and reflected immediately in the UI. Synced on reconnect. Other household members see a ⚠ sync-pending indicator on the item until sync completes.

---

## Flow 5 — Shopping Mode: End Trip

### Entry Point
User taps [End Trip] at the bottom of a store tab.

### Wireframe — End Trip Confirmation Modal
```
╭─────────────────────────────────────╮
│                                     │
│         End Costco Trip?            │
│                                     │
│  This will clear all checked items  │
│  from your Costco list.             │
│                                     │
│  ✓ Butter                           │
│  ✓ Greek yogurt                     │
│  ✓ Bananas (2 bunches)              │
│  ✓ Baby spinach                     │
│                                     │
│  1 unchecked item will stay:        │
│  ○ Cauliflower rice                 │
│                                     │
│  [ End Trip ]     [ Cancel ]        │
╰─────────────────────────────────────╯
```

### Happy Path
1. User taps [End Trip] on the Costco tab
2. Confirmation modal slides up, listing all checked items that will be cleared and any unchecked items that will remain
3. User taps [End Trip] to confirm
4. All checked items are removed from the Costco list
5. Each cleared item is written to `ItemHistory` with `purchased_at = NOW()`
6. Unchecked items remain on the list untouched
7. Modal dismisses; Costco tab now shows only the remaining unchecked items
8. Sync fires to all household members

### Edge Cases

**EC5-1 — No checked items**
[End Trip] button is visible but tapping it shows: *"Nothing's been checked off yet. Check off items as you shop, then end your trip."* [OK]. Button does not open the modal.

**EC5-2 — No items on the list at all**
[End Trip] button is hidden entirely. Empty state shown instead (see EC5-6).

**EC5-3 — All items are unchecked**
Modal shows zero checked items and all unchecked items in the "will stay" list. [End Trip] button in the modal is grayed out with a note: *"Check off items before ending your trip."* [Cancel] is the only active action.

**EC5-4 — Another household member triggers End Trip for the same store simultaneously**
First confirmation wins. Second user's modal shows a notice: *"[Name] already ended this trip. Your list has been updated."* Modal auto-dismisses.

**EC5-5 — User taps End Trip on wrong store tab accidentally**
Cancel is always available in the modal. No destructive action occurs until [End Trip] is confirmed inside the modal.

**EC5-6 — List is empty after End Trip**
Tab shows an empty state:
```
╭─────────────────────────────────────╮
│ Costco                              │
│                                     │
│           🛒                        │
│    Your Costco list is empty.       │
│    Add items to get started.        │
│                                     │
│         [ + Add Item ]              │
╰─────────────────────────────────────╯
```

**EC5-7 — Offline at time of End Trip**
Modal still appears and user can confirm. Deletion is applied locally. `ItemHistory` records are queued and written on reconnect. Other household members see a ⚠ pending-sync indicator on the store tab until sync completes.

---

## Flow 6 — Staples List: Browsing & Copying to Active List

### Entry Point
User taps the "Staples" tab in the main navigation.

### Wireframe — Staples Tab
```
╭─────────────────────────────────────╮
│ Staples                    [+ Add]  │
│─────────────────────────────────────│
│ [Select]                  [Search🔍]│
│                                     │
│ ▼ Costco                            │
│   □  Oat milk       Dairy           │
│   □  Paper towels   Household       │
│   □  Chicken breast Meats           │
│                                     │
│ ▼ Trader Joe's                      │
│   □  Frozen pasta   Frozen          │
│   □  Everything bagel seasoning     │
│   □  Greek yogurt   Dairy           │
│                                     │
│ ▼ Whole Foods                       │
│   □  Baby spinach   Produce         │
│   □  Kombucha       Beverages       │
│                                     │
╰─────────────────────────────────────╯
```

### Wireframe — Selection Mode
```
╭─────────────────────────────────────╮
│ Staples              [Add to List ▾]│
│─────────────────────────────────────│
│ [✕ Cancel]           3 selected     │
│                                     │
│ ▼ Costco                            │
│   ☑  Oat milk       Dairy           │
│   □  Paper towels   Household       │
│   ☑  Chicken breast Meats           │
│                                     │
│ ▼ Trader Joe's                      │
│   □  Frozen pasta   Frozen          │
│   □  Everything bagel seasoning     │
│   ☑  Greek yogurt   Dairy           │
│                                     │
│ ▼ Whole Foods                       │
│   □  Baby spinach   Produce         │
│   □  Kombucha       Beverages       │
╰─────────────────────────────────────╯
```

### Wireframe — "Add to List" Dropdown
```
           ╭──────────────────────╮
           │ Add 3 items to...    │
           │──────────────────────│
           │ ○ Costco             │
           │ ○ Trader Joe's       │
           │ ○ Whole Foods        │
           │ ○ Each item's default│
           ╰──────────────────────╯
```

### Happy Path
1. User opens Staples tab — sees all staples grouped by their default store
2. User taps [Select] → checkboxes appear on all rows; header updates to show count and [Add to List ▾]
3. User taps items to check them (e.g., Oat milk, Chicken breast, Greek yogurt)
4. User taps [Add to List ▾] → dropdown appears with store options
5. User taps "Each item's default" → items are copied to their respective default store lists
6. Selection mode exits; a toast confirms: *"3 items added to your lists."*
7. Staples remain on the staples list unchanged (copy, not move)

### Edge Cases

**EC6-1 — "Add to List" with mixed default stores, user picks a single store**
All selected items (regardless of their default store) are added to the chosen store. Store and Aisle on the copied `GroceryItem` records are set to the target store + each item's default aisle. If an item's default aisle doesn't exist in the target store, it is set to unassigned and flagged — user is prompted to pick an aisle.

**EC6-2 — Item already on the target store's active list**
Before copying, the app checks all selected staples against the active list for the target store (case-insensitive name match). Any duplicates are deselected and highlighted in the selection UI with an inline label: *"Already on list."* They cannot be re-selected. [Add to List] only copies the remaining valid selections. If all selected items are duplicates, [Add to List] is disabled.

**EC6-3 — No items selected when tapping "Add to List"**
Button is disabled (grayed out) until at least one item is checked. Tapping it while disabled does nothing.

**EC6-4 — Select all**
Long-press on any staple row in selection mode → *"Select all in [Store]"* option appears. Tap again for "Select all staples."

**EC6-5 — Staples list is empty**
Tab shows empty state:
```
  No staples yet.
  Add your household's go-to items
  so you can quickly restock them.
       [ + Add a Staple ]
```

**EC6-6 — Searching staples**
Tapping 🔍 opens an inline search bar that filters staple rows in real time by name. Search is local (no network call). Clears on exit.

---

## Flow 7 — Staples List: Adding & Editing a Staple

### Entry Point
User taps [+ Add] on the Staples tab, or taps an existing staple row to edit it.

### Wireframe — Add/Edit Staple Sheet
```
╭─────────────────────────────────────╮
│  Add Staple                    [✕]  │
│─────────────────────────────────────│
│  Item name                          │
│  ┌───────────────────────────────┐  │
│  │ |                             │  │
│  └───────────────────────────────┘  │
│                                     │
│  Default Store      Default Aisle   │
│  ┌────────────────┐ ┌─────────────┐ │
│  │ Select store ▾ │ │ Select    ▾ │ │
│  └────────────────┘ └─────────────┘ │
│                                     │
│  Default Qty    Default Unit        │
│  ┌──────────┐   ┌─────────────────┐ │
│  │          │   │               ▾ │ │
│  └──────────┘   └─────────────────┘ │
│                                     │
│       [    Save Staple    ]         │
│                                     │
│  ─────────────────────────────────  │
│  [🗑 Delete this staple]            │  ← only shown in Edit mode
╰─────────────────────────────────────╯
```

### Happy Path — Adding
1. User taps [+ Add] on Staples tab → sheet slides up
2. User types item name (same inline suggestions as Flow 1 — from item history)
3. User selects Default Store and Default Aisle
4. Optionally sets Default Qty and Unit
5. Taps [Save Staple] → item appears in Staples list under the selected store group; sheet dismisses

### Happy Path — Editing
1. User taps an existing staple row → same sheet opens, fields pre-filled
2. User modifies any field → taps [Save Staple]
3. Changes are reflected immediately across all household members

### Edge Cases

**EC7-1 — Deleting a staple**
User taps [🗑 Delete this staple] → inline confirmation replaces the button: *"Delete [Item name] from staples?"* [Delete] [Cancel]. No modal. On confirm, staple is removed from the list. Does not affect any GroceryItems that were previously copied from it.

**EC7-2 — Saving with no name**
[Save Staple] button is disabled until name field is non-empty. Tapping the grayed-out button shows an inline error under the name field: *"Item name is required."*

**EC7-3 — Saving with no default store/aisle**
Allowed — store and aisle are optional on a staple. When copying to an active list (Flow 6), the user will be prompted to choose a store/aisle at copy time.

**EC7-4 — Staple name matches an existing staple**
On save, a warning appears: *"You already have '[Name]' in your staples. Save as a duplicate?"* [Save Anyway] [Cancel]. Duplicates are permitted (e.g., same item for two different stores).

**EC7-5 — Editing a staple that is currently on an active shopping list**
Edit proceeds normally. The already-copied GroceryItem on the active list is not retroactively updated — edits to staples only affect future copies.

---

## Flow 8 — Aisle & Store Configuration

### Entry Point
User opens Settings → Stores & Aisles. (Accessible from a gear icon in the tab bar or app header.)

### Wireframe — Stores & Aisles Settings Screen
```
╭─────────────────────────────────────╮
│ ← Settings                          │
│ Stores & Aisles                     │
│─────────────────────────────────────│
│                                     │
│ COSTCO                   [Rename]   │
│ ≡  Produce                    [✎]  │
│ ≡  Dairy                      [✎]  │
│ ≡  Meats                      [✎]  │
│ ≡  Frozen                     [✎]  │
│ ≡  Household                  [✎]  │
│    + Add aisle                      │
│                                     │
│ TRADER JOE'S             [Rename]   │
│ ≡  Produce                    [✎]  │
│ ≡  Dairy                      [✎]  │
│ ≡  Snacks                     [✎]  │
│    + Add aisle                      │
│                                     │
│ WHOLE FOODS              [Rename]   │
│ ≡  Produce                    [✎]  │
│ ≡  Beverages                  [✎]  │
│    + Add aisle                      │
│                                     │
│ ─────────────────────────────────   │
│ + Add a store  (1 of 3 used)        │
╰─────────────────────────────────────╯
```

### Happy Path — Reordering Aisles
1. User long-presses the ≡ drag handle on an aisle row → row lifts, enters drag state
2. User drags row to new position → other rows animate to make space
3. User releases → new order is saved and synced to all household members immediately
4. Store tab reflects new aisle order on next render

### Happy Path — Renaming an Aisle
1. User taps [✎] next to an aisle → inline text field opens in place, pre-filled with current name
2. User edits name → taps Done or Return on keyboard
3. Name updates everywhere (store tab sections, staples list, item records) in real time

### Happy Path — Adding an Aisle
1. User taps "+ Add aisle" under a store
2. Inline text field appears below the last aisle
3. User types aisle name → taps Done
4. New aisle appears at the bottom of that store's list (can be reordered immediately)

### Happy Path — Adding a Store
1. User taps "+ Add a store" (only shown when fewer than 3 stores exist)
2. Sheet slides up asking for store name
3. User enters name → taps [Add Store]
4. New store appears in the settings list and as a new tab in the main tab bar
5. Store starts with no aisles — user prompted to add aisles before adding items

### Edge Cases

**EC8-1 — Renaming an aisle to a name that already exists in that store**
Inline warning: *"This store already has an aisle called '[Name]'."* Save is blocked until name is unique within the store.

**EC8-2 — Deleting an aisle that has items on it**
Tapping [✎] on an aisle with items shows a Delete option. On tap: *"'Dairy' has 4 items. Where should they go?"* → picker of other aisles in the store, or "Leave unassigned." On confirm, items are moved. Aisle is then deleted.

**EC8-3 — Aisle limit reached (10 per store)**
"+ Add aisle" is hidden when the store already has 10 aisles. A notice replaces it: *"Maximum of 10 aisles reached."*

**EC8-4 — Renaming a store**
Tapping [Rename] opens an inline text field. On save, store name updates in the tab bar, settings screen, and all item/staple records that reference it. If the name matches an existing store name, save is blocked: *"You already have a store called '[Name]'."*

**EC8-5 — Deleting a store**
Not available in v1 — stores can be renamed but not deleted, to avoid data loss from accidentally removing a store with items and history. Placeholder note in settings: *"To remove a store, contact support."* (Can be relaxed in v2 with a full migration flow.)

**EC8-6 — Reordering stores (tab order)**
Not supported in v1. Tab order is fixed to the order stores were created. Noted as a v2 enhancement.

**EC8-7 — Adding a 4th store**
"+ Add a store" is hidden when 3 stores already exist. Notice: *"Maximum of 3 stores reached. Rename an existing store to switch."*
