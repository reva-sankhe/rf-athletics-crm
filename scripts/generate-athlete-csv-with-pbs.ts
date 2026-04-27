import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AthleteData {
  reliance_name: string;
  reliance_events: string | null;
  aa_athlete_id: string;
}

interface AthleteEvent {
  event_name: string;
  is_main_event: boolean;
}

interface PersonalBest {
  discipline: string;
  mark: string;
}

// Simple event matching function to handle variations
function isEventMatch(pbDiscipline: string, eventName: string): boolean {
  const normalize = (str: string) => str.toLowerCase().trim().replace(/\s+/g, " ");
  const normPB = normalize(pbDiscipline);
  const normEvent = normalize(eventName);
  
  // Direct match
  if (normPB === normEvent) return true;
  
  // Check if one contains the other (for cases like "100m" vs "Men's 100m")
  if (normPB.includes(normEvent) || normEvent.includes(normPB)) return true;
  
  // Extract event type (e.g., "100m" from "Men's 100m")
  const eventMatch = normEvent.match(/(\d+m|\d+km|marathon|long jump|high jump|triple jump|pole vault|shot put|discus|javelin|hammer|decathlon|heptathlon|hurdles)/i);
  if (eventMatch) {
    const eventType = eventMatch[0];
    if (normPB.includes(eventType)) return true;
  }
  
  return false;
}

async function generateAthleteCSV() {
  console.log("🔍 Fetching athlete data from Supabase...\n");

  // Get all athletes from wa_athlete_profiles
  const { data: athletes, error: athletesError } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name, reliance_events")
    .order("reliance_name");

  if (athletesError) {
    console.error("❌ Error fetching athletes:", athletesError);
    return;
  }

  if (!athletes || athletes.length === 0) {
    console.log("⚠️  No athletes found in wa_athlete_profiles");
    return;
  }

  console.log(`✅ Found ${athletes.length} athletes\n`);

  // Get all athlete events to determine main events
  const { data: athleteEvents, error: eventsError } = await supabase
    .from("athlete_events")
    .select("aa_athlete_id, event_name, is_main_event")
    .eq("is_main_event", true);

  if (eventsError) {
    console.error("❌ Error fetching athlete events:", eventsError);
  }

  // Create a map of athlete_id -> main event
  const mainEventMap = new Map<string, string>();
  if (athleteEvents) {
    athleteEvents.forEach((event: AthleteEvent & { aa_athlete_id: string }) => {
      mainEventMap.set(event.aa_athlete_id, event.event_name);
    });
  }

  console.log("🔍 Fetching personal bests for all athletes...\n");

  // Get all personal bests
  const { data: allPBs, error: pbsError } = await supabase
    .from("wa_athlete_pbs")
    .select("aa_athlete_id, discipline, mark");

  if (pbsError) {
    console.error("❌ Error fetching personal bests:", pbsError);
  }

  // Create a map of athlete_id -> array of PBs
  const pbsMap = new Map<string, PersonalBest[]>();
  if (allPBs) {
    allPBs.forEach((pb: PersonalBest & { aa_athlete_id: string }) => {
      if (!pbsMap.has(pb.aa_athlete_id)) {
        pbsMap.set(pb.aa_athlete_id, []);
      }
      pbsMap.get(pb.aa_athlete_id)!.push({
        discipline: pb.discipline,
        mark: pb.mark
      });
    });
  }

  console.log(`✅ Found PBs for ${pbsMap.size} athletes\n`);

  // Prepare table data with PB lookup
  const tableData = athletes.map((athlete: AthleteData) => {
    const mainEvent = mainEventMap.get(athlete.aa_athlete_id) || "N/A";
    const athletePBs = pbsMap.get(athlete.aa_athlete_id) || [];
    
    // Find the PB that matches the main event
    let pbInMainEvent = "N/A";
    if (mainEvent !== "N/A" && athletePBs.length > 0) {
      const matchingPB = athletePBs.find(pb => isEventMatch(pb.discipline, mainEvent));
      if (matchingPB) {
        pbInMainEvent = matchingPB.mark || "N/A";
      }
    }

    return {
      "Athlete Name": athlete.reliance_name || "N/A",
      "All Events (reliance_events)": athlete.reliance_events || "N/A",
      "Main Event": mainEvent,
      "PB in Main Event": pbInMainEvent,
    };
  });

  // Display as table
  console.log("📊 ATHLETE DATA WITH PERSONAL BESTS");
  console.log("=".repeat(150));
  console.table(tableData);

  // Summary statistics
  console.log("\n📈 SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Athletes: ${athletes.length}`);
  console.log(`Athletes with Main Event: ${Array.from(mainEventMap.values()).length}`);
  console.log(`Athletes without Main Event: ${athletes.length - Array.from(mainEventMap.values()).length}`);
  
  const athletesWithPB = tableData.filter(row => row["PB in Main Event"] !== "N/A").length;
  console.log(`Athletes with PB in Main Event: ${athletesWithPB}`);
  console.log(`Athletes without PB in Main Event: ${tableData.length - athletesWithPB}`);

  // Export to CSV format
  console.log("\n📄 Exporting to CSV file...");
  const csvHeader = "Athlete Name,All Events (reliance_events),Main Event,PB in Main Event\n";
  const csvRows = tableData.map((row) => {
    return `"${row["Athlete Name"]}","${row["All Events (reliance_events)"]}","${row["Main Event"]}","${row["PB in Main Event"]}"`;
  }).join("\n");
  
  const csvContent = csvHeader + csvRows;
  const csvFilePath = path.join(process.cwd(), "athlete-events-with-pbs.csv");
  
  fs.writeFileSync(csvFilePath, csvContent, "utf-8");
  console.log(`✅ CSV file saved to: ${csvFilePath}`);
  
  // Also display preview
  console.log("\n📄 CSV PREVIEW (first 10 rows):");
  console.log("=".repeat(150));
  console.log(csvHeader + csvRows.split("\n").slice(0, 10).join("\n"));
}

// Run the script
generateAthleteCSV()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
