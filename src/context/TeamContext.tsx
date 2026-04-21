import { createContext, useContext, useState } from "react";

export type Team = string;

interface TeamContextValue {
  team: Team;
  setTeam: (team: Team) => void;
}

const TeamContext = createContext<TeamContextValue>({
  team: "Team A",
  setTeam: () => {},
});

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const [team, setTeam] = useState<Team>("Team A");

  return (
    <TeamContext.Provider value={{ team, setTeam }}>
      {children}
    </TeamContext.Provider>
  );
}

export function useTeam() {
  return useContext(TeamContext);
}
