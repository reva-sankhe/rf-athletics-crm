import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface TableInfo {
  table_name: string;
  table_schema: string;
}

interface ColumnInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
}

interface ForeignKeyInfo {
  constraint_name: string;
  table_name: string;
  column_name: string;
  foreign_table_name: string;
  foreign_column_name: string;
}

async function inspectDatabase() {
  console.log('🔍 Inspecting Supabase Database Structure\n');
  console.log('=' .repeat(80));
  
  try {
    // Let's list all the tables we know about from the codebase
    const knownTables = [
      'players',
      'wa_athlete_profiles',
      'wa_athlete_honours',
      'wa_athlete_pbs',
      'wa_athlete_season_bests',
      'athlete_events',
      'wa_athlete_id_map',
      'wa_competitions',
      'wa_qualification_standards',
      'wa_rankings',
      'wa_results',
      'wa_rf_athlete_results',
      'wa_toplists'
    ];
    
    console.log('\n📋 DATABASE TABLES\n');
    console.log('=' .repeat(80));
    
    for (const tableName of knownTables) {
      try {
        // Query each table to get sample data and verify it exists
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (error) {
          console.log(`\n❌ ${tableName}: Not accessible or doesn't exist`);
          console.log(`   Error: ${error.message}`);
        } else {
          console.log(`\n✅ ${tableName}`);
          console.log(`   Records: ${count ?? 'Unknown'}`);
          
          // Get first record to inspect columns
          const { data: sampleData } = await supabase
            .from(tableName)
            .select('*')
            .limit(1)
            .single();
          
          if (sampleData) {
            const columns = Object.keys(sampleData);
            console.log(`   Columns (${columns.length}): ${columns.join(', ')}`);
          }
        }
      } catch (err) {
        console.log(`\n⚠️  ${tableName}: Error accessing table`);
      }
    }
    
    // Try to get detailed schema information for key tables
    console.log('\n\n🔗 TABLE RELATIONSHIPS\n');
    console.log('=' .repeat(80));
    
    console.log(`
Based on the migrations and code analysis:

1. athlete_events
   - Foreign Key: aa_athlete_id → wa_athlete_profiles(aa_athlete_id)
   - Purpose: Stores normalized athlete events with main event flag
   - Indexes: aa_athlete_id, event_name, is_main_event

2. wa_athlete_pbs (Personal Bests)
   - Links to: wa_athlete_profiles via aa_athlete_id
   - Purpose: Stores athlete personal best performances

3. wa_athlete_honours
   - Links to: wa_athlete_profiles via aa_athlete_id
   - Purpose: Stores athlete medals and achievements

4. wa_athlete_season_bests
   - Links to: wa_athlete_profiles via aa_athlete_id
   - Purpose: Stores current season best performances

5. wa_results
   - Links to: wa_competitions via competition_id
   - Links to: wa_athlete_profiles via wa_athlete_id
   - Purpose: Individual competition results

6. wa_rf_athlete_results
   - Links to: wa_athlete_profiles via aa_athlete_id
   - Links to: wa_competitions via competition_id
   - Purpose: Reliance Foundation athlete specific results

7. players
   - Internal table: Athlete roster management
   - Maps to: wa_athlete_profiles (via code/id matching)
    `);
    
    // Get row counts for all tables
    console.log('\n\n📊 TABLE STATISTICS\n');
    console.log('=' .repeat(80));
    console.log('Table Name'.padEnd(35) + 'Row Count'.padStart(15));
    console.log('-'.repeat(80));
    
    for (const tableName of knownTables) {
      try {
        const { count, error } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });
        
        if (!error) {
          console.log(tableName.padEnd(35) + (count?.toString() || '0').padStart(15));
        }
      } catch (err) {
        // Skip tables we can't access
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ Database inspection complete!\n');
    
  } catch (error: any) {
    console.error('❌ Error inspecting database:', error.message);
    process.exit(1);
  }
}

inspectDatabase();
