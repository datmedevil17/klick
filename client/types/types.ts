import { PublicKey } from "@solana/web3.js";

// Type definitions
export interface TypingAttempt {
  attemptNumber: number;
  wordsTyped: number;
  correctWords: number;
  errors: number;
  wpm: number;
  accuracy: number;
  duration: number;
  timestamp: number;
}

export interface TypingSession {
  player: PublicKey;
  wordsTyped: number;
  correctWords: number;
  errors: number;
  wpm: number;
  accuracy: number;
  isActive: boolean;
  startedAt: number;
  endedAt: number | null;
  bump: number;
  sessionPda?: string;
  isDelegated?: boolean;
}

export interface PersonalRecord {
  player: PublicKey;
  attemptCount: number;
  totalWordsTyped: number;
  totalCorrectWords: number;
  bestWpm: number;
  bestAccuracy: number;
  attempts: TypingAttempt[];
}

export interface SessionStateData {
  player: PublicKey;
  wordsTyped: number;
  correctWords: number;
  errors: number;
  wpm: number;
  accuracy: number;
  isActive: boolean;
  startedAt: number;
  endedAt: number | null;
}

export interface SessionInfo {
  hasActiveSession: boolean;
  isDelegated: boolean;
  sessionData: TypingSession | null;
  delegationInfo: DelegationInfo;
}

export interface DelegationInfo {
  accountExists: boolean;
  accountOwner?: string;
  programId?: string;
  isDelegated?: boolean;
  sessionPda?: string;
  bufferAccount?: {
    pda: string;
    exists: boolean;
  };
  error?: string;
}