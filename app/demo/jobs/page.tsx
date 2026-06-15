import Link from 'next/link'
import { ArrowLeft, CalendarDays, MapPin, Phone } from 'lucide-react'
import DemoNav from '@/components/demo/DemoNav'
import DemoStatusBadge from '@/components/demo/DemoStatusBadge'
import { demoJobs } from '@/lib/demoData'
import { formatCurrency } from '@/lib/finance'

export default function DemoJobsPage() {
  return (
    <main className="min-h-screen bg-wj-bg p-5 text-wj-text">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/demo" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-amber-300"><ArrowLeft className="h-4 w-4" /> Demo dashboard</Link>
          <h1 className="text-4xl font-black tracking-tight">Demo jobs</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Sample jobs page showing what customers can track after creating their own private account.</p>
        </div>
        <DemoNav />

        <div className="grid gap-4 lg:grid-cols-2">
          {demoJobs.map(job => (
            <article key={job.id} className="wj-card p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-sm font-bold text-amber-300">{job.jobNumber}</p>
                  <h2 className="mt-1 text-2xl font-black">{job.title}</h2>
                </div>
                <DemoStatusBadge status={job.status} />
              </div>
              <div className="mt-4 grid gap-2 text-sm text-zinc-300 sm:grid-cols-2">
                <p><strong className="text-zinc-100">Client:</strong> {job.clientName}</p>
                <p className="flex items-center gap-2"><Phone className="h-4 w-4 text-zinc-500" /> {job.phone}</p>
                <p className="flex items-center gap-2 sm:col-span-2"><MapPin className="h-4 w-4 text-zinc-500" /> {job.address}</p>
                <p className="flex items-center gap-2 sm:col-span-2"><CalendarDays className="h-4 w-4 text-zinc-500" /> {job.bookedFor}</p>
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <h3 className="font-black">Job description</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{job.description}</p>
                <h3 className="mt-4 font-black">Notes</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{job.notes}</p>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white/5 p-4">
                <p className="text-sm text-zinc-400">Labour: <strong className="text-zinc-100">{job.labourHours} hrs</strong></p>
                <p className="text-sm text-zinc-400">Materials: <strong className="text-zinc-100">{formatCurrency(job.materials)}</strong></p>
                <p className="text-lg font-black">Total: {formatCurrency(job.total)}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
