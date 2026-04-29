# Analytics Tab Overview

## Overview
The Analytics tab provides comprehensive performance intelligence for the Reliance Foundation (RF) squad with 7 specialized sub-tabs. It serves as the central hub for analyzing athlete performance, tracking qualification standards, benchmarking against global competition, and identifying medal prospects.

---

## 1. RF Squad Tab

### Purpose
Provides a complete overview of all RF athletes with performance metrics, tier classification, and trend analysis.

### Data Sources
- **Tables:**
  - `wa_athlete_profiles` - Athlete demographic and event information
  - `wa_rf_athlete_results` - Competition results for RF athletes

### Key Metrics

#### KPI Cards (4 metrics)
1. **Total Athletes**
   - Count of all RF athletes
   - Breakdown: Men vs Women
   - Source: `fetchWAAthleteProfiles()`

2. **Average Score**
   - Calculation: Mean of best WA scores per athlete
   - Separate for Men and Women
   - Formula: `sum(bestScore) / count(athletes)` per gender

3. **High Performers**
   - Count of athletes with best score ≥ 1000
   - Indicates elite/strong performance level
   - Filter: `bestScore >= 1000`

4. **Improving Athletes**
   - Tracks athletes with upward performance trend
   - Calculation: Compare recent 3 results vs previous 3 results
   - Trend = "up" if `avgRecent - avgOlder > 15 points`

### Calculations

#### Performance Tiers
Athletes classified into 4 tiers based on best WA score:
- **Elite:** ≥ 1100 points (Green)
- **Strong:** ≥ 1000 points (Blue)
- **Developing:** ≥ 900 points (Amber)
- **Emerging:** < 900 points (Gray)

#### Trend Analysis
For each athlete:
```
recent3 = last 3 competition results
older3 = results 4-6 (previous 3)
avgRecent = mean(recent3 scores)
avgOlder = mean(older3 scores)

if avgRecent - avgOlder > 15: trend = "up"
else if avgRecent - avgOlder < -15: trend = "down"
else: trend = "stable"
```

### Visualizations
1. **Squad Performance Curve**: Line chart showing all RF athletes ranked by best score
2. **All RF Athletes Table**: Comprehensive roster with rank, demographics, events, scores, trends, and tier classification

---

## 2. Global Standings Tab

### Purpose
Benchmark RF athletes against global competition by comparing their positions and scores in world rankings for specific events.

### Data Sources
- **Tables:**
  - `wa_toplists` - Global rankings by event and gender (top 50-200 athletes)
  - `wa_athlete_profiles` - RF athlete identification

### Key Metrics

#### KPI Cards (3 metrics)
1. **Best RF Position**
   - Highest global ranking position achieved by any RF athlete
   - Shows athlete name and mark
   - Calculation: Find minimum position among RF athletes in top 25

2. **RF Athletes in View**
   - Count of RF athletes appearing in top 25 rankings
   - Out of total athletes shown (25)

3. **Score Gap to Leader**
   - Point difference between best RF athlete and world #1
   - Formula: `leaderScore - bestRFScore`
   - Indicates competitiveness at elite level

### Calculations

#### Event Selection & Filtering
- Available events: 35+ events (Men's, Women's, Mixed Relays)
- Region filters: All Regions, Asia, India Only
- Data fetched per event/gender combination

#### Sorting Options
Users can toggle between:
- **Score Sort**: By WA score (descending) - default
- **Mark Sort**: By performance mark (ascending for time, descending for distance/height)

### Visualizations
1. **Score Standings Chart**: Line chart showing top 25 athletes by score, RF athletes highlighted with larger blue dots
2. **Full Rankings Table**: Detailed table with position, athlete, country, mark, score, region (sortable by mark or score)

---

## 3. Qualification Tracker Tab

### Purpose
Monitor RF athlete progress toward qualification standards for major competitions (Asian Games & Commonwealth Games).

### Data Sources
- **Tables:**
  - `wa_qualification_standards` - Official qualification standards for AG and CWG
  - `wa_rf_athlete_results` - Athlete competition results
  - `wa_athlete_profiles` - Athlete information

### Key Metrics

#### KPI Cards (4 metrics)
1. **Qualified AG (Asian Games)**
   - Count of unique athletes who have met AG standards
   - Athlete qualified if gap < 0% for any event

