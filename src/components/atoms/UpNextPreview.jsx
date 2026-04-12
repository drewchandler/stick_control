import Container from './Container'
import { BodyText } from './Typography'
import { VStack } from '../layout/Stack'
import VexflowStaff from '../../VexflowStaff'

export default function UpNextPreview({ exercise }) {
  if (!exercise) {
    return null
  }

  return (
    <Container
      tone="upnext"
      rounded="lg"
      border
      padding="sm"
      width="full"
      aria-live="polite"
    >
      <VStack gap={2} align="start">
        <BodyText tone="labelXs" className="text-upnext-label">
          Up next
        </BodyText>
        <BodyText tone="muted">{exercise.name}</BodyText>
        <VexflowStaff exercise={exercise} previewMode />
      </VStack>
    </Container>
  )
}
