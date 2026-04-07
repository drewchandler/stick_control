import { HStack, VStack } from '../layout/Stack'
import Pill from '../atoms/Pill'
import Card from '../atoms/Card'
import { BodyText } from '../atoms/Typography'

export default function StatusPanel({
  hasRhythms,
  exerciseIndex,
  exerciseCount,
  exerciseSelector,
  currentRep,
  repetitions,
  currentBeat,
  statusLabel,
  importError,
}) {
  return (
    <Card as={VStack} spacing={3} variant="surface">
      {exerciseSelector}
      <HStack className="flex-wrap gap-2">
        <Pill>Rhythm {hasRhythms ? `${exerciseIndex + 1}/${exerciseCount}` : '0/0'}</Pill>
        <Pill>
          Rep {currentRep}/{repetitions}
        </Pill>
        <Pill>Beat {currentBeat}</Pill>
        <Pill strong>{statusLabel}</Pill>
      </HStack>
      {importError ? <BodyText tone="danger">{importError}</BodyText> : null}
    </Card>
  )
}
