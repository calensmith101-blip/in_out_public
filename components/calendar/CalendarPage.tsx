'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CalendarDays, Plus, Briefcase, MapPin } from 'lucide-react'
import { useUserCollection } from '@/lib/firebase/hooks'
import { cn } from '@/lib/utils'

type Appointment = {
  id: string
  title?: string
  customerName?: string
  startTime?: string
  endTime?: string
  status?: string
  address?: string
  notes?: string
  jobId?: string
  jobNumber?: string
  workspaceId?: string
}

function dateKey(value?: string) {
  if (!value) return 'No date'
  return String(value).slice(0, 10)
}

function niceTime(value?: string) {
  if (!value || !value.includes('T')) return ''
  return value.slice(11, 16)
}

export default function CalendarPage() {
  const { data, loading, error } = useUserCollection<Appointment>('appointments', 'startTime')
  const [filter, setFilter] = useState('upcoming')
  const today = new Date().toISOString().slice(0, 10)

  const grouped = useMemo(() => {
    const rows = data
      .filter(a => filter === 'all' || dateKey(a.startTime) >= today || dateKey(a.startTime) === 'No date')
      .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
    return rows.reduce<Record<string, Appointment[]>>((acc, item) => {
      const key = dateKey(item.startTime)
      acc[key] ||= []
      acc[key].push(item)
      return acc
    }, {})
  }, [data, filter, today])

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="wj-badge mb-3 border-blue-400/30 bg-blue-400/10 text-blue-300">Schedule</p>
          <h1 className="text-3xl font-black tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-zinc-400">Jobs saved with dates can appear here automatically. You can also add/edit appointments manually.</p>
        </div>
        <Link href="/appointments/new" className="wj-btn-primary"><Plus className="h-4 w-4" /> New Event</Link>
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-black/30 p-1">
        <button onClick={() => setFilter('upcoming')} className={cn('flex-1 rounded-lg py-2 text-xs font-bold', filter === 'upcoming' ? 'bg-blue-600 text-white' : 'text-zinc-400')}>Upcoming</button>
        <button onClick={() => setFilter('all')} className={cn('flex-1 rounded-lg py-2 text-xs font-bold', filter === 'all' ? 'bg-blue-600 text-white' : 'text-zinc-400')}>All</button>
      </div>

      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>}
      {loading && <div className="wj-card p-4 text-sm text-zinc-500">Loading calendar…</div>}
      {!loading && Object.keys(grouped).length === 0 && <div className="wj-card p-8 text-center text-sm text-zinc-500"><CalendarDays className="mx-auto mb-2 h-8 w-8" />No scheduled events yet.</div>}

      {Object.entries(grouped).map(([day, items]) => (
        <section key={day} className="wj-card overflow-hidden">
          <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
            <h2 className="font-black text-white">{day}</h2>
          </div>
          <div className="divide-y divide-white/10">
            {items.map(item => (
              <Link href={`/appointments/${item.id}`} key={item.id} className="block p-4 hover:bg-white/[0.03]">
                <div className="flex items-start gap-3">
                  <div className="w-14 shrink-0 rounded-xl border border-blue-400/20 bg-blue-400/10 px-2 py-2 text-center text-xs font-black text-blue-300">{niceTime(item.startTime) || 'Any'}</div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white">{item.title || 'Untitled event'}</p>
                    <p className="mt-0.5 text-sm text-zinc-400">{item.customerName || item.status || ''}</p>
                    {item.address && <p className="mt-1 flex items-center gap-1 text-xs text-zinc-500"><MapPin className="h-3 w-3" />{item.address}</p>}
                    {item.jobNumber && <p className="mt-1 flex items-center gap-1 text-xs text-amber-300"><Briefcase className="h-3 w-3" />{item.jobNumber}</p>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
