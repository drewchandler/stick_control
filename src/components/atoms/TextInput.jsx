import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

const SIZE_CLASSES = {
  default: '',
  // Important width utilities ensure compact BPM sizing wins over generic width classes.
  tempo: 'h-8 !w-14 !min-w-14 px-2 py-1 text-center font-semibold',
}

const WIDTH_CLASSES = {
  full: 'w-full',
  auto: 'w-auto',
}

const TextInput = forwardRef(function TextInput({ className, size = 'default', width = 'full', ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        'rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-border-strong focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        WIDTH_CLASSES[width] ?? WIDTH_CLASSES.full,
        SIZE_CLASSES[size] ?? SIZE_CLASSES.default,
        className,
      )}
      {...props}
    />
  )
})

export default TextInput
