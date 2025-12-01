"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { SettingsModal, TypingSettings } from "@/components/settings-modal"

interface EntryPageProps {
  onEnter: (settings?: TypingSettings) => void
}

export function EntryPage({ onEnter }: EntryPageProps) {
  const [showSettings, setShowSettings] = useState(false)

  const handleQuickStart = () => {
    onEnter()
  }

  const handleCustomStart = (settings: TypingSettings) => {
    onEnter(settings)
  }

  return (
    <div className="w-full h-screen bg-neutral-950 flex flex-col items-center justify-center">
      <div className="text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-6xl font-bold text-white tracking-tight">
            Magic Click
          </h1>
          <p className="text-xl text-gray-400 max-w-md mx-auto">
            Master your typing skills with our interactive 3D keyboard experience
          </p>
        </div>
        
        <div className="space-y-4">
          <Button 
            onClick={handleQuickStart}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-105"
          >
            Quick Start (1 min)
          </Button>
          
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowSettings(true)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
            >
              Custom Practice
            </Button>
          </div>
          
          <div className="text-sm text-gray-500 space-y-1 mt-6">
            <p>• Real-time 3D keyboard feedback</p>
            <p>• Multiple difficulty levels</p>
            <p>• Detailed performance reports</p>
            <p>• Customizable duration</p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-center">
        <p className="text-white/30 text-sm font-mono">
          Press Enter for quick start or configure your practice session
        </p>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onStart={handleCustomStart}
      />
    </div>
  )
}
