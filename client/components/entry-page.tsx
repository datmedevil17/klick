"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { SettingsModal, TypingSettings } from "@/components/settings-modal"
import { useWallet } from "@solana/wallet-adapter-react"
import { Loader2 } from "lucide-react"
import { useTypingGameProgram } from "@/hooks/use-typing-game"

interface EntryPageProps {
  onEnter: (settings?: TypingSettings) => void
  game: ReturnType<typeof useTypingGameProgram>
}

export function EntryPage({ onEnter, game }: EntryPageProps) {
  const { connected, connect, wallet, publicKey } = useWallet()
  const [showSettings, setShowSettings] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState("")
  
  // Use game state for errors and loading if reasonable, or local wrapping
  // game.error might be persistent, so we might want to clear it or display it
  
  const hasActiveSession = !!game.sessionAccount
  const isDelegated = game.delegationStatus === "delegated"
  const checkingSession = game.delegationStatus === "checking"

  const handleStartSession = async (settings?: TypingSettings) => {
    console.log("🎮 [EntryPage] Starting game session flow...");
    
    // Basic wallet checks
    if (!connected || !publicKey) {
        console.log("🎮 [EntryPage] Wallet not connected, attempting to connect...");
        if (wallet) {
            try {
                await connect()
                console.log("🎮 [EntryPage] ✅ Wallet connected:", publicKey?.toBase58());
            } catch (err) {
                console.error("🎮 [EntryPage] ❌ Failed to connect wallet:", err);
                return
            }
        } else {
            console.error("🎮 [EntryPage] ❌ No wallet available");
            return
        }
    }

    console.log("🎮 [EntryPage] Game state check:", {
        hasActiveSession,
        isDelegated,
        sessionPDA: game.sessionPubkey?.toBase58(),
        delegationStatus: game.delegationStatus
    });

    try {
      // If already delegated, just resume
      if (hasActiveSession && isDelegated) {
           console.log("🎮 [EntryPage] ✅ Resuming existing delegated session");
           setLoadingStatus("Resuming Session...")
           onEnter(settings)
           return
      }
      
      // Step 1: Initialize session if it doesn't exist
      if (!hasActiveSession) {
          console.log("🎮 [EntryPage] Step 1/3: Creating new session on-chain...");
          setLoadingStatus("Creating Session...")
          await game.initialize();
          console.log("🎮 [EntryPage] ✅ Session created!");
      } else {
          console.log("🎮 [EntryPage] Step 1/3: Session already exists, skipping initialization");
      }
      
      // Step 2: Create session key for gasless transactions (if not exists)
      if (!game.sessionToken) {
          console.log("🎮 [EntryPage] Step 2/3: Creating session key for gasless transactions...");
          setLoadingStatus("Creating Session Key...")
          await game.createSession();
          console.log("🎮 [EntryPage] ✅ Session key created!");
      } else {
          console.log("🎮 [EntryPage] Step 2/3: Session key already exists, skipping");
      }

      // Step 3: Delegate session to Ephemeral Rollup
      console.log("🎮 [EntryPage] Step 3/3: Delegating session to Ephemeral Rollup...");
      setLoadingStatus("Delegating to ER...")
      await game.delegate();
      console.log("🎮 [EntryPage] ✅ Session delegated! Entering game...");
      
      onEnter(settings)

    } catch (err: any) {
      console.error("🎮 [EntryPage] ❌ Session start error:", err);
      // Error is displayed via game.error in the UI
    } finally {
      setLoadingStatus("")
    }
  }

  const handleQuickStart = () => {
    console.log("🎮 [EntryPage] Quick start clicked");
    handleStartSession()
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
          {game.error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm max-w-md mx-auto">
              {game.error}
            </div>
          )}

          <Button 
            onClick={handleQuickStart}
            disabled={game.isLoading || checkingSession}
            className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 text-lg font-semibold rounded-lg transition-all duration-200 transform hover:scale-105 min-w-[200px]"
          >
            {game.isLoading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{loadingStatus || "Processing..."}</span>
              </div>
            ) : checkingSession ? (
                 <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Checking...</span>
                  </div>
            ) : hasActiveSession ? (
                "Resume Game"
            ) : (
              "Quick Start (1 min)"
            )}
          </Button>
          
          <div className="flex gap-3 justify-center">
            <Button 
              onClick={() => setShowSettings(true)}
              variant="outline"
              disabled={game.isLoading}
              className="border-white/20 text-white hover:bg-white/10 px-6 py-3"
            >
              Custom Practice
            </Button>
          </div>
          
          <div className="text-sm text-gray-500 space-y-1 mt-6">
            <p>• Real-time 3D keyboard feedback</p>
            <p>• Blockchain-verified WPM</p>
            <p>• Powered by MagicBlock Ephemeral Rollups</p>
          </div>
        </div>
      </div>
      
      <div className="absolute bottom-8 text-center pointer-events-none">
        <p className="text-white/30 text-sm font-mono">
          Connect your wallet to begin | Delegated sessions enabled
        </p>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onStart={handleStartSession}
      />
    </div>
  )
}
