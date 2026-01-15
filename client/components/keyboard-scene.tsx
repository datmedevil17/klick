"use client"

import { Canvas, useThree } from "@react-three/fiber"
import { Environment, PerspectiveCamera, ContactShadows } from "@react-three/drei"
import { Suspense, useState, useEffect, useCallback, useRef } from "react"
import { Keyboard3D } from "./keyboard-3d"
import { Terminal } from "./terminal"
import { TypingReport } from "./typing-report"
import { generateRandomWords, calculateWPM, calculateAccuracy } from "@/lib/typing-utils"
import { TypingSettings } from "./settings-modal"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
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

interface KeyboardSceneProps {
  settings: TypingSettings
  onBackToMenu: () => void
  game: ReturnType<typeof useTypingGameProgram>
}

function ResponsiveCamera() {
  const { camera, size } = useThree()

  useEffect(() => {
    const aspect = size.width / size.height
    const isMobile = size.width < 768

    // Base distance for desktop
    let zPos = 12
    let yPos = 8
    let targetY = 0

    if (isMobile) {
      // Adjust for mobile portrait to fit the wide keyboard
      // The keyboard is approx 16 units wide.
      // We need to move back significantly if the aspect ratio is narrow.
      const targetWidth = 20 // Keyboard width + padding
      const vFov = (camera as any).fov * (Math.PI / 180)

      // Calculate distance needed to fit width
      // visible_width = 2 * dist * tan(fov/2) * aspect
      // dist = visible_width / (2 * tan(fov/2) * aspect)

      const dist = targetWidth / (2 * Math.tan(vFov / 2) * aspect)

      // Clamp distance to reasonable values
      zPos = Math.max(dist, 15)
      yPos = zPos * 0.6 // Maintain roughly the same angle

      targetY = 2
    }

    camera.position.set(0, yPos, zPos)
    camera.lookAt(0, targetY, 0)
    camera.updateProjectionMatrix()
  }, [camera, size])

  return null
}

