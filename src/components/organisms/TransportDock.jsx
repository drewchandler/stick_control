import { Settings, Upload } from 'lucide-react'
import { VStack } from '../layout/Stack'
import Button from '../atoms/Button'
import Container from '../atoms/Container'
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
    <Card variant="surface" className="mt-2">
      <VStack spacing={8}>
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
        <Container columns={2} gap={8}>
          <Button variant="muted" className="justify-start" onClick={onOpenLibrary} aria-label="Open upload options">
            <Upload size={18} />
            <span>Library</span>
          </Button>
          <Button variant="muted" className="justify-start" onClick={onOpenSettings} aria-label="Open settings">
            <Settings size={18} />
            <span>Settings</span>
          </Button>
        </Container>
      </VStack>
    </Card>
  )
}
