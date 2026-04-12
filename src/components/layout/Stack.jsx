import { createElement } from 'react'
import { cn } from '../../lib/cn'

const ALIGN_CLASS_BY_TOKEN = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
  baseline: 'items-baseline',
}

const JUSTIFY_CLASS_BY_TOKEN = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly',
}

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

function resolveAlignClass(align) {
  if (!align) {
    return undefined
  }
  return ALIGN_CLASS_BY_TOKEN[align] ?? align
}

function resolveJustifyClass(justify) {
  if (!justify) {
    return undefined
  }
  return JUSTIFY_CLASS_BY_TOKEN[justify] ?? justify
}

export function HStack({
  as = 'div',
  className,
  gap = 8,
  align = 'center',
  justify,
  wrap = false,
  intrinsicWidth = false,
  horizontalScroll = false,
  style,
  children,
  ...rest
}) {
  return createElement(
    as,
    {
      className: cn(stackBaseClass('horizontal', resolveAlignClass(align), resolveJustifyClass(justify), wrap), intrinsicWidth && 'w-max', className),
      style: { ...(style ?? {}), gap: normalizeSpacing(gap), overflowX: horizontalScroll ? 'auto' : style?.overflowX },
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
  intrinsicWidth = false,
  style,
  children,
  ...rest
}) {
  return createElement(
    as,
    {
      className: cn(stackBaseClass('vertical', resolveAlignClass(align), resolveJustifyClass(justify)), intrinsicWidth && 'w-max', className),
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

