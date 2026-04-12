import { cn } from '../../lib/cn'

export default function Pill({ className = '', strong = false, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.82rem] font-bold leading-tight',
        strong ? 'border-brand bg-brand text-on-brand' : 'border-border bg-surface-muted text-muted',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
