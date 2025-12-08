import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ChatMessage } from '../types';
import { chatWithDocument } from '../services/geminiService';

interface ChatBotProps {
  history: ChatMessage[];
  setHistory: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  fileData: string;
  fileType: string;
  isMobile?: boolean;
}

export interface ChatBotHandle {
  askQuestion: (question: string) => void;
}

const ChatBot = forwardRef<ChatBotHandle, ChatBotProps>(({ history, setHistory, fileData, fileType, isMobile }, ref) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [history]);

  const handleSend = async (messageOverride?: string) => {
    const textToSend = messageOverride || input;
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', text: textToSend, timestamp: Date.now() };
    setHistory(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Prepare history for API (exclude timestamps, ensure correct typing)
      const apiHistory = history.map(h => ({ role: h.role, text: h.text }));
      
      const responseText = await chatWithDocument(apiHistory, userMsg.text, fileData, fileType);
      
      const botMsg: ChatMessage = { role: 'model', text: responseText, timestamp: Date.now() };
      setHistory(prev => [...prev, botMsg]);
    } catch (error) {
      console.error(error);
      const errorMsg: ChatMessage = { role: 'model', text: "Sorry, I encountered an error connecting to the AI. Please try again.", timestamp: Date.now() };
      setHistory(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  useImperativeHandle(ref, () => ({
    askQuestion: (question: string) => {
      handleSend(question);
    }
  }));

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-zinc-950 shadow-sm border-l border-gray-200 dark:border-zinc-800 overflow-hidden transition-colors duration-300 ${isMobile ? 'border-l-0' : ''}`}>
      {/* Header if needed, but App usually handles it. Adding small header for context if standalone */}
      <div className="p-3 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950 flex items-center gap-2">
         <Bot className="w-4 h-4 text-primary-500" />
         <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Assistant</span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/30 dark:bg-zinc-950 custom-scrollbar">
        {history.length === 0 && (
          <div className="text-center text-gray-400 dark:text-gray-500 mt-10 animate-in fade-in zoom-in duration-500">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Highlight text in the notes to ask me to explain it!</p>
          </div>
        )}
        {history.map((msg, idx) => (
          <div
            key={idx}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-tr-none'
                  : 'bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-gray-100 rounded-tl-none shadow-sm'
              }`}
            >
               <div className="w-full overflow-hidden">
                 {msg.role === 'model' ? (
                   <div className="markdown-content">
                     <ReactMarkdown
                       components={{
                         p: ({node, ...props}) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                         a: ({node, ...props}) => <a className="text-primary-600 dark:text-primary-400 hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                         ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
                         ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-2 last:mb-0 space-y-1" {...props} />,
                         li: ({node, ...props}) => <li className="pl-1" {...props} />,
                         h1: ({node, ...props}) => <h1 className="text-base font-bold mb-2 mt-4 first:mt-0" {...props} />,
                         h2: ({node, ...props}) => <h2 className="text-sm font-bold mb-2 mt-3 first:mt-0" {...props} />,
                         code: ({node, inline, className, children, ...props}: any) => {
                           const match = /language-(\w+)/.exec(className || '');
                           return !inline ? (
                             <div className="my-2 rounded-md overflow-hidden bg-slate-100 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800">
                                <pre className="p-2 overflow-x-auto text-xs font-mono scrollbar-hide">
                                   <code className={className} {...props}>
                                     {children}
                                   </code>
                                </pre>
                             </div>
                           ) : (
                             <code className="bg-slate-100 dark:bg-zinc-800 px-1 py-0.5 rounded font-mono text-xs border border-slate-200 dark:border-zinc-700 text-pink-600 dark:text-pink-400" {...props}>
                               {children}
                             </code>
                           )
                         }
                       }}
                     >
                       {msg.text}
                     </ReactMarkdown>
                   </div>
                 ) : (
                   <div className="whitespace-pre-wrap">{msg.text}</div>
                 )}
               </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start w-full">
            <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl rounded-tl-none px-3 py-2 shadow-sm flex items-center gap-2">
              <Loader2 className="w-3 h-3 animate-spin text-primary-500" />
              <span className="text-xs text-gray-500 dark:text-gray-400">Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask a question..."
            className="flex-1 border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-gray-800 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all text-sm"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="bg-primary-600 hover:bg-primary-700 text-white p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
});

export default ChatBot;
