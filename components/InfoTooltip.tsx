import React from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  title: string;
  description: string;
  strengths: string;
  weaknesses: string;
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, description, strengths, weaknesses }) => {
  return (
    <div className="group relative flex items-center">
      <Info size={14} className="text-gray-400 hover:text-blue-500 cursor-help transition-colors" />
      <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 shadow-xl pointer-events-none">
        <h4 className="font-bold text-blue-300 mb-1">{title}</h4>
        <p className="mb-2 leading-relaxed text-gray-300">{description}</p>
        <div className="space-y-1 border-t border-gray-700 pt-2">
            <div>
                <span className="text-green-400 font-bold">Strengths: </span>
                <span className="text-gray-400">{strengths}</span>
            </div>
            <div>
                <span className="text-red-400 font-bold">Weaknesses: </span>
                <span className="text-gray-400">{weaknesses}</span>
            </div>
        </div>
        <div className="absolute left-1/2 -translate-x-1/2 top-full w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
    </div>
  );
};

export default InfoTooltip;