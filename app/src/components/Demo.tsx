import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useTypingSpeedGameProgram, type DelegationStatus } from "../hooks/use-counter-program";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

// Badge component for delegation status
function StatusBadge({ status }: { status: DelegationStatus }) {
    const styles: Record<DelegationStatus, { bg: string; text: string; label: string }> = {
        undelegated: { bg: "bg-gray-100", text: "text-gray-900", label: "Base Layer" },
        delegated: { bg: "bg-green-600", text: "text-white", label: "Delegated to ER" },
        checking: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Checking..." },
    };

    const style = styles[status];

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
            {style.label}
        </span>
    );
}

// Log entry component
function LogEntry({ message, type, timestamp }: { message: string; type: "info" | "success" | "error"; timestamp: string }) {
    const colors = {
        info: "text-blue-600",
        success: "text-green-600",
        error: "text-red-600",
    };

    return (
        <div className={`text-sm font-mono ${colors[type]}`}>
            <span className="text-gray-400">[{timestamp}]</span> {message}
        </div>
    );
}

export function Demo() {
    const { publicKey, connected } = useWallet();
    const {
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
        // ER operations
        delegate,
        undelegate,
        typeWordOnER,
        // Delegation status
        delegationStatus,
        erSessionData,
        // Utilities
        refetch,
        refetchPersonalRecord,
        checkDelegation,
        // Session key
        createSession,
        revokeSession,
        sessionToken,
        isSessionLoading,
    } = useTypingSpeedGameProgram();

    const [logs, setLogs] = useState<Array<{ message: string; type: "info" | "success" | "error"; timestamp: string }>>([]);
    const [sessionKeyRevoked, setSessionKeyRevoked] = useState(false);

    const addLog = (message: string, type: "info" | "success" | "error" = "info") => {
        const timestamp = new Date().toLocaleTimeString();
        setLogs((prev) => [...prev, { message, type, timestamp }]);
    };

    const clearLogs = () => setLogs([]);

    // Handle actions with logging
    const handleAction = async (action: () => Promise<string>, actionName: string) => {
        addLog(`Starting: ${actionName}...`, "info");
        try {
            const tx = await action();
            addLog(`✓ ${actionName} successful! TX: ${tx.slice(0, 20)}...`, "success");
            return tx;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            addLog(`✗ ${actionName} failed: ${message}`, "error");
            throw err;
        }
    };

    // Revoke session key on-chain
    const handleRevokeSession = async () => {
        addLog("Revoking session key on-chain...", "info");
        try {
            await revokeSession();
            setSessionKeyRevoked(true);
            addLog("✓ Session key revoked successfully!", "success");
        } catch (err) {
            const message = err instanceof Error ? err.message : "Unknown error";
            addLog(`✗ Failed to revoke session: ${message}`, "error");
        }
    };

    if (!connected || !publicKey) {
        return (
            <Card className="max-w-4xl mx-auto">
                <CardContent className="pt-6">
                    <p className="text-center text-gray-500 text-lg">
                        Connect your wallet to test the Typing Speed Game program
                    </p>
                </CardContent>
            </Card>
        );
    }

    // Check states for button enabling
    const hasSession = !!sessionAccount;
    const hasPersonalRecord = !!personalRecordAccount;
    const isDelegated = delegationStatus === "delegated";
    const hasSessionKey = !!sessionToken && !sessionKeyRevoked;
    const sessionEnded = !!sessionAccount && !sessionAccount.isActive;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-2xl">🎮 Typing Speed Game - Demo</CardTitle>
                        <StatusBadge status={delegationStatus} />
                    </div>
                    <p className="text-sm text-gray-500">
                        Follow the 8-step flow in order to test all program functions.
                    </p>
                </CardHeader>
            </Card>

            {/* Account Status */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">📊 Account Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="font-medium text-gray-700">Session PDA:</p>
                            <p className="font-mono text-xs text-gray-500 break-all">
                                {sessionPubkey?.toBase58() || "Not derived"}
                            </p>
                        </div>
                        <div>
                            <p className="font-medium text-gray-700">Personal Record PDA:</p>
                            <p className="font-mono text-xs text-gray-500 break-all">
                                {personalRecordPubkey?.toBase58() || "Not derived"}
                            </p>
                        </div>
                    </div>
                    
                    {sessionAccount && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="font-medium text-blue-800 mb-2">Game Session Data ({sessionAccount.isActive ? "Active" : "Ended"}):</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <p>Words: {sessionAccount.wordsTyped}</p>
                                <p>Correct: {sessionAccount.correctWords}</p>
                                <p>Errors: {sessionAccount.errors}</p>
                                <p>WPM: {sessionAccount.wpm}</p>
                                <p>Accuracy: {sessionAccount.accuracy}%</p>
                                <p>Active: {sessionAccount.isActive ? "Yes" : "No"}</p>
                            </div>
                        </div>
                    )}

                    {erSessionData && isDelegated && (
                        <div className="p-3 bg-green-50 rounded-lg">
                            <p className="font-medium text-green-800 mb-2">ER Session Data:</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <p>Words: {erSessionData.wordsTyped}</p>
                                <p>Correct: {erSessionData.correctWords}</p>
                                <p>Errors: {erSessionData.errors}</p>
                                <p>WPM: {erSessionData.wpm}</p>
                                <p>Accuracy: {erSessionData.accuracy}%</p>
                            </div>
                        </div>
                    )}

                    {personalRecordAccount && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="font-medium text-purple-800 mb-2">Personal Record:</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <p>Attempts: {personalRecordAccount.attemptCount}</p>
                                <p>Total Words: {personalRecordAccount.totalWordsTyped.toString()}</p>
                                <p>Best WPM: {personalRecordAccount.bestWpm}</p>
                                <p>Best Accuracy: {personalRecordAccount.bestAccuracy}%</p>
                            </div>
                        </div>
                    )}

                    <div className="flex gap-2">
                        {hasSessionKey && (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">⚡ Session Key Active</span>
                        )}
                        {sessionKeyRevoked && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">🔒 Session Key Revoked</span>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Step 1: Create Game Session */}
            <Card className={hasSession ? "border-green-300 bg-green-50/30" : ""}>
                <CardHeader>
                    <CardTitle className="text-lg">1️⃣ Create Game Session</CardTitle>
                    <p className="text-sm text-gray-500">Initialize TypingSession PDA on base layer</p>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => handleAction(initialize, "Create Game Session")}
                        disabled={isLoading || (hasSession && sessionAccount?.isActive)}
                        className="w-full"
                    >
                        {hasSession ? (sessionAccount?.isActive ? "✓ Session Active" : "Start New Game (Reset)") : "Initialize Game Session"}
                    </Button>
                </CardContent>
            </Card>

            {/* Step 2: Delegate Session */}
            <Card className={isDelegated ? "border-green-300 bg-green-50/30" : ""}>
                <CardHeader>
                    <CardTitle className="text-lg">2️⃣ Delegate Session</CardTitle>
                    <p className="text-sm text-gray-500">Move TypingSession to Ephemeral Rollup for fast transactions</p>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => handleAction(delegate, "Delegate Session")}
                        disabled={isLoading || !hasSession || isDelegated}
                        className="w-full bg-black hover:bg-gray-800"
                    >
                        {isDelegating ? "Delegating..." : isDelegated ? "✓ Delegated to ER" : "Delegate to ER"}
                    </Button>
                </CardContent>
            </Card>

            {/* Step 3: Create Session Key */}
            <Card className={hasSessionKey ? "border-green-300 bg-green-50/30" : ""}>
                <CardHeader>
                    <CardTitle className="text-lg">3️⃣ Create Session Key</CardTitle>
                    <p className="text-sm text-gray-500">Get SessionToken for seamless auto-signing (no wallet popups)</p>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => {
                            setSessionKeyRevoked(false);
                            handleAction(async () => {
                                await createSession();
                                return "Session Key Created";
                            }, "Create Session Key");
                        }}
                        disabled={isLoading || isSessionLoading || !isDelegated || hasSessionKey}
                        className="w-full bg-yellow-500 hover:bg-yellow-600"
                    >
                        {isSessionLoading ? "Creating..." : hasSessionKey ? "✓ Session Key Active ⚡" : "Create Session Key"}
                    </Button>
                </CardContent>
            </Card>

            {/* Step 4: Type Words */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">4️⃣ Type Words</CardTitle>
                    <p className="text-sm text-gray-500">Use session key on ER - instant, no popups! Click multiple times.</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-3">
                        <Button
                            onClick={() => handleAction(() => typeWordOnER(true), "Type Correct Word")}
                            disabled={isLoading || !isDelegated || !hasSessionKey}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            ✓ Correct Word
                        </Button>
                        <Button
                            onClick={() => handleAction(() => typeWordOnER(false), "Type Wrong Word")}
                            disabled={isLoading || !isDelegated || !hasSessionKey}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        >
                            ✗ Wrong Word
                        </Button>
                    </div>
                    {!hasSessionKey && isDelegated && (
                        <p className="text-xs text-amber-600">⚠️ Create session key first for seamless typing</p>
                    )}
                </CardContent>
            </Card>

            {/* Step 5: End Session Key */}
            <Card className={sessionKeyRevoked ? "border-green-300 bg-green-50/30" : ""}>
                <CardHeader>
                    <CardTitle className="text-lg">5️⃣ End Session Key</CardTitle>
                    <p className="text-sm text-gray-500">Revoke the SessionToken (security cleanup)</p>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={handleRevokeSession}
                        disabled={isLoading || !sessionToken || sessionKeyRevoked}
                        variant="outline"
                        className="w-full"
                    >
                        {sessionKeyRevoked ? "✓ Session Key Revoked" : "Revoke Session Key"}
                    </Button>
                </CardContent>
            </Card>

            {/* Step 6: Undelegate Session */}
            <Card className={!isDelegated && hasSession ? "border-green-300 bg-green-50/30" : ""}>
                <CardHeader>
                    <CardTitle className="text-lg">6️⃣ Undelegate Session</CardTitle>
                    <p className="text-sm text-gray-500">Move TypingSession back to base layer</p>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => handleAction(undelegate, "Undelegate Session")}
                        disabled={isLoading || !isDelegated}
                        className="w-full bg-gray-800 hover:bg-gray-900"
                    >
                        {!isDelegated && hasSession ? "✓ Undelegated" : "Undelegate from ER"}
                    </Button>
                </CardContent>
            </Card>

            {/* Step 7: End Game Session */}
            <Card className={sessionEnded ? "border-green-300 bg-green-50/30" : ""}>
                <CardHeader>
                    <CardTitle className="text-lg">7️⃣ End Game Session</CardTitle>
                    <p className="text-sm text-gray-500">Mark TypingSession complete and calculate final WPM</p>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => handleAction(endSession, "End Game Session")}
                        disabled={isLoading || !hasSession || isDelegated || sessionEnded}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-opacity-50"
                    >
                        {sessionEnded ? "✓ Session Ended" : isDelegated ? "Must Undelegate First on Base Layer" : "End Game Session"}
                    </Button>
                </CardContent>
            </Card>

            {/* Step 8: Save to Personal Record */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">8️⃣ Save to Personal Record</CardTitle>
                    <p className="text-sm text-gray-500">Store results in your permanent on-chain record</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    {!hasPersonalRecord && (
                        <Button
                            onClick={() => handleAction(initPersonalRecord, "Init Personal Record")}
                            disabled={isLoading}
                            variant="outline"
                            className="w-full mb-2"
                        >
                            First: Initialize Personal Record
                        </Button>
                    )}
                    <Button
                        onClick={() => handleAction(saveToRecord, "Save to Record")}
                        disabled={isLoading || !hasPersonalRecord || !sessionEnded || isDelegated}
                        className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                        Save to Personal Record
                    </Button>
                </CardContent>
            </Card>

            {/* Utilities */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">🔧 Utilities</CardTitle>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => {
                            refetch();
                            refetchPersonalRecord();
                            checkDelegation();
                            addLog("Refreshed all data", "info");
                        }}
                        variant="outline"
                        className="w-full"
                    >
                        🔄 Refresh All Data
                    </Button>
                </CardContent>
            </Card>

            {/* Error Display */}
            {error && (
                <Card className="border-red-200 bg-red-50">
                    <CardContent className="pt-4">
                        <p className="text-red-600 font-medium">Error: {error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Logs */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">📋 Activity Log</CardTitle>
                        <Button onClick={clearLogs} variant="ghost" size="sm">
                            Clear
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-48 overflow-y-auto bg-gray-900 rounded-lg p-3 space-y-1">
                        {logs.length === 0 ? (
                            <p className="text-gray-500 text-sm">No activity yet. Click a button to start.</p>
                        ) : (
                            logs.map((log, i) => (
                                <LogEntry key={i} {...log} />
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Loading overlay */}
            {isLoading && (
                <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
                    <div className="bg-white px-6 py-4 rounded-lg shadow-lg">
                        <p className="text-gray-800 font-medium">Processing...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
