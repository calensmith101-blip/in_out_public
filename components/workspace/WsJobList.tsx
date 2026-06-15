'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { deleteDoc, doc } from 'firebase/firestore'
import { Briefcase, Plus, Search, Trash2 } from 'lucide-react'
import { db } from '@/lib/firebase/client'
import { wsCollectionPath, getWorkspace, type WorkspaceId } from '@/lib/workspaces'
import { useWorkspaceCollection } from '@/lib/firebase/hooks'
import { formatCurrency } from '@/lib/finance'
import { cn, jobStatusLabel, priorityColor, statusColor } from '@/lib/utils'
import type { Job, JobStatus } from '@/types/app'

const STATUS_FILTERS: Array<{ value: JobStatus | 'all'; label: string }> = [
  { value: 'all',         label: 'All' },
  { value: 'lead',        label: 'Lead' },
  { value: 'quoted',      label: 'Quoted' },
  { value: 'approved',    label: 'Approved' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'invoiced',    label: 'Invoiced' },
  { value: 'paid',        label: 'Paid' },
  { value: 'complete',    label: 'Complete' },
  { value: 'cancelled',   label: 'Cancelled' },
]

export default function WsJobList({ wsId }: { wsId: WorkspaceId }) {
  const ws = getWorkspace(wsId)
  const { user, data: jobs, loading, error } = useWorkspaceCollection<Job>(wsId, 'jobs', 'createdAt')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<JobStatus | 'all'>('all')

  const filtered = useMemo(() => {
    let rows = jobs
    if (statusFilter !== 'all') rows = rows.filter(j => j.status === statusFilter)
    const needle = search.trim().toLowerCase()
    if (needle) rows = rows.filter(j => JSON.stringify(j).toLowerCase().includes(needle))
    return rows
  }, [jobs, search, statusFilter])

  async function remove(id: string) {
    if (!user) return
    if (!confirm('Delete this job? This cannot be undone.')) return
    await deleteDoc(doc(db, wsCollectionPath(user.uid, wsId, 'jobs'), id))
  }

  const basePath = `/${wsId}`

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className={cn('wj-badge mb-3', ws.bgColor, ws.borderColor, ws.textColor)}>
            {ws.label}
          </p>
          <h1 className="text-3xl font-black tracking-tight">Jobs</h1>
          <p className="mt-1 text-sm text-zinc-400">{ws.sublabel}</p>
        </div>
        <Link href={`${basePath}/jobs/new`} className="wj-btn-primary sm:self-center">
          <Plus className="h-4 w-4" /> New Job
        </Link>
      </div>

      {/* Summary pills */}
      {!loading && jobs.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-amber-200">
            {jobs.filter(j => j.status === 'in_progress').length} in progress
          </span>
          <span className="rounded-full border border-blue-400/20 bg-blue-400/10 px-3 py-1 text-blue-200">
            {jobs.filter(j => j.status === 'quoted').length} quoted
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-zinc-300">
            {jobs.length} total
          </span>
        </div>
      )}

      {/* Search + filter */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="wj-card-soft flex flex-1 items-center gap-3 p-3">
          <Search className="h-4 w-4 shrink-0 text-zinc-500" />
          <input
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-600"
            placeholder="Search jobs..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map(sf => (
            <button
              key={sf.value}
              onClick={() => setStatusFilter(sf.value)}
              className={cn(
                'rounded-xl border px-3 py-2 text-xs font-bold transition',
                statusFilter === sf.value
                  ? 'border-amber-400/40 bg-amber-400/15 text-amber-200'
                  : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
              )}
            >
              {sf.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

      {/* Desktop table */}
      <div className="wj-card overflow-hidden wj-desktop-table">
        <table className="wj-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Customer</th>
              <th>Status</th>
              <th>Priority</th>
              <th className="text-right">Quoted</th>
              <th className="text-right">Balance Due</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="text-zinc-500">Loading...</td></tr>}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-8 text-center">
                  <Briefcase className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
                  <p className="text-sm text-zinc-500">No jobs yet.</p>
                </td>
              </tr>
            )}
            {filtered.map(job => (
              <tr key={job.id}>
                <td>
                  <span className="font-semibold text-white">{job.jobTitle || '—'}</span>
                  {job.siteAddress && <span className="block text-xs text-zinc-500">{job.siteAddress}</span>}
                </td>
                <td>
                  <span>{job.customerName || '—'}</span>
                  {job.customerPhone && <span className="block text-xs text-zinc-500">{job.customerPhone}</span>}
                </td>
                <td>
                  <span className={cn('wj-badge', statusColor[job.status] ?? '')}>{jobStatusLabel[job.status] ?? job.status}</span>
                </td>
                <td>
                  <span className={cn('wj-badge capitalize', priorityColor[job.priority] ?? '')}>{job.priority ?? 'normal'}</span>
                </td>
                <td className="text-right">{job.totalQuoted ? formatCurrency(job.totalQuoted) : '—'}</td>
                <td className="text-right">
                  {job.balanceDue != null && job.balanceDue > 0
                    ? <span className="font-bold text-amber-300">{formatCurrency(job.balanceDue)}</span>
                    : '—'}
                </td>
                <td className="text-right">
                  <div className="inline-flex gap-2">
                    <Link className="wj-btn-ghost" href={`${basePath}/jobs/${job.id}`}>Open</Link>
                    <button className="wj-btn-ghost text-red-300 hover:bg-red-500/10" onClick={() => remove(job.id)}>
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
        {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading...</div>}
        {!loading && filtered.length === 0 && (
          <div className="wj-card p-6 text-center">
            <Briefcase className="mx-auto mb-2 h-8 w-8 text-zinc-600" />
            <p className="text-sm text-zinc-500">No jobs yet.</p>
          </div>
        )}
        {filtered.map(job => (
          <Link key={job.id} href={`${basePath}/jobs/${job.id}`} className="wj-card block p-4 transition hover:border-white/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-bold text-white">{job.jobTitle || 'Untitled job'}</h2>
                <p className="mt-1 text-sm text-zinc-400">{job.customerName || 'No customer'}</p>
                {job.siteAddress && <p className="mt-0.5 text-xs text-zinc-500">{job.siteAddress}</p>}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <span className={cn('wj-badge', statusColor[job.status] ?? '')}>{jobStatusLabel[job.status] ?? job.status}</span>
                {job.balanceDue != null && job.balanceDue > 0 && (
                  <span className="text-xs font-bold text-amber-300">Due {formatCurrency(job.balanceDue)}</span>
                )}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-xs text-zinc-500">
              <div><span className="block text-zinc-600">Quoted</span>{job.totalQuoted ? formatCurrency(job.totalQuoted) : '—'}</div>
              <div><span className="block text-zinc-600">Invoiced</span>{job.totalInvoiced ? formatCurrency(job.totalInvoiced) : '—'}</div>
              <div><span className="block text-zinc-600">Paid</span>{job.totalPaid ? formatCurrency(job.totalPaid) : '—'}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
