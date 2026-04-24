/**
 * Data Reconciliation Script for WA Athlete Profiles
 * 
 * This script performs comprehensive data quality checks on the 42 athletes
 * in wa_athlete_profiles and related tables.
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

interface Issue {
  severity: "critical" | "warning" | "info";
  category: string;
  athleteId?: string;
  athleteName?: string;
  description: string;
  suggestedFix?: string;
}

const issues: Issue[] = [];

function addIssue(issue: Issue) {
  issues.push(issue);
}

// Helper to normalize event names for comparison
function normalizeEventName(eventName: string): string {
  return eventName
    .toLowerCase()
    .replace(/men's\s*/gi, "")
    .replace(/women's\s*/gi, "")
    .replace(/\s*metres?\s*/gi, "m")
    .replace(/\s+/g, "")
    .trim();
}

async function checkAthleteProfiles() {
  console.log("\n🔍 Checking athlete profiles...");
  
  const { data: athletes, error } = await supabase
    .from("wa_athlete_profiles")
    .select("*");

  if (error) {
    console.error("❌ Error fetching athlete profiles:", error);
    return;
  }

  console.log(`✅ Found ${athletes?.length || 0} athletes`);

  if (!athletes) return;

  for (const athlete of athletes) {
    // Check missing critical fields
    if (!athlete.reliance_name || athlete.reliance_name.trim() === "") {
      addIssue({
        severity: "critical",
        category: "Missing Data",
        athleteId: athlete.aa_athlete_id,
        description: "Athlete missing name",
        suggestedFix: "Update reliance_name field"
      });
    }

    if (!athlete.birth_date) {
      addIssue({
        severity: "warning",
        category: "Missing Data",
        athleteId: athlete.aa_athlete_id,
        athleteName: athlete.reliance_name,
        description: "Missing birth date",
        suggestedFix: "Add birth_date to profile"
      });
    }

    if (!athlete.gender) {
      addIssue({
        severity: "warning",
        category: "Missing Data",
        athleteId: athlete.aa_athlete_id,
        athleteName: athlete.reliance_name,
        description: "Missing gender",
        suggestedFix: "Add gender to profile"
      });
    }

    if (!athlete.nationality) {
      addIssue({
        severity: "info",
        category: "Missing Data",
        athleteId: athlete.aa_athlete_id,
        athleteName: athlete.reliance_name,
        description: "Missing nationality",
        suggestedFix: "Add nationality to profile"
      });
    }

    // Check age consistency
    if (athlete.birth_date && athlete.age) {
      const birthYear = new Date(athlete.birth_date).getFullYear();
      const currentYear = new Date().getFullYear();
      const calculatedAge = currentYear - birthYear;
      
      if (Math.abs(calculatedAge - athlete.age) > 1) {
        addIssue({
          severity: "warning",
          category: "Data Inconsistency",
          athleteId: athlete.aa_athlete_id,
          athleteName: athlete.reliance_name,
          description: `Age mismatch: stored age=${athlete.age}, calculated from birth_date=${calculatedAge}`,
          suggestedFix: `Update age to ${calculatedAge}`
        });
      }
    }

    // Check events
    if (!athlete.reliance_events || athlete.reliance_events.trim() === "") {
      addIssue({
        severity: "critical",
        category: "Missing Data",
        athleteId: athlete.aa_athlete_id,
        athleteName: athlete.reliance_name,
        description: "No events listed in reliance_events",
        suggestedFix: "Add athlete's events"
      });
    } else {
      // Check for formatting issues in events
      const events = athlete.reliance_events.split(",").map((e: string) => e.trim());
      
      // Check for empty events
      if (events.some((e: string) => e === "")) {
        addIssue({
          severity: "warning",
          category: "Data Quality",
          athleteId: athlete.aa_athlete_id,
          athleteName: athlete.reliance_name,
          description: "Empty event entries in comma-separated list",
          suggestedFix: "Clean up reliance_events field"
        });
      }

      // Check for duplicate events
      const uniqueEvents = new Set(events.map(normalizeEventName));
      if (uniqueEvents.size < events.length) {
        addIssue({
          severity: "info",
          category: "Data Quality",
          athleteId: athlete.aa_athlete_id,
          athleteName: athlete.reliance_name,
          description: "Duplicate events in reliance_events",
          suggestedFix: "Remove duplicate events"
        });
      }
    }
  }
}

