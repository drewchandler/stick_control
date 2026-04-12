export default function ModalOverlay({ children, onBackdropClick }) {
  function handleMouseDown(event) {
    if (event.target === event.currentTarget) {
      onBackdropClick?.()
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-overlay p-3 pt-8 sm:items-center sm:p-6"
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  )
}
