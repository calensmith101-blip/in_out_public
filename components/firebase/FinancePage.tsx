'use client'

import Link from 'next/link'
import { formatCurrency, currentFYRange, isInDateRange, thisMonthRange } from '@/lib/finance'
import { ATO_KM_RATE } from '@/lib/appConfig'
import { useUserCollection } from '@/lib/firebase/hooks'

function workspaceOf(row: any): 'my-business' {
  return 'my-business'
}

function sum(rows: any[], field: string, range?: {start:string,end:string}, dateField='date') {
  return rows.filter(r => !range || isInDateRange(r[dateField], range.start, range.end)).reduce((a, r) => a + Number(r[field] || 0), 0)
}

function rowDate(row: any, fallback = '') {
  return String(row.paymentDate || row.invoiceDate || row.date || row.datePurchased || row.updatedAtText || fallback || '').slice(0, 10)
}

export default function FinancePage({ taxMode = false }: { taxMode?: boolean }) {
  const payments = useUserCollection<any>('invoicePayments')
  const expenses = useUserCollection<any>('expenses')
  const materials = useUserCollection<any>('materials')
  const tools = useUserCollection<any>('toolEntries')
  const travel = useUserCollection<any>('travelLogs')
  const vehicleEntries = useUserCollection<any>('vehicleEntries')
  const invoices = useUserCollection<any>('invoices')
  const range = taxMode ? currentFYRange() : thisMonthRange()

  const paidInvoiceIds = new Set(payments.data.map(p => p.invoiceId).filter(Boolean))
  const paymentIncomeRows = payments.data.map(p => ({
    type: 'Income', workspaceId: workspaceOf(p), date: rowDate(p), desc: `Invoice payment ${p.invoiceNumber || ''} ${p.customerName || ''}`, amount: Number(p.amount || 0), source: 'payment',
  }))

  const invoiceIncomeRows = invoices.data
    .filter(inv => Number(inv.amountPaid || 0) > 0 && !paidInvoiceIds.has(inv.id))
    .map(inv => ({
      type: 'Income', workspaceId: workspaceOf(inv), date: rowDate(inv), desc: `Invoice paid ${inv.invoiceNumber || ''} ${inv.clientName || inv.customerName || ''}`, amount: Number(inv.amountPaid || 0), source: 'invoice',
    }))

  const expenseRows = expenses.data.map(e => ({ type: 'Expense', workspaceId: workspaceOf(e), date: rowDate(e), desc: e.description, amount: -Number(e.amount || 0), source: 'expense' }))
  const materialRows = materials.data.map(m => ({ type: 'Material', workspaceId: workspaceOf(m), date: rowDate(m), desc: m.description || m.name, amount: -Number(m.totalCost ?? m.cost ?? 0), source: 'material' }))
  const toolRows = tools.data.map(t => ({ type: 'Tool', workspaceId: workspaceOf(t), date: rowDate(t), desc: t.name || t.description || 'Tool / equipment', amount: -Number(t.cost || 0), source: 'tool' }))
  const travelRows = travel.data.map(t => ({ type: 'Travel', workspaceId: workspaceOf(t), date: rowDate(t), desc: `${t.fromLocation || ''} → ${t.toLocation || ''}`, amount: -((Number(t.distanceKm || 0) * ATO_KM_RATE) + Number(t.parkingCost || 0) + Number(t.tollsCost || 0)), source: 'travel' }))
  const vehicleRows = vehicleEntries.data.map(v => ({ type: 'Vehicle', workspaceId: workspaceOf(v), date: rowDate(v), desc: v.tripPurpose || v.vehicleName || 'Vehicle entry', amount: -(Number(v.fuelCost || 0) + Number(v.parking || 0) + Number(v.tolls || 0) + Number(v.repairs || 0) + Number(v.tyres || 0) + Number(v.servicing || 0) + Number(v.rego || 0) + Number(v.insurance || 0) + Number(v.cleaning || 0) + Number(v.accessories || 0)), source: 'vehicle' }))

  const rows = [...paymentIncomeRows, ...invoiceIncomeRows, ...expenseRows, ...materialRows, ...toolRows, ...travelRows, ...vehicleRows]
    .filter(r => isInDateRange(r.date, range.start, range.end))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))

  const income = rows.filter(r => r.amount > 0).reduce((a, r) => a + r.amount, 0)
  const expensesTotal = rows.filter(r => r.amount < 0).reduce((a, r) => a + Math.abs(r.amount), 0)
  const manualExpenses = rows.filter(r => r.source === 'expense').reduce((a, r) => a + Math.abs(r.amount), 0)
  const materialExpenses = rows.filter(r => r.source === 'material').reduce((a, r) => a + Math.abs(r.amount), 0)
  const toolExpenses = rows.filter(r => r.source === 'tool').reduce((a, r) => a + Math.abs(r.amount), 0)
  const vehicle = rows.filter(r => r.source === 'travel' || r.source === 'vehicle').reduce((a, r) => a + Math.abs(r.amount), 0)
  const net = income - expensesTotal
  const gstEstimate = income / 11
  const taxSetAside = Math.max(0, net * 0.25)
  const outstanding = invoices.data.reduce((a, inv) => a + Number(inv.balanceOwing ?? Math.max(0, Number(inv.total || 0) - Number(inv.amountPaid || 0))), 0)
  const km = sum(travel.data, 'distanceKm', range, 'date') + sum(vehicleEntries.data, 'kilometres', range, 'date')

  return <div className="space-y-6">
    <div className="flex justify-between gap-3"><div><h1 className="text-2xl font-bold">{taxMode ? `Tax Summary FY ${'label' in range ? range.label : ''}` : 'Finance'}</h1><p className="text-wj-muted">Income, materials, expenses and vehicle records for your private business account.</p></div><Link href="/finance/new-expense" className="wj-btn-primary">Add expense</Link></div>

    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card title="Received income" value={formatCurrency(income)} />
      <Card title="Expenses" value={formatCurrency(expensesTotal)} />
      <Card title="Net profit estimate" value={formatCurrency(net)} />
      <Card title="Outstanding invoices" value={formatCurrency(outstanding)} />
      <Card title="Materials" value={formatCurrency(materialExpenses)} />
      <Card title="Tools / equipment" value={formatCurrency(toolExpenses)} />
      <Card title="Vehicle/KM deduction" value={formatCurrency(vehicle)} sub={`${km.toFixed(1)} km tracked`} />
      <Card title="Manual expenses" value={formatCurrency(manualExpenses)} />
      <Card title="GST estimate" value={formatCurrency(gstEstimate)} />
      <Card title="Tax set-aside" value={formatCurrency(taxSetAside)} />
    </div>

    <div className="wj-card overflow-hidden"><table className="w-full text-sm"><thead className="bg-wj-elevated text-wj-muted uppercase text-xs"><tr><th className="p-3 text-left">Date</th><th className="p-3 text-left">Type</th><th className="p-3 text-left">Description</th><th className="p-3 text-right">Amount</th></tr></thead><tbody>{rows.length === 0 && <tr><td colSpan={4} className="p-4 text-wj-muted">No finance records for this period.</td></tr>}{rows.map((r, i) => <tr key={i} className="border-t border-wj-border"><td className="p-3">{r.date || '—'}</td><td className="p-3">{r.type}</td><td className="p-3">{r.desc}</td><td className={`p-3 text-right ${r.amount >= 0 ? 'text-green-300' : 'text-red-300'}`}>{formatCurrency(r.amount)}</td></tr>)}</tbody></table></div>
  </div>
}

function Card({ title, value, sub }: { title: string, value: string, sub?: string }) { return <div className="wj-card p-4"><p className="text-wj-muted text-sm">{title}</p><p className="text-2xl font-bold mt-1">{value}</p>{sub && <p className="text-xs text-wj-subtle mt-1">{sub}</p>}</div> }
