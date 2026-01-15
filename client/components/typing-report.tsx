"use client"

import { Button } from "@/components/ui/button"
import { useState } from "react"
import { useTypingGameProgram } from "@/hooks/use-typing-game"

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
  isLoading?: boolean
  game: ReturnType<typeof useTypingGameProgram>
}

export function TypingReport({ stats, onRestart, onNewSession, onBackToMenu, isLoading = false, game }: TypingReportProps) {
  const { wpm, accuracy, totalWords, correctWords, incorrectWords, totalCharacters, correctCharacters, timeSpent } = stats
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Handle saving to personal record
  const handleSaveToRecord = async () => {
    console.log("🎮 [TypingReport] Saving results to personal record...")
    setIsSaving(true)
    try {
      // First init personal record if it doesn't exist
      if (!game.personalRecordAccount) {
        console.log("🎮 [TypingReport] No personal record found, initializing...")
        await game.initPersonalRecord()
        console.log("🎮 [TypingReport] ✅ Personal record initialized")
      }
      
      // Save the session to personal record
      const tx = await game.saveToRecord()
      console.log("🎮 [TypingReport] ✅ Results saved to personal record!", tx)
      setSaved(true)
    } catch (error) {
      console.error("🎮 [TypingReport] ❌ Failed to save to record:", error)
    } finally {
      setIsSaving(false)
    }
  }

  // Get on-chain stats if available
  const chainStats = game.erSessionValue || game.sessionAccount

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

          {/* On-Chain Stats (if available) */}
          {chainStats && (
            <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3">
              <div className="text-xs text-purple-400 font-semibold mb-2">📦 On-Chain Stats</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-white font-bold">{chainStats.wordsTyped}</div>
                  <div className="text-gray-500 text-xs">Words</div>
                </div>
                <div>
                  <div className="text-green-400 font-bold">{chainStats.correctWords}</div>
                  <div className="text-gray-500 text-xs">Correct</div>
                </div>
                <div>
                  <div className="text-blue-400 font-bold">{chainStats.wpm}</div>
                  <div className="text-gray-500 text-xs">WPM</div>
                </div>
              </div>
            </div>
          )}

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

          {/* Personal Record Display */}
          {game.personalRecordAccount && (
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3">
              <div className="text-xs text-yellow-400 font-semibold mb-2">🏅 Personal Best</div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-white font-bold">{game.personalRecordAccount.bestWpm} WPM</div>
                </div>
                <div>
                  <div className="text-white font-bold">{game.personalRecordAccount.bestAccuracy}% Acc</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {game.personalRecordAccount.attemptCount} total attempts
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!saved && (
              <Button 
                onClick={handleSaveToRecord}
                disabled={isLoading || isSaving}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
              >
                {isSaving ? "Saving to Blockchain..." : "💾 Save to Personal Record"}
              </Button>
            )}
            {saved && (
              <div className="text-green-400 text-sm py-2">✅ Results saved to blockchain!</div>
            )}
            <Button 
              onClick={onRestart}
              disabled={isLoading || isSaving}
              className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              {isLoading ? "Saving Checkpoint..." : "Try Again"}
            </Button>
            <Button 
              onClick={onNewSession}
              disabled={isLoading || isSaving}
              variant="outline"
              className="w-full border-white/20 text-white hover:bg-white/10 disabled:opacity-50"
            >
              New Word Set
            </Button>
            <Button 
              onClick={onBackToMenu}
              disabled={isLoading || isSaving}
              variant="outline"
              className="w-full border-white/20 text-gray-400 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
