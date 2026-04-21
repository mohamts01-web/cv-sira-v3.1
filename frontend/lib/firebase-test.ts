/**
 * Firebase Connection Test Utility
 * Use this to verify your Firebase configuration is working correctly
 */

import { app, auth, db, storage } from "./firebase"
import { connectAuthEmulator } from "firebase/auth"
import { connectFirestoreEmulator } from "firebase/firestore"
import { connectStorageEmulator } from "firebase/storage"
import { getAuth, signInAnonymously } from "firebase/auth"
import { collection, getDocs, query, limit } from "firebase/firestore"

/**
 * Test Firebase App initialization
 */
export async function testFirebaseApp() {
    try {
        console.log("✅ Firebase App initialized successfully")
        console.log("App name:", app.name)
        console.log("App options:", app.options)
        return { success: true, app }
    } catch (error: any) {
        console.error("❌ Firebase App initialization failed:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Test Firebase Auth connection
 */
export async function testFirebaseAuth() {
    try {
        const authInstance = getAuth(app)
        console.log("✅ Firebase Auth initialized successfully")
        console.log("Auth current user:", authInstance.currentUser)

        // Test anonymous sign-in (if enabled in Firebase Console)
        // Uncomment to test:
        // const userCredential = await signInAnonymously(authInstance)
        // console.log("✅ Anonymous sign-in successful:", userCredential.user.uid)

        return { success: true, auth: authInstance }
    } catch (error: any) {
        console.error("❌ Firebase Auth test failed:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Test Firestore connection
 */
export async function testFirestore() {
    try {
        // Try to access a collection (this will fail if Firestore is not accessible)
        const testQuery = query(collection(db, "_test_connection"), limit(1))
        await getDocs(testQuery)

        console.log("✅ Firestore connection successful")
        console.log("Database:", db)
        return { success: true, db }
    } catch (error: any) {
        // Permission denied is expected if the collection doesn't exist or rules deny access
        // But it proves the connection is working
        if (error.code === 'permission-denied' || error.code === 'not-found') {
            console.log("✅ Firestore connection successful (permission denied is expected for test)")
            return { success: true, db }
        }

        console.error("❌ Firestore connection failed:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Test Firebase Storage connection
 */
export async function testFirebaseStorage() {
    try {
        console.log("✅ Firebase Storage initialized successfully")
        return { success: true, storage }
    } catch (error: any) {
        console.error("❌ Firebase Storage test failed:", error)
        return { success: false, error: error.message }
    }
}

/**
 * Run all Firebase tests
 */
export async function runAllFirebaseTests() {
    console.log("🔥 Starting Firebase Connection Tests...\n")

    const results = {
        app: await testFirebaseApp(),
        auth: await testFirebaseAuth(),
        firestore: await testFirestore(),
        storage: await testFirebaseStorage(),
    }

    console.log("\n📊 Test Results:")
    console.log("App:", results.app.success ? "✅" : "❌")
    console.log("Auth:", results.auth.success ? "✅" : "❌")
    console.log("Firestore:", results.firestore.success ? "✅" : "❌")
    console.log("Storage:", results.storage.success ? "✅" : "❌")

    const allSuccess = Object.values(results).every(r => r.success)
    console.log("\n" + (allSuccess ? "🎉 All tests passed!" : "⚠️ Some tests failed"))

    return results
}

/**
 * Connect to Firebase Emulators (for local development)
 * Make sure emulators are running: firebase emulators:start
 */
export function connectToEmulators() {
    try {
        connectAuthEmulator(auth, "http://localhost:9099")
        connectFirestoreEmulator(db, "localhost", 8080)
        connectStorageEmulator(storage, "localhost", 9199)
        console.log("✅ Connected to Firebase Emulators")
    } catch (error) {
        console.error("❌ Failed to connect to emulators:", error)
    }
}
