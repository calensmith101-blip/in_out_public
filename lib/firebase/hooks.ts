'use client'

import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { auth, db, isFirebaseConfigured, jobSubPath, userCollectionPath } from '@/lib/firebase/client'

export function useFirebaseUser() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null)
      return
    }
    return onAuthStateChanged(auth, setUser)
  }, [])
  return user
}

export function useUserCollection<T = any>(collectionName: string, sortField = 'createdAt') {
  const user = useFirebaseUser()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return // still resolving auth
    if (!user || !db) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = collection(db, userCollectionPath(user.uid, collectionName))
    const q = query(ref, orderBy(sortField, 'desc'))
    return onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)))
      setLoading(false)
    }, (err) => {
      setError(err.message)
      setLoading(false)
    })
  }, [user, collectionName, sortField])

  return { user, data, loading, error }
}

/** Listen to a single job document */
export function useJob(jobId: string | undefined) {
  const user = useFirebaseUser()
  const [job, setJob] = useState<any>(null)
  // Start loading=true only while auth is still resolving (user===undefined) or we have a real jobId
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user === undefined) return // still resolving — keep loading=true
    if (!user || !db || !jobId) {
      // Resolved: no user or no jobId — nothing to load
      setJob(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = doc(db, userCollectionPath(user.uid, 'jobs'), jobId)
    return onSnapshot(ref, (snap) => {
      setJob(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setLoading(false)
    }, (_err) => {
      setJob(null)
      setLoading(false)
    })
  }, [user, jobId])

  return { user, job, loading }
}

/**
 * Listen to a sub-collection under a job: users/{uid}/jobs/{jobId}/{sub}
 * Returns loading=false immediately when auth resolves to no user, preventing infinite loading.
 */
export function useJobSubCollection<T = any>(
  jobId: string | undefined,
  subCollection: string,
  sortField = 'createdAt'
) {
  const user = useFirebaseUser()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return // still resolving
    if (!user || !db || !jobId) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ref = collection(db, jobSubPath(user.uid, jobId, subCollection))
    const q = query(ref, orderBy(sortField, 'desc'))
    return onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)))
      setLoading(false)
    }, (err) => {
      // Firestore permissions error (empty sub-collection) — treat as empty, not frozen
      setError(err.message)
      setData([])
      setLoading(false)
    })
  }, [user, jobId, subCollection, sortField])

  return { user, data, loading, error }
}

/** Listen to a workspace collection: users/{uid}/workspaces/{wsId}/{collectionName} */
export function useWorkspaceCollection<T = any>(
  wsId: string,
  collectionName: string,
  sortField = 'createdAt'
) {
  const user = useFirebaseUser()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return
    if (!user || !wsId || !collectionName) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    const ref = collection(db, `users/${user.uid}/workspaces/${wsId}/${collectionName}`)
    const q = query(ref, orderBy(sortField, 'desc'))

    return onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)))
      setLoading(false)
      setError(null)
    }, (err) => {
      console.error('useWorkspaceCollection error:', err)
      setError(err.message)
      setData([])
      setLoading(false)
    })
  }, [user, wsId, collectionName, sortField])

  return { user, data, loading, error }
}

/** Listen to a single workspace job document */
export function useWorkspaceJob(wsId: string, jobId: string | undefined) {
  const user = useFirebaseUser()
  const [job, setJob] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return
    if (!user || !db || !wsId || !jobId) {
      setJob(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const ref = doc(db, `users/${user.uid}/workspaces/${wsId}/jobs/${jobId}`)

    return onSnapshot(ref, (snap) => {
      setJob(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setLoading(false)
      setError(null)
    }, (err) => {
      console.error('useWorkspaceJob error:', err)
      setError(err.message)
      setJob(null)
      setLoading(false)
    })
  }, [user, wsId, jobId])

  return { user, job, loading, error }
}

/** Listen to a sub-collection under a workspace job */
export function useWorkspaceJobSub<T = any>(
  wsId: string,
  jobId: string | undefined,
  subCollection: string,
  sortField = 'createdAt'
) {
  const user = useFirebaseUser()
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user === undefined) return
    if (!user || !wsId || !jobId || !subCollection) {
      setData([])
      setLoading(false)
      return
    }

    setLoading(true)
    const ref = collection(db, `users/${user.uid}/workspaces/${wsId}/jobs/${jobId}/${subCollection}`)
    const q = query(ref, orderBy(sortField, 'desc'))

    return onSnapshot(q, (snap) => {
      setData(snap.docs.map(d => ({ id: d.id, ...d.data() } as T)))
      setLoading(false)
      setError(null)
    }, (err) => {
      console.error('useWorkspaceJobSub error:', err)
      setError(err.message)
      setData([])
      setLoading(false)
    })
  }, [user, wsId, jobId, subCollection, sortField])

  return { user, data, loading, error }
}

