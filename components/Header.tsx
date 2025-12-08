import React, { useState } from 'react';
import { Menu, BookOpen, Layout, RefreshCw, Loader2, Download, FileIcon, Image as ImageIcon, Sun, Moon } from 'lucide-react';
import { TabView } from '../types';

interface HeaderProps {
  activeTab: TabView;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  isRegenerating: boolean;
  onRegenerate: () => void;
  isExporting: boolean;
  onExport: (type: 'pdf' | 'png') => void;
}

const Header: React.FC<HeaderProps> = ({
  activeTab,
  isDarkMode,
  toggleDarkMode,
  mobileMenuOpen,
  setMobileMenuOpen,
  isRegenerating,
  onRegenerate,
  isExporting,
  onExport
}) => {
  const [exportMenuOpen, setExportMenuOpen] = useState(false);

  return (
    <header className="h-16 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between px-4 sm:px-6 flex-none z-40">
      <div className="flex items-center gap-4">
        <button 
          className="md:hidden p-2 -ml-2 text-zinc-600 dark:text-zinc-300"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
           {activeTab === TabView.SUMMARY && <BookOpen className="w-4 h-4 text-zinc-500" />}
           {activeTab === TabView.FLASHCARDS && <Layout className="w-4 h-4 text-zinc-500" />}
           <h2 className="text-sm font-semibold text-zinc-900 dark:text-white uppercase tracking-wide">
             {activeTab === TabView.SUMMARY ? 'Document Summary' : 'Study Flashcards'}
           </h2>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
         {activeTab === TabView.SUMMARY && (
           <>
             <button
               onClick={onRegenerate}
               disabled={isRegenerating}
               className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded-md text-xs font-medium hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 border border-zinc-200 dark:border-zinc-800"
             >
               <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
               {isRegenerating ? 'Regenerating...' : 'Regenerate'}
             </button>

             <div className="relative">
               <button
                 onClick={() => setExportMenuOpen(!exportMenuOpen)}
                 disabled={isExporting}
                 className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-md text-xs font-medium hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors disabled:opacity-50 shadow-sm"
               >
                 {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                 Export
               </button>
               
               {exportMenuOpen && (
                 <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-zinc-900 rounded-lg shadow-lg border border-zinc-200 dark:border-zinc-800 py-1 z-50 animate-in slide-in-from-top-2">
                   <button
                     onClick={() => { onExport('pdf'); setExportMenuOpen(false); }}
                     className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                   >
                     <FileIcon className="w-4 h-4 text-zinc-500" /> Save as PDF
                   </button>
                   <button
                     onClick={() => { onExport('png'); setExportMenuOpen(false); }}
                     className="flex items-center gap-3 w-full px-4 py-2.5 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                   >
                     <ImageIcon className="w-4 h-4 text-zinc-500" /> Save as Image
                   </button>
                 </div>
               )}
             </div>
           </>
         )}

         <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-800 mx-2"></div>

         <button 
          onClick={toggleDarkMode} 
          className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

export default Header;