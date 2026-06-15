'use client'

import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { auth, isFirebaseConfigured } from '@/lib/firebase/client'

export default function HomePage() {
  const router = useRouter()
  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      router.replace('/demo')
      return
    }
    return onAuthStateChanged(auth, user => router.replace(user ? '/dashboard' : '/login'))
  }, [router])
  return <div className="min-h-screen grid place-items-center text-wj-muted">Opening Work Journal...</div>
}
