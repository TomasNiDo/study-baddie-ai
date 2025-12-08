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
    <header className="h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 flex-none z-40 shadow-sm">
      <div className="flex items-center gap-4">
        <button 
          className="md:hidden p-2 -ml-2 text-gray-600 dark:text-gray-300"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
           {activeTab === TabView.SUMMARY && <BookOpen className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
           {activeTab === TabView.FLASHCARDS && <Layout className="w-5 h-5 text-primary-600 dark:text-primary-400" />}
           <h2 className="text-lg font-bold text-gray-800 dark:text-white">
             {activeTab === TabView.SUMMARY ? 'Document Summary' : 'Study Flashcards'}
           </h2>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
         {activeTab === TabView.SUMMARY && (
           <>
             <button
               onClick={onRegenerate}
               disabled={isRegenerating}
               className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md text-sm font-medium hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors disabled:opacity-50 border border-indigo-200 dark:border-indigo-800"
             >
               <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
               {isRegenerating ? 'Regenerating...' : 'Regenerate'}
             </button>

             <div className="relative">
               <button
                 onClick={() => setExportMenuOpen(!exportMenuOpen)}
                 disabled={isExporting}
                 className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-gray-300 rounded-md text-sm font-medium hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
               >
                 {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                 Export Notes
               </button>
               
               {exportMenuOpen && (
                 <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-50 animate-in slide-in-from-top-2">
                   <button
                     onClick={() => { onExport('pdf'); setExportMenuOpen(false); }}
                     className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                   >
                     <FileIcon className="w-4 h-4 text-red-500" /> Save as PDF
                   </button>
                   <button
                     onClick={() => { onExport('png'); setExportMenuOpen(false); }}
                     className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                   >
                     <ImageIcon className="w-4 h-4 text-blue-500" /> Save as Image
                   </button>
                 </div>
               )}
             </div>
           </>
         )}

         <button 
          onClick={toggleDarkMode} 
          className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full transition-colors"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </div>
    </header>
  );
};

export default Header;
