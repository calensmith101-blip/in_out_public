import Link from 'next/link'
import {
  Briefcase,
  CalendarClock,
  Car,
  DollarSign,
  FileText,
  Home,
  Package,
  PiggyBank,
  Receipt,
  Settings,
  Sparkles,
  Timer,
  UserPlus,
  Users,
  Wrench,
} from 'lucide-react'

const groups = [
  {
    title: 'Main work',
    items: [
      { href: '/dashboard', label: 'Dashboard', desc: 'Business snapshot and quick actions', icon: Home },
      { href: '/jobs', label: 'Jobs', desc: 'Main property maintenance jobs', icon: Briefcase },
      { href: '/customers', label: 'Customers', desc: 'Client names, contacts and addresses', icon: Users },
      { href: '/leads', label: 'Leads', desc: 'New work opportunities before they become jobs', icon: UserPlus },
      { href: '/calendar', label: 'Calendar', desc: 'Daily, weekly and monthly job schedule', icon: CalendarClock },
      { href: '/appointments', label: 'Appointments', desc: 'Scheduled visits and reminders', icon: CalendarClock },
    ],
  },
  {
    title: 'Quotes, invoices and money',
    items: [
      { href: '/quotes', label: 'Quotes', desc: 'Pending, accepted and declined quotes', icon: FileText },
      { href: '/invoices', label: 'Invoices', desc: 'Business invoices and payment tracking', icon: Receipt },
      { href: '/finance', label: 'Money', desc: 'Income, payments and expense overview', icon: DollarSign },
      { href: '/expenses', label: 'Expenses', desc: 'Business expense records', icon: DollarSign },
      { href: '/tax', label: 'Tax', desc: 'Deductions, tax set-aside and EOFY view', icon: PiggyBank },
    ],
  },
  {
    title: 'Records',
    items: [
      { href: '/materials', label: 'Materials', desc: 'Materials bought and used on jobs', icon: Package },
      { href: '/travel', label: 'Travel / KM', desc: 'Kilometres, tolls and parking', icon: Car },
      { href: '/vehicle', label: 'Vehicle', desc: 'Fuel, services, rego and repairs', icon: Car },
      { href: '/hours', label: 'Hours', desc: 'Labour and time tracking', icon: Timer },
      { href: '/tools', label: 'Tools', desc: 'Tool purchases and equipment records', icon: Wrench },
    ],
  },
  {
    title: 'Setup and tools',
    items: [
      { href: '/my-business', label: 'My Business', desc: 'Your private jobs, quotes, invoices and records', icon: Briefcase },
      { href: '/ai-rough-quote', label: 'AI Rough Quote', desc: 'Draft wording and rough pricing help', icon: Sparkles },
      { href: '/settings', label: 'Settings', desc: 'Business, bank, tax and invoice defaults', icon: Settings },
    ],
  },
]

export default function MorePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-3xl font-black">More</h1>
        <p className="mt-1 text-zinc-400">All IN & OUT pages in one place so nothing is hidden on mobile.</p>
      </div>

      {groups.map(group => (
        <section key={group.title} className="wj-card p-5">
          <h2 className="text-lg font-black">{group.title}</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.items.map(item => (
              <Link key={item.href} href={item.href} className="rounded-2xl border border-white/10 bg-black/20 p-4 transition hover:border-amber-300/40 hover:bg-white/[0.07]">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-white/10 p-2 text-amber-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-black text-white">{item.label}</p>
                    <p className="mt-1 text-sm text-zinc-400">{item.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
