import { cn } from '../../lib/cn'

export default function SurfaceCard({ className = '', children, ...props }) {
  return (
    <section className={cn('rounded-2xl border border-slate-200 bg-white p-3 text-slate-900', className)} {...props}>
      {children}
    </section>
  )
}
