import { Team, Match, MatchType, BracketMode, LayoutMode } from '../types';

// NOTE: All logic in this file is pure JavaScript/TypeScript and runs locally in the browser/electron.
// No external API calls are made.

export const isPowerOfTwo = (n: number): boolean => {
  return n !== 0 && (n & (n - 1)) === 0;
};

export const getCapacity = (count: number): number => {
  if (count <= 2) return 2;
  return Math.pow(2, Math.ceil(Math.log2(count)));
};

export const resizeBracketSlots = (currentSlots: (Team | null)[], teamCount: number): (Team | null)[] => {
  const requiredCapacity = getCapacity(Math.max(2, teamCount));
  
  if (currentSlots.length === requiredCapacity) {
    return currentSlots;
  }

  const newSlots = [...currentSlots];
  
  // Grow
  if (newSlots.length < requiredCapacity) {
    while (newSlots.length < requiredCapacity) {
      newSlots.push(null);
    }
    return newSlots;
  }
  
  // Shrink
  return newSlots.slice(0, requiredCapacity);
};

export const generateRounds = (bracketSlots: (Team | null)[]): Match[][] => {
  const round1: Match[] = [];
  
  for (let i = 0; i < bracketSlots.length; i += 2) {
    const t1 = bracketSlots[i];
    const t2 = bracketSlots[i + 1];

    round1.push({
      id: round1.length,
      p1: t1,
      p2: t2,
      sourceSlotP1: i,
      sourceSlotP2: i + 1,
      p1Wins: 0,
      p2Wins: 0,
      winner: null
    });
  }

  const allRounds: Match[][] = [round1];
  let currentRoundSize = round1.length;

  while (currentRoundSize > 1) {
    const nextRoundSize = currentRoundSize / 2;
    const nextRound: Match[] = [];
    for (let i = 0; i < nextRoundSize; i++) {
      nextRound.push({
        id: i,
        p1: null,
        p2: null,
        sourceSlotP1: -1,
        sourceSlotP2: -1,
        p1Wins: 0,
        p2Wins: 0,
        winner: null
      });
    }
    allRounds.push(nextRound);
    currentRoundSize = nextRoundSize;
  }
  
  return allRounds;
};

// Helper to propagate a winner to the next round
const propagateWinner = (rounds: Match[][], roundIndex: number, matchIndex: number, winner: Team): Team | null => {
    if (roundIndex === rounds.length - 1) {
      return winner;
    }
    
    const nextRound = rounds[roundIndex + 1];
    const nextMatchIdx = Math.floor(matchIndex / 2);
    const nextMatch = nextRound[nextMatchIdx];
    
    const isP1InNext = matchIndex % 2 === 0;

    if (isP1InNext) nextMatch.p1 = winner;
    else nextMatch.p2 = winner;

    return null;
};

export const updateMatchAndPropagate = (
  rounds: Match[][],
  roundIndex: number,
  matchIndex: number,
  teamIndex: 0 | 1,
  newWins: number,
  matchType: MatchType
): { newRounds: Match[][]; champion: Team | null } => {
  const newRounds = JSON.parse(JSON.stringify(rounds));
  const match = newRounds[roundIndex][matchIndex];
  
  if (teamIndex === 0) match.p1Wins = newWins;
  else match.p2Wins = newWins;

  const winsRequired = matchType === 'bestOf3' ? 2 : 1;
  let winner: Team | null = null;
  
  if (match.p1Wins >= winsRequired) winner = match.p1;
  else if (match.p2Wins >= winsRequired) winner = match.p2;

  match.winner = winner;
  
  let champion: Team | null = null;

  if (winner) {
    champion = propagateWinner(newRounds, roundIndex, matchIndex, winner);
    // After a manual win, we might need to resolve subsequent byes
    const res = resolveByes(newRounds); 
    if (res.champion) champion = res.champion;
  }

  return { newRounds, champion };
};

// --- Assignment Logic ---

// Standard: Pure Recursive Split. 
const assignStandard = (teams: Team[], slots: (Team | null)[], startIndex: number, count: number) => {
    if (teams.length === 0) return;
    
    if (teams.length === 1) {
        slots[startIndex] = teams[0];
        return;
    }
    
    const halfCount = count / 2;
    const halfTeams = Math.ceil(teams.length / 2);
    
    const leftTeams = teams.slice(0, halfTeams);
    const rightTeams = teams.slice(halfTeams);
    
    assignStandard(leftTeams, slots, startIndex, halfCount);
    assignStandard(rightTeams, slots, startIndex + halfCount, halfCount);
};

