import Card from '../atoms/Card'

export default function Modal({ open, cardWidth = 'md', title, children }) {
  if (!open) {
    return null
  }

  return (
    <Card variant="modal" width={cardWidth} title={title}>
      {children}
    </Card>
  )
}
