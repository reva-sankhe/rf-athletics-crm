import { useEffect, useState, useCallback } from "react";
import { Link } from "wouter";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from "@tanstack/react-table";
import { TableSkeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/EmptyState";
import { fetchWAAthleteProfiles, getUniqueEvents } from "@/lib/queries";
import type { WAAthleteProfile } from "@/lib/types";
import { Users, Search, ChevronRight, ArrowUpDown, ChevronLeft, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function Athletes() {
  const [athletes, setAthletes] = useState<WAAthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterEvent, setFilterEvent] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [availableEvents, setAvailableEvents] = useState<string[]>([]);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);

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

  const columns: ColumnDef<WAAthleteProfile>[] = [
    {
      accessorKey: "reliance_name",
      header: "Name",
      cell: ({ row }) => (
        <Link
          href={`/athletes/${row.original.aa_athlete_id}`}
          className="font-medium text-foreground hover:text-primary transition-colors"
          data-testid={`link-athlete-name-${row.original.aa_athlete_id}`}
        >
          {row.original.reliance_name || "—"}
        </Link>
      ),
    },
    {
      accessorKey: "reliance_events",
      header: "Events",
      cell: ({ row }) => {
        if (!row.original.reliance_events) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {row.original.reliance_events.split(',').map((event, idx) => (
              <Badge 
                key={idx}
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/20"
              >
                {event.trim()}
              </Badge>
            ))}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "age",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Age
          <ArrowUpDown size={12} className={column.getIsSorted() ? "text-primary" : ""} />
        </button>
      ),
      cell: ({ row }) => row.original.age ?? "—",
    },
    {
      accessorKey: "gender",
      header: ({ column }) => (
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          Gender
          <ArrowUpDown size={12} className={column.getIsSorted() ? "text-primary" : ""} />
        </button>
      ),
      cell: ({ row }) => row.original.gender ?? "—",
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Link
          href={`/athletes/${row.original.aa_athlete_id}`}
          className="text-muted-foreground hover:text-primary transition-colors"
          data-testid={`link-athlete-${row.original.aa_athlete_id}`}
        >
          <ChevronRight size={14} />
        </Link>
      ),
    },
  ];

  // Filter data based on search and filters
  const filteredData = athletes.filter((athlete) => {
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

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      columnFilters,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Athletes
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
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-4"><TableSkeleton rows={8} cols={5} /></div>
        ) : filteredData.length === 0 ? (
          <EmptyState icon={Users} title="No athletes found" description="Try adjusting your filters" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm" data-testid="athletes-table">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-border text-xs text-muted-foreground">
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} className="px-4 py-2.5 text-left font-medium">
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
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
                        <td key={cell.id} className="px-4 py-2.5">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <div className="text-sm text-muted-foreground">
                Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{" "}
                {Math.min(
                  (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                  filteredData.length
                )}{" "}
                of {filteredData.length} results
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                >
                  <ChevronLeft size={14} />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                >
                  Next
                  <ChevronRightIcon size={14} />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
