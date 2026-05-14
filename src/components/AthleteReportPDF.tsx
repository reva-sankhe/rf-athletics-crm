import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type {
  WAAthleteProfile,
  WAAthletePersonalBest,
  WAAthleteHonour,
  WARanking,
  WARFAthleteResult,
  WAToplist,
} from "@/lib/types";

// ── Design Language ───────────────────────────────────────────────────────────
// Premium Olympic / sports-foundation aesthetic.
// Muted institutional greens, warm restrained golds,
// low-saturation support colours. Analytical, not flashy.
const C = {
  // Core greens
  primaryGreen:   "#234B3A",   // main header background
  darkGreen:      "#1C3B2E",   // deeper – highlight cards
  midGreen:       "#3D6352",   // confidential / sub-header band
  sage:           "#DCE8DF",   // secondary sage backgrounds / underlines
  lightSage:      "#EEF3EC",   // very light sage background
  sageText:       "#5A6B56",   // muted body text on light backgrounds
  mutedSage:      "#8A9B85",   // lighter muted sage

  // Gold
  gold:           "#D4A62A",   // achievement gold – big numbers, sport label
  softGoldBg:     "#F5E7B2",   // soft gold background (notes / warnings)

  // White / body
  white:          "#FFFFFF",
  bodyText:       "#1A2417",   // very dark green-tinted black
  border:         "#D1DDD0",   // soft sage border
  rowAlt:         "#F4F7F4",   // very light sage row alternate

  // Gap Analysis — olive analytical palette
  gapHd:          "#6A7B5B",   // gap table header bg
  gapHdTxt:       "#FFFFFF",   // gap table header text
  gapAlt:         "#E6ECE5",   // alternating row bg
  gapRisk:        "#EFE3B8",   // risk highlight

  // Support Plan — calm therapeutic greens
  spHd:           "#B7C9B0",   // support plan header bg
  spHdTxt:        "#234B3A",   // support plan header text
  spNotesBg:      "#EEF3EC",   // notes background
  spBorder:       "#B8C7B2",   // support plan borders
};

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 8,
    color: C.bodyText,
    backgroundColor: C.white,
    paddingBottom: 18,
  },

  // ── Header band ──────────────────────────────────────────────────────────
  headerBand: {
    backgroundColor: C.primaryGreen,
    paddingHorizontal: 22,
    paddingTop: 14,
    paddingBottom: 12,
  },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  athleteName: {
    fontSize: 20, fontFamily: "Helvetica-Bold", color: C.white, letterSpacing: 0.3,
  },
  sportLabel: {
    fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.gold,
    letterSpacing: 1.5, marginTop: 2, textTransform: "uppercase",
  },
  eventsLabel: { fontSize: 7.5, color: "#B8CCBF", marginTop: 2 },
  headerRightLabel: { fontSize: 6.5, color: C.mutedSage, textAlign: "right" },
  metaRow: { flexDirection: "row", marginTop: 8 },
  metaPill: {
    backgroundColor: "#1C3B2E", borderRadius: 3,
    paddingHorizontal: 8, paddingVertical: 3, marginRight: 6, alignItems: "center",
  },
  metaPillLbl: { fontSize: 5.5, color: C.mutedSage, letterSpacing: 0.8, textTransform: "uppercase" },
  metaPillVal: { fontSize: 9, fontFamily: "Helvetica-Bold", color: C.white, marginTop: 1 },

  // ── Confidential bar ─────────────────────────────────────────────────────
  confBar: {
    backgroundColor: C.midGreen,
    paddingHorizontal: 22, paddingVertical: 4,
    flexDirection: "row", justifyContent: "space-between",
  },
  confTxt: { fontSize: 6, color: C.sage, letterSpacing: 0.3 },

  // ── Body ─────────────────────────────────────────────────────────────────
  body: { paddingHorizontal: 22, paddingTop: 10 },

  // ── Section heading ───────────────────────────────────────────────────────
  secHd: {
    fontSize: 7, fontFamily: "Helvetica-Bold", color: C.primaryGreen,
    letterSpacing: 1.5, textTransform: "uppercase",
    marginBottom: 5, borderBottomWidth: 1, borderBottomColor: C.sage, paddingBottom: 2,
  },

  // ── Support Team ─────────────────────────────────────────────────────────
  supportGrid: {
    flexDirection: "row", borderWidth: 1, borderColor: C.border, borderRadius: 3, marginBottom: 8,
  },
  supCell: {
    flex: 1, paddingHorizontal: 7, paddingVertical: 5,
    borderRightWidth: 1, borderRightColor: C.border,
  },
  supCellLast: { flex: 1, paddingHorizontal: 7, paddingVertical: 5 },
  supLbl: { fontSize: 5.5, color: C.sageText, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  supVal: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.bodyText },

  // ── Highlight cards ───────────────────────────────────────────────────────
  hlRow: { flexDirection: "row", marginBottom: 8 },
  hlCard: {
    flex: 1, backgroundColor: C.darkGreen,
    borderRadius: 4, padding: 9, marginRight: 8,
  },
  hlCardLast: {
    flex: 1, backgroundColor: C.darkGreen, borderRadius: 4, padding: 9,
  },
  hlLbl: { fontSize: 5.5, color: C.mutedSage, letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 3 },
  hlNum: { fontSize: 20, fontFamily: "Helvetica-Bold", color: C.gold, lineHeight: 1 },
  hlSub: { fontSize: 6.5, color: "#B8CCBF", marginTop: 2 },
  hlNote: { fontSize: 6, color: C.mutedSage, marginTop: 1 },

  // ── Key Achievements table ────────────────────────────────────────────────
  achTable: { borderWidth: 1, borderColor: C.border, borderRadius: 3, marginBottom: 8 },
  achHdRow: {
    flexDirection: "row", backgroundColor: C.primaryGreen,
    paddingVertical: 4, paddingHorizontal: 7,
  },
  achHdCell: {
    fontSize: 6, fontFamily: "Helvetica-Bold", color: C.sage,
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  achRow: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  achRowAlt: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.lightSage,
  },
  achDate: { width: 46, fontSize: 6.5, fontFamily: "Helvetica-Bold", color: C.sageText },
  achText: { flex: 1, fontSize: 7, color: C.bodyText, lineHeight: 1.35 },

  // ── Two-column section ────────────────────────────────────────────────────
  twoCol: { flexDirection: "row", marginBottom: 8 },
  colLeft: { flex: 1, marginRight: 8 },
  colRight: { flex: 1 },

  // ── Rankings ─────────────────────────────────────────────────────────────
  rankRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rankBadge: {
    backgroundColor: C.primaryGreen, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2, marginRight: 6, minWidth: 24, alignItems: "center",
  },
  rankBadgeTxt: { fontSize: 8, fontFamily: "Helvetica-Bold", color: C.gold },
  rankEvent: { flex: 1, fontSize: 6.5, color: C.bodyText, lineHeight: 1.3 },
  rankDate: { fontSize: 6, color: C.sageText },

  // ── Performances ─────────────────────────────────────────────────────────
  perfRow: {
    flexDirection: "row", alignItems: "flex-start",
    paddingVertical: 3.5, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  perfMark: { width: 60, fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.bodyText },
  perfDetail: { flex: 1 },
  perfEvent: { fontSize: 6.5, color: C.bodyText, lineHeight: 1.3 },
  perfMeta: { fontSize: 5.5, color: C.sageText, marginTop: 0.5 },

  // ── 2026 Targets ──────────────────────────────────────────────────────────
  targTable: { borderWidth: 1, borderColor: C.border, borderRadius: 3, marginBottom: 8 },
  targHdRow: {
    flexDirection: "row", backgroundColor: C.primaryGreen,
    paddingVertical: 4, paddingHorizontal: 7,
  },
  targHdCell: {
    fontSize: 6, fontFamily: "Helvetica-Bold", color: C.sage,
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  targRow: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  targRowAlt: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7,
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.lightSage,
  },
  targCell: { fontSize: 7, color: C.bodyText },
  targMuted: { fontSize: 6.5, color: C.sageText },

  // ── Competitors ───────────────────────────────────────────────────────────
  compRow: { flexDirection: "row", marginBottom: 8 },
  compCard: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4,
    padding: 7, marginRight: 6, backgroundColor: C.lightSage,
  },
  compCardLast: {
    flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 4,
    padding: 7, backgroundColor: C.lightSage,
  },
  compRankBadge: {
    backgroundColor: C.primaryGreen, borderRadius: 3,
    paddingHorizontal: 5, paddingVertical: 2, alignSelf: "flex-start", marginBottom: 3,
  },
  compRankTxt: { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.gold },
  compName: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: C.bodyText, marginBottom: 2 },
  compMeta: { fontSize: 6, color: C.sageText, lineHeight: 1.4 },

  // ── Gap Analysis — olive analytical palette ───────────────────────────────
  gapTable: { borderWidth: 1, borderColor: "#C4CC9C", borderRadius: 3, marginBottom: 8 },
  gapHdRow: {
    flexDirection: "row", backgroundColor: C.gapHd,
    paddingVertical: 4, paddingHorizontal: 7,
  },
  gapHdCell: {
    fontSize: 6, fontFamily: "Helvetica-Bold", color: C.gapHdTxt,
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  gapRow: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7,
    borderTopWidth: 1, borderTopColor: "#C4CC9C",
  },
  gapRowAlt: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7,
    borderTopWidth: 1, borderTopColor: "#C4CC9C", backgroundColor: C.gapAlt,
  },
  gapCell: { fontSize: 6.5, color: C.bodyText, lineHeight: 1.35 },
  gapMuted: { fontSize: 6, color: C.sageText, lineHeight: 1.35 },

  // ── Support Plan — calm therapeutic greens ────────────────────────────────
  spTable: { borderWidth: 1, borderColor: C.spBorder, borderRadius: 3, marginBottom: 8 },
  spHdRow: {
    flexDirection: "row", backgroundColor: C.spHd,
    paddingVertical: 4, paddingHorizontal: 7,
  },
  spHdCell: {
    fontSize: 6, fontFamily: "Helvetica-Bold", color: C.spHdTxt,
    letterSpacing: 0.5, textTransform: "uppercase",
  },
  spRow: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7,
    borderTopWidth: 1, borderTopColor: C.spBorder,
  },
  spRowAlt: {
    flexDirection: "row", paddingVertical: 4, paddingHorizontal: 7,
    borderTopWidth: 1, borderTopColor: C.spBorder, backgroundColor: C.spNotesBg,
  },
  spCell: { fontSize: 6.5, color: C.bodyText },
  spMuted: { fontSize: 6, color: C.sageText },

  // ── Footer note ───────────────────────────────────────────────────────────
  footerNote: {
    fontSize: 5.5, color: C.sageText,
    paddingHorizontal: 22, paddingTop: 6,
    borderTopWidth: 1, borderTopColor: C.border,
    lineHeight: 1.4, marginTop: "auto",
  },

  // Column widths
  w15: { width: "15%" },
  w20: { width: "20%" },
  w25: { width: "25%" },
  w30: { width: "30%" },
  w35: { width: "35%" },
  w40: { width: "40%" },
  w50: { width: "50%" },
});

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtDate  = (d?: string | null) => d ? d.slice(0, 10) : "—";
const fmtYM    = (d?: string | null) => d ? d.slice(0, 7)  : "—";
const fmtShort = (d?: string | null) => {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { month: "short", year: "numeric" }); }
  catch { return d.slice(0, 7); }
};
const curYear  = () => new Date().getFullYear();
const repMonth = () => new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });
const calcAge  = (b?: string | null) => {
  if (!b) return "—";
  return `${Math.floor((Date.now() - new Date(b).getTime()) / (365.25 * 24 * 3600 * 1000))} yrs`;
};
const guessSport = (evs: string[]) => {
  const j = evs.join(" ").toLowerCase();
  if (j.includes("rifle") || j.includes("pistol") || j.includes("shoot")) return "SHOOTING";
  if (j.includes("badminton")) return "BADMINTON";
  if (j.includes("tennis"))    return "TENNIS";
  if (j.includes("wrestling")) return "WRESTLING";
  if (j.includes("boxing"))    return "BOXING";
  if (j.includes("weightlift")) return "WEIGHTLIFTING";
  if (j.includes("swim"))      return "SWIMMING";
  return "ATHLETICS";
};

