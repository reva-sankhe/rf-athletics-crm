/**
 * Generate Event Name Mapping
 * 
 * This script creates a comprehensive mapping from all current event name variations
 * to the standardized event names
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables
import dotenv from "dotenv";
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Missing environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Standard event mapping
const EVENT_MAPPING: Record<string, string> = {
  // Sprint events
  "60 Metres": "Men's 60m",
  "100 Metres": "Men's 100m",
  "200 Metres": "Men's 200m",
  "400 Metres": "Men's 400m",
  "Men's 100m": "Men's 100m",
  "Women's 100m": "Women's 100m",
  "Men's 200m": "Men's 200m",
  "Women's 200m": "Women's 200m",
  "Women's 400m": "Women's 400m",
  
  // Hurdles
  "60 Metres Hurdles": "Men's 60m Hurdles",
  "100 Metres Hurdles": "Women's 100m Hurdles",
  "100 Metres Hurdles (76.2cm)": "Women's 100m Hurdles (76.2cm)",
  "110 Metres Hurdles": "Men's 110m Hurdles",
  "110 Metres Hurdles (99.0cm)": "Men's 110m Hurdles (99.0cm)",
  "110 Metres Hurdles (91.4cm)": "Men's 110m Hurdles (91.4cm)",
  "400 Metres Hurdles": "Men's 400m Hurdles",
  "Men's 110m Hurdles": "Men's 110m Hurdles",
  "Women's 100m Hurdles": "Women's 100m Hurdles",
  "Women's 400m Hurdles": "Women's 400m Hurdles",
  "Men's 400m Hurdles": "Men's 400m Hurdles",
  
  // Middle distance
  "800 Metres": "Men's 800m",
  "Men's 800m": "Men's 800m",
  "Women's 800m": "Women's 800m",
  "1500 Metres": "Men's 1500m",
  "Women's 1500m": "Women's 1500m",
  "3000 Metres": "Men's 3000m",
  
  // Long distance
  "5000 Metres": "Men's 5000m",
  "Men's 5000m": "Men's 5000m",
  "Women's 5000m": "Women's 5000m",
  "10,000 Metres": "Men's 10000m",
  "Men's 10000m": "Men's 10000m",
  "Women's 10000m": "Women's 10000m",
  "2000 Metres": "Men's 2000m",
  
  // Road running
  "Marathon": "Men's Marathon",
  "Men's Marathon": "Men's Marathon",
  "Half Marathon": "Men's Half Marathon",
  "25 Kilometres Road": "Men's 25km Road",
  "10 Kilometres Road": "Men's 10km Road",
  
  // Race walk
  "10 Kilometres Race Walk": "Men's 10km Race Walk",
  "10,000 Metres Race Walk": "Men's 10km Race Walk",
  "20 Kilometres Race Walk": "Men's 20km Race Walk",
  "20,000 Metres Race Walk": "Men's 20km Race Walk",
  "35 Kilometres Race Walk": "Men's 35km Race Walk",
  "Half Marathon Race Walk": "Men's Half Marathon Race Walk",
  "Marathon Race Walk": "Men's Marathon Race Walk",
  "Women's Race Walk": "Women's Race Walk",
  "3000 Metres Race Walk": "Men's 3km Race Walk",
  "5000 Metres Race Walk": "Men's 5km Race Walk",
  
  // Jumps
  "High Jump": "Men's High Jump",
  "Men's High Jump": "Men's High Jump",
  "Long Jump": "Men's Long Jump",
  "Men's Long Jump": "Men's Long Jump",
  "Women's Long Jump": "Women's Long Jump",
  "Triple Jump": "Men's Triple Jump",
  "Pole Vault": "Men's Pole Vault",
  "Men's Pole Vault": "Men's Pole Vault",
  
  // Throws - Shot Put
  "Shot Put": "Men's Shot Put",
  "Shot Put (3kg)": "Men's Shot Put (3kg)",
  "Women's Shot Put": "Women's Shot Put",
  
  // Throws - Discus
  "Discus Throw": "Men's Discus Throw",
  "Discus Throw (1,75kg)": "Men's Discus Throw (1.75kg)",
  "Discus Throw (1.75kg)": "Men's Discus Throw (1.75kg)",
  "Discus Throw (1,5kg)": "Men's Discus Throw (1.5kg)",
  "Discus Throw (1.5kg)": "Men's Discus Throw (1.5kg)",
  "Men's Discus Throw": "Men's Discus Throw",
  
  // Throws - Hammer
  "Hammer Throw": "Men's Hammer Throw",
  "Hammer Throw (6kg)": "Men's Hammer Throw (6kg)",
  "Hammer Throw (5kg)": "Men's Hammer Throw (5kg)",
  "Hammer Throw (3kg)": "Men's Hammer Throw (3kg)",
  "Men's Hammer Throw": "Men's Hammer Throw",
  "Women's Hammer Throw": "Women's Hammer Throw",
  
  // Throws - Javelin
  "Javelin Throw": "Men's Javelin Throw",
  "Javelin Throw (700g)": "Men's Javelin Throw (700g)",
  "Men's Javelin Throw": "Men's Javelin Throw",
  
  // Throws - Weight
  "Weight Throw": "Men's Weight Throw",
  
  // Combined events
  "Decathlon": "Men's Decathlon",
  "Men's Decathlon": "Men's Decathlon",
  "Heptathlon": "Women's Heptathlon",
  
  // Relays
  "4x100 Metres Relay": "Men's 4x100m Relay",
  "4x100 Metres Relay Mixed": "Mixed 4x100m Relay",
  "4x400 Metres Relay": "Men's 4x400m Relay",
  "4x400 Metres Relay Mixed": "Mixed 4x400m Relay",
  
  // Cross country
  "Cross Country": "Men's Cross Country",
  "Cross Country Senior Race": "Men's Cross Country Senior Race",
  
  // Special / Short Track
  "200 Metres Short Track": "Men's 200m Short Track",
  "800 Metres Short Track": "Men's 800m Short Track",
  "5000 Metres Short Track": "Men's 5000m Short Track",
  "Sprint Medley 1000m": "Sprint Medley 1000m",
};

async function getAllCurrentEvents() {
  console.log("\n🔍 Extracting all current event names...\n");
  
  const allEvents = new Set<string>();
  
  // From athlete_events
  const { data: ae } = await supabase.from("athlete_events").select("event_name");
  ae?.forEach(e => allEvents.add(e.event_name));
  
  // From wa_athlete_pbs
  const { data: pbs } = await supabase.from("wa_athlete_pbs").select("discipline");
  pbs?.forEach(p => p.discipline && allEvents.add(p.discipline));
  
  // From wa_rf_athlete_results
  const { data: results } = await supabase.from("wa_rf_athlete_results").select("discipline").limit(10000);
  results?.forEach(r => r.discipline && allEvents.add(r.discipline));
  
  // From wa_athlete_profiles
  const { data: profiles } = await supabase.from("wa_athlete_profiles").select("reliance_events");
  profiles?.forEach(p => {
    if (p.reliance_events) {
      p.reliance_events.split(",").forEach((e: string) => {
        const trimmed = e.trim();
        if (trimmed) allEvents.add(trimmed);
      });
    }
  });
  
  return Array.from(allEvents).sort();
}

function generateMapping(currentEvents: string[]) {
  const mapped: Array<{ current: string; standard: string; status: string }> = [];
  const unmapped: string[] = [];
  
  for (const event of currentEvents) {
    if (EVENT_MAPPING[event]) {
      mapped.push({
        current: event,
        standard: EVENT_MAPPING[event],
        status: "✅ Mapped"
      });
    } else {
      unmapped.push(event);
      mapped.push({
        current: event,
        standard: "❌ NOT MAPPED",
        status: "⚠️ Needs Manual Review"
      });
    }
  }
  
  return { mapped, unmapped };
}

function generateReport(mapped: Array<{ current: string; standard: string; status: string }>, unmapped: string[]) {
  let report = `# Event Name Mapping Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- **Total Current Events:** ${mapped.length}\n`;
  report += `- **Successfully Mapped:** ${mapped.length - unmapped.length}\n`;
  report += `- **Needs Manual Review:** ${unmapped.length}\n\n`;
  
  report += `## Complete Mapping Table\n\n`;
  report += `| Current Name | Standard Name | Status |\n`;
  report += `|--------------|---------------|--------|\n`;
  
  for (const item of mapped) {
    report += `| ${item.current} | ${item.standard} | ${item.status} |\n`;
  }
  
  if (unmapped.length > 0) {
    report += `\n## ⚠️ Unmapped Events (Needs Manual Review)\n\n`;
    report += `The following events do not have mappings defined:\n\n`;
    
    for (const event of unmapped) {
      report += `### \`${event}\`\n`;
      report += `- **Action:** Determine correct standard name or add to EVENT_MAPPING\n\n`;
    }
  } else {
    report += `\n## ✅ All Events Mapped!\n\n`;
    report += `All current event names have been successfully mapped to standard names.\n`;
  }
  
  return report;
}

async function main() {
  console.log("=".repeat(60));
  console.log("🏃 EVENT NAME MAPPING GENERATOR");
  console.log("=".repeat(60));
  
  try {
    const currentEvents = await getAllCurrentEvents();
    console.log(`✅ Found ${currentEvents.length} unique event names\n`);
    
    console.log("📊 Generating mapping...");
    const { mapped, unmapped } = generateMapping(currentEvents);
    console.log(`   ✅ Mapped: ${mapped.length - unmapped.length}`);
    console.log(`   ⚠️  Unmapped: ${unmapped.length}\n`);
    
    console.log("📝 Generating report...");
    const report = generateReport(mapped, unmapped);
    
    const reportPath = path.join(process.cwd(), "EVENT_NAME_MAPPING.md");
    fs.writeFileSync(reportPath, report);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ MAPPING COMPLETE");
    console.log("=".repeat(60));
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