async function checkAthleteEvents() {
  console.log("\n🔍 Checking athlete_events table...");
  
  const { data: profiles } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name, reliance_events");

  const { data: athleteEvents, error } = await supabase
    .from("athlete_events")
    .select("*");

  if (error) {
    console.error("❌ Error fetching athlete events:", error);
    return;
  }

  console.log(`✅ Found ${athleteEvents?.length || 0} event records`);

  if (!profiles || !athleteEvents) return;

  // Check each athlete has events in the athlete_events table
  for (const profile of profiles) {
    const events = athleteEvents.filter(e => e.aa_athlete_id === profile.aa_athlete_id);
    
    if (events.length === 0 && profile.reliance_events) {
      addIssue({
        severity: "critical",
        category: "Missing Data",
        athleteId: profile.aa_athlete_id,
        athleteName: profile.reliance_name,
        description: "Athlete has events in reliance_events but none in athlete_events table",
        suggestedFix: "Run migration to populate athlete_events table"
      });
    }

    // Check main event flag
    const mainEvents = events.filter(e => e.is_main_event);
    
    if (events.length > 0 && mainEvents.length === 0) {
      addIssue({
        severity: "warning",
        category: "Data Quality",
        athleteId: profile.aa_athlete_id,
        athleteName: profile.reliance_name,
        description: "Athlete has events but no main event designated",
        suggestedFix: "Set one event as main event (is_main_event = true)"
      });
    }

    if (mainEvents.length > 1) {
      addIssue({
        severity: "warning",
        category: "Data Quality",
        athleteId: profile.aa_athlete_id,
        athleteName: profile.reliance_name,
        description: `Athlete has ${mainEvents.length} main events (should have exactly 1)`,
        suggestedFix: "Set only one event as main event"
      });
    }

    // Check consistency between reliance_events and athlete_events
    if (profile.reliance_events && events.length > 0) {
      const relianceEvents = profile.reliance_events
        .split(",")
        .map((e: string) => normalizeEventName(e.trim()))
        .filter((e: string) => e !== "");
      
      const tableEvents = events.map(e => normalizeEventName(e.event_name));
      
      // Check if counts match
      if (relianceEvents.length !== tableEvents.length) {
        addIssue({
          severity: "info",
          category: "Data Inconsistency",
          athleteId: profile.aa_athlete_id,
          athleteName: profile.reliance_name,
          description: `Event count mismatch: reliance_events has ${relianceEvents.length}, athlete_events has ${tableEvents.length}`,
          suggestedFix: "Verify and sync event data"
        });
      }
    }
  }
}

async function checkPersonalBests() {
  console.log("\n🔍 Checking personal bests...");
  
  const { data: profiles } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name");

  const { data: athleteEvents } = await supabase
    .from("athlete_events")
    .select("*");

  const { data: personalBests, error } = await supabase
    .from("wa_athlete_pbs")
    .select("*");

  if (error) {
    console.error("❌ Error fetching personal bests:", error);
    return;
  }

  console.log(`✅ Found ${personalBests?.length || 0} personal best records`);

  if (!profiles || !personalBests || !athleteEvents) return;

  for (const profile of profiles) {
    const pbs = personalBests.filter(pb => pb.aa_athlete_id === profile.aa_athlete_id);
    const events = athleteEvents.filter(e => e.aa_athlete_id === profile.aa_athlete_id);
    const mainEvent = events.find(e => e.is_main_event);

    if (events.length > 0 && pbs.length === 0) {
      addIssue({
        severity: "warning",
        category: "Missing Data",
        athleteId: profile.aa_athlete_id,
        athleteName: profile.reliance_name,
        description: "Athlete has registered events but no personal bests",
        suggestedFix: "Add personal best records"
      });
    }

    // Check if main event has a PB
    if (mainEvent && pbs.length > 0) {
      const hasMainEventPB = pbs.some(pb => 
        pb.discipline && normalizeEventName(pb.discipline) === normalizeEventName(mainEvent.event_name)
      );

      if (!hasMainEventPB) {
        addIssue({
          severity: "info",
          category: "Missing Data",
          athleteId: profile.aa_athlete_id,
          athleteName: profile.reliance_name,
          description: `No personal best found for main event: ${mainEvent.event_name}`,
          suggestedFix: "Add PB for main event"
        });
      }
    }

    // Check for invalid marks
    for (const pb of pbs) {
      if (!pb.mark || pb.mark.trim() === "") {
        addIssue({
          severity: "warning",
          category: "Data Quality",
          athleteId: profile.aa_athlete_id,
          athleteName: profile.reliance_name,
          description: `Personal best for ${pb.discipline} has empty mark`,
          suggestedFix: "Remove invalid PB or add valid mark"
        });
      }
    }

    // Check for duplicate PBs
    const pbDisciplines = pbs.map(pb => normalizeEventName(pb.discipline || ""));
    const uniqueDisciplines = new Set(pbDisciplines);
    if (uniqueDisciplines.size < pbDisciplines.length) {
      addIssue({
        severity: "info",
        category: "Data Quality",
        athleteId: profile.aa_athlete_id,
        athleteName: profile.reliance_name,
        description: "Duplicate personal best entries for same discipline",
        suggestedFix: "Keep only the best performance per discipline"
      });
    }
  }
}

