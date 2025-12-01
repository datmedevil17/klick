"use client"

import { Button } from "@/components/ui/button"

interface TypingStats {
  wpm: number
  accuracy: number
  totalWords: number
  correctWords: number
  incorrectWords: number
  totalCharacters: number
  correctCharacters: number
  timeSpent: number
}

interface TypingReportProps {
  stats: TypingStats
  onRestart: () => void
  onNewSession: () => void
  onBackToMenu: () => void
}

export function TypingReport({ stats, onRestart, onNewSession, onBackToMenu }: TypingReportProps) {
  const { wpm, accuracy, totalWords, correctWords, incorrectWords, totalCharacters, correctCharacters, timeSpent } = stats

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-white/20 rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-2xl font-bold text-white mb-6">Typing Report</h2>
        
        <div className="space-y-6">
          {/* Main Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-neutral-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-green-400">{wpm}</div>
              <div className="text-sm text-gray-400">WPM</div>
            </div>
            <div className="bg-neutral-800 rounded-lg p-4">
              <div className="text-3xl font-bold text-blue-400">{accuracy.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Accuracy</div>
            </div>
          </div>

          {/* Detailed Stats */}
          <div className="space-y-3 text-left">
            <div className="flex justify-between">
              <span className="text-gray-400">Time:</span>
              <span className="text-white">{Math.round(timeSpent)}s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Words:</span>
              <span className="text-white">{totalWords}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Correct Words:</span>
              <span className="text-green-400">{correctWords}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Incorrect Words:</span>
              <span className="text-red-400">{incorrectWords}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Characters:</span>
              <span className="text-white">{correctCharacters}/{totalCharacters}</span>
            </div>
          </div>

          {/* Performance Rating */}
          <div className="bg-neutral-800 rounded-lg p-4">
            <div className="text-lg font-semibold text-white mb-2">Performance</div>
            <div className="text-sm text-gray-400">
              {wpm >= 60 && accuracy >= 95 ? "🏆 Excellent!" :
               wpm >= 40 && accuracy >= 90 ? "🎯 Good Job!" :
               wpm >= 25 && accuracy >= 80 ? "👍 Keep Practicing!" :
               "💪 Room for Improvement!"}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button 
              onClick={onRestart}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Try Again
            </Button>
            <Button 
              onClick={onNewSession}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10"
            >
              New Word Set
            </Button>
            <Button 
              onClick={onBackToMenu}
              variant="outline"
              className="w-full border-white/20 text-gray-400 hover:bg-white/10 hover:text-white"
            >
              Back to Menu
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
