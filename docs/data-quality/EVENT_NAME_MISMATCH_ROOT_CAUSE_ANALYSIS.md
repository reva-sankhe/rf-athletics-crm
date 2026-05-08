# Event Name Mismatch - Root Cause Analysis

**Date:** April 27, 2026  
**Issue:** Events like "Women's 100m" and "Women's 100m Hurdles" are being matched incorrectly and used interchangeably

---

## Executive Summary

The event name mismatch issue is caused by **overly permissive event matching logic** in the codebase, specifically in the `isEventMatch()` function in `src/lib/eventUtils.ts`. This function uses substring matching that incorrectly considers "Women's 100m" and "Women's 100m Hurdles" as matching events, leading to incorrect associations between athlete events and their personal bests.

---

## Root Causes

### 🔴 **PRIMARY CAUSE: Flawed Event Matching Logic**

**Location:** `src/lib/eventUtils.ts` - `isEventMatch()` function (lines 109-142)

**Problem:** The function uses overly broad matching rules that create false positives:

```javascript
// Current problematic logic:
function isEventMatch(discipline, athleteEvent) {
  const normalizedDiscipline = normalizeEventName(discipline);
  const normalizedEvent = normalizeEventName(athleteEvent);
  
  // 1. SUBSTRING MATCHING - TOO PERMISSIVE!
  if (normalizedDiscipline.includes(normalizedEvent) || 
      normalizedEvent.includes(normalizedDiscipline)) {
    return true;
  }
  
  // 2. ALL HURDLES MATCH - TOO BROAD!
  if (normalizedDiscipline.includes('hurdles') && normalizedEvent.includes('hurdles')) {
    return true;
  }
  
  // 3. ALL SPRINTS MATCH - TOO BROAD!
  const sprintPattern = /^(100|200|400)m$/;
  if (sprintPattern.test(normalizedDiscipline) && sprintPattern.test(normalizedEvent)) {
    return true;
  }
}
```

**Evidence - Test Results:**
```
TEST 1: Women's 100m vs Women's 100m Hurdles
  normalizedDiscipline: 'wo100m'
  normalizedEvent: 'wo100mhurdles'
  ✓ PARTIAL MATCH (SUBSTRING) ❌ INCORRECT!

TEST 2: Women's 100m Hurdles vs Women's 100m
  normalizedDiscipline: 'wo100mhurdles'
  normalizedEvent: 'wo100m'
  ✓ PARTIAL MATCH (SUBSTRING) ❌ INCORRECT!

TEST 5: Women's 100m Hurdles vs Women's 400m Hurdles
  normalizedDiscipline: 'wo100mhurdles'
  normalizedEvent: 'wo400mhurdles'
  ✓ HURDLES MATCH ❌ INCORRECT!
```

**Impact:** 
- Personal bests for "Women's 100m Hurdles" are incorrectly associated with athletes whose main event is "Women's 100m" (and vice versa)
- Different hurdles events (100m vs 400m) are treated as the same event
- Sprint events (100m, 200m, 400m) can all match each other

---

### 🟡 **SECONDARY CAUSE: Incomplete Normalization**

**Location:** `src/lib/eventUtils.ts` - `normalizeEventName()` function (lines 96-104)

**Problem:** Gender prefix removal is incomplete:

```javascript
function normalizeEventName(eventName) {
  return eventName
    .toLowerCase()
    .replace(/men's\s*/gi, '')      // Removes "men's " → leaves "wo"
    .replace(/women's\s*/gi, '')    // Removes "women's " → leaves "wo"
    .replace(/\s*metres?\s*/gi, 'm')
    .replace(/\s+/g, '')
    .trim();
}
```

**Result:**
- "Women's 100m" → `"wo100m"` (should be `"100m"`)
- "Men's 100m" → `"me100m"` (should be `"100m"`)

This creates inconsistent normalized names that don't match properly across different sources.

---

### 🟡 **CONTRIBUTING FACTOR: Inconsistent Event Names Across Tables**

**Evidence from Database:**

```
athlete_events table: 28 unique, standardized event names
  ✓ "Women's 100m"
  ✓ "Women's 100m Hurdles"

wa_athlete_pbs table: 71 unique event names (mixed formats!)
  ✓ "Women's 100m"
  ✓ "Women's 100m Hurdles"
  ✗ "Women's 100m Hurdles (76.2cm)"
  ✗ "100 Metres"
  ✗ "110 Metres Hurdles"
  ✗ "10 Kilometres Road"
  ... many more variations
```

While the migration `20260424_normalize_event_names_v2.sql` attempted to standardize event names, the `wa_athlete_pbs` table still contains many non-standard formats.

---

### 🟢 **MINOR FACTOR: No Database-Level Validation**

**Issue:** There are no constraints or validation rules to ensure event names conform to the standardized taxonomy.

**Missing safeguards:**
1. No foreign key constraint linking event names to a reference table
2. No CHECK constraint validating event name format
3. No database trigger to validate/normalize event names on insert

---

## Usage Context

### Where Event Matching is Used:

1. **`fetchPersonalBestsForAthleteEvents()` in `src/lib/queries.ts` (lines 107-141)**
   - Matches athlete's events to their personal bests
   - Uses `isEventMatch()` to find corresponding PBs
   - **Result:** Wrong PBs shown for athletes

2. **`fetchPersonalBestsForEvent()` in `src/lib/queries.ts` (lines 330-366)**
   - Fetches PBs for all athletes in a specific event
   - Uses `isEventMatch()` for filtering
   - **Result:** Wrong athletes shown for event pages