2. **Qualified CWG (Commonwealth Games)**
   - Count of unique athletes who have met CWG standards
   - Athlete qualified if gap < 0% for any event

3. **Close (<2%)**
   - Count of athlete-event combinations within 2% of standard
   - Critical monitoring group for training focus

4. **In Progress**
   - Athlete-event combinations with gap ≥ 2%
   - Still developing toward standard

### Calculations

#### Gap to Standard Calculation
```javascript
// For time-based events (lower is better):
gap% = (athleteMark - standardMark) / standardMark × 100

// For distance/height events (higher is better):
gap% = (standardMark - athleteMark) / standardMark × 100

// Negative gap = already qualified (athlete has exceeded standard)
// Positive gap = still needs improvement
```

#### Status Classification
For each athlete-event combination:
- **Both**: Qualified for both AG and CWG
- **Qualified AG**: Met AG standard only
- **Qualified CWG**: Met CWG standard only
- **Close**: Within 2% of either standard
- **In Progress**: More than 2% away from standards

### Event Coverage
21 Olympic events tracked across 7 groups:
- Track (7 events)
- Hurdles/Steeplechase (4 events)
- Road (2 events)
- Relays (3 events)
- Jumps (4 events)
- Throws (4 events)
- Combined (2 events)

### Visualizations
1. **Gap to Standard Chart**: Line chart showing percentage gap (AG and CWG) for selected event
2. **Complete Qualification Table**: All athlete-event combinations with best marks, standards, gaps, and status

---

## 4. Medal Intelligence Tab

### Purpose
Analyze historical medal-winning patterns and assess current RF athlete prospects for medals at major championships.

### Data Sources
- **Tables:**
  - `wa_athlete_honours` - Historical medal wins by RF athletes
  - `wa_athlete_profiles` - Athlete demographics and birth dates
  - `wa_rf_athlete_results` - Current performance data

### Key Metrics

#### KPI Cards (3 metrics)
1. **Total Medals**
   - Historical medal count for RF athletes
   - Breakdown: Gold medal count
   - Filtered by selected competition and event

2. **Medalists**
   - Unique RF athletes who have won medals
   - Shows diversity of medal winners

3. **Current Prospects**
   - RF athletes within 2% of most recent bronze winning mark
   - Identifies medal-ready athletes

### Calculations

#### Gap to Bronze Calculation
```javascript
// Athlete compared to most recent bronze medal mark
athleteMark = athlete's best mark in event
bronzeMark = most recent bronze medal winning mark

// For time events:
gap% = (athleteMark - bronzeMark) / bronzeMark × 100

// For field events:
gap% = (bronzeMark - athleteMark) / bronzeMark × 100

// Negative = athlete already at medal level
```

#### Age at Medal
```javascript
age = floor((eventDate - birthDate) / 365.25 years)
```

#### Medal Age Window
- Athlete is "In Window" if their current age appears in the histogram of historical medal-winning ages
- Based on actual ages when RF athletes won medals in that event

### Visualizations
1. **Age at Time of Medal**: Histogram showing distribution of RF athlete ages when they won medals (ages 15-40)
2. **Historical Winning Marks**: Line chart showing gold/silver/bronze marks over years
3. **RF Prospects Table**: Current athletes compared to bronze standard with age window status
4. **Medal History Log**: Complete list of historical RF medals with athlete, competition, discipline, medal color, mark, and year

---

## 5. Scouting Radar Tab

### Purpose
Identify high-performing Indian athletes not currently in the RF squad as potential recruitment targets.

### Data Sources
- **Tables:**
  - `wa_toplists` - Global rankings (fetches top 200 for comprehensive coverage)
  - `wa_athlete_profiles` - RF athlete roster for exclusion

### Key Metrics

#### KPI Cards (3 metrics)
1. **Scout Candidates**
   - Count of Indian athletes not in RF squad
   - Filtered by minimum score threshold (if set)
   - Filter: `nationality === "IND" AND !isRFAthlete`

2. **Top Scout Score**
   - Highest WA score among scout candidates
   - Shows athlete name
   - Indicates best available talent outside RF

