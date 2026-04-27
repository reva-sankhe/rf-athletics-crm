/**
 * Event Names Audit Script
 * 
 * This script audits all event names across all tables to identify:
 * - Inconsistencies in naming
 * - Variations of the same event
 * - Missing standardization
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
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface EventNameEntry {
  source_table: string;
  event_name: string;
  usage_count: number;
}

interface ConsolidatedEvent {
  event_name: string;
  total_usage: number;
  category: string;
}

interface EventVariation {
  normalized_name: string;
  variations: string[];
  variation_count: number;
}

interface AthleteEvents {
  aa_athlete_id: string;
  athlete_name: string;
  gender: string;
  athlete_events: string[];
  event_count: number;
  main_event: string | null;
}

async function extractEventsByTable() {
  console.log("\n🔍 Extracting event names from each table...\n");
  
  const results: Record<string, EventNameEntry[]> = {};
  
  // 1. athlete_events
  console.log("📊 Checking athlete_events...");
  const { data: athleteEvents } = await supabase
    .from("athlete_events")
    .select("event_name");
  
  if (athleteEvents) {
    const counts = new Map<string, number>();
    athleteEvents.forEach(e => {
      counts.set(e.event_name, (counts.get(e.event_name) || 0) + 1);
    });
    results.athlete_events = Array.from(counts.entries()).map(([name, count]) => ({
      source_table: "athlete_events",
      event_name: name,
      usage_count: count
    }));
    console.log(`   ✅ Found ${counts.size} unique events`);
  }
  
  // 2. wa_athlete_pbs
  console.log("📊 Checking wa_athlete_pbs...");
  const { data: pbs } = await supabase
    .from("wa_athlete_pbs")
    .select("discipline");
  
  if (pbs) {
    const counts = new Map<string, number>();
    pbs.forEach(p => {
      if (p.discipline) {
        counts.set(p.discipline, (counts.get(p.discipline) || 0) + 1);
      }
    });
    results.wa_athlete_pbs = Array.from(counts.entries()).map(([name, count]) => ({
      source_table: "wa_athlete_pbs",
      event_name: name,
      usage_count: count
    }));
    console.log(`   ✅ Found ${counts.size} unique disciplines`);
  }
  
  // 3. wa_athlete_season_bests
  console.log("📊 Checking wa_athlete_season_bests...");
  const { data: sbs } = await supabase
    .from("wa_athlete_season_bests")
    .select("discipline");
  
  if (sbs) {
    const counts = new Map<string, number>();
    sbs.forEach(s => {
      if (s.discipline) {
        counts.set(s.discipline, (counts.get(s.discipline) || 0) + 1);
      }
    });
    results.wa_athlete_season_bests = Array.from(counts.entries()).map(([name, count]) => ({
      source_table: "wa_athlete_season_bests",
      event_name: name,
      usage_count: count
    }));
    console.log(`   ✅ Found ${counts.size} unique disciplines`);
  }
  
  // 4. wa_rf_athlete_results
  console.log("📊 Checking wa_rf_athlete_results...");
  const { data: results_data } = await supabase
    .from("wa_rf_athlete_results")
    .select("discipline")
    .limit(10000);
  
  if (results_data) {
    const counts = new Map<string, number>();
    results_data.forEach(r => {
      if (r.discipline) {
        counts.set(r.discipline, (counts.get(r.discipline) || 0) + 1);
      }
    });
    results.wa_rf_athlete_results = Array.from(counts.entries()).map(([name, count]) => ({
      source_table: "wa_rf_athlete_results",
      event_name: name,
      usage_count: count
    }));
    console.log(`   ✅ Found ${counts.size} unique disciplines`);
  }
  
  // 5. wa_athlete_profiles.reliance_events
  console.log("📊 Checking wa_athlete_profiles.reliance_events...");
  const { data: profiles } = await supabase
    .from("wa_athlete_profiles")
    .select("reliance_events");
  
  if (profiles) {
    const counts = new Map<string, number>();
    profiles.forEach((p: any) => {
      if (p.reliance_events) {
        const events = p.reliance_events.split(",").map((e: string) => e.trim()).filter((e: string) => e);
        events.forEach((event: string) => {
          counts.set(event, (counts.get(event) || 0) + 1);
        });
      }
    });
    results.wa_athlete_profiles = Array.from(counts.entries()).map(([name, count]) => ({
      source_table: "wa_athlete_profiles.reliance_events",
      event_name: name,
      usage_count: count
    }));
    console.log(`   ✅ Found ${counts.size} unique events`);
  }
  
  return results;
}

function categorizeEvent(eventName: string): string {
  const name = eventName.toLowerCase();
  
  if (name.includes("hurdles")) return "Hurdles";
  if (/(100m|200m|400m|100 |200 |400 )/.test(name) && !name.includes("hurdles")) return "Sprint";
  if (/(800m|1500m|800 |1500 )/.test(name)) return "Middle Distance";
  if (/(3000m|5000m|10000m|3000 |5000 |10000 )/.test(name)) return "Long Distance";
  if (name.includes("jump")) return "Jumps";
  if (/(throw|shot|javelin|discus|hammer)/.test(name)) return "Throws";
  if (name.includes("walk")) return "Race Walk";
  if (name.includes("relay")) return "Relay";
  return "Other";
}

function normalizeEventForComparison(eventName: string): string {
  return eventName
    .toLowerCase()
    .replace(/men'?s?\s*/gi, "")
    .replace(/women'?s?\s*/gi, "")
    .replace(/\s*metres?\s*/gi, "m")
    .replace(/\s+/g, " ")
    .trim();
}

