"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (settings: TypingSettings) => void
}

export interface TypingSettings {
  difficulty: 'common' | 'programming' | 'challenging'
  duration: number
  wordCount: number
}

export function SettingsModal({ isOpen, onClose, onStart }: SettingsModalProps) {
  const [settings, setSettings] = useState<TypingSettings>({
    difficulty: 'common',
    duration: 60,
    wordCount: 100
  })

  if (!isOpen) return null

  const handleStart = () => {
    onStart(settings)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-white/20 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-white mb-6">Practice Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Difficulty Level</label>
            <Select 
              value={settings.difficulty} 
              onValueChange={(value: any) => setSettings(prev => ({ ...prev, difficulty: value }))}
            >
              <SelectTrigger className="bg-neutral-800 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-white/20">
                <SelectItem value="common" className="text-white hover:bg-white/10">
                  Common Words - Easy everyday vocabulary
                </SelectItem>
                <SelectItem value="programming" className="text-white hover:bg-white/10">
                  Programming - Code-related terms
                </SelectItem>
                <SelectItem value="challenging" className="text-white hover:bg-white/10">
                  Challenging - Complex vocabulary
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Duration</label>
            <Select 
              value={settings.duration.toString()} 
              onValueChange={(value) => setSettings(prev => ({ ...prev, duration: parseInt(value) }))}
            >
              <SelectTrigger className="bg-neutral-800 border-white/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-neutral-800 border-white/20">
                <SelectItem value="30" className="text-white hover:bg-white/10">30 seconds</SelectItem>
                <SelectItem value="60" className="text-white hover:bg-white/10">1 minute</SelectItem>
                <SelectItem value="120" className="text-white hover:bg-white/10">2 minutes</SelectItem>
                <SelectItem value="300" className="text-white hover:bg-white/10">5 minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4 flex gap-3">
            <Button 
              onClick={onClose}
              variant="outline" 
              className="flex-1 border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleStart}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Start Practice
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
