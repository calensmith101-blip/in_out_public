import type { Metadata } from 'next'
import './globals.css'
import PwaRegister from '@/components/PwaRegister'


export const metadata: Metadata = {
  title: 'IN & OUT',
  description: 'IN & OUT – Invoicing, Scheduling & Tax',
  manifest: '/manifest.json',
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#2563eb',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-wj-bg text-wj-text antialiased">{children}
        <PwaRegister />
      </body>
    </html>
  )
}