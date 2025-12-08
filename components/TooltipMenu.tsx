import React from 'react';
import { MessageSquare, Zap, CircleHelp, Lightbulb, Brain } from 'lucide-react';

interface TooltipMenuProps {
  x: number;
  y: number;
  onAction: (e: React.MouseEvent, type: 'explain' | 'simplify' | 'quiz' | 'example' | 'mnemonic') => void;
}

const TooltipMenu: React.FC<TooltipMenuProps> = ({ x, y, onAction }) => {
  return (
    <div 
      className="selection-menu-container absolute z-50 bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-white rounded-lg shadow-xl border border-slate-300 dark:border-slate-700 flex items-center p-1 gap-1 animate-in zoom-in-95 duration-200 select-none"
      style={{ 
        top: y, 
        left: x, 
        transform: 'translate(-50%, -100%)' 
      }}
    >
      <button 
         onMouseDown={(e) => onAction(e, 'explain')}
         className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors group relative"
      >
         <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
         <span className="text-[10px] font-medium">Explain</span>
      </button>
      
      <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

      <button 
         onMouseDown={(e) => onAction(e, 'simplify')}
         className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
      >
         <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
         <span className="text-[10px] font-medium">Simplify</span>
      </button>

      <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

       <button 
         onMouseDown={(e) => onAction(e, 'quiz')}
         className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
      >
         <CircleHelp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
         <span className="text-[10px] font-medium">Quiz</span>
      </button>

      <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

      <button 
         onMouseDown={(e) => onAction(e, 'example')}
         className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
      >
         <Lightbulb className="w-4 h-4 text-green-600 dark:text-green-400" />
         <span className="text-[10px] font-medium">Example</span>
      </button>

       <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

      <button 
         onMouseDown={(e) => onAction(e, 'mnemonic')}
         className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
      >
         <Brain className="w-4 h-4 text-pink-600 dark:text-pink-400" />
         <span className="text-[10px] font-medium">Mnemonic</span>
      </button>
      
      {/* Triangle Pointer */}
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-300 dark:border-slate-700 rotate-45"></div>
    </div>
  );
};

export default TooltipMenu;
