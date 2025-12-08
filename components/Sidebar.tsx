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
    <aside className={`flex flex-col bg-slate-900 text-white ${className}`}>
      <div className="p-6 flex items-center gap-3">
        <div className="bg-gradient-to-tr from-primary-500 to-purple-500 p-2 rounded-lg">
          <BrainCircuit className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Study Baddie</span>
      </div>

      <div className="px-6 py-2">
         <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Current Session</div>
         <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50 flex items-center gap-3">
            <div className="bg-primary-500/20 p-2 rounded-lg">
               <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-slate-200 truncate">{session?.title}</p>
              <p className="text-xs text-slate-500">{new Date(session?.createdAt || 0).toLocaleDateString()}</p>
            </div>
         </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-2">
        <button
          onClick={() => setActiveTab(TabView.SUMMARY)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
            activeTab === TabView.SUMMARY
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          Summary
        </button>
        <button
          onClick={() => setActiveTab(TabView.FLASHCARDS)}
          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 font-medium ${
            activeTab === TabView.FLASHCARDS
              ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/20'
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Layout className="w-5 h-5" />
          Flashcards
        </button>
      </nav>
      
      <div className="p-4 border-t border-slate-800">
         <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
               <img src={user.avatar} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 overflow-hidden">
               <p className="text-sm font-medium text-white truncate">{user.name}</p>
               <p className="text-xs text-slate-500 truncate">{user.email}</p>
            </div>
         </div>
         <button 
           onClick={onSignOut}
           className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-medium transition-colors border border-slate-700"
         >
           <LogOut className="w-3 h-3" /> Sign Out
         </button>
      </div>
    </aside>
  );
};

export default Sidebar;
