'use client'

import Link from 'next/link'
import { deleteDoc, doc } from 'firebase/firestore'
import { Edit, Plus, Search, Trash2 } from 'lucide-react'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useUserCollection } from '@/lib/firebase/hooks'
import type { CollectionConfig } from '@/types/app'
import { formatCurrency } from '@/lib/finance'
import { useMemo, useState } from 'react'

function pretty(value: any) {
  if (value === undefined || value === null || value === '') return '—'
  if (typeof value === 'number') return value > 99 || String(value).includes('.') ? formatCurrency(value) : String(value)
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function statusTone(value: any) {
  const status = String(value || '').toUpperCase()
  if (['PAID', 'COMPLETED', 'WON', 'ACCEPTED', 'BOOKED'].includes(status)) return 'border-green-400/20 bg-green-400/10 text-green-300'
  if (['PART_PAID', 'SENT', 'AWAITING_DETAILS', 'QUOTE_BOOKED', 'QUOTE_SENT', 'ACTIVE', 'REQUESTED'].includes(status)) return 'border-amber-400/20 bg-amber-400/10 text-amber-200'
  if (['VOID', 'CANCELLED', 'LOST', 'DECLINED'].includes(status)) return 'border-red-400/20 bg-red-400/10 text-red-300'
  return 'border-white/10 bg-white/[0.06] text-zinc-300'
}

export default function CrudList({ config }: { config: CollectionConfig }) {
  const { user, data, loading, error } = useUserCollection<any>(config.collection)
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return data
    return data.filter(row => JSON.stringify(row).toLowerCase().includes(needle))
  }, [data, search])

  async function remove(id: string) {
    if (!user) return
    if (!confirm(`Delete this ${config.singular.toLowerCase()}? This cannot be undone.`)) return
    await deleteDoc(doc(db, userCollectionPath(user.uid, config.collection), id))
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="wj-badge mb-3">{config.collection}</p>
          <h1 className="text-3xl font-black tracking-tight">{config.label}</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-400">{config.description || `Create, edit and manage ${config.label.toLowerCase()}.`}</p>
        </div>
        <Link href={`${config.path}/new`} className="wj-btn-primary sm:self-center">
          <Plus className="h-4 w-4" /> New {config.singular}
        </Link>
      </div>

      <div className="wj-card-soft flex items-center gap-3 p-3">
        <Search className="h-4 w-4 text-zinc-500" />
        <input className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600" placeholder={`Search ${config.label.toLowerCase()}...`} value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      <div className="wj-card overflow-hidden wj-desktop-table">
        <table className="wj-table">
          <thead>
            <tr>
              {config.listFields.map(f => <th key={f}>{f.replace(/([A-Z])/g, ' $1')}</th>)}
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td className="text-zinc-500" colSpan={config.listFields.length + 1}>Loading...</td></tr>}
            {!loading && rows.length === 0 && <tr><td className="text-zinc-500" colSpan={config.listFields.length + 1}>No records yet.</td></tr>}
            {rows.map(row => <tr key={row.id}>
              {config.listFields.map(f => {
                const isStatus = f.toLowerCase().includes('status')
                return <td key={f}>{isStatus ? <span className={`wj-badge ${statusTone(row[f])}`}>{pretty(row[f])}</span> : pretty(row[f])}</td>
              })}
              <td className="text-right">
                <div className="inline-flex gap-2">
                  <Link className="wj-btn-ghost" href={`${config.path}/${row.id}`}><Edit className="h-4 w-4" /> Edit</Link>
                  <button className="wj-btn-ghost text-red-300 hover:bg-red-500/10 hover:text-red-200" onClick={() => remove(row.id)}><Trash2 className="h-4 w-4" /></button>
                </div>
              </td>
            </tr>)}
          </tbody>
        </table>
      </div>

      <div className="wj-mobile-list space-y-3">
        {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading...</div>}
        {!loading && rows.length === 0 && <div className="wj-card p-4 text-sm text-zinc-500">No records yet.</div>}
        {rows.map(row => {
          const titleField = config.listFields[0]
          const statusField = config.listFields.find(f => f.toLowerCase().includes('status'))
          return (
            <article key={row.id} className="wj-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-bold">{pretty(row[titleField])}</h2>
                  <div className="mt-2 space-y-1 text-sm text-zinc-400">
                    {config.listFields.slice(1, 4).map(f => !row[f] ? null : <p key={f}><span className="text-zinc-600">{f.replace(/([A-Z])/g, ' $1')}: </span>{pretty(row[f])}</p>)}
                  </div>
                </div>
                {statusField && <span className={`wj-badge shrink-0 ${statusTone(row[statusField])}`}>{pretty(row[statusField])}</span>}
              </div>
              <div className="mt-4 flex gap-2">
                <Link className="wj-btn-secondary flex-1" href={`${config.path}/${row.id}`}><Edit className="h-4 w-4" /> Edit</Link>
                <button className="wj-btn-ghost text-red-300" onClick={() => remove(row.id)}><Trash2 className="h-4 w-4" /></button>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
