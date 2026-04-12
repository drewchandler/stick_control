import Container from '../atoms/Container'
import TempoControlBox from '../atoms/TempoControlBox'

export default function TempoControl({
  tempoInput,
  onTempoInputChange,
  onTempoCommit,
  onTempoAdjust,
}) {
  return (
    <Container tone="subtle" rounded="xl" padding="xs" border aria-label="Tempo control">
      <TempoControlBox
        tempoInput={tempoInput}
        onTempoInputChange={onTempoInputChange}
        onTempoCommit={onTempoCommit}
        onTempoAdjust={onTempoAdjust}
      />
    </Container>
  )
}
