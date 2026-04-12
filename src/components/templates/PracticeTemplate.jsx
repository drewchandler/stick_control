import { VStack } from '../layout/Stack'
import Card from '../atoms/Card'
import { Title, Subtitle } from '../atoms/Typography'
import Container from '../atoms/Container'

function PageShell({ children }) {
  return (
    <Container as="main" kind="pageShell">
      {children}
    </Container>
  )
}

function HeaderBlock({ title, subtitle, accessory }) {
  return (
    <VStack as="header" gap={6} width="full">
      <Container>
        <Title>{title}</Title>
      </Container>
      {subtitle ? (
        <Container>
          <Subtitle>{subtitle}</Subtitle>
        </Container>
      ) : null}
      {accessory}
    </VStack>
  )
}

export default function PracticeTemplate({
  title,
  subtitle,
  headerAccessory = null,
  notation,
  transportDock,
  modals,
  toast,
  children,
}) {
  return (
    <PageShell>
      <VStack gap={12} align="center">
        <HeaderBlock title={title} subtitle={subtitle} accessory={headerAccessory} />
        <Card inset>{notation}</Card>
        <Container width="full">{transportDock}</Container>
      </VStack>
      {children}
      {modals}
      {toast}
    </PageShell>
  )
}
