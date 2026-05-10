import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WARFAthleteResult } from "@/lib/types";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { classifyEvent } from "@/lib/eventUtils";

const YEAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function parseMarkToNumeric(mark: string, isTimeBased: boolean): number | null {
  if (!mark) return null;
  const clean = mark.replace(/[^0-9.:]/g, "");
  if (!clean) return null;
  if (isTimeBased) {
    const parts = clean.split(":");
    if (parts.length === 3) return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    if (parts.length === 2) return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    const v = parseFloat(parts[0]);
    return isNaN(v) ? null : v;
  }
  const v = parseFloat(clean);
  return isNaN(v) ? null : v;
}

function formatNumericAsMark(value: number, isTimeBased: boolean): string {
  if (!isTimeBased) return value.toFixed(2) + "m";
  if (value < 60) return value.toFixed(2);
  if (value < 3600) {
    const mins = Math.floor(value / 60);
    const secs = (value % 60).toFixed(2);
    return `${mins}:${secs.padStart(5, "0")}`;
  }
  const hours = Math.floor(value / 3600);
  const mins = Math.floor((value % 3600) / 60);
  const secs = (value % 60).toFixed(2);
  return `${hours}:${String(mins).padStart(2, "0")}:${secs.padStart(5, "0")}`;
}

interface Props {
  athleteName: string;
  results: WARFAthleteResult[];
  discipline: string;
}

export function AthleteTrendCard({ athleteName, results, discipline }: Props) {
  const eventClass = discipline ? classifyEvent(discipline) : null;
  const isTimeBased = eventClass?.direction === "lower_better";

  const resultsWithNumeric = useMemo(() => {
    const disciplineResults = results
      .filter(r => !r.not_legal && r.discipline === discipline && r.mark)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return disciplineResults
      .map(r => ({
        ...r,
        numericMark: parseMarkToNumeric(r.mark, isTimeBased),
        dateLabel: new Date(r.date).toLocaleDateString("en-GB", {
          day: "2-digit", month: "short", year: "2-digit",
        }),
      }))
      .filter(r => r.numericMark !== null) as (typeof disciplineResults[0] & {
        numericMark: number;
        dateLabel: string;
      })[];
  }, [results, discipline, isTimeBased]);

  // Chart 1: 2025 onwards only
  const trendData = useMemo(() =>
    resultsWithNumeric
      .filter(r => new Date(r.date).getFullYear() >= 2025)
      .map(r => ({ date: r.date, dateLabel: r.dateLabel, value: r.numericMark, mark: r.mark, competition: r.competition })),
    [resultsWithNumeric]
  );

  // Chart 2: year-on-year
  const { yearMap, years, allMMDDs } = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    resultsWithNumeric.forEach(r => {
      const d = new Date(r.date);
      const year = d.getFullYear().toString();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const mmdd = `${mm}-${dd}`;
      if (!map[year]) map[year] = {};
      const existing = map[year][mmdd];
      map[year][mmdd] = existing === undefined
        ? r.numericMark
        : isTimeBased ? Math.min(existing, r.numericMark) : Math.max(existing, r.numericMark);
    });
    const sortedYears = Object.keys(map).sort();
    const mmddSet = Array.from(new Set(Object.values(map).flatMap(m => Object.keys(m)))).sort();
    return { yearMap: map, years: sortedYears, allMMDDs: mmddSet };
  }, [resultsWithNumeric, isTimeBased]);

  const yoyData = useMemo(() =>
    allMMDDs.map(mmdd => {
      const [mmStr, ddStr] = mmdd.split("-");
      const dateLabel = new Date(2000, parseInt(mmStr) - 1, parseInt(ddStr)).toLocaleDateString(
        "en-GB", { day: "2-digit", month: "short" }
      );
      const point: Record<string, number | string> = { mmdd, dateLabel };
      years.forEach(year => {
        if (yearMap[year]?.[mmdd] !== undefined) point[year] = yearMap[year][mmdd];
      });
      return point;
    }),
    [allMMDDs, yearMap, years]
  );

  // Y-axis for Chart 1
  const trendMarks = trendData.map(r => r.value);
  const trendPad = trendMarks.length > 1 ? (Math.max(...trendMarks) - Math.min(...trendMarks)) * 0.15 || 0.5 : 0.5;
  const trendDomain: [number, number] = trendMarks.length
    ? [Math.max(0, Math.min(...trendMarks) - trendPad), Math.max(...trendMarks) + trendPad]
    : [0, 10];

  // Tight Y-axis for Chart 2 so year-to-year variation is visible
  const yoyAllMarks = yoyData.flatMap(d => years.map(y => d[y]).filter(v => v !== undefined)) as number[];
  const yoyPad = yoyAllMarks.length > 1 ? (Math.max(...yoyAllMarks) - Math.min(...yoyAllMarks)) * 0.15 || 0.3 : 0.3;
  const yoyDomain: [number, number] = yoyAllMarks.length
    ? [Math.max(0, Math.min(...yoyAllMarks) - yoyPad), Math.max(...yoyAllMarks) + yoyPad]
    : [0, 10];

  if (resultsWithNumeric.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{athleteName}</CardTitle>
        <CardDescription className="text-xs">{discipline} · {resultsWithNumeric.length} results</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Chart 1 */}
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Performance Over Time (2025–)</p>
          {trendData.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">No data from 2025 onwards</div>
          ) : (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={trendData} margin={{ top: 4, right: 8, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={48} interval="preserveStartEnd" />
                <YAxis
                  domain={trendDomain}
                  reversed={isTimeBased}
                  tickFormatter={(v) => formatNumericAsMark(v, isTimeBased)}
                  tick={{ fontSize: 9 }}
                  width={56}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
                        <p className="font-semibold">{d.dateLabel}</p>
                        <p>Mark: <strong>{d.mark}</strong></p>
                        <p className="text-muted-foreground">{d.competition}</p>
                      </div>
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#3b82f6", stroke: "white", strokeWidth: 1.5 }}
                  activeDot={{ r: 4 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Chart 2: Year-on-Year */}
        {years.length > 1 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Year-on-Year Comparison</p>
            <div className="flex flex-wrap gap-3 mb-1.5">
              {years.map((year, i) => (
                <span key={year} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-4 h-0.5 inline-block rounded" style={{ backgroundColor: YEAR_COLORS[i % YEAR_COLORS.length] }} />
                  {year}
                </span>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={yoyData} margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dateLabel" tick={{ fontSize: 9 }} angle={-30} textAnchor="end" height={48} interval="preserveStartEnd" />
                <YAxis
                  domain={yoyDomain}
                  reversed={isTimeBased}
                  tickFormatter={(v) => formatNumericAsMark(v, isTimeBased)}
                  tick={{ fontSize: 9 }}
                  width={56}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-card border border-border rounded-lg p-2 shadow-lg text-xs">
                        <p className="font-semibold">{d.dateLabel}</p>
                        {years.map(year =>
                          d[year] !== undefined ? (
                            <p key={year}>{year}: <strong>{formatNumericAsMark(d[year] as number, isTimeBased)}</strong></p>
                          ) : null
                        )}
                      </div>
                    );
                  }}
                />
                {years.map((year, i) => (
                  <Line
                    key={year}
                    type="monotone"
                    dataKey={year}
                    stroke={YEAR_COLORS[i % YEAR_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2.5, stroke: "white", strokeWidth: 1 }}
                    activeDot={{ r: 4 }}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        </div>
      </CardContent>
    </Card>
  );
}
