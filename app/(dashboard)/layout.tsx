import Sidebar from '@/components/layout/Sidebar'
import MobileNav from '@/components/layout/MobileNav'
import AuthGate from '@/components/auth/AuthGate'
import SubscriptionGate from '@/components/billing/SubscriptionGate'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <SubscriptionGate>
      <div className="wj-shell flex">
        <Sidebar />
        <main className="min-w-0 flex-1 pb-28 lg:pb-0">
          <div className="sticky top-0 z-20 border-b border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl lg:hidden">
            <p className="text-sm font-black">IN & OUT</p>
            <p className="text-xs text-zinc-500">Invoicing, Scheduling & Tax</p>
          </div>
          <div className="wj-page">{children}</div>
        </main>
        <MobileNav />
      </div>
      </SubscriptionGate>
    </AuthGate>
  )
}
