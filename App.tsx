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
  RefreshCw
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { AppView, TabView, StudySession, Flashcard, ChatMessage } from './types';
import { generateSummaryAndFlashcards, regenerateSummary } from './services/geminiService';
import FlashcardRunner from './components/FlashcardRunner';
import ChatBot from './components/ChatBot';

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
  const summaryRef = useRef<HTMLDivElement>(null);
  
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

  // Mock Authentication State (as per request for "Clerk", simulating logged in user)
  const [user] = useState({
    name: "Demo Student",
    email: "student@studybaddie.ai",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"
  });

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
          let finalMessage = "An unexpected error occurred while processing the document.";
          const rawMessage = err instanceof Error ? err.message : String(err);
          let cleanedMessage = rawMessage;

          // 1. Try to parse JSON error message from the API response
          try {
             const jsonStart = rawMessage.indexOf('{');
             const jsonEnd = rawMessage.lastIndexOf('}');
             if (jsonStart !== -1 && jsonEnd !== -1) {
                 const jsonStr = rawMessage.substring(jsonStart, jsonEnd + 1);
                 const parsed = JSON.parse(jsonStr);
                 if (parsed.error && parsed.error.message) {
                     cleanedMessage = parsed.error.message;
                 }
             }
          } catch (e) {
             // Ignore JSON parsing errors
          }

          // 2. Map technical errors to human-friendly messages
          if (cleanedMessage.includes("API key") || cleanedMessage.includes("API_KEY")) {
              finalMessage = "Authentication Error: The API Key is invalid or missing. Please check your configuration.";
          } else if (cleanedMessage.includes("safety") || cleanedMessage.includes("blocked")) {
              finalMessage = "Safety Violation: The content was flagged by AI safety filters and cannot be processed.";
          } else if (cleanedMessage.includes("overloaded") || cleanedMessage.includes("503")) {
              finalMessage = "Service Busy: The AI service is currently overloaded. Please try again in a few moments.";
          } else if (cleanedMessage.includes("fetch failed") || cleanedMessage.includes("Network")) {
              finalMessage = "Network Error: Could not connect to the AI service. Please check your internet connection.";
          } else if (cleanedMessage.includes("400")) {
              finalMessage = "Invalid Request: The file format might be unsupported or corrupted.";
          } else {
             // If the message is reasonably short and readable, show it. Otherwise keep the generic one.
             if (cleanedMessage.length < 200 && !cleanedMessage.includes("{")) {
                 finalMessage = `Error: ${cleanedMessage}`;
             }
          }

          console.error("[Upload Error] AI Processing Failed.");
          console.error("Technical Reason:", cleanedMessage);
          console.error("Full Error Details:", err);
          
          setError(finalMessage);
        } finally {
          setIsProcessing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("[Upload Error] Unexpected error initializing upload:", err);
      setError(`Error initializing upload: ${err.message}`);
      setIsProcessing(false);
    }
  };

  const handleRegenerateSummary = async () => {
    if (!session) return;
    setIsRegenerating(true);
    try {
        const newSummary = await regenerateSummary(session.fileData, session.fileType);
        setSession(prev => prev ? ({ ...prev, summary: newSummary }) : null);
    } catch (err) {
        console.error("Failed to regenerate summary", err);
        // We could add a toast here, but for now console error is enough
    } finally {
        setIsRegenerating(false);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setView(AppView.UPLOAD);
    // In a real app with Clerk, this would call signOut()
  };

  const handleExport = async (format: 'png' | 'pdf') => {
    if (!summaryRef.current || !session) return;
    
    setIsExporting(true);
    setExportMenuOpen(false);

    try {
      // 1. Wait for custom fonts to load so the handwritten font is captured
      await document.fonts.ready;

      // 2. Use html2canvas to capture the element
      const canvas = await html2canvas(summaryRef.current, {
        scale: 2, // High resolution for better PDF quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: isDarkMode ? '#1e293b' : '#fffdf0', // Match exact CSS paper colors
        height: summaryRef.current.scrollHeight, // Capture full height even if scrollable
        windowHeight: summaryRef.current.scrollHeight,
        scrollY: 0, // Reset scroll to ensure we capture from top
        onclone: (clonedDoc) => {
             // Ensure the cloned element is fully expanded
             const el = clonedDoc.getElementById('summary-content');
             if (el) {
                 el.style.height = 'auto';
                 el.style.overflow = 'visible';
                 el.style.maxHeight = 'none';
             }
        }
      });

      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `${session.title || session.fileName}-notes.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else if (format === 'pdf') {
        const imgData = canvas.toDataURL('image/png');
        
        // Initialize PDF (A4 size)
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        
        // Calculate the ratio to fit image width to PDF page width
        const ratio = pdfWidth / imgWidth;
        const scaledHeight = imgHeight * ratio;

        let heightLeft = scaledHeight;
        let position = 0;

        // Add first page
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
        heightLeft -= pdfHeight;

        // Loop to add remaining pages if the content is longer than one page
        while (heightLeft > 0) {
          position -= pdfHeight; // Move the drawing position up
          pdf.addPage();
          pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, scaledHeight);
          heightLeft -= pdfHeight;
        }

        pdf.save(`${session.title || session.fileName}-notes.pdf`);
      }
    } catch (err) {
      console.error("Export failed", err);
      alert("Failed to export notes. Please try again. If the document is extremely long, try exporting as PNG.");
    } finally {
      setIsExporting(false);
    }
  };

  // Render Upload View
  if (view === AppView.UPLOAD) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-300">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
           <div className="absolute -top-[20%] -right-[10%] w-[600px] h-[600px] bg-primary-200/30 dark:bg-primary-900/20 rounded-full blur-3xl"></div>
           <div className="absolute top-[40%] -left-[10%] w-[500px] h-[500px] bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-3xl"></div>
        </div>

        {/* Navbar */}
        <nav className="relative z-10 w-full px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-primary-600 p-2 rounded-lg text-white shadow-lg shadow-primary-500/30">
               <BrainCircuit size={24} />
            </div>
            <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Study Baddie</span>
          </div>
          <div className="flex items-center gap-4">
             <button 
               onClick={toggleDarkMode}
               className="p-2 rounded-full text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
             >
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
             </button>
             <div className="hidden md:flex items-center gap-3 bg-white dark:bg-slate-800 py-1.5 px-3 rounded-full border border-slate-200 dark:border-slate-700 shadow-sm">
                <img src={user.avatar} alt="User" className="w-6 h-6 rounded-full" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{user.email}</span>
             </div>
          </div>
        </nav>

        {/* Hero & Upload */}
        <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="max-w-3xl w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight leading-tight">
              Turn your notes into <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-indigo-600 dark:from-primary-400 dark:to-indigo-400">Active Knowledge</span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
              Upload lectures, handouts, or diagrams. Our AI will summarize them, create study flashcards, and answer your questions instantly.
            </p>

            {/* Upload Box */}
            <div className="mt-12">
               <div className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-10 transition-all duration-300 ${isProcessing ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/20' : 'border-slate-300 dark:border-slate-700 hover:border-primary-500 dark:hover:border-primary-400 hover:bg-white dark:hover:bg-slate-800/50 bg-white/50 dark:bg-slate-900/50'}`}>
                 <input 
                    type="file" 
                    onChange={handleFileUpload} 
                    accept=".jpg,.jpeg,.png,.webp,.pdf" 
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                    disabled={isProcessing}
                 />
                 
                 <div className="flex flex-col items-center space-y-4">
                   {isProcessing ? (
                     <>
                        <Loader2 className="w-16 h-16 text-primary-500 animate-spin" />
                        <h3 className="text-xl font-semibold text-primary-700 dark:text-primary-400">Analyzing Document...</h3>
                        <p className="text-primary-600 dark:text-primary-300">Generating summary and flashcards</p>
                     </>
                   ) : (
                     <>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-full shadow-md group-hover:scale-110 transition-transform">
                          <Upload className="w-10 h-10 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Click to upload or drag & drop</h3>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                        </div>
                     </>
                   )}
                 </div>
               </div>
               {error && (
                 <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium animate-in fade-in text-left">
                   <p className="font-bold">Error:</p>
                   <p className="break-words">{error}</p>
                 </div>
               )}
            </div>
            
            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 text-left">
              {[
                { icon: FileText, title: "Smart Summaries", desc: "Get concise, structured notes from messy documents." },
                { icon: Layout, title: "Interactive Flashcards", desc: "Test yourself with AI-generated Q&A cards." },
                { icon: MessageSquare, title: "Chat with Docs", desc: "Ask specific questions to clarify doubts instantly." },
              ].map((feature, idx) => (
                <div key={idx} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-6 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow">
                  <feature.icon className="w-8 h-8 text-primary-600 dark:text-primary-400 mb-3" />
                  <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{feature.title}</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Render Dashboard View
  if (!session) return null; // Should not happen based on logic

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row overflow-hidden transition-colors duration-300">
      
      {/* Mobile Header */}
      <div className="md:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 p-4 flex justify-between items-center z-50">
         <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
            <BrainCircuit className="text-primary-600 dark:text-primary-400" /> Study Baddie
         </div>
         <div className="flex gap-2">
            <button 
               onClick={toggleDarkMode}
               className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
               {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-slate-800 dark:text-slate-100">
              {mobileMenuOpen ? <XIcon /> : <Menu />}
            </button>
         </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 dark:bg-slate-950 text-white transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 border-r border-slate-800
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 border-b border-slate-800 flex items-center gap-2">
          <BrainCircuit className="text-primary-400" />
          <span className="font-bold text-xl tracking-tight">Study Baddie</span>
        </div>

        <div className="p-4 space-y-6">
           <div>
             <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 px-2">Current Session</h3>
             <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
               <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-primary-500/20 rounded text-primary-400">
                    <FileText size={16} />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium text-slate-200 truncate">{session.title || session.fileName}</p>
                    <p className="text-xs text-slate-500">{new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
               </div>
             </div>
           </div>

           <nav className="space-y-1">
             <button
                onClick={() => { setActiveTab(TabView.SUMMARY); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === TabView.SUMMARY ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                <BookOpen size={18} /> Summary
             </button>
             <button
                onClick={() => { setActiveTab(TabView.FLASHCARDS); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === TabView.FLASHCARDS ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                <Layout size={18} /> Flashcards
             </button>
             <button
                onClick={() => { setActiveTab(TabView.CHAT); setMobileMenuOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === TabView.CHAT ? 'bg-primary-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
             >
                <MessageSquare size={18} /> Chat Assistant
             </button>
           </nav>
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
             <img src={user.avatar} className="w-8 h-8 rounded-full bg-slate-700" alt="User"/>
             <div className="flex-1 overflow-hidden">
               <p className="text-sm font-medium text-white truncate">{user.name}</p>
               <p className="text-xs text-slate-500 truncate">{user.email}</p>
             </div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
          >
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-[calc(100vh-60px)] md:h-screen overflow-hidden">
         {/* Top Bar (Desktop) */}
         <header className="hidden md:flex h-16 bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 px-8 items-center justify-between z-20">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              {activeTab === TabView.SUMMARY && <><BookOpen className="text-primary-500" /> Document Summary</>}
              {activeTab === TabView.FLASHCARDS && <><Layout className="text-primary-500" /> Study Flashcards</>}
              {activeTab === TabView.CHAT && <><Sparkles className="text-primary-500" /> AI Assistant</>}
            </h2>
            <div className="flex items-center gap-4">
               {activeTab === TabView.SUMMARY && (
                  <div className="relative flex items-center gap-2">
                     <button
                        onClick={handleRegenerateSummary}
                        disabled={isRegenerating || isExporting}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 text-sm font-medium text-indigo-700 dark:text-indigo-300 transition-colors border border-indigo-200 dark:border-indigo-800"
                    >
                        {isRegenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Regenerate
                    </button>
                     <div className="relative">
                        <button
                            onClick={() => setExportMenuOpen(!exportMenuOpen)}
                            disabled={isExporting}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-sm font-medium text-gray-700 dark:text-gray-200 transition-colors"
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                            Export Notes
                        </button>
                        
                        {exportMenuOpen && (
                            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-50 animate-in fade-in zoom-in-95 duration-200">
                            <button 
                                onClick={() => handleExport('png')}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                            >
                                <ImageIcon className="w-4 h-4 text-primary-500" /> Download Image (PNG)
                            </button>
                            <button 
                                onClick={() => handleExport('pdf')}
                                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2 text-gray-700 dark:text-gray-200"
                            >
                                <FileIcon className="w-4 h-4 text-red-500" /> Download PDF
                            </button>
                            </div>
                        )}
                        
                        {/* Overlay to close menu */}
                        {exportMenuOpen && (
                            <div className="fixed inset-0 z-40" onClick={() => setExportMenuOpen(false)} />
                        )}
                     </div>
                  </div>
               )}
               <button 
                  onClick={toggleDarkMode}
                  className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
               >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
               </button>
            </div>
         </header>

         <div className="flex-1 overflow-hidden p-0 md:p-6 bg-gray-100 dark:bg-slate-950">
           {/* Summary Tab */}
           {activeTab === TabView.SUMMARY && (
             <div className="h-full w-full overflow-y-auto p-4 md:p-8 custom-scrollbar relative z-0">
               <div 
                 ref={summaryRef}
                 id="summary-content"
                 className={`
                   mx-auto
                   w-full max-w-4xl min-h-[95%] shadow-2xl 
                   bg-[#fffdf0] dark:bg-[#1e293b] 
                   text-xl
                   text-slate-800 dark:text-slate-200
                   relative
                   rounded-sm
                   transition-colors duration-300
                   pb-20
                 `}
                 style={{
                     fontFamily: '"Patrick Hand", cursive',
                     lineHeight: '2rem',
                     // Stacked backgrounds: Holes (Top), Margin (Middle), Lines (Bottom)
                     backgroundImage: `
                       radial-gradient(circle, ${isDarkMode ? '#020617' : '#f3f4f6'} 30%, transparent 31%),
                       linear-gradient(90deg, transparent 3rem, ${isDarkMode ? '#ef444433' : '#fca5a5'} 3rem, ${isDarkMode ? '#ef444433' : '#fca5a5'} 3.1rem, transparent 3.1rem),
                       linear-gradient(${isDarkMode ? '#334155' : '#e5e7eb'} 1px, transparent 1px)
                     `,
                     backgroundSize: '2rem 2rem, 100% 2rem, 100% 2rem',
                     backgroundPosition: '0.5rem 1rem, 0 0, 0 2rem', // Holes slightly indented, Lines start after header area
                     backgroundRepeat: 'repeat-y, repeat, repeat'
                 }}
               >
                   {/* Regeneration Overlay */}
                   {isRegenerating && (
                       <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm rounded-sm">
                           <div className="sticky top-[45vh] -translate-y-1/2 flex flex-col items-center justify-center">
                               <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
                               <p className="text-xl font-bold text-primary-700 dark:text-primary-300">Regenerating Summary...</p>
                           </div>
                       </div>
                   )}

                   {/* Content */}
                   <div className={`p-8 pl-16 pt-8 ${isRegenerating ? 'opacity-50' : ''}`}>
                       <h1 className="text-4xl font-bold mb-8 text-indigo-600 dark:text-indigo-400 leading-[4rem]">
                           {session.title || session.fileName}
                       </h1>
                       
                       <ReactMarkdown
                         components={{
                           h1: ({node, ...props}) => <h1 className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mb-8 mt-8 leading-[4rem]" {...props} />,
                           h2: ({node, ...props}) => <h2 className="text-2xl font-bold text-indigo-500 dark:text-indigo-300 mb-8 mt-8 leading-[4rem]" {...props} />,
                           h3: ({node, ...props}) => <h3 className="text-xl font-bold text-indigo-500 dark:text-indigo-300 mb-8 mt-8 leading-[2rem]" {...props} />,
                           p: ({node, ...props}) => <p className="mb-8 leading-[2rem]" {...props} />,
                           ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-8 space-y-0" {...props} />,
                           ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-8 space-y-0" {...props} />,
                           li: ({node, ...props}) => <li className="leading-[2rem] pl-2 marker:text-indigo-400" {...props} />,
                           strong: ({node, ...props}) => <strong className="font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 px-1 rounded" {...props} />,
                           blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-indigo-300 pl-4 italic mb-8" {...props} />,
                         }}
                       >
                         {session.summary}
                       </ReactMarkdown>
                   </div>
               </div>
             </div>
           )}

            {/* Flashcards Tab Container - wrapped to match structure */}
            {activeTab === TabView.FLASHCARDS && (
              <div className="h-full w-full max-w-6xl mx-auto bg-gray-50 dark:bg-slate-950 md:rounded-2xl overflow-hidden relative transition-colors duration-300 flex flex-col">
                 <FlashcardRunner cards={session.flashcards} />
              </div>
            )}

            {/* Chat Tab Container */}
            {activeTab === TabView.CHAT && (
               <div className="h-full w-full max-w-6xl mx-auto bg-white dark:bg-slate-900 md:rounded-2xl md:shadow-sm md:border border-gray-200 dark:border-slate-800 overflow-hidden relative transition-colors duration-300">
                 <ChatBot 
                    history={session.chatHistory} 
                    setHistory={(updater) => {
                      if (typeof updater === 'function') {
                        setSession(prev => prev ? ({ ...prev, chatHistory: updater(prev.chatHistory) }) : null);
                      } else {
                        setSession(prev => prev ? ({ ...prev, chatHistory: updater }) : null);
                      }
                    }}
                    fileData={session.fileData}
                    fileType={session.fileType}
                 />
               </div>
            )}
         </div>
      </main>
    </div>
  );
};

export default App;