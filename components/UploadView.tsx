import React from 'react';
import { Upload, BrainCircuit, Sparkles, Loader2, Sun, Moon } from 'lucide-react';

interface UploadViewProps {
  isProcessing: boolean;
  error: string | null;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const UploadView: React.FC<UploadViewProps> = ({ 
  isProcessing, 
  error, 
  onUpload, 
  isDarkMode, 
  toggleDarkMode 
}) => {
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
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-purple-600 dark:from-primary-400 dark:to-purple-400 mb-4 pb-2">
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
              onChange={onUpload}
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
};

export default UploadView;