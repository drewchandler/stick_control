import { cn } from '../../lib/cn'

export function Title({ className = '', children, ...props }) {
  return (
    <h1 className={cn('text-[clamp(1.4rem,3.6vw,2rem)] font-bold text-text-strong', className)} {...props}>
      {children}
    </h1>
  )
}

export function Subtitle({ className = '', children, ...props }) {
  return (
    <p className={cn('text-sm text-text-muted', className)} {...props}>
      {children}
    </p>
  )
}

const BODY_TONE_CLASSES = {
  default: 'text-sm text-text',
  danger: 'text-sm font-semibold text-text-danger',
  subtleXs: 'text-xs text-text-subtle',
  muted: 'text-sm text-text-muted',
  labelXs: 'text-xs font-semibold tracking-wide text-text-muted',
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
    <label className={cn('text-sm font-medium text-text', className)} {...props}>
      {children}
    </label>
  )
}

export function SectionTitle({ className = '', children, ...props }) {
  return (
    <h3 className={cn('text-lg font-semibold text-text-strong', className)} {...props}>
      {children}
    </h3>
  )
}

export function NextPromptText({ className = '', children, ...props }) {
  return (
    <p className={cn('text-base text-text-strong', className)} {...props}>
      {children}
    </p>
  )
}
