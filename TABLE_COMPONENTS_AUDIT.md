# Table Components Audit Report

## Summary
This document provides a comprehensive inventory of all Table components used throughout the codebase, including their current styling and wrapper div configurations.

---

## Pages Using Table Components

### 1. **CategoriesTable.tsx** 
**Path:** [src/pages/CategoriesTable.tsx](src/pages/CategoriesTable.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="bg-card rounded-lg border border-border overflow-hidden">
    <div className="overflow-x-auto">
      <Table>
  ```
- **Styling:** `bg-card` (explicit), `rounded-lg`, `border border-border`, `overflow-hidden`
- **Purpose:** Draggable category management table
- **Has Horizontal Scroll:** YES (nested overflow-x-auto)

---

### 2. **TagsTable.tsx**
**Path:** [src/pages/TagsTable.tsx](src/pages/TagsTable.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="border rounded-lg">
    <Table>
  ```
- **Styling:** `border`, `rounded-lg` (no explicit bg styling, defaults to inherit)
- **Purpose:** Tag management table with inline editing
- **Has Horizontal Scroll:** NO

---

### 3. **PriceGrid.tsx**
**Path:** [src/pages/PriceGrid.tsx](src/pages/PriceGrid.tsx)
- **Wrapper Div:** YES (two separate tables)
  ```jsx
  <div className="rounded-xl border border-border overflow-hidden">
    <Table>
  ```
- **Styling:** `rounded-xl`, `border border-border`, `overflow-hidden` (no explicit bg)
- **Purpose:** Price management grid with multiple price columns
- **Has Horizontal Scroll:** YES (implicit via overflow-hidden)
- **Note:** Contains TWO tables with similar wrapper structure

---

### 4. **MarketCategoriesTable.tsx**
**Path:** [src/pages/MarketCategoriesTable.tsx](src/pages/MarketCategoriesTable.tsx)
- **Wrapper Div:** Similar to CategoriesTable
  ```jsx
  <div className="bg-card rounded-lg border border-border overflow-hidden">
    <div className="overflow-x-auto">
      <Table>
  ```
- **Styling:** `bg-card` (explicit), `rounded-lg`, `border border-border`, `overflow-hidden`
- **Purpose:** Market category management table
- **Has Horizontal Scroll:** YES (nested overflow-x-auto)

---

### 5. **CustomersList.tsx**
**Path:** [src/pages/CustomersList.tsx](src/pages/CustomersList.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="bg-card rounded-lg border border-border overflow-hidden">
    {/* conditional loading/empty state */}
    <div className="overflow-x-auto">
      <Table>
  ```
- **Styling:** `bg-card` (explicit), `rounded-lg`, `border border-border`, `overflow-hidden`
- **Purpose:** Customer list with search and sort
- **Has Horizontal Scroll:** YES (nested overflow-x-auto)

---

### 6. **LoyaltyPrograms.tsx**
**Path:** [src/pages/LoyaltyPrograms.tsx](src/pages/LoyaltyPrograms.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="bg-card rounded-lg border border-border overflow-hidden">
    {/* conditional loading/empty state */}
    <div className="overflow-x-auto">
      <Table>
  ```
- **Styling:** `bg-card` (explicit), `rounded-lg`, `border border-border`, `overflow-hidden`
- **Purpose:** Loyalty program management table
- **Has Horizontal Scroll:** YES (nested overflow-x-auto)

---

### 7. **CashRegisterHistory.tsx**
**Path:** [src/pages/CashRegisterHistory.tsx](src/pages/CashRegisterHistory.tsx)
- **Wrapper Div:** YES (inside Card component)
  ```jsx
  <Card>
    {/* conditional loading/empty state */}
    <div className="w-full">
      <Table>
  ```
- **Styling:** Wrapped in `<Card>` component (provides bg-card automatically), `w-full` on table wrapper
- **Purpose:** Cash register history with expandable rows
- **Has Horizontal Scroll:** NO

---

### 8. **Attributes.tsx**
**Path:** [src/pages/Attributes.tsx](src/pages/Attributes.tsx)
- **Wrapper Div:** YES (inside CardContent)
  ```jsx
  <Card>
    <CardContent className="pt-0">
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
  ```
- **Styling:** `rounded-lg`, `border border-border`, `overflow-hidden` (Card provides bg)
- **Purpose:** Product attributes/options management
- **Has Horizontal Scroll:** NO

---

### 9. **Stocks.tsx**
**Path:** [src/pages/Stocks.tsx](src/pages/Stocks.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="rounded-xl border bg-card shadow-sm">
    <Table>
  ```
- **Styling:** `rounded-xl`, `border`, `bg-card` (explicit), `shadow-sm`
- **Purpose:** Stock management table
- **Has Horizontal Scroll:** NO

---

## Component Files Using Table Components

### 10. **ProductsTable.tsx**
**Path:** [src/components/menu/ProductsTable.tsx](src/components/menu/ProductsTable.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="border rounded-xl overflow-hidden">
    <Table>
  ```
- **Styling:** `border`, `rounded-xl`, `overflow-hidden` (no explicit bg)
- **Purpose:** Reusable products table component with sorting
- **Has Horizontal Scroll:** YES

---

### 11. **IngredientsTable.tsx**
**Path:** [src/components/menu/IngredientsTable.tsx](src/components/menu/IngredientsTable.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="border rounded-xl overflow-hidden">
    <Table>
  ```
- **Styling:** `border`, `rounded-xl`, `overflow-hidden` (no explicit bg)
- **Purpose:** Reusable ingredients/components table with sorting
- **Has Horizontal Scroll:** YES

---

### 12. **VATBreakdownTable.tsx**
**Path:** [src/components/accounting/VATBreakdownTable.tsx](src/components/accounting/VATBreakdownTable.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="border rounded-lg overflow-hidden">
    <Table>
  ```
- **Styling:** `border`, `rounded-lg`, `overflow-hidden` (no explicit bg)
- **Purpose:** VAT breakdown display table
- **Has Horizontal Scroll:** NO

---

### 13. **VATDetailTable.tsx**
**Path:** [src/components/reports/VATDetailTable.tsx](src/components/reports/VATDetailTable.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="rounded-xl border border-border overflow-hidden">
    <Table>
  ```
- **Styling:** `rounded-xl`, `border border-border`, `overflow-hidden` (no explicit bg)
- **Purpose:** Detailed VAT report table
- **Has Horizontal Scroll:** YES

---

### 14. **PaymentDetailTable.tsx**
**Path:** [src/components/reports/PaymentDetailTable.tsx](src/components/reports/PaymentDetailTable.tsx)
- **Wrapper Div:** YES
  ```jsx
  <div className="rounded-xl border border-border overflow-hidden">
    <Table>
  ```
- **Styling:** `rounded-xl`, `border border-border`, `overflow-hidden` (no explicit bg)
- **Purpose:** Detailed payment report table
- **Has Horizontal Scroll:** YES

---

### 15. **AttributesManager.tsx**
**Path:** [src/components/menu/AttributesManager.tsx](src/components/menu/AttributesManager.tsx)
- **Wrapper Div:** NO (Table direct in JSX)
  ```jsx
  <Table>
    <TableHeader>
  ```
- **Styling:** None at table wrapper level
- **Purpose:** Attribute options management table (edit form context)
- **Context:** Used inside form components, no wrapper needed

---

### 16. **ProductCompositionTab.tsx**
**Path:** [src/components/menu/ProductCompositionTab.tsx](src/components/menu/ProductCompositionTab.tsx)
- **Wrapper Div:** NO (Table direct in JSX)
  ```jsx
  <Table>
    <TableHeader>
  ```
- **Styling:** None at table wrapper level
- **Purpose:** Product composition/recipe table (nested in tab)
- **Context:** Used inside Card/TabContent, no wrapper needed

---

## Styling Patterns Summary

### Background Styling Distribution:
| Styling | Count | Files |
|---------|-------|-------|
| `bg-card` explicit | 5 | CategoriesTable, MarketCategoriesTable, CustomersList, LoyaltyPrograms, Stocks |
| No explicit bg (defaults to inherit) | 7 | TagsTable, PriceGrid, ProductsTable, IngredientsTable, VATBreakdownTable, VATDetailTable, PaymentDetailTable |
| Inside `<Card>` component | 2 | CashRegisterHistory, Attributes |
| No wrapper div | 2 | AttributesManager, ProductCompositionTab |

### Border Styling Distribution:
| Border Style | Count | Files |
|--------------|-------|-------|
| `border border-border` | 6 | PriceGrid, VATDetailTable, PaymentDetailTable, CategoriesTable, MarketCategoriesTable, CustomersList, LoyaltyPrograms |
| `border` (unqualified) | 5 | TagsTable, ProductsTable, IngredientsTable, VATBreakdownTable, Stocks |

### Border Radius Distribution:
| Radius | Count |
|--------|-------|
| `rounded-xl` | 5 |
| `rounded-lg` | 5 |
| Inside Card (no explicit radius) | 2 |
| No wrapper | 2 |

### Overflow/Scroll Capability:
| Type | Count | Files |
|------|-------|-------|
| With explicit horizontal scroll | 8 | CategoriesTable, PriceGrid, ProductsTable, IngredientsTable, VATDetailTable, PaymentDetailTable, CustomersList, LoyaltyPrograms |
| No scroll wrapper | 6 | TagsTable, VATBreakdownTable, CashRegisterHistory, Attributes, Stocks, AttributesManager, ProductCompositionTab |

---

## Key Findings

### 1. **Inconsistent bg Styling**
- **Issue:** Multiple approaches to background styling
  - Some use explicit `bg-card` class
  - Others rely on inherited styling or Card wrapper
  - No white background (`bg-white`) used anywhere
- **Pattern:** Pages with `bg-card` are: CategoriesTable, MarketCategoriesTable, CustomersList, LoyaltyPrograms, Stocks

### 2. **Border Styling Variations**
- **Standard Pattern:** `border border-border` (used in 6 files)
- **Alternative:** Just `border` without color spec (used in 5 files)
- **Inconsistency:** No clear reason for the split

### 3. **Border Radius Inconsistency**
- **`rounded-xl`** (larger radius): 5 files (PriceGrid, VATDetailTable, PaymentDetailTable, ProductsTable, IngredientsTable, Stocks)
- **`rounded-lg`** (smaller radius): 5 files (CategoriesTable, MarketCategoriesTable, TagsTable, VATBreakdownTable)
- **No preference:** Seems arbitrary

### 4. **Nested Overflow Divs**
- **Pattern:** CategoriesTable and CustomersList have nested `<div className="overflow-x-auto">`
- **Purpose:** Enables horizontal scrolling on mobile
- **Files:** CategoriesTable, MarketCategoriesTable, CustomersList, LoyaltyPrograms (4 files)

### 5. **Wrapper Div Omissions**
- **Files without wrapper:** AttributesManager, ProductCompositionTab
- **Reason:** Used in edit forms where Card component provides styling
- **Impact:** These tables lack border and rounded corners

---

## Recommendations

### 1. **Standardize Background Styling**
Add `bg-card` to all page-level tables for consistency:
```jsx
// Current (mixed)
<div className="bg-card ...">      // Some files
<div className="...">              // Other files

// Recommended (all consistent)
<div className="bg-card rounded-lg border border-border overflow-hidden">
```

### 2. **Standardize Border Styling**
Use `border border-border` across all tables:
```jsx
// Replace all variations with:
<div className="... border border-border ...">
```

### 3. **Standardize Border Radius**
Choose one radius size. Recommend `rounded-lg` for consistency:
```jsx
// Current mix: rounded-xl and rounded-lg
// Recommended: use rounded-lg uniformly
<div className="... rounded-lg ...">
```

### 4. **Consistent Wrapper Pattern**
For all standalone page tables:
```jsx
<div className="bg-card rounded-lg border border-border overflow-hidden">
  <div className="overflow-x-auto">
    <Table>
```

### 5. **Add Wrapper to Standalone Tables**
AttributesManager and ProductCompositionTab should have wrapper divs:
```jsx
<div className="rounded-lg border border-border overflow-hidden">
  <Table>
```

---

## Quick Reference Table

| File | Location | Has Wrapper | bg Styling | Border | Radius | Scroll |
|------|----------|------------|-----------|--------|--------|--------|
| CategoriesTable | pages | YES | `bg-card` | `border-border` | `lg` | ✓ |
| TagsTable | pages | YES | None | `border` | `lg` | ✗ |
| PriceGrid | pages | YES | None | `border-border` | `xl` | ✓ |
| MarketCategoriesTable | pages | YES | `bg-card` | `border-border` | `lg` | ✓ |
| CustomersList | pages | YES | `bg-card` | `border-border` | `lg` | ✓ |
| LoyaltyPrograms | pages | YES | `bg-card` | `border-border` | `lg` | ✓ |
| CashRegisterHistory | pages | YES (Card) | Card | None | Card | ✗ |
| Attributes | pages | YES | Card | `border-border` | `lg` | ✗ |
| Stocks | pages | YES | `bg-card` | `border` | `xl` | ✗ |
| ProductsTable | components | YES | None | `border` | `xl` | ✓ |
| IngredientsTable | components | YES | None | `border` | `xl` | ✓ |
| VATBreakdownTable | components | YES | None | `border` | `lg` | ✗ |
| VATDetailTable | components | YES | None | `border-border` | `xl` | ✓ |
| PaymentDetailTable | components | YES | None | `border-border` | `xl` | ✓ |
| AttributesManager | components | NO | None | None | None | ✗ |
| ProductCompositionTab | components | NO | None | None | None | ✗ |

---

## Statistics

- **Total Table Components:** 16
- **Files with Wrapper Divs:** 14 (87.5%)
- **Files without Wrapper Divs:** 2 (12.5%)
- **Files with Explicit `bg-card`:** 5
- **Files with `border border-border`:** 6
- **Files with Horizontal Scroll:** 8
- **Most Common Border Radius:** Tied (rounded-xl: 5, rounded-lg: 5)

