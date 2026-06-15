import Link from 'next/link'
import { ArrowLeft, Mail, MapPin } from 'lucide-react'
import DemoNav from '@/components/demo/DemoNav'
import DemoStatusBadge from '@/components/demo/DemoStatusBadge'
import { demoInvoices } from '@/lib/demoData'
import { formatCurrency } from '@/lib/finance'

export default function DemoInvoicesPage() {
  return (
    <main className="min-h-screen bg-wj-bg p-5 text-wj-text">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/demo" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-amber-300"><ArrowLeft className="h-4 w-4" /> Demo dashboard</Link>
          <h1 className="text-4xl font-black tracking-tight">Demo invoices</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Sample invoice list and invoice-preview cards. Real accounts can create, edit, save and print their own invoices.</p>
        </div>
        <DemoNav />

        <div className="grid gap-5 lg:grid-cols-2">
          {demoInvoices.map(invoice => (
            <article key={invoice.id} className="wj-card overflow-hidden">
              <div className="border-b border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-amber-300">{invoice.invoiceNumber}</p>
                    <h2 className="mt-1 text-2xl font-black">{invoice.clientName}</h2>
                  </div>
                  <DemoStatusBadge status={invoice.status} />
                </div>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-zinc-500" /> {invoice.email}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-500" /> {invoice.address}</p>
                  <p>Invoice date: <strong className="text-zinc-100">{invoice.invoiceDate}</strong> · Due: <strong className="text-zinc-100">{invoice.dueDate}</strong></p>
                </div>
              </div>
              <div className="p-5">
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/30 text-xs uppercase tracking-wider text-zinc-500"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Total</th></tr></thead>
                    <tbody>{invoice.items.map(item => <tr key={item.description} className="border-t border-white/10"><td className="p-3 text-zinc-200">{item.description}</td><td className="p-3 text-right text-zinc-400">{item.qty}</td><td className="p-3 text-right text-zinc-400">{formatCurrency(item.rate)}</td><td className="p-3 text-right font-bold">{formatCurrency(item.total)}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="mt-4 space-y-2 rounded-2xl bg-black/20 p-4 text-sm">
                  <p className="flex justify-between"><span className="text-zinc-400">Subtotal</span><strong>{formatCurrency(invoice.subtotal)}</strong></p>
                  <p className="flex justify-between"><span className="text-zinc-400">GST</span><strong>{formatCurrency(invoice.gst)}</strong></p>
                  <p className="flex justify-between text-lg"><span>Total</span><strong>{formatCurrency(invoice.total)}</strong></p>
                  <p className="flex justify-between text-lg text-amber-200"><span>Balance owing</span><strong>{formatCurrency(invoice.balanceOwing)}</strong></p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
