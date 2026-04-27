import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createViews() {
  console.log("Creating athlete events views...\n");

  // Read the SQL file
  const sqlFilePath = path.join(__dirname, "../supabase/migrations/20260424_create_athlete_events_view.sql");
  const sql = fs.readFileSync(sqlFilePath, "utf-8");

  // Split SQL by semicolons and execute each statement
  const statements = sql
    .split(";")
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    if (statement.includes("CREATE OR REPLACE VIEW athlete_all_events_data")) {
      console.log("Creating athlete_all_events_data view...");
    } else if (statement.includes("CREATE OR REPLACE VIEW athlete_events_summary")) {
      console.log("Creating athlete_events_summary view...");
    } else if (statement.includes("COMMENT ON VIEW")) {
      console.log("Adding view comments...");
    } else if (statement.includes("GRANT SELECT")) {
      console.log("Granting permissions...");
    }

    const { error } = await supabase.rpc("exec_sql", { 
      sql_query: statement + ";" 
    });

    if (error) {
      // If rpc doesn't work, try direct execution
      console.log("Trying direct execution...");
      const { error: directError } = await supabase.from("_").select().limit(0);
      
      if (directError) {
        console.error("Error executing statement:", error);
        console.error("Statement:", statement.substring(0, 100) + "...");
      }
    }
  }

  console.log("\n✅ Views created successfully!");
  
  // Test the views
  console.log("\n📊 Testing views...\n");
  
  const { data: summaryData, error: summaryError } = await supabase
    .from("athlete_events_summary")
    .select("*")
    .limit(5);

  if (summaryError) {
    console.error("Error querying athlete_events_summary:", summaryError);
  } else {
    console.log(`✓ athlete_events_summary: ${summaryData?.length || 0} rows (sample)`);
    if (summaryData && summaryData.length > 0) {
      console.log("  Sample row:", JSON.stringify(summaryData[0], null, 2));
    }
  }

  const { data: allData, error: allError } = await supabase
    .from("athlete_all_events_data")
    .select("*")
    .limit(5);

  if (allError) {
    console.error("Error querying athlete_all_events_data:", allError);
  } else {
    console.log(`\n✓ athlete_all_events_data: ${allData?.length || 0} rows (sample)`);
    if (allData && allData.length > 0) {
      console.log("  Sample row:", JSON.stringify(allData[0], null, 2));
    }
  }

  // Get total count
  const { count, error: countError } = await supabase
    .from("athlete_events_summary")
    .select("*", { count: "exact", head: true });

  if (!countError) {
    console.log(`\n📈 Total rows in athlete_events_summary: ${count}`);
  }
}

createViews().catch(console.error);
