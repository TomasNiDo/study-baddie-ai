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
    // Updated leading to 32px (2rem) to match background grid
    p: ({node, ...props}: any) => <p className="mb-6 leading-[32px] text-zinc-700 dark:text-zinc-300" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-6 space-y-1 text-zinc-700 dark:text-zinc-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-6 space-y-1 text-zinc-700 dark:text-zinc-300" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-[32px] pl-2 marker:text-zinc-400" {...props} />,
    // PDF Export Fix:
    strong: ({node, children, ...props}: any) => {
      const highlightColor = isDarkMode ? '#e4e4e7' : '#fef08a';
      return (
        <strong className="font-bold text-zinc-950 dark:text-zinc-950" {...props}>
          {React.Children.map(children, (child) => {
            if (typeof child === 'string') {
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
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-zinc-900 dark:border-zinc-500 pl-4 italic mb-6 text-zinc-600 dark:text-zinc-400 font-serif leading-[32px]" {...props} />,
  }), [isDarkMode]);

  useLayoutEffect(() => {
    if (!hiddenRenderRef.current) return;

    // Split text node helper
    const splitTextNode = (textNode: Text, maxLimit: number, container: HTMLElement): [Node | null, Node | null] => {
         const words = (textNode.textContent || '').split(/(\s+)/);
         let currentText = '';
         const tempNode = document.createTextNode('');
         container.appendChild(tempNode);
         
         let splitIndex = -1;
         
         // Binary search could be faster but linear is fine for paragraph length
         for(let i=0; i<words.length; i++) {
            const prevText = currentText;
            currentText += words[i];
            tempNode.textContent = currentText;
            
            if (container.offsetHeight > maxLimit) {
               // Revert to fit
               tempNode.textContent = prevText;
               splitIndex = i;
               break;
            }
         }
         
         container.removeChild(tempNode);

         if (splitIndex !== -1) {
            const firstPart = words.slice(0, splitIndex).join('');
            const secondPart = words.slice(splitIndex).join('');
            return [document.createTextNode(firstPart), document.createTextNode(secondPart)];
         }
         
         // If we didn't split (it either all fits or none fits)
         // We rely on caller to check height. 
         // But here we assume we were called because it DOES NOT fit fully.
         // If splitIndex was never set, it means even the first word might be too big? 
         // Or loop finished and it all fit (contradiction).
         // If loop finished and it all fit, splitIndex is -1. 
         
         // For this logic, if we reached here and splitIndex is -1, it means the whole text fits?
         // No, the caller says "clone1.offsetHeight > maxLimit".
         // So at least the whole text didn't fit.
         // If splitIndex is still -1, it means the very first word was too big.
         if (words.length > 0) {
            return [null, document.createTextNode(words.join(''))];
         }
         return [null, null];
    };

    // Helper: Split a node that is too tall into two parts [fits, overflows]
    const splitNode = (node: HTMLElement, maxLimit: number): [HTMLElement | null, HTMLElement | null] => {
      const clone1 = node.cloneNode(false) as HTMLElement; // Part for current page
      const clone2 = node.cloneNode(false) as HTMLElement; // Part for next page

      // Adjust margins to look seamless across pages
      clone1.style.marginBottom = '0';
      clone2.style.marginTop = '0';
      
      // We need a temp container inside the hidden renderer to measure the split parts
      hiddenRenderRef.current?.appendChild(clone1);

      const children = Array.from(node.childNodes);
      let overflowed = false;

      for (const child of children) {
        if (overflowed) {
          clone2.appendChild(child.cloneNode(true));
          continue;
        }

        const childClone = child.cloneNode(true);
        clone1.appendChild(childClone);

        if (clone1.offsetHeight > maxLimit) {
          clone1.removeChild(childClone); // Remove the one that caused overflow
          
          // Calculate exact remaining space
          const currentHeight = clone1.offsetHeight;
          const remainingSpace = maxLimit - currentHeight;

          // Try to split the child itself if it's a splittable type
          const isSplittable = child.nodeType === Node.TEXT_NODE || 
             (child.nodeType === Node.ELEMENT_NODE && ['P', 'DIV', 'BLOCKQUOTE', 'LI'].includes((child as HTMLElement).tagName));
          
          // Only attempt split if we have a decent amount of space (e.g. > 20px)
          if (isSplittable && remainingSpace > 20) {
             let part1: Node | null = null;
             let part2: Node | null = null;

             if (child.nodeType === Node.TEXT_NODE) {
                [part1, part2] = splitTextNode(child as Text, remainingSpace + currentHeight, clone1); // pass total limit for text measuring
             } else {
                [part1, part2] = splitNode(child as HTMLElement, remainingSpace);
             }

             if (part1) {
                clone1.appendChild(part1);
                // If part1 was added, we need to ensure part2 goes to clone2
             }
             if (part2) {
                clone2.appendChild(part2);
                overflowed = true;
             } else {
                // If split failed (e.g. nothing fit), move whole child
                if (!part1) {
                   clone2.appendChild(child.cloneNode(true));
                   overflowed = true;
                }
             }
          } else {
             // Not splittable or no space, move entirely
             clone2.appendChild(child.cloneNode(true));
             overflowed = true;
          }
        }
      }

      // Cleanup temp measurement
      hiddenRenderRef.current?.removeChild(clone1);

      const res1 = clone1.hasChildNodes() ? clone1 : null;
      const res2 = clone2.hasChildNodes() ? clone2 : null;

      return [res1, res2];
    };

    const timeout = setTimeout(() => {
      if (!hiddenRenderRef.current) return;
      
      const sourceNodes = Array.from(hiddenRenderRef.current.children) as HTMLElement[];
      const newPages: string[] = [];
      let currentPageNodes: HTMLElement[] = [];
      let currentHeight = 0;
      
      // Reduced max height slightly to provide a safer buffer against font rendering differences
      const MAX_PAGE_HEIGHT = 760; 

      // We process a queue so we can push split parts back onto the queue
      const queue = [...sourceNodes];

      while (queue.length > 0) {
        const node = queue.shift();
        if (!node) continue;

        const style = window.getComputedStyle(node);
        const marginTop = parseInt(style.marginTop) || 0;
        const marginBottom = parseInt(style.marginBottom) || 0;
        const nodeHeight = node.offsetHeight;
        const totalNodeHeight = nodeHeight + marginTop + marginBottom;

        // Does it fit?
        if (currentHeight + totalNodeHeight <= MAX_PAGE_HEIGHT) {
           currentPageNodes.push(node);
           currentHeight += totalNodeHeight;
        } else {
           // It doesn't fit.
           const remainingSpace = MAX_PAGE_HEIGHT - currentHeight - marginTop; 

           // Try to split
           const canSplit = ['P', 'UL', 'OL', 'BLOCKQUOTE', 'DIV'].includes(node.tagName) && remainingSpace > 40;
           
           if (canSplit) {
              const [part1, part2] = splitNode(node, remainingSpace);

              if (part1) {
                 currentPageNodes.push(part1);
              }

              // Flush current page
              if (currentPageNodes.length > 0) {
                 newPages.push(currentPageNodes.map(n => n.outerHTML).join(''));
              }
              
              // Reset for next page
              currentPageNodes = [];
              currentHeight = 0;

              if (part2) {
                 queue.unshift(part2);
              } else if (!part1) {
                 // Split returned nothing for page 1, force node to next page
                 queue.unshift(node); 
              }
           } else {
              // Cannot split or no space. Flush current page.
              if (currentPageNodes.length > 0) {
                 newPages.push(currentPageNodes.map(n => n.outerHTML).join(''));
              }
              currentPageNodes = [];
              currentHeight = 0;
              
              if (currentHeight === 0) {
                 currentPageNodes.push(node);
                 currentHeight += totalNodeHeight;
              } else {
                 queue.unshift(node);
              }
           }
        }
      }

      // Flush final page
      if (currentPageNodes.length > 0) {
        newPages.push(currentPageNodes.map(n => n.outerHTML).join(''));
      }
      setPages(newPages);
    }, 300); 

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
       {/* Hidden Render Container: Used for initial render and measurements */}
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

export default React.memo(Notebook);