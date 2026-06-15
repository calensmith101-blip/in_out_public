'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { Plus, Search, Trash2 } from 'lucide-react'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useUserCollection } from '@/lib/firebase/hooks'
import { useWorkspace } from '@/lib/WorkspaceContext'
import { cn } from '@/lib/utils'
import type { FieldConfig } from '@/types/app'

interface RecordListProps {
  collection: string
  singular: string
  label: string
  newHref: string
  editHref: (id: string) => string
  /** Fields to show as columns in the table / cards */
  displayFields: FieldConfig[]
  sortField?: string
  /** If true, filter by current workspaceId. If 'all', show all. */
  wsFilter?: boolean
  /** Badge field name to highlight */
  badgeField?: string
  /** Format a field value for display */
  formatValue?: (field: string, value: any) => string
  emptyMessage?: string
}

export default function RecordList({
  collection: col, singular, label, newHref, editHref,
  displayFields, sortField = 'date', wsFilter = true,
  badgeField, formatValue, emptyMessage,
}: RecordListProps) {
  const { user, data: all, loading, error } = useUserCollection<any>(col, sortField)
  const { wsId } = useWorkspace()
  const [search, setSearch] = useState('')

  const rows = useMemo(() => {
    let data = wsFilter ? all.filter(r => !r.workspaceId || r.workspaceId === wsId) : all
    const needle = search.trim().toLowerCase()
    if (needle) data = data.filter(r => JSON.stringify(r).toLowerCase().includes(needle))
    return data
  }, [all, wsId, search, wsFilter])

  async function remove(id: string) {
    if (!user || !confirm(`Delete this ${singular.toLowerCase()}?`)) return
    await deleteDoc(doc(db, userCollectionPath(user.uid, col), id))
  }

  function display(field: string, value: any) {
    if (formatValue) return formatValue(field, value)
    if (value === true) return '✓'
    if (value === false) return '—'
    if (value == null || value === '') return '—'
    return String(value)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">{label}</h1>
          <p className="mt-1 text-sm text-zinc-400">{all.length} records total</p>
        </div>
        <Link href={newHref} className="wj-btn-primary sm:self-center">
          <Plus className="h-4 w-4" /> New {singular}
        </Link>
      </div>

      {/* Search + workspace filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="wj-card-soft flex flex-1 items-center gap-3 p-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            placeholder={`Search ${label.toLowerCase()}…`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

      </div>

      {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {/* Desktop table */}
      <div className="wj-card overflow-hidden wj-desktop-table">
        <table className="wj-table">
          <thead>
            <tr>
              {displayFields.map(f => <th key={f.name}>{f.label}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={displayFields.length + 1} className="text-zinc-500">Loading…</td></tr>}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={displayFields.length + 1} className="py-8 text-center text-sm text-zinc-500">
                  {emptyMessage ?? `No ${label.toLowerCase()} yet.`}
                </td>
              </tr>
            )}
            {rows.map(row => (
              <tr key={row.id}>
                {displayFields.map(f => (
                  <td key={f.name}>
                    {f.name === badgeField
                      ? <span className="wj-badge">{display(f.name, row[f.name])}</span>
                      : display(f.name, row[f.name])}
                  </td>
                ))}
                <td className="text-right">
                  <div className="inline-flex gap-2">
                    <Link href={editHref(row.id)} className="wj-btn-ghost">Edit</Link>
                    <button onClick={() => remove(row.id)} className="wj-btn-ghost text-red-300 hover:bg-red-500/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="wj-mobile-list space-y-3">
        {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading…</div>}
        {!loading && rows.length === 0 && (
          <div className="wj-card p-6 text-center text-sm text-zinc-500">
            {emptyMessage ?? `No ${label.toLowerCase()} yet.`}
          </div>
        )}
        {rows.map(row => (
          <div key={row.id} className="wj-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1 space-y-1">
                {displayFields.slice(0, 4).map(f => (
                  <div key={f.name} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-zinc-500">{f.label}:</span>
                    <span className="truncate text-zinc-200">{display(f.name, row[f.name])}</span>
                  </div>
                ))}
              </div>
              <div className="flex shrink-0 gap-1">
                <Link href={editHref(row.id)} className="wj-btn-ghost p-2 text-xs">Edit</Link>
                <button onClick={() => remove(row.id)} className="wj-btn-ghost p-2 text-red-300">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
