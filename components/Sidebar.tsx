import React from 'react';
import { BrainCircuit, FileText, BookOpen, Layout, LogOut } from 'lucide-react';
import { StudySession, TabView } from '../types';

interface SidebarProps {
  session: StudySession | null;
  activeTab: TabView;
  setActiveTab: (tab: TabView) => void;
  user: { name: string; email: string; avatar: string };
  onSignOut: () => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  session, 
  activeTab, 
  setActiveTab, 
  user, 
  onSignOut,
  className = ""
}) => {
  return (
    <aside className={`flex flex-col bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 ${className}`}>
      <div className="p-6 flex items-center gap-3">
        <BrainCircuit className="w-6 h-6 text-zinc-900 dark:text-white" />
        <span className="text-xl font-serif font-medium tracking-tight">Study Baddie</span>
      </div>

      <div className="px-6 py-4">
         <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">Active Session</div>
         <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-md border border-zinc-200 dark:border-zinc-700">
               <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">{session?.title}</p>
              <p className="text-xs text-zinc-500">{new Date(session?.createdAt || 0).toLocaleDateString()}</p>
            </div>
         </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-1">
        <button
          onClick={() => setActiveTab(TabView.SUMMARY)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200 text-sm font-medium ${
            activeTab === TabView.SUMMARY
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Summary
        </button>
        <button
          onClick={() => setActiveTab(TabView.FLASHCARDS)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-full transition-all duration-200 text-sm font-medium ${
            activeTab === TabView.FLASHCARDS
              ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900'
              : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-200'
          }`}
        >
          <Layout className="w-4 h-4" />
          Flashcards
        </button>
      </nav>
      
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
         <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden border border-zinc-200 dark:border-zinc-700">
               <img src={user.avatar} alt="User" className="w-full h-full object-cover grayscale opacity-80" />
            </div>
            <div className="flex-1 overflow-hidden">
               <p className="text-sm font-medium truncate">{user.name}</p>
               <p className="text-xs text-zinc-500 truncate">{user.email}</p>
            </div>
         </div>
         <button 
           onClick={onSignOut}
           className="w-full flex items-center justify-center gap-2 px-4 py-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200 text-xs font-medium transition-colors"
         >
           <LogOut className="w-3 h-3" /> Sign Out
         </button>
      </div>
    </aside>
  );
};

export default Sidebar;