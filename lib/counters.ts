/**
 * Auto-incrementing document counters using Firestore transactions.
 * Path: users/{uid}/workspaces/{wsId}/counters/{type}
 * Counter doc: { current: number }
 * 
 * Starting numbers: Jobs J-1001, Quotes Q-1001, Invoices INV-1001
 */
import { db } from '@/lib/firebase/client'
import {
  doc, getDoc, runTransaction,
} from 'firebase/firestore'

const START = 1000

function withTimeout<T>(promise: Promise<T>, ms = 5000, message = 'Firebase counter timed out'): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])
}

function fallbackNumber(wsId: string, type: 'job' | 'quote' | 'invoice') {
  const suffix = Date.now().toString().slice(-5)
  const pre = PREFIX[wsId]?.[type] ?? type.toUpperCase()
  return `${pre}-${suffix}`
}

function counterPath(uid: string, wsId: string, type: 'job' | 'quote' | 'invoice') {
  return `users/${uid}/workspaces/${wsId}/counters/${type}`
}

const PREFIX: Record<string, Record<string, string>> = {
  'my-business': { job: 'J', quote: 'Q', invoice: 'INV' },
}

function makeNumber(wsId: string, type: 'job' | 'quote' | 'invoice', n: number): string {
  const pre = PREFIX[wsId]?.[type] ?? type.toUpperCase()
  return `${pre}-${n}`
}

/**
 * Atomically increment and return the next formatted number for a workspace + type.
 * Uses a Firestore transaction to prevent duplicates even with concurrent writes.
 */
export async function nextNumber(
  uid: string,
  wsId: string,
  type: 'job' | 'quote' | 'invoice'
): Promise<string> {
  const ref = doc(db, counterPath(uid, wsId, type))

  const next = await withTimeout(runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    const current = snap.exists() ? Number(snap.data().current ?? START) : START
    const next = current + 1
    tx.set(ref, { current: next, updatedAt: new Date().toISOString() })
    return next
  }), 7000, 'Could not reserve the next number online')

  return makeNumber(wsId, type, Number(next))
}

/**
 * Peek at what the NEXT number will be (without incrementing).
 * Used for previewing before creation.
 */
export async function peekNextNumber(
  uid: string,
  wsId: string,
  type: 'job' | 'quote' | 'invoice'
): Promise<string> {
  const ref = doc(db, counterPath(uid, wsId, type))
  try {
    const snap: any = await withTimeout(getDoc(ref), 3000, 'Counter preview timed out')
    const current = snap.exists() ? Number(snap.data().current ?? START) : START
    return makeNumber(wsId, type, current + 1)
  } catch {
    return fallbackNumber(wsId, type)
  }
}
