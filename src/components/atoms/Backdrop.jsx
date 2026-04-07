import { cn } from '../../lib/cn'

export default function Backdrop({ className = '', children, ...rest }) {
  return (
    <div className={cn('fixed inset-0 z-40 grid place-items-center bg-black/35 p-4', className)} role="presentation" {...rest}>
      {children}
    </div>
  )
}
