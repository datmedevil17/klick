import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider, setProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { type TypingSpeedGame } from "../idl/typing_speed_game";
import IDL from "../idl/typing_speed_game.json";
import { useSessionKeyManager } from "@magicblock-labs/gum-react-sdk";

// Note: @magicblock-labs/ephemeral-rollups-sdk is imported dynamically to avoid
// Buffer not defined errors during module initialization

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

// TypingAttempt structure
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
export function useTypingSpeedGameProgram() {
    const { connection } = useConnection();
    const wallet = useWallet();

    const [sessionPubkey, setSessionPubkeyState] = useState<PublicKey | null>(() => {
        // Derive PDA from wallet public key if connected
        return null;
    });

    const [personalRecordPubkey, setPersonalRecordPubkeyState] = useState<PublicKey | null>(null);

    const [sessionAccount, setSessionAccount] = useState<TypingSessionAccount | null>(null);
    const [personalRecordAccount, setPersonalRecordAccount] = useState<PersonalRecordAccount | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isDelegating, setIsDelegating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [delegationStatus, setDelegationStatus] = useState<DelegationStatus>("checking");
    const [erSessionData, setErSessionData] = useState<TypingSessionAccount | null>(null);

    // Base layer Anchor provider and program
    const program = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            return null;
        }

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

        return new Program<TypingSpeedGame>(IDL as TypingSpeedGame, provider);
    }, [connection, wallet.publicKey, wallet.signTransaction, wallet.signAllTransactions]);

    // Ephemeral Rollup connection and provider
    const erConnection = useMemo(() => {
        return new Connection(ER_ENDPOINT, {
            wsEndpoint: ER_WS_ENDPOINT,
            commitment: "confirmed",
        });
    }, []);

    const erProvider = useMemo(() => {
        if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) {
            return null;
        }

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
        return await sdkCreateSession(new PublicKey(IDL.address));
    }, [sdkCreateSession]);

    // Derive session PDA from wallet public key
    const deriveSessionPDA = useCallback((player: PublicKey) => {
        const [pda] = PublicKey.findProgramAddressSync(
            [player.toBuffer()],
            new PublicKey(IDL.address)
        );
        return pda;
    }, []);

    // Derive personal record PDA from wallet public key
    const derivePersonalRecordPDA = useCallback((player: PublicKey) => {
        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("personal_record"), player.toBuffer()],
            new PublicKey(IDL.address)
        );
        return pda;
    }, []);

    // Auto-derive PDAs when wallet connects
    useEffect(() => {
        if (wallet.publicKey) {
            const sessionPda = deriveSessionPDA(wallet.publicKey);
            const personalRecordPda = derivePersonalRecordPDA(wallet.publicKey);
            setSessionPubkeyState(sessionPda);
            setPersonalRecordPubkeyState(personalRecordPda);
        } else {
            setSessionPubkeyState(null);
            setPersonalRecordPubkeyState(null);
        }
    }, [wallet.publicKey, deriveSessionPDA, derivePersonalRecordPDA]);

    // Fetch typing session account data from base layer
    const fetchSessionAccount = useCallback(async () => {
        if (!program || !sessionPubkey) {
            setSessionAccount(null);
            return;
        }

        try {
            const account = await program.account.typingSession.fetch(sessionPubkey);
            setSessionAccount({
                player: account.player,
                wordsTyped: account.wordsTyped,
                correctWords: account.correctWords,
                errors: account.errors,
                wpm: account.wpm,
                accuracy: account.accuracy,
                isActive: account.isActive,
                startedAt: BigInt(account.startedAt.toString()),
                endedAt: account.endedAt ? BigInt(account.endedAt.toString()) : null,
            });
            setError(null);
        } catch (err) {
            // This is expected when the session hasn't been initialized yet
            console.debug("Session account not found (this is normal for new wallets):", err);
            setSessionAccount(null);
            // Only set error for unexpected errors, not "account does not exist"
            if (err instanceof Error && !err.message.includes("Account does not exist") && !err.message.includes("could not find account")) {
                setError(err.message);
            }
        }
    }, [program, sessionPubkey]);

    // Fetch personal record account data from base layer
    const fetchPersonalRecordAccount = useCallback(async () => {
        if (!program || !personalRecordPubkey) {
            setPersonalRecordAccount(null);
            return;
        }

        try {
            const account = await program.account.personalRecord.fetch(personalRecordPubkey);
            setPersonalRecordAccount({
                player: account.player,
                attemptCount: account.attemptCount,
                totalWordsTyped: BigInt(account.totalWordsTyped.toString()),
                totalCorrectWords: BigInt(account.totalCorrectWords.toString()),
                bestWpm: account.bestWpm,
                bestAccuracy: account.bestAccuracy,
                attempts: account.attempts.map((a: any) => ({
                    attemptNumber: a.attemptNumber,
                    wordsTyped: a.wordsTyped,
                    correctWords: a.correctWords,
                    errors: a.errors,
                    wpm: a.wpm,
                    accuracy: a.accuracy,
                    duration: BigInt(a.duration.toString()),
                    timestamp: BigInt(a.timestamp.toString()),
                })),
            });
            setError(null);
        } catch (err) {
            console.debug("Personal record not found (this is normal for new players):", err);
            setPersonalRecordAccount(null);
        }
    }, [program, personalRecordPubkey]);

    // Delegation Program address - when an account is delegated, its owner changes to this
    const DELEGATION_PROGRAM_ID = new PublicKey("DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh");

    // Check if account is delegated by checking the account owner on base layer
    const checkDelegationStatus = useCallback(async () => {
        if (!sessionPubkey) {
            setDelegationStatus("checking");
            return;
        }

        try {
            setDelegationStatus("checking");

            // Get account info from base layer to check the owner
            const accountInfo = await connection.getAccountInfo(sessionPubkey);

            if (!accountInfo) {
                // Account doesn't exist yet
                setDelegationStatus("undelegated");
                setErSessionData(null);
                return;
            }

            // Check if the account owner is the delegation program
            const isDelegated = accountInfo.owner.equals(DELEGATION_PROGRAM_ID);

            if (isDelegated) {
                setDelegationStatus("delegated");
                // Try to fetch the session data from ER
                if (erProgram) {
                    try {
                        const account = await erProgram.account.typingSession.fetch(sessionPubkey);
                        setErSessionData({
                            player: account.player,
                            wordsTyped: account.wordsTyped,
                            correctWords: account.correctWords,
                            errors: account.errors,
                            wpm: account.wpm,
                            accuracy: account.accuracy,
                            isActive: account.isActive,
                            startedAt: BigInt(account.startedAt.toString()),
                            endedAt: account.endedAt ? BigInt(account.endedAt.toString()) : null,
                        });
                    } catch {
                        // Couldn't fetch from ER, but it's still delegated
                        console.debug("Couldn't fetch session from ER");
                    }
                }
            } else {
                setDelegationStatus("undelegated");
                setErSessionData(null);
            }
        } catch (err) {
            console.debug("Error checking delegation status:", err);
            setDelegationStatus("undelegated");
            setErSessionData(null);
        }
    }, [sessionPubkey, connection, erProgram]);

    // Subscribe to base layer account changes via WebSocket
    useEffect(() => {
        if (!program || !sessionPubkey) {
            return;
        }

        fetchSessionAccount();
        fetchPersonalRecordAccount();
        checkDelegationStatus();

        const subscriptionId = connection.onAccountChange(
            sessionPubkey,
            async (accountInfo) => {
                try {
                    const decoded = program.coder.accounts.decode("typingSession", accountInfo.data);
                    setSessionAccount({
                        player: decoded.player,
                        wordsTyped: decoded.wordsTyped,
                        correctWords: decoded.correctWords,
                        errors: decoded.errors,
                        wpm: decoded.wpm,
                        accuracy: decoded.accuracy,
                        isActive: decoded.isActive,
                        startedAt: BigInt(decoded.startedAt.toString()),
                        endedAt: decoded.endedAt ? BigInt(decoded.endedAt.toString()) : null,
                    });
                    setError(null);
                    // Recheck delegation status when base layer changes
                    checkDelegationStatus();
                } catch (err) {
                    console.error("Failed to decode account data:", err);
                }
            },
            "confirmed"
        );

        return () => {
            connection.removeAccountChangeListener(subscriptionId);
        };
    }, [program, sessionPubkey, connection, fetchSessionAccount, fetchPersonalRecordAccount, checkDelegationStatus]);

    // Subscribe to ER account changes when delegated
    useEffect(() => {
        if (!erProgram || !sessionPubkey || delegationStatus !== "delegated") {
            return;
        }

        const subscriptionId = erConnection.onAccountChange(
            sessionPubkey,
            async (accountInfo) => {
                try {
                    const decoded = erProgram.coder.accounts.decode("typingSession", accountInfo.data);
                    setErSessionData({
                        player: decoded.player,
                        wordsTyped: decoded.wordsTyped,
                        correctWords: decoded.correctWords,
                        errors: decoded.errors,
                        wpm: decoded.wpm,
                        accuracy: decoded.accuracy,
                        isActive: decoded.isActive,
                        startedAt: BigInt(decoded.startedAt.toString()),
                        endedAt: decoded.endedAt ? BigInt(decoded.endedAt.toString()) : null,
                    });
                } catch (err) {
                    console.error("Failed to decode ER account data:", err);
                }
            },
            "confirmed"
        );

        return () => {
            erConnection.removeAccountChangeListener(subscriptionId);
        };
    }, [erProgram, sessionPubkey, erConnection, delegationStatus]);

    // Initialize a new typing session (uses PDA derived from wallet)
    const initialize = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey) {
            throw new Error("Wallet not connected");
        }

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .initialize()
                .accounts({
                    player: wallet.publicKey,
                })
                .rpc();

            // PDA is already set from wallet connection
            await fetchSessionAccount();
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to initialize session";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, fetchSessionAccount]);

    // Initialize personal record
    const initPersonalRecord = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey) {
            throw new Error("Wallet not connected");
        }

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .initPersonalRecord()
                .accounts({
                    player: wallet.publicKey,
                })
                .rpc();

            await fetchPersonalRecordAccount();
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to initialize personal record";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, fetchPersonalRecordAccount]);

    // Type a word (on base layer)
    const typeWord = useCallback(async (isCorrect: boolean): Promise<string> => {
        if (!program || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized");
        }

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .typeWord(isCorrect)
                .accounts({
                    signer: wallet.publicKey,
                    sessionToken: null,
                } as any)
                .rpc();

            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to type word";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, sessionPubkey]);

    const performErAction = useCallback(async (
        methodBuilder: any,
        actionName: string
    ): Promise<string> => {
        if (!program || !erProvider || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized or not delegated");
        }

        setIsLoading(true);
        setError(null);

        try {
            // Check if we have a valid session
            const hasSession = sessionToken != null && sessionWallet != null;
            const signer = hasSession ? sessionWallet.publicKey : wallet.publicKey;

            // Build accounts
            const accounts: any = {
                signer: signer,
                sessionToken: hasSession ? sessionToken : null,
            };

            // Build transaction using base program structure but targeted at ER accounts
            let tx = await methodBuilder
                .accounts(accounts)
                .transaction();

            // Set up for ER connection
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;

            if (hasSession && sessionWallet && sessionWallet.signTransaction) {
                tx.feePayer = sessionWallet.publicKey;
                tx = await sessionWallet.signTransaction(tx);
            } else {
                tx = await erProvider.wallet.signTransaction(tx);
            }

            // Send using raw connection
            const txHash = await erConnection.sendRawTransaction(tx.serialize(), {
                skipPreflight: true,
            });
            await erConnection.confirmTransaction(txHash, "confirmed");

            // Refresh ER session data
            if (erProgram) {
                try {
                    const account = await erProgram.account.typingSession.fetch(sessionPubkey);
                    setErSessionData({
                        player: account.player,
                        wordsTyped: account.wordsTyped,
                        correctWords: account.correctWords,
                        errors: account.errors,
                        wpm: account.wpm,
                        accuracy: account.accuracy,
                        isActive: account.isActive,
                        startedAt: BigInt(account.startedAt.toString()),
                        endedAt: account.endedAt ? BigInt(account.endedAt.toString()) : null,
                    });
                } catch {
                    // Ignore fetch errors
                }
            }

            return txHash;
        } catch (err) {
            const message = err instanceof Error ? err.message : `Failed to ${actionName} on ER`;
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, erProvider, erConnection, erProgram, wallet.publicKey, sessionPubkey, sessionToken, sessionWallet]);

    // Type a word on Ephemeral Rollup
    const typeWordOnER = useCallback(async (isCorrect: boolean): Promise<string> => {
        if (!program) throw new Error("Program not loaded");
        return performErAction(program.methods.typeWord(isCorrect), "type word");
    }, [program, performErAction]);

    // End session on Ephemeral Rollup
    const endSessionOnER = useCallback(async (): Promise<string> => {
        if (!program) throw new Error("Program not loaded");
        return performErAction(program.methods.endSession(), "end session");
    }, [program, performErAction]);

    // End typing session (on base layer)
    const endSession = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized");
        }

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .endSession()
                .accounts({
                    signer: wallet.publicKey,
                    sessionToken: null,
                } as any)
                .rpc();

            await fetchSessionAccount();
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to end session";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, sessionPubkey, fetchSessionAccount]);

    // Save session to personal record (on base layer)
    const saveToRecord = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized");
        }

        setIsLoading(true);
        setError(null);

        try {
            const tx = await program.methods
                .saveToRecord()
                .accounts({
                    player: wallet.publicKey,
                })
                .rpc();

            await fetchPersonalRecordAccount();
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to save to record";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, wallet.publicKey, sessionPubkey, fetchPersonalRecordAccount]);

    // ========================================
    // Ephemeral Rollups Functions
    // ========================================

    // Delegate the typing session to Ephemeral Rollups
    const delegate = useCallback(async (): Promise<string> => {
        if (!program || !wallet.publicKey) {
            throw new Error("Wallet not connected");
        }

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

            // Wait a bit for delegation to propagate
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Recheck delegation status
            await checkDelegationStatus();

            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to delegate session";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
            setIsDelegating(false);
        }
    }, [program, wallet.publicKey, checkDelegationStatus]);

    // Commit state from ER to base layer (runs on ER)
    const commit = useCallback(async (): Promise<string> => {
        if (!program || !erProvider || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized or not delegated");
        }

        setIsLoading(true);
        setError(null);

        try {
            // Build transaction using base program
            let tx = await program.methods
                .commit()
                .accounts({
                    payer: wallet.publicKey,
                })
                .transaction();

            // Set up for ER connection
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
            tx = await erProvider.wallet.signTransaction(tx);

            // Send using raw connection
            const txHash = await erConnection.sendRawTransaction(tx.serialize(), {
                skipPreflight: true,
            });
            await erConnection.confirmTransaction(txHash, "confirmed");

            // Try to get the commitment signature on base layer
            try {
                // Dynamic import to avoid Buffer issues at module load time
                const { GetCommitmentSignature } = await import("@magicblock-labs/ephemeral-rollups-sdk");
                const txCommitSgn = await GetCommitmentSignature(txHash, erConnection);
                console.log("Commit signature on base layer:", txCommitSgn);
            } catch {
                console.log("GetCommitmentSignature not available (might be expected on localnet)");
            }

            // Refresh base layer session data
            await fetchSessionAccount();

            return txHash;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to commit session";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, erProvider, erConnection, wallet.publicKey, sessionPubkey, fetchSessionAccount]);

    // Undelegate the session from ER (runs on ER)
    const undelegate = useCallback(async (): Promise<string> => {
        if (!program || !erProvider || !wallet.publicKey || !sessionPubkey) {
            throw new Error("Session not initialized or not delegated");
        }

        setIsLoading(true);
        setError(null);

        try {
            // Build transaction using base program
            let tx = await program.methods
                .undelegate()
                .accounts({
                    payer: wallet.publicKey,
                })
                .transaction();

            // Set up for ER connection
            tx.feePayer = wallet.publicKey;
            tx.recentBlockhash = (await erConnection.getLatestBlockhash()).blockhash;
            tx = await erProvider.wallet.signTransaction(tx);

            // Send using raw connection
            const txHash = await erConnection.sendRawTransaction(tx.serialize(), {
                skipPreflight: true,
            });
            await erConnection.confirmTransaction(txHash, "confirmed");

            // Wait for undelegation to propagate
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update state
            setDelegationStatus("undelegated");
            setErSessionData(null);

            // Refresh base layer session data
            await fetchSessionAccount();

            return txHash;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to undelegate session";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [program, erProvider, erConnection, wallet.publicKey, sessionPubkey, fetchSessionAccount]);

    return {
        program,
        sessionAccount,
        sessionPubkey,
        personalRecordAccount,
        personalRecordPubkey,
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
        erSessionData,
        // Utilities
        refetch: fetchSessionAccount,
        refetchPersonalRecord: fetchPersonalRecordAccount,
        checkDelegation: checkDelegationStatus,
        // Session
        createSession,
        sessionToken,
        isSessionLoading,
    };
}

/**
 * Backwards-compatible alias for useTypingSpeedGameProgram
 * Maps new field names to old counter-style names for Counter.tsx
 */
export function useCounterProgram() {
    const hook = useTypingSpeedGameProgram();
    
    // Create a counter-like account from the session account
    const counterAccount = hook.sessionAccount ? {
        count: BigInt(hook.sessionAccount.wordsTyped),
        authority: hook.sessionAccount.player,
    } : null;
    
    return {
        ...hook,
        // Map new names to old counter names
        counterAccount,
        counterPubkey: hook.sessionPubkey,
        erCounterValue: hook.erSessionData ? BigInt(hook.erSessionData.wordsTyped) : null,
        // Map typeWord to increment/decrement (for demo purposes)
        increment: () => hook.typeWord(true),
        decrement: () => hook.typeWord(false),
        set: (value: number) => Promise.resolve("Not supported in typing game"),
        incrementOnER: () => hook.typeWordOnER(true),
        decrementOnER: () => hook.typeWordOnER(false),
        setOnER: (value: number) => Promise.resolve("Not supported in typing game"),
    };
}
