import { createElement } from 'react'
import { cn } from '../../lib/cn'

const TONE_CLASS = {
  default: '',
  subtle: 'bg-surface-muted',
  upnext: 'bg-upnext',
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

const FLEX_CLASS = {
  none: '',
  grow: 'flex-1',
}

const WIDTH_CLASS = {
  auto: '',
  full: 'w-full',
  max: 'max-w-full',
}

const MIN_WIDTH_CLASS = {
  auto: '',
  zero: 'min-w-0',
}

export default function Container({
  as = 'div',
  className = '',
  children,
  tone = 'default',
  rounded = 'none',
  padding = 'none',
  border = false,
  flex = 'none',
  width = 'auto',
  minWidth = 'auto',
  ...props
}) {
  return createElement(
    as,
    {
      className: cn(
        TONE_CLASS[tone] ?? TONE_CLASS.default,
        ROUNDING_CLASS[rounded] ?? ROUNDING_CLASS.none,
        PADDING_CLASS[padding] ?? PADDING_CLASS.none,
        border && 'border border-border',
        FLEX_CLASS[flex] ?? FLEX_CLASS.none,
        WIDTH_CLASS[width] ?? WIDTH_CLASS.auto,
        MIN_WIDTH_CLASS[minWidth] ?? MIN_WIDTH_CLASS.auto,
        className,
      ),
      ...props,
    },
    children,
  )
}
