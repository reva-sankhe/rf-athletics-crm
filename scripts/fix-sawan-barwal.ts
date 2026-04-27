import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fixSawanBarwal() {
  console.log("🔧 Fixing Sawan Barwal's reliance_events field...\n");

  // Update the reliance_events field
  const { error } = await supabase
    .from("wa_athlete_profiles")
    .update({ 
      reliance_events: "Men's 5000m, Men's 10000m, Men's Marathon" 
    })
    .eq("reliance_name", "Sawan Barwal");

  if (error) {
    console.error("❌ Error:", error);
    return;
  }

  console.log("✅ Successfully updated Sawan Barwal's reliance_events\n");

  // Verify the update
  const { data } = await supabase
    .from("wa_athlete_profiles")
    .select("reliance_name, reliance_events")
    .eq("reliance_name", "Sawan Barwal")
    .single();

  console.log("📊 Verification:");
  console.log(`   Name: ${data?.reliance_name}`);
  console.log(`   All Events: ${data?.reliance_events}`);
}

fixSawanBarwal()
  .then(() => {
    console.log("\n✅ Script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Error:", error);
    process.exit(1);
  });