// ── Header Band ───────────────────────────────────────────────────────────────
function HeaderBand({ athlete, page, total }: { athlete: WAAthleteProfile; page: number; total: number }) {
  const evs   = athlete.reliance_events ? athlete.reliance_events.split(",").map(e => e.trim()) : [];
  const sport = guessSport(evs);
  return (
    <>
      <View style={s.headerBand}>
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.athleteName}>{athlete.reliance_name || "—"}</Text>
            <Text style={s.sportLabel}>{sport}</Text>
            {evs.length > 0 && <Text style={s.eventsLabel}>{evs.join("  |  ")}</Text>}
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={s.headerRightLabel}>
              SCHOLARSHIP PROGRAMME {curYear()}–{String(curYear() + 1).slice(2)}
            </Text>
            <Text style={[s.headerRightLabel, { marginTop: 1 }]}>Report: {repMonth()}</Text>
          </View>
        </View>
        <View style={s.metaRow}>
          <View style={s.metaPill}>
            <Text style={s.metaPillLbl}>DOB</Text>
            <Text style={s.metaPillVal}>{fmtDate(athlete.birth_date)}</Text>
          </View>
          <View style={s.metaPill}>
            <Text style={s.metaPillLbl}>Gender</Text>
            <Text style={s.metaPillVal}>
              {athlete.gender === "M" ? "Male" : athlete.gender === "F" ? "Female" : athlete.gender || "—"}
            </Text>
          </View>
          <View style={s.metaPill}>
            <Text style={s.metaPillLbl}>Age</Text>
            <Text style={s.metaPillVal}>{athlete.age ? `${athlete.age} yrs` : calcAge(athlete.birth_date)}</Text>
          </View>
        </View>
      </View>
      <View style={s.confBar}>
        <Text style={s.confTxt}>CONFIDENTIAL — For internal use only</Text>
        <Text style={s.confTxt}>
          Annual Plan {curYear()}–{String(curYear() + 1).slice(2)}  |  Page {page} of {total}
        </Text>
      </View>
    </>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface AthleteReportProps {
  athlete:       WAAthleteProfile;
  rankings:      WARanking[];
  personalBests: WAAthletePersonalBest[];
  honours:       WAAthleteHonour[];
  results:       WARFAthleteResult[];
  toplists:      WAToplist[];
}

// ── Main Document ─────────────────────────────────────────────────────────────
export function AthleteReportPDF({
  athlete, rankings, personalBests, honours, results, toplists,
}: AthleteReportProps) {
  const evs = athlete.reliance_events
    ? athlete.reliance_events.split(",").map(e => e.trim())
    : [];
  const yr = curYear();

  const bestRanking = rankings.length
    ? [...rankings].sort((a, b) => a.rank - b.rank)[0]
    : null;

  const mainPB = personalBests.length ? personalBests[0] : null;

  const achievements = buildAchievements(results, honours).slice(0, 4);

  const perfs = results
    .filter(r => !r.not_legal)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const rankingsCol = rankings.slice(0, 5);

  const competitors = buildCompetitors(toplists, athlete, evs);
  const gapRows     = buildGapRows(results, rankings);

  return (
    <Document>
      {/* ══════════════════════════  PAGE 1  ══════════════════════════ */}
      <Page size="A4" style={s.page}>
        <HeaderBand athlete={athlete} page={1} total={2} />

        <View style={s.body}>
          {/* Support Team */}
          <Text style={s.secHd}>Support Team</Text>
          <View style={s.supportGrid}>
            {(["Coach", "Manager", "Budget", "Physio", "Nutritionist", "Psychologist"] as const).map(
              (lbl, i, arr) => (
                <View key={lbl} style={i === arr.length - 1 ? s.supCellLast : s.supCell}>
                  <Text style={s.supLbl}>{lbl}</Text>
                  <Text style={s.supVal}>—</Text>
                </View>
              )
            )}
          </View>

          {/* Performance Profile */}
          <Text style={s.secHd}>Performance Profile</Text>
          <Text style={{ fontSize: 5.5, color: C.sageText, marginBottom: 6 }}>
            * All data as of 15 April 2025 unless date noted
          </Text>

          {/* Highlight cards */}
          <View style={s.hlRow}>
            <View style={s.hlCard}>
              <Text style={s.hlLbl}>National Ranking</Text>
              <Text style={s.hlNum}>{bestRanking ? `#${bestRanking.rank}` : "—"}</Text>
              <Text style={s.hlSub}>{bestRanking ? bestRanking.event_group : "No ranking data"}</Text>
              {bestRanking && <Text style={s.hlNote}>{fmtShort(bestRanking.rank_date)}</Text>}
            </View>
            <View style={s.hlCardLast}>
              <Text style={s.hlLbl}>Personal Best</Text>
              <Text style={s.hlNum}>{mainPB?.mark || "—"}</Text>
              <Text style={s.hlSub}>{mainPB?.discipline || "No PB data"}</Text>
              {mainPB && (
                <Text style={s.hlNote}>
                  {mainPB.venue ? `${mainPB.venue} · ` : ""}{fmtDate(mainPB.date)}
                </Text>
              )}
            </View>
          </View>

          {/* Key Achievements */}
          {achievements.length > 0 && (
            <>
              <Text style={s.secHd}>Key Achievements</Text>
              <View style={s.achTable}>
                <View style={s.achHdRow}>
                  <Text style={[s.achHdCell, { width: 46 }]}>Date</Text>
                  <Text style={[s.achHdCell, { flex: 1 }]}>Achievement</Text>
                </View>
                {achievements.map((a, i) => (
                  <View key={i} style={i % 2 === 0 ? s.achRow : s.achRowAlt}>
                    <Text style={s.achDate}>{a.date}</Text>
                    <Text style={s.achText}>{a.text}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* Two-column: Rankings | Performances */}
          <View style={s.twoCol}>
            <View style={s.colLeft}>
              <Text style={s.secHd}>Current Rankings</Text>
              {rankingsCol.length > 0 ? (
                rankingsCol.map((r, i) => (
                  <View key={i} style={s.rankRow}>
                    <View style={s.rankBadge}>
                      <Text style={s.rankBadgeTxt}>#{r.rank}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.rankEvent}>{r.event_group}</Text>
                      <Text style={{ fontSize: 5.5, color: C.sageText }}>{r.country}</Text>
                    </View>
                    <Text style={s.rankDate}>{fmtShort(r.rank_date)}</Text>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 6.5, color: C.sageText }}>No ranking data available</Text>
              )}
            </View>

            <View style={s.colRight}>
              <Text style={s.secHd}>Performances</Text>
              {perfs.length > 0 ? (
                perfs.map((r, i) => (
                  <View key={i} style={s.perfRow}>
                    <Text style={s.perfMark}>{r.mark || "—"}</Text>
                    <View style={s.perfDetail}>
                      <Text style={s.perfEvent}>
                        {r.discipline}{r.place ? ` · Rank ${r.place}` : ""}
                      </Text>
                      <Text style={s.perfMeta}>
                        {r.competition}  [{fmtDate(r.date)}]
                      </Text>
                    </View>
                  </View>
                ))
              ) : (
                <Text style={{ fontSize: 6.5, color: C.sageText }}>No performance data available</Text>
              )}
            </View>
          </View>

          {/* 2026 Targets */}
          <Text style={s.secHd}>{yr} Targets</Text>
          <View style={s.targTable}>
            <View style={s.targHdRow}>
              <Text style={[s.targHdCell, s.w25]}>Target</Text>
              <Text style={[s.targHdCell, s.w30]}>Event</Text>
              <Text style={[s.targHdCell, s.w20]}>Type</Text>
              <Text style={[s.targHdCell, s.w25]}>Notes</Text>
            </View>
            {evs.length > 0 ? (
              evs.map((ev, i) => (
                <View key={i} style={i % 2 === 0 ? s.targRow : s.targRowAlt}>
                  <Text style={[s.targMuted, s.w25]}>—</Text>
                  <Text style={[s.targCell,  s.w30]}>{ev}</Text>
                  <Text style={[s.targMuted, s.w20]}>Performance</Text>
                  <Text style={[s.targMuted, s.w25]}>To be set</Text>
                </View>
              ))
            ) : (
              <View style={s.targRow}>
                <Text style={[s.targMuted, { flex: 1 }]}>No target data available</Text>
              </View>
            )}
          </View>
        </View>

        <Text style={s.footerNote}>
          * Performance and ranking data sourced from RF Scholarship Programme records.
          Values with dates refer to that specific result.
        </Text>
      </Page>

      {/* ══════════════════════════  PAGE 2  ══════════════════════════ */}
      <Page size="A4" style={s.page}>
        <HeaderBand athlete={athlete} page={2} total={2} />

        <View style={s.body}>
          {/* Key Competitors */}
          <Text style={s.secHd}>Key Competitors</Text>
          <Text style={{ fontSize: 6, color: C.sageText, marginBottom: 6 }}>
            Top Indian athletes in the same event(s) — sourced from national toplists
          </Text>
          <View style={s.compRow}>
            {competitors.slice(0, 5).map((c, i) => (
              <View
                key={i}
                style={i === Math.min(competitors.length - 1, 4) ? s.compCardLast : s.compCard}
              >
                <View style={s.compRankBadge}>
                  <Text style={s.compRankTxt}>#{c.rank}</Text>
                </View>
                <Text style={s.compName}>{c.athlete_name}</Text>
                <Text style={s.compMeta}>{c.event}</Text>
                <Text style={s.compMeta}>Best: {c.mark}  [{c.year}]</Text>
              </View>
            ))}
            {Array.from({ length: Math.max(0, 5 - competitors.length) }).map((_, i) => (
              <View
                key={`pad${i}`}
                style={
                  i === Math.max(0, 5 - competitors.length) - 1
                    ? s.compCardLast
                    : s.compCard
                }
              >
                <View style={s.compRankBadge}>
                  <Text style={s.compRankTxt}>—</Text>
                </View>
                <Text style={s.compName}>No data</Text>
                <Text style={s.compMeta}>Competitor data not available</Text>
              </View>
            ))}
          </View>

          {/* Performance Gap Analysis */}
          <Text style={s.secHd}>Performance Gap Analysis</Text>
          <Text style={{ fontSize: 5.5, color: C.sageText, marginBottom: 5 }}>
            Derived from verified official data and competition records
          </Text>
          <View style={s.gapTable}>
            <View style={s.gapHdRow}>
              <Text style={[s.gapHdCell, s.w25]}>Gap Area</Text>
              <Text style={[s.gapHdCell, s.w35]}>Current (verified)</Text>
              <Text style={[s.gapHdCell, s.w25]}>Reference / Target</Text>
              <Text style={[s.gapHdCell, s.w15]}>Source</Text>
            </View>
            {gapRows.map((row, i) => (
              <View key={i} style={i % 2 === 0 ? s.gapRow : s.gapRowAlt}>
                <Text style={[s.gapCell,  s.w25]}>{row.area}</Text>
                <Text style={[s.gapCell,  s.w35]}>{row.current}</Text>
                <Text style={[s.gapMuted, s.w25]}>{row.target}</Text>
                <Text style={[s.gapMuted, s.w15]}>{row.source}</Text>
              </View>
            ))}
          </View>

          {/* Support Plan */}
          <Text style={s.secHd}>Support Plan</Text>
          <Text style={{ fontSize: 5.5, color: C.sageText, marginBottom: 5 }}>
            Placeholder — to be completed by the support team
          </Text>
          <View style={s.spTable}>
            <View style={s.spHdRow}>
              <Text style={[s.spHdCell, s.w20]}>Area</Text>
              <Text style={[s.spHdCell, s.w20]}>Period</Text>
              <Text style={[s.spHdCell, s.w25]}>Comments</Text>
              <Text style={[s.spHdCell, s.w20]}>Gaps</Text>
              <Text style={[s.spHdCell, s.w15]}>Intervention</Text>
            </View>
            {[
              ["Psychology",   `${yr}-04-01 → ${yr + 1}-03-31`, "—", "—", "—"],
              ["Physio / S&C", `${yr}-04-01 → ${yr + 1}-03-31`, "—", "—", "—"],
              ["Nutrition",    `${yr}-04-01 → ${yr + 1}-03-31`, "—", "—", "—"],
            ].map((row, i) => (
              <View key={i} style={i % 2 === 0 ? s.spRow : s.spRowAlt}>
                <Text style={[s.spCell,  s.w20]}>{row[0]}</Text>
                <Text style={[s.spMuted, s.w20]}>{row[1]}</Text>
                <Text style={[s.spMuted, s.w25]}>{row[2]}</Text>
                <Text style={[s.spMuted, s.w20]}>{row[3]}</Text>
                <Text style={[s.spMuted, s.w15]}>{row[4]}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={s.footerNote}>
          * Competitor data sourced from national toplists (same event, India only).
          Support Plan is a placeholder — to be updated by the respective support staff.
        </Text>
      </Page>
    </Document>
  );
}

// ── Data helpers ──────────────────────────────────────────────────────────────
function buildAchievements(results: WARFAthleteResult[], honours: WAAthleteHonour[]) {
  const items: { date: string; text: string; ts: number }[] = [];

  [...results]
    .filter(r => !r.not_legal && r.result_score)
    .sort((a, b) => b.result_score - a.result_score)
    .slice(0, 3)
    .forEach(r => {
      items.push({
        date: fmtYM(r.date),
        ts: r.date ? new Date(r.date).getTime() : 0,
        text: `${r.discipline}: ${r.mark || "—"}${r.place ? `, Rank ${r.place}` : ""} — ${r.competition}.`,
      });
    });

  [...honours]
    .filter(h => h.date && h.competition)
    .slice(0, 3)
    .forEach(h => {
      if (!items.find(i => i.text.includes(h.competition!))) {
        items.push({
          date: fmtYM(h.date),
          ts: h.date ? new Date(h.date).getTime() : 0,
          text: `${h.competition}${h.discipline ? ` — ${h.discipline}` : ""}${h.place ? ` · Place: ${h.place}` : ""}${h.mark ? ` · Mark: ${h.mark}` : ""}.`,
        });
      }
    });

  return items
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 4)
    .map(({ date, text }) => ({ date, text }));
}

function buildCompetitors(toplists: WAToplist[], athlete: WAAthleteProfile, events: string[]): WAToplist[] {
  if (!toplists.length || !events.length) return [];
  const selfName  = (athlete.reliance_name || "").toLowerCase().trim();
  const norm      = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, "");
  const athNorms  = events.map(norm);
  return toplists
    .filter(t => {
      const isIndia     = t.nationality === "IND" || t.nationality === "India";
      const isSameEvent = athNorms.some(en => norm(t.event || "").includes(en) || en.includes(norm(t.event || "")));
      const isSelf      = (t.athlete_name || "").toLowerCase().trim() === selfName;
      return isIndia && isSameEvent && !isSelf;
    })
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 5);
}

function buildGapRows(results: WARFAthleteResult[], rankings: WARanking[]) {
  const rows: { area: string; current: string; target: string; source: string }[] = [];
  if (rankings.length > 0) {
    const best = [...rankings].sort((a, b) => a.rank - b.rank)[0];
    rows.push({
      area: `Ranking — ${best.event_group}`,
      current: `#${best.rank} (${best.ranking_score} pts)`,
      target: "Top 3 nationally",
      source: "Rankings",
    });
  }
  const discs = Array.from(
    new Set(results.filter(r => !r.not_legal).map(r => r.discipline).filter(Boolean))
  );
  discs.slice(0, 2).forEach(disc => {
    const dr = results.filter(r => r.discipline === disc && !r.not_legal);
    if (dr.length) {
      const best = dr.sort((a, b) => b.result_score - a.result_score)[0];
      rows.push({
        area: `${disc}`,
        current: `${best.mark || "—"} at ${best.competition}`,
        target: "Consistent improvement",
        source: "Competition data",
      });
    }
  });
  if (!rows.length) rows.push({ area: "No data available", current: "—", target: "—", source: "—" });
  return rows.slice(0, 3);
}
