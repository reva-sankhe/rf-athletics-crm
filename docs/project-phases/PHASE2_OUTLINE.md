# Phase 2: Duplicate Personal Bests Cleanup

**Date:** April 24, 2026  
**Status:** 📋 Ready to Begin  
**Prerequisites:** ✅ Phase 1 Complete (Event normalization done)

---

## 🎯 Objective

Remove duplicate personal best entries in `wa_athlete_pbs`, keeping only the best performance for each athlete-event combination.

## 📊 Current Situation

### Problem Identified:
- **9 athletes** have duplicate PB entries
- Same athlete has multiple records for the same event
- Causes confusion on which is the actual personal best
- Affects data integrity and reporting accuracy

### Source:
From `DATA_RECONCILIATION_REPORT.md`:
- **Total duplicate PBs:** 9 athlete-event combinations
- **Table affected:** `wa_athlete_pbs`
- **Impact:** Query results may return multiple "personal bests" for same athlete/event

---

## 📋 Phase 2 Tasks

### Task 2.1: Identify & Review Duplicates
**Tool:** `scripts/fix-duplicate-pbs.sql` (Steps 1-2)

**Actions:**
1. Run **STEP 1** query to identify all duplicates
   - Lists athlete name, discipline, count of duplicates
   - Shows all PB IDs and marks for each duplicate set
   
2. Run **STEP 2** query for detailed view
   - Shows full details: mark, wind, venue, date
   - Helps understand why duplicates exist

**Expected Output:**
- List of 9 athlete-event combinations with duplicates
- Full details of each duplicate record

---

### Task 2.2: Determine Best Performances
**Tool:** `scripts/fix-duplicate-pbs.sql` (Steps 3-4)

**Logic:**
- **Time-based events** (running, hurdles, race walk):
  - Keep record with **lowest time** (faster is better)
  - Pattern matching: `(m$|hurdles|relay|walk)`
  
- **Distance-based events** (throws, jumps):
  - Keep record with **highest distance** (farther is better)
  - Pattern matching: `(throw|jump)`

**Actions:**
1. Run **STEP 3** query - Records to KEEP
   - Shows which record will be preserved for each duplicate set
   - Action column shows "KEEP"
   - Includes athlete name, discipline, mark, date
   
2. Run **STEP 4** query - Records to DELETE
   - Shows which records will be removed
   - Action column shows "DELETE"
   - Verify these are indeed the inferior performances

**Expected Output:**
- **KEEP list:** 9 records (one best per athlete-event)
- **DELETE list:** ~9-18 records (inferior performances)

---

### Task 2.3: Review & Validate
**Manual Review Required**

**Validation Checklist:**
- [ ] Verify KEEP records have best performance (lowest time OR highest distance)
- [ ] Confirm DELETE records are inferior performances
- [ ] Check for any edge cases (same mark, different dates)
- [ ] Review if any duplicates have additional context (venue, wind) that matters
- [ ] Ensure no accidental deletion of actual best performances

