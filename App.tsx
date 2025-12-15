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

    console.log(`[Upload] Starting upload for file: "${file.name}" | Type: ${file.type} | Size: ${file.size} bytes`);

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a valid Image (JPEG, PNG) or PDF.");
      return;
    }

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
          let finalMessage = "An unexpected error occurred.";
          if (err.message) {
            try {
               const rawMsg = err.message;
               const jsonMatch = rawMsg.match(/\{.*\}/s);
               if (jsonMatch) {
                 const errorObj = JSON.parse(jsonMatch[0]);
                 if (errorObj.error) {
                    const status = errorObj.error.status;
                    const reason = errorObj.error.details?.[0]?.reason;
                    if (reason === 'API_KEY_INVALID') {
                       finalMessage = "Authentication Error: The provided API Key is invalid. Please check your configuration.";
                    } else if (status === 'RESOURCE_EXHAUSTED') {
                       finalMessage = "Service Busy: Too many requests. Please wait a moment and try again.";
                    } else if (errorObj.error.message) {
                       finalMessage = `AI Service Error: ${errorObj.error.message}`;
                    }
                 }
               } else {
                 finalMessage = rawMsg;
               }
            } catch (e) {
               finalMessage = err.message;
            }
          }
          setError(finalMessage);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      setError("An unexpected error occurred while processing the file.");
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
    if (!summaryRef.current) return;
    setIsExporting(true);

    try {
      await document.fonts.ready;
      const element = summaryRef.current;
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: isDarkMode ? '#18181b' : '#ffffff', // Matched to new white notebook theme
        scrollY: -window.scrollY,
        windowHeight: element.scrollHeight + 100,
        onclone: (clonedDoc) => {
            const clonedElement = clonedDoc.getElementById('summary-content');
            if (clonedElement) {
                clonedElement.style.height = 'auto';
                clonedElement.style.overflow = 'visible';
                clonedElement.style.maxHeight = 'none';
            }
        }
      });

      if (type === 'png') {
        const link = document.createElement('a');
        link.download = `StudyBaddie-Notes-${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = pdfWidth / imgWidth;
        const canvasHeightInPdf = imgHeight * ratio;
        
        let position = 0;
        let heightLeft = canvasHeightInPdf;

        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
        heightLeft -= pdfHeight;

        while (heightLeft > 0) {
            position -= pdfHeight;
            pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
            heightLeft -= pdfHeight;
        }
        
        pdf.save(`StudyBaddie-Notes-${Date.now()}.pdf`);
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
      {/* Tooltip Menu for Text Selection */}
      {selectionMenu && (
        <TooltipMenu 
          x={selectionMenu.x}
          y={selectionMenu.y}
          onAction={handleTooltipAction}
        />
      )}

      {/* Sidebar - Desktop */}
      <Sidebar 
        className="hidden md:flex w-64 z-20"
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

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
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

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex">
          
          {/* Main View */}
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

          {/* Right Sidebar - Chat Assistant */}
          {activeTab === TabView.SUMMARY && (
             <div 
               className={`
                 fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-zinc-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-30 border-l border-zinc-200 dark:border-zinc-800
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

          {/* Mobile Chat Toggle Button */}
          {activeTab === TabView.SUMMARY && !isChatOpen && (
             <button
               onClick={() => setIsChatOpen(true)}
               className="md:hidden fixed bottom-6 right-6 w-12 h-12 bg-zinc-900 text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-all z-40"
             >
                <MessageSquare className="w-5 h-5" />
             </button>
          )}

        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
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