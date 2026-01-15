import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { type TypingSpeedGame } from "../programs/typing_speed_game";
import IDL from "../programs/typing_speed_game.json";
import { useSessionKeyManager } from "@magicblock-labs/gum-react-sdk";

// Note: @magicblock-labs/ephemeral-rollups-sdk is imported dynamically to avoid
// Buffer not defined errors during module initialization

// ========================================
// Console Logging Utilities
// ========================================
const LOG_PREFIX = "🎮 [TypingGame]";

const logInfo = (message: string, ...args: any[]) => {
    console.log(`${LOG_PREFIX} ℹ️ ${message}`, ...args);
};

const logSuccess = (message: string, ...args: any[]) => {
    console.log(`${LOG_PREFIX} ✅ ${message}`, ...args);
};

const logError = (message: string, ...args: any[]) => {
    console.error(`${LOG_PREFIX} ❌ ${message}`, ...args);
};

const logWarning = (message: string, ...args: any[]) => {
    console.warn(`${LOG_PREFIX} ⚠️ ${message}`, ...args);
};

const logStep = (step: number, total: number, message: string) => {
    console.log(`${LOG_PREFIX} [${step}/${total}] ${message}`);
};

// TypingSession account data structure
interface TypingSessionAccount {
    player: PublicKey;
    wordsTyped: number;
    correctWords: number;
    errors: number;
    wpm: number;
    accuracy: number;
    isActive: boolean;
    startedAt: bigint;
    endedAt: bigint | null;
}

// PersonalRecord account data structure
interface PersonalRecordAccount {
    player: PublicKey;
    attemptCount: number;
    totalWordsTyped: bigint;
    totalCorrectWords: bigint;
    bestWpm: number;
    bestAccuracy: number;
    attempts: TypingAttempt[];
}

// Typing attempt structure
interface TypingAttempt {
    attemptNumber: number;
    wordsTyped: number;
    correctWords: number;
    errors: number;
    wpm: number;
    accuracy: number;
    duration: bigint;
    timestamp: bigint;
}

// Ephemeral Rollup endpoints - configurable via environment
const ER_ENDPOINT = "https://devnet.magicblock.app";
const ER_WS_ENDPOINT = "wss://devnet.magicblock.app";

// Delegation status
export type DelegationStatus = "undelegated" | "delegated" | "checking";

/**
 * Hook to interact with the Typing Speed Game program on Solana.
 * Provides real-time updates via WebSocket subscriptions.
 * Supports MagicBlock Ephemeral Rollups for delegation, commit, and undelegation.
 */
