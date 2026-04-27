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

async function getAthleteEventsTable() {
  console.log("🔍 Fetching athlete data from wa_athlete_profiles...\n");

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

  // Prepare table data
  const tableData = athletes.map((athlete: AthleteData) => {
    return {
      "Athlete Name": athlete.reliance_name || "N/A",
      "All Events (reliance_events)": athlete.reliance_events || "N/A",
      "Main Event": mainEventMap.get(athlete.aa_athlete_id) || "N/A",
    };
  });

  // Display as table
  console.log("📊 ATHLETE EVENTS TABLE");
  console.log("=" . repeat(120));
  console.table(tableData);

  // Summary statistics
  console.log("\n📈 SUMMARY");
  console.log("=" . repeat(60));
  console.log(`Total Athletes: ${athletes.length}`);
  console.log(`Athletes with Main Event: ${Array.from(mainEventMap.values()).length}`);
  console.log(
    `Athletes without Main Event: ${athletes.length - Array.from(mainEventMap.values()).length}`
  );

  // Export to CSV format
  console.log("\n📄 Exporting to CSV file...");
  const csvHeader = "Athlete Name,All Events (reliance_events),Main Event\n";
  const csvRows = tableData.map((row) => {
    return `"${row["Athlete Name"]}","${row["All Events (reliance_events)"]}","${row["Main Event"]}"`;
  }).join("\n");
  
  const csvContent = csvHeader + csvRows;
  const csvFilePath = path.join(process.cwd(), "athlete-events-table.csv");
  
  fs.writeFileSync(csvFilePath, csvContent, "utf-8");
  console.log(`✅ CSV file saved to: ${csvFilePath}`);
  
  // Also display preview
  console.log("\n📄 CSV PREVIEW (first 10 rows):");
  console.log("=" . repeat(120));
  console.log(csvHeader + csvRows.split("\n").slice(0, 10).join("\n"));
}

// Run the script
getAthleteEventsTable()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
