import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import { TableSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { fetchWAAthleteProfiles, getUniqueEvents } from "@/lib/queries";
import type { WAAthleteProfile } from "@/lib/types";
import { Users, Search, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";

const columnHelper = createColumnHelper<WAAthleteProfile>();

const columns = [
  columnHelper.accessor("reliance_name", {
    header: "Name",
    enableSorting: true,
    cell: (info) => {
      const athlete = info.row.original;
      return (
        <Link
          href={`/athletes/${athlete.aa_athlete_id}`}
          className="hover:text-[#00A651] transition-colors font-medium"
          data-testid={`link-athlete-name-${athlete.aa_athlete_id}`}
        >
          {info.getValue() || "—"}
        </Link>
      );
    },
  }),
  columnHelper.accessor("reliance_events", {
    header: "Events",
    enableSorting: false,
    cell: (info) => {
      const val = info.getValue();
      if (!val) return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {val.split(",").map((event, idx) => (
            <span
              key={idx}
              className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-[#00A651]/10 text-[#00A651]"
            >
              {event.trim()}
            </span>
          ))}
        </div>
      );
    },
  }),
  columnHelper.accessor("age", {
    header: "Age",
    enableSorting: true,
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.accessor("gender", {
    header: "Gender",
    enableSorting: true,
    cell: (info) => info.getValue() ?? "—",
  }),
  columnHelper.display({
    id: "actions",
    header: "",
    cell: (info) => (
      <Link
        href={`/athletes/${info.row.original.aa_athlete_id}`}
        className="text-muted-foreground hover:text-primary transition-colors"
        data-testid={`link-athlete-${info.row.original.aa_athlete_id}`}
      >
        <ChevronRight size={14} />
      </Link>
    ),
  }),
];

export default function Athletes() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWAAthleteProfiles();
      setAthletes(data);
      setAvailableEvents(getUniqueEvents(data));
    } catch (error) {
      console.error("Error loading athletes:", error);
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = athletes.filter((athlete) => {
    if (search) {
      const q = search.toLowerCase();
      if (!athlete.reliance_name?.toLowerCase().includes(q) && !athlete.aa_athlete_id?.toLowerCase().includes(q)) return false;
    }
    if (filterEvent && athlete.reliance_events) {
      const events = athlete.reliance_events.split(",").map((e) => e.trim());
      if (!events.includes(filterEvent)) return false;
    }
    if (filterGender && athlete.gender !== filterGender) return false;
    return true;
  });

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            <span className="text-[#00A651]">Athletes</span>
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
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No athletes found" description="Try adjusting your filters" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="athletes-table">
              <thead>
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id} className="border-b border-border text-xs text-muted-foreground">
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-2.5 text-left font-medium">
                        {header.column.getCanSort() ? (
                          <button
                            onClick={header.column.getToggleSortingHandler()}
                            className="flex items-center gap-1 hover:text-foreground transition-colors"
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {header.column.getIsSorted() === "asc" ? (
                              <ArrowUp size={12} className="text-[#00A651]" />
                            ) : header.column.getIsSorted() === "desc" ? (
                              <ArrowDown size={12} className="text-[#00A651]" />
                            ) : (
                              <ArrowUpDown size={12} />
                            )}
                          </button>
                        ) : (
                          flexRender(header.column.columnDef.header, header.getContext())
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                    data-testid={`row-athlete-${row.original.aa_athlete_id}`}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-2.5 text-foreground">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
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
