import { useEffect, useMemo, useRef, useState } from 'react'
import { Annotation, BarlineType, Dot, Formatter, Renderer, Stave, StaveNote, Stem, Voice } from 'vexflow'

const PULSES_PER_QUARTER = 24
const STAFF_STEPS = ['c', 'd', 'e', 'f', 'g', 'a', 'b']
const STEP_TO_DIATONIC = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
}
const MIDDLE_LINE_DIATONIC = 4 * 7 + STEP_TO_DIATONIC.B

const DURATION_CANDIDATES = [
  { pulses: 96, duration: 'w', dots: 0 },
  { pulses: 72, duration: 'h', dots: 1 },
  { pulses: 48, duration: 'h', dots: 0 },
  { pulses: 36, duration: 'q', dots: 1 },
  { pulses: 24, duration: 'q', dots: 0 },
  { pulses: 18, duration: '8', dots: 1 },
  { pulses: 12, duration: '8', dots: 0 },
  { pulses: 9, duration: '16', dots: 1 },
  { pulses: 8, duration: '8', dots: 0 },
  { pulses: 6, duration: '16', dots: 0 },
  { pulses: 3, duration: '32', dots: 0 },
]

function rhythmMeasuresFromRhythm(rhythm) {
  if (!rhythm) {
    return []
  }
  if (rhythm.measures?.length) {
    return rhythm.measures
  }
  return [
    {
      startPulse: 0,
      pulsesPerBar: Math.max(1, rhythm.pulsesPerExercise ?? rhythm.pulsesPerBar ?? 1),
      beats: rhythm.beats ?? 4,
      beatType: rhythm.beatType ?? 4,
    },
  ]
}

function closestDurationForPulses(pulses) {
  const safePulses = Math.max(1, Number(pulses) || PULSES_PER_QUARTER)
  let best = DURATION_CANDIDATES[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of DURATION_CANDIDATES) {
    const distance = Math.abs(candidate.pulses - safePulses)
    if (distance < bestDistance || (distance === bestDistance && candidate.pulses <= safePulses)) {
      best = candidate
      bestDistance = distance
    }
  }
  return best
}

function keyForStaffOffset(staffOffset) {
  const diatonic = MIDDLE_LINE_DIATONIC + Math.round(Number(staffOffset) || 0)
  const octave = Math.floor(diatonic / 7)
  const stepIndex = ((diatonic % 7) + 7) % 7
  return `${STAFF_STEPS[stepIndex]}/${octave}`
}

function signatureChanged(previousMeasure, measure) {
  if (!previousMeasure) {
    return true
  }
  return previousMeasure.beats !== measure.beats || previousMeasure.beatType !== measure.beatType
}

function createVexNote(note, isActive) {
  const { duration, dots } = closestDurationForPulses(note.durationPulses)
  const vexNote = new StaveNote({
    clef: 'percussion',
    keys: [keyForStaffOffset(note.staffOffset)],
    duration,
    stem_direction: Stem.UP,
  })

  for (let dotIndex = 0; dotIndex < dots; dotIndex += 1) {
    vexNote.addModifier(new Dot(), 0)
  }

  if (note.stick) {
    vexNote.addModifier(
      new Annotation(String(note.stick))
        .setJustification(Annotation.HorizontalJustify.CENTER)
        .setVerticalJustification(Annotation.VerticalJustify.BOTTOM),
      0,
    )
  }

  if (isActive) {
    const activeColor = '#d52a2a'
    vexNote.setStyle({ fillStyle: activeColor, strokeStyle: activeColor })
    vexNote.setStemStyle({ strokeStyle: activeColor })
    vexNote.setFlagStyle({ fillStyle: activeColor, strokeStyle: activeColor })
  }

  return vexNote
}

