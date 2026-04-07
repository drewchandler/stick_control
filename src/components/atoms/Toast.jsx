import { cn } from '../../lib/cn'

export default function Toast({ className = '', children, ...rest }) {
  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50 max-w-[min(92vw,520px)] rounded-xl border border-emerald-700 bg-emerald-950 px-4 py-3 text-emerald-200 shadow-xl',
        className,
      )}
      role="status"
      aria-live="polite"
      {...rest}
    >
      {children}
    </div>
  )
}
