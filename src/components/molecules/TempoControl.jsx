import Button from '../atoms/Button'
import TextInput from '../atoms/TextInput'
import { HStack } from '../layout/Stack'

export default function TempoControl({
  tempoInput,
  onTempoInputChange,
  onTempoCommit,
  onTempoAdjust,
}) {
  return (
    <HStack gap={4} align="items-center" aria-label="Tempo control" className="rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
      <Button
        variant="ghost"
        size="iconSm"
        className="h-8 w-8 min-w-8 rounded-md"
        aria-label="Decrease tempo"
        onClick={() => onTempoAdjust(-1)}
      >
        -
      </Button>
      <TextInput
        className="h-8 w-14 min-w-14 px-2 py-1 text-center font-semibold"
        value={tempoInput}
        onChange={onTempoInputChange}
        onBlur={onTempoCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onTempoCommit()
          }
        }}
        inputMode="numeric"
        aria-label="Tempo BPM"
      />
      <span className="text-xs font-semibold tracking-wide text-slate-600">
        BPM
      </span>
      <Button
        variant="ghost"
        size="iconSm"
        className="h-8 w-8 min-w-8 rounded-md"
        aria-label="Increase tempo"
        onClick={() => onTempoAdjust(1)}
      >
        +
      </Button>
    </HStack>
  )
}
