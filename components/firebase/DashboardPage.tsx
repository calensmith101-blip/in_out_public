'use client'

import Link from 'next/link'
import { ArrowRight, Banknote, Briefcase, CalendarClock, FileText, Receipt, Sparkles, TrendingUp, UserPlus } from 'lucide-react'
import { formatCurrency, currentFYRange, isInDateRange, thisMonthRange } from '@/lib/finance'
import { ATO_KM_RATE, DEFAULT_TAX_RATE } from '@/lib/appConfig'
import { useUserCollection } from '@/lib/firebase/hooks'

function sum(rows: any[], field: string, range?: {start: string, end: string}, dateField = 'date') {
  return rows.filter(r => !range || isInDateRange(r[dateField], range.start, range.end)).reduce((a, r) => a + Number(r[field] || 0), 0)
}

function Card({ title, value, sub, icon: Icon, tone = 'amber' }: { title: string, value: string, sub?: string, icon: any, tone?: 'amber'|'green'|'red'|'blue' }) {
  const tones = {
    amber: 'from-amber-500/20 to-orange-500/5 text-amber-300',
    green: 'from-green-500/20 to-emerald-500/5 text-green-300',
    red: 'from-red-500/20 to-rose-500/5 text-red-300',
    blue: 'from-blue-500/20 to-cyan-500/5 text-blue-300',
  }
  return (
    <div className="wj-card stat-card overflow-hidden p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-zinc-400">{title}</p>
          <p className="mt-2 text-2xl font-black tracking-tight">{value}</p>
          {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
        </div>
        <div className={`rounded-2xl bg-gradient-to-br p-3 ${tones[tone]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const payments = useUserCollection<any>('invoicePayments')
  const expenses = useUserCollection<any>('expenses')
  const materials = useUserCollection<any>('materials')
  const travel = useUserCollection<any>('travelLogs')
  const invoices = useUserCollection<any>('invoices')
  const leads = useUserCollection<any>('leads')
  const jobs = useUserCollection<any>('jobs')
  const month = thisMonthRange()
  const fy = currentFYRange()

  const paidMonth = sum(payments.data, 'amount', month, 'paymentDate')
  const expMonth = sum(expenses.data, 'amount', month, 'date') + sum(materials.data, 'totalCost', month, 'date') + sum(travel.data, 'parkingCost', month, 'date') + sum(travel.data, 'tollsCost', month, 'date')
  const kmMonth = sum(travel.data, 'distanceKm', month, 'date')
  const profitMonth = paidMonth - expMonth - (kmMonth * ATO_KM_RATE)
  const fyIncome = sum(payments.data, 'amount', fy, 'paymentDate')
  const fyExpenses = sum(expenses.data, 'amount', fy, 'date') + sum(materials.data, 'totalCost', fy, 'date') + (sum(travel.data, 'distanceKm', fy, 'date') * ATO_KM_RATE)
  const outstanding = invoices.data.reduce((a, inv) => a + Number(inv.balanceOwing ?? Math.max(0, Number(inv.total || 0) - Number(inv.amountPaid || 0))), 0)
  const openLeads = leads.data.filter(l => !['WON','LOST'].includes(l.status)).length
  const activeJobs = jobs.data.filter(j => j.status !== 'COMPLETED')

  return (
    <div className="space-y-6">
      <section className="wj-panel overflow-hidden p-5 sm:p-7">
        <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p className="wj-badge border-amber-400/20 bg-amber-400/10 text-amber-200">Firebase web app</p>
            <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">IN & OUT dashboard</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
              Job-centred workflow — create a job first, then attach quotes, invoices, materials and payments.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/jobs/new" className="wj-btn-primary"><Briefcase className="h-4 w-4" /> New Job</Link>
              <Link href="/ai-rough-quote" className="wj-btn-secondary"><Sparkles className="h-4 w-4" /> AI rough quote</Link>
              <Link href="/leads/new" className="wj-btn-secondary"><UserPlus className="h-4 w-4" /> New lead</Link>
            </div>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/30 p-5">
            <p className="text-sm font-semibold text-zinc-400">This month</p>
            <p className="mt-2 text-4xl font-black">{formatCurrency(profitMonth)}</p>
            <p className="mt-1 text-sm text-zinc-500">estimated profit after costs and KM allowance</p>
            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-zinc-500">Received</p><p className="font-bold text-green-300">{formatCurrency(paidMonth)}</p></div>
              <div className="rounded-2xl bg-white/[0.04] p-3"><p className="text-zinc-500">Open leads</p><p className="font-bold text-amber-300">{openLeads}</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card title="Paid this month" value={formatCurrency(paidMonth)} icon={Banknote} tone="green" />
        <Card title="Costs this month" value={formatCurrency(expMonth + kmMonth * ATO_KM_RATE)} sub={`${kmMonth.toFixed(1)} km included`} icon={TrendingUp} tone="red" />
        <Card title="Outstanding invoices" value={formatCurrency(outstanding)} icon={FileText} tone="amber" />
        <Card title="Open leads" value={String(openLeads)} icon={UserPlus} tone="blue" />
        <Card title={`FY ${fy.label} income`} value={formatCurrency(fyIncome)} icon={Banknote} tone="green" />
        <Card title={`FY ${fy.label} expenses`} value={formatCurrency(fyExpenses)} icon={Receipt} tone="red" />
        <Card title="Tax set aside est." value={formatCurrency(Math.max(0, (fyIncome - fyExpenses) * DEFAULT_TAX_RATE))} icon={TrendingUp} tone="amber" />
        <Card title="Active jobs" value={String(activeJobs.length)} icon={CalendarClock} tone="blue" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="wj-card p-5">
          <h2 className="text-lg font-bold">Quick actions</h2>
          <div className="mt-4 grid gap-2">
            {[
              ['/jobs/new', 'Create job'], ['/customers/new', 'Add customer'], ['/finance/new-expense', 'Add expense'], ['/travel/new', 'Log travel / KMs'], ['/materials/new', 'Add material']
            ].map(([href, label]) => <Link key={href} className="wj-btn-secondary justify-between" href={href}>{label}<ArrowRight className="h-4 w-4" /></Link>)}
          </div>
        </div>
        <div className="wj-card p-5">
          <h2 className="text-lg font-bold">Recent leads</h2>
          <div className="mt-3 divide-y divide-white/10">
            {leads.data.slice(0,5).length === 0 && <p className="py-3 text-sm text-zinc-500">No leads yet.</p>}
            {leads.data.slice(0,5).map(l => <Link href={`/leads/${l.id}`} key={l.id} className="block py-3 text-sm hover:text-amber-200"><span className="font-semibold">{l.customerName || 'Unnamed'}</span><br/><span className="text-zinc-500">{l.jobType || 'Lead'} — {l.status || 'NEW'}</span></Link>)}
          </div>
        </div>
        <div className="wj-card p-5">
          <h2 className="text-lg font-bold">Active jobs</h2>
          <div className="mt-3 divide-y divide-white/10">
            {activeJobs.slice(0,5).length === 0 && <p className="py-3 text-sm text-zinc-500">No active jobs yet.</p>}
            {activeJobs.slice(0,5).map(j => <Link href={`/jobs/${j.id}`} key={j.id} className="block py-3 text-sm hover:text-amber-200"><span className="font-semibold">{j.jobTitle || j.title}</span><br/><span className="text-zinc-500">{j.customerName || 'No customer'}</span></Link>)}
          </div>
        </div>
      </div>
    </div>
  )
}
