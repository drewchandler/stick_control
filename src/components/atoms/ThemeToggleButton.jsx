import { Moon, Sun } from 'lucide-react'
import Button from './Button'

export default function ThemeToggleButton({ theme, onToggle }) {
  const isDark = theme === 'dark'

  return (
    <Button
      variant="muted"
      size="iconSm"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      className="fixed right-4 top-4 z-40 shadow-md"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </Button>
  )
}
