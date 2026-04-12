import { Pause, Play, SkipBack, SkipForward } from 'lucide-react'
import { HStack } from '../layout/Stack'
import IconButton from '../atoms/IconButton'
import Button from '../atoms/Button'
import TempoControl from './TempoControl'

export default function TransportPrimaryControls({
  hasExercises,
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
      <TempoControl
        tempoInput={tempoInput}
        onTempoInputChange={onTempoInputChange}
        onTempoCommit={onTempoInputCommit}
        onTempoAdjust={onTempoAdjust}
      />
      <IconButton disabled={!hasExercises} onClick={onPrevious} aria-label="Previous exercise">
        <SkipBack size={18} />
      </IconButton>
      <Button
        variant="dark"
        size="iconLg"
        radius="full"
        disabled={!hasExercises}
        onClick={onPlayPause}
        aria-label={playPauseLabel}
      >
        {isTransportRunning ? <Pause size={24} /> : <Play size={24} />}
      </Button>
      <IconButton disabled={!hasExercises} onClick={onNext} aria-label="Next exercise">
        <SkipForward size={18} />
      </IconButton>
    </HStack>
  )
}
