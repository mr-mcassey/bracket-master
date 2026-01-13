export interface Team {
  id: string;
  name: string;
}

export type MatchType = 'single' | 'bestOf3';

export type GamePhase = 'draft' | 'play';

export type BracketMode = 'standard' | 'compact';

export type LayoutMode = 'double' | 'single';

export interface Match {
  id: number;
  p1: Team | null;
  p2: Team | null;
  // Index in the master bracketSlots array (only valid for Round 1)
  sourceSlotP1: number; 
  sourceSlotP2: number;
  p1Wins: number;
  p2Wins: number;
  winner: Team | null;
}

export interface DragData {
  team: Team;
  sourceSlotIndex: number;
}

export interface Tournament {
  id: string;
  name: string;
  phase: GamePhase;
  matchType: MatchType;
  bracketMode: BracketMode;
  layoutMode: LayoutMode;
  createdTeams: Team[];
  bracketSlots: (Team | null)[];
  rounds: Match[][];
  champion: Team | null;
  updatedAt: number;
}