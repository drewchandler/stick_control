import Card from '../atoms/Card'
import { SectionTitle } from '../atoms/Typography'

export default function Modal({ open, cardWidth = 'md', title, children }) {
  if (!open) {
    return null
  }

  return (
    <Card variant="modal" width={cardWidth}>
      {title ? <SectionTitle>{title}</SectionTitle> : null}
      {children}
    </Card>
  )
}
