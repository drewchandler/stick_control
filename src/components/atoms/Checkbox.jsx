import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

const Checkbox = forwardRef(function Checkbox({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border-slate-300 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400',
        className,
      )}
      {...props}
    />
  )
})

export default Checkbox
