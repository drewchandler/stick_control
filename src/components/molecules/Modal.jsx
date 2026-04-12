import Card from '../atoms/Card'

export default function Modal({ open, cardWidth = 'md', title, children }) {
  if (!open) {
    return null
  }

  return (
    <Card variant="modal" width={cardWidth}>
      {title ? <h2 className="mb-3 text-lg font-semibold text-slate-900">{title}</h2> : null}
      {children}
    </Card>
  )
}
