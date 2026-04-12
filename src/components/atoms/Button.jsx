import { forwardRef } from 'react'
import { cn } from '../../lib/cn'

const VARIANT_STYLES = {
  primary:
    'bg-brand text-on-brand border-brand hover:bg-brand-hover focus-visible:ring-brand/35',
  secondary:
    'bg-surface text-text border-border hover:border-border-strong focus-visible:ring-brand/30',
  ghost:
    'bg-transparent text-text-muted border-transparent hover:bg-surface-muted focus-visible:ring-brand/28',
  danger: 'bg-danger text-on-brand border-danger hover:bg-danger-hover focus-visible:ring-danger/35',
  muted: 'bg-surface-muted text-text-muted border-border hover:border-border-strong focus-visible:ring-brand/28',
  dark: 'bg-brand text-on-brand border-brand hover:bg-brand-hover focus-visible:ring-brand/35',
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
