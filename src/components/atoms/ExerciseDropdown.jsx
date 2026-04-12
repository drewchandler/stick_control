import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Button from './Button'
import { BodyText } from './Typography'
import { VStack } from '../layout/Stack'
import { cn } from '../../lib/cn'

export default function ExerciseDropdown({
  label,
  options,
  selectedIndex,
  open,
  disabled,
  onToggle,
  onSelect,
}) {
  const triggerRef = useRef(null)
  const optionRefs = useRef([])
  const openedViaKeyboardRef = useRef(false)
  const pendingFocusIndexRef = useRef(-1)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const optionsCount = options.length

  const clampIndex = useCallback(
    (index) => {
      if (!optionsCount) {
        return -1
      }
      return Math.max(0, Math.min(optionsCount - 1, index))
    },
    [optionsCount],
  )

  const resolveInitialIndex = useCallback(
    (preferLast = false) => {
      if (!optionsCount) {
        return -1
      }
      if (Number.isInteger(selectedIndex) && selectedIndex >= 0 && selectedIndex < optionsCount) {
        return selectedIndex
      }
      return preferLast ? optionsCount - 1 : 0
    },
    [optionsCount, selectedIndex],
  )

  const focusOptionSoon = useCallback((index) => {
    if (index < 0) {
      return
    }
    const focusOption = () => {
      optionRefs.current[index]?.focus()
    }
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(focusOption)
    })
  }, [])

  const setHighlightAndFocus = useCallback(
    (index) => {
      const next = clampIndex(index)
      if (next < 0) {
        return
      }
      setHighlightedIndex(next)
      focusOptionSoon(next)
    },
    [clampIndex, focusOptionSoon],
  )

  const openDropdown = useCallback(
    (initialIndex, focusAfterOpen) => {
      if (open || disabled || !optionsCount) {
        return
      }
      const resolvedInitialIndex = clampIndex(initialIndex)
      if (resolvedInitialIndex >= 0) {
        setHighlightedIndex(resolvedInitialIndex)
      }
      pendingFocusIndexRef.current = focusAfterOpen ? resolvedInitialIndex : -1
      onToggle()
    },
    [clampIndex, disabled, onToggle, open, optionsCount],
  )

  useEffect(() => {
    optionRefs.current = optionRefs.current.slice(0, optionsCount)
  }, [optionsCount])

  useEffect(() => {
    if (!open || pendingFocusIndexRef.current < 0) {
      return
    }
    focusOptionSoon(pendingFocusIndexRef.current)
    openedViaKeyboardRef.current = false
    pendingFocusIndexRef.current = -1
  }, [focusOptionSoon, open])

  const handleTriggerKeyDown = useCallback(
    (event) => {
      if (disabled || !optionsCount) {
        return
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!open) {
          openedViaKeyboardRef.current = true
          openDropdown(resolveInitialIndex(false), true)
          return
        }
        setHighlightAndFocus((highlightedIndex >= 0 ? highlightedIndex : resolveInitialIndex(false)) + 1)
        return
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (!open) {
          openedViaKeyboardRef.current = true
          openDropdown(resolveInitialIndex(true), true)
          return
        }
        setHighlightAndFocus((highlightedIndex >= 0 ? highlightedIndex : resolveInitialIndex(true)) - 1)
        return
      }

      if (event.key === 'Home' && open) {
        event.preventDefault()
        setHighlightAndFocus(0)
        return
      }

      if (event.key === 'End' && open) {
        event.preventDefault()
        setHighlightAndFocus(optionsCount - 1)
        return
      }

      if ((event.key === 'Enter' || event.key === ' ') && !open) {
        event.preventDefault()
        openedViaKeyboardRef.current = true
        openDropdown(resolveInitialIndex(false), true)
        return
      }

      if ((event.key === 'Enter' || event.key === ' ') && open && highlightedIndex >= 0) {
        event.preventDefault()
        onSelect(highlightedIndex)
        return
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault()
        onToggle()
      }
    },
    [
      disabled,
      highlightedIndex,
      onSelect,
      onToggle,
      open,
      optionsCount,
      openDropdown,
      resolveInitialIndex,
      setHighlightAndFocus,
    ],
  )

  const handleTriggerClick = useCallback(() => {
    if (disabled || !optionsCount) {
      return
    }
    if (open) {
      onToggle()
      return
    }
    openDropdown(resolveInitialIndex(false), false)
  }, [disabled, onToggle, open, openDropdown, optionsCount, resolveInitialIndex])

  const handleOptionKeyDown = useCallback(
    (index, event) => {
      if (!optionsCount) {
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setHighlightAndFocus(index + 1)
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setHighlightAndFocus(index - 1)
        return
      }
      if (event.key === 'Home') {
        event.preventDefault()
        setHighlightAndFocus(0)
        return
      }
      if (event.key === 'End') {
        event.preventDefault()
        setHighlightAndFocus(optionsCount - 1)
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        onToggle()
        triggerRef.current?.focus()
      }
    },
    [onToggle, optionsCount, setHighlightAndFocus],
  )

  return (
    <VStack as="div" className="relative max-w-full">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Select exercise"
        className="w-full justify-start gap-2 px-3 py-2 text-left text-sm font-semibold text-text-main hover:bg-surface-muted"
      >
        <BodyText className="max-w-[min(100%,760px)] truncate text-sm font-semibold text-text-main">
          {label}
        </BodyText>
        <ChevronDown size={16} className="shrink-0" aria-hidden="true" />
      </Button>
      {open && (
        <VStack
          role="listbox"
          aria-label="Exercises"
          aria-activedescendant={highlightedIndex >= 0 ? `exercise-option-${highlightedIndex}` : undefined}
          gap={4}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-80 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-xl shadow-shadow-elev/20"
        >
          {options.map((option, index) => (
            <Button
              ref={(element) => {
                optionRefs.current[index] = element
              }}
              id={`exercise-option-${index}`}
              key={`${option.name}-${index}`}
              type="button"
              variant="ghost"
              size="sm"
              role="option"
              aria-selected={index === selectedIndex}
              onFocus={() => setHighlightedIndex(index)}
              onMouseEnter={() => setHighlightedIndex(index)}
              onKeyDown={(event) => handleOptionKeyDown(index, event)}
              onClick={() => onSelect(index)}
              className={cn(
                'w-full justify-start gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-surface-muted focus-visible:bg-surface-muted',
                (index === selectedIndex || index === highlightedIndex) && 'bg-surface-muted',
                index === selectedIndex && 'font-semibold',
              )}
            >
              <BodyText className="min-w-5 text-text-muted">{index + 1}.</BodyText>
              <BodyText>{option.name}</BodyText>
            </Button>
          ))}
        </VStack>
      )}
    </VStack>
  )
}
