'use client'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import { deleteDoc, doc } from 'firebase/firestore'
import { Plus, Search, Trash2, Receipt, Edit2 } from 'lucide-react'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useFirebaseUser, useUserCollection } from '@/lib/firebase/hooks'
import { formatCurrency } from '@/lib/finance'
import { cn, statusColor } from '@/lib/utils'

export default function InvoicesPage() {
  const user = useFirebaseUser()
  const { data: invoices, loading, error } = useUserCollection<any>('invoices', 'invoiceDate')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  const filtered = useMemo(() => {
    let rows = invoices
    if (statusFilter !== 'all') rows = rows.filter(i => i.status === statusFilter)
    const needle = search.trim().toLowerCase()
    if (needle) rows = rows.filter(i => JSON.stringify(i).toLowerCase().includes(needle))
    return rows
  }, [invoices, statusFilter, search])

  const totalOwing = filtered.reduce((a, i) => a + Number(i.balanceOwing || 0), 0)
  const totalPaid = filtered.filter(i => i.status === 'PAID').reduce((a, i) => a + Number(i.total || 0), 0)

  async function remove(id: string) {
    if (!user || !confirm('Delete this invoice?')) return
    await deleteDoc(doc(db, userCollectionPath(user.uid, 'invoices'), id))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-zinc-400">Standalone invoices for your private account.</p>
        </div>
        <Link href="/invoices/new" className="wj-btn-primary sm:self-center"><Plus className="h-4 w-4" /> New Invoice</Link>
      </div>

      {!loading && invoices.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-red-400">Outstanding</p><p className="mt-1 text-xl font-black text-red-300">{formatCurrency(totalOwing)}</p></div>
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-3 text-center"><p className="text-[10px] font-bold uppercase tracking-wider text-green-600">Paid</p><p className="mt-1 text-xl font-black text-green-300">{formatCurrency(totalPaid)}</p></div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="wj-card-soft flex flex-1 items-center gap-3 p-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" placeholder="Search invoices…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all','DRAFT','SENT','PART_PAID','PAID','VOID'] as const).map(f => (
            <button key={f} onClick={() => setStatusFilter(f)} className={cn('rounded-xl border px-3 py-2 text-xs font-bold transition', statusFilter === f ? 'border-amber-400/40 bg-amber-400/15 text-amber-200' : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white')}>{f === 'all' ? 'All' : f.replace('_', ' ')}</button>
          ))}
        </div>

      </div>

      {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}
      {loading && <div className="wj-card p-6 text-center text-sm text-zinc-500">Loading invoices…</div>}
      {!loading && filtered.length === 0 && (
        <div className="wj-card p-8 text-center"><Receipt className="mx-auto mb-3 h-10 w-10 text-zinc-600" /><p className="font-semibold text-zinc-400">No invoices yet</p><Link href="/invoices/new" className="wj-btn-primary mt-4 inline-flex"><Plus className="h-4 w-4" /> New Invoice</Link></div>
      )}

      <div className="space-y-3">
        {filtered.map(inv => (
          <div key={inv.id} className="wj-card p-4 transition hover:border-white/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-bold text-amber-300">{inv.invoiceNumber || '—'}</span>
                  <span className={cn('wj-badge', statusColor[inv.status] ?? '')}>{inv.status?.replace('_',' ')}</span>
                  {inv.linkedJobNumber && <span className="text-[10px] text-zinc-500">Job: {inv.linkedJobNumber}</span>}
                </div>
                <p className="mt-1 font-bold">{inv.clientName || inv.customerName || '—'}</p>
                {inv.siteAddress && <p className="text-xs text-zinc-500">{inv.siteAddress}</p>}
                <div className="mt-1 flex flex-wrap gap-4 text-sm">
                  <span className="text-zinc-400">Total: <strong className="text-white">{formatCurrency(inv.total)}</strong></span>
                  {inv.balanceOwing > 0 && <span className="text-zinc-400">Owing: <strong className="text-red-300">{formatCurrency(inv.balanceOwing)}</strong></span>}
                  {inv.invoiceDate && <span className="text-xs text-zinc-500">{inv.invoiceDate}</span>}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <Link href={`/invoices/${inv.id}`} className="wj-btn-ghost p-2 text-zinc-400 hover:text-amber-300"><Edit2 className="h-3.5 w-3.5" /></Link>
                <button onClick={() => remove(inv.id)} className="wj-btn-ghost p-2 text-zinc-500 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
