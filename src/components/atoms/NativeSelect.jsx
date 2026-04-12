import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

const NativeSelect = forwardRef(function NativeSelect({ className, children, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-border-strong focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
})

export default NativeSelect
