import React from 'react';
import { Match, MatchType, DragData, Team } from '../types';
import BracketSlot from './BracketSlot';

interface MatchCardProps {
  match: Match;
  roundIndex: number;
  matchIndex: number; // Index within the round
  matchType: MatchType;
  onUpdateMatch: (roundIdx: number, matchIdx: number, teamIdx: 0 | 1, wins: number) => void;
  onSlotDrop: (data: DragData, slotIdx: number) => void;
  onSlotDragStart: (e: React.DragEvent, team: Team, sourceSlotIndex?: number) => void;
  isDrafting: boolean;
  align?: 'left' | 'right' | 'center';
  p1Active?: boolean;
  p2Active?: boolean;
}

const MatchCard: React.FC<MatchCardProps> = ({
  match,
  roundIndex,
  matchIndex,
  matchType,
  onUpdateMatch,
  onSlotDrop,
  onSlotDragStart,
  isDrafting,
  align = 'right',
  p1Active = true,
  p2Active = true,
}) => {
  const isBestOf3 = matchType === 'bestOf3';
  const winsRequired = isBestOf3 ? 2 : 1;

  const isP1Winner = !!(match.winner && match.p1 && match.winner.id === match.p1.id);
  const isP2Winner = !!(match.winner && match.p2 && match.winner.id === match.p2.id);
  
  // Logic to show connector stubs
  const isUnreachable = !p1Active && !p2Active;
  const hideConnectors = isUnreachable;
  const isFirstRound = roundIndex === 0;
  
  const showLeftStub = !hideConnectors && ((align === 'left' && !isFirstRound) || (align === 'right') || (align === 'center'));
  const showRightStub = !hideConnectors && ((align === 'right' && !isFirstRound) || (align === 'left') || (align === 'center'));

  // Handle Win Clicks
  const handleScore = (teamIdx: 0 | 1) => {
    if (isDrafting || match.winner) return;
    const current = teamIdx === 0 ? match.p1Wins : match.p2Wins;
    onUpdateMatch(roundIndex, matchIndex, teamIdx, current + 1);
  };

  // State Detection
  // Bye: The path is valid (active) but no opponent comes from it (structurally empty/dead branch)
  // Waiting: The path is valid (active) but the team hasn't arrived yet (match pending)
  
  // A structural bye occurs when one side is active and the other is NOT active.
  const isP1Bye = !p1Active && p2Active;
  const isP2Bye = p1Active && !p2Active;

  // A waiting state occurs when the side IS active, but no team is present yet (and it's not a Bye situation we just defined)
  const isP1Waiting = p1Active && !match.p1;
  const isP2Waiting = p2Active && !match.p2;

  // Dynamic Styles based on state
  let opacityClass = 'opacity-100';
  let borderClass = 'border-gray-200';
  let bgClass = 'bg-white';
  
  if (isUnreachable) {
      if (isDrafting) {
          // In draft, empty branches are potential drop zones, but we ghost them to reduce clutter
          opacityClass = 'opacity-40 hover:opacity-100 transition-opacity'; 
          borderClass = 'border-dashed border-slate-300';
          bgClass = 'bg-slate-50/50';
      } else {
          // In play, empty branches are dead. Fade them out significantly.
          opacityClass = 'opacity-[0.05] grayscale pointer-events-none';
          borderClass = 'border-transparent';
          bgClass = 'bg-transparent shadow-none';
      }
  } else if (match.winner && !isDrafting) {
      // Completed matches
      opacityClass = 'opacity-60 hover:opacity-100';
  }

  return (
    <div className={`
      relative rounded-lg shadow-sm border p-3 w-60 flex-shrink-0 flex flex-col gap-2 transition-all duration-300
      ${opacityClass} ${borderClass} ${bgClass}
    `}>
      {/* Connector Lines */}
      {!isDrafting && showLeftStub && <div className="absolute -left-4 top-1/2 w-4 h-0.5 bg-gray-300"></div>}
      {!isDrafting && showRightStub && <div className="absolute -right-4 top-1/2 w-4 h-0.5 bg-gray-300"></div>}

      <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${isUnreachable ? 'text-gray-300' : 'text-gray-400'}`}>
        Match {match.id + 1}
      </div>

      {/* Slot 1 */}
      <BracketSlot 
        team={match.p1}
        slotIndex={match.sourceSlotP1} 
        isDrafting={isDrafting && isFirstRound}
        onDrop={onSlotDrop}
        onDragStart={onSlotDragStart}
        wins={match.p1Wins}
        requiredWins={winsRequired}
        onWinClick={() => handleScore(0)}
        disabled={!match.p1 || !match.p2 || !!match.winner}
        isWinner={isP1Winner}
        isBye={isP1Bye}
        isWaiting={isP1Waiting}
      />

      {/* Slot 2 */}
      <BracketSlot 
        team={match.p2}
        slotIndex={match.sourceSlotP2}
        isDrafting={isDrafting && isFirstRound}
        onDrop={onSlotDrop}
        onDragStart={onSlotDragStart}
        wins={match.p2Wins}
        requiredWins={winsRequired}
        onWinClick={() => handleScore(1)}
        disabled={!match.p1 || !match.p2 || !!match.winner}
        isWinner={isP2Winner}
        isBye={isP2Bye}
        isWaiting={isP2Waiting}
      />
    </div>
  );
};

export default MatchCard;