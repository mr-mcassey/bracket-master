import React, { useState } from 'react';
import { Team, DragData } from '../types';
import DraggableTeam from './DraggableTeam';

interface WinPipProps {
  active: boolean;
  onClick: () => void;
  disabled: boolean;
}

const WinPip: React.FC<WinPipProps> = ({ active, onClick, disabled }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    disabled={disabled}
    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
      active 
        ? 'bg-blue-500 border-blue-600 scale-110' 
        : 'bg-white border-gray-300 hover:border-blue-400'
    } ${disabled && !active ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    {active && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
  </button>
);

interface BracketSlotProps {
  team: Team | null;
  slotIndex: number;
  isDrafting: boolean;
  onDrop: (dragData: DragData, targetSlotIndex: number) => void;
  onDragStart: (e: React.DragEvent, team: Team, sourceSlotIndex?: number) => void;
  wins: number;
  requiredWins: number;
  onWinClick: (winIndex: number) => void;
  disabled: boolean;
  isWinner: boolean;
  isBye?: boolean;
  isWaiting?: boolean;
}

const BracketSlot: React.FC<BracketSlotProps> = ({
  team,
  slotIndex,
  isDrafting,
  onDrop,
  onDragStart,
  wins,
  requiredWins,
  onWinClick,
  disabled,
  isWinner,
  isBye = false,
  isWaiting = false,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (isDrafting) setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isDrafting) {
      const raw = e.dataTransfer.getData('team');
      if (raw) {
        const data: DragData = JSON.parse(raw);
        onDrop(data, slotIndex);
      }
    }
  };

  if (isDrafting) {
    return (
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          flex-1 h-10 rounded border-2 border-dashed transition-colors flex items-center px-1
          ${isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}
          ${team ? 'border-solid border-gray-300 bg-white' : ''}
        `}
      >
        {team ? (
          <DraggableTeam 
            team={team} 
            onDragStart={onDragStart} 
            sourceSlotIndex={slotIndex}
            className="w-full h-full border-0 shadow-none bg-transparent"
          />
        ) : (
          <span className="text-xs text-gray-300 w-full text-center select-none">Drop Team</span>
        )}
      </div>
    );
  }

  // Play Mode View
  let displayText = 'Empty';
  if (team) displayText = team.name;
  else if (isBye) displayText = 'Bye';
  else if (isWaiting) displayText = '?';

  const textClass = team ? 'text-gray-700' : (isBye || isWaiting ? 'text-gray-400 italic' : 'text-gray-300 italic');
  const bgClass = isWinner ? 'bg-green-50 border-green-200 ring-1 ring-green-400' : 'bg-gray-50 border-transparent';
  // Fade out empty non-bye non-waiting slots
  const opacityClass = !team && !isBye && !isWaiting ? 'opacity-40' : '';

  return (
    <div className={`
      flex items-center justify-between p-2 rounded h-10 flex-1 border transition-all
      ${bgClass} ${opacityClass}
    `}>
      <span className={`text-sm font-medium truncate flex-1 ${textClass}`}>
        {displayText}
      </span>
      {team && (
        <div className="flex gap-1 ml-2">
           {[...Array(requiredWins)].map((_, i) => (
             <WinPip 
                key={i} 
                active={i < wins} 
                disabled={disabled}
                onClick={() => onWinClick(i)}
             />
           ))}
        </div>
      )}
    </div>
  );
};

export default BracketSlot;