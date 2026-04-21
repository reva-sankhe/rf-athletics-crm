import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { TableSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { fetchWAAthleteProfiles, getUniqueEvents } from "@/lib/queries";
import type { WAAthleteProfile } from "@/lib/types";
import { Users, Search, ChevronRight, ArrowUpDown } from "lucide-react";

export default function Athletes() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"age" | "gender" | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWAAthleteProfiles();
      setAthletes(data);
      setAvailableEvents(getUniqueEvents(data));
    } catch (error) {
      console.error('Error loading athletes:', error);
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSort = (column: "age" | "gender") => {
    if (sortBy === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDirection("asc");
    }
  };

  const filtered = athletes.filter((athlete) => {
    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      const nameMatch = athlete.reliance_name?.toLowerCase().includes(searchLower);
      const idMatch = athlete.aa_athlete_id?.toLowerCase().includes(searchLower);
      if (!nameMatch && !idMatch) return false;
    }
    
    // Event filter
    if (filterEvent && athlete.reliance_events) {
      const athleteEvents = athlete.reliance_events.split(',').map(e => e.trim());
      if (!athleteEvents.includes(filterEvent)) return false;
    }
    
    // Gender filter
    if (filterGender && athlete.gender !== filterGender) return false;
    
    return true;
  });

  // Sort filtered results
  const sorted = [...filtered].sort((a, b) => {
    if (!sortBy) return 0;
    
    let aVal: any;
    let bVal: any;
    
    if (sortBy === "age") {
      aVal = a.age ?? -1;
      bVal = b.age ?? -1;
    } else if (sortBy === "gender") {
      aVal = a.gender ?? "";
      bVal = b.gender ?? "";
    }
    
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            <span className="text-indigo-500 dark:text-indigo-400">Athletes</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{athletes.length} total athletes</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search name or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-muted border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary w-48"
            data-testid="input-search-athletes"
          />
        </div>
        <select
          value={filterEvent}
          onChange={(e) => setFilterEvent(e.target.value)}
          className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
          data-testid="select-filter-event"
        >
          <option value="">All events</option>
          {availableEvents.map((event) => (
            <option key={event} value={event}>{event}</option>
          ))}
        </select>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="bg-muted border border-border rounded-md px-3 py-1.5 text-sm text-foreground"
          data-testid="select-filter-gender"
        >
          <option value="">All genders</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={8} cols={5} /></div>
        ) : sorted.length === 0 ? (
          <EmptyState icon={Users} title="No athletes found" description="Try adjusting your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="athletes-table">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Name</th>
                  <th className="px-4 py-2.5 text-left font-medium">Events</th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    <button
                      onClick={() => handleSort("age")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Age
                      <ArrowUpDown size={12} className={sortBy === "age" ? "text-indigo-400" : ""} />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium">
                    <button
                      onClick={() => handleSort("gender")}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      Gender
                      <ArrowUpDown size={12} className={sortBy === "gender" ? "text-indigo-400" : ""} />
                    </button>
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium w-8"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((athlete) => (
                  <tr 
                    key={athlete.aa_athlete_id} 
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors" 
                    data-testid={`row-athlete-${athlete.aa_athlete_id}`}
                  >
                    <td className="px-4 py-2.5 font-medium text-foreground">
                      <Link
                        href={`/athletes/${athlete.aa_athlete_id}`}
                        className="hover:text-indigo-400 transition-colors"
                        data-testid={`link-athlete-name-${athlete.aa_athlete_id}`}
                      >
                        {athlete.reliance_name || "—"}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5">
                      {athlete.reliance_events ? (
                        <div className="flex flex-wrap gap-1">
                          {athlete.reliance_events.split(',').map((event, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-indigo-500/15 text-indigo-400"
                            >
                              {event.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {athlete.age ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-foreground">
                      {athlete.gender ?? "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <Link
                        href={`/athletes/${athlete.aa_athlete_id}`}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid={`link-athlete-${athlete.aa_athlete_id}`}
                      >
                        <ChevronRight size={14} />
                      </Link>
                    </td>
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
