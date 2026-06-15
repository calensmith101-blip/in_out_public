import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '',
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId &&
  !firebaseConfig.apiKey.includes('your_') &&
  !firebaseConfig.apiKey.includes('placeholder')
)

function initFirebaseApp(): FirebaseApp | null {
  if (!isFirebaseConfigured) return null
  // During Next.js static build/prerender, do not initialise Firebase Auth on the server.
  // The browser bundle will initialise it after deployment when NEXT_PUBLIC_FIREBASE_* is valid.
  if (typeof window === 'undefined') return null
  return getApps().length ? getApp() : initializeApp(firebaseConfig)
}

const app = initFirebaseApp()

export const firebaseApp = app as unknown as FirebaseApp
export const auth = (app ? getAuth(app) : null) as unknown as Auth
export const db = (app ? getFirestore(app) : null) as unknown as Firestore
export const storage = (app ? getStorage(app) : null) as unknown as FirebaseStorage

export function requireFirebaseService<T>(service: T | null, name = 'Firebase') : T {
  if (!isFirebaseConfigured || !service) {
    throw new Error(`${name} is not configured for this deployment. Add the NEXT_PUBLIC_FIREBASE_* environment variables in Vercel, then redeploy.`)
  }
  return service
}

/** users/{uid}/{collection} */
export function userCollectionPath(uid: string, collectionName: string) {
  return `users/${uid}/${collectionName}`
}

/** users/{uid}/jobs/{jobId}/{subCollection} */
export function jobSubPath(uid: string, jobId: string, subCollection: string) {
  return `users/${uid}/jobs/${jobId}/${subCollection}`
}
