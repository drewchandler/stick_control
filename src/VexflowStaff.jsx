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

function exerciseMeasuresFromExercise(exercise) {
  if (!exercise) {
    return []
  }
  if (exercise.measures?.length) {
    return exercise.measures
  }
  return [
    {
      startPulse: 0,
      pulsesPerBar: Math.max(1, exercise.pulsesPerExercise ?? exercise.pulsesPerBar ?? 1),
      beats: exercise.beats ?? 4,
      beatType: exercise.beatType ?? 4,
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
  return (
    previousMeasure.beats !== measure.beats ||
    previousMeasure.beatType !== measure.beatType ||
    previousMeasure.timeSymbol !== measure.timeSymbol
  )
}

function timeSignatureSpecForMeasure(measure) {
  const symbol = String(measure?.timeSymbol ?? '').toLowerCase()
  if (symbol === 'cut') {
    return 'C|'
  }
  if (symbol === 'common') {
    return 'C'
  }
  return `${measure.beats}/${measure.beatType}`
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

function applyNoteColor(vexNote, color) {
  vexNote.setStyle({ fillStyle: color, strokeStyle: color })
  vexNote.setStemStyle({ strokeStyle: color })
  vexNote.setFlagStyle({ fillStyle: color, strokeStyle: color })
}

function createVexNote(note, isActive, durationToken, activeColor, baseColor) {
  const { duration, dots } = durationToken
  const vexNote = new StaveNote({
    clef: 'percussion',
    keys: [keyForStaffOffset(note.staffOffset)],
    duration,
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

  applyNoteColor(vexNote, isActive ? activeColor : baseColor)

  return vexNote
}

function createRestNote(durationToken, baseColor) {
  const { duration, dots } = durationToken
  const vexRest = new StaveNote({
    clef: 'percussion',
    keys: ['b/4'],
    duration: `${duration}r`,
  })
  for (let dotIndex = 0; dotIndex < dots; dotIndex += 1) {
    vexRest.addModifier(new Dot(), 0)
  }
  applyNoteColor(vexRest, baseColor)
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
  })
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value))
}

function averageNotesPerMeasure(measures, indexedNotes) {
  if (!measures.length) {
    return 0
  }
  return indexedNotes.length / measures.length
}

function renderProfileForHostWidth(hostWidth, noteDensity) {
  const safeWidth = Math.max(320, Math.round(Number(hostWidth) || 320))
  const baseScale =
    safeWidth <= 480 ? 0.9 : safeWidth <= 720 ? 0.96 : safeWidth <= 960 ? 1.02 : clamp(safeWidth / 960, 1.02, 1.08)
  const densityTightening = noteDensity >= 10 ? 0.12 : noteDensity >= 7 ? 0.07 : noteDensity >= 5 ? 0.04 : 0
  const scale = clamp(baseScale - densityTightening, 0.72, 1.08)
  const minMeasureWidthBase = safeWidth < 560 ? 96 : safeWidth < 900 ? 120 : 144
  const minMeasureWidth = Math.max(76, Math.round(minMeasureWidthBase * (1 - densityTightening * 0.95)))
  const rowHeightBase = safeWidth < 560 ? 124 : safeWidth < 900 ? 132 : 140
  const rowHeight = Math.round(rowHeightBase * (0.9 + scale * 0.14))
  return {
    scale,
    systemPaddingX: safeWidth < 560 ? 16 : safeWidth < 900 ? 20 : 24,
    topPadding: safeWidth < 560 ? 18 : 22,
    rowHeight,
    minMeasureWidth,
    fontSize: scale < 0.82 ? 10 : safeWidth < 560 ? 11 : 12,
  }
}

function splitMeasuresIntoRows(measures, logicalWidth, profile) {
  const availableWidth = Math.max(220, Math.round(logicalWidth) - profile.systemPaddingX * 2)
  const minMeasureWidth = profile.minMeasureWidth
  const maxMeasuresPerRow = Math.max(1, Math.floor(availableWidth / minMeasureWidth))
  const rows = []

  for (let startIndex = 0; startIndex < measures.length; startIndex += maxMeasuresPerRow) {
    rows.push({
      startIndex,
      endIndex: Math.min(measures.length, startIndex + maxMeasuresPerRow),
    })
  }
  return rows
}

function VexflowStaff({
  exercise,
  activeNoteIndex,
  currentBeat = '-',
  phase = 'stopped',
  countInBlinkTick = 0,
  remainingReps = null,
}) {
  const scrollRef = useRef(null)
  const hostRef = useRef(null)
  const [hostWidth, setHostWidth] = useState(1080)

  const measures = useMemo(() => exerciseMeasuresFromExercise(exercise), [exercise])
  const indexedNotes = useMemo(
    () => (exercise?.notes ?? []).map((note, index) => ({ ...note, globalIndex: index })),
    [exercise],
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

    if (!exercise || !measures.length) {
      return
    }

    try {
      const noteDensity = averageNotesPerMeasure(measures, indexedNotes)
      const profile = renderProfileForHostWidth(hostWidth, noteDensity)
      const renderWidth = Math.max(320, hostWidth)
      const logicalWidth = Math.max(280, Math.round(renderWidth / profile.scale))
      const measureRows = splitMeasuresIntoRows(measures, logicalWidth, profile)
      const logicalHeight = Math.max(176, profile.topPadding + measureRows.length * profile.rowHeight)
      const renderHeight = Math.max(188, Math.ceil(logicalHeight * profile.scale))
      const renderer = new Renderer(hostElement, Renderer.Backends.SVG)
      renderer.resize(renderWidth, renderHeight)
      const context = renderer.getContext()
      const computedStyle = window.getComputedStyle(document.documentElement)
      const getThemeColor = (tokenName, fallback) => {
        const resolved = computedStyle.getPropertyValue(tokenName)?.trim()
        return resolved || fallback
      }
      const repeatColor = getThemeColor('--color-text-muted', '#334155')
      const staffColor = getThemeColor('--color-notation-staff', '#0f172a')
      const activeColor = getThemeColor('--color-notation-active', '#d52a2a')
      context.scale(profile.scale, profile.scale)
      context.setFont('Arial', profile.fontSize, '')
      context.setFillStyle(staffColor)
      context.setStrokeStyle(staffColor)
      if (Number.isFinite(remainingReps)) {
        const repeatText = `|: ${Math.max(0, Math.round(remainingReps))} :|`
        context.save()
        context.setFont('Arial', Math.max(11, profile.fontSize), 'bold')
        context.setFillStyle(repeatColor)
        context.fillText(repeatText, logicalWidth - profile.systemPaddingX - 64, profile.topPadding - 4)
        context.restore()
      }

      let noteCursor = 0
      let previousMeasure = null

      for (const [rowIndex, row] of measureRows.entries()) {
        const rowMeasures = measures.slice(row.startIndex, row.endIndex)
        const rowPulses = Math.max(1, rowMeasures.reduce((sum, measure) => sum + measure.pulsesPerBar, 0))
        const rowY = profile.topPadding + rowIndex * profile.rowHeight
        let x = profile.systemPaddingX

        for (let localMeasureIndex = 0; localMeasureIndex < rowMeasures.length; localMeasureIndex += 1) {
          const measure = rowMeasures[localMeasureIndex]
          const globalMeasureIndex = row.startIndex + localMeasureIndex
          const remainingWidth = logicalWidth - x - profile.systemPaddingX
          const remainingMeasures = rowMeasures.length - localMeasureIndex
          const proportionalWidth = Math.round(
            (measure.pulsesPerBar / rowPulses) * (logicalWidth - profile.systemPaddingX * 2),
          )
          const minimumMeasureWidth = profile.minMeasureWidth
          const measureWidth =
            localMeasureIndex === rowMeasures.length - 1
              ? Math.max(minimumMeasureWidth, remainingWidth)
              : Math.max(
                  minimumMeasureWidth,
                  Math.min(remainingWidth - (remainingMeasures - 1) * minimumMeasureWidth, proportionalWidth),
                )

          const stave = new Stave(x, rowY, measureWidth)
          if (globalMeasureIndex === 0) {
            stave.setBegBarType(BarlineType.REPEAT_BEGIN)
          }
          if (globalMeasureIndex === 0) {
            stave.setClef('percussion')
          }
          if (signatureChanged(previousMeasure, measure)) {
            stave.addTimeSignature(timeSignatureSpecForMeasure(measure))
          }
          stave.setEndBarType(globalMeasureIndex === measures.length - 1 ? BarlineType.REPEAT_END : BarlineType.SINGLE)
          stave.setContext(context).draw()

          const { nextCursor, segments } = buildMeasureSegments(measure, indexedNotes, noteCursor)
          noteCursor = nextCursor
          const entries = []
          for (const segment of segments) {
            if (segment.kind === 'note') {
              const durationToken = closestDurationForPulses(segment.durationPulses)
              entries.push({
                note: createVexNote(
                  segment.note,
                  segment.note.globalIndex === activeNoteIndex,
                  durationToken,
                  activeColor,
                  staffColor,
                ),
                triplet: durationToken.triplet ?? null,
              })
              continue
            }
            const restTokens = decomposeRestDuration(segment.durationPulses)
            for (const restToken of restTokens) {
              entries.push({
                note: createRestNote(restToken, staffColor),
                triplet: restToken.triplet ?? null,
              })
            }
          }

          if (entries.length) {
            const measureNotes = entries.map((entry) => entry.note)
            // Generate beams before drawing notes so beamed notes do not render standalone flags.
            const beams = generateBeamsForMeasure(measureNotes, measure)
            const tuplets = buildTupletsForEntries(entries)
            const voice = new Voice({
              num_beats: Math.max(1, Number(measure.beats) || 4),
              beat_value: Math.max(1, Number(measure.beatType) || 4),
            })
            voice.setMode(Voice.Mode.SOFT)
            voice.addTickables(measureNotes)
            new Formatter().joinVoices([voice]).formatToStave([voice], stave)
            voice.draw(context, stave)
            for (const beam of beams) {
              beam.setContext(context).draw()
            }
            for (const tuplet of tuplets) {
              tuplet.setContext(context).draw()
            }
          }

          previousMeasure = measure
          x += measureWidth
        }
      }
    } catch (error) {
      // Rendering failures should not break transport controls or playback.
      // We keep the notation area empty and log details for debugging.
      console.error('VexFlow render failed:', error)
    }
  }, [activeNoteIndex, exercise, hostWidth, indexedNotes, measures, remainingReps])

  if (!exercise) {
    return (
      <div className="notation-surface notation-empty">
        <p className="staff-empty-message">Load a MusicXML file to display notation.</p>
      </div>
    )
  }

  return (
    <div className="notation-surface">
      {phase === 'countIn' ? (
        <div className="count-in-overlay" aria-live="polite" aria-label={`Count-in beat ${currentBeat}`}>
          <div key={`count-in-ring-${countInBlinkTick}`} className="count-in-pulse-ring" aria-hidden="true" />
          <span className="count-in-value">{currentBeat}</span>
        </div>
      ) : null}
      <div ref={scrollRef} className="vexflow-scroll" aria-label="Snare drum sticking staff">
        <div ref={hostRef} className="vexflow-host" />
      </div>
    </div>
  )
}

export default VexflowStaff
