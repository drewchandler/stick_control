import { Moon, Sun } from 'lucide-react'
import Button from './Button'

export default function ThemeToggleButton({ theme, onToggle }) {
  const isDark = theme === 'dark'

  return (
    <Button
      variant="muted"
      size="sm"
      onClick={onToggle}
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
    </Button>
  )
}
