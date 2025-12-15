import React, { useState } from 'react';
import { X, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { RegenerateOptions, SummaryLength, SummaryFocus, SummaryTone } from '../types';

interface RegenerateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: RegenerateOptions) => void;
}

const RegenerateModal: React.FC<RegenerateModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [length, setLength] = useState<SummaryLength>('Medium');
  const [focus, setFocus] = useState<SummaryFocus>('Overview');
  const [tone, setTone] = useState<SummaryTone>('Explanatory');

  if (!isOpen) return null;

  const lengths: SummaryLength[] = ['Short', 'Medium', 'Long'];
  const focuses: SummaryFocus[] = ['Overview', 'Exam-prep', 'Definitions & Concepts', 'Deep-dive'];
  const tones: SummaryTone[] = ['Concise', 'Explanatory', 'Step-by-step'];

  const OptionGroup = ({ 
    label, 
    options, 
    selected, 
    onSelect 
  }: { 
    label: string, 
    options: string[], 
    selected: string, 
    onSelect: (val: any) => void 
  }) => (
    <div className="mb-6">
      <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-3">{label}</label>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onSelect(opt)}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-all border ${
              selected === opt 
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100' 
                : 'bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-zinc-200 dark:border-zinc-800 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
               <SlidersHorizontal className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
            </div>
            <h3 className="font-serif font-bold text-xl text-zinc-900 dark:text-white">Regenerate Note</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
            Customize how the AI summarizes your document. This will replace your current summary.
          </p>
          
          <OptionGroup label="Length" options={lengths} selected={length} onSelect={setLength} />
          <OptionGroup label="Focus" options={focuses} selected={focus} onSelect={setFocus} />
          <OptionGroup label="Tone" options={tones} selected={tone} onSelect={setTone} />
        </div>

        {/* Footer */}
        <div className="p-6 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
           >
             Cancel
           </button>
           <button 
             onClick={() => onConfirm({ length, focus, tone })}
             className="flex items-center gap-2 px-5 py-2 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg text-sm font-bold shadow-sm hover:shadow-md hover:opacity-90 transition-all"
           >
             <RefreshCw className="w-4 h-4" />
             Regenerate
           </button>
        </div>
      </div>
    </div>
  );
};

export default RegenerateModal;