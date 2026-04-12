import Button from './Button'
import TextInput from './TextInput'
import { BodyText } from './Typography'
import { HStack } from '../layout/Stack'

export default function TempoControlBox({
  tempoInput,
  onTempoInputChange,
  onTempoCommit,
  onTempoAdjust,
}) {
  return (
    <HStack gap={4} align="center" aria-label="Tempo control">
      <Button variant="ghost" size="iconXs" aria-label="Decrease tempo" onClick={() => onTempoAdjust(-1)}>
        -
      </Button>
      <TextInput
        size="tempo"
        width="auto"
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
      <BodyText tone="labelXs">BPM</BodyText>
      <Button variant="ghost" size="iconXs" aria-label="Increase tempo" onClick={() => onTempoAdjust(1)}>
        +
      </Button>
    </HStack>
  )
}