export function useTypingGameProgram() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [sessionPubkey, setSessionPubkeyState] = useState<PublicKey | null>(() => {
        return null;
    });

    const [personalRecordPubkey, setPersonalRecordPubkeyState] = useState<PublicKey | null>(() => {
        return null;
    });

    const [sessionAccount, setSessionAccount] = useState<TypingSessionAccount | null>(null);
    const [personalRecordAccount, setPersonalRecordAccount] = useState<PersonalRecordAccount | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDelegating, setIsDelegating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [delegationStatus, setDelegationStatus] = useState<DelegationStatus>("checking");
    const [erSessionValue, setErSessionValue] = useState<TypingSessionAccount | null>(null);

    // Base layer Anchor provider and program
    const program = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            return null;
        }

        logInfo("Initializing Anchor program...", {
            wallet: wallet.publicKey.toBase58(),
            programId: IDL.address
        });

        const provider = new AnchorProvider(
            connection,
            {
                publicKey: wallet.publicKey,
                signTransaction: wallet.signTransaction,
                signAllTransactions: wallet.signAllTransactions,
            },
            { commitment: "confirmed" }
        );

        setProvider(provider);

        const prog = new Program<TypingSpeedGame>(IDL as TypingSpeedGame, provider);
        logSuccess("Anchor program initialized", {
            programId: prog.programId.toBase58()
        });

        return prog;
    }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

    // Ephemeral Rollup connection and provider
    const erConnection = useMemo(() => {
        logInfo("Creating ER connection...", { endpoint: ER_ENDPOINT });
        return new Connection(ER_ENDPOINT, {
            wsEndpoint: ER_WS_ENDPOINT,
            commitment: "confirmed",
        });
    }, []);

    const erProvider = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            return null;
        }

        logInfo("Creating ER provider...");
        return new AnchorProvider(
            erConnection,
            {
                publicKey: wallet.publicKey,
                signTransaction: wallet.signTransaction,
                signAllTransactions: wallet.signAllTransactions,
            },
            { commitment: "confirmed" }
        );
    }, [erConnection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

    const erProgram = useMemo(() => {
        if (!erProvider) {
            return null;
        }

        logSuccess("ER program ready");
        return new Program<TypingSpeedGame>(IDL as TypingSpeedGame, erProvider);
    }, [erProvider]);

    // Session Key Manager
    const sessionWallet = useSessionKeyManager(
        wallet as any,
        connection,
        "devnet"
    );

    const { sessionToken, createSession: sdkCreateSession, isLoading: isSessionLoading } = sessionWallet;

    const createSession = useCallback(async () => {
        logInfo("Creating session key for program...", { programId: IDL.address });
        const result = await sdkCreateSession(new PublicKey(IDL.address));
        logSuccess("Session key created!", {
            sessionToken: sessionToken ? String(sessionToken) : "pending"
        });
        return result;
    }, [sdkCreateSession, sessionToken]);

    // Derive session PDA from wallet public key
    const deriveSessionPDA = useCallback((player: PublicKey) => {
        const [pda] = PublicKey.findProgramAddressSync(
            [player.toBuffer()],
            new PublicKey(IDL.address)
        );
        return pda;
    }, []);

    // Derive personal record PDA
    const derivePersonalRecordPDA = useCallback((player: PublicKey) => {
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("personal_record"), player.toBuffer()],
            new PublicKey(IDL.address)
        );
        return pda;
    }, []);

    // Auto-derive session PDA when wallet connects
    useEffect(() => {
        if (wallet.publicKey) {
            const sessionPda = deriveSessionPDA(wallet.publicKey);
            setSessionPubkeyState(sessionPda);
            
            const personalRecordPda = derivePersonalRecordPDA(wallet.publicKey);
            setPersonalRecordPubkeyState(personalRecordPda);

            logInfo("PDAs derived for wallet", {
                wallet: wallet.publicKey.toBase58(),
                sessionPDA: sessionPda.toBase58(),
                personalRecordPDA: personalRecordPda.toBase58()
            });
        } else {
            setSessionPubkeyState(null);
            setPersonalRecordPubkeyState(null);
            logWarning("Wallet disconnected, PDAs cleared");
        }
    }, [wallet.publicKey, deriveSessionPDA, derivePersonalRecordPDA]);

    // Parse session account from raw data
    const parseSessionAccount = useCallback((account: any): TypingSessionAccount => {
        return {
            player: account.player,
            wordsTyped: account.wordsTyped,
            correctWords: account.correctWords,
            errors: account.errors,
            wpm: account.wpm,
            accuracy: account.accuracy,
            isActive: account.isActive,
            startedAt: BigInt(account.startedAt.toString()),
            endedAt: account.endedAt ? BigInt(account.endedAt.toString()) : null,
        };
    }, []);

    // Parse personal record account from raw data
    const parsePersonalRecordAccount = useCallback((account: any): PersonalRecordAccount => {
        return {
            player: account.player,
            attemptCount: account.attemptCount,
            totalWordsTyped: BigInt(account.totalWordsTyped.toString()),
            totalCorrectWords: BigInt(account.totalCorrectWords.toString()),
            bestWpm: account.bestWpm,
            bestAccuracy: account.bestAccuracy,
            attempts: account.attempts.map((attempt: any) => ({
                attemptNumber: attempt.attemptNumber,
                wordsTyped: attempt.wordsTyped,
                correctWords: attempt.correctWords,
                errors: attempt.errors,
                wpm: attempt.wpm,
                accuracy: attempt.accuracy,
                duration: BigInt(attempt.duration.toString()),
                timestamp: BigInt(attempt.timestamp.toString()),
            })),
        };
    }, []);

    // Fetch session account data from base layer
    const fetchSessionAccount = useCallback(async () => {
        if (!program || !sessionPubkey) {
            setSessionAccount(null);
            return;
        }

        logInfo("Fetching session account...", { sessionPDA: sessionPubkey.toBase58() });

        try {
            const account = await program.account.typingSession.fetch(sessionPubkey);
            const parsed = parseSessionAccount(account);
            setSessionAccount(parsed);
            setError(null);
            
            logSuccess("Session account fetched", {
                player: parsed.player.toBase58(),
                wordsTyped: parsed.wordsTyped,
                correctWords: parsed.correctWords,
                wpm: parsed.wpm,
                accuracy: parsed.accuracy,
                isActive: parsed.isActive
            });
        } catch (err) {
            logWarning("Session account not found (normal for new users)");
            setSessionAccount(null);
            if (err instanceof Error && !err.message.includes("Account does not exist") && !err.message.includes("could not find account")) {
                setError(err.message);
            }
        }
    }, [program, sessionPubkey, parseSessionAccount]);

    // Fetch personal record account from base layer
    const fetchPersonalRecordAccount = useCallback(async () => {
        if (!program || !personalRecordPubkey) {
            setPersonalRecordAccount(null);
            return;
        }

        logInfo("Fetching personal record...", { personalRecordPDA: personalRecordPubkey.toBase58() });

        try {
            const account = await program.account.personalRecord.fetch(personalRecordPubkey);
            const parsed = parsePersonalRecordAccount(account);
            setPersonalRecordAccount(parsed);
            setError(null);
            
            logSuccess("Personal record fetched", {
                attemptCount: parsed.attemptCount,
                bestWpm: parsed.bestWpm,
                bestAccuracy: parsed.bestAccuracy
            });
        } catch (err) {
            logWarning("Personal record not found");
            setPersonalRecordAccount(null);
        }
    }, [program, personalRecordPubkey, parsePersonalRecordAccount]);

    // Delegation Program address
    const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

    // Check if account is delegated
    const checkDelegationStatus = useCallback(async () => {
        if (!sessionPubkey) {
            setDelegationStatus("checking");
            return;
        }

        logInfo("Checking delegation status...", { sessionPDA: sessionPubkey.toBase58() });

        try {
            setDelegationStatus("checking");

            const accountInfo = await connection.getAccountInfo(sessionPubkey);

            if (!accountInfo) {
                logInfo("Session account does not exist yet");
                setDelegationStatus("undelegated");
                setErSessionValue(null);
                return;
            }

            const isDelegated = accountInfo.owner.equals(DELEGATION_PROGRAM_ID);

            if (isDelegated) {
                logSuccess("Session is DELEGATED to ER", {
                    owner: accountInfo.owner.toBase58()
                });
                setDelegationStatus("delegated");
                
                if (erProgram) {
                    try {
                        const account = await erProgram.account.typingSession.fetch(sessionPubkey);
                        const parsed = parseSessionAccount(account);
                        setErSessionValue(parsed);
                        logSuccess("ER session state fetched", {
                            wordsTyped: parsed.wordsTyped,
                            wpm: parsed.wpm
                        });
                    } catch {
                        logWarning("Couldn't fetch ER session state");
                    }
                }
            } else {
                logInfo("Session is UNDELEGATED (on base layer)", {
                    owner: accountInfo.owner.toBase58()
                });
                setDelegationStatus("undelegated");
                setErSessionValue(null);
            }
        } catch (err) {
            logError("Error checking delegation status", err);
            setDelegationStatus("undelegated");
            setErSessionValue(null);
        }
    }, [sessionPubkey, connection, erProgram, parseSessionAccount]);

    // Subscribe to base layer account changes
    useEffect(() => {
        if (!program || !sessionPubkey) {
            return;
        }

        fetchSessionAccount();
        fetchPersonalRecordAccount();
        checkDelegationStatus();

        logInfo("Subscribing to base layer account changes...");

        const subscriptionId = connection.onAccountChange(
            sessionPubkey,
            async (accountInfo) => {
                try {
                    const decoded = program.coder.accounts.decode("typingSession", accountInfo.data);
                    setSessionAccount(parseSessionAccount(decoded));
                    setError(null);
                    logInfo("Base layer account updated via WebSocket");
                    checkDelegationStatus();
                } catch (err) {
                    logError("Failed to decode account data", err);
                }
            },
            "confirmed"
        );

        return () => {
            connection.removeAccountChangeListener(subscriptionId);
            logInfo("Unsubscribed from base layer account changes");
        };
    }, [program, sessionPubkey, connection, fetchSessionAccount, fetchPersonalRecordAccount, checkDelegationStatus, parseSessionAccount]);

    // Subscribe to ER account changes when delegated
    useEffect(() => {
        if (!erProgram || !sessionPubkey || delegationStatus !== "delegated") {
            return;
        }

        logInfo("Subscribing to ER account changes...");

        const subscriptionId = erConnection.onAccountChange(
            sessionPubkey,
            async (accountInfo) => {
                try {
                    const decoded = erProgram.coder.accounts.decode("typingSession", accountInfo.data);
                    const parsed = parseSessionAccount(decoded);
                    setErSessionValue(parsed);
                    logInfo("ER account updated via WebSocket", {
                        wordsTyped: parsed.wordsTyped,
                        wpm: parsed.wpm
                    });
                } catch (err) {
                    logError("Failed to decode ER account data", err);
                }
            },
            "confirmed"
        );

        return () => {
            erConnection.removeAccountChangeListener(subscriptionId);
            logInfo("Unsubscribed from ER account changes");
        };
    }, [erProgram, sessionPubkey, erConnection, delegationStatus, parseSessionAccount]);

    // ========================================
    // Base Layer Operations
    // ========================================

    // Initialize a new typing session
    const initialize = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey) {
            throw new Error("Wallet not connected");
        }

        logStep(1, 3, "Initializing typing session on-chain...");
        logInfo("Session PDA:", sessionPubkey?.toBase58());

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .initialize()
                .accounts({
                    player: wallet.publicKey,
                })
                .rpc();

            logSuccess("SESSION INITIALIZED!", {
                txSignature: tx,
                sessionPDA: sessionPubkey?.toBase58(),
                player: wallet.publicKey.toBase58()
            });

            await fetchSessionAccount();
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to initialize session";
            logError("Failed to initialize session", { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, sessionPubkey, fetchSessionAccount]);

    // Initialize personal record account
    const initPersonalRecord = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey) {
            throw new Error("Wallet not connected");
        }

        logInfo("Initializing personal record...");

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .initPersonalRecord()
                .accounts({
                    player: wallet.publicKey,
                })
                .rpc();

            logSuccess("PERSONAL RECORD INITIALIZED!", {
                txSignature: tx,
                personalRecordPDA: personalRecordPubkey?.toBase58()
            });

            await fetchPersonalRecordAccount();
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to initialize personal record";
            logError("Failed to initialize personal record", { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, personalRecordPubkey, fetchPersonalRecordAccount]);

    // Type a word (on base layer)
    const typeWord = useCallback(async (isCorrect: boolean): Promise<string> => {
        if (!program || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized");
        }

        logInfo("Recording word on base layer...", { isCorrect });

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .typeWord(isCorrect)
                .accounts({
                    session: sessionPubkey,
                    signer: wallet.publicKey,
                    sessionToken: null,
                } as any)
                .rpc();

            logSuccess("Word recorded on base layer", { txSignature: tx, isCorrect });
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to type word";
            logError("Failed to record word", { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, sessionPubkey]);

    // End typing session (on base layer)
    const endSession = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized");
        }

        logInfo("Ending session on base layer...");

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .endSession()
                .accounts({
                    session: sessionPubkey,
                    signer: wallet.publicKey,
                    sessionToken: null,
                } as any)
                .rpc();

            logSuccess("SESSION ENDED on base layer", { txSignature: tx });
            await fetchSessionAccount();
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to end session";
            logError("Failed to end session", { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, sessionPubkey, fetchSessionAccount]);

    // Save session to personal record
    const saveToRecord = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey || !sessionPubkey || !personalRecordPubkey) {
            throw new Error("Session or personal record not initialized");
        }

        logInfo("Saving session to personal record...");

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .saveToRecord()
                .accounts({
                    session: sessionPubkey,
                    personalRecord: personalRecordPubkey,
                    player: wallet.publicKey,
                } as any)
                .rpc();

            logSuccess("SESSION SAVED to personal record!", { txSignature: tx });
            await fetchPersonalRecordAccount();
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to save to record";
            logError("Failed to save to record", { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, sessionPubkey, personalRecordPubkey, fetchPersonalRecordAccount]);

    // ========================================
    // Ephemeral Rollup Operations
    // ========================================

    // Generic ER action performer
    const performErAction = useCallback(async (
        methodBuilder: any,
        actionName: string
    ): Promise<string> => {
        if (!program || !erProvider || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized or not delegated");
        }

        logInfo(`Performing ER action: ${actionName}...`);

        setIsLoading(true);
        setError(null);

        try {
            const hasSession = sessionToken != null && sessionWallet != null;
            const signer = hasSession ? sessionWallet.publicKey : wallet.publicKey;

            logInfo("Transaction signer:", {
                usingSessionKey: hasSession,
                signer: signer?.toBase58()
            });

            const accounts: any = {
                session: sessionPubkey,
                signer: signer,
                sessionToken: hasSession ? sessionToken : null,
            };

            let tx = await methodBuilder
                .accounts(accounts)
                .transaction();

            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;

            if (hasSession && sessionWallet && sessionWallet.signTransaction) {
                tx.feePayer = sessionWallet.publicKey;
                tx = await sessionWallet.signTransaction(tx);
                logInfo("Transaction signed with session key");
            } else {
                tx = await erProvider.wallet.signTransaction(tx);
                logInfo("Transaction signed with wallet");
            }

            const txHash = await erConnection.sendRawTransaction(tx.serialize(), {
                skipPreflight: true,
            });
            
            logInfo(`ER transaction sent: ${txHash}`);
            
            await erConnection.confirmTransaction(txHash, "confirmed");

            logSuccess(`ER ACTION COMPLETE: ${actionName}`, {
                txSignature: txHash,
                sessionPDA: sessionPubkey.toBase58()
            });

            if (erProgram) {
                try {
                    const account = await erProgram.account.typingSession.fetch(sessionPubkey);
                    const parsed = parseSessionAccount(account);
                    setErSessionValue(parsed);
                    logInfo("ER state after action:", {
                        wordsTyped: parsed.wordsTyped,
                        wpm: parsed.wpm,
                        accuracy: parsed.accuracy
                    });
                } catch {
                    // Ignore fetch errors
                }
            }

            return txHash;
        } catch (err) {
            const message = err instanceof Error ? err.message : `Failed to ${actionName} on ER`;
            logError(`Failed ER action: ${actionName}`, { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, erProvider, erConnection, erProgram, wallet.publicKey, sessionPubkey, sessionToken, sessionWallet, parseSessionAccount]);

    // Type a word on Ephemeral Rollup
    const typeWordOnER = useCallback(async (isCorrect: boolean): Promise<string> => {
        if (!program) throw new Error("Program not loaded");
        logInfo("Recording word on ER...", { isCorrect });
        return performErAction(program.methods.typeWord(isCorrect), `typeWord(${isCorrect})`);
    }, [program, performErAction]);

    // End session on Ephemeral Rollup
    const endSessionOnER = useCallback(async (): Promise<string> => {
        if (!program) throw new Error("Program not loaded");
        logInfo("Ending session on ER...");
        return performErAction(program.methods.endSession(), "endSession");
    }, [program, performErAction]);

    // ========================================
    // Delegation Functions
    // ========================================

    // Delegate the session to Ephemeral Rollups
    const delegate = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey) {
            throw new Error("Wallet not connected");
        }

        logStep(2, 3, "DELEGATING session to Ephemeral Rollup...");
        logInfo("Delegation details:", {
            sessionPDA: sessionPubkey?.toBase58(),
            erEndpoint: ER_ENDPOINT
        });

        setIsLoading(true);
        setIsDelegating(true);
        setError(null);

        try {
            const tx = await program.methods
                .delegate()
                .accounts({
                    payer: wallet.publicKey,
                })
                .rpc({
                    skipPreflight: true,
                });

            logSuccess("DELEGATION TRANSACTION SENT!", { txSignature: tx });
            logInfo("Waiting for delegation to propagate (2s)...");

            await new Promise(resolve => setTimeout(resolve, 2000));

            await checkDelegationStatus();

            logSuccess("SESSION DELEGATED TO ER! 🚀", {
                txSignature: tx,
                sessionPDA: sessionPubkey?.toBase58(),
                status: delegationStatus
            });

            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delegate session";
            logError("Failed to delegate", { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
            setIsDelegating(false);
        }
    }, [program, wallet.publicKey, sessionPubkey, checkDelegationStatus, delegationStatus]);

    // Commit state from ER to base layer
    const commit = useCallback(async (): Promise<string> => {
        if (!program || !erProvider || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized or not delegated");
        }

        logInfo("COMMITTING state from ER to base layer...");

        setIsLoading(true);
        setError(null);

        try {
            let tx = await program.methods
                .commit()
                .accounts({
                    payer: wallet.publicKey,
                })
                .transaction();

            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
            tx = await erProvider.wallet.signTransaction(tx);

            const txHash = await erConnection.sendRawTransaction(tx.serialize(), {
                skipPreflight: true,
            });
            
            logInfo("Commit transaction sent:", txHash);
            
            await erConnection.confirmTransaction(txHash, "confirmed");

            try {
                const { GetCommitmentSignature } = await import("@magicblock-labs/ephemeral-rollups-sdk");
                const txCommitSgn = await GetCommitmentSignature(txHash, erConnection);
                logSuccess("COMMIT COMPLETE! Base layer signature:", txCommitSgn);
            } catch {
                logWarning("GetCommitmentSignature not available");
            }

            await fetchSessionAccount();

            logSuccess("STATE COMMITTED TO BASE LAYER! 💾", { txSignature: txHash });

            return txHash;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to commit session";
            logError("Failed to commit", { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, erProvider, erConnection, wallet.publicKey, sessionPubkey, fetchSessionAccount]);

    // Undelegate the session from ER
    const undelegate = useCallback(async (): Promise<string> => {
        if (!program || !erProvider || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized or not delegated");
        }

        logInfo("UNDELEGATING session from ER...");

        setIsLoading(true);
        setError(null);

        try {
            let tx = await program.methods
                .undelegate()
                .accounts({
                    payer: wallet.publicKey,
                })
                .transaction();

            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
            tx = await erProvider.wallet.signTransaction(tx);

            const txHash = await erConnection.sendRawTransaction(tx.serialize(), {
                skipPreflight: true,
            });
            
            logInfo("Undelegate transaction sent:", txHash);
            
            await erConnection.confirmTransaction(txHash, "confirmed");

            logInfo("Waiting for undelegation to propagate (2s)...");
            await new Promise(resolve => setTimeout(resolve, 2000));

            setDelegationStatus("undelegated");
            setErSessionValue(null);

            await fetchSessionAccount();

            logSuccess("SESSION UNDELEGATED! Back on base layer 🏠", {
                txSignature: txHash,
                sessionPDA: sessionPubkey.toBase58()
            });

            return txHash;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to undelegate session";
            logError("Failed to undelegate", { error: message });
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, erProvider, erConnection, wallet.publicKey, sessionPubkey, fetchSessionAccount]);

    return {
        // Program
        program,
        
        // Account states
        sessionAccount,
        personalRecordAccount,
        sessionPubkey,
        personalRecordPubkey,
        
        // Loading states
        isLoading,
        isDelegating,
        error,
        
        // Base layer operations
        initialize,
        initPersonalRecord,
        typeWord,
        endSession,
        saveToRecord,
        
        // Ephemeral Rollups operations
        delegate,
        commit,
        undelegate,
        typeWordOnER,
        endSessionOnER,
        
        // Delegation status
        delegationStatus,
        erSessionValue,
        
        // Utilities
        refetchSession: fetchSessionAccount,
        refetchPersonalRecord: fetchPersonalRecordAccount,
        checkDelegation: checkDelegationStatus,
        
        // Session keys
        createSession,
        sessionToken,
        isSessionLoading,
        
        // PDA derivation utilities
        deriveSessionPDA,
        derivePersonalRecordPDA,
        
        // Connections for advanced usage
        erConnection,
    };
}