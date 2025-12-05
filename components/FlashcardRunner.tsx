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
    // Reset state when card changes
    if (!isTransitioning) {
      setIsFlipped(false);
      setUserAnswer('');
      setFeedback('idle');
    }

    // Shuffle options for MC mode if they exist
    if (currentCard?.options) {
      setShuffledOptions([...currentCard.options].sort(() => Math.random() - 0.5));
    } else if (currentCard) {
        // Fallback if no options exist
        setShuffledOptions([currentCard.answer]);
    }
  }, [currentIndex, currentCard, isTransitioning]);

  const normalize = (text: string) => text.toLowerCase().trim().replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, "");

  const checkAnswer = (answerOverride?: string) => {
    if (isTransitioning) return;
    const input = answerOverride || userAnswer;
    if (!input.trim()) return;

    // Update state if override provided (MC mode) so we track what was clicked
    if (answerOverride) {
      setUserAnswer(answerOverride);
    }

    const normalizedUser = normalize(input);
    const normalizedCorrect = normalize(currentCard.answer);

    const isCorrect = normalizedUser === normalizedCorrect || normalizedCorrect.includes(normalizedUser) && normalizedUser.length > 3;

    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + 1);
      // Auto advance after short delay
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
      // If the card is currently flipped (showing answer), we want to animate it closing 
      // BEFORE we switch the content to the next card. This prevents the user from 
      // seeing the *next* answer on the back of the card while it rotates.
      if (isFlipped) {
        setIsTransitioning(true);
        setIsFlipped(false); // Start rotating back to front
        
        // Wait for half the transition (or enough for the back to be hidden)
        setTimeout(() => {
          setCurrentIndex(prev => prev + 1);
          setIsTransitioning(false);
          // Note: The useEffect will fire here to reset answer/feedback
        }, 600); // Matches or slightly less than duration-700 to feel snappy
      } else {
        // If not flipped, just switch immediately (or could add slide effect later)
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
        <div className="bg-yellow-100 dark:bg-yellow-900/30 p-6 rounded-full mb-6">
          <Trophy className="w-12 h-12 text-yellow-600 dark:text-yellow-500" />
        </div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-2">Session Complete!</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">You scored {score} out of {cards.length}</p>
        <button
          onClick={restart}
          className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
        >
          <RefreshCw className="w-5 h-5" />
          Study Again
        </button>
      </div>
    );
  }

  // Determines if the app has options available to show the choice mode
  const hasOptions = currentCard.options && currentCard.options.length > 1;

  return (
    <div className="flex flex-col h-full max-w-3xl mx-auto w-full p-4">
      {/* Header with Mode Toggle */}
      <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
        <div className="text-sm text-gray-500 dark:text-gray-400 font-medium">
            <span>Card {currentIndex + 1} of {cards.length}</span>
            <span className="mx-2">•</span>
            <span>Score: {score}</span>
        </div>

        {hasOptions && (
            <div className="flex bg-gray-200 dark:bg-slate-800 p-1 rounded-lg">
                <button
                    onClick={() => setMode('classic')}
                    disabled={isTransitioning}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'classic' ? 'bg-white dark:bg-slate-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <Keyboard className="w-4 h-4" /> Classic
                </button>
                <button
                    onClick={() => setMode('choice')}
                    disabled={isTransitioning}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${mode === 'choice' ? 'bg-white dark:bg-slate-600 shadow text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}
                >
                    <LayoutGrid className="w-4 h-4" /> Multiple Choice
                </button>
            </div>
        )}
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-8">
        <div 
          className="bg-primary-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${((currentIndex) / cards.length) * 100}%` }}
        ></div>
      </div>

      {/* Card Container */}
      <div className="relative flex-1 min-h-[500px] perspective-1000 mb-8">
        <div 
          className={`relative w-full h-full transition-transform duration-700 preserve-3d shadow-xl rounded-2xl ${isFlipped ? 'rotate-y-180' : ''}`}
        >
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl p-6 sm:p-8 flex flex-col transition-colors">
            <div className="flex-none mb-4">
              <span className="text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">Question</span>
            </div>
            
            <div className="flex-1 flex items-center justify-center overflow-y-auto custom-scrollbar my-4">
               <h3 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 leading-relaxed text-center">{currentCard.question}</h3>
            </div>
            
            {/* Input Area / Options Area */}
            <div className="flex-none w-full max-w-lg mx-auto mt-auto">
               
               {mode === 'classic' ? (
                   /* CLASSIC MODE */
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
                          placeholder="Type your answer here..."
                          disabled={feedback === 'correct' || isTransitioning}
                          rows={3}
                          className={`w-full p-4 pr-14 rounded-xl border-2 outline-none transition-all resize-none placeholder-gray-400 ${
                            feedback === 'correct' ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 
                            feedback === 'wrong' ? 'border-red-300 bg-red-50 dark:bg-red-900/20' : 
                            'bg-white dark:bg-slate-900 text-gray-800 dark:text-white border-gray-200 dark:border-slate-700 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/20'
                          }`}
                        />
                        <button 
                          onClick={() => checkAnswer()}
                          disabled={!userAnswer.trim() || feedback !== 'idle' || isTransitioning}
                          className="absolute right-3 bottom-3 p-2 flex items-center justify-center bg-gray-700 hover:bg-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
                          title="Submit Answer"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                       </div>
                   </>
               ) : (
                   /* MULTIPLE CHOICE MODE */
                   <div className="grid grid-cols-1 gap-3">
                       {shuffledOptions.map((option, idx) => (
                           <button
                               key={idx}
                               onClick={() => checkAnswer(option)}
                               disabled={feedback !== 'idle' || isTransitioning}
                               className={`w-full p-4 text-left rounded-xl border-2 transition-all font-medium text-sm sm:text-base ${
                                   feedback === 'correct' && normalize(option) === normalize(currentCard.answer)
                                       ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                       : feedback === 'wrong' && normalize(option) === normalize(userAnswer)
                                       ? 'border-red-300 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                                       : 'bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-200'
                               }`}
                           >
                               <div className="flex items-center gap-3">
                                   <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border ${
                                       feedback === 'correct' && normalize(option) === normalize(currentCard.answer) ? 'border-green-500 text-green-700 dark:text-green-400' : 'border-gray-300 dark:border-slate-600 text-gray-400'
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
                 <div className="mt-2 text-green-600 dark:text-green-400 font-medium flex items-center justify-center gap-1 animate-in slide-in-from-bottom-2 h-6">
                   <Check className="w-4 h-4" /> Correct! Next card coming...
                 </div>
               )}
               {feedback !== 'correct' && <div className="h-8"></div>}
            </div>
          </div>

          {/* Back */}
          <div className="absolute w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-slate-900 text-gray-800 dark:text-white rounded-2xl p-8 flex flex-col items-center justify-center text-center border border-gray-200 dark:border-slate-700">
            <span className="absolute top-6 left-6 text-xs font-bold tracking-wider text-gray-400 dark:text-slate-400 uppercase">Correct Answer</span>
            <div className="flex-1 flex items-center justify-center w-full overflow-y-auto custom-scrollbar p-2">
              <p className="text-xl font-medium leading-relaxed">{currentCard.answer}</p>
            </div>
            
            <div className="flex-none mt-8 flex gap-4">
              <button 
                onClick={() => {
                  setIsFlipped(false);
                  setFeedback('idle');
                }}
                disabled={isTransitioning}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors text-gray-700 dark:text-white"
              >
                <RotateCw className="w-4 h-4" /> Try Again
              </button>
              <button 
                onClick={handleNext}
                disabled={isTransitioning}
                className="flex items-center gap-2 px-6 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-slate-900 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
              >
                Next Card <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FlashcardRunner;