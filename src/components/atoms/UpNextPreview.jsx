import Container from './Container'
import { BodyText } from './Typography'
import { VStack } from '../layout/Stack'

export default function UpNextPreview({ label }) {
  return (
    <Container
      tone="subtle"
      rounded="lg"
      border
      padding="sm"
      width="full"
      className="border-sky-200 bg-sky-50/60"
      aria-live="polite"
    >
      <VStack gap={2} align="start">
        <BodyText tone="labelXs" className="text-sky-700">
          Up next
        </BodyText>
        <BodyText className="text-slate-600">{label}</BodyText>
      </VStack>
    </Container>
  )
}
