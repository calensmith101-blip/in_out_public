'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '@/lib/firebase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, Briefcase, FileText, Receipt,
  DollarSign, PiggyBank, Package, Car, UserPlus,
  CalendarClock, Sparkles, Settings, LogOut, Wrench, ChevronRight,
} from 'lucide-react'

export const navSections = [
  {
    label: 'Work',
    items: [
      { href: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard'    },
      { href: '/customers',    icon: Users,            label: 'Customers'   },
      { href: '/jobs',         icon: Briefcase,        label: 'Jobs'        },
      { href: '/quotes',       icon: FileText,         label: 'Quotes'      },
      { href: '/invoices',     icon: Receipt,          label: 'Invoices'    },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/finance',      icon: DollarSign,       label: 'Finance'     },
      { href: '/tax',          icon: PiggyBank,        label: 'Tax'         },
      { href: '/materials',    icon: Package,          label: 'Materials'   },
      { href: '/travel',       icon: Car,              label: 'Travel / KM' },
    ],
  },
  {
    label: 'Leads',
    items: [
      { href: '/leads',         icon: UserPlus,        label: 'Leads'       },
      { href: '/calendar',      icon: CalendarClock,   label: 'Calendar'    },
      { href: '/appointments',  icon: CalendarClock,   label: 'Appointments'},
      { href: '/ai-rough-quote',icon: Sparkles,        label: 'AI Quote'    },
    ],
  },
]

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function signOut() {
    await firebaseSignOut(auth)
    router.push('/login')
  }

  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-white/10 bg-black/55 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 to-amber-500 shadow-lg shadow-red-950/30">
            <Wrench className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-base font-black leading-none tracking-tight">IN & OUT</p>
            <p className="mt-1 text-xs font-semibold text-zinc-500">Invoicing, Scheduling & Tax</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {navSections.map(section => (
          <div key={section.label}>
            <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-600">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link key={item.href} href={item.href} className={cn('nav-link', active && 'active')}>
                    <item.icon className={cn('h-4 w-4 shrink-0', active && 'text-amber-300')} />
                    <span className="flex-1">{item.label}</span>
                    {active && <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link href="/settings" className={cn('nav-link', pathname.startsWith('/settings') && 'active')}>
          <Settings className="h-4 w-4" />
          Settings
        </Link>
        <button onClick={signOut} className="nav-link w-full text-left text-red-300 hover:bg-red-500/10 hover:text-red-200">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  )
}
