# Event Taxonomy Proposal

**Date:** April 24, 2026

## Current Situation

Our audit found **12 events with multiple spellings** across 86 unique event names. The main inconsistency is between:

### Format A: Gender Prefix + Short Distance (Used in athlete_events)
- **Format:** `Men's 100m`, `Women's 200m`, `Men's Long Jump`
- **Examples:** Men's 100m, Women's 100m Hurdles, Men's Javelin Throw
- **Gender:** Always included
- **Distance:** Short form (m instead of Metres)
- **Usage:** 28 events in athlete_events table

### Format B: No Gender + Long Distance (Used in wa_athlete_pbs, wa_rf_athlete_results)
- **Format:** `100 Metres`, `Long Jump`, `Javelin Throw`
- **Examples:** 100 Metres, 110 Metres Hurdles, Javelin Throw
- **Gender:** Not included
- **Distance:** Long form (Metres)
- **Usage:** 53 events in wa_athlete_pbs, 44 in wa_rf_athlete_results

## The 12 Events Needing Standardization

| Event | Format A (athlete_events) | Format B (pbs/results) |
|-------|---------------------------|------------------------|
| 1. Sprint 100m | Men's 100m | 100 Metres |
| 2. Sprint 200m | Men's 200m | 200 Metres |
| 3. Middle Distance 800m | Men's 800m | 800 Metres |
| 4. Long Distance 5000m | Men's 5000m | 5000 Metres |
| 5. Long Jump | Men's Long Jump | Long Jump |
| 6. High Jump | Men's High Jump | High Jump |
| 7. Pole Vault | Men's Pole Vault | Pole Vault |
| 8. Javelin Throw | Men's Javelin Throw | Javelin Throw |
| 9. Hammer Throw | Men's Hammer Throw | Hammer Throw |
| 10. Discus Throw | Men's Discus Throw | Discus Throw |
| 11. Marathon | Men's Marathon | Marathon |
| 12. Decathlon | Men's Decathlon | Decathlon |

## 🎯 DECISION REQUIRED: Choose Your Standard Format

Please choose one of these three options:

### Option 1: Gender Prefix + Short Form ⭐ RECOMMENDED
**Format:** `Women's 100m`, `Men's Long Jump`, `Women's 400m Hurdles`

**Pros:**
- ✅ More concise and modern
- ✅ Gender is explicit (important for mixed competition databases)
- ✅ Easier to read and display in UI
- ✅ Matches World Athletics modern style
- ✅ Currently used in your athlete_events table (less migration work)

**Cons:**
- ❌ Need to update wa_athlete_pbs and wa_rf_athlete_results (more records)

**Examples:**
- `Women's 100m`
- `Men's Long Jump`
- `Women's 100m Hurdles`
- `Men's Javelin Throw`
- `Women's 400m Hurdles`

### Option 2: Gender Prefix + Long Form
**Format:** `Women's 100 Metres`, `Men's Long Jump`, `Women's 400 Metres Hurdles`

**Pros:**
- ✅ Gender is explicit
- ✅ Formal/official style

**Cons:**
- ❌ Longer, takes more space in UI
- ❌ Need to update ALL tables (most migration work)
- ❌ Inconsistent (some events like "Long Jump" don't use "Metres")

**Examples:**
- `Women's 100 Metres`
- `Men's Long Jump`
- `Women's 100 Metres Hurdles`

### Option 3: No Gender + Short Form
**Format:** `100m`, `Long Jump`, `400m Hurdles`

**Pros:**
- ✅ Most concise
- ✅ Works for mixed/para events

**Cons:**
- ❌ Loses gender information (harder to filter/query)
- ❌ Need to update ALL tables
- ❌ May cause confusion in multi-gender databases

**Examples:**
- `100m`
- `Long Jump`
- `100m Hurdles`
- `Javelin Throw`

## Additional Considerations

### Weight/Height Specifications
Some events have specifications like:
- `Javelin Throw (700g)`
- `Hammer Throw (6kg)`
- `110 Metres Hurdles (99.0cm)`

**Question:** Should we keep these specifications or standardize to single canonical names?

**Recommendation:** Remove specifications from primary event names. These are age/gender-specific variants. Use:
- `Men's Javelin Throw` (not "Javelin Throw (800g)")
- `Women's Javelin Throw` (not "Javelin Throw (600g)")

### Relay Events
Current variations:
- `4x100 Metres Relay`
- `4x100 Metres Relay Mixed`

**Recommendation:** 
- `Men's 4x100m Relay`
- `Women's 4x100m Relay`
- `Mixed 4x100m Relay`

### Race Walk
Current variations:
- `20 Kilometres Race Walk`
- `20,000 Metres Race Walk`
- `Women's Race Walk`

**Recommendation:** Use distance in km:
- `Men's 20km Race Walk`
- `Women's 20km Race Walk`
- `Men's 35km Race Walk`

## My Recommendation: Option 1 ✨

**Standard Format:** `Gender's Distance/Event`

**Rules:**
1. **Always include gender prefix:** `Men's` or `Women's` or `Mixed`
2. **Use short distance format:** `100m` not `100 Metres`
3. **Capitalize event names:** `Long Jump` not `long jump`
4. **No weight/height specifications** in primary name
5. **For relays:** `Men's 4x100m Relay`
6. **For race walks:** `Men's 20km Race Walk`

**Examples:**
- `Women's 100m`
- `Men's 100m`
- `Women's 100m Hurdles`
- `Men's 110m Hurdles`
- `Women's 400m Hurdles`
- `Men's Long Jump`
- `Women's Long Jump`
- `Men's High Jump`
- `Women's Shot Put`
- `Men's Javelin Throw`
- `Men's 4x100m Relay`
- `Women's 20km Race Walk`

## Next Steps

Once you choose the standard:
1. I'll create a complete event taxonomy mapping
2. Generate SQL migration scripts to update all tables
3. Update the reconciliation script to validate against the standard
4. Create documentation for future data entry

**Please indicate your preference:** Option 1, 2, or 3 (or specify custom format)