---

## Real-World Impact Examples

### Example 1: Women's 100m Athlete Getting Hurdles Data

**Athlete:** Sakshi Chavan  
**Main Event:** Women's 100m  
**PB in Database:** Women's 100m Hurdles - 13.48s

**What Happens:**
```javascript
isEventMatch("Women's 100m Hurdles", "Women's 100m")
// Returns: TRUE ❌
// Shows 13.48s as her 100m PB when it's actually her hurdles PB
```

### Example 2: Event Page Showing Wrong Athletes

**Event Page:** Women's 100m Hurdles  
**Athletes Shown:** Could include Women's 100m athletes due to matching

---

## Why Previous Fixes Didn't Work

### Migration `20260424_normalize_event_names_v2.sql`

✅ **What it did well:**
- Standardized event names in `athlete_events` table
- Applied gender-aware normalization
- Created consistent format: "Gender's Event"

❌ **What it didn't fix:**
- The application code still uses flawed matching logic
- Database normalization can't fix code-level bugs
- Still allows variations like "(76.2cm)" specifications

---

## Recommended Solutions

### 🔥 **CRITICAL FIX: Rewrite Event Matching Logic**

Replace the overly permissive matching with exact matching:

```javascript
// PROPOSED FIX for isEventMatch()
export function isEventMatch(discipline: string, athleteEvent: string): boolean {
  if (!discipline || !athleteEvent) return false;
  
  const normalized1 = normalizeEventName(discipline);
  const normalized2 = normalizeEventName(athleteEvent);
  
  // ONLY exact matches
  if (normalized1 === normalized2) return true;
  
  // Allow specification variations (e.g., height/weight specifications)
  // "Women's 100m Hurdles (76.2cm)" should match "Women's 100m Hurdles"
  const withoutSpecs1 = normalized1.replace(/\([^)]*\)/g, '').trim();
  const withoutSpecs2 = normalized2.replace(/\([^)]*\)/g, '').trim();
  
  if (withoutSpecs1 === withoutSpecs2) return true;
  
  return false;
}
```

### 🔥 **CRITICAL FIX: Fix Normalization Function**

Properly remove gender prefixes:

```javascript
// PROPOSED FIX for normalizeEventName()
export function normalizeEventName(eventName: string): string {
  return eventName
    .toLowerCase()
    .replace(/^men's\s+/gi, '')      // Remove gender prefix completely
    .replace(/^women's\s+/gi, '')    // Remove gender prefix completely
    .replace(/^mixed\s+/gi, '')      // Remove mixed prefix
    .replace(/\s*metres?\s*/gi, 'm')
    .replace(/\s+/g, ' ')
    .trim();
}
```

### ⚠️ **IMPORTANT FIX: Complete Database Normalization**

Run a comprehensive audit and fix any remaining non-standard event names:

```sql
-- Find all variations still in wa_athlete_pbs
SELECT DISTINCT discipline 
FROM wa_athlete_pbs 
WHERE discipline NOT LIKE 'Men''s%' 
  AND discipline NOT LIKE 'Women''s%'
  AND discipline NOT LIKE 'Mixed%'
ORDER BY discipline;
```

### 📋 **GOOD TO HAVE: Add Database Constraints**

Create a reference table for valid event names:

```sql
CREATE TABLE valid_event_names (
  event_name VARCHAR PRIMARY KEY,
  gender CHAR(1),
  category VARCHAR
);

-- Add foreign key constraint
ALTER TABLE athlete_events
ADD CONSTRAINT fk_valid_event_name
FOREIGN KEY (event_name) 
REFERENCES valid_event_names(event_name);
```

---

## Testing Requirements

Before deploying fixes, test:

1. ✅ "Women's 100m" does NOT match "Women's 100m Hurdles"
2. ✅ "Women's 100m" does NOT match "Women's 200m"
3. ✅ "Women's 100m Hurdles" does NOT match "Women's 400m Hurdles"
4. ✅ "Women's 100m Hurdles (76.2cm)" DOES match "Women's 100m Hurdles"
5. ✅ "100 Metres" normalizes to same as "Men's 100m" (with gender context)
6. ✅ Athletes' PBs show correct events
7. ✅ Event pages show only athletes competing in that specific event

---

## Priority Ranking

| Priority | Fix | Impact | Effort |
|----------|-----|--------|--------|
| 🔥 **P0** | Rewrite `isEventMatch()` | **HIGH** - Fixes core issue | Low (30 min) |
| 🔥 **P0** | Fix `normalizeEventName()` | **HIGH** - Prevents future issues | Low (15 min) |
| ⚠️ **P1** | Complete DB normalization | **MEDIUM** - Improves consistency | Medium (2 hours) |
| 📋 **P2** | Add validation constraints | **LOW** - Prevents regression | High (4 hours) |

---

## Conclusion

The event name mismatch is **not a database issue** but a **code logic bug** in the event matching algorithm. The `isEventMatch()` function's substring-based matching incorrectly treats "Women's 100m" and "Women's 100m Hurdles" as the same event.

**Immediate Action Required:** Fix the `isEventMatch()` and `normalizeEventName()` functions in `src/lib/eventUtils.ts`.

---

**Analysis Performed By:** System Analysis  
**Files Analyzed:** 15+ source files, database tables, and migration scripts  
**Test Cases Run:** 5 specific event matching scenarios