function consolidateEvents(tableResults: Record<string, EventNameEntry[]>): ConsolidatedEvent[] {
  const allEvents = new Map<string, number>();
  
  Object.values(tableResults).forEach(tableData => {
    tableData.forEach(entry => {
      const current = allEvents.get(entry.event_name) || 0;
      allEvents.set(entry.event_name, current + entry.usage_count);
    });
  });
  
  const consolidated: ConsolidatedEvent[] = Array.from(allEvents.entries()).map(([name, count]) => ({
    event_name: name,
    total_usage: count,
    category: categorizeEvent(name)
  }));
  
  // Sort by category then name
  consolidated.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.event_name.localeCompare(b.event_name);
  });
  
  return consolidated;
}

function findEventVariations(consolidated: ConsolidatedEvent[]): EventVariation[] {
  const normalized = new Map<string, Set<string>>();
  
  consolidated.forEach(event => {
    const norm = normalizeEventForComparison(event.event_name);
    if (!normalized.has(norm)) {
      normalized.set(norm, new Set());
    }
    normalized.get(norm)!.add(event.event_name);
  });
  
  const variations: EventVariation[] = [];
  
  normalized.forEach((varSet, normName) => {
    if (varSet.size > 1) {
      variations.push({
        normalized_name: normName,
        variations: Array.from(varSet).sort(),
        variation_count: varSet.size
      });
    }
  });
  
  variations.sort((a, b) => b.variation_count - a.variation_count);
  
  return variations;
}

async function getAthleteEventsSummary(): Promise<AthleteEvents[]> {
  console.log("\n🔍 Fetching athlete events summary...");
  
  const { data: profiles } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name, gender")
    .order("reliance_name");
  
  const { data: events } = await supabase
    .from("athlete_events")
    .select("*");
  
  if (!profiles || !events) return [];
  
  const athletesSummary: AthleteEvents[] = profiles.map(profile => {
    const athleteEvents = events.filter(e => e.aa_athlete_id === profile.aa_athlete_id);
    const mainEvent = athleteEvents.find(e => e.is_main_event);
    
    return {
      aa_athlete_id: profile.aa_athlete_id,
      athlete_name: profile.reliance_name,
      gender: profile.gender,
      athlete_events: athleteEvents.map(e => e.event_name).sort(),
      event_count: athleteEvents.length,
      main_event: mainEvent?.event_name || null
    };
  });
  
  console.log(`   ✅ Processed ${athletesSummary.length} athletes`);
  
  return athletesSummary;
}

