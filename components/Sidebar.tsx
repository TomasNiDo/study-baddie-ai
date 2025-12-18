import React from 'react';
import { BrainCircuit, FileText, BookOpen, Layout, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { StudySession, TabView } from '../types';

interface SidebarProps {
  session: StudySession | null;
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  user: { name: string; email: string; avatar: string };
  onSignOut: () => void;
  className?: string;
  isCollapsed?: boolean;
  onToggle?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  session, 
  activeTab, 
  setActiveTab, 
  user, 
  onSignOut,
  className = "",
  isCollapsed = false,
  onToggle
}) => {
  return (
    <aside className={`relative flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 ${className}`}>
      
      {/* Floating Toggle Button (Desktop Only) */}
      {onToggle && (
        <button
          onClick={onToggle}
          className="absolute -right-3 top-9 z-50 w-6 h-6 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white shadow-sm transition-transform hover:scale-105 hidden md:flex"
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      )}

      {/* Header / Logo */}
      <div className={`p-6 flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center px-2' : ''}`}>
        <BrainCircuit className="w-6 h-6 text-zinc-900 dark:text-white flex-shrink-0" />
        <span className={`text-xl font-serif font-medium tracking-tight whitespace-nowrap overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
          Study Baddie
        </span>
      </div>

      {/* Active Session Info */}
      <div className={`px-6 py-4 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
         {!isCollapsed && <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3 whitespace-nowrap overflow-hidden">Active Session</div>}
         <div className={`flex items-center gap-3 transition-all duration-300 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700 flex-shrink-0" title={isCollapsed ? session?.title : undefined}>
               <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className={`overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
              <p className="text-sm font-medium truncate">{session?.title}</p>
              <p className="text-xs text-zinc-500">{new Date(session?.createdAt || 0).toLocaleDateString()}</p>
            </div>
         </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        <button
          onClick={() => setActiveTab(TabView.SUMMARY)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200 text-sm font-medium whitespace-nowrap ${
            activeTab === TabView.SUMMARY
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
          } ${isCollapsed ? 'justify-center px-2' : ''}`}
          title={isCollapsed ? "Summary" : undefined}
        >
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span className={`transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Summary</span>
        </button>
        <button
          onClick={() => setActiveTab(TabView.FLASHCARDS)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200 text-sm font-medium whitespace-nowrap ${
            activeTab === TabView.FLASHCARDS
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
          } ${isCollapsed ? 'justify-center px-2' : ''}`}
          title={isCollapsed ? "Flashcards" : undefined}
        >
          <Layout className="w-4 h-4 flex-shrink-0" />
          <span className={`transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Flashcards</span>
        </button>
      </nav>
      
      {/* User Footer */}
      <div className={`p-4 border-t border-zinc-200 dark:border-zinc-800 transition-all duration-300 ${isCollapsed ? 'px-2' : ''}`}>
         <div className={`flex items-center gap-3 px-2 py-2 mb-2 ${isCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700 flex-shrink-0">
               <img src={user.avatar} alt="User" className="w-full h-full object-cover grayscale opacity-80" />
            </div>
            <div className={`flex-1 overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>
               <p className="text-sm font-medium truncate">{user.name}</p>
               <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
         </div>
         <button 
           onClick={onSignOut}
           className={`w-full flex items-center gap-2 px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-medium transition-colors whitespace-nowrap ${isCollapsed ? 'justify-center px-0' : 'justify-center'}`}
           title={isCollapsed ? "Sign Out" : undefined}
         >
           <LogOut className="w-3 h-3 flex-shrink-0" /> 
           <span className={`transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Sign Out</span>
         </button>
      </div>
    </aside>
  );
};

export default Sidebar;