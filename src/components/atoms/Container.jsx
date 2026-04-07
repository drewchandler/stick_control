import { createElement } from 'react'
import { cn } from '../../lib/cn'

const TONE_CLASS = {
  default: '',
  subtle: 'bg-slate-50',
}

const ROUNDING_CLASS = {
  none: '',
  sm: 'rounded-md',
  md: 'rounded-lg',
  lg: 'rounded-xl',
  xl: 'rounded-2xl',
}

const PADDING_CLASS = {
  none: '',
  xs: 'p-1',
  sm: 'p-2',
  md: 'p-3',
  lg: 'p-4',
}

export default function Container({
  as = 'div',
  className = '',
  children,
  tone = 'default',
  rounded = 'none',
  padding = 'none',
  border = false,
  ...props
}) {
  return createElement(
    as,
    {
      className: cn(
        TONE_CLASS[tone] ?? TONE_CLASS.default,
        ROUNDING_CLASS[rounded] ?? ROUNDING_CLASS.none,
        PADDING_CLASS[padding] ?? PADDING_CLASS.none,
        border && 'border border-slate-200',
        className,
      ),
      ...props,
    },
    children,
  )
}