function generateReport(
  tableResults: Record<string, EventNameEntry[]>,
  consolidated: ConsolidatedEvent[],
  variations: EventVariation[],
  athletesSummary: AthleteEvents[]
): string {
  let report = `# EVENT NAMES AUDIT REPORT\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `## Executive Summary\n\n`;
  
  const totalUniqueEvents = new Set(consolidated.map(e => e.event_name)).size;
  const totalVariations = variations.length;
  const affectedEvents = variations.reduce((sum, v) => sum + v.variation_count, 0);
  
  report += `- **Total Unique Event Names:** ${totalUniqueEvents}\n`;
  report += `- **Event Name Variations Found:** ${totalVariations} normalized events with multiple spellings\n`;
  report += `- **Total Affected Records:** ${affectedEvents} different spellings that need standardization\n`;
  report += `- **Athletes Tracked:** ${athletesSummary.length}\n\n`;
  
  // Table breakdown
  report += `## Events by Source Table\n\n`;
  Object.entries(tableResults).forEach(([table, entries]) => {
    report += `### ${table}\n\n`;
    report += `**Unique Events:** ${entries.length}\n\n`;
    report += `| Event Name | Usage Count |\n`;
    report += `|------------|-------------|\n`;
    entries.slice(0, 20).forEach(e => {
      report += `| ${e.event_name} | ${e.usage_count} |\n`;
    });
    if (entries.length > 20) {
      report += `| ... | ... |\n`;
      report += `\n_Showing top 20 of ${entries.length} events_\n`;
    }
    report += `\n`;
  });
  
  // Consolidated events by category
  report += `## All Events by Category\n\n`;
  const byCategory = consolidated.reduce((acc, event) => {
    if (!acc[event.category]) acc[event.category] = [];
    acc[event.category].push(event);
    return acc;
  }, {} as Record<string, ConsolidatedEvent[]>);
  
  Object.entries(byCategory).forEach(([category, events]) => {
    report += `### ${category} (${events.length} events)\n\n`;
    report += `| Event Name | Total Usage |\n`;
    report += `|------------|-------------|\n`;
    events.forEach(e => {
      report += `| ${e.event_name} | ${e.total_usage} |\n`;
    });
    report += `\n`;
  });
  
  // Variations (the key insight!)
  report += `## ⚠️ Event Name Variations (NEEDS STANDARDIZATION)\n\n`;
  report += `These are events that appear with multiple spellings/formats:\n\n`;
  
  if (variations.length === 0) {
    report += `✅ **No variations found!** All event names are consistent.\n\n`;
  } else {
    variations.forEach(v => {
      report += `### "${v.normalized_name}" (${v.variation_count} variations)\n\n`;
      report += `Current spellings in database:\n`;
      v.variations.forEach(var_name => {
        report += `- \`${var_name}\`\n`;
      });
      report += `\n**📝 Action Required:** Choose one standard spelling and update all others.\n\n`;
    });
  }
  
  // Athlete summary
  report += `## Athletes and Their Events\n\n`;
  
  const byGender = athletesSummary.reduce((acc, a) => {
    const g = a.gender || "Unknown";
    if (!acc[g]) acc[g] = [];
    acc[g].push(a);
    return acc;
  }, {} as Record<string, AthleteEvents[]>);
  
  Object.entries(byGender).forEach(([gender, athletes]) => {
    report += `### ${gender} (${athletes.length} athletes)\n\n`;
    athletes.forEach(athlete => {
      report += `#### ${athlete.athlete_name}\n`;
      report += `- **Main Event:** ${athlete.main_event || "❌ Not set"}\n`;
      report += `- **All Events (${athlete.event_count}):** ${athlete.athlete_events.join(", ") || "None"}\n\n`;
    });
  });
  
  // Recommendations
  report += `## Recommendations\n\n`;
  report += `### Priority 1: Standardize Event Names\n\n`;
  if (variations.length > 0) {
    report += `**${variations.length} events need standardization.**\n\n`;
    report += `For each variation group above:\n`;
    report += `1. Choose the preferred standard name\n`;
    report += `2. Create SQL UPDATE statements to normalize all variations\n`;
    report += `3. Update across all tables: athlete_events, wa_athlete_pbs, wa_athlete_season_bests, wa_rf_athlete_results\n\n`;
  } else {
    report += `✅ No standardization needed - event names are already consistent!\n\n`;
  }
  
  report += `### Priority 2: Create Event Taxonomy\n\n`;
  report += `Define canonical list of event names with:\n`;
  report += `- Standard spelling (e.g., "100m" vs "100 Metres")\n`;
  report += `- Gender prefix policy (include "Women's" / "Men's" or not)\n`;
  report += `- Distance format (e.g., "m" vs "Metres")\n\n`;
  
  report += `### Priority 3: Enforce Consistency\n\n`;
  report += `- Add database constraints or triggers\n`;
  report += `- Create reference table with valid event names\n`;
  report += `- Update application code to use standard names\n\n`;
  
  return report;
}

async function main() {
  console.log("=".repeat(60));
  console.log("🏃 EVENT NAMES AUDIT");
  console.log("=".repeat(60));
  console.log(`Started: ${new Date().toISOString()}\n`);
  
  try {
    // Extract events from all tables
    const tableResults = await extractEventsByTable();
    
    // Consolidate and categorize
    console.log("\n📊 Consolidating and categorizing events...");
    const consolidated = consolidateEvents(tableResults);
    console.log(`   ✅ Found ${consolidated.length} unique event names total`);
    
    // Find variations
    console.log("\n🔍 Analyzing for variations...");
    const variations = findEventVariations(consolidated);
    console.log(`   ${variations.length > 0 ? '⚠️' : '✅'} Found ${variations.length} events with multiple spellings`);
    
    // Get athlete summary
    const athletesSummary = await getAthleteEventsSummary();
    
    // Generate report
    console.log("\n📝 Generating report...");
    const report = generateReport(tableResults, consolidated, variations, athletesSummary);
    
    // Write to file
    const reportPath = path.join(process.cwd(), "EVENT_NAMES_AUDIT_REPORT.md");
    fs.writeFileSync(reportPath, report);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ AUDIT COMPLETE");
    console.log("=".repeat(60));
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log(`\n📊 Quick Summary:`);
    console.log(`   - Unique Events: ${consolidated.length}`);
    console.log(`   - Variations Found: ${variations.length}`);
    console.log(`   - Athletes: ${athletesSummary.length}`);
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ Error during audit:", error);
    process.exit(1);
  }
}

main();
