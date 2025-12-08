import React, { forwardRef, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { RefreshCw } from 'lucide-react';
import { StudySession } from '../types';

interface NotebookProps {
  session: StudySession;
  isRegenerating: boolean;
  onTextSelection: (selection: { x: number; y: number; text: string } | null) => void;
  isDarkMode: boolean; // Needed for background styles
}

const Notebook = forwardRef<HTMLDivElement, NotebookProps>(({ 
  session, 
  isRegenerating, 
  onTextSelection,
  isDarkMode 
}, ref) => {

  // Memoize markdown components to prevent re-renders breaking text selection
  const markdownComponents = useMemo(() => ({
    h1: ({node, ...props}: any) => <h1 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300 mb-8 mt-8 leading-[4rem]" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-8 mt-8 leading-[4rem]" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-8 mt-8 leading-[2rem]" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-8 leading-[2rem] text-slate-700 dark:text-slate-300" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-8 space-y-0 text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-8 space-y-0 text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-[2rem] pl-2 marker:text-slate-500" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-indigo-950 dark:text-purple-100 bg-lime-400 dark:bg-purple-900/60 px-1 rounded box-decoration-clone" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-slate-400 pl-4 italic mb-8 text-slate-600 dark:text-slate-400" {...props} />,
  }), []);

  // Handle Text Selection
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Ignore clicks inside the tooltip menu itself (checked via class name in TooltipMenu)
      if ((e.target as HTMLElement).closest('.selection-menu-container')) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        onTextSelection(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        onTextSelection(null);
        return;
      }

      // Ensure selection is inside the notebook
      // We need to check against the ref, but ref is forwarded. 
      // To simplify, we rely on the parent or just check if the selection anchorNode is within this component's ID.
      const notebookEl = document.getElementById('summary-content');
      if (notebookEl && !notebookEl.contains(selection.anchorNode)) {
         onTextSelection(null);
         return;
      }

      // Get Coordinates
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      onTextSelection({
        x: rect.left + (rect.width / 2),
        y: rect.top - 10,
        text: text
      });
    };

    const handleScroll = () => onTextSelection(null);

    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('scroll', handleScroll, true); 

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [onTextSelection]);

  return (
    <div className="min-h-full p-4 md:p-8 flex justify-center">
       {/* Paper / Notebook Design */}
       <div 
         id="summary-content"
         ref={ref} 
         className="relative w-full max-w-4xl bg-[#fef9c3] dark:bg-[#1e293b] shadow-2xl border border-black/5 dark:border-slate-700 min-h-[1200px] font-hand text-lg md:text-xl transition-colors duration-500 pb-20"
         style={{
           // Paper Lines Pattern
           backgroundImage: `
             linear-gradient(90deg, transparent 79px, #ab47bc 79px, #ab47bc 81px, transparent 81px),
             linear-gradient(to bottom, transparent 31px, ${isDarkMode ? '#334155' : '#e2e8f0'} 31px)
           `,
           backgroundSize: '100% 32px',
           backgroundAttachment: 'local'
         }}
       >
          {/* Binder Holes */}
          <div 
              className="absolute top-0 left-0 bottom-0 w-20 z-10"
              style={{
                  backgroundImage: `radial-gradient(circle at 10px center, ${isDarkMode ? '#020617' : '#cbd5e1'} 6px, transparent 7px)`,
                  backgroundSize: '20px 32px', 
                  backgroundPosition: '10px 16px', 
                  backgroundRepeat: 'repeat-y'
              }}
          ></div>

          {/* Content Container */}
          <div className="pl-24 pr-8 pt-8 md:pl-28 md:pr-12">
             {/* Header Title on Paper */}
             <div className="border-b-2 border-slate-300 dark:border-slate-600 pb-2 mb-4">
                 <h1 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-0 leading-[3rem]">
                     {session?.title}
                 </h1>
             </div>
             
             {/* Markdown Content */}
             <div className="relative z-0">
                 <ReactMarkdown components={markdownComponents}>
                   {session.summary}
                 </ReactMarkdown>
             </div>
          </div>

          {/* Regenerating Overlay */}
          {isRegenerating && (
            <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px] z-20 transition-all duration-300">
               <div className="sticky top-[45vh] flex flex-col items-center">
                  <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 flex items-center gap-3 animate-in zoom-in">
                     <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
                     <span className="font-bold text-gray-700 dark:text-white">Regenerating Notes...</span>
                  </div>
               </div>
            </div>
          )}
       </div>
    </div>
  );
});

export default Notebook;