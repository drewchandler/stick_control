import { cn } from '../../lib/cn'
import SurfaceCard from './SurfaceCard'
import Container from './Container'
import { SectionTitle } from './Typography'

export default function ModalCard({ title, className = '', children, ...props }) {
  return (
    <SurfaceCard
      className={cn(
        'w-full max-w-xl rounded-none border-0 bg-white p-4 text-neutral-900 shadow-none sm:rounded-xl sm:border sm:border-slate-200 sm:p-5 sm:shadow-lg',
        className,
      )}
      {...props}
    >
      {title ? (
        <Container className="mb-2">
          <SectionTitle>{title}</SectionTitle>
        </Container>
      ) : null}
      {children}
    </SurfaceCard>
  )
}
