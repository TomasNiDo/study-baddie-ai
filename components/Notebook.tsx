import React, { forwardRef, useEffect, useMemo, useState, useRef, useLayoutEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { RefreshCw } from 'lucide-react';
import { StudySession } from '../types';

interface NotebookProps {
  session: StudySession;
  isRegenerating: boolean;
  onTextSelection: (selection: { x: number; y: number; text: string } | null) => void;
  isDarkMode: boolean;
}

const Notebook = forwardRef<HTMLDivElement, NotebookProps>(({ 
  session, 
  isRegenerating, 
  onTextSelection,
  isDarkMode 
}, ref) => {
  const [pages, setPages] = useState<string[]>([]);
  const hiddenRenderRef = useRef<HTMLDivElement>(null);
  
  const markdownComponents = useMemo(() => ({
    h1: ({node, ...props}: any) => <h1 className="font-serif text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4 mt-6 leading-none" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="font-serif text-2xl font-bold text-zinc-800 dark:text-zinc-200 mb-4 mt-6 leading-none" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="font-serif text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-3 mt-4 leading-tight" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-6 leading-[2.2rem] text-zinc-700 dark:text-zinc-300" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-6 space-y-1 text-zinc-700 dark:text-zinc-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-6 space-y-1 text-zinc-700 dark:text-zinc-300" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-[2.2rem] pl-2 marker:text-zinc-400" {...props} />,
    // PDF Export Fix:
    // Instead of applying background to the container (which html2canvas renders as one big box on wrap),
    // we split text into individual segments (words/spaces). 
    // This forces independent bounding boxes for each segment, ensuring the highlight flows correctly across lines in the PDF.
    strong: ({node, children, ...props}: any) => {
      const highlightColor = isDarkMode ? '#e4e4e7' : '#fef08a';
      
      return (
        <strong className="font-bold text-zinc-950 dark:text-zinc-950" {...props}>
          {React.Children.map(children, (child) => {
            if (typeof child === 'string') {
              // Split text by whitespace, preserving the whitespace segments
              return child.split(/(\s+)/).filter(part => part.length > 0).map((part, index) => (
                <span
                  key={index}
                  style={{
                    backgroundColor: highlightColor,
                    display: 'inline',
                    boxDecorationBreak: 'clone',
                    WebkitBoxDecorationBreak: 'clone',
                    padding: '2px 0',
                    borderRadius: '2px'
                  }}
                >
                  {part}
                </span>
              ));
            }
            // Fallback for non-string children (e.g., nested elements)
            return (
              <span style={{ 
                backgroundColor: highlightColor,
                padding: '2px 0',
                borderRadius: '2px'
              }}>
                {child}
              </span>
            );
          })}
        </strong>
      );
    },
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-zinc-900 dark:border-zinc-500 pl-4 italic mb-6 text-zinc-600 dark:text-zinc-400 font-serif" {...props} />,
  }), [isDarkMode]);

  useLayoutEffect(() => {
    if (!hiddenRenderRef.current) return;
    const timeout = setTimeout(() => {
      if (!hiddenRenderRef.current) return;
      const contentNodes = Array.from(hiddenRenderRef.current.children) as HTMLElement[];
      const newPages: string[] = [];
      let currentPageNodes: HTMLElement[] = [];
      let currentHeight = 0;
      const MAX_PAGE_HEIGHT = 790; 

      contentNodes.forEach((node) => {
        const nodeHeight = node.offsetHeight;
        const style = window.getComputedStyle(node);
        const marginTop = parseInt(style.marginTop) || 0;
        const marginBottom = parseInt(style.marginBottom) || 0;
        const totalNodeHeight = nodeHeight + marginTop + marginBottom;

        if (currentHeight + totalNodeHeight > MAX_PAGE_HEIGHT && currentPageNodes.length > 0) {
          newPages.push(currentPageNodes.map(n => n.outerHTML).join(''));
          currentPageNodes = [node];
          currentHeight = totalNodeHeight;
        } else {
          currentPageNodes.push(node);
          currentHeight += totalNodeHeight;
        }
      });

      if (currentPageNodes.length > 0) {
        newPages.push(currentPageNodes.map(n => n.outerHTML).join(''));
      }
      setPages(newPages);
    }, 200);
    return () => clearTimeout(timeout);
  }, [session.summary, markdownComponents]);

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.selection-menu-container')) return;
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
    <div ref={ref} className="min-h-full p-6 md:p-12 flex flex-col items-center bg-zinc-50 dark:bg-zinc-950 gap-8">
       <div 
         ref={hiddenRenderRef} 
         className="absolute top-0 left-0 invisible w-[816px] pl-28 pr-16 pointer-events-none font-hand text-lg md:text-xl"
         aria-hidden="true"
       >
          <ReactMarkdown components={markdownComponents}>
             {session.summary}
          </ReactMarkdown>
       </div>

       {pages.length === 0 && (
         <div className="w-[816px] h-[1056px] bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 animate-pulse" />
       )}

       {pages.map((pageHtml, index) => (
          <div 
            key={index}
            className="print-page relative flex-none w-[816px] h-[1056px] bg-white dark:bg-zinc-900 shadow-xl border border-zinc-200 dark:border-zinc-800 font-hand text-lg md:text-xl transition-colors duration-500 overflow-hidden"
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 79px, ${isDarkMode ? '#3f3f46' : '#e4e4e7'} 79px, ${isDarkMode ? '#3f3f46' : '#e4e4e7'} 80px, transparent 80px),
                linear-gradient(to bottom, transparent 31px, ${isDarkMode ? '#27272a' : '#f4f4f5'} 31px)
              `,
              backgroundSize: '100% 32px'
            }}
          >
             <div 
                 className="absolute top-0 left-0 bottom-0 w-20 z-10"
                 style={{
                     backgroundImage: `radial-gradient(circle at 10px center, ${isDarkMode ? '#09090b' : '#f4f4f5'} 6px, transparent 7px)`,
                     backgroundSize: '20px 32px', 
                     backgroundPosition: '10px 16px', 
                     backgroundRepeat: 'repeat-y'
                 }}
             ></div>

             <div className="pl-28 pr-16 pt-12 pb-12 h-full relative">
                {index === 0 && (
                   <div className="border-b border-zinc-900 dark:border-zinc-700 pb-4 mb-6">
                       <h1 className="font-serif text-4xl font-bold text-zinc-900 dark:text-white mb-0 leading-none tracking-tight">
                           {session?.title}
                       </h1>
                   </div>
                )}
                <div className="page-content" dangerouslySetInnerHTML={{ __html: pageHtml }} />
                <div className="absolute bottom-4 right-8 text-[10px] text-zinc-400 font-mono uppercase tracking-widest opacity-60">
                   PAGE {index + 1}
                </div>
             </div>
          </div>
       ))}

       {isRegenerating && (
         <div className="fixed inset-0 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-[1px] z-50 flex items-center justify-center">
            <div className="bg-white dark:bg-zinc-900 p-4 rounded-full shadow-2xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3">
               <RefreshCw className="w-5 h-5 text-zinc-900 dark:text-white animate-spin" />
               <span className="font-medium text-zinc-900 dark:text-white font-serif">Regenerating...</span>
            </div>
         </div>
       )}
    </div>
  );
});

export default Notebook;