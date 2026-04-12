import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

const SIZE_CLASSES = {
  default: '',
  tempo: 'h-8 w-14 min-w-14 px-2 py-1 text-center font-semibold',
}

const TextInput = forwardRef(function TextInput({ className, size = 'default', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-300 disabled:cursor-not-allowed disabled:opacity-50',
        SIZE_CLASSES[size] ?? SIZE_CLASSES.default,
        className,
      )}
      {...props}
    />
  )
})

export default TextInput
