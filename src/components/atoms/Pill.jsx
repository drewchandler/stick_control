import { cn } from '../../lib/cn'

export default function Pill({ className = '', strong = false, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-[0.82rem] font-bold leading-tight',
        strong ? 'border-slate-800 bg-slate-800 text-slate-50' : 'border-slate-200 bg-slate-100 text-slate-700',
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