**Questions to Consider:**
1. If marks are identical, which date takes precedence? (Usually most recent)
2. Are there any legal wind considerations? (Shouldn't matter for PB table)
3. Should venue be considered? (No - PB is PB regardless of venue)

---

### Task 2.4: Execute Deletion
**Tool:** `scripts/fix-duplicate-pbs.sql` (Step 5)

**⚠️ CAUTION:** This step permanently deletes records!

**Pre-execution Checklist:**
- [ ] Reviewed all records to be deleted (Task 2.3)
- [ ] Confirmed KEEP records are correct best performances
- [ ] Have database backup or can restore from temp tables
- [ ] Ready to commit changes

**Actions:**
1. Uncomment STEP 5 in the SQL script
2. Run the DELETE query
3. Script will:
   - Use same ROW_NUMBER() logic from Steps 3-4
   - Delete all records where rank > 1
   - Keep only rank = 1 (best performance)

**Expected Result:**
- ~9-18 records deleted from `wa_athlete_pbs`
- Each athlete-event combination has exactly 1 PB record

---

### Task 2.5: Verify Cleanup
**Tool:** `scripts/fix-duplicate-pbs.sql` (Verification queries)

**Actions:**
1. Run final verification query
   - Shows: Total PBs, Athletes with PBs, Remaining Duplicates
   - **Remaining Duplicates should be 0**

2. Run STEP 1 query again
   - Should return no results (no more duplicates)

3. Spot check specific athletes who had duplicates
   - Verify they now have only 1 PB per event
   - Confirm it's the best performance

**Expected Output:**
```
| Metric                 | Count |
|------------------------|-------|
| Total PBs              | ~194  |
| Athletes with PBs      | 42    |
| Remaining Duplicates   | 0     |
```

---

## 📊 Success Metrics

### Before Phase 2:
- **Total PB records:** ~203
- **Duplicate combinations:** 9
- **Duplicate records:** ~9-18 excess records
- **Data quality:** ⚠️ Multiple "personal bests" for same event

### After Phase 2:
- **Total PB records:** ~194 (reduced by duplicate count)
- **Duplicate combinations:** 0 ✅
- **Duplicate records:** 0 ✅
- **Data quality:** ✅ One true personal best per athlete-event

---

## 🔄 Execution Steps Summary

1. **Review** - Run identification queries (Steps 1-2)
2. **Analyze** - Run best/delete queries (Steps 3-4)
3. **Validate** - Manual review of records to keep/delete
4. **Execute** - Uncomment and run deletion (Step 5)
5. **Verify** - Confirm no duplicates remain

**Estimated Time:** 15-30 minutes (mostly review/validation)

---

## ⚠️ Risks & Mitigation

### Risk 1: Deleting Wrong Record
**Mitigation:** 
- Extensive review process (Tasks 2.2-2.3)
- Clear sorting logic (best performance kept)
- Can restore from backup if needed

### Risk 2: Same Performance, Different Dates
**Mitigation:**
- ROW_NUMBER() will deterministically pick one
- Review these cases manually in Step 4
- Can adjust ORDER BY to prefer recent dates

### Risk 3: Edge Cases Not Covered
**Mitigation:**
- Pattern matching covers: `(m$|hurdles|relay|walk|throw|jump)`
- Should cover all track & field events
- Review Step 3 output to ensure all duplicates are caught

---

## 📝 Rollback Plan

If deletion needs to be reversed:

1. **Check for backup tables** from Phase 1 migration
   - `wa_athlete_pbs_backup` may still exist in session
   
2. **Restore from application backup**
   - If you have database backup/snapshot
   
3. **Re-scrape from World Athletics**
   - Last resort: fetch PB data again from source

**Recommendation:** Take a database snapshot before executing Step 5

---

## 🚀 Next Steps After Phase 2

Once duplicates are cleaned:

### Phase 3: Data Type Normalization
- Standardize mark formats
- Standardize date formats
- Standardize wind speed formats
- Add data type validation

### Phase 4: Comprehensive Athlete Audit
- Generate detailed report for all 42 athletes
- Verify data completeness for each athlete
- Identify missing PBs
- Create athlete data quality scores

---

## 📁 Related Files

- **Execution Script:** `scripts/fix-duplicate-pbs.sql`
- **Data Report:** `DATA_RECONCILIATION_REPORT.md`
- **Phase 1 Results:** `PHASE1_VERIFICATION.md`

---

## ✅ Phase 2 Completion Criteria

Phase 2 is complete when:
- [ ] All duplicate PBs identified and reviewed
- [ ] Records to keep/delete validated
- [ ] Deletion executed successfully
- [ ] Verification shows 0 remaining duplicates
- [ ] Each athlete has max 1 PB per event
- [ ] No data integrity issues introduced

**Status:** Ready to begin Task 2.1 ⏸️