async function checkSeasonBests() {
  console.log("\n🔍 Checking season bests...");
  
  const { data: seasonBests, error } = await supabase
    .from("wa_athlete_season_bests")
    .select("*");

  if (error) {
    console.error("❌ Error fetching season bests:", error);
    return;
  }

  console.log(`✅ Found ${seasonBests?.length || 0} season best records`);

  if (!seasonBests) return;

  const { data: profiles } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name");

  if (!profiles) return;

  for (const profile of profiles) {
    const sbs = seasonBests.filter(sb => sb.aa_athlete_id === profile.aa_athlete_id);
    
    for (const sb of sbs) {
      if (!sb.mark || sb.mark.trim() === "") {
        addIssue({
          severity: "warning",
          category: "Data Quality",
          athleteId: profile.aa_athlete_id,
          athleteName: profile.reliance_name,
          description: `Season best for ${sb.discipline} has empty mark`,
          suggestedFix: "Remove invalid SB or add valid mark"
        });
      }
    }
  }
}

async function checkAthleteIdMap() {
  console.log("\n🔍 Checking athlete ID mappings...");
  
  const { data: idMaps, error } = await supabase
    .from("wa_athlete_id_map")
    .select("*");

  if (error) {
    console.error("❌ Error fetching ID maps:", error);
    return;
  }

  console.log(`✅ Found ${idMaps?.length || 0} ID mapping records`);

  if (!idMaps) return;

  const { data: profiles } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name");

  if (!profiles) return;

  // Check for orphaned mappings
  for (const map of idMaps) {
    const profileExists = profiles.some(p => p.aa_athlete_id === map.aa_athlete_id);
    
    if (!profileExists) {
      addIssue({
        severity: "warning",
        category: "Data Inconsistency",
        athleteId: map.aa_athlete_id,
        athleteName: map.athlete_name,
        description: "ID mapping exists but no corresponding athlete profile",
        suggestedFix: "Remove orphaned mapping or create athlete profile"
      });
    }
  }

  // Check for athletes without mappings
  for (const profile of profiles) {
    const hasMapping = idMaps.some(m => m.aa_athlete_id === profile.aa_athlete_id);
    
    if (!hasMapping) {
      addIssue({
        severity: "info",
        category: "Missing Data",
        athleteId: profile.aa_athlete_id,
        athleteName: profile.reliance_name,
        description: "Athlete has no entry in wa_athlete_id_map",
        suggestedFix: "Consider if athlete needs result_athlete_id mapping"
      });
    }
  }
}

async function checkResults() {
  console.log("\n🔍 Checking RF athlete results...");
  
  const { data: results, error } = await supabase
    .from("wa_rf_athlete_results")
    .select("aa_athlete_id, athlete_name, COUNT(*)")
    .limit(1000);

  if (error) {
    console.error("❌ Error fetching results:", error);
    return;
  }

  console.log(`✅ Checked RF athlete results`);

  const { data: profiles } = await supabase
    .from("wa_athlete_profiles")
    .select("aa_athlete_id, reliance_name");

  if (!profiles) return;

  // Get unique athlete IDs from results
  const { data: resultAthletes } = await supabase
    .from("wa_rf_athlete_results")
    .select("aa_athlete_id")
    .limit(10000);

  if (resultAthletes) {
    const uniqueResultAthletes = new Set(resultAthletes.map(r => r.aa_athlete_id));
    
    for (const athleteId of uniqueResultAthletes) {
      const profileExists = profiles.some(p => p.aa_athlete_id === athleteId);
      
      if (!profileExists) {
        addIssue({
          severity: "info",
          category: "Data Inconsistency",
          athleteId: athleteId,
          description: "Results exist for athlete not in wa_athlete_profiles",
          suggestedFix: "Verify if this athlete should be in the 42 tracked athletes"
        });
      }
    }
  }
}

