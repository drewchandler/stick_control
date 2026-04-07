import Button from '../atoms/Button'
import TextInput from '../atoms/TextInput'
import { BodyText } from '../atoms/Typography'
import { HStack } from '../layout/Stack'
import Container from '../atoms/Container'

export default function TempoControl({
  tempoInput,
  onTempoInputChange,
  onTempoCommit,
  onTempoAdjust,
}) {
  return (
    <Container variant="tempoControl" as={HStack} gap={2} align="center" aria-label="Tempo control">
      <Button variant="ghost" size="icon-sm" aria-label="Decrease tempo" onClick={() => onTempoAdjust(-1)}>
        -
      </Button>
      <TextInput
        value={tempoInput}
        onChange={onTempoInputChange}
        onBlur={onTempoCommit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            onTempoCommit()
          }
        }}
        variant="tempo"
        inputMode="numeric"
        aria-label="Tempo BPM"
      />
      <BodyText tone="mutedCenter">
        BPM
      </BodyText>
      <Button variant="ghost" size="icon-sm" aria-label="Increase tempo" onClick={() => onTempoAdjust(1)}>
        +
      </Button>
    </Container>
  )
}
