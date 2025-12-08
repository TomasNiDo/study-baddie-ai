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
    h1: ({node, ...props}: any) => <h1 className="font-serif text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-8 mt-8 leading-[4rem]" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-serif text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-8 mt-8 leading-[4rem]" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="font-serif text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-8 mt-8 leading-[2rem]" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-8 leading-[2rem] text-zinc-700 dark:text-zinc-300" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-8 space-y-0 text-zinc-700 dark:text-zinc-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-8 space-y-0 text-zinc-700 dark:text-zinc-300" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-[2rem] pl-2 marker:text-zinc-400" {...props} />,
    // Highlight styling: Simplified for export stability
    // Light mode: Yellow-200/50 background (Highlighter style with transparency to prevent text blocking)
    // Dark mode: Zinc-100 background (High Contrast Pop)
    // Removed vertical padding (py-0.5) to reduce height and prevent clipping/overlapping with lines above in exports
    strong: ({node, ...props}: any) => (
      <strong 
        className="font-bold text-zinc-950 dark:text-zinc-950 bg-yellow-200/50 dark:bg-zinc-100 px-1 rounded-sm mx-0.5" 
        {...props} 
      />
    ),
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-zinc-900 dark:border-zinc-500 pl-4 italic mb-8 text-zinc-600 dark:text-zinc-400 font-serif" {...props} />,
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
    <div className="min-h-full p-6 md:p-12 flex justify-center bg-zinc-50 dark:bg-zinc-950">
       {/* Paper / Notebook Design */}
       <div 
         id="summary-content"
         ref={ref} 
         className="relative w-full max-w-3xl bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 min-h-[1200px] font-hand text-lg md:text-xl transition-colors duration-500 pb-20"
         style={{
           // Paper Lines Pattern - Subtle Gray
           backgroundImage: `
             linear-gradient(90deg, transparent 79px, ${isDarkMode ? '#3f3f46' : '#e4e4e7'} 79px, ${isDarkMode ? '#3f3f46' : '#e4e4e7'} 80px, transparent 80px),
             linear-gradient(to bottom, transparent 31px, ${isDarkMode ? '#27272a' : '#f4f4f5'} 31px)
           `,
           backgroundSize: '100% 32px',
           backgroundAttachment: 'local'
         }}
       >
          {/* Binder Holes - Grayscale */}
          <div 
              className="absolute top-0 left-0 bottom-0 w-20 z-10"
              style={{
                  backgroundImage: `radial-gradient(circle at 10px center, ${isDarkMode ? '#09090b' : '#f4f4f5'} 6px, transparent 7px)`,
                  backgroundSize: '20px 32px', 
                  backgroundPosition: '10px 16px', 
                  backgroundRepeat: 'repeat-y'
              }}
          ></div>

          {/* Content Container */}
          <div className="pl-24 pr-12 pt-12 md:pl-28 md:pr-16">
             {/* Header Title on Paper */}
             <div className="border-b border-zinc-900 dark:border-zinc-700 pb-4 mb-6">
                 <h1 className="font-serif text-4xl font-bold text-zinc-900 dark:text-white mb-0 leading-[3rem] tracking-tight">
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
            <div className="absolute inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-[1px] z-20 transition-all duration-300">
               <div className="sticky top-[45vh] flex flex-col items-center">
                  <div className="bg-white dark:bg-zinc-900 p-4 rounded-full shadow-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 animate-in zoom-in">
                     <RefreshCw className="w-5 h-5 text-zinc-900 dark:text-white animate-spin" />
                     <span className="font-medium text-zinc-900 dark:text-white font-serif">Regenerating...</span>
                  </div>
               </div>
            </div>
          )}
       </div>
    </div>
  );
});

export default Notebook;