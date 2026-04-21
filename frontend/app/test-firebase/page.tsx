"use client"

import { useEffect, useState } from "react"
import { runAllFirebaseTests } from "@/lib/firebase-test"

export default function TestFirebasePage() {
    const [testResults, setTestResults] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const runTests = async () => {
        setLoading(true)
        const results = await runAllFirebaseTests()
        setTestResults(results)
        setLoading(false)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-2">🔥 Firebase Connection Test</h1>
                <p className="text-slate-300 mb-8">Verify your Firebase configuration is working correctly</p>

                <button
                    onClick={runTests}
                    disabled={loading}
                    className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-8"
                >
                    {loading ? "Running Tests..." : "Run Firebase Tests"}
                </button>

                {testResults && (
                    <div className="space-y-4">
                        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                            <h2 className="text-xl font-semibold text-white mb-4">Test Results</h2>

                            <div className="space-y-3">
                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                    <span className="text-slate-200">Firebase App</span>
                                    <span className={`text-2xl ${testResults.app.success ? "text-green-400" : "text-red-400"}`}>
                                        {testResults.app.success ? "✅" : "❌"}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                    <span className="text-slate-200">Firebase Auth</span>
                                    <span className={`text-2xl ${testResults.auth.success ? "text-green-400" : "text-red-400"}`}>
                                        {testResults.auth.success ? "✅" : "❌"}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                    <span className="text-slate-200">Firestore</span>
                                    <span className={`text-2xl ${testResults.firestore.success ? "text-green-400" : "text-red-400"}`}>
                                        {testResults.firestore.success ? "✅" : "❌"}
                                    </span>
                                </div>

                                <div className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                                    <span className="text-slate-200">Firebase Storage</span>
                                    <span className={`text-2xl ${testResults.storage.success ? "text-green-400" : "text-red-400"}`}>
                                        {testResults.storage.success ? "✅" : "❌"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                            <h2 className="text-xl font-semibold text-white mb-4">Configuration</h2>
                            <pre className="text-sm text-slate-300 overflow-x-auto">
                                {`NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}`}
                            </pre>
                        </div>

                        <div className="bg-slate-800/50 backdrop-blur rounded-xl p-6 border border-slate-700">
                            <h2 className="text-xl font-semibold text-white mb-4">Console Output</h2>
                            <p className="text-slate-300">Check your browser console (F12) for detailed logs</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
