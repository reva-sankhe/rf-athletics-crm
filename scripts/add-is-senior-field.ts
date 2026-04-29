/**
 * Script to add is_senior field to wa_athlete_profiles
 * This migration adds a boolean field to filter junior athletes from the dashboard
 * 
 * Usage: npx tsx scripts/add-is-senior-field.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🚀 Adding is_senior field to wa_athlete_profiles...\n');

  try {
    // Check if column already exists
    const { data: existingColumns, error: checkError } = await supabase
      .from('wa_athlete_profiles')
      .select('is_senior')
      .limit(1);

    if (!checkError) {
      console.log('✓ Column is_senior already exists');
    } else {
      console.log('⚠️  Column does not exist yet. Please run the migration SQL manually.');
      console.log('\nSQL to execute:');
      console.log('----------------------------------------');
      console.log(`
ALTER TABLE wa_athlete_profiles 
ADD COLUMN is_senior BOOLEAN DEFAULT true;

UPDATE wa_athlete_profiles 
SET is_senior = true;

UPDATE wa_athlete_profiles 
SET is_senior = false 
WHERE aa_athlete_id = '15190370';

COMMENT ON COLUMN wa_athlete_profiles.is_senior IS 
  'Indicates if athlete should be displayed on dashboard. false = Junior (hidden), true = Senior (visible). Can be manually updated as athletes transition from junior to senior status.';
      `);
      console.log('----------------------------------------\n');
      console.log('Please run this SQL in the Supabase SQL Editor:');
      if (supabaseUrl) {
        console.log(`${supabaseUrl.replace('.supabase.co', '.supabase.co/project/_/sql')}`);
      }
      return;
    }

    // Set all athletes to senior
    console.log('Setting all athletes to senior...');
    const { error: updateError } = await supabase
      .from('wa_athlete_profiles')
      .update({ is_senior: true })
      .neq('aa_athlete_id', '15190370');

    if (updateError) throw updateError;
    console.log('✓ All athletes set to senior');

    // Set Rishabh Giri to junior
    console.log('Setting Rishabh Giri as junior...');
    const { error: juniorError } = await supabase
      .from('wa_athlete_profiles')
      .update({ is_senior: false })
      .eq('aa_athlete_id', '15190370');

    if (juniorError) throw juniorError;
    console.log('✓ Rishabh Giri set as junior (will not appear on dashboard)');

    // Verify the changes
    console.log('\n📊 Verification:');
    const { data: seniors, error: seniorError } = await supabase
      .from('wa_athlete_profiles')
      .select('reliance_name, is_senior')
      .eq('is_senior', true);

    if (seniorError) throw seniorError;
    console.log(`✓ ${seniors?.length || 0} senior athletes (visible on dashboard)`);

    const { data: juniors, error: juniorQueryError } = await supabase
      .from('wa_athlete_profiles')
      .select('reliance_name, is_senior')
      .eq('is_senior', false);

    if (juniorQueryError) throw juniorQueryError;
    console.log(`✓ ${juniors?.length || 0} junior athletes (hidden from dashboard):`);
    juniors?.forEach(j => console.log(`  - ${j.reliance_name}`));

    console.log('\n✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main();
