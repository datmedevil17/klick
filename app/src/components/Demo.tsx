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
        commit,
        undelegate,
        typeWordOnER,
        endSessionOnER,
        // Delegation status
        delegationStatus,
        erSessionData,
        // Utilities
        refetch,
        refetchPersonalRecord,
        checkDelegation,
        // Session
        createSession,
        sessionToken,
        isSessionLoading,
    } = useTypingSpeedGameProgram();

    const [logs, setLogs] = useState<Array<{ message: string; type: "info" | "success" | "error"; timestamp: string }>>([]);

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

    // Get explorer URL
    const getExplorerUrl = (address: string, type: "address" | "tx" = "address") => {
        return `https://explorer.solana.com/${type}/${address}?cluster=devnet`;
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
                        Test all program functions in order. Follow the numbered steps below.
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
                            <p className="font-medium text-blue-800 mb-2">Session Data:</p>
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

                    {erSessionData && delegationStatus === "delegated" && (
                        <div className="p-3 bg-green-50 rounded-lg">
                            <p className="font-medium text-green-800 mb-2">ER Session Data:</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <p>Words: {erSessionData.wordsTyped}</p>
                                <p>Correct: {erSessionData.correctWords}</p>
                                <p>Errors: {erSessionData.errors}</p>
                                <p>WPM: {erSessionData.wpm}</p>
                                <p>Accuracy: {erSessionData.accuracy}%</p>
                                <p>Active: {erSessionData.isActive ? "Yes" : "No"}</p>
                            </div>
                        </div>
                    )}

                    {personalRecordAccount && (
                        <div className="p-3 bg-purple-50 rounded-lg">
                            <p className="font-medium text-purple-800 mb-2">Personal Record:</p>
                            <div className="grid grid-cols-3 gap-2 text-xs">
                                <p>Attempts: {personalRecordAccount.attemptCount}</p>
                                <p>Total Words: {personalRecordAccount.totalWordsTyped.toString()}</p>
                                <p>Correct Words: {personalRecordAccount.totalCorrectWords.toString()}</p>
                                <p>Best WPM: {personalRecordAccount.bestWpm}</p>
                                <p>Best Accuracy: {personalRecordAccount.bestAccuracy}%</p>
                            </div>
                        </div>
                    )}

                    {sessionToken && (
                        <div className="p-2 bg-yellow-50 rounded-lg text-xs">
                            <p className="font-medium text-yellow-800">⚡ Session Token Active</p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Step 1: Initialize */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">1️⃣ Initialize Accounts</CardTitle>
                    <p className="text-sm text-gray-500">Create session and personal record accounts on base layer</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-3">
                        <Button
                            onClick={() => handleAction(initialize, "Initialize Session")}
                            disabled={isLoading || !!sessionAccount}
                            className="flex-1"
                        >
                            {sessionAccount ? "✓ Session Initialized" : "Initialize Session"}
                        </Button>
                        <Button
                            onClick={() => handleAction(initPersonalRecord, "Initialize Personal Record")}
                            disabled={isLoading || !!personalRecordAccount}
                            variant="outline"
                            className="flex-1"
                        >
                            {personalRecordAccount ? "✓ Record Initialized" : "Init Personal Record"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Step 2: Type Words (Base Layer) */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">2️⃣ Type Words (Base Layer)</CardTitle>
                    <p className="text-sm text-gray-500">Record words on the base layer (slow, requires wallet signature each time)</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-3">
                        <Button
                            onClick={() => handleAction(() => typeWord(true), "Type Correct Word")}
                            disabled={isLoading || !sessionAccount || delegationStatus === "delegated"}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            ✓ Correct Word
                        </Button>
                        <Button
                            onClick={() => handleAction(() => typeWord(false), "Type Wrong Word")}
                            disabled={isLoading || !sessionAccount || delegationStatus === "delegated"}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        >
                            ✗ Wrong Word
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Step 3: Delegate to ER */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">3️⃣ Delegate to Ephemeral Rollup</CardTitle>
                    <p className="text-sm text-gray-500">Move session to ER for fast, gasless transactions</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-3">
                        <Button
                            onClick={() => handleAction(delegate, "Delegate")}
                            disabled={isLoading || !sessionAccount || delegationStatus === "delegated"}
                            className="flex-1 bg-black hover:bg-gray-800"
                        >
                            {isDelegating ? "Delegating..." : delegationStatus === "delegated" ? "✓ Delegated" : "Delegate to ER"}
                        </Button>
                        <Button
                            onClick={() => handleAction(async () => {
                                await createSession();
                                return "Session Created";
                            }, "Create Session Token")}
                            disabled={isLoading || isSessionLoading || delegationStatus !== "delegated" || !!sessionToken}
                            variant="outline"
                            className="flex-1"
                        >
                            {sessionToken ? "✓ Session Active" : "Create Session Token ⚡"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Step 4: Type Words on ER */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">4️⃣ Type Words (Ephemeral Rollup)</CardTitle>
                    <p className="text-sm text-gray-500">Fast, seamless typing on ER - no wallet popups with session token!</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-3">
                        <Button
                            onClick={() => handleAction(() => typeWordOnER(true), "Type Correct Word on ER")}
                            disabled={isLoading || delegationStatus !== "delegated"}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                        >
                            ✓ Correct Word (ER)
                        </Button>
                        <Button
                            onClick={() => handleAction(() => typeWordOnER(false), "Type Wrong Word on ER")}
                            disabled={isLoading || delegationStatus !== "delegated"}
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
                        >
                            ✗ Wrong Word (ER)
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Step 5: End Session on ER */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">5️⃣ End Session on ER</CardTitle>
                    <p className="text-sm text-gray-500">Calculate final stats and mark session as ended</p>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => handleAction(endSessionOnER, "End Session on ER")}
                        disabled={isLoading || delegationStatus !== "delegated"}
                        className="w-full bg-orange-500 hover:bg-orange-600"
                    >
                        End Session (ER)
                    </Button>
                </CardContent>
            </Card>

            {/* Step 6: Commit & Undelegate */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">6️⃣ Commit & Undelegate</CardTitle>
                    <p className="text-sm text-gray-500">Persist ER state to base layer and return control</p>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-3">
                        <Button
                            onClick={() => handleAction(commit, "Commit")}
                            disabled={isLoading || delegationStatus !== "delegated"}
                            variant="outline"
                            className="flex-1"
                        >
                            Commit to Base Layer
                        </Button>
                        <Button
                            onClick={() => handleAction(undelegate, "Undelegate")}
                            disabled={isLoading || delegationStatus !== "delegated"}
                            className="flex-1 bg-gray-800 hover:bg-gray-900"
                        >
                            Undelegate from ER
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Step 7: Save to Record */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">7️⃣ Save to Personal Record</CardTitle>
                    <p className="text-sm text-gray-500">Save completed session stats to your permanent record</p>
                </CardHeader>
                <CardContent>
                    <Button
                        onClick={() => handleAction(saveToRecord, "Save to Record")}
                        disabled={isLoading || !sessionAccount || sessionAccount?.isActive || delegationStatus === "delegated"}
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
                <CardContent className="space-y-3">
                    <div className="flex gap-3">
                        <Button
                            onClick={() => {
                                refetch();
                                refetchPersonalRecord();
                                checkDelegation();
                                addLog("Refreshed all data", "info");
                            }}
                            variant="outline"
                            className="flex-1"
                        >
                            🔄 Refresh All Data
                        </Button>
                        <Button
                            onClick={() => handleAction(endSession, "End Session (Base Layer)")}
                            disabled={isLoading || delegationStatus === "delegated"}
                            variant="outline"
                            className="flex-1"
                        >
                            End Session (Base)
                        </Button>
                    </div>
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
