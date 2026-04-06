import { useEffect, useMemo, useRef, useState } from 'react'
import { Annotation, BarlineType, Beam, Dot, Formatter, Fraction, Renderer, Stave, StaveNote, Stem, Tuplet, Voice } from 'vexflow'

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

const DURATION_TOKENS = [
  { pulses: 96, duration: 'w', dots: 0, cost: 1 },
  { pulses: 72, duration: 'h', dots: 1, cost: 1.15 },
  { pulses: 48, duration: 'h', dots: 0, cost: 1 },
  { pulses: 36, duration: 'q', dots: 1, cost: 1.15 },
  { pulses: 24, duration: 'q', dots: 0, cost: 1 },
  { pulses: 18, duration: '8', dots: 1, cost: 1.2 },
  { pulses: 12, duration: '8', dots: 0, cost: 1.05 },
  { pulses: 9, duration: '16', dots: 1, cost: 1.22 },
  { pulses: 8, duration: '8', dots: 0, cost: 1.4, triplet: { id: 'triplet-8', numNotes: 3, notesOccupied: 2 } },
  { pulses: 6, duration: '16', dots: 0, cost: 1.1 },
  { pulses: 4, duration: '16', dots: 0, cost: 1.45, triplet: { id: 'triplet-16', numNotes: 3, notesOccupied: 2 } },
  { pulses: 3, duration: '32', dots: 0, cost: 1.15 },
]

