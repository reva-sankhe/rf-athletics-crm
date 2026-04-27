/**
 * List Athletes with Duplicate Personal Bests
 * 
 * This script identifies and displays all athletes who have duplicate PB entries
 * for the same event in the wa_athlete_pbs table
 */

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function listDuplicatePBs() {
  console.log("=".repeat(60));
  console.log("🔍 ATHLETES WITH DUPLICATE PERSONAL BESTS");
  console.log("=".repeat(60));
  console.log();

  // Direct query to find duplicates
  const { data: pbs, error: pbError } = await supabase
    .from("wa_athlete_pbs")
    .select(`
      aa_athlete_id,
      discipline,
      id,
      mark,
      wind,
      venue,
      date
    `)
    .order('aa_athlete_id', { ascending: true })
    .order('discipline', { ascending: true });

  if (pbError) {
    console.error("❌ Error fetching PBs:", pbError);
    process.exit(1);
  }

  // Get athlete profiles
  const { data: profiles, error: profileError } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name, gender");

  if (profileError) {
    console.error("❌ Error fetching profiles:", profileError);
    process.exit(1);
  }

  // Create profile lookup
  const profileMap = new Map(
    profiles?.map(p => [p.aa_athlete_id, p]) || []
  );

  // Group by athlete + discipline
  const grouped = new Map<string, typeof pbs>();
  
  for (const pb of pbs || []) {
    const key = `${pb.aa_athlete_id}|${pb.discipline}`;
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(pb);
  }

  // Filter to only duplicates
  const duplicatesList: any[] = [];
  
  for (const [key, records] of grouped.entries()) {
    if (records.length > 1) {
      const [athleteId] = key.split('|');
      const profile = profileMap.get(parseInt(athleteId));
      
      duplicatesList.push({
        aa_athlete_id: parseInt(athleteId),
        athlete_name: profile?.reliance_name || 'Unknown',
        gender: profile?.gender || '?',
        discipline: records[0].discipline,
        duplicate_count: records.length,
        records: records.map(r => ({
          id: r.id,
          mark: r.mark,
          wind: r.wind,
          venue: r.venue,
          date: r.date
        }))
      });
    }
  }

  const duplicates = duplicatesList;
  const error = null;

  if (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }

  if (!duplicates || duplicates.length === 0) {
    console.log("✅ No duplicate personal bests found!");
    console.log("All athletes have unique PB entries for each event.");
    return;
  }

  console.log(`⚠️  Found ${duplicates.length} athlete-event combinations with duplicates\n`);
  console.log("=".repeat(60));

  // Sort by athlete name
  duplicates.sort((a, b) => a.athlete_name.localeCompare(b.athlete_name));

  let totalDuplicateRecords = 0;

  for (const dup of duplicates) {
    console.log(`\n👤 ${dup.athlete_name} (${dup.gender})`);
    console.log(`   Event: ${dup.discipline}`);
    console.log(`   Duplicate Count: ${dup.duplicate_count} records\n`);
    
    totalDuplicateRecords += dup.duplicate_count;

    // Determine if time-based or distance-based
    const isTimeBased = /m$|hurdles|relay|walk/i.test(dup.discipline);
    const bestLabel = isTimeBased ? "Fastest (KEEP)" : "Farthest (KEEP)";
    
    // Sort records to identify best
    const sortedRecords = [...dup.records].sort((a, b) => {
      const markA = parseFloat(a.mark);
      const markB = parseFloat(b.mark);
      return isTimeBased ? markA - markB : markB - markA;
    });

    sortedRecords.forEach((record, index) => {
      const isBest = index === 0;
      const status = isBest ? `✅ ${bestLabel}` : "❌ DELETE";
      
      console.log(`   ${status}`);
      console.log(`      ID: ${record.id}`);
      console.log(`      Mark: ${record.mark}`);
      if (record.wind) console.log(`      Wind: ${record.wind}`);
      if (record.venue) console.log(`      Venue: ${record.venue}`);
      if (record.date) console.log(`      Date: ${record.date}`);
      console.log();
    });
    
    console.log("-".repeat(60));
  }

  // Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Athletes with Duplicates: ${duplicates.length}`);
  console.log(`Total Duplicate Records: ${totalDuplicateRecords}`);
  console.log(`Records to Keep (Best): ${duplicates.length}`);
  console.log(`Records to Delete (Inferior): ${totalDuplicateRecords - duplicates.length}`);
  console.log("=".repeat(60));
  console.log();
  console.log("💡 Next Steps:");
  console.log("   1. Review the records marked for deletion above");
  console.log("   2. Verify the KEEP records are correct best performances");
  console.log("   3. Run scripts/fix-duplicate-pbs.sql Step 5 to execute deletion");
  console.log("=".repeat(60));
}

listDuplicatePBs().catch(console.error);