3. **RF Best Score**
   - Best RF athlete score in selected event
   - Benchmark for comparison
   - Shows RF athlete name

### Calculations

#### Scout Identification
```javascript
scouts = toplists.filter(athlete => 
  athlete.nationality === "IND" &&
  !rfAthletes.includes(athlete.name) &&
  athlete.score >= minScoreThreshold
)
```

#### Gap to RF Best
```javascript
gapToRFBest = rfBestScore - scoutScore
// Positive gap = scout is below RF best
// Negative gap = scout exceeds RF best (priority recruit)
```

### Features
- **Minimum Score Filter**: Users can set threshold (e.g., 900) to filter candidates
- **Event Selection**: Focus scouting on specific events
- **Top 5 Prospects**: Highlighted cards showing highest-scoring candidates

### Visualizations
1. **Top 5 Scout Prospects**: Card grid showing name, region, mark, score, gap to RF best
2. **Scout Performance Curve**: Line chart of scout candidates ranked by score (with RF best reference line)
3. **Full Scouting List**: Table with global rank, athlete, mark, score, gap to RF best, region, venue

---

## 6. Performance Trends Tab

### Purpose
Individual athlete performance tracking over time with season-by-season comparison and trend analysis.

### Data Sources
- **Tables:**
  - `wa_athlete_profiles` - Athlete selection
  - `wa_rf_athlete_results` - Complete competition history (up to 1000 results)

### Key Metrics

#### KPI Cards (4 metrics per athlete)
1. **Best Score**
   - All-time highest WA score
   - Calculation: `max(allScores)`

2. **Average Score**
   - Career average WA score
   - Calculation: `mean(allScores)`

3. **Results (12mo)**
   - Competition count in last 12 months
   - Indicates current activity level
   - Filter: `date > today - 365 days`

4. **Current Trend**
   - Visual indicator: ↑ Up, ↓ Down, — Stable
   - Calculation: Same as RF Squad tab (recent 3 vs previous 3)

### Calculations

#### Monthly Score Aggregation
```javascript
// Group results by year-month
for each result:
  period = "YYYY-MM"
  monthlyScores[period].push(result.score)

// Calculate monthly average
trendData[period] = mean(monthlyScores[period])
```

#### Year-on-Year Comparison
```javascript
// Group by year and month separately
for each result:
  year = result.year
  month = result.month (0-11)
  yearMonthMap[year][month].push(result.score)

// Create 12-month comparison across years
for month in Jan-Dec:
  for each year:
    yoyData[month][year] = mean(scores for that year-month)
```

### Visualizations
1. **Score Over Time**: Line chart showing monthly average scores chronologically
2. **Year-on-Year Comparison**: Multi-line chart comparing same months across different years (up to 5 years, color-coded)
3. **Competition History**: Table showing last 50 results with date, competition, discipline, mark, score, place

---

## 7. Finals Benchmark Tab

### Purpose
Analyze championship finals performance standards by examining historical final results to determine what it takes to make the final and win medals.

### Data Sources
- **Tables:**
  - `wa_results` - Historical championship results (finals, semifinals, heats)
  - `wa_competitions` - Competition metadata for filtering
  - `wa_athlete_profiles` - RF athlete information
  - `wa_rf_athlete_results` - Current RF athlete performances

### Key Metrics

#### KPI Cards (4 metrics)
1. **Finals Spread**
   - Average percentage gap between gold winner and 8th place finisher
   - Calculation: `mean(|goldMark - 8thMark| / goldMark × 100)` across all years
   - Indicates competitiveness of finals

2. **Finals Entry**
   - Most recent 8th place (slowest/shortest) qualifying mark
   - Benchmark: "What mark do you need to make the final?"
   - Shows year of most recent championship

3. **Typical Age**
   - Median age of all finalists across history
   - Helps identify optimal performance window
   - Calculation: `median(allFinalistAges)`

4. **RF in Range**
   - Count of RF athletes within 2% of finals entry mark
   - Shows current finals-ready athletes

### Calculations

