import React, { useState, useEffect } from 'react';
import { Flashcard } from '../types';
import { Check, X, RefreshCw, ChevronRight, RotateCw, Trophy, LayoutGrid, Keyboard } from 'lucide-react';

interface FlashcardRunnerProps {
  cards: Flashcard[];
}

type StudyMode = 'classic' | 'choice';

const FlashcardRunner: React.FC<FlashcardRunnerProps> = ({ cards }) => {
  const [mode, setMode] = useState<StudyMode>('classic');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [completed, setCompleted] = useState(false);
  const [score, setScore] = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const currentCard = cards[currentIndex];

  useEffect(() => {
    if (!isTransitioning) {
      setIsFlipped(false);
      setUserAnswer('');
      setFeedback('idle');
    }

    if (currentCard?.options) {
      setShuffledOptions([...currentCard.options].sort(() => Math.random() - 0.5));
    } else if (currentCard) {
        setShuffledOptions([currentCard.answer]);
    }
  }, [currentIndex, currentCard, isTransitioning]);

  const normalize = (text: string) => text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

  const checkAnswer = (answerOverride?: string) => {
    if (isTransitioning) return;
    const input = answerOverride || userAnswer;
    if (!input.trim()) return;

    if (answerOverride) {
      setUserAnswer(answerOverride);
    }

    const normalizedUser = normalize(input);
    const normalizedCorrect = normalize(currentCard.answer);

    const isCorrect = normalizedUser === normalizedCorrect || normalizedCorrect.includes(normalizedUser) && normalizedUser.length > 3;

    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 1);
      setTimeout(() => {
        handleNext();
      }, 1000);
    } else {
      setFeedback('wrong');
      setIsFlipped(true);
    }
  };

  const handleNext = () => {
    if (isTransitioning) return;

    if (currentIndex < cards.length - 1) {
      if (isFlipped) {
        setIsTransitioning(true);
        setIsFlipped(false); 
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setIsTransitioning(false);
        }, 600);
      } else {
        setCurrentIndex(prev => prev + 1);
      }
    } else {
      setCompleted(true);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setScore(0);
    setCompleted(false);
    setIsFlipped(false);
    setFeedback('idle');
    setUserAnswer('');
    setIsTransitioning(false);
  };

  if (completed) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-in fade-in zoom-in duration-300">
        <div className="bg-zinc-100 dark:bg-zinc-800 p-6 rounded-full mb-6 border border-zinc-200 dark:border-zinc-700">
          <Trophy className="w-12 h-12 text-zinc-900 dark:text-white" />
        </div>
        <h2 className="text-3xl font-serif font-bold text-zinc-900 dark:text-white mb-2">Session Complete</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mb-8 font-mono text-sm">SCORE: {score} / {cards.length}</p>
        <button
          onClick={restart}
          className="flex items-center gap-2 px-6 py-3 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity font-medium"
        >
          <RefreshCw className="w-4 h-4" />
          Study Again
        </button>
      </div>
    );
  }

  const hasOptions = currentCard.options && currentCard.options.length > 1;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full p-6">
      <div className="flex flex-col sm:flex-row items-center justify-between mb-8 gap-4">
        <div className="text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            <span>Card {currentIndex + 1} / {cards.length}</span>
            <span className="mx-3">|</span>
            <span>Score: {score}</span>
        </div>

        {hasOptions && (
            <div className="flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <button
                    onClick={() => setMode('classic')}
                    disabled={isTransitioning}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${mode === 'classic' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                    <Keyboard className="w-3 h-3" /> Classic
                </button>
                <button
                    onClick={() => setMode('choice')}
                    disabled={isTransitioning}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${mode === 'choice' ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                    <LayoutGrid className="w-3 h-3" /> Quiz
                </button>
            </div>
        )}
      </div>

      <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-1 mb-8">
        <div 
          className="bg-zinc-900 dark:bg-white h-1 transition-all duration-500"
          style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
        ></div>
      </div>

      <div className="relative flex-1 min-h-[500px] perspective-1000 mb-8">
        <div 
          className={`relative w-full h-full transition-transform duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 flex flex-col transition-colors shadow-sm">
            <div className="flex-none mb-4">
              <span className="text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-600 uppercase border border-zinc-200 dark:border-zinc-800 px-2 py-1 rounded">Question</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar my-4">
               <h3 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 leading-relaxed text-center">{currentCard.question}</h3>
            </div>
            
            <div className="flex-none w-full max-w-lg mx-auto mt-auto">
               {mode === 'classic' ? (
                   <>
                       <div className="relative">
                         <textarea
                          value={userAnswer}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              checkAnswer();
                            }
                          }}
                          placeholder="Type your answer..."
                          disabled={feedback === 'correct' || isTransitioning}
                          rows={3}
                          className={`w-full p-4 pr-14 rounded-lg border outline-none transition-all resize-none placeholder-zinc-400 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100 ${
                            feedback === 'correct' ? 'border-green-500' : 
                            feedback === 'wrong' ? 'border-red-500' : 
                            'border-zinc-200 dark:border-zinc-700'
                          }`}
                        />
                        <button 
                          onClick={() => checkAnswer()}
                          disabled={!userAnswer.trim() || feedback !== 'idle' || isTransitioning}
                          className="absolute right-3 bottom-3 p-2 flex items-center justify-center bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-white dark:text-zinc-900 transition-colors"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                       </div>
                   </>
               ) : (
                   <div className="grid grid-cols-1 gap-3">
                       {shuffledOptions.map((option, idx) => (
                           <button
                               key={idx}
                               onClick={() => checkAnswer(option)}
                               disabled={feedback !== 'idle' || isTransitioning}
                               className={`w-full p-4 text-left rounded-lg border transition-all font-medium text-sm ${
                                   feedback === 'correct' && normalize(option) === normalize(currentCard.answer)
                                       ? 'border-green-500 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400'
                                       : feedback === 'wrong' && normalize(option) === normalize(userAnswer)
                                       ? 'border-red-500 bg-red-50 dark:bg-red-900/10 text-red-700 dark:text-red-400'
                                       : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600 text-zinc-700 dark:text-zinc-200'
                               }`}
                           >
                               <div className="flex items-center gap-4">
                                   <div className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-mono border ${
                                       feedback === 'correct' && normalize(option) === normalize(currentCard.answer) ? 'border-green-500 text-green-700 dark:text-green-400' : 'border-zinc-200 dark:border-zinc-700 text-zinc-400'
                                   }`}>
                                       {String.fromCharCode(65 + idx)}
                                   </div>
                                   {option}
                               </div>
                           </button>
                       ))}
                   </div>
               )}

               {feedback === 'correct' && (
                 <div className="mt-4 text-green-600 dark:text-green-400 font-mono text-xs uppercase tracking-widest text-center animate-in slide-in-from-bottom-2">
                   Correct
                 </div>
               )}
               {feedback !== 'correct' && <div className="h-8"></div>}
            </div>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white rounded-xl p-8 flex flex-col items-center justify-center text-center border border-zinc-200 dark:border-zinc-800">
            <span className="absolute top-6 left-6 text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Answer</span>
            <div className="flex-1 flex items-center justify-center w-full overflow-y-auto custom-scrollbar p-2">
              <p className="text-2xl font-serif leading-relaxed">{currentCard.answer}</p>
            </div>
            
            <div className="flex-none mt-8 flex gap-4">
              <button 
                onClick={() => {
                  setIsFlipped(false);
                  setFeedback('idle');
                }}
                disabled={isTransitioning}
                className="px-6 py-2 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-md text-sm font-medium transition-colors text-zinc-900 dark:text-white"
              >
                Try Again
              </button>
              <button 
                onClick={handleNext}
                disabled={isTransitioning}
                className="flex items-center gap-2 px-6 py-2 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded-md text-sm font-bold transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardRunner;