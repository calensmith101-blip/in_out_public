import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentReference,
} from 'firebase/firestore'
import { db, userCollectionPath } from '@/lib/firebase/client'

function delay(ms: number) {
  return new Promise<'timeout'>(resolve => setTimeout(() => resolve('timeout'), ms))
}

export function withTimeout<T>(promise: Promise<T>, ms = 4500): Promise<T | 'timeout'> {
  return Promise.race([promise, delay(ms)])
}

function getLocalCounterKey(counterName: string) {
  return `tradieday_counter_${counterName}_v2`
}

export function getNextLocalNumber(counterName: string, prefix: string, fallbackStart = 1001) {
  if (typeof window === 'undefined') return `${prefix}-${Date.now().toString().slice(-6)}`
  const key = getLocalCounterKey(counterName)
  const current = Number(window.localStorage.getItem(key) || fallbackStart)
  window.localStorage.setItem(key, String(current + 1))
  return `${prefix}-${current}`
}

export function peekNextLocalNumber(counterName: string, prefix: string, fallbackStart = 1001) {
  if (typeof window === 'undefined') return `${prefix}-${fallbackStart}`
  const key = getLocalCounterKey(counterName)
  return `${prefix}-${Number(window.localStorage.getItem(key) || fallbackStart)}`
}

export function newUserDocRef(uid: string, collectionName: string): DocumentReference {
  return doc(collection(db, userCollectionPath(uid, collectionName)))
}

export function safeId(value: string) {
  return String(value || '').trim().replace(/[^a-zA-Z0-9_-]/g, '_') || `doc_${Date.now()}`
}

export async function safeCreateUserDoc(uid: string, collectionName: string, payload: Record<string, any>, timeoutMs = 2500) {
  const ref = newUserDocRef(uid, collectionName)
  const write = setDoc(ref, { ...payload, createdAt: serverTimestamp(), updatedAt: serverTimestamp() })
  const result = await withTimeout(write, timeoutMs)
  return { id: ref.id, timedOut: result === 'timeout' }
}

export async function safeSetUserDoc(uid: string, collectionName: string, id: string, payload: Record<string, any>, timeoutMs = 2500) {
  const ref = doc(db, userCollectionPath(uid, collectionName), safeId(id))
  const write = setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true })
  const result = await withTimeout(write, timeoutMs)
  return { id: ref.id, timedOut: result === 'timeout' }
}

export async function safeUpdateUserDoc(uid: string, collectionName: string, id: string, payload: Record<string, any>, timeoutMs = 2500) {
  const ref = doc(db, userCollectionPath(uid, collectionName), id)
  const write = updateDoc(ref, { ...payload, updatedAt: serverTimestamp() })
  const result = await withTimeout(write, timeoutMs)
  return { id, timedOut: result === 'timeout' }
}

/**
 * User-level counter: users/{uid}/counters/{counterName}
 * Atomic when Firebase is online; timestamp fallback when offline.
 */
export async function getNextSimpleNumber(uid: string, counterName: string, prefix: string, fallbackStart = 1001) {
  const localFallback = typeof window !== 'undefined' ? getNextLocalNumber(counterName, prefix, fallbackStart) : `${prefix}-${Date.now().toString().slice(-6)}`
  const ref = doc(db, userCollectionPath(uid, 'counters'), counterName)
  try {
    const result = await withTimeout(runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      const next = snap.exists() ? Number((snap.data() as any).next || fallbackStart) : fallbackStart
      tx.set(ref, { next: next + 1, prefix, updatedAt: serverTimestamp() }, { merge: true })
      return `${prefix}-${next}`
    }), 1200)
    if (result !== 'timeout') return result
  } catch (err) {
    console.warn('Counter transaction failed, using fallback number', err)
  }
  return localFallback
}

/**
 * Workspace counter: users/{uid}/workspaces/{workspaceId}/counters/{counterName}
 */
export async function getNextWorkspaceNumber(uid: string, workspaceId: string, counterName: string, prefix: string, fallbackStart = 1001) {
  const localFallback = typeof window !== 'undefined' ? getNextLocalNumber(`${workspaceId}_${counterName}`, prefix, fallbackStart) : `${prefix}-${Date.now().toString().slice(-6)}`
  const ref = doc(db, 'users', uid, 'workspaces', workspaceId, 'counters', counterName)
  try {
    const result = await withTimeout(runTransaction(db, async tx => {
      const snap = await tx.get(ref)
      const next = snap.exists() ? Number((snap.data() as any).next || fallbackStart) : fallbackStart
      tx.set(ref, { next: next + 1, prefix, updatedAt: serverTimestamp() }, { merge: true })
      return `${prefix}-${next}`
    }), 1200)
    if (result !== 'timeout') return result
  } catch (err) {
    console.warn('Workspace counter transaction failed, using fallback number', err)
  }
  return localFallback
}

export async function safeSetWorkspaceDoc(uid: string, workspaceId: string, collectionName: string, id: string, payload: Record<string, any>, timeoutMs = 2500) {
  const ref = doc(db, 'users', uid, 'workspaces', workspaceId, collectionName, safeId(id))
  const write = setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true })
  const result = await withTimeout(write, timeoutMs)
  return { id: ref.id, timedOut: result === 'timeout' }
}

export async function getWorkspaceDoc(uid: string, workspaceId: string, collectionName: string, id: string, timeoutMs = 2000) {
  const ref = doc(db, 'users', uid, 'workspaces', workspaceId, collectionName, safeId(id))
  const result = await withTimeout(getDoc(ref), timeoutMs)
  return result === 'timeout' ? null : result
}
