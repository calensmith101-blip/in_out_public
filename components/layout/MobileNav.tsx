'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Briefcase, Receipt, DollarSign, Menu } from 'lucide-react'

const mainItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { href: '/jobs', icon: Briefcase, label: 'Jobs' },
  { href: '/invoices', icon: Receipt, label: 'Invoices' },
  { href: '/finance', icon: DollarSign, label: 'Money' },
  { href: '/more', icon: Menu, label: 'More' },
]

export default function MobileNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 rounded-3xl border border-white/10 bg-black/80 p-2 shadow-2xl shadow-black/50 backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5 gap-1">
        {mainItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href} className={cn('flex flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[10px] font-bold text-zinc-500 transition', active && 'bg-white/10 text-white')}>
              <item.icon className={cn('h-5 w-5', active && 'text-amber-300')} />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
