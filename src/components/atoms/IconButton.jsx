import Button from './Button'

export default function IconButton({ className = '', children, ...props }) {
  return (
    <Button
      variant="ghost"
      className={`h-11 w-11 min-w-11 p-0 text-slate-900 ${className}`.trim()}
      {...props}
    >
      {children}
    </Button>
  )
}
