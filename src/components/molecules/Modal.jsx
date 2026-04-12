import Card from '../atoms/Card'
import ModalOverlay from '../atoms/ModalOverlay'
import Button from '../atoms/Button'
import { HStack, VStack } from '../layout/Stack'
import { SectionTitle } from '../atoms/Typography'

export default function Modal({ open, cardWidth = 'md', title, children, onClose }) {
  if (!open) {
    return null
  }

  return (
    <ModalOverlay onBackdropClick={onClose}>
      <Card variant="modal" width={cardWidth}>
        <VStack gap={14}>
          <HStack justify="between" align="start">
            {title ? <SectionTitle>{title}</SectionTitle> : <span />}
            <Button
              variant="ghost"
              size="iconSm"
              aria-label="Close modal"
              title="Close"
              onClick={onClose}
              className="shrink-0 text-text-subtle"
            >
              ×
            </Button>
          </HStack>
          {children}
        </VStack>
      </Card>
    </ModalOverlay>
  )
}
