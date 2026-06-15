'use client'

import Link from 'next/link'
import { ArrowLeft, Briefcase, FileText, Plus, Receipt } from 'lucide-react'
import DemoNav from '@/components/demo/DemoNav'
import DemoStatusBadge from '@/components/demo/DemoStatusBadge'
import { demoInvoices, demoJobs, demoQuotes } from '@/lib/demoData'
import { formatCurrency } from '@/lib/finance'

function Card({ title, value, sub, icon: Icon }: { title: string; value: string; sub?: string; icon: any }) {
  return (
    <div className="wj-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <p className="mt-1 text-2xl font-black">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className="rounded-2xl bg-white/10 p-3 text-amber-300"><Icon className="h-5 w-5" /></div>
      </div>
    </div>
  )
}

export default function InOutDemoPage() {
  const outstanding = demoInvoices.reduce((a, inv) => a + Number(inv.balanceOwing || 0), 0)
  const quoted = demoQuotes.reduce((a, q) => a + Number(q.total || 0), 0)
  const booked = demoJobs.filter(job => job.status === 'BOOKED' || job.status === 'IN_PROGRESS').length

  return (
    <main className="min-h-screen bg-wj-bg p-5 text-wj-text">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link href="/login" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-amber-300"><ArrowLeft className="h-4 w-4" /> Back to login</Link>
            <h1 className="mt-3 text-4xl font-black tracking-tight">IN & OUT demo</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">A fuller fake-data preview of the jobs, invoices and quotes workflow. Real users get their own private account and private records.</p>
          </div>
          <Link href="/signup" className="wj-btn-primary justify-center">Create your own private account</Link>
        </div>

        <DemoNav />

        <div className="grid gap-4 sm:grid-cols-4">
          <Card title="Active jobs" value={String(booked)} sub="Booked or in progress" icon={Briefcase} />
          <Card title="Total jobs" value={String(demoJobs.length)} sub="Example schedule records" icon={Briefcase} />
          <Card title="Quoted value" value={formatCurrency(quoted)} sub="Sample quote totals" icon={FileText} />
          <Card title="Outstanding" value={formatCurrency(outstanding)} sub="Sample invoice balance" icon={Receipt} />
        </div>

        <section className="grid gap-4 lg:grid-cols-3">
          <Link href="/demo/jobs" className="wj-card block p-5 transition hover:-translate-y-0.5 hover:border-amber-300/40">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Jobs page</h2><Briefcase className="h-5 w-5 text-amber-300" /></div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Shows job cards, status, customer details, job notes and totals using sample records.</p>
          </Link>
          <Link href="/demo/invoices" className="wj-card block p-5 transition hover:-translate-y-0.5 hover:border-amber-300/40">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Invoices page</h2><Receipt className="h-5 w-5 text-amber-300" /></div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Shows invoice list and full sample invoice preview with line items and balance owing.</p>
          </Link>
          <Link href="/demo/quotes" className="wj-card block p-5 transition hover:-translate-y-0.5 hover:border-amber-300/40">
            <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-black">Quotes page</h2><FileText className="h-5 w-5 text-amber-300" /></div>
            <p className="mt-2 text-sm leading-6 text-zinc-400">Shows quote list, scope of works, line items and accepted/sent states.</p>
          </Link>
        </section>

        <section className="wj-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Recent demo activity</h2>
              <p className="mt-1 text-sm text-zinc-500">This is a preview only. The real app lets users create, edit, save and print records.</p>
            </div>
            <button className="wj-btn-secondary opacity-70" disabled><Plus className="h-4 w-4" /> Demo create button disabled</button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {demoJobs.slice(0, 3).map(job => (
              <div key={job.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start justify-between gap-3"><p className="font-mono text-sm font-bold text-amber-300">{job.jobNumber}</p><DemoStatusBadge status={job.status} /></div>
                <p className="mt-2 font-black">{job.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{job.clientName} · {job.suburb}</p>
                <p className="mt-3 font-black">{formatCurrency(job.total)}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