#### Finals Reconstruction Algorithm
```javascript
// Challenge: Data includes heats, semis, and finals mixed together
// Solution: Best-mark-per-place heuristic

for each competition:
  for place 1-8:
    find athlete at this place with best mark across all rounds
    // Finalists always have better marks than heat runners at same place
    bestPerPlace[place] = athlete with best mark

  goldMark = bestPerPlace[1].mark
  finalsEntryMark = bestPerPlace[8].mark
  spread% = |goldMark - finalsEntryMark| / goldMark × 100
```

#### RF Athlete Gap Calculations
```javascript
// Gap to Finals Entry (8th place)
gapToEntry% = (athleteMark - finalsEntryMark) / finalsEntryMark × 100

// Gap to Gold (1st place)
gapToGold% = (athleteMark - goldMark) / goldMark × 100

// Negative = athlete already at that level
// Positive = improvement needed
```

#### Age Range Status
```javascript
inAgeRange = |athleteAge - medianFinalistAge| <= 4 years
```

### Competition Filters
- **All Major**: World Championships + Asian Games + Commonwealth Games
- **Asian Games**: Asian Games only
- **Commonwealth Games**: Commonwealth Games only
- **World Championships**: World Championships only

### Visualizations
1. **Gold vs Finals Entry Mark**: Line chart showing gold and 8th place marks over years, with RF athlete best marks as reference lines
2. **Age Profile of Finalists**: Stacked bar chart (medalists in amber, other finalists in slate) with RF athlete age reference lines
3. **RF Athletes vs Finals Benchmarks**: Table showing each RF athlete's gap to finals entry and gold, plus age status

---

## Technical Architecture

### Data Flow
1. **Supabase Tables** → 2. **Query Functions** (`src/lib/queries.ts`) → 3. **Tab Components** → 4. **Visualizations** (Recharts)

### Common Utilities

#### Event Normalization (`src/lib/eventUtils.ts`)
- `normalizeEventName()`: Standardizes event names across different data sources
- `classifyEvent()`: Determines if event is time-based (lower_better) or distance/height-based (higher_better)
- Used for consistent matching across tables

#### WA Score System
- World Athletics scoring system (0-1400+ points)
- Normalizes performances across different events
- Higher scores = better performances (universal metric)

### Performance Optimizations
- Batch queries: Multiple `Promise.all()` calls to fetch data in parallel
- Result limits: Most queries limited to prevent over-fetching (100-1000 records)
- Client-side filtering: Heavy computation done in browser after initial fetch
- Caching: React state management prevents unnecessary re-fetches

---

## Key Insights Enabled

### For Coaches & Performance Directors
1. **Squad Health**: Quick overview of athlete distribution across performance tiers
2. **Qualification Status**: Track progress toward major competition standards
3. **Benchmarking**: Compare RF athletes to global and regional competition
4. **Trend Monitoring**: Identify improving/declining athletes early

### For Talent Scouts
1. **Recruitment Targets**: Identify high-performing Indian athletes outside RF
2. **Gap Analysis**: Quantify how close scouts are to current RF standards

### For Strategic Planning
1. **Medal Prospects**: Data-driven medal chance assessment
2. **Age Analysis**: Understand optimal performance windows
3. **Finals Readiness**: Know exact marks needed for finals/medals
4. **Historical Context**: Learn from past RF successes

---

## Data Quality Considerations

### Event Name Normalization
- Multiple event name formats exist across WA tables (e.g., "100m", "Men's 100m", "100 Metres")
- System uses `normalizeEventName()` for consistent matching
- Critical for accurate cross-table analysis

### Score Filtering
- `not_legal` field filters out wind-assisted or otherwise ineligible performances
- Ensures only legal marks count toward qualification tracking

### Time Period Coverage
- Results typically cover current season + historical data
- Finals data: Multiple championship cycles (varies by competition)
- Medal history: Complete RF athlete honour roll

---

## Future Enhancement Opportunities

1. **Real-time Updates**: Auto-refresh during major competitions
2. **Predictive Modeling**: ML-based performance projections
3. **Comparative Analytics**: Direct athlete-to-athlete comparison tool
4. **Export Capabilities**: PDF reports for coach review
5. **Mobile Optimization**: Touch-friendly charts for tablet use
6. **Alert System**: Notifications when athletes hit qualification standards

---

*Document Version: 1.0*  
*Last Updated: April 29, 2026*  
*System: RF Athletics CRM - Analytics Module*
