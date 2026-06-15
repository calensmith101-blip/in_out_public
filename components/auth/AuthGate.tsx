'use client'

import { ReactNode, useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth, isFirebaseConfigured } from '@/lib/firebase/client'

export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      setUser(null)
      router.replace('/login')
      return
    }
    return onAuthStateChanged(auth, (current) => {
      setUser(current)
      if (!current) router.replace('/login')
    })
  }, [router])

  if (user === undefined) {
    return <div className="min-h-screen grid place-items-center text-wj-muted">Loading Work Journal...</div>
  }

  if (!user) return null
  return <>{children}</>
}
