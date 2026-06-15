'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { Wrench } from 'lucide-react'
import { auth, db, isFirebaseConfigured, userCollectionPath } from '@/lib/firebase/client'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState('')
  async function submit(e: React.FormEvent){ e.preventDefault(); setError(''); if (!isFirebaseConfigured || !auth || !db) { setError('Firebase is not configured on this deployment yet. Add the NEXT_PUBLIC_FIREBASE_* variables in Vercel, then redeploy. Demo mode still works without Firebase.'); return } try { const cred = await createUserWithEmailAndPassword(auth, email, password); await setDoc(doc(db, userCollectionPath(cred.user.uid, 'settings'), 'business'), { businessName, email, hourlyRate: 70, taxSetAsidePercent: 25, atoKmRate: 0.88, createdAt: serverTimestamp() }); router.push('/dashboard') } catch(err:any){ setError(err.message) } }
  return (
    <main className="min-h-screen grid place-items-center p-5">
      <form onSubmit={submit} className="wj-panel w-full max-w-md p-6 sm:p-8 space-y-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-amber-500"><Wrench className="h-6 w-6" /></div>
          <div><h1 className="text-2xl font-black">Create account</h1><p className="text-sm text-zinc-500">Set up your private IN & OUT account.</p></div>
        </div>
        {!isFirebaseConfigured && <p className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-amber-100">Account creation is not active yet because Firebase env vars are missing or wrong in Vercel. Use demo mode for now, then add the real Firebase values in Vercel Settings → Environment Variables.</p>}
        {error && <p className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-sm text-red-200">{error}</p>}
        <label><span className="wj-label">Business name</span><input className="wj-input" value={businessName} onChange={e=>setBusinessName(e.target.value)} /></label>
        <label><span className="wj-label">Email</span><input className="wj-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label><span className="wj-label">Password</span><input className="wj-input" type="password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} /></label>
        <button className="wj-btn-primary w-full">Sign up</button>
        <p className="text-center text-sm text-zinc-500">Already have one? <Link className="font-bold text-amber-300 hover:text-amber-200" href="/login">Log in</Link></p>
        <p className="text-center text-sm text-zinc-500"><Link className="font-bold text-blue-300 hover:text-blue-200" href="/demo">Try demo mode</Link></p>
      </form>
    </main>
  )
}
