export interface EventGroup {
  label: string;
  events: string[];
}

/** Grouped disciplines for wa_toplists-based tabs (Scouting, Global Standings). */
export const TOPLIST_DISCIPLINE_GROUPS: Record<string, EventGroup[]> = {
  M: [
    { label: "Track", events: ["100m", "200m", "400m"] },
    { label: "Hurdles", events: ["110m Hurdles", "400m Hurdles"] },
    { label: "Road", events: ["Half-Marathon", "Marathon"] },
    { label: "Jumps", events: ["High Jump", "Long Jump", "Pole Vault", "Triple Jump"] },
    { label: "Throws", events: ["Discus Throw", "Hammer Throw", "Javelin Throw", "Shot Put"] },
    { label: "Combined", events: ["Decathlon"] },
    { label: "Relays", events: ["4 x 100m Relay", "4 x 400m Relay"] },
  ],
  F: [
    { label: "Track", events: ["100m", "200m", "400m"] },
    { label: "Hurdles", events: ["100m Hurdles", "400m Hurdles"] },
    { label: "Road", events: ["Half-Marathon", "Marathon"] },
    { label: "Jumps", events: ["High Jump", "Long Jump", "Pole Vault", "Triple Jump"] },
    { label: "Throws", events: ["Discus Throw", "Hammer Throw", "Javelin Throw", "Shot Put"] },
    { label: "Combined", events: ["Heptathlon"] },
    { label: "Relays", events: ["4 x 100m Relay", "4 x 400m Relay"] },
  ],
};

/** Grouped disciplines for benchmark/results-based tabs (Finals Benchmark). */
export const BENCHMARK_EVENT_GROUPS: EventGroup[] = [
  { label: "Track", events: ["100m", "200m", "400m", "800m", "1500m", "5000m", "10000m"] },
  { label: "Hurdles / Steeplechase", events: ["110m Hurdles", "100m Hurdles", "400m Hurdles", "3000m Steeplechase"] },
  { label: "Road", events: ["Marathon"] },
  { label: "Jumps", events: ["High Jump", "Long Jump", "Pole Vault", "Triple Jump"] },
  { label: "Throws", events: ["Discus Throw", "Hammer Throw", "Javelin Throw", "Shot Put"] },
  { label: "Combined", events: ["Decathlon", "Heptathlon"] },
];
