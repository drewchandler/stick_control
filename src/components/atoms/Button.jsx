import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

const VARIANT_STYLES = {
  primary:
    'bg-slate-900 text-slate-50 border-slate-900 hover:bg-slate-800 focus-visible:ring-slate-900/30',
  secondary:
    'bg-white text-slate-900 border-slate-300 hover:border-slate-500 focus-visible:ring-slate-500/30',
  ghost:
    'bg-transparent text-slate-700 border-transparent hover:bg-slate-100 focus-visible:ring-slate-500/30',
  danger: 'bg-red-600 text-white border-red-600 hover:bg-red-500 focus-visible:ring-red-500/30',
  muted: 'bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-500 focus-visible:ring-slate-500/30',
  dark: 'bg-slate-900 text-slate-50 border-slate-900 hover:bg-slate-800 focus-visible:ring-slate-900/30',
}

const SIZE_STYLES = {
  sm: 'h-9 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
  iconLg: 'h-12 w-12 p-0',
  icon: 'h-11 w-11 p-0',
  iconSm: 'h-9 w-9 p-0',
  iconXs: 'h-8 w-8 p-0',
}

const baseClasses =
  'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2'

const RADIUS_STYLES = {
  default: '',
  full: 'rounded-full',
}

const Button = forwardRef(function Button(
  { className, variant = 'secondary', size = 'md', radius = 'default', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        baseClasses,
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.secondary,
        SIZE_STYLES[size] ?? SIZE_STYLES.md,
        RADIUS_STYLES[radius] ?? RADIUS_STYLES.default,
        className,
      )}
      {...props}
    />
  )
})

export default Button
