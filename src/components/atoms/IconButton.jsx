import Button from './Button'
import { cn } from '../../lib/cn'

export default function IconButton({ className = '', children, ...props }) {
  return (
    <Button
      variant="ghost"
      className={cn('h-11 w-11 min-w-11 p-0 text-text-strong', className)}
      {...props}
    >
      {children}
    </Button>
  )
}
