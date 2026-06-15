'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, FileText, Home, Receipt, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'

const links = [
  { href: '/demo', label: 'Demo dashboard', icon: Home },
  { href: '/demo/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/demo/invoices', label: 'Invoices', icon: Receipt },
  { href: '/demo/quotes', label: 'Quotes', icon: FileText },
]

export default function DemoNav() {
  const pathname = usePathname()
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {links.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-black transition',
                active
                  ? 'border-amber-300/50 bg-amber-300/15 text-amber-200'
                  : 'border-white/10 bg-white/5 text-zinc-300 hover:border-white/20 hover:bg-white/10',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </div>
      <div className="rounded-2xl border border-blue-400/20 bg-blue-400/10 p-3 text-sm text-blue-100">
        <div className="flex items-center gap-2 font-black uppercase tracking-widest text-blue-200">
          <ShieldCheck className="h-4 w-4" /> Demo mode — fake data only
        </div>
        <p className="mt-1 text-blue-100/80">
          These pages do not connect to Firestore, do not save anything, and do not show private customer data.
        </p>
      </div>
    </div>
  )
}
