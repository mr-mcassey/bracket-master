import React from 'react';
import { AlertCircle, AlertTriangle, X, CheckCircle } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: 'error' | 'success' | 'info' | 'warning';
  onConfirm?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

const Modal: React.FC<ModalProps> = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  type = 'info',
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
      switch(type) {
          case 'error': return <AlertCircle size={24} className="text-red-500" />;
          case 'warning': return <AlertTriangle size={24} className="text-amber-500" />;
          case 'success': return <CheckCircle size={24} className="text-green-500" />;
          default: return <div className="font-bold text-xl text-blue-500">i</div>;
      }
  };

  const getBgClass = () => {
      switch(type) {
          case 'error': return 'bg-red-100';
          case 'warning': return 'bg-amber-100';
          case 'success': return 'bg-green-100';
          default: return 'bg-blue-100';
      }
  };

  const getButtonClass = () => {
      switch(type) {
          case 'error': return 'bg-red-600 hover:bg-red-700';
          case 'warning': return 'bg-amber-500 hover:bg-amber-600';
          case 'success': return 'bg-green-600 hover:bg-green-700';
          default: return 'bg-gray-900 hover:bg-gray-800';
      }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200 relative">
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
            <X size={20} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${getBgClass()}`}>
            {getIcon()}
          </div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
          <div className="text-gray-600 mb-6 w-full text-sm whitespace-pre-line">{children}</div>
          
          <div className="flex gap-3 w-full">
            {onConfirm && (
                <button 
                    onClick={onClose}
                    className="flex-1 py-2.5 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                    {cancelLabel}
                </button>
            )}
            <button 
                onClick={onConfirm || onClose}
                className={`flex-1 py-2.5 rounded-lg font-medium text-white transition-colors ${getButtonClass()}`}
            >
                {onConfirm ? confirmLabel : (type === 'error' ? 'Fix Issues' : 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;