// Compact: Eager Pairing.
const assignCompact = (teams: Team[], slots: (Team | null)[], startIndex: number, count: number) => {
    if (teams.length === 0) return;

    if (teams.length === 1) {
        slots[startIndex] = teams[0];
        return;
    }

    // Force Pair Rule: Minimize Round 1 empty slots
    if (teams.length === 2) {
        slots[startIndex] = teams[0];
        slots[startIndex + 1] = teams[1];
        return;
    }
    
    const halfCount = count / 2;
    const halfTeams = Math.ceil(teams.length / 2);
    
    const leftTeams = teams.slice(0, halfTeams);
    const rightTeams = teams.slice(halfTeams);
    
    assignCompact(leftTeams, slots, startIndex, halfCount);
    assignCompact(rightTeams, slots, startIndex + halfCount, halfCount);
};

export const generateBalancedAssignments = (
    teams: Team[], 
    capacity: number, 
    mode: BracketMode, 
    layout: LayoutMode
): (Team | null)[] => {
  const slots: (Team | null)[] = new Array(capacity).fill(null);
  const shuffled = [...teams].sort(() => 0.5 - Math.random());
  
  // If Double Layout, we strictly split into Left/Right sub-trees at the root.
  // If Single Layout, we treat the pool as one block, though Standard/Compact logic will still split recursively.
  // Splitting manually for Double ensures that we fill the "visual" left side and "visual" right side evenly.
  
  if (layout === 'double') {
      const leftCapacity = capacity / 2;
      const leftTeamCount = Math.ceil(shuffled.length / 2);
      
      const leftTeams = shuffled.slice(0, leftTeamCount);
      const rightTeams = shuffled.slice(leftTeamCount);
      
      if (mode === 'compact') {
          assignCompact(leftTeams, slots, 0, leftCapacity);
          assignCompact(rightTeams, slots, leftCapacity, leftCapacity);
      } else {
          assignStandard(leftTeams, slots, 0, leftCapacity);
          assignStandard(rightTeams, slots, leftCapacity, leftCapacity);
      }
  } else {
      // Single Layout
      if (mode === 'compact') {
          assignCompact(shuffled, slots, 0, capacity);
      } else {
          assignStandard(shuffled, slots, 0, capacity);
      }
  }
  
  return slots;
};

// Check if a specific slot (p1 or p2) in a match has an "active" input path.
export const hasInput = (rounds: Match[][], roundIndex: number, matchIndex: number, player: 'p1' | 'p2'): boolean => {
    const match = rounds[roundIndex][matchIndex];
    if (player === 'p1' && match.p1) return true;
    if (player === 'p2' && match.p2) return true;
    if (roundIndex === 0) return false;
    const prevRoundIndex = roundIndex - 1;
    const feederMatchIndex = matchIndex * 2 + (player === 'p1' ? 0 : 1);
    return hasInput(rounds, prevRoundIndex, feederMatchIndex, 'p1') || 
           hasInput(rounds, prevRoundIndex, feederMatchIndex, 'p2');
};

export const isMatchReachable = (rounds: Match[][], roundIndex: number, matchIndex: number): boolean => {
    return hasInput(rounds, roundIndex, matchIndex, 'p1') || hasInput(rounds, roundIndex, matchIndex, 'p2');
};

export const resolveByes = (rounds: Match[][]): { newRounds: Match[][]; champion: Team | null } => {
  const newRounds = rounds;
  let champion: Team | null = null;
  
  for (let r = 0; r < newRounds.length; r++) {
      const round = newRounds[r];
      
      for (let m = 0; m < round.length; m++) {
          const match = round[m];
          if (match.winner) continue;
          
          const p1Active = hasInput(newRounds, r, m, 'p1');
          const p2Active = hasInput(newRounds, r, m, 'p2');
          
          if (p1Active && !p2Active) {
             if (match.p1) {
                 match.winner = match.p1;
                 const c = propagateWinner(newRounds, r, m, match.p1);
                 if (c) champion = c;
             }
          } 
          else if (!p1Active && p2Active) {
             if (match.p2) {
                 match.winner = match.p2;
                 const c = propagateWinner(newRounds, r, m, match.p2);
                 if (c) champion = c;
             }
          }
      }
  }
  
  return { newRounds, champion };
};