import Pill from './Pill'

export default function RepCountdownBadge({ remainingReps, currentRep, repetitions }) {
  return (
    <Pill
      aria-label={`${remainingReps} repetitions remaining`}
      title={`${currentRep} completed of ${repetitions}`}
    >
      :| {remainingReps} |:
    </Pill>
  )
}
