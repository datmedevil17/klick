"use client"

import { useState, useEffect } from "react"
import { KeyboardScene } from "@/components/keyboard-scene"
import { EntryPage } from "@/components/entry-page"
import { TypingSettings } from "@/components/settings-modal"

export default function Page() {
  const [hasEntered, setHasEntered] = useState(false)
  const [settings, setSettings] = useState<TypingSettings>({
    difficulty: 'common',
    duration: 60,
    wordCount: 100
  })

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
    if (customSettings) {
      setSettings(customSettings)
    }
    setHasEntered(true)
  }

  const handleBackToMenu = () => {
    setHasEntered(false)
  }

  if (!hasEntered) {
    return <EntryPage onEnter={handleEnter} />
  }

  return (
    <main className="w-full h-screen bg-neutral-950 overflow-hidden flex flex-col">
      <KeyboardScene settings={settings} onBackToMenu={handleBackToMenu} />
    </main>
  )
}
