import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { HStack } from '../layout/Stack'
import IconButton from '../atoms/IconButton'
import Button from '../atoms/Button'
import TempoControl from './TempoControl'

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
    <HStack gap={8} justify="center" intrinsicWidth>
      <IconButton disabled={!hasRhythms} onClick={onPrevious} aria-label="Previous rhythm">
        <SkipBack size={18} />
      </IconButton>
      <Button
        variant="dark"
        size="iconLg"
        radius="full"
        disabled={!hasRhythms}
        onClick={onPlayPause}
        aria-label={playPauseLabel}
      >
        {isTransportRunning ? <Pause size={24} /> : <Play size={24} />}
      </Button>
      <IconButton disabled={!hasRhythms} onClick={onNext} aria-label="Next rhythm">
        <SkipForward size={18} />
      </IconButton>
      <TempoControl
        tempoInput={tempoInput}
        onTempoInputChange={onTempoInputChange}
        onTempoCommit={onTempoInputCommit}
        onTempoAdjust={onTempoAdjust}
      />
    </HStack>
  )
}
