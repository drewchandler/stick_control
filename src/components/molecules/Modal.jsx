import Card from '../atoms/Card'
import ModalOverlay from '../atoms/ModalOverlay'
import { SectionTitle } from '../atoms/Typography'

export default function Modal({ open, cardWidth = 'md', title, children, onClose }) {
  if (!open) {
    return null
  }

  return (
    <ModalOverlay onBackdropClick={onClose}>
      <Card variant="modal" width={cardWidth}>
        {title ? <SectionTitle>{title}</SectionTitle> : null}
        {children}
      </Card>
    </ModalOverlay>
  )
}
