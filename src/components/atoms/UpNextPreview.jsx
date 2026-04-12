import Container from './Container'
import { BodyText } from './Typography'
import { VStack } from '../layout/Stack'

export default function UpNextPreview({ label }) {
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
        <BodyText tone="muted">{label}</BodyText>
      </VStack>
    </Container>
  )
}
