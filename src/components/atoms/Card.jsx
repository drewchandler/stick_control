import { createElement } from 'react'
import { cn } from '../../lib/cn'

const VARIANT_CLASS = {
  surface: 'rounded-2xl border border-border bg-surface p-3 text-text',
  modal:
    'w-full rounded-none border-0 bg-surface p-4 text-text shadow-none sm:rounded-xl sm:border sm:border-border sm:p-5 sm:shadow-lg',
}

const WIDTH_CLASS = {
  default: 'max-w-xl',
  wide: 'max-w-2xl',
  lg: 'max-w-lg',
}

export default function Card({
  as = 'section',
  variant = 'surface',
  width = 'default',
  inset = false,
  className = '',
  children,
  ...props
}) {
  return createElement(
    as,
    {
      className: cn(
        VARIANT_CLASS[variant] ?? VARIANT_CLASS.surface,
        variant === 'modal' && (WIDTH_CLASS[width] ?? WIDTH_CLASS.default),
        inset && 'mx-1 sm:mx-2',
        className,
      ),
      ...props,
    },
    children,
  )
}