function generateReport() {
  console.log("\n📊 Generating report...");
  
  const critical = issues.filter(i => i.severity === "critical");
  const warnings = issues.filter(i => i.severity === "warning");
  const info = issues.filter(i => i.severity === "info");

  let report = `# DATA RECONCILIATION REPORT\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  report += `## Summary\n\n`;
  report += `- ❌ **Critical Issues:** ${critical.length}\n`;
  report += `- ⚠️  **Warnings:** ${warnings.length}\n`;
  report += `- ℹ️  **Info:** ${info.length}\n`;
  report += `- **Total Issues:** ${issues.length}\n\n`;

  // Group issues by athlete
  const issuesByAthlete = new Map<string, Issue[]>();
  
  for (const issue of issues) {
    const key = issue.athleteId || "GENERAL";
    if (!issuesByAthlete.has(key)) {
      issuesByAthlete.set(key, []);
    }
    issuesByAthlete.get(key)!.push(issue);
  }

  // Sort by number of issues (descending)
  const sortedAthletes = Array.from(issuesByAthlete.entries())
    .sort((a, b) => b[1].length - a[1].length);

  report += `## Issues by Athlete\n\n`;
  report += `**${sortedAthletes.length} athletes/areas with issues**\n\n`;

  for (const [athleteId, athleteIssues] of sortedAthletes) {
    const firstIssue = athleteIssues[0];
    const athleteName = firstIssue.athleteName || "Unknown";
    
    report += `### ${athleteName} (${athleteId})\n\n`;
    report += `**${athleteIssues.length} issue(s)**\n\n`;
    
    for (const issue of athleteIssues) {
      const icon = issue.severity === "critical" ? "❌" : issue.severity === "warning" ? "⚠️" : "ℹ️";
      report += `${icon} **[${issue.category}]** ${issue.description}\n`;
      if (issue.suggestedFix) {
        report += `   - *Suggested fix:* ${issue.suggestedFix}\n`;
      }
      report += `\n`;
    }
  }

  // Category breakdown
  report += `\n## Issues by Category\n\n`;
  const issuesByCategory = new Map<string, Issue[]>();
  
  for (const issue of issues) {
    if (!issuesByCategory.has(issue.category)) {
      issuesByCategory.set(issue.category, []);
    }
    issuesByCategory.get(issue.category)!.push(issue);
  }

  for (const [category, categoryIssues] of Array.from(issuesByCategory.entries()).sort((a, b) => b[1].length - a[1].length)) {
    report += `- **${category}:** ${categoryIssues.length}\n`;
  }

  report += `\n## Next Steps\n\n`;
  report += `1. Review critical issues first (marked with ❌)\n`;
  report += `2. Address warnings (marked with ⚠️)\n`;
  report += `3. Consider info items for data completeness (marked with ℹ️)\n`;
  report += `4. Create SQL scripts or manual updates to fix issues\n`;
  report += `5. Re-run reconciliation to verify fixes\n\n`;

  return report;
}

async function main() {
  console.log("=".repeat(60));
  console.log("🏃 DATA RECONCILIATION SCRIPT");
  console.log("=".repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);

  try {
    await checkAthleteProfiles();
    await checkAthleteEvents();
    await checkPersonalBests();
    await checkSeasonBests();
    await checkAthleteIdMap();
    await checkResults();

    const report = generateReport();
    
    // Write to file
    const reportPath = path.join(process.cwd(), "DATA_RECONCILIATION_REPORT.md");
    fs.writeFileSync(reportPath, report);
    
    console.log("\n" + "=".repeat(60));
    console.log("✅ RECONCILIATION COMPLETE");
    console.log("=".repeat(60));
    console.log(`📄 Report saved to: ${reportPath}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Critical: ${issues.filter(i => i.severity === "critical").length}`);
    console.log(`   - Warnings: ${issues.filter(i => i.severity === "warning").length}`);
    console.log(`   - Info: ${issues.filter(i => i.severity === "info").length}`);
    console.log(`   - Total: ${issues.length}`);
    console.log("=".repeat(60));
    
  } catch (error) {
    console.error("\n❌ Error during reconciliation:", error);
    process.exit(1);
  }
}

main();
