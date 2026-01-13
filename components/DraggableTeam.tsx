import React from 'react';
import { GripVertical, Trash2 } from 'lucide-react';
import { Team, DragData } from '../types';

interface DraggableTeamProps {
  team: Team;
  onDragStart: (e: React.DragEvent, team: Team, sourceSlotIndex?: number) => void;
  className?: string;
  allowRemove?: boolean;
  onRemove?: (id: string) => void;
  sourceSlotIndex?: number;
}

const DraggableTeam: React.FC<DraggableTeamProps> = ({ 
  team, 
  onDragStart, 
  className = '', 
  allowRemove = false, 
  onRemove,
  sourceSlotIndex = -1
}) => {
  
  const handleDragStartInternal = (e: React.DragEvent) => {
    const data: DragData = { team, sourceSlotIndex };
    // We attach the JSON to the event. In a bigger app, we might use a global DnD state.
    e.dataTransfer.setData('team', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
    onDragStart(e, team, sourceSlotIndex);
  };

  return (
    <div
      draggable
      onDragStart={handleDragStartInternal}
      className={`
        flex items-center gap-2 px-3 py-2 bg-white rounded shadow-sm border border-gray-200 
        cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-300 transition-all group
        ${className}
      `}
    >
      <GripVertical size={14} className="text-gray-400" />
      <span className="font-medium text-sm truncate select-none flex-1">{team.name}</span>
      {allowRemove && onRemove && (
        <button 
          onClick={(e) => { e.stopPropagation(); onRemove(team.id); }}
          className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

export default DraggableTeam;
