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
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-2 border-zinc-900 dark:border-zinc-500 pl-4 italic mb-6 text-zinc-600 dark:text-zinc-400 font-serif" {...props} />,
  }), [isDarkMode]);

  useLayoutEffect(() => {
    if (!hiddenRenderRef.current) return;

    // Helper: Split a node that is too tall into two parts [fits, overflows]
    const splitNode = (node: HTMLElement, maxLimit: number): [HTMLElement | null, HTMLElement | null] => {
      const clone1 = node.cloneNode(false) as HTMLElement; // Part for current page
      const clone2 = node.cloneNode(false) as HTMLElement; // Part for next page

      // Adjust margins to look seamless across pages
      clone1.style.marginBottom = '0';
      clone2.style.marginTop = '0';
      // If it's an ordered list, we ideally want to update the 'start' attribute of clone2, 
      // but simpler for now to just let it continue visually.

      // We need a temp container inside the hidden renderer to measure the split parts
      // properly inheriting styles (width, font, etc)
      hiddenRenderRef.current?.appendChild(clone1);

      const children = Array.from(node.childNodes);
      let overflowed = false;

      for (const child of children) {
        if (overflowed) {
          clone2.appendChild(child.cloneNode(true));
          continue;
        }

        // Try adding the whole child
        const childClone = child.cloneNode(true);
        clone1.appendChild(childClone);

        if (clone1.offsetHeight > maxLimit) {
          // The child caused an overflow.
          clone1.removeChild(childClone); // Remove it
          
          // Can we split this child?
          // We split if it is a Text Node or an Element like <span>/<strong>/<p> (but usually we are splitting P or UL here)
          
          // Case 1: Text Node (Split by words)
          if (child.nodeType === Node.TEXT_NODE && child.textContent) {
             const words = child.textContent.split(/(\s+)/); // Split keeping delimiters to preserve spacing
             let currentText = '';
             const textNode = document.createTextNode('');
             clone1.appendChild(textNode);
             
             let splitIndex = -1;
             
             for(let i=0; i<words.length; i++) {
                const prevText = currentText;
                currentText += words[i];
                textNode.textContent = currentText;
                
                if (clone1.offsetHeight > maxLimit) {
                   // Revert
                   textNode.textContent = prevText;
                   splitIndex = i;
                   break;
                }
             }

             if (splitIndex !== -1) {
                // We found a split point
                const remainingText = words.slice(splitIndex).join('');
                clone2.appendChild(document.createTextNode(remainingText));
                overflowed = true;
             } else {
                // Even the first word didn't fit.
                // If clone1 is empty, we must put content in clone2 (it's just too big for the space).
                // But usually this means we force it to next page entirely.
                clone1.removeChild(textNode);
                clone2.appendChild(child.cloneNode(true));
                overflowed = true;
             }
          } 
          // Case 2: Element Node (e.g. a bold span or a list item)
          else if (child.nodeType === Node.ELEMENT_NODE) {
             // If it's a List Item inside a UL/OL, simply move the LI to next page
             if (node.tagName === 'UL' || node.tagName === 'OL') {
                clone2.appendChild(child.cloneNode(true));
                overflowed = true;
             } else {
                // It's a span or strong inside a paragraph. 
                // Recursively split ONLY if it's a block-like structure or long inline.
                // For simplicity/performance, if an inline tag (like a highlighted word) doesn't fit, 
                // we move the whole tag to the next page.
                clone2.appendChild(child.cloneNode(true));
                overflowed = true;
             }
          } else {
             clone2.appendChild(child.cloneNode(true));
             overflowed = true;
          }
        }
      }

      // Cleanup temp measurement
      hiddenRenderRef.current?.removeChild(clone1);

      // If nothing fit in clone1, return null for it (implies whole block moves)
      // If everything fit in clone1, return null for clone2
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
      const MAX_PAGE_HEIGHT = 790; 

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
           const remainingSpace = MAX_PAGE_HEIGHT - currentHeight - marginTop; // Subtract margin of the node we are trying to add

           // If remaining space is tiny (e.g. < 40px), just break page. 
           // Otherwise, try to split.
           // Only split P, UL, OL, BLOCKQUOTE. Don't split Headings (H1-H6) or Images.
           const canSplit = ['P', 'UL', 'OL', 'BLOCKQUOTE', 'DIV'].includes(node.tagName) && remainingSpace > 40;
           
           if (canSplit) {
              const [part1, part2] = splitNode(node, remainingSpace);

              if (part1) {
                 currentPageNodes.push(part1);
                 // We don't update currentHeight strictly because we are about to flush
              }

              // Flush current page
              if (currentPageNodes.length > 0) {
                 newPages.push(currentPageNodes.map(n => n.outerHTML).join(''));
              }
              
              // Reset for next page
              currentPageNodes = [];
              currentHeight = 0;

              // If we have a remainder, put it back at start of queue
              if (part2) {
                 queue.unshift(part2);
              } else if (!part1) {
                 // If part1 was null (nothing fit) and part2 is null (everything fit? impossible here), 
                 // or split failed completely, just force original node to next page.
                 queue.unshift(node); 
              }
           } else {
              // Cannot split or no space. Flush current page.
              if (currentPageNodes.length > 0) {
                 newPages.push(currentPageNodes.map(n => n.outerHTML).join(''));
              }
              currentPageNodes = [];
              currentHeight = 0;
              
              // Process node again on new page
              // Note: If a single node is taller than MAX_PAGE_HEIGHT (e.g. huge image), 
              // this logic simply puts it on a page by itself and lets it overflow visually (CSS hidden)
              // checking currentHeight === 0 avoids infinite loop
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
    }, 300); // Slight delay to ensure React rendering is stable

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