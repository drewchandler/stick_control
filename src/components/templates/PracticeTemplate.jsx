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

function HeaderBlock({ title, subtitle }) {
  return (
    <Container as="header" kind="pageHeader">
      <Title>{title}</Title>
      {subtitle ? <Subtitle>{subtitle}</Subtitle> : null}
    </Container>
  )
}

export default function PracticeTemplate({ title, subtitle, notation, transportDock, modals, toast, children }) {
  return (
    <PageShell>
      <VStack gap={12}>
        <HeaderBlock title={title} subtitle={subtitle} />
        <Card inset>{notation}</Card>
        {transportDock}
      </VStack>
      {children}
      {modals}
      {toast}
    </PageShell>
  )
}