export function KeyboardScene({ settings, onBackToMenu, game }: KeyboardSceneProps) {
  // Typing state
  const [words, setWords] = useState<string[]>([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [typedText, setTypedText] = useState<string>("")
  const [completedWords, setCompletedWords] = useState<string[]>([])
  const [correctWords, setCorrectWords] = useState(0)
  const [incorrectWords, setIncorrectWords] = useState(0)
  const [correctCharacters, setCorrectCharacters] = useState(0)
  const [totalCharacters, setTotalCharacters] = useState(0)
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(settings.duration)
  const [hasStarted, setHasStarted] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  // Keyboard state
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set())
  const [capsLock, setCapsLock] = useState(false)
  const [shiftPressed, setShiftPressed] = useState(false)

  // Initialize words
  useEffect(() => {
    setWords(generateRandomWords(settings.difficulty, settings.wordCount))
  }, [settings])

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    
    if (hasStarted && timeLeft > 0 && !isFinished) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsFinished(true)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }

    return () => {
      if (interval) clearInterval(interval)
    }
  }, [hasStarted, timeLeft, isFinished])

  // End session on blockchain when game finishes
  useEffect(() => {
    if (isFinished && !isProcessing) {
      console.log("🎮 [KeyboardScene] Game finished! Ending session on ER...")
      game.endSessionOnER().then(txHash => {
        console.log("🎮 [KeyboardScene] ✅ Session ended on ER:", txHash.slice(0, 20) + "...")
      }).catch(err => {
        console.error("🎮 [KeyboardScene] ❌ Failed to end session on ER:", err)
      })
    }
  }, [isFinished, isProcessing, game])

  // Calculate current stats
  const timeSpent = settings.duration - timeLeft
  const wpm = calculateWPM(correctWords, Math.max(timeSpent, 1) / 60)
  const accuracy = calculateAccuracy(correctCharacters, Math.max(totalCharacters, 1))

  // Reset function
  const resetSession = useCallback(() => {
    setCurrentWordIndex(0)
    setTypedText("")
    setCompletedWords([])
    setCorrectWords(0)
    setIncorrectWords(0)
    setCorrectCharacters(0)
    setTotalCharacters(0)
    setTimeLeft(settings.duration)
    setHasStarted(false)
    setIsFinished(false)
    setIsProcessing(false)
  }, [settings.duration])

  // Handle blockchain operations for restart
  const handleRestart = async () => {
    console.log("🎮 [KeyboardScene] Restart clicked - committing state...")
    setIsProcessing(true)
    try {
        console.log("🎮 [KeyboardScene] Committing current state to base layer...")
        await game.commit()
        console.log("🎮 [KeyboardScene] ✅ State committed, resetting session")
        resetSession()
    } catch (error) {
      console.error("🎮 [KeyboardScene] ❌ Checkpoint error:", error)
      // Allow restart even if checkpoint fails
      resetSession() 
    }
  }

  // Handle blockchain operations for new word set
  const handleNewSession = async () => {
    console.log("🎮 [KeyboardScene] New session clicked - committing and resetting...")
    setIsProcessing(true)
    try {
      console.log("🎮 [KeyboardScene] Committing current state before new word set...")
      await game.commit()
      console.log("🎮 [KeyboardScene] ✅ State committed, generating new words")
      setWords(generateRandomWords(settings.difficulty, settings.wordCount))
      resetSession()
    } catch (error) {
       console.error("🎮 [KeyboardScene] ❌ Checkpoint error:", error)
       setWords(generateRandomWords(settings.difficulty, settings.wordCount))
       resetSession()
    }
  }

  // Handle word completion
  const handleWordComplete = useCallback(async (word: string, isCorrect: boolean) => {
    setCompletedWords(prev => [...prev, word])
    
    if (isCorrect) {
      setCorrectWords(prev => prev + 1)
      setCorrectCharacters(prev => prev + word.length + 1)
    } else {
      setIncorrectWords(prev => prev + 1)
    }
    
    setTotalCharacters(prev => prev + word.length + 1)
    setCurrentWordIndex(prev => prev + 1)
    setTypedText("")

    // Blockchain: Record word on Ephemeral Rollup
    console.log(`🎮 [KeyboardScene] Word completed: "${word}" | Correct: ${isCorrect}`)
    try {
        game.typeWordOnER(isCorrect).then(txHash => {
            console.log(`🎮 [KeyboardScene] ✅ Word recorded on ER: ${txHash.slice(0, 20)}...`)
        }).catch(err => {
            console.error("🎮 [KeyboardScene] ❌ Failed to record word on ER:", err)
        })
    } catch(e) {
        console.error("🎮 [KeyboardScene] ❌ ER error:", e)
    }

  }, [game])

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isFinished || isProcessing) return
      
      const { key, code } = e
            setActiveKeys((prev) => new Set(prev).add(code))

      if (key === "Shift") {
        setShiftPressed(true)
      }

      if (code === "CapsLock" && !e.repeat) {
        setCapsLock((prev) => !prev)
      }

      // Start timer on first keypress
      if (!hasStarted && key.length === 1) {
        setHasStarted(true)
      }

      const currentWord = words[currentWordIndex]
      if (!currentWord) return

      // Handle typing
      if (key.length === 1) {
        // Check if it's a letter
        const isLetter = /^[a-zA-Z]$/.test(key)

        let char = key
        if (isLetter) {
          // Determine case based on virtual state
          const isUpperCase = shiftPressed !== capsLock
          char = isUpperCase ? key.toUpperCase() : key.toLowerCase()
        }

        setTypedText((prev) => {
          const newText = prev + char
          setTotalCharacters(tc => tc + 1)
          
          // Check if character is correct
          if (currentWord[prev.length] === char) {
            setCorrectCharacters(cc => cc + 1)
          }
          
          return newText
        })
      } else if (key === "Backspace") {
        setTypedText((prev) => prev.slice(0, -1))
      } else if (key === " " || key === "Enter") {
        e.preventDefault()
        if (typedText.trim()) {
          const isCorrect = typedText.trim() === currentWord
          handleWordComplete(typedText.trim(), isCorrect)
        }
      } else if (key === "Tab") {
        e.preventDefault()
        // Skip current word
        handleWordComplete(typedText || currentWord, false)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      const { key, code } = e
      setActiveKeys((prev) => {
        const next = new Set(prev)
        next.delete(code)
        return next
      })

      if (key === "Shift") {
        setShiftPressed(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)

    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [capsLock, shiftPressed, typedText, words, currentWordIndex, hasStarted, isFinished, isProcessing, handleWordComplete])

  const typingStats: TypingStats = {
    wpm,
    accuracy,
    totalWords: completedWords.length,
    correctWords,
    incorrectWords,
    totalCharacters: Math.max(totalCharacters, 1),
    correctCharacters,
    timeSpent
  }

  return (
    <div className="relative w-full h-full">
      <Terminal
        capsLock={capsLock}
        words={words}
        currentWordIndex={currentWordIndex}
        typedText={typedText}
        timeLeft={timeLeft}
        hasStarted={hasStarted}
        wpm={wpm}
        accuracy={accuracy}
      />

      {isFinished && (
        <TypingReport
          stats={typingStats}
          onRestart={handleRestart}
          onNewSession={handleNewSession}
          onBackToMenu={onBackToMenu}
          isLoading={isProcessing}
          game={game}
        />
      )}

      <Canvas shadows dpr={[1, 2]}>
        <PerspectiveCamera makeDefault position={[0, 8, 12]} fov={45} />
        <ResponsiveCamera />

        <color attach="background" args={["#111"]} />

        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} castShadow />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />

        <Suspense fallback={null}>
          <Environment preset="city" />
          <Keyboard3D activeKeys={activeKeys} capsLock={capsLock} />
          <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={40} blur={2} far={4} />
        </Suspense>
      </Canvas>

      <div className="absolute top-4 left-4 z-40">
        <Button 
          variant="ghost" 
          onClick={onBackToMenu}
          className="text-white/50 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Button>
      </div>

      <div className="absolute bottom-8 left-0 w-full text-center pointer-events-none">
        <p className="text-white/20 text-sm font-mono">
          {!hasStarted 
            ? "Start typing to begin the challenge" 
            : isFinished 
              ? "Time's up! Check your results above." 
              : `Type the highlighted word • ${timeLeft}s remaining`
          }
        </p>
      </div>
    </div>
  )
}
