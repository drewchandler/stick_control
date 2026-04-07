import { createElement } from 'react'
import { cn } from '../../lib/cn'

function normalizeSpacing(value) {
  if (value == null) {
    return undefined
  }
  if (typeof value === 'number') {
    return `${value}px`
  }
  return value
}

function stackBaseClass(axis, align, justify, wrap) {
  const classes = ['flex']
  classes.push(axis === 'horizontal' ? 'flex-row' : 'flex-col')
  if (wrap) {
    classes.push('flex-wrap')
  }
  if (align) {
    classes.push(align)
  }
  if (justify) {
    classes.push(justify)
  }
  return classes.join(' ')
}

export function HStack({
  as = 'div',
  className,
  gap = 8,
  align = 'items-center',
  justify,
  wrap = false,
  style,
  children,
  ...rest
}) {
  return createElement(
    as,
    {
      className: cn(stackBaseClass('horizontal', align, justify, wrap), className),
      style: { ...(style ?? {}), gap: normalizeSpacing(gap) },
      ...rest,
    },
    children,
  )
}

export function VStack({
  as = 'div',
  className,
  gap = 8,
  align,
  justify,
  style,
  children,
  ...rest
}) {
  return createElement(
    as,
    {
      className: cn(stackBaseClass('vertical', align, justify), className),
      style: { ...(style ?? {}), gap: normalizeSpacing(gap) },
      ...rest,
    },
    children,
  )
}

export function ZStack({ as = 'div', className, children, ...rest }) {
  return createElement(
    as,
    {
      className: cn('relative', className),
      ...rest,
    },
    children,
  )
}

export function Container({
  as = 'main',
  className,
  children,
  ...rest
}) {
  return createElement(
    as,
    {
      className: cn('mx-auto max-w-[1120px] px-4', className),
      ...rest,
    },
    children,
  )
}

