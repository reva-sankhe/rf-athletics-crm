import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPBStructure() {
  console.log("🔍 Checking PB data structure...\n");

  // Get a sample athlete to examine their PBs
  const { data: sampleAthlete } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name")
    .limit(1)
    .single();

  if (!sampleAthlete) {
    console.log("No athlete found");
    return;
  }

  console.log(`Sample Athlete: ${sampleAthlete.reliance_name}`);
  console.log(`Athlete ID: ${sampleAthlete.aa_athlete_id}\n`);

  // Get all PB records for this athlete
  const { data: pbs } = await supabase
    .from("wa_athlete_pbs")
    .select("*")
    .eq("aa_athlete_id", sampleAthlete.aa_athlete_id)
    .order("discipline");

  console.log(`Total PB records for this athlete: ${pbs?.length || 0}\n`);
  
  if (pbs && pbs.length > 0) {
    console.log("Sample PB records:");
    console.table(pbs);
  }

  // Check if there are duplicate disciplines (multiple marks per event)
  if (pbs) {
    const disciplineCounts = new Map<string, number>();
    pbs.forEach((pb: any) => {
      const count = disciplineCounts.get(pb.discipline) || 0;
      disciplineCounts.set(pb.discipline, count + 1);
    });

    const duplicates = Array.from(disciplineCounts.entries()).filter(([_, count]) => count > 1);
    
    if (duplicates.length > 0) {
      console.log("\n⚠️  Found multiple records for same discipline:");
      duplicates.forEach(([discipline, count]) => {
        console.log(`  - ${discipline}: ${count} records`);
      });
    } else {
      console.log("\n✅ Each discipline has only ONE record (already the PB)");
    }
  }

  // Check the table structure
  console.log("\n📊 Checking table description...");
  const { data: tableInfo } = await supabase
    .from("wa_athlete_pbs")
    .select("*")
    .limit(0);
  
  console.log("Table columns:", Object.keys(tableInfo || {}));
}

checkPBStructure()
  .then(() => {
    console.log("\n✅ Check completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
