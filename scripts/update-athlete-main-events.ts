import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AthleteUpdate {
  name: string;
  newMainEvent: string;
  newRelianceEvents?: string;
}

// Athletes to update based on feedback
const athleteUpdates: AthleteUpdate[] = [
  {
    name: "Amlan Borgohain",
    newMainEvent: "Men's 200m",
  },
  {
    name: "Animesh Kujur",
    newMainEvent: "Men's 200m",
  },
  {
    name: "Sawan Barwal",
    newMainEvent: "Men's Marathon",
    newRelianceEvents: "Men's 5000m, Men's 10000m, Men's Marathon",
  },
  {
    name: "Lili Das",
    newMainEvent: "Women's 800m",
  },
  {
    name: "Dondapati Mrutyam Jayaram",
    newMainEvent: "Men's 100m",
  },
  {
    name: "Moumita Mondal",
    newMainEvent: "Women's 100m Hurdles",
  },
  {
    name: "Sakshi Chavan",
    newMainEvent: "Women's 100m",
  },
  {
    name: "Seema",
    newMainEvent: "Women's 5000m",
  },
];

async function updateAthleteMainEvents() {
  console.log("🔄 Starting athlete data updates...\n");

  for (const update of athleteUpdates) {
    console.log(`\n📝 Updating: ${update.name}`);
    console.log(`   New Main Event: ${update.newMainEvent}`);
    if (update.newRelianceEvents) {
      console.log(`   New Reliance Events: ${update.newRelianceEvents}`);
    }

    // Step 1: Get the athlete's ID
    const { data: athlete, error: athleteError } = await supabase
      .from("wa_athlete_profiles")
      .select("aa_athlete_id, reliance_name")
      .eq("reliance_name", update.name)
      .single();

    if (athleteError || !athlete) {
      console.error(`   ❌ Error finding athlete: ${athleteError?.message}`);
      continue;
    }

    const athleteId = athlete.aa_athlete_id;
    console.log(`   ✅ Found athlete ID: ${athleteId}`);

    // Step 2: Update reliance_events in wa_athlete_profiles if needed
    if (update.newRelianceEvents) {
      const { error: profileError } = await supabase
        .from("wa_athlete_profiles")
        .update({ reliance_events: update.newRelianceEvents })
        .eq("aa_athlete_id", athleteId);

      if (profileError) {
        console.error(`   ❌ Error updating profile: ${profileError.message}`);
        continue;
      }
      console.log(`   ✅ Updated reliance_events in profile`);
    }

    // Step 3: Get all events for this athlete
    const { data: allEvents, error: eventsError } = await supabase
      .from("athlete_events")
      .select("id, event_name, is_main_event")
      .eq("aa_athlete_id", athleteId);

    if (eventsError || !allEvents) {
      console.error(`   ❌ Error fetching events: ${eventsError?.message}`);
      continue;
    }

    console.log(`   Found ${allEvents.length} events for athlete`);

    // Step 4: Set all events to is_main_event = false
    for (const event of allEvents) {
      const { error: updateError } = await supabase
        .from("athlete_events")
        .update({ is_main_event: false })
        .eq("id", event.id);

      if (updateError) {
        console.error(`   ❌ Error updating event ${event.event_name}: ${updateError.message}`);
      }
    }

    // Step 5: Set the new main event to is_main_event = true
    const mainEventRecord = allEvents.find(e => e.event_name === update.newMainEvent);

    if (mainEventRecord) {
      const { error: mainEventError } = await supabase
        .from("athlete_events")
        .update({ is_main_event: true })
        .eq("id", mainEventRecord.id);

      if (mainEventError) {
        console.error(`   ❌ Error setting main event: ${mainEventError.message}`);
      } else {
        console.log(`   ✅ Set ${update.newMainEvent} as main event`);
      }
    } else {
      // Need to create the event if it doesn't exist
      const { error: insertError } = await supabase
        .from("athlete_events")
        .insert({
          aa_athlete_id: athleteId,
          event_name: update.newMainEvent,
          is_main_event: true,
        });

      if (insertError) {
        console.error(`   ❌ Error creating main event: ${insertError.message}`);
      } else {
        console.log(`   ✅ Created and set ${update.newMainEvent} as main event`);
      }
    }

    console.log(`   ✅ Successfully updated ${update.name}`);
  }

  console.log("\n\n✅ All updates completed!");
  console.log("\n📊 Verifying updates...\n");

  // Verify the updates
  for (const update of athleteUpdates) {
    const { data: athlete } = await supabase
      .from("wa_athlete_profiles")
      .select("aa_athlete_id, reliance_name, reliance_events")
      .eq("reliance_name", update.name)
      .single();

    if (!athlete) continue;

    const { data: mainEvent } = await supabase
      .from("athlete_events")
      .select("event_name")
      .eq("aa_athlete_id", athlete.aa_athlete_id)
      .eq("is_main_event", true)
      .single();

    console.log(`✓ ${update.name}:`);
    console.log(`  All Events: ${athlete.reliance_events}`);
    console.log(`  Main Event: ${mainEvent?.event_name || "N/A"}`);
  }
}

// Run the script
updateAthleteMainEvents()
  .then(() => {
    console.log("\n✅ Script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
