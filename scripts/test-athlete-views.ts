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

async function testViews() {
  console.log("🔍 Testing Athlete Events Views\n");
  console.log("=".repeat(50));
  
  try {
    // Test athlete_events_summary view
    console.log("\n1️⃣  Testing athlete_events_summary view...\n");
    
    const { data: summaryData, error: summaryError, count } = await supabase
      .from("athlete_events_summary")
      .select("*", { count: "exact" })
      .limit(3);

    if (summaryError) {
      console.error("❌ Error querying athlete_events_summary:");
      console.error(summaryError);
      console.log("\n⚠️  View may not exist. Please run the migration:");
      console.log("   supabase/migrations/20260424_create_athlete_events_view.sql");
    } else {
      console.log(`✅ View exists! Total rows: ${count}`);
      console.log(`\n📋 Sample data (first 3 rows):\n`);
      summaryData?.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.athlete_name} - ${row.event_name}`);
        console.log(`   Main Event: ${row.is_main_event ? 'Yes' : 'No'}`);
        console.log(`   PB: ${row.personal_best || 'N/A'} ${row.pb_date ? `(${row.pb_date})` : ''}`);
        console.log(`   SB: ${row.season_best || 'N/A'}`);
        console.log(`   Results: ${row.result_count} competitions`);
        console.log(`   Last competed: ${row.last_competed || 'N/A'}\n`);
      });
    }

    // Test athlete_all_events_data view
    console.log("\n2️⃣  Testing athlete_all_events_data view...\n");
    
    const { data: allData, error: allError } = await supabase
      .from("athlete_all_events_data")
      .select("*")
      .limit(2);

    if (allError) {
      console.error("❌ Error querying athlete_all_events_data:");
      console.error(allError);
    } else {
      console.log(`✅ View exists! Sample data:\n`);
      allData?.forEach((row, idx) => {
        console.log(`${idx + 1}. ${row.athlete_name} (${row.gender})`);
        console.log(`   Event: ${row.event_name} ${row.is_main_event ? '⭐' : ''}`);
        console.log(`   PB: ${row.pb_mark || 'N/A'} @ ${row.pb_venue || 'N/A'}`);
        console.log(`   Latest Result: ${row.latest_result_mark || 'N/A'} @ ${row.latest_result_venue || 'N/A'}`);
        console.log(`   Total Results: ${row.total_results_count}\n`);
      });
    }

    // Get statistics
    console.log("\n3️⃣  Statistics\n");
    
    const { data: stats } = await supabase
      .from("athlete_events_summary")
      .select("athlete_name, event_name, is_main_event");

    if (stats) {
      const uniqueAthletes = new Set(stats.map(s => s.athlete_name)).size;
      const uniqueEvents = new Set(stats.map(s => s.event_name)).size;
      const mainEvents = stats.filter(s => s.is_main_event).length;
      
      console.log(`👥 Unique Athletes: ${uniqueAthletes}`);
      console.log(`🏃 Unique Events: ${uniqueEvents}`);
      console.log(`⭐ Main Events: ${mainEvents}`);
      console.log(`📊 Total Athlete-Event Combinations: ${stats.length}`);
    }

    // Test specific queries
    console.log("\n4️⃣  Sample Queries\n");
    
    // Athletes with most events
    const { data: multiEventAthletes } = await supabase
      .from("athlete_events_summary")
      .select("athlete_name, event_name")
      .order("athlete_name");

    if (multiEventAthletes) {
      const athleteEventCounts = multiEventAthletes.reduce((acc: any, row) => {
        acc[row.athlete_name] = (acc[row.athlete_name] || 0) + 1;
        return acc;
      }, {});

      const topMultiEvent = Object.entries(athleteEventCounts)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5);

      console.log("Top 5 athletes by number of events:");
      topMultiEvent.forEach(([name, count], idx) => {
        console.log(`  ${idx + 1}. ${name}: ${count} events`);
      });
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ Test completed successfully!\n");

  } catch (error) {
    console.error("❌ Unexpected error:", error);
  }
}

testViews().catch(console.error);
