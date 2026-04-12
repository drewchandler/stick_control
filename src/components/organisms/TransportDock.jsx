import { Settings, Upload } from 'lucide-react'
import { HStack } from '../layout/Stack'
import Button from '../atoms/Button'
import TransportPrimaryControls from '../molecules/TransportPrimaryControls'
import Card from '../atoms/Card'

export default function TransportDock({
  hasRhythms,
  isTransportRunning,
  playPauseLabel,
  onPrevious,
  onPlay,
  onPause,
  onNext,
  tempoInput,
  onTempoInputChange,
  onTempoInputCommit,
  onTempoAdjust,
  onOpenLibrary,
  onOpenSettings,
}) {
  const onPlayPause = isTransportRunning ? onPause : onPlay

  return (
    <Card variant="surface" className="mt-2 overflow-x-auto">
      <HStack gap={8} className="min-w-max">
        <TransportPrimaryControls
          hasRhythms={hasRhythms}
          isTransportRunning={isTransportRunning}
          playPauseLabel={playPauseLabel}
          onPrevious={onPrevious}
          onPlayPause={onPlayPause}
          onNext={onNext}
          tempoInput={tempoInput}
          onTempoInputChange={onTempoInputChange}
          onTempoInputCommit={onTempoInputCommit}
          onTempoAdjust={onTempoAdjust}
        />
        <Button variant="muted" className="transport-action-button" onClick={onOpenLibrary} aria-label="Open upload options">
          <Upload size={16} />
          <span>Library</span>
        </Button>
        <Button variant="muted" className="transport-action-button" onClick={onOpenSettings} aria-label="Open settings">
          <Settings size={16} />
          <span>Settings</span>
        </Button>
      </HStack>
    </Card>
  )
}
