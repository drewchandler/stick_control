import { ChevronDown } from 'lucide-react'
import Button from './Button'
import { BodyText } from './Typography'
import { VStack } from '../layout/Stack'

export default function ExerciseDropdown({
  label,
  options,
  selectedIndex,
  open,
  disabled,
  onToggle,
  onSelect,
}) {
  return (
    <VStack as="div" className="relative max-w-full">
      <Button
        type="button"
        variant="secondary"
        size="sm"
        disabled={disabled}
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select exercise"
        className="w-full justify-start gap-2 border-slate-200 px-3 py-2 text-left text-sm font-semibold"
      >
        <BodyText className="max-w-[min(100%,760px)] truncate text-sm font-semibold text-slate-900">
          {label}
        </BodyText>
        <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
      </Button>
      {open && (
        <VStack
          role="listbox"
          aria-label="Exercises"
          gap={4}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-80 overflow-y-auto rounded-xl border border-slate-300 bg-white p-1 shadow-xl"
        >
          {options.map((option, index) => (
            <Button
              key={`${option.name}-${index}`}
              type="button"
              variant="ghost"
              size="sm"
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => onSelect(index)}
              className={`w-full justify-start gap-2 rounded-lg px-3 py-2 text-left ${index === selectedIndex ? 'bg-slate-200 font-semibold' : ''}`}
            >
              <BodyText className="min-w-5 text-slate-500">{index + 1}.</BodyText>
              <BodyText>{option.name}</BodyText>
            </Button>
          ))}
        </VStack>
      )}
    </VStack>
  )
}
