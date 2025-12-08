import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FileText, 
  BrainCircuit, 
  MessageSquare, 
  BookOpen, 
  LogOut, 
  Loader2,
  Sparkles,
  Layout,
  Menu,
  X as XIcon,
  Moon,
  Sun,
  Download,
  Image as ImageIcon,
  FileIcon,
  RefreshCw,
  Search,
  Zap,
  CircleHelp,
  Lightbulb,
  Brain
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AppView, TabView, StudySession, Flashcard, ChatMessage } from './types';
import { generateSummaryAndFlashcards, regenerateSummary } from './services/geminiService';
import FlashcardRunner from './components/FlashcardRunner';
import ChatBot, { ChatBotHandle } from './components/ChatBot';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [activeTab, setActiveTab] = useState<TabView>(TabView.SUMMARY);
  const [session, setSession] = useState<StudySession | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true); // Default open on desktop
  const [selectionMenu, setSelectionMenu] = useState<{ x: number; y: number; text: string } | null>(null);
  
  const summaryRef = useRef<HTMLDivElement>(null);
  const chatBotRef = useRef<ChatBotHandle>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Handle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // Mock Authentication State
  const [user] = useState({
    name: "Demo Student",
    email: "student@studybaddie.ai",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
  });

  // Memoize markdown components to prevent re-renders breaking text selection
  const markdownComponents = React.useMemo(() => ({
    h1: ({node, ...props}: any) => <h1 className="text-3xl font-bold text-indigo-800 dark:text-indigo-300 mb-8 mt-8 leading-[4rem]" {...props} />,
    h2: ({node, ...props}: any) => <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-300 mb-8 mt-8 leading-[4rem]" {...props} />,
    h3: ({node, ...props}: any) => <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-300 mb-8 mt-8 leading-[2rem]" {...props} />,
    p: ({node, ...props}: any) => <p className="mb-8 leading-[2rem] text-slate-700 dark:text-slate-300" {...props} />,
    ul: ({node, ...props}: any) => <ul className="list-disc pl-6 mb-8 space-y-0 text-slate-700 dark:text-slate-300" {...props} />,
    ol: ({node, ...props}: any) => <ol className="list-decimal pl-6 mb-8 space-y-0 text-slate-700 dark:text-slate-300" {...props} />,
    li: ({node, ...props}: any) => <li className="leading-[2rem] pl-2 marker:text-slate-500" {...props} />,
    strong: ({node, ...props}: any) => <strong className="font-bold text-indigo-950 dark:text-purple-100 bg-lime-400 dark:bg-purple-900/60 px-1 rounded box-decoration-clone" {...props} />,
    blockquote: ({node, ...props}: any) => <blockquote className="border-l-4 border-slate-400 pl-4 italic mb-8 text-slate-600 dark:text-slate-400" {...props} />,
  }), []);

  // Handle Text Selection in Notebook
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // Only run if we are in Summary tab
      if (activeTab !== TabView.SUMMARY) return;

      // Ignore clicks inside the tooltip menu itself to prevent it from closing before action
      if ((e.target as HTMLElement).closest('.selection-menu-container')) {
        return;
      }

      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) {
        setSelectionMenu(null);
        return;
      }

      const text = selection.toString().trim();
      if (!text) {
        setSelectionMenu(null);
        return;
      }

      // Ensure selection is inside the notebook
      if (summaryRef.current && !summaryRef.current.contains(selection.anchorNode)) {
         setSelectionMenu(null);
         return;
      }

      // Get Coordinates
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectionMenu({
        x: rect.left + (rect.width / 2),
        y: rect.top - 10, // Position slightly above selection
        text: text
      });
    };

    // Close tooltip on scroll to prevent misalignment
    const handleScroll = () => setSelectionMenu(null);

    document.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('scroll', handleScroll, true); 

    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [activeTab]);

  const handleTooltipAction = (e: React.MouseEvent, type: 'explain' | 'simplify' | 'quiz' | 'example' | 'mnemonic') => {
    e.preventDefault();
    e.stopPropagation();

    if (!selectionMenu || !chatBotRef.current) return;
    
    if (!isChatOpen) setIsChatOpen(true);

    let prompt = "";
    const text = selectionMenu.text;

    // Prompts designed to maintain an academic yet helpful tone
    switch (type) {
        case 'explain':
            prompt = `Explain this text in detail (University level): "${text}"`;
            break;
        case 'simplify':
            // "plain English" instead of "like I'm 5" to avoid childish persona drift
            prompt = `Explain this highlighted text in plain English using simple analogies (ELI5), but avoid using a childish tone: "${text}"`;
            break;
        case 'quiz':
            prompt = `Ask me a study question based on this text to test my understanding (don't provide the answer yet). Text: "${text}"`;
            break;
        case 'example':
            // Removed request for analogy to ensure concrete examples
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

    // Validate type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      const msg = `[Upload Error] Invalid file type: '${file.type}'. Supported types are: ${validTypes.join(', ')}`;
      console.error(msg);
      setError("Please upload a valid Image (JPEG, PNG) or PDF.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const reader = new FileReader();

      reader.onerror = () => {
        console.error("[Upload Error] FileReader failed to read the file.", reader.error);
        setError("Failed to read the file. Please try again.");
        setIsProcessing(false);
      };

      reader.onloadend = async () => {
        if (reader.error) {
           console.error("[Upload Error] FileReader error during load.", reader.error);
           return;
        }

        const base64String = reader.result as string;
        // Remove data URL prefix for API
        const base64Data = base64String.split(',')[1];

        try {
          console.log("[AI Service] Sending data to Gemini API for processing...");
          // Call AI Service
          const { summary, flashcards, title } = await generateSummaryAndFlashcards(base64Data, file.type);
          console.log("[AI Service] Success! Received summary and flashcards.");

          const newSession: StudySession = {
            id: Date.now().toString(),
            fileName: file.name,
            title: title || file.name, // Use AI title or fallback to filename
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
          // Default fallback
          let finalMessage = "An unexpected error occurred.";
          
          if (err.message) {
            // Attempt to parse clean error from JSON if possible
            try {
               const rawMsg = err.message;
               const jsonMatch = rawMsg.match(/\{.*\}/s);
               if (jsonMatch) {
                 const errorObj = JSON.parse(jsonMatch[0]);
                 // Check for specific API errors
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
                 finalMessage = rawMsg; // Use raw message if no JSON found but message exists
               }
            } catch (e) {
               finalMessage = err.message;
            }
          }
          
          console.error("Full Error Object:", err);
          setError(finalMessage);
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(file);
    } catch (err) {
      console.error("[Upload Error] Unexpected error during upload process:", err);
      setError("An unexpected error occurred while processing the file.");
      setIsProcessing(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!session) return;
    setIsRegenerating(true);
    try {
      const newSummary = await regenerateSummary(session.fileData, session.fileType);
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
    setExportMenuOpen(false);

    try {
      // Ensure fonts are loaded before capturing
      await document.fonts.ready;
      
      const element = summaryRef.current;
      
      // Configure html2canvas to capture full scroll height
      const canvas = await html2canvas(element, {
        scale: 2, // Retain quality
        useCORS: true,
        logging: false,
        backgroundColor: isDarkMode ? '#1e293b' : '#fefce8', // Match paper color
        scrollY: -window.scrollY, // Correct scrolling issue
        windowHeight: element.scrollHeight + 100, // Ensure full height capture
        onclone: (clonedDoc) => {
            // Force the cloned element to show full content
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

        // First page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInPdf);
        heightLeft -= pdfHeight;

        // Subsequent pages
        while (heightLeft > 0) {
            position -= pdfHeight; // Move the image up
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
      <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 dark:from-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden transition-colors duration-500">
        <button 
          onClick={toggleDarkMode} 
          className="absolute top-6 right-6 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-all"
        >
          {isDarkMode ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
        </button>

        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <Sparkles className="absolute top-20 left-20 text-white/20 w-12 h-12 animate-pulse" />
          <Sparkles className="absolute bottom-20 right-20 text-white/20 w-8 h-8 animate-pulse delay-700" />
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 md:p-12 w-full max-w-2xl text-center transform transition-all duration-300 hover:scale-[1.01]">
          <div className="flex justify-center mb-6">
            <div className="bg-gradient-to-tr from-primary-500 to-purple-500 p-4 rounded-2xl shadow-lg">
              <BrainCircuit className="w-16 h-16 text-white" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400 mb-4">
            Study Baddie
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg mb-10 leading-relaxed">
            Your ultimate AI study bestie. Upload your lectures, slides, or notes, and let's turn them into 
            <span className="font-bold text-primary-600 dark:text-primary-400"> aesthetic summaries</span>, 
            <span className="font-bold text-purple-600 dark:text-purple-400"> flashcards</span>, and 
            <span className="font-bold text-pink-600 dark:text-pink-400"> interactive chats</span>.
          </p>

          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary-600 to-purple-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <label className="relative flex flex-col items-center justify-center w-full h-64 border-3 border-dashed border-gray-300 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800 transition-all cursor-pointer bg-white dark:bg-slate-900">
              {isProcessing ? (
                <div className="flex flex-col items-center animate-in fade-in duration-300">
                  <Loader2 className="w-12 h-12 text-primary-500 animate-spin mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium">Analyzing your materials...</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">This might take a moment, bestie!</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <p className="text-xl font-semibold text-gray-700 dark:text-gray-200">Click to upload or drag & drop</p>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">PDF, Images (JPG, PNG)</p>
                </>
              )}
              <input 
                type="file" 
                className="hidden" 
                accept=".pdf, .jpg, .jpeg, .png, .webp"
                onChange={handleFileUpload}
                disabled={isProcessing}
              />
            </label>
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-600 dark:text-red-300 text-sm font-medium animate-in slide-in-from-top-2">
              {error}
            </div>
          )}
          
          <div className="mt-8 flex justify-center gap-6 text-xs text-gray-400 dark:text-gray-500 font-medium uppercase tracking-widest">
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI Summaries</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> Smart Flashcards</span>
            <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> 24/7 Tutor</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-200 dark:bg-slate-950 transition-colors duration-500 overflow-hidden">
      {/* Tooltip Menu for Text Selection */}
      {selectionMenu && (
        <div 
          className="selection-menu-container absolute z-50 bg-slate-100 dark:bg-slate-800 text-gray-700 dark:text-white rounded-lg shadow-xl border border-slate-300 dark:border-slate-700 flex items-center p-1 gap-1 animate-in zoom-in-95 duration-200 select-none"
          style={{ 
            top: selectionMenu.y, 
            left: selectionMenu.x, 
            transform: 'translate(-50%, -100%)' 
          }}
        >
          <button 
             onMouseDown={(e) => handleTooltipAction(e, 'explain')}
             className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors group relative"
          >
             <MessageSquare className="w-4 h-4 text-sky-600 dark:text-sky-400" />
             <span className="text-[10px] font-medium">Explain</span>
          </button>
          
          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

          <button 
             onMouseDown={(e) => handleTooltipAction(e, 'simplify')}
             className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
             <Zap className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
             <span className="text-[10px] font-medium">Simplify</span>
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

           <button 
             onMouseDown={(e) => handleTooltipAction(e, 'quiz')}
             className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
             <CircleHelp className="w-4 h-4 text-purple-600 dark:text-purple-400" />
             <span className="text-[10px] font-medium">Quiz</span>
          </button>

          <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

          <button 
             onMouseDown={(e) => handleTooltipAction(e, 'example')}
             className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
             <Lightbulb className="w-4 h-4 text-green-600 dark:text-green-400" />
             <span className="text-[10px] font-medium">Example</span>
          </button>

           <div className="w-px h-6 bg-slate-300 dark:bg-slate-700" />

          <button 
             onMouseDown={(e) => handleTooltipAction(e, 'mnemonic')}
             className="flex flex-col items-center gap-1 px-3 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
          >
             <Brain className="w-4 h-4 text-pink-600 dark:text-pink-400" />
             <span className="text-[10px] font-medium">Mnemonic</span>
          </button>
          
          {/* Triangle Pointer */}
          <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-1 w-2 h-2 bg-slate-100 dark:bg-slate-800 border-b border-r border-slate-300 dark:border-slate-700 rotate-45"></div>
        </div>
      )}

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white border-r border-slate-800 z-20 shadow-xl">
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
          
          {/* Chat Tab Button only visible on small screens since it's sidebar on large */}
          <div className="md:hidden">
             {/* Not needed as we use right sidebar */}
          </div>
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
             onClick={() => {
               setSession(null);
               setView(AppView.UPLOAD);
               setActiveTab(TabView.SUMMARY);
               setError(null);
               setIsChatOpen(true);
             }}
             className="w-full flex items-center justify-center gap-2 mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-xs font-medium transition-colors border border-slate-700"
           >
             <LogOut className="w-3 h-3" /> Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Header */}
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
                   onClick={handleRegenerateSummary}
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
                         onClick={() => handleExport('pdf')}
                         className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                       >
                         <FileIcon className="w-4 h-4 text-red-500" /> Save as PDF
                       </button>
                       <button
                         onClick={() => handleExport('png')}
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

        {/* Content Area */}
        <div className="flex-1 overflow-hidden relative flex">
          
          {/* Main View */}
          <div className="flex-1 overflow-y-auto relative scroll-smooth bg-slate-200 dark:bg-slate-950 transition-colors duration-500">
            {activeTab === TabView.SUMMARY ? (
              <div className="min-h-full p-4 md:p-8 flex justify-center">
                 {/* Paper / Notebook Design */}
                 <div 
                   id="summary-content"
                   ref={summaryRef} 
                   className="relative w-full max-w-4xl bg-[#fefce8] dark:bg-[#1e293b] shadow-2xl min-h-[1200px] font-hand text-lg md:text-xl transition-colors duration-500 pb-20"
                   style={{
                     // Paper Lines Pattern
                     backgroundImage: `
                       linear-gradient(90deg, transparent 79px, #ab47bc 79px, #ab47bc 81px, transparent 81px),
                       linear-gradient(to bottom, transparent 31px, ${isDarkMode ? '#334155' : '#e2e8f0'} 31px)
                     `,
                     backgroundSize: '100% 32px',
                     backgroundAttachment: 'local' // Important for scrolling to work right with gradient
                   }}
                 >
                    {/* Binder Holes - Using CSS Radial Gradient for infinite repeat */}
                    <div 
                        className="absolute top-0 left-0 bottom-0 w-20 z-10"
                        style={{
                            backgroundImage: `radial-gradient(circle at 10px center, ${isDarkMode ? '#020617' : '#e2e8f0'} 6px, transparent 7px)`,
                            backgroundSize: '20px 32px', // Matches line height
                            backgroundPosition: '10px 16px', // Center vertically on line
                            backgroundRepeat: 'repeat-y'
                        }}
                    ></div>

                    {/* Content Container */}
                    <div className="pl-24 pr-8 pt-8 md:pl-28 md:pr-12">
                       {/* Header Title on Paper */}
                       <div className="border-b-2 border-slate-300 dark:border-slate-600 pb-2 mb-4">
                           <h1 className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-0 leading-[3rem]">
                               {session?.title}
                           </h1>
                       </div>
                       
                       {/* Markdown Content */}
                       <div className="relative z-0">
                         {session && (
                           <ReactMarkdown 
                              components={markdownComponents}
                           >
                             {session.summary}
                           </ReactMarkdown>
                         )}
                       </div>
                    </div>

                    {/* Regenerating Overlay */}
                    {isRegenerating && (
                      <div className="absolute inset-0 bg-white/60 dark:bg-slate-950/60 backdrop-blur-[2px] z-20 transition-all duration-300">
                         <div className="sticky top-[45vh] flex flex-col items-center">
                            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-xl border border-gray-100 dark:border-slate-700 flex items-center gap-3 animate-in zoom-in">
                               <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
                               <span className="font-bold text-gray-700 dark:text-white">Regenerating Notes...</span>
                            </div>
                         </div>
                      </div>
                    )}
                 </div>
              </div>
            ) : (
              <div className="h-full p-4 md:p-8 bg-slate-200 dark:bg-slate-950">
                {session && <FlashcardRunner cards={session.flashcards} />}
              </div>
            )}
          </div>

          {/* Right Sidebar - Chat Assistant */}
          {activeTab === TabView.SUMMARY && (
             <div 
               className={`
                 fixed inset-y-0 right-0 w-full sm:w-96 bg-white dark:bg-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out z-30 border-l border-gray-200 dark:border-slate-800
                 ${isChatOpen ? 'translate-x-0' : 'translate-x-full'}
                 md:relative md:translate-x-0 md:w-96 md:flex-none
               `}
             >
                <div className="h-full flex flex-col">
                   <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-slate-800 md:hidden">
                      <h3 className="font-bold text-gray-700 dark:text-white flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary-500" /> AI Assistant
                      </h3>
                      <button onClick={() => setIsChatOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full">
                         <XIcon className="w-5 h-5 text-gray-500" />
                      </button>
                   </div>
                   
                   {session && (
                     <ChatBot 
                       ref={chatBotRef}
                       history={session.chatHistory} 
                       setHistory={(newHistory) => {
                          // Update session state locally as well
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
               className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-primary-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-700 hover:scale-105 transition-all z-40"
             >
                <MessageSquare className="w-6 h-6" />
             </button>
          )}

        </div>
      </main>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-slate-900 text-white p-4 shadow-xl" onClick={e => e.stopPropagation()}>
             {/* Same Sidebar Content for Mobile */}
             <div className="flex items-center gap-3 mb-8">
                <div className="bg-primary-500 p-2 rounded-lg">
                  <BrainCircuit className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold">Study Baddie</span>
             </div>
             
             <nav className="space-y-2">
                <button
                  onClick={() => { setActiveTab(TabView.SUMMARY); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === TabView.SUMMARY ? 'bg-primary-600' : 'text-slate-400'}`}
                >
                  <BookOpen className="w-5 h-5" /> Summary
                </button>
                <button
                  onClick={() => { setActiveTab(TabView.FLASHCARDS); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl ${activeTab === TabView.FLASHCARDS ? 'bg-primary-600' : 'text-slate-400'}`}
                >
                  <Layout className="w-5 h-5" /> Flashcards
                </button>
             </nav>
             
             <div className="absolute bottom-8 left-4 right-4">
                <button 
                   onClick={() => {
                     setSession(null);
                     setView(AppView.UPLOAD);
                     setMobileMenuOpen(false);
                   }}
                   className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-800 rounded-lg text-slate-300"
                >
                   <LogOut className="w-4 h-4" /> Sign Out
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;