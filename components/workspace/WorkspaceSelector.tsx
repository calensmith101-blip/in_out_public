'use client'

import Link from 'next/link'
import { Briefcase, DollarSign, Wrench, ArrowRight, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function WorkspaceSelector() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-4">
      <div>
        <p className="wj-badge mb-3 border-amber-400/20 bg-amber-400/10 text-amber-200">IN & OUT</p>
        <h1 className="text-3xl font-black tracking-tight">My Business</h1>
        <p className="mt-2 text-sm text-zinc-400">This public/customer build uses one private business workspace per signed-in user.</p>
      </div>

      <Link
        href="/my-business/jobs"
        className={cn(
          'wj-card group relative flex flex-col items-start gap-4 p-6 text-left transition-all hover:-translate-y-0.5',
          'bg-gradient-to-br from-red-600/20 to-amber-500/10 border-amber-400/60'
        )}
      >
        <CheckCircle2 className="absolute right-4 top-4 h-5 w-5 text-white/60" />
        <div className="rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 p-3 shadow-lg">
          <Wrench className="h-6 w-6 text-white" />
        </div>
        <div>
          <p className="text-lg font-black">My Business</p>
          <p className="mt-0.5 text-xs font-semibold text-zinc-400">Private user workspace</p>
          <p className="mt-2 text-sm text-zinc-400">Your own clients, jobs, quotes and invoices. Other users cannot see or edit this data.</p>
        </div>
        <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-white/60 group-hover:text-white">
          Open jobs <ArrowRight className="h-3 w-3" />
        </span>
      </Link>

      <Link
        href="/finance"
        className="wj-card flex items-center justify-between gap-4 border-green-400/20 bg-gradient-to-br from-green-600/10 to-emerald-500/5 p-5 transition-all hover:-translate-y-0.5"
      >
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-gradient-to-br from-green-600 to-emerald-500 p-3 shadow-lg">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <p className="text-lg font-black">Finance / Tax</p>
            <p className="text-xs text-zinc-400">Income, expenses and tax summary for your account</p>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-zinc-500" />
      </Link>
    </div>
  )
}
