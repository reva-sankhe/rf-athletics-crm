import { useEffect, useState, useCallback } from "react";
import Papa from "papaparse";
import { fetchSessions, createSession, fetchPlayers, bulkInsertResults } from "@/lib/queries";
import { TableSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { formatBroncho } from "@/lib/utils";
import type { TestSession, Player, TestResult } from "@/lib/types";
import { Dumbbell, Plus, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Step = "list" | "create-session" | "enter-data" | "preview" | "done";

interface CsvRow {
  code: string;
  name: string;
  bronco_mins?: number;
  ten_m_1?: number;
  ten_m_2?: number;
  twenty_m_1?: number;
  twenty_m_2?: number;
  forty_m_1?: number;
  forty_m_2?: number;
  notes?: string;
}

interface MatchedRow {
  row: CsvRow;
  player: Player | null;
}

function parseNum(v: string | undefined | null): number | null {
  if (!v || String(v).trim() === "") return null;
  const n = parseFloat(String(v).trim());
  return isNaN(n) ? null : n;
}

function parseCsv(text: string): CsvRow[] {
  const result = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
  });
  return result.data.map((obj) => ({
    code: obj["code"] ?? "",
    name: obj["name"] ?? "",
    bronco_mins: parseNum(obj["bronco_mins"]) ?? undefined,
    ten_m_1: parseNum(obj["ten_m_1"]) ?? undefined,
    ten_m_2: parseNum(obj["ten_m_2"]) ?? undefined,
    twenty_m_1: parseNum(obj["twenty_m_1"]) ?? undefined,
    twenty_m_2: parseNum(obj["twenty_m_2"]) ?? undefined,
    forty_m_1: parseNum(obj["forty_m_1"]) ?? undefined,
    forty_m_2: parseNum(obj["forty_m_2"]) ?? undefined,
    notes: obj["notes"] ?? undefined,
  }));
}

