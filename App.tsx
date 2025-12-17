import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Sparkles, X as XIcon } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AppView, TabView, StudySession, RegenerateOptions } from './types';
import { generateSummaryAndFlashcards, regenerateSummary } from './services/geminiService';
import FlashcardRunner from './components/FlashcardRunner';
import ChatBot, { ChatBotHandle } from './components/ChatBot';
import UploadView from './components/UploadView';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Notebook from './components/Notebook';
import TooltipMenu from './components/TooltipMenu';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [activeTab, setActiveTab] = useState<TabView>(TabView.SUMMARY);
  const [session, setSession] = useState<StudySession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  
  const summaryRef = useRef<HTMLDivElement>(null);
  const chatBotRef = useRef<ChatBotHandle>(null);
  
  // Default to Light Mode (false)
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  const [user] = useState({
    name: "Demo Student",
    email: "student@studybaddie.ai",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
  });

  const handleTooltipAction = (e: React.MouseEvent, type: 'explain' | 'simplify' | 'quiz' | 'example' | 'mnemonic') => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectionMenu || !chatBotRef.current) return;
    
    if (!isChatOpen) setIsChatOpen(true);

    let prompt = "";
    const text = selectionMenu.text;

    switch (type) {
        case 'explain':
            prompt = `Explain this text in detail (University level): "${text}"`;
            break;
        case 'simplify':
            prompt = `Explain this highlighted text in plain English using simple analogies (ELI5), but avoid using a childish tone: "${text}"`;
            break;
        case 'quiz':
            prompt = `Ask me a study question based on this text to test my understanding (don't provide the answer yet). Text: "${text}"`;
            break;
        case 'example':
            prompt = `Provide a concrete real-world example that demonstrates this concept (University level): "${text}"`;
            break;
        case 'mnemonic':
            prompt = `Create a catchy mnemonic, acronym, or rhyme to help me memorize the key points in this text: "${text}"`;
            break;
    }
    
    chatBotRef.current.askQuestion(prompt);
    setSelectionMenu(null);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();
      reader.onerror = () => {
        setError("Failed to read the file. Please try again.");
        setIsProcessing(false);
      };
      reader.onloadend = async () => {
        if (reader.error) return;
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        try {
          const { summary, flashcards, title } = await generateSummaryAndFlashcards(base64Data, file.type);
          const newSession: StudySession = {
            id: Date.now().toString(),
            fileName: file.name,
            title: title || file.name,
            fileType: file.type,
            fileData: base64Data,
            summary,
            flashcards,
            chatHistory: [],
            createdAt: Date.now(),
          };
          setSession(newSession);
          setView(AppView.DASHBOARD);
        } catch (err: any) {
          setError(err.message || "An error occurred.");
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError("An error occurred.");
      setIsProcessing(false);
    }
  };

  const handleRegenerateSummary = async (options: RegenerateOptions) => {
    if (!session) return;
    setIsRegenerating(true);
    try {
      const newSummary = await regenerateSummary(session.fileData, session.fileType, options);
      setSession(prev => prev ? { ...prev, summary: newSummary } : null);
    } catch (error) {
      console.error("Failed to regenerate summary", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleExport = async (type: 'png' | 'pdf') => {
    setIsExporting(true);

    try {
      if (!summaryRef.current) {
          console.error("Reference not found");
          return;
      }
      
      await document.fonts.ready;
      
      const PAGE_WIDTH = 816; 
      const PAGE_HEIGHT = 1056; 
      
      if (type === 'pdf') {
        const doc = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [PAGE_WIDTH, PAGE_HEIGHT],
          hotfixes: ["px_scaling"]
        });
        
        const pages = summaryRef.current.querySelectorAll('.print-page');
        if (pages.length === 0) throw new Error("No pages found to export");

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as HTMLElement;
          if (i > 0) doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          
          const canvas = await html2canvas(page, {
            scale: 3, // Increased scale for better precision in PDF highlights
            useCORS: true,
            logging: false,
            backgroundColor: isDarkMode ? '#18181b' : '#ffffff',
            width: PAGE_WIDTH,
            height: PAGE_HEIGHT,
            x: 0,
            y: 0
          });
          
          const imgData = canvas.toDataURL('image/png');
          doc.addImage(imgData, 'PNG', 0, 0, PAGE_WIDTH, PAGE_HEIGHT, undefined, 'FAST');
        }
        
        doc.save(`${session?.title || 'StudyNotes'}.pdf`);

      } else {
        const element = summaryRef.current;
        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          logging: false,
          backgroundColor: isDarkMode ? '#18181b' : '#fafafa', 
          ignoreElements: (el) => el.classList.contains('no-print')
        });

        const link = document.createElement('a');
        link.download = `StudyBaddie-Notes-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      }
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  if (view === AppView.UPLOAD) {
    return (
      <UploadView 
        isProcessing={isProcessing}
        error={error}
        onUpload={handleFileUpload}
        isDarkMode={isDarkMode}
        toggleDarkMode={toggleDarkMode}
      />
    );
  }

  return (
    <div className="flex h-screen bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500 overflow-hidden font-sans">
      {selectionMenu && (
        <TooltipMenu 
          x={selectionMenu.x}
          y={selectionMenu.y}
          onAction={handleTooltipAction}
        />
      )}

      <Sidebar 
        className="hidden md:flex w-64 z-20 no-print"
        session={session}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        onSignOut={() => {
           setSession(null);
           setView(AppView.UPLOAD);
           setActiveTab(TabView.SUMMARY);
           setError(null);
           setIsChatOpen(true);
        }}
      />

      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        <div className="no-print">
          <Header 
            activeTab={activeTab}
            isDarkMode={isDarkMode}
            toggleDarkMode={toggleDarkMode}
            mobileMenuOpen={mobileMenuOpen}
            setMobileMenuOpen={setMobileMenuOpen}
            isRegenerating={isRegenerating}
            onRegenerate={handleRegenerateSummary}
            isExporting={isExporting}
            onExport={handleExport}
          />
        </div>

        <div className="flex-1 overflow-hidden relative flex">
          <div className="flex-1 overflow-y-auto relative scroll-smooth bg-zinc-50 dark:bg-zinc-950 transition-colors duration-500 light-scrollbar">
            {activeTab === TabView.SUMMARY && session ? (
              <Notebook 
                ref={summaryRef}
                session={session}
                isRegenerating={isRegenerating}
                isDarkMode={isDarkMode}
                onTextSelection={setSelectionMenu}
              />
            ) : session ? (
              <div className="h-full bg-zinc-50 dark:bg-zinc-950">
                <FlashcardRunner cards={session.flashcards} />
              </div>
            ) : null}
          </div>

          {activeTab === TabView.SUMMARY && (
             <div 
               className={`
                 fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-30 border-l border-zinc-200 dark:border-zinc-800 no-print
                 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}
                 md:relative md:translate-x-0 md:w-96 md:flex-none
               `}
             >
                <div className="h-full flex flex-col">
                   <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 md:hidden">
                      <h3 className="font-bold text-zinc-700 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> AI Assistant
                      </h3>
                      <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                         <XIcon className="w-5 h-5 text-zinc-500" />
                      </button>
                   </div>
                   
                   {session && (
                     <ChatBot 
                       ref={chatBotRef}
                       history={session.chatHistory} 
                       setHistory={(newHistory) => {
                          if (typeof newHistory === 'function') {
                             setSession(prev => prev ? { ...prev, chatHistory: newHistory(prev.chatHistory) } : null);
                          } else {
                             setSession(prev => prev ? { ...prev, chatHistory: newHistory } : null);
                          }
                       }}
                       fileData={session.fileData} 
                       fileType={session.fileType}
                     />
                   )}
                </div>
             </div>
          )}

          {activeTab === TabView.SUMMARY && !isChatOpen && (
             <button
               onClick={() => setIsChatOpen(true)}
               className="md:hidden fixed bottom-6 right-6 w-12 h-12 bg-zinc-900 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-all z-40 no-print"
             >
                <MessageSquare className="w-5 h-5" />
             </button>
          )}

        </div>
      </main>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden no-print" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xl" onClick={e => e.stopPropagation()}>
             <Sidebar 
                session={session}
                activeTab={activeTab}
                setActiveTab={(tab) => { setActiveTab(tab); setMobileMenuOpen(false); }}
                user={user}
                onSignOut={() => {
                   setSession(null);
                   setView(AppView.UPLOAD);
                   setMobileMenuOpen(false);
                }}
             />
          </div>
        </div>
      )}
    </div>
  );
};

export default App;