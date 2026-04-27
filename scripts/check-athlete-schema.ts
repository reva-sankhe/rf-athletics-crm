import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env file");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  // Get a sample athlete profile to see all fields
  const { data: profiles, error: profileError } = await supabase
    .from("wa_athlete_profiles")
    .select("*")
    .limit(1);

  if (profileError) {
    console.error("Error fetching athlete profile:", profileError);
  } else {
    console.log("\n=== WA Athlete Profile Fields ===");
    console.log(profiles?.[0] ? Object.keys(profiles[0]) : "No data");
    console.log("\nSample data:", JSON.stringify(profiles?.[0], null, 2));
  }

  // Check if there's ranking data
  const { data: rankings, error: rankingError } = await supabase
    .from("wa_rankings")
    .select("*")
    .limit(3);

  if (rankingError) {
    console.error("Error fetching rankings:", rankingError);
  } else {
    console.log("\n=== WA Rankings Sample ===");
    console.log(rankings);
  }
}

checkSchema();