const FALLBACK_DURATION_TOKEN = DURATION_TOKENS[DURATION_TOKENS.length - 1]

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
  let best = DURATION_TOKENS[0]
  let bestDistance = Number.POSITIVE_INFINITY
  for (const candidate of DURATION_TOKENS) {
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

function decomposeRestDuration(totalPulses) {
  const target = Math.max(0, Math.round(Number(totalPulses) || 0))
  if (target <= 0) {
    return []
  }

  const bestByPulses = Array.from({ length: target + 1 }, () => null)
  bestByPulses[0] = { cost: 0, tokens: [] }

  for (let pulseCount = 1; pulseCount <= target; pulseCount += 1) {
    let best = null
    for (const token of DURATION_TOKENS) {
      if (token.pulses > pulseCount) {
        continue
      }
      const previous = bestByPulses[pulseCount - token.pulses]
      if (!previous) {
        continue
      }
      const option = {
        cost: previous.cost + token.cost,
        tokens: [...previous.tokens, token],
      }
      if (!best || option.cost < best.cost || (option.cost === best.cost && option.tokens.length < best.tokens.length)) {
        best = option
      }
    }
    bestByPulses[pulseCount] = best
  }

  if (bestByPulses[target]) {
    return bestByPulses[target].tokens
  }

  const fallback = []
  let remaining = target
  while (remaining > 0) {
    const token = DURATION_TOKENS.find((candidate) => candidate.pulses <= remaining) ?? FALLBACK_DURATION_TOKEN
    fallback.push(token)
    remaining = Math.max(0, remaining - token.pulses)
  }
  return fallback
}

function createVexNote(note, isActive, durationToken) {
  const { duration, dots } = durationToken
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

function createRestNote(durationToken) {
  const { duration, dots } = durationToken
  const vexRest = new StaveNote({
    clef: 'percussion',
    keys: ['b/4'],
    duration: `${duration}r`,
    stem_direction: Stem.UP,
  })
  for (let dotIndex = 0; dotIndex < dots; dotIndex += 1) {
    vexRest.addModifier(new Dot(), 0)
  }
  return vexRest
}

function buildMeasureSegments(measure, indexedNotes, cursorStart) {
  const measureStart = measure.startPulse
  const measureEnd = measureStart + measure.pulsesPerBar
  let noteCursor = cursorStart
  const notesInMeasure = []

  while (noteCursor < indexedNotes.length) {
    const note = indexedNotes[noteCursor]
    if (note.startPulse < measureStart) {
      noteCursor += 1
      continue
    }
    if (note.startPulse >= measureEnd) {
      break
    }
    notesInMeasure.push(note)
    noteCursor += 1
  }

  if (!notesInMeasure.length) {
    return {
      nextCursor: noteCursor,
      segments: [{ kind: 'rest', durationPulses: measure.pulsesPerBar }],
    }
  }

  const noteByStart = new Map()
  for (const note of notesInMeasure) {
    const localStart = Math.max(0, Math.min(measure.pulsesPerBar - 1, note.startPulse - measureStart))
    if (!noteByStart.has(localStart)) {
      noteByStart.set(localStart, note)
    }
  }
  const starts = Array.from(noteByStart.keys()).sort((a, b) => a - b)

  const segments = []
  let pulseCursor = 0
  for (let index = 0; index < starts.length; index += 1) {
    const start = starts[index]
    if (start > pulseCursor) {
      segments.push({ kind: 'rest', durationPulses: start - pulseCursor })
    }

    const note = noteByStart.get(start)
    const nextStart = index + 1 < starts.length ? starts[index + 1] : measure.pulsesPerBar
    const maximumDuration = Math.max(1, nextStart - start)
    const noteDuration = Math.max(1, Math.min(Math.round(note.durationPulses || 1), maximumDuration))
    segments.push({ kind: 'note', durationPulses: noteDuration, note })
    pulseCursor = start + noteDuration
  }

  if (pulseCursor < measure.pulsesPerBar) {
    segments.push({ kind: 'rest', durationPulses: measure.pulsesPerBar - pulseCursor })
  }

  return { nextCursor: noteCursor, segments }
}

function buildTupletsForEntries(entries) {
  const tuplets = []
  let index = 0
  while (index < entries.length) {
    const triplet = entries[index].triplet
    if (!triplet) {
      index += 1
      continue
    }
    const a = entries[index]
    const b = entries[index + 1]
    const c = entries[index + 2]
    if (a && b && c && b.triplet?.id === triplet.id && c.triplet?.id === triplet.id) {
      const tuplet = new Tuplet([a.note, b.note, c.note], {
        num_notes: triplet.numNotes,
        notes_occupied: triplet.notesOccupied,
      })
      tuplet.setRatioed(false)
      tuplets.push(tuplet)
      index += 3
    } else {
      index += 1
    }
  }
  return tuplets
}

function generateBeamsForMeasure(notes, measure) {
  if (!notes.length) {
    return []
  }
  const beatType = Math.max(1, Number(measure.beatType) || 4)
  return Beam.generateBeams(notes, {
    groups: [new Fraction(1, beatType)],
    beam_rests: false,
    maintain_stem_directions: true,
  })
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
        if (measureIndex === 0) {
          stave.setClef('percussion')
        }
        if (signatureChanged(previousMeasure, measure)) {
          stave.addTimeSignature(`${measure.beats}/${measure.beatType}`)
        }
        stave.setEndBarType(measureIndex === measures.length - 1 ? BarlineType.END : BarlineType.SINGLE)
        stave.setContext(context).draw()

        const { nextCursor, segments } = buildMeasureSegments(measure, indexedNotes, noteCursor)
        noteCursor = nextCursor
        const entries = []
        for (const segment of segments) {
          if (segment.kind === 'note') {
            const durationToken = closestDurationForPulses(segment.durationPulses)
            entries.push({
              note: createVexNote(segment.note, segment.note.globalIndex === activeNoteIndex, durationToken),
              triplet: durationToken.triplet ?? null,
            })
            continue
          }
          const restTokens = decomposeRestDuration(segment.durationPulses)
          for (const restToken of restTokens) {
            entries.push({
              note: createRestNote(restToken),
              triplet: restToken.triplet ?? null,
            })
          }
        }

        if (entries.length) {
          const measureNotes = entries.map((entry) => entry.note)
          const voice = new Voice({
            num_beats: Math.max(1, Number(measure.beats) || 4),
            beat_value: Math.max(1, Number(measure.beatType) || 4),
          })
          voice.setMode(Voice.Mode.SOFT)
          voice.addTickables(measureNotes)
          new Formatter().joinVoices([voice]).formatToStave([voice], stave)
          voice.draw(context, stave)
          const beams = generateBeamsForMeasure(measureNotes, measure)
          for (const beam of beams) {
            beam.setContext(context).draw()
          }
          const tuplets = buildTupletsForEntries(entries)
          for (const tuplet of tuplets) {
            tuplet.setContext(context).draw()
          }
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
