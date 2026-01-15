import { cn } from "@/lib/utils"

interface TerminalProps {
  capsLock: boolean
  words: string[]
  currentWordIndex: number
  typedText: string
  timeLeft: number
  hasStarted: boolean
  wpm: number
  accuracy: number
}

export function Terminal({ 
  capsLock, 
  words, 
  currentWordIndex, 
  typedText, 
  timeLeft, 
  hasStarted, 
  wpm, 
  accuracy 
}: TerminalProps) {
  const currentWord = words[currentWordIndex] || ""
  const isCurrentWordCorrect = currentWord.startsWith(typedText)
  
  // Get visible words (current and next few)
  const visibleWords = words.slice(currentWordIndex, currentWordIndex + 15)
  
  return (
    <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 w-[95%] md:w-[90%] max-w-4xl z-10 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-md border border-white/10 rounded-lg p-4 md:p-6 shadow-2xl text-green-400 font-mono min-h-[200px] md:min-h-[300px] max-h-[45vh] md:max-h-[50vh] overflow-hidden flex flex-col transition-all duration-300 pointer-events-auto">
        <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500/50" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
            <div className="w-3 h-3 rounded-full bg-green-500/50" />
          </div>
          <div className="flex items-center gap-6">
            {capsLock && <span className="text-xs text-yellow-500 font-bold uppercase tracking-widest">CAPS</span>}
            <div className="flex items-center gap-4 text-xs text-white/70">
              <span>Time: <span className="text-white font-bold">{Math.max(0, timeLeft)}s</span></span>
              <span>WPM: <span className="text-green-400 font-bold">{wpm}</span></span>
              <span>Accuracy: <span className="text-blue-400 font-bold">{accuracy.toFixed(1)}%</span></span>
            </div>
            <span className="text-xs text-white/30 uppercase tracking-widest">Typing Practice</span>
          </div>
        </div>

        {/* Instructions */}
        {!hasStarted && (
          <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-blue-300 text-sm">
            💡 Start typing to begin the 60-second challenge. Type each word exactly and press space to move to the next word.
          </div>
        )}

        {/* Words Display */}
        <div className="flex-1 overflow-y-auto">
          <div className="text-lg leading-relaxed flex flex-wrap gap-x-2 gap-y-1">
            {visibleWords.map((word, index) => {
              const wordIndex = currentWordIndex + index
              const isCurrentWord = index === 0
              const isPreviousWord = wordIndex < currentWordIndex
              
              return (
                <span
                  key={`${wordIndex}-${word}`}
                  className={cn(
                    "relative px-1 py-0.5 rounded transition-all duration-200",
                    {
                      // Current word styling
                      "bg-blue-900/30 border border-blue-500/50": isCurrentWord,
                      "text-green-400": isCurrentWord && isCurrentWordCorrect,
                      "text-red-400": isCurrentWord && !isCurrentWordCorrect && typedText.length > 0,
                      
                      // Previous words styling
                      "text-green-600 bg-green-900/20": isPreviousWord,
                      
                      // Future words styling
                      "text-gray-400": !isCurrentWord && !isPreviousWord,
                    }
                  )}
                >
                  {isCurrentWord && typedText ? (
                    <>
                      {/* Show typed portion */}
                      <span className={cn({
                        "text-green-400": isCurrentWordCorrect,
                        "text-red-400": !isCurrentWordCorrect
                      })}>
                        {typedText}
                      </span>
                      {/* Show remaining portion */}
                      <span className="text-gray-500">
                        {word.slice(typedText.length)}
                      </span>
                    </>
                  ) : (
                    word
                  )}
                  
                  {/* Cursor */}
                  {isCurrentWord && (
                    <span className="absolute -right-1 top-0 bottom-0 w-0.5 bg-green-400 animate-pulse" />
                  )}
                </span>
              )
            })}
          </div>
        </div>

        {/* Current Input Display */}
        <div className="mt-4 pt-3 border-t border-white/10">
          <div className="text-green-400 flex gap-2 items-center">
            <span className="opacity-70 select-none">{"> "}</span>
            <span className="text-lg">
              <span className={cn({
                "text-green-400": isCurrentWordCorrect,
                "text-red-400": !isCurrentWordCorrect && typedText.length > 0,
                "text-white": typedText.length === 0
              })}>
                {typedText}
              </span>
              <span className="inline-block w-0.5 h-6 bg-green-400 ml-1 animate-pulse" />
            </span>
          </div>
          {/* Show current target word */}
          <div className="text-sm text-gray-500 mt-1 ml-8">
            Target: <span className="text-white">{currentWord}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
