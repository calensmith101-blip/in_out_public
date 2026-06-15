'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { addDoc, collection, deleteDoc, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { db, userCollectionPath } from '@/lib/firebase/client'
import { useFirebaseUser } from '@/lib/firebase/hooks'
import { formatCurrency } from '@/lib/finance'
import InvoiceForm from '@/components/invoices/InvoiceForm'

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>()
  const invoiceId = params.id
  const user = useFirebaseUser()
  const router = useRouter()
  const [invoice, setInvoice] = useState<any>(null)
  const [payments, setPayments] = useState<any[]>([])
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0,10))

  useEffect(() => {
    if (!user || !invoiceId) return
    const invRef = doc(db, userCollectionPath(user.uid, 'invoices'), invoiceId)
    const unsubInv = onSnapshot(invRef, snap => setInvoice(snap.exists() ? { id: snap.id, ...snap.data() } : null))
    const q = query(collection(db, userCollectionPath(user.uid, 'invoicePayments')), where('invoiceId', '==', invoiceId))
    const unsubPay = onSnapshot(q, snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    return () => { unsubInv(); unsubPay() }
  }, [user, invoiceId])

  async function recalc(nextPayments = payments) {
    if (!user || !invoice) return
    const paid = nextPayments.reduce((a, p) => a + Number(p.amount || 0), 0)
    const total = Number(invoice.total || 0)
    const status = paid <= 0 ? 'SENT' : paid >= total ? 'PAID' : 'PART_PAID'
    await updateDoc(doc(db, userCollectionPath(user.uid, 'invoices'), invoiceId), { amountPaid: paid, balanceOwing: Math.max(0, total - paid), status, updatedAt: serverTimestamp() })
  }

  async function addPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!user || !invoice) return
    const value = Number(amount || 0)
    if (value <= 0) return
    const payload = { invoiceId, invoiceNumber: invoice.invoiceNumber || '', customerName: invoice.customerName || '', amount: value, paymentDate, method: 'Manual', createdAt: serverTimestamp(), updatedAt: serverTimestamp() }
    const docRef = await addDoc(collection(db, userCollectionPath(user.uid, 'invoicePayments')), payload)
    await recalc([...payments, { id: docRef.id, ...payload }])
    setAmount('')
  }

  async function removePayment(id: string) {
    if (!user) return
    if (!confirm('Delete this payment? Finance and tax totals will recalculate.')) return
    await deleteDoc(doc(db, userCollectionPath(user.uid, 'invoicePayments'), id))
    await recalc(payments.filter(p => p.id !== id))
  }

  if (user === undefined || !invoice) return <div className="text-wj-muted">Loading invoice...</div>

  return <div className="space-y-6">
    <button className="wj-btn-ghost" onClick={() => router.push('/invoices')}>← Back to invoices</button>
    <div className="grid lg:grid-cols-[1fr_380px] gap-6">
      <InvoiceForm wsId={invoice.workspaceId || 'my-business'} id={invoiceId} />
      <aside className="space-y-4">
        <div className="wj-card p-4"><h2 className="font-semibold">Payment summary</h2><div className="grid grid-cols-2 gap-3 mt-3 text-sm"><p className="text-wj-muted">Total</p><p className="text-right">{formatCurrency(invoice.total)}</p><p className="text-wj-muted">Paid</p><p className="text-right text-green-300">{formatCurrency(invoice.amountPaid)}</p><p className="text-wj-muted">Owing</p><p className="text-right text-amber-300">{formatCurrency(invoice.balanceOwing)}</p><p className="text-wj-muted">Status</p><p className="text-right">{invoice.status}</p></div></div>
        <form onSubmit={addPayment} className="wj-card p-4 space-y-3"><h2 className="font-semibold">Record payment</h2><label><span className="wj-label">Amount received</span><input className="wj-input" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label><label><span className="wj-label">Payment date</span><input className="wj-input" type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} /></label><button className="wj-btn-primary w-full justify-center">Add payment</button></form>
        <div className="wj-card p-4"><h2 className="font-semibold mb-3">Payments</h2>{payments.length === 0 && <p className="text-sm text-wj-muted">No payments recorded.</p>}{payments.map(p => <div key={p.id} className="border-t border-wj-border py-2 text-sm flex justify-between gap-2"><span>{p.paymentDate}<br/><span className="text-green-300">{formatCurrency(p.amount)}</span></span><button onClick={() => removePayment(p.id)} className="text-red-300">Delete</button></div>)}</div>
      </aside>
    </div>
  </div>
}
