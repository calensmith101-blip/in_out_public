'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { deleteDoc, doc } from 'firebase/firestore'
import { Plus, Search, Trash2, FileText, CheckCircle2, Clock, XCircle, Send, Edit2 } from 'lucide-react'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useFirebaseUser, useUserCollection } from '@/lib/firebase/hooks'
import { formatCurrency } from '@/lib/finance'
import { cn } from '@/lib/utils'

type QuoteStatus = 'DRAFT'|'SENT'|'ACCEPTED'|'DECLINED'
const STATUS_CONFIG: Record<QuoteStatus, { label: string; cls: string; icon: any }> = {
  DRAFT:    { label: 'Draft',    cls: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/30',    icon: Clock },
  SENT:     { label: 'Sent',     cls: 'bg-blue-500/15 text-blue-300 border-blue-500/25',    icon: Send },
  ACCEPTED: { label: 'Accepted', cls: 'bg-green-500/15 text-green-300 border-green-500/25', icon: CheckCircle2 },
  DECLINED: { label: 'Declined', cls: 'bg-red-500/15 text-red-300 border-red-500/25',       icon: XCircle },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as QuoteStatus] ?? STATUS_CONFIG.DRAFT
  return <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold', cfg.cls)}><cfg.icon className="h-3 w-3" />{cfg.label}</span>
}

export default function QuotesPage() {
  const router = useRouter()
  const user = useFirebaseUser()
  const { data: quotes, loading, error } = useUserCollection<any>('quotes', 'quoteDate')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'all'>('all')

  const filtered = useMemo(() => {
    let rows = quotes
    if (statusFilter !== 'all') rows = rows.filter(q => q.status === statusFilter)
    const needle = search.trim().toLowerCase()
    if (needle) rows = rows.filter(q => JSON.stringify(q).toLowerCase().includes(needle))
    return rows
  }, [quotes, statusFilter, search])

  const totalValue = filtered.reduce((a, q) => a + Number(q.total || 0), 0)
  const acceptedValue = filtered.filter(q => q.status === 'ACCEPTED').reduce((a, q) => a + Number(q.total || 0), 0)
  const pendingCount = filtered.filter(q => q.status === 'SENT').length

  async function remove(id: string) {
    if (!user || !confirm('Delete this quote?')) return
    await deleteDoc(doc(db, userCollectionPath(user.uid, 'quotes'), id))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Quotes</h1>
          <p className="mt-1 text-sm text-zinc-400">Standalone quotes. Job-linked quotes also live inside each job.</p>
        </div>
        <Link href="/quotes/new" className="wj-btn-primary sm:self-center"><Plus className="h-4 w-4" /> New Quote</Link>
      </div>

      {!loading && quotes.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Total value</p><p className="mt-1 text-lg font-black">{formatCurrency(totalValue)}</p></div>
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-green-600">Accepted</p><p className="mt-1 text-lg font-black text-green-300">{formatCurrency(acceptedValue)}</p></div>
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-blue-500">Awaiting</p><p className="mt-1 text-lg font-black text-blue-300">{pendingCount} sent</p></div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="wj-card-soft flex flex-1 items-center gap-3 p-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" placeholder="Search quotes…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all','DRAFT','SENT','ACCEPTED','DECLINED'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f as any)} className={cn('rounded-xl border px-3 py-2 text-xs font-bold transition', statusFilter === f ? 'border-amber-400/40 bg-amber-400/15 text-amber-200' : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white')}>{f === 'all' ? 'All' : f}</button>
          ))}
        </div>

      </div>

      {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {loading && <div className="wj-card p-6 text-center text-sm text-zinc-500">Loading quotes…</div>}
      {!loading && filtered.length === 0 && (
        <div className="wj-card p-8 text-center"><FileText className="mx-auto mb-3 h-10 w-10 text-zinc-600" /><p className="font-semibold text-zinc-400">No quotes yet</p><Link href="/quotes/new" className="wj-btn-primary mt-4 inline-flex"><Plus className="h-4 w-4" /> New Quote</Link></div>
      )}

      <div className="space-y-3">
        {filtered.map(q => (
          <div key={q.id} className="wj-card p-4 transition hover:border-white/20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {q.quoteNumber && <span className="font-mono text-xs font-bold text-amber-300">{q.quoteNumber}</span>}
                  <StatusBadge status={q.status} />
                  {q.linkedJobNumber && <span className="text-[10px] text-zinc-500">Job: {q.linkedJobNumber}</span>}
                </div>
                <h3 className="mt-1.5 font-bold">{q.clientName || q.customerName || 'No client'}</h3>
                {q.jobTitle && <p className="text-sm text-zinc-400">{q.jobTitle}</p>}
                {q.siteAddress && <p className="text-xs text-zinc-500">{q.siteAddress}</p>}
                {q.scopeOfWorks && <p className="mt-1 line-clamp-2 text-sm text-zinc-400">{q.scopeOfWorks}</p>}
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-500">
                  {q.quoteDate && <span>{q.quoteDate}</span>}
                  {q.validUntil && <span>Valid until {q.validUntil}</span>}
                </div>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className="text-xl font-black">{formatCurrency(q.total)}</span>
                <div className="flex gap-1">
                  <Link href={`/quotes/${q.id}`} className="wj-btn-ghost p-2 text-zinc-400 hover:text-amber-300"><Edit2 className="h-3.5 w-3.5" /></Link>
                  <button onClick={() => remove(q.id)} className="wj-btn-ghost p-2 text-zinc-500 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
