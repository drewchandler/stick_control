import { cn } from '../../lib/cn'

export function Title({ className = '', children, ...props }) {
  return (
    <h1 className={cn('text-[clamp(1.4rem,3.6vw,2rem)] font-bold text-slate-100', className)} {...props}>
      {children}
    </h1>
  )
}

export function Subtitle({ className = '', children, ...props }) {
  return (
    <p className={cn('text-sm text-slate-300', className)} {...props}>
      {children}
    </p>
  )
}

const BODY_TONE_CLASSES = {
  default: 'text-sm text-slate-700',
  danger: 'text-sm font-semibold text-red-700',
  subtleXs: 'text-xs text-slate-500',
  muted: 'text-sm text-slate-600',
  labelXs: 'text-xs font-semibold tracking-wide text-slate-600',
}

export function BodyText({ className = '', tone = 'default', children, ...props }) {
  return (
    <p className={cn(BODY_TONE_CLASSES[tone] ?? BODY_TONE_CLASSES.default, className)} {...props}>
      {children}
    </p>
  )
}

export function LabelText({ className = '', children, ...props }) {
  return (
    <label className={cn('text-sm font-medium text-slate-700', className)} {...props}>
      {children}
    </label>
  )
}

export function SectionTitle({ className = '', children, ...props }) {
  return (
    <h3 className={cn('text-lg font-semibold text-slate-900', className)} {...props}>
      {children}
    </h3>
  )
}

export function NextPromptText({ className = '', children, ...props }) {
  return (
    <p className={cn('text-base text-slate-900', className)} {...props}>
      {children}
    </p>
  )
}
