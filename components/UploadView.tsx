import React from 'react';
import { Upload, BrainCircuit, Loader2, Sun, Moon } from 'lucide-react';

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
    <div className="min-h-screen relative flex flex-col items-center justify-center p-6 overflow-hidden transition-colors duration-500 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      
      {/* Dotted Grid Background */}
      <div className="absolute inset-0 z-0 pointer-events-none" style={{
        backgroundImage: isDarkMode 
          ? 'radial-gradient(#3f3f46 1px, transparent 1px)' 
          : 'radial-gradient(#e4e4e7 1px, transparent 1px)',
        backgroundSize: '24px 24px'
      }}></div>

      <button 
        onClick={toggleDarkMode} 
        className="absolute top-6 right-6 p-2 rounded-full border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all z-10"
      >
        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>

      <div className="relative z-10 w-full max-w-xl text-center">
        
        <div className="flex justify-center mb-8">
          <div className="p-3 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900 shadow-sm">
            <BrainCircuit className="w-10 h-10 text-zinc-900 dark:text-white" />
          </div>
        </div>
        
        <h1 className="text-5xl font-serif font-medium tracking-tight text-zinc-900 dark:text-white mb-6">
          Study Baddie
        </h1>
        
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-12 font-light leading-relaxed max-w-md mx-auto">
          Upload documents. Generate summaries. <br/>
          Master your materials with AI.
        </p>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 p-8">
          <label className="relative flex flex-col items-center justify-center w-full h-48 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-all cursor-pointer">
            {isProcessing ? (
              <div className="flex flex-col items-center animate-in fade-in duration-300">
                <Loader2 className="w-8 h-8 text-zinc-900 dark:text-white animate-spin mb-4" />
                <p className="text-zinc-600 dark:text-zinc-300 font-medium font-serif italic">Processing...</p>
              </div>
            ) : (
              <>
                <div className="p-3 bg-zinc-100 dark:bg-zinc-800 rounded-full mb-4">
                  <Upload className="w-6 h-6 text-zinc-700 dark:text-zinc-300" />
                </div>
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">Upload PDF or Image</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-2">Drag and drop or click to browse</p>
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
          <div className="mt-6 p-4 bg-zinc-50 dark:bg-zinc-900 border border-red-200 dark:border-red-900/30 rounded-lg text-red-600 dark:text-red-400 text-sm animate-in slide-in-from-top-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadView;