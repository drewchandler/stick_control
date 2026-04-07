import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { HStack, VStack } from '../layout/Stack'
import IconButton from '../atoms/IconButton'
import Button from '../atoms/Button'
import TempoControl from './TempoControl'
import Container from '../atoms/Container'

export default function TransportPrimaryControls({
  hasRhythms,
  isTransportRunning,
  playPauseLabel,
  onPrevious,
  onPlayPause,
  onNext,
  tempoInput,
  onTempoInputChange,
  onTempoInputCommit,
  onTempoAdjust,
}) {
  return (
    <VStack spacing={8}>
      <HStack gap={12} justify="justify-center">
        <IconButton
          disabled={!hasRhythms}
          onClick={onPrevious}
          aria-label="Previous rhythm"
        >
          <SkipBack size={18} />
        </IconButton>
        <Button variant="dark" size="iconLg" className="rounded-full" disabled={!hasRhythms} onClick={onPlayPause} aria-label={playPauseLabel}>
          {isTransportRunning ? <Pause size={24} /> : <Play size={24} />}
        </Button>
        <IconButton
          disabled={!hasRhythms}
          onClick={onNext}
          aria-label="Next rhythm"
        >
          <SkipForward size={18} />
        </IconButton>
      </HStack>
      <Container tone="subtle" rounded="xl" padding="sm" border>
        <TempoControl
          tempoInput={tempoInput}
          onTempoInputChange={onTempoInputChange}
          onTempoCommit={onTempoInputCommit}
          onTempoAdjust={onTempoAdjust}
        />
      </Container>
    </VStack>
  )
}
