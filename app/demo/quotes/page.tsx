import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Mail, MapPin } from 'lucide-react'
import DemoNav from '@/components/demo/DemoNav'
import DemoStatusBadge from '@/components/demo/DemoStatusBadge'
import { demoQuotes } from '@/lib/demoData'
import { formatCurrency } from '@/lib/finance'

export default function DemoQuotesPage() {
  return (
    <main className="min-h-screen bg-wj-bg p-5 text-wj-text">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/demo" className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-amber-300"><ArrowLeft className="h-4 w-4" /> Demo dashboard</Link>
          <h1 className="text-4xl font-black tracking-tight">Demo quotes</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">Sample quote page with scope of works and line items. Real accounts can convert accepted quotes into jobs and invoices.</p>
        </div>
        <DemoNav />

        <div className="grid gap-5 lg:grid-cols-2">
          {demoQuotes.map(quote => (
            <article key={quote.id} className="wj-card overflow-hidden">
              <div className="border-b border-white/10 bg-white/5 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sm font-bold text-amber-300">{quote.quoteNumber}</p>
                    <h2 className="mt-1 text-2xl font-black">{quote.clientName}</h2>
                  </div>
                  <DemoStatusBadge status={quote.status} />
                </div>
                <div className="mt-4 space-y-2 text-sm text-zinc-300">
                  <p className="flex items-center gap-2"><Mail className="h-4 w-4 text-zinc-500" /> {quote.email}</p>
                  <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-zinc-500" /> {quote.address}</p>
                  <p>Quote date: <strong className="text-zinc-100">{quote.quoteDate}</strong> · Valid until: <strong className="text-zinc-100">{quote.validUntil}</strong></p>
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-black">Scope of works</h3>
                <ul className="mt-3 space-y-2 text-sm text-zinc-300">
                  {quote.scope.map(item => <li key={item} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" /> <span>{item}</span></li>)}
                </ul>
                <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-black/30 text-xs uppercase tracking-wider text-zinc-500"><tr><th className="p-3">Item</th><th className="p-3 text-right">Qty</th><th className="p-3 text-right">Rate</th><th className="p-3 text-right">Total</th></tr></thead>
                    <tbody>{quote.items.map(item => <tr key={item.description} className="border-t border-white/10"><td className="p-3 text-zinc-200">{item.description}</td><td className="p-3 text-right text-zinc-400">{item.qty}</td><td className="p-3 text-right text-zinc-400">{formatCurrency(item.rate)}</td><td className="p-3 text-right font-bold">{formatCurrency(item.total)}</td></tr>)}</tbody>
                  </table>
                </div>
                <div className="mt-4 space-y-2 rounded-2xl bg-black/20 p-4 text-sm">
                  <p className="flex justify-between"><span className="text-zinc-400">Subtotal</span><strong>{formatCurrency(quote.subtotal)}</strong></p>
                  <p className="flex justify-between"><span className="text-zinc-400">GST</span><strong>{formatCurrency(quote.gst)}</strong></p>
                  <p className="flex justify-between text-lg"><span>Total</span><strong>{formatCurrency(quote.total)}</strong></p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  )
}
