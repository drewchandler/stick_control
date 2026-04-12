import { ChevronDown } from 'lucide-react'
import Button from '../atoms/Button'
import { BodyText } from '../atoms/Typography'
import { VStack } from '../layout/Stack'
import { cn } from '../../lib/cn'

export default function ExerciseSelector({
  label,
  options,
  selectedIndex,
  open,
  disabled,
  onToggle,
  onSelect,
  rootClassName = '',
  triggerClassName = '',
  menuClassName = '',
  optionClassName = '',
  indexClassName = '',
  labelClassName = '',
  iconClassName = '',
}) {
  return (
    <div className={cn('relative max-w-full', rootClassName)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select exercise"
        className={cn(
          'w-full justify-start gap-2 rounded-none border-0 p-0 text-left text-base font-semibold text-slate-900 hover:border-transparent',
          triggerClassName,
        )}
      >
        <BodyText className={cn('max-w-[min(100%,760px)] truncate text-base font-semibold text-slate-900', labelClassName)}>
          {label}
        </BodyText>
        <ChevronDown size={16} className={cn('shrink-0', iconClassName)} aria-hidden="true" />
      </Button>
      {open && (
        <VStack
          role="listbox"
          aria-label="Exercises"
          spacing={1}
          className={cn(
            'absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-80 overflow-y-auto rounded-xl border border-slate-300 bg-white p-1 shadow-xl',
            menuClassName,
          )}
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
              className={cn(
                'w-full justify-start gap-2 rounded-lg px-3 py-2 text-left',
                index === selectedIndex && 'bg-slate-200 font-semibold',
                optionClassName,
              )}
            >
              <BodyText className={cn('min-w-5 text-slate-500', indexClassName)}>{index + 1}.</BodyText>
              <BodyText>{option.name}</BodyText>
            </Button>
          ))}
        </VStack>
      )}
    </div>
  )
}
