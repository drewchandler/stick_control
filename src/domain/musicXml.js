const PULSES_PER_QUARTER = 24

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
const DEFAULT_SNARE_STAFF_OFFSET = 1

function extractStickFromMusicXmlNote(noteElement) {
  const handText = noteElement.querySelector('notations technical hand')?.textContent ?? ''
  if (/right/i.test(handText)) {
    return 'R'
  }
  if (/left/i.test(handText)) {
    return 'L'
  }

  for (const lyricTextNode of Array.from(noteElement.querySelectorAll('lyric text'))) {
    const text = (lyricTextNode.textContent ?? '').trim().toUpperCase()
    if (text.startsWith('R')) {
      return 'R'
    }
    if (text.startsWith('L')) {
      return 'L'
    }
  }
  return null
}

function parseNumericText(node, fallback) {
  const parsed = Number(node?.textContent ?? '')
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function parsePitchPosition(noteElement) {
  const displayStep = (noteElement.querySelector('unpitched display-step')?.textContent ?? '').trim().toUpperCase()
  const displayOctave = Number(noteElement.querySelector('unpitched display-octave')?.textContent ?? '')
  if (displayStep && Number.isFinite(displayOctave) && displayStep in STEP_TO_DIATONIC) {
    return { step: displayStep, octave: displayOctave }
  }

  const pitchStep = (noteElement.querySelector('pitch step')?.textContent ?? '').trim().toUpperCase()
  const pitchOctave = Number(noteElement.querySelector('pitch octave')?.textContent ?? '')
  if (pitchStep && Number.isFinite(pitchOctave) && pitchStep in STEP_TO_DIATONIC) {
    return { step: pitchStep, octave: pitchOctave }
  }
  return null
}

function staffOffsetFromPitch(position) {
  if (!position) {
    return DEFAULT_SNARE_STAFF_OFFSET
  }
  const diatonic = position.octave * 7 + STEP_TO_DIATONIC[position.step]
  return diatonic - MIDDLE_LINE_DIATONIC
}

function parseTempo(xmlDocument) {
  const soundTempo = Number(xmlDocument.querySelector('sound[tempo]')?.getAttribute('tempo'))
  if (Number.isFinite(soundTempo) && soundTempo > 0) {
    return soundTempo
  }
  const perMinute = Number(xmlDocument.querySelector('metronome per-minute')?.textContent)
  if (Number.isFinite(perMinute) && perMinute > 0) {
    return perMinute
  }
  return null
}

function timingFromSignature(beats, beatType) {
  const pulsesPerBeat = Math.max(1, Math.round((PULSES_PER_QUARTER * 4) / beatType))
  return {
    beatsPerBar: beats,
    pulsesPerBeat,
    pulsesPerBar: Math.max(1, beats * pulsesPerBeat),
  }
}

function beamCountForNote(noteElement, durationDivisions, currentDivisions) {
  const typeText = (noteElement.querySelector('type')?.textContent ?? '').trim().toLowerCase()
  if (typeText === '32nd') {
    return 3
  }
  if (typeText === '16th') {
    return 2
  }
  if (typeText === 'eighth' || typeText === '8th') {
    return 1
  }

  const durationInQuarters = currentDivisions > 0 ? durationDivisions / currentDivisions : 0
  if (durationInQuarters <= 0.125) {
    return 3
  }
  if (durationInQuarters <= 0.25) {
    return 2
  }
  if (durationInQuarters <= 0.5) {
    return 1
  }
  return 0
}

function parseGroupingLabel(groupingElement) {
  const features = Array.from(groupingElement.querySelectorAll('feature'))
  const preferred = features.find((feature) => /exercise/i.test(feature.getAttribute('type') ?? ''))
  const label = (preferred?.textContent ?? features[0]?.textContent ?? '').trim()
  return label || null
}

function normalizeGroupingToken(value, fallback) {
  const normalized = String(value ?? '').trim()
  return normalized || fallback
}

function collectGroupingEventsFromMeasure(measureElement, measureIndex) {
  const events = []
  let sourceOrder = 0
  for (const child of Array.from(measureElement.children)) {
    if (child.tagName !== 'grouping') {
      continue
    }
    const type = String(child.getAttribute('type') ?? '').toLowerCase()
    if (type !== 'start' && type !== 'stop' && type !== 'single') {
      continue
    }
    const memberOf = normalizeGroupingToken(child.getAttribute('member-of'), 'default')
    const number = normalizeGroupingToken(child.getAttribute('number'), '1')
    events.push({
      key: `${memberOf}::${number}`,
      type,
      label: parseGroupingLabel(child),
      measureIndex,
      sourceOrder,
    })
    sourceOrder += 1
  }
  return events
}

function buildExerciseRangesFromGroupingEvents(events, measureCount) {
  if (!events.length || measureCount <= 0) {
    return []
  }

  const stackByKey = new Map()
  const ranges = []

  for (const event of events) {
    if (event.type === 'single') {
      ranges.push({
        startMeasureIndex: event.measureIndex,
        endMeasureIndex: event.measureIndex,
        label: event.label,
        sortMeasure: event.measureIndex,
        sortOrder: event.sourceOrder,
      })
      continue
    }

    if (event.type === 'start') {
      const stack = stackByKey.get(event.key) ?? []
      stack.push(event)
      stackByKey.set(event.key, stack)
      continue
    }

    const stack = stackByKey.get(event.key) ?? []
    const startEvent = stack.pop()
    if (stack.length) {
      stackByKey.set(event.key, stack)
    } else {
      stackByKey.delete(event.key)
    }
    if (!startEvent) {
      continue
    }
    ranges.push({
      startMeasureIndex: startEvent.measureIndex,
      endMeasureIndex: event.measureIndex,
      label: startEvent.label ?? event.label,
      sortMeasure: startEvent.measureIndex,
      sortOrder: startEvent.sourceOrder,
    })
  }

  for (const stack of stackByKey.values()) {
    for (const startEvent of stack) {
      ranges.push({
        startMeasureIndex: startEvent.measureIndex,
        endMeasureIndex: measureCount - 1,
        label: startEvent.label,
        sortMeasure: startEvent.measureIndex,
        sortOrder: startEvent.sourceOrder,
      })
    }
  }

  return ranges
    .map((range) => ({
      ...range,
      startMeasureIndex: Math.max(0, Math.min(measureCount - 1, range.startMeasureIndex)),
      endMeasureIndex: Math.max(0, Math.min(measureCount - 1, range.endMeasureIndex)),
    }))
    .filter((range) => range.startMeasureIndex <= range.endMeasureIndex)
    .sort((a, b) =>
      a.sortMeasure === b.sortMeasure ? a.sortOrder - b.sortOrder : a.sortMeasure - b.sortMeasure,
    )
}

function buildExerciseFromMeasureRange(title, measureData, startMeasureIndex, endMeasureIndex, index, label) {
  const selectedMeasures = measureData.slice(startMeasureIndex, endMeasureIndex + 1)
  const firstMeasure = selectedMeasures[0]
  const lastMeasure = selectedMeasures[selectedMeasures.length - 1]

  let pulseOffset = 0
  const notes = []
  const measures = []

  for (const measure of selectedMeasures) {
    measures.push({
      number: measure.number,
      startPulse: pulseOffset,
      pulsesPerBar: measure.pulsesPerBar,
      beats: measure.beats,
      beatType: measure.beatType,
      timeSymbol: measure.timeSymbol,
    })
    for (const note of measure.notes) {
      notes.push({
        ...note,
        id: `${measure.number}-${note.id}`,
        startPulse: pulseOffset + note.startPulse,
      })
    }
    pulseOffset += measure.pulsesPerBar
  }

  const rangeLabel =
    firstMeasure.number === lastMeasure.number
      ? `Measure ${firstMeasure.number}`
      : `Measures ${firstMeasure.number}-${lastMeasure.number}`
  const cleanedLabel = (label ?? '').trim()
  const name = cleanedLabel ? `${title} - ${cleanedLabel}` : `${title} - ${rangeLabel}`

  return {
    name,
    beats: firstMeasure.beats,
    beatType: firstMeasure.beatType,
    timeSymbol: firstMeasure.timeSymbol,
    pulsesPerExercise: Math.max(1, pulseOffset),
    pulsesPerBar: Math.max(1, pulseOffset),
    notes: notes.sort((a, b) => a.startPulse - b.startPulse),
    measures,
    exerciseIndex: index,
  }
}

export function parseMusicXmlRhythms(fileText) {
  const parser = new window.DOMParser()
  const xml = parser.parseFromString(fileText, 'application/xml')
  if (xml.querySelector('parsererror')) {
    throw new Error('This file is not valid MusicXML.')
  }

  const part = xml.querySelector('score-partwise part, part')
  if (!part) {
    throw new Error('No part data was found in this MusicXML file.')
  }

  const title =
    xml.querySelector('movement-title')?.textContent?.trim() ||
    xml.querySelector('work > work-title')?.textContent?.trim() ||
    'Imported MusicXML'

  const tempo = parseTempo(xml)
  const measureData = []
  const groupingEvents = []
  let hasPlayableNotes = false
  let currentBeats = 4
  let currentBeatType = 4
  let currentTimeSymbol = ''
  let currentDivisions = 1

  for (const [measureIndex, measure] of Array.from(part.querySelectorAll('measure')).entries()) {
    const attributes = measure.querySelector('attributes')
    if (attributes) {
      currentDivisions = parseNumericText(attributes.querySelector('divisions'), currentDivisions)
      const time = attributes.querySelector('time')
      if (time) {
        currentBeats = parseNumericText(time.querySelector('beats'), currentBeats)
        currentBeatType = parseNumericText(time.querySelector('beat-type'), currentBeatType)
        currentTimeSymbol = (time.getAttribute('symbol') ?? '').toLowerCase()
      }
    }

    groupingEvents.push(...collectGroupingEventsFromMeasure(measure, measureIndex))
    const timing = timingFromSignature(currentBeats, currentBeatType)
    const events = []
    let elapsedDivisions = 0
    let alternateHand = 'R'

    for (const child of Array.from(measure.children)) {
      if (child.tagName === 'backup') {
        elapsedDivisions = Math.max(0, elapsedDivisions - parseNumericText(child.querySelector('duration'), 0))
        continue
      }
      if (child.tagName === 'forward') {
        elapsedDivisions += parseNumericText(child.querySelector('duration'), 0)
        continue
      }
      if (child.tagName !== 'note') {
        continue
      }

      const isGrace = Boolean(child.querySelector('grace'))
      const isRest = Boolean(child.querySelector('rest'))
      const isChord = Boolean(child.querySelector('chord'))
      const durationDivisions = parseNumericText(child.querySelector('duration'), 0)
      const startDivisions = isChord ? Math.max(0, elapsedDivisions - durationDivisions) : elapsedDivisions
      const durationPulses = Math.max(
        1,
        Math.round(((durationDivisions || 1) / Math.max(1, currentDivisions)) * PULSES_PER_QUARTER),
      )
      const beamCount = beamCountForNote(child, durationDivisions, currentDivisions)

      if (!isRest && !isGrace) {
        const explicitHand = extractStickFromMusicXmlNote(child)
        const hand = explicitHand ?? alternateHand
        alternateHand = hand === 'R' ? 'L' : 'R'
        const staffOffset = staffOffsetFromPitch(parsePitchPosition(child))
        events.push({
          stick: hand,
          startPulse: Math.max(0, Math.round((startDivisions / currentDivisions) * PULSES_PER_QUARTER)),
          durationPulses,
          beamCount,
          staffOffset,
        })
      }

      if (!isChord) {
        elapsedDivisions += durationDivisions
      }
    }

    const derivedMeasurePulses = Math.round((elapsedDivisions / currentDivisions) * PULSES_PER_QUARTER)
    const pulsesPerBar = Math.max(timing.pulsesPerBar, derivedMeasurePulses, 1)
    const notes = events
      .map((event, index) => ({
        id: `${measure.getAttribute('number') || measureIndex + 1}-${index}`,
        stick: event.stick,
        startPulse: Math.min(pulsesPerBar - 1, event.startPulse),
        durationPulses: event.durationPulses,
        beamCount: event.beamCount,
        staffOffset: event.staffOffset,
      }))
      .sort((a, b) => a.startPulse - b.startPulse)

    if (notes.length) {
      hasPlayableNotes = true
    }

    const measureNumber = String(measure.getAttribute('number') ?? measureIndex + 1).trim() || String(measureIndex + 1)
    measureData.push({
      number: measureNumber,
      beats: currentBeats,
      beatType: currentBeatType,
      timeSymbol: currentTimeSymbol,
      pulsesPerBar,
      notes,
    })
  }

  if (!hasPlayableNotes) {
    throw new Error('No playable notes were found in this MusicXML file.')
  }

  const groupedRanges = buildExerciseRangesFromGroupingEvents(groupingEvents, measureData.length)
  const exerciseRanges = groupedRanges.length
    ? groupedRanges
    : [{ startMeasureIndex: 0, endMeasureIndex: measureData.length - 1, label: null }]
  const rhythms = exerciseRanges.map((range, index) =>
    buildExerciseFromMeasureRange(
      title,
      measureData,
      range.startMeasureIndex,
      range.endMeasureIndex,
      index,
      range.label,
    ),
  )

  return { rhythms: rhythms.slice(0, 256), tempo }
}
