export default function DemoStatusBadge({ status }: { status: string }) {
  const label = status.replaceAll('_', ' ')
  return <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-wider text-zinc-200">{label}</span>
}