function VexflowStaff({ rhythm, activeNoteIndex }) {
  const scrollRef = useRef(null)
  const hostRef = useRef(null)
  const [hostWidth, setHostWidth] = useState(1080)

  const measures = useMemo(() => rhythmMeasuresFromRhythm(rhythm), [rhythm])
  const indexedNotes = useMemo(
    () => (rhythm?.notes ?? []).map((note, index) => ({ ...note, globalIndex: index })),
    [rhythm],
  )

  useEffect(() => {
    const element = scrollRef.current
    if (!element) {
      return undefined
    }

    const updateWidth = () => {
      setHostWidth(Math.max(320, Math.floor(element.clientWidth || 1080)))
    }

    updateWidth()
    const resizeObserver = window.ResizeObserver ? new window.ResizeObserver(updateWidth) : null
    if (resizeObserver) {
      resizeObserver.observe(element)
      return () => {
        resizeObserver.disconnect()
      }
    }

    window.addEventListener('resize', updateWidth)
    return () => {
      window.removeEventListener('resize', updateWidth)
    }
  }, [])

  useEffect(() => {
    const hostElement = hostRef.current
    if (!hostElement) {
      return
    }
    hostElement.innerHTML = ''

    if (!rhythm || !measures.length) {
      return
    }

    try {
      const totalPulses = Math.max(1, measures.reduce((sum, measure) => sum + measure.pulsesPerBar, 0))
      const renderWidth = Math.max(hostWidth, measures.length * 250 + 72)
      const renderHeight = 188
      const renderer = new Renderer(hostElement, Renderer.Backends.SVG)
      renderer.resize(renderWidth, renderHeight)
      const context = renderer.getContext()
      context.setFont('Arial', 12, '')

      let noteCursor = 0
      let x = 28
      let previousMeasure = null

      for (let measureIndex = 0; measureIndex < measures.length; measureIndex += 1) {
        const measure = measures[measureIndex]
        const remainingWidth = renderWidth - x - 28
        const remainingMeasures = measures.length - measureIndex
        const proportionalWidth = Math.round((measure.pulsesPerBar / totalPulses) * (renderWidth - 56))
        const measureWidth =
          measureIndex === measures.length - 1
            ? Math.max(170, remainingWidth)
            : Math.max(170, Math.min(remainingWidth - (remainingMeasures - 1) * 170, proportionalWidth))

        const stave = new Stave(x, 28, measureWidth)
        stave.setClef('percussion')
        if (signatureChanged(previousMeasure, measure)) {
          stave.addTimeSignature(`${measure.beats}/${measure.beatType}`)
        }
        stave.setEndBarType(measureIndex === measures.length - 1 ? BarlineType.END : BarlineType.SINGLE)
        stave.setContext(context).draw()

        const measureStart = measure.startPulse
        const measureEnd = measureStart + measure.pulsesPerBar
        const measureNotes = []

        while (
          noteCursor < indexedNotes.length &&
          indexedNotes[noteCursor].startPulse >= measureStart &&
          indexedNotes[noteCursor].startPulse < measureEnd
        ) {
          const note = indexedNotes[noteCursor]
          measureNotes.push(createVexNote(note, note.globalIndex === activeNoteIndex))
          noteCursor += 1
        }

        if (measureNotes.length) {
          const voice = new Voice({
            num_beats: Math.max(1, Number(measure.beats) || 4),
            beat_value: Math.max(1, Number(measure.beatType) || 4),
          })
          voice.setMode(Voice.Mode.SOFT)
          voice.addTickables(measureNotes)
          new Formatter().joinVoices([voice]).format([voice], Math.max(72, measureWidth - 28))
          voice.draw(context, stave)
        }

        previousMeasure = measure
        x += measureWidth
      }
    } catch (error) {
      // Rendering failures should not break transport controls or playback.
      // We keep the notation area empty and log details for debugging.
      console.error('VexFlow render failed:', error)
    }
  }, [activeNoteIndex, hostWidth, indexedNotes, measures, rhythm])

  if (!rhythm) {
    return (
      <div className="notation-surface notation-empty">
        <p className="staff-empty-message">Load a MusicXML file to display notation.</p>
      </div>
    )
  }

  return (
    <div className="notation-surface">
      <div ref={scrollRef} className="vexflow-scroll" aria-label="Snare drum sticking staff">
        <div ref={hostRef} className="vexflow-host" />
      </div>
    </div>
  )
}

export default VexflowStaff
