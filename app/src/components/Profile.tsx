import { useWallet } from "@solana/wallet-adapter-react";
import { useTypingSpeedGameProgram } from "../hooks/use-counter-program";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";

export function Profile() {
    const { connected } = useWallet();
    const {
        personalRecordAccount,
        isLoading,
        refetchPersonalRecord
    } = useTypingSpeedGameProgram();

    if (!connected) {
        return (
            <Card className="max-w-4xl mx-auto">
                <CardContent className="pt-6">
                    <p className="text-center text-gray-500 text-lg">
                        Connect your wallet to view your profile
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!personalRecordAccount) {
        return (
            <Card className="max-w-4xl mx-auto">
                <CardContent className="pt-6 text-center space-y-4">
                    <p className="text-gray-500 text-lg">
                        No profile found. Complete a game and save it to create your profile!
                    </p>
                    <Button onClick={() => window.location.href = "/demo"} variant="outline">
                        Go to Game
                    </Button>
                </CardContent>
            </Card>
        );
    }

    // Sort attempts by timestamp descending (newest first)
    // Note: attempts is a read-only array from the hook, so we copy it first
    const history = [...personalRecordAccount.attempts].sort((a, b) => 
        Number(b.timestamp) - Number(a.timestamp)
    );

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header with Stats */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-2xl">👤 Player Profile</CardTitle>
                    <Button onClick={refetchPersonalRecord} variant="outline" size="sm" disabled={isLoading}>
                        Refresh Data
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-purple-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-purple-600 font-medium">Games Played</p>
                            <p className="text-2xl font-bold text-gray-900">{personalRecordAccount.attemptCount}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-blue-600 font-medium">Best WPM</p>
                            <p className="text-2xl font-bold text-gray-900">{personalRecordAccount.bestWpm}</p>
                        </div>
                        <div className="bg-green-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-green-600 font-medium">Best Accuracy</p>
                            <p className="text-2xl font-bold text-gray-900">{personalRecordAccount.bestAccuracy}%</p>
                        </div>
                        <div className="bg-orange-50 p-4 rounded-lg text-center">
                            <p className="text-sm text-orange-600 font-medium">Total Words</p>
                            <p className="text-2xl font-bold text-gray-900">{personalRecordAccount.totalWordsTyped.toString()}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* History Table */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">📜 Match History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3">#</th>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">WPM</th>
                                    <th className="px-4 py-3">Accuracy</th>
                                    <th className="px-4 py-3">Words (Correct/Err)</th>
                                    <th className="px-4 py-3">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-4 text-center text-gray-500">
                                            No games played yet.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((attempt) => (
                                        <tr key={attempt.attemptNumber} className="border-b hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">
                                                {attempt.attemptNumber}
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {new Date(Number(attempt.timestamp) * 1000).toLocaleString()}
                                            </td>
                                            <td className="px-4 py-3 font-bold text-blue-600">
                                                {attempt.wpm}
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                    attempt.accuracy >= 95 ? 'bg-green-100 text-green-800' :
                                                    attempt.accuracy >= 90 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                    {attempt.accuracy}%
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                {attempt.wordsTyped} <span className="text-gray-400">({attempt.correctWords} / {attempt.errors})</span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-500">
                                                {Number(attempt.duration)}s
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
