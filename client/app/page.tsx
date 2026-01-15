"use client"

import { useState, useEffect } from "react"
import { KeyboardScene } from "@/components/keyboard-scene"
import { EntryPage } from "@/components/entry-page"
import { TypingSettings } from "@/components/settings-modal"
import { useTypingGameProgram } from "@/hooks/use-typing-game"

export default function Page() {
  const [hasEntered, setHasEntered] = useState(false)
  const [settings, setSettings] = useState<TypingSettings>({
    difficulty: 'common',
    duration: 3,
    wordCount: 100
  })

  // Instantiate the game hook here to share state
  const game = useTypingGameProgram()

  // Handle Enter key on entry page
  useEffect(() => {
    if (!hasEntered) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Enter") {
          setHasEntered(true)
        }
      }

      window.addEventListener("keydown", handleKeyDown)
      return () => window.removeEventListener("keydown", handleKeyDown)
    }
  }, [hasEntered])

  const handleEnter = (customSettings?: TypingSettings) => {
    console.log("🎮 [Page] Entering game with settings:", customSettings || settings)
    if (customSettings) {
      setSettings(customSettings)
    }
    setHasEntered(true)
  }

  const [isEnding, setIsEnding] = useState(false)

  const handleBackToMenu = async () => {
    if (isEnding) return
    console.log("🎮 [Page] Back to menu clicked - undelegating session...")
    setIsEnding(true)
    
    // Attempt to undelegate session on chain
    try {
        console.log("🎮 [Page] Undelegating from ER...")
        await game.undelegate()
        console.log("🎮 [Page] ✅ Successfully undelegated")
    } catch (error) {
        console.error("🎮 [Page] ❌ Error undelegating session:", error)
        // Proceed anyway to allow user to exit
    }

    setIsEnding(false)
    setHasEntered(false)
    console.log("🎮 [Page] Returned to entry page")
  }

  if (!hasEntered) {

    return <EntryPage onEnter={handleEnter} game={game} />
  }

  return (
    <main className="w-full h-screen bg-neutral-950 overflow-hidden flex flex-col">

      <KeyboardScene settings={settings} onBackToMenu={handleBackToMenu} game={game} />
    </main>
  )
}