export default function FitnessTests() {
  const { toast } = useToast();
  const [sessions, setSessions] = useState<TestSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("list");

  // Session details (not saved until confirm)
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newName, setNewName] = useState("");

  // Data entry state
  const [csvText, setCsvText] = useState("");
  const [manualRows, setManualRows] = useState<CsvRow[]>([{ code: "", name: "" }]);
  const [useManual, setUseManual] = useState(false);
  const [matched, setMatched] = useState<MatchedRow[]>([]);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    try {
      const s = await fetchSessions();
      setSessions(s);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  const handleGoToDataEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      toast({ title: "Session name is required", variant: "destructive" });
      return;
    }
    try {
      const players = await fetchPlayers();
      setAllPlayers(players);
      setStep("enter-data");
    } catch (err: unknown) {
      toast({ title: "Failed to load players", description: String(err), variant: "destructive" });
    }
  };

  const handlePreview = () => {
    const rows: CsvRow[] = useManual ? manualRows.filter((r) => r.code || r.name) : parseCsv(csvText);
    if (!rows.length) {
      toast({ title: "No data to preview", variant: "destructive" });
      return;
    }
    const matchedRows = rows.map((row) => {
      const player = allPlayers.find(
        (p) =>
          (row.code && p.code.toLowerCase() === row.code.toLowerCase()) ||
          (row.name && p.name.toLowerCase() === row.name.toLowerCase())
      ) ?? null;
      return { row, player };
    });
    setMatched(matchedRows);
    setStep("preview");
  };

  // Session is created here, only when user confirms
  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      const session = await createSession({ test_date: newDate, test_name: newName, notes: null });

      const results: Omit<TestResult, "id" | "created_at">[] = matched
        .filter((m) => m.player !== null)
        .map((m) => ({
          session_id: session.id,
          player_id: m.player!.id,
          bronco_mins: m.row.bronco_mins ?? null,
          mas_ms: null,
          seconds: null,
          ten_m_1: m.row.ten_m_1 ?? null,
          ten_m_2: m.row.ten_m_2 ?? null,
          twenty_m_1: m.row.twenty_m_1 ?? null,
          twenty_m_2: m.row.twenty_m_2 ?? null,
          forty_m_1: m.row.forty_m_1 ?? null,
          forty_m_2: m.row.forty_m_2 ?? null,
          eighty_m_runs: null,
          sixty_m_runs: null,
          forty_m_runs: null,
          notes: m.row.notes ?? null,
        }));
      await bulkInsertResults(results);
      toast({ title: `Saved ${results.length} results` });
      await loadSessions();
      setStep("list");
      setNewName("");
      setNewDate(new Date().toISOString().split("T")[0]);
      setCsvText("");
      setManualRows([{ code: "", name: "" }]);
    } catch (err: unknown) {
      toast({ title: "Failed to save results", description: String(err), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setStep("list");
    setNewName("");
    setNewDate(new Date().toISOString().split("T")[0]);
    setCsvText("");
    setManualRows([{ code: "", name: "" }]);
  };

  if (step === "create-session") {
    return (
      <div className="space-y-5 max-w-lg">
        <button onClick={handleCancel} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-base font-semibold text-foreground mb-4">New Test Session</h2>
          <form onSubmit={handleGoToDataEntry} className="space-y-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Session Date</label>
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)}
                className="w-full bg-muted border border-border rounded px-3 py-1.5 text-sm text-foreground" data-testid="input-session-date" />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Session Name</label>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Pre-season Test 1"
                className="w-full bg-muted border border-border rounded px-3 py-1.5 text-sm text-foreground" data-testid="input-session-name" />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={handleCancel} className="flex-1 px-4 py-2 border border-border rounded-md text-sm text-muted-foreground">Cancel</button>
              <button type="submit" className="flex-1 px-4 py-2 btn-primary text-white rounded-xl text-sm font-semibold" data-testid="button-create-session">Next →</button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (step === "enter-data") {
    return (
      <div className="space-y-5 max-w-2xl">
        <button onClick={() => setStep("create-session")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-base font-semibold text-foreground mb-1">Enter Results</h2>
          <p className="text-xs text-muted-foreground mb-4">Session: {newName} — {newDate}</p>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setUseManual(false)} className={`text-sm px-3.5 py-1.5 rounded-lg font-medium transition-all ${!useManual ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30" : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`} data-testid="button-tab-csv">CSV Upload</button>
            <button onClick={() => setUseManual(true)} className={`text-sm px-3.5 py-1.5 rounded-lg font-medium transition-all ${useManual ? "bg-indigo-50 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30" : "text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200"}`} data-testid="button-tab-manual">Manual Entry</button>
          </div>

          {!useManual ? (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">CSV columns: code, name, bronco_mins, ten_m_1, ten_m_2, twenty_m_1, twenty_m_2, forty_m_1, forty_m_2, notes</p>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Upload CSV file</label>
                <input type="file" accept=".csv,text/csv" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => setCsvText(ev.target?.result as string);
                  reader.readAsText(file);
                }} className="text-sm text-muted-foreground" data-testid="input-csv-file" />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Or paste CSV text</label>
                <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} rows={8}
                  placeholder={"code,name,bronco_mins,ten_m_1,...\nP001,Jane,6.25,1.82,..."}
                  className="w-full bg-muted border border-border rounded px-3 py-2 text-sm font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  data-testid="textarea-csv" />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {manualRows.map((row, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <input value={row.code} onChange={(e) => { const rs = [...manualRows]; rs[i] = { ...rs[i], code: e.target.value }; setManualRows(rs); }} placeholder="Code" className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground" />
                  <input value={row.name} onChange={(e) => { const rs = [...manualRows]; rs[i] = { ...rs[i], name: e.target.value }; setManualRows(rs); }} placeholder="Name" className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground" />
                  <input value={row.bronco_mins ?? ""} onChange={(e) => { const rs = [...manualRows]; rs[i] = { ...rs[i], bronco_mins: parseFloat(e.target.value) || undefined }; setManualRows(rs); }} placeholder="Broncho (mins)" type="number" step="0.01" className="bg-muted border border-border rounded px-2 py-1.5 text-sm text-foreground" />
                </div>
              ))}
              <button onClick={() => setManualRows([...manualRows, { code: "", name: "" }])} className="text-xs text-primary hover:underline" data-testid="button-add-row">+ Add row</button>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button type="button" onClick={() => setStep("create-session")} className="flex-1 px-4 py-2 border border-border rounded-md text-sm text-muted-foreground">Back</button>
            <button onClick={handlePreview} className="flex-1 px-4 py-2 btn-primary text-white rounded-xl text-sm font-semibold" data-testid="button-preview">Preview →</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    const matchedCount = matched.filter((m) => m.player).length;
    const unmatchedCount = matched.filter((m) => !m.player).length;
    return (
      <div className="space-y-5">
        <button onClick={() => setStep("enter-data")} className="text-sm text-muted-foreground hover:text-foreground">← Back</button>
        <div className="bg-card border border-border rounded-lg p-5">
          <h2 className="text-base font-semibold text-foreground mb-2">Preview Results</h2>
          <p className="text-xs text-muted-foreground mb-3">Session will be created when you confirm below.</p>
          <div className="flex gap-4 mb-4 text-sm">
            <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 size={14} />{matchedCount} matched</span>
            {unmatchedCount > 0 && <span className="text-red-400 flex items-center gap-1"><AlertCircle size={14} />{unmatchedCount} unmatched (skipped)</span>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="preview-table">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Code</th>
                  <th className="px-3 py-2 text-left font-medium">Name</th>
                  <th className="px-3 py-2 text-left font-medium">Matched Player</th>
                  <th className="px-3 py-2 text-right font-medium">Broncho</th>
                </tr>
              </thead>
              <tbody>
                {matched.map((m, i) => (
                  <tr key={i} className={`border-b border-border/50 ${m.player ? "bg-emerald-950/20" : "bg-red-950/20"}`} data-testid={`row-preview-${i}`}>
                    <td className="px-3 py-2">{m.player ? <CheckCircle2 size={14} className="text-emerald-400" /> : <AlertCircle size={14} className="text-red-400" />}</td>
                    <td className="px-3 py-2 font-time text-xs text-muted-foreground">{m.row.code}</td>
                    <td className="px-3 py-2 text-foreground">{m.row.name}</td>
                    <td className="px-3 py-2 text-foreground">{m.player?.name ?? <span className="text-red-400 text-xs">No match found</span>}</td>
                    <td className="px-3 py-2 text-right font-time">{formatBroncho(m.row.bronco_mins ?? null)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex gap-2 pt-4">
            <button onClick={() => setStep("enter-data")} className="flex-1 px-4 py-2 border border-border rounded-md text-sm text-muted-foreground">Back</button>
            <button onClick={handleConfirm} disabled={submitting || matchedCount === 0} className="flex-1 px-4 py-2 btn-primary text-white rounded-xl text-sm font-semibold disabled:opacity-60" data-testid="button-confirm-save">
              {submitting ? "Saving…" : `Save ${matchedCount} Results`}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-normal tracking-tight text-foreground">Fitness <em className="italic text-indigo-500 dark:text-indigo-400 not-italic font-serif">Tests</em></h1>
          <p className="text-sm text-slate-500 dark:text-slate-600 mt-1">{sessions.length} session{sessions.length !== 1 ? "s" : ""}</p>
        </div>
        <button
          onClick={() => setStep("create-session")}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-500/50 text-indigo-400 text-sm font-medium hover:bg-indigo-500/10 transition-colors"
          data-testid="button-new-session"
        >
          <Plus size={13} />
          New Session
        </button>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={5} cols={4} /></div>
        ) : sessions.length === 0 ? (
          <EmptyState icon={Dumbbell} title="No sessions yet" description="Create a new test session to get started" action={
            <button onClick={() => setStep("create-session")} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-500/50 text-indigo-400 text-sm font-medium hover:bg-indigo-500/10 transition-colors" data-testid="button-new-session-empty"><Plus size={13} />New Session</button>
          } />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="sessions-table">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium">Session Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className="border-b border-border/50 hover:bg-muted/30" data-testid={`row-session-${s.id}`}>
                    <td className="px-4 py-3 font-time text-muted-foreground text-xs">{s.test_date}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{s.test_name}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{s.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
