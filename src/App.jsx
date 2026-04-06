import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Pause, Play, Settings, SkipBack, SkipForward, Upload } from 'lucide-react'
import './App.css'
import VexflowStaff from './VexflowStaff'

const PULSES_PER_QUARTER = 24
const SCHEDULE_AHEAD_SECONDS = 0.12
const SCHEDULER_INTERVAL_MS = 25

const SUBDIVISIONS = [
  { label: 'Quarter notes', value: 4, pulses: 24 },
  { label: '8th notes', value: 8, pulses: 12 },
  { label: 'Triplets', value: 12, pulses: 8 },
  { label: '16th notes', value: 16, pulses: 6 },
  { label: '32nd notes', value: 32, pulses: 3 },
]

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

function clickToneForBeat(beat, beatsPerBar) {
  if (beat === 1) {
    return { frequency: 1680, gain: 0.25, duration: 0.075 }
  }
  if (beatsPerBar >= 4 && beat === 3) {
    return { frequency: 1220, gain: 0.2, duration: 0.07 }
  }
  if (beatsPerBar >= 4 && beat === 4) {
    return { frequency: 980, gain: 0.2, duration: 0.07 }
  }
  if (beat === 2) {
    return { frequency: 1200, gain: 0.18, duration: 0.065 }
  }
  return { frequency: 860, gain: 0.16, duration: 0.06 }
}

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

function totalPulsesForRhythm(rhythm) {
  return Math.max(1, rhythm?.pulsesPerExercise ?? rhythm?.pulsesPerBar ?? 1)
}

function measureForPulse(rhythm, pulseInExercise) {
  const measures = rhythm?.measures ?? []
  if (!measures.length) {
    return {
      startPulse: 0,
      pulsesPerBar: totalPulsesForRhythm(rhythm),
      beats: rhythm?.beats ?? 4,
      beatType: rhythm?.beatType ?? 4,
      timeSymbol: rhythm?.timeSymbol ?? '',
    }
  }
  for (const measure of measures) {
    if (pulseInExercise >= measure.startPulse && pulseInExercise < measure.startPulse + measure.pulsesPerBar) {
      return measure
    }
  }
  return measures[measures.length - 1]
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

function parseMusicXmlRhythms(fileText) {
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
        id: `${measure.getAttribute('number') || rhythms.length + 1}-${index}`,
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

function applyParsedMusicXml(parsed, sourceLabel, setBpm, handleReset, setRhythms, runtimeRef, setCurrentRhythmIndex, setImportToast, setImportError) {
  handleReset()
  setRhythms(parsed.rhythms)
  setCurrentRhythmIndex(0)
  runtimeRef.current.rhythmIndex = 0
  if (parsed.tempo) {
    setBpm(Math.max(30, Math.min(260, Math.round(parsed.tempo))))
  }
  setImportToast(
    `Loaded ${parsed.rhythms.length} exercise(s) from "${sourceLabel}"${parsed.tempo ? ` (tempo ${Math.round(parsed.tempo)} BPM).` : '.'}`,
  )
  setImportError('')
}

function App() {
  const [bpm, setBpm] = useState(90)
  const [tempoInput, setTempoInput] = useState('90')
  const [repetitions, setRepetitions] = useState(20)
  const [countInBars, setCountInBars] = useState(1)
  const [countInEnabled, setCountInEnabled] = useState(true)
  const [metSubdivision, setMetSubdivision] = useState(8)
  const [metronomeMode, setMetronomeMode] = useState('subdivision')
  const [rhythms, setRhythms] = useState([])
  const [currentRhythmIndex, setCurrentRhythmIndex] = useState(0)
  const [currentRep, setCurrentRep] = useState(0)
  const [activeNoteIndex, setActiveNoteIndex] = useState(null)
  const [currentBeat, setCurrentBeat] = useState('-')
  const [phase, setPhase] = useState('stopped')
  const [transportState, setTransportState] = useState('')
  const [showNextModal, setShowNextModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showMetronomeModal, setShowMetronomeModal] = useState(false)
  const [modalText, setModalText] = useState('')
  const [importStatus, setImportStatus] = useState('Loading bundled default MusicXML...')
  const [importError, setImportError] = useState('')
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false)

  const fileInputRef = useRef(null)
  const exerciseDropdownRef = useRef(null)
  const hasAutoLoadedSampleRef = useRef(false)
  const audioContextRef = useRef(null)
  const audioUnlockedRef = useRef(false)
  const schedulerIdRef = useRef(null)
  const scheduledUiTimeoutsRef = useRef([])
  const rhythmsRef = useRef(rhythms)
  const clockRef = useRef({
    nextPulseTime: 0,
    pulseInBar: 0,
  })
  const runtimeRef = useRef({
    phase: 'stopped',
    countInPulsesRemaining: 0,
    completedReps: 0,
    rhythmIndex: 0,
    noteCursor: 0,
  })
  const settingsRef = useRef({
    bpm,
    repetitions,
    countInBars,
    countInEnabled,
    metSubdivision,
    metronomeMode,
  })

  useEffect(() => {
    settingsRef.current = { bpm, repetitions, countInBars, countInEnabled, metSubdivision, metronomeMode }
  }, [bpm, repetitions, countInBars, countInEnabled, metSubdivision, metronomeMode])

  useEffect(() => {
    setTempoInput(String(bpm))
  }, [bpm])

  useEffect(() => {
    runtimeRef.current.rhythmIndex = currentRhythmIndex
  }, [currentRhythmIndex])

  useEffect(() => {
    if (!showExerciseDropdown) {
      return undefined
    }
    function handleDocumentClick(event) {
      if (!exerciseDropdownRef.current?.contains(event.target)) {
        setShowExerciseDropdown(false)
      }
    }
    function handleEscape(event) {
      if (event.key === 'Escape') {
        setShowExerciseDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [showExerciseDropdown])

  useEffect(() => {
    if (!importStatus) {
      return undefined
    }
    const timeoutId = window.setTimeout(() => {
      setImportStatus('')
    }, 3600)
    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [importStatus])

  useEffect(() => {
    rhythmsRef.current = rhythms
    if (!rhythms.length) {
      setCurrentRhythmIndex(0)
      runtimeRef.current.rhythmIndex = 0
      return
    }
    if (currentRhythmIndex >= rhythms.length) {
      setCurrentRhythmIndex(0)
      runtimeRef.current.rhythmIndex = 0
    }
  }, [rhythms, currentRhythmIndex])

  const currentRhythm = useMemo(() => rhythms[currentRhythmIndex] ?? null, [rhythms, currentRhythmIndex])

  function clearScheduledUiUpdates() {
    for (const timeoutId of scheduledUiTimeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    scheduledUiTimeoutsRef.current = []
  }

  function scheduleUiAtAudioTime(time, callback) {
    const context = audioContextRef.current
    if (!context) {
      callback()
      return
    }
    const delayMs = Math.max(0, (time - context.currentTime) * 1000)
    const timeoutId = window.setTimeout(callback, delayMs)
    scheduledUiTimeoutsRef.current.push(timeoutId)
  }

  async function ensureAudioContext() {
    if (!audioContextRef.current) {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext
      if (!AudioContextCtor) {
        throw new Error('This browser does not support Web Audio.')
      }
      audioContextRef.current = new AudioContextCtor()
      audioUnlockedRef.current = false
    }

    const context = audioContextRef.current
    if (context.state === 'suspended') {
      await context.resume()
    }

    if (!audioUnlockedRef.current && context.state === 'running') {
      // iOS Safari often needs a short silent source started from a gesture event.
      const source = context.createBufferSource()
      source.buffer = context.createBuffer(1, 1, context.sampleRate)
      source.connect(context.destination)
      source.start(0)
      audioUnlockedRef.current = true
    }

    if (context.state !== 'running') {
      throw new Error('Audio is blocked by the browser. Tap Play again to enable sound.')
    }
    return context
  }

  function stopScheduler() {
    if (schedulerIdRef.current) {
      window.clearInterval(schedulerIdRef.current)
      schedulerIdRef.current = null
    }
  }

  function setRuntimePhase(nextPhase) {
    runtimeRef.current.phase = nextPhase
    setPhase(nextPhase)
  }

  function subdivisionPulseStep(subdivisionValue) {
    return SUBDIVISIONS.find((entry) => entry.value === Number(subdivisionValue))?.pulses ?? 6
  }

  function secondsPerPulse(beatType = 4) {
    const normalizedBeatType = Number.isFinite(beatType) && beatType > 0 ? beatType : 4
    const pulsesPerBeat = Math.max(1, Math.round((PULSES_PER_QUARTER * 4) / normalizedBeatType))
    return 60 / settingsRef.current.bpm / pulsesPerBeat
  }

  function playClick(time, frequency, gainAmount, durationSeconds) {
    const context = audioContextRef.current
    if (!context) {
      return
    }
    const oscillator = context.createOscillator()
    const gainNode = context.createGain()
    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(frequency, time)
    gainNode.gain.setValueAtTime(gainAmount, time)
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + durationSeconds)
    oscillator.connect(gainNode)
    gainNode.connect(context.destination)
    oscillator.start(time)
    oscillator.stop(time + durationSeconds + 0.01)
  }

  function completeRhythm(audioTime) {
    const rhythmCount = rhythmsRef.current.length
    if (!rhythmCount) {
      return
    }

    setRuntimePhase('stopped')
    stopScheduler()
    runtimeRef.current.completedReps = 0
    runtimeRef.current.noteCursor = 0

    const nextIndex = (runtimeRef.current.rhythmIndex + 1) % rhythmCount
    runtimeRef.current.rhythmIndex = nextIndex

    scheduleUiAtAudioTime(audioTime, () => {
      setCurrentRhythmIndex(nextIndex)
      setCurrentRep(0)
      setActiveNoteIndex(null)
      setCurrentBeat('-')
      setTransportState('Ready for next rhythm')
      setModalText(
        `Completed ${settingsRef.current.repetitions} reps. Next: ${rhythmsRef.current[nextIndex].name}`,
      )
      setShowNextModal(true)
    })
  }

  function schedulePulse(pulseTime, pulseInBar, rhythm, knownMeasure = null) {
    const runtime = runtimeRef.current
    const activeMeasure = knownMeasure ?? measureForPulse(rhythm, pulseInBar)
    const timing = timingFromSignature(activeMeasure.beats, activeMeasure.beatType)
    const pulseInMeasure = pulseInBar - activeMeasure.startPulse
    const subdivisionStep = subdivisionPulseStep(settingsRef.current.metSubdivision)
    const clickMode = settingsRef.current.metronomeMode
    const clickStep = clickMode === 'subdivision' ? subdivisionStep : timing.pulsesPerBeat

    if (clickMode !== 'off' && pulseInMeasure % clickStep === 0) {
      const isBeatBoundary = pulseInMeasure % timing.pulsesPerBeat === 0
      if (isBeatBoundary) {
        const beat = Math.floor(pulseInMeasure / timing.pulsesPerBeat) + 1
        const tone = clickToneForBeat(beat, timing.beatsPerBar)
        playClick(pulseTime, tone.frequency, tone.gain, tone.duration)
        scheduleUiAtAudioTime(pulseTime, () => {
          setCurrentBeat(String(beat))
        })
      } else if (clickMode === 'subdivision') {
        playClick(pulseTime, 720, 0.08, 0.04)
      }
    }

    if (runtime.phase === 'countIn') {
      runtime.countInPulsesRemaining -= 1
      if (runtime.countInPulsesRemaining <= 0) {
        runtime.phase = 'playing'
        runtime.noteCursor = 0
        const firstAtZero = rhythm.notes.findIndex((note) => note.startPulse === 0)
        scheduleUiAtAudioTime(pulseTime, () => {
          setRuntimePhase('playing')
          setTransportState('Playing')
          setCurrentRep(0)
          setActiveNoteIndex(firstAtZero >= 0 ? firstAtZero : null)
        })
      }
      return
    }

    if (runtime.phase !== 'playing') {
      return
    }

    while (
      runtime.noteCursor < rhythm.notes.length &&
      rhythm.notes[runtime.noteCursor].startPulse <= pulseInBar
    ) {
      if (rhythm.notes[runtime.noteCursor].startPulse === pulseInBar) {
        const noteIndex = runtime.noteCursor
        scheduleUiAtAudioTime(pulseTime, () => {
          setActiveNoteIndex(noteIndex)
        })
      }
      runtime.noteCursor += 1
    }

    if (pulseInBar === totalPulsesForRhythm(rhythm) - 1) {
      runtime.completedReps += 1
      runtime.noteCursor = 0
      const justCompleted = runtime.completedReps
      scheduleUiAtAudioTime(pulseTime, () => {
        setCurrentRep(justCompleted)
      })

      if (justCompleted >= settingsRef.current.repetitions) {
        completeRhythm(pulseTime + 0.02)
      }
    }
  }

  function schedulerTick() {
    if (!audioContextRef.current) {
      return
    }
    const context = audioContextRef.current

    while (clockRef.current.nextPulseTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const rhythm = rhythmsRef.current[runtimeRef.current.rhythmIndex]
      if (!rhythm) {
        setRuntimePhase('stopped')
        stopScheduler()
        setTransportState('Load MusicXML to start')
        break
      }

      const pulseInBar = clockRef.current.pulseInBar
      const activeMeasure = measureForPulse(rhythm, pulseInBar)
      schedulePulse(clockRef.current.nextPulseTime, pulseInBar, rhythm, activeMeasure)
      clockRef.current.nextPulseTime += secondsPerPulse(activeMeasure.beatType)
      clockRef.current.pulseInBar = (clockRef.current.pulseInBar + 1) % totalPulsesForRhythm(rhythm)

      if (runtimeRef.current.phase === 'stopped') {
        break
      }
    }
  }

  async function startScheduler() {
    let context
    try {
      context = await ensureAudioContext()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start audio.'
      setImportError(message)
      setRuntimePhase('stopped')
      setTransportState('Audio blocked')
      return false
    }

    if (schedulerIdRef.current) {
      return true
    }
    clockRef.current.nextPulseTime = context.currentTime + 0.05
    schedulerIdRef.current = window.setInterval(schedulerTick, SCHEDULER_INTERVAL_MS)
    schedulerTick()
    return true
  }

  const handleReset = useCallback(() => {
    setRuntimePhase('stopped')
    runtimeRef.current.completedReps = 0
    runtimeRef.current.noteCursor = 0
    stopScheduler()
    clearScheduledUiUpdates()
    clockRef.current.pulseInBar = 0
    setCurrentRep(0)
    setActiveNoteIndex(null)
    setCurrentBeat('-')
    setTransportState('')
    setShowNextModal(false)
  }, [])

  async function startPracticeFromBeginning() {
    if (!currentRhythm) {
      setImportError('Load a MusicXML file before pressing Play.')
      return
    }

    clearScheduledUiUpdates()
    runtimeRef.current.completedReps = 0
    runtimeRef.current.rhythmIndex = currentRhythmIndex
    runtimeRef.current.noteCursor = 0

    clockRef.current.pulseInBar = 0
    setCurrentRep(0)
    setCurrentBeat('-')
    setImportError('')
    if (settingsRef.current.countInEnabled) {
      setRuntimePhase('countIn')
      const countInPulses = currentRhythm.measures?.[0]?.pulsesPerBar ?? totalPulsesForRhythm(currentRhythm)
      runtimeRef.current.countInPulsesRemaining = settingsRef.current.countInBars * countInPulses
      setActiveNoteIndex(null)
      setTransportState('Count-in')
    } else {
      setRuntimePhase('playing')
      runtimeRef.current.countInPulsesRemaining = 0
      const firstAtZero = currentRhythm.notes.findIndex((note) => note.startPulse === 0)
      setActiveNoteIndex(firstAtZero >= 0 ? firstAtZero : null)
      setTransportState('Playing')
    }
    await startScheduler()
  }

  async function handlePlay() {
    setShowNextModal(false)
    const currentPhase = runtimeRef.current.phase
    if (currentPhase === 'paused') {
      setRuntimePhase('playing')
      setTransportState('Playing')
      await startScheduler()
      return
    }
    if (currentPhase === 'playing' || currentPhase === 'countIn') {
      return
    }
    await startPracticeFromBeginning()
  }

  function handlePause() {
    if (runtimeRef.current.phase !== 'playing' && runtimeRef.current.phase !== 'countIn') {
      return
    }
    setRuntimePhase('paused')
    stopScheduler()
    clearScheduledUiUpdates()
    setTransportState('Paused')
  }

  function handleNextRhythm() {
    if (!rhythms.length) {
      return
    }
    handleReset()
    const nextIndex = (currentRhythmIndex + 1) % rhythms.length
    setCurrentRhythmIndex(nextIndex)
    runtimeRef.current.rhythmIndex = nextIndex
  }

  function handlePreviousRhythm() {
    if (!rhythms.length) {
      return
    }
    handleReset()
    const previousIndex = (currentRhythmIndex - 1 + rhythms.length) % rhythms.length
    setCurrentRhythmIndex(previousIndex)
    runtimeRef.current.rhythmIndex = previousIndex
  }

  function handleRhythmSelect(newIndex) {
    if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= rhythms.length) {
      return
    }
    handleReset()
    setCurrentRhythmIndex(newIndex)
    runtimeRef.current.rhythmIndex = newIndex
    setShowExerciseDropdown(false)
  }

  async function handleRhythmFileChange(event) {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    try {
      const lower = file.name.toLowerCase()
      if (!lower.endsWith('.xml') && !lower.endsWith('.musicxml')) {
        throw new Error('Please select a MusicXML file (.xml or .musicxml).')
      }

      const fileText = await file.text()
      const parsed = parseMusicXmlRhythms(fileText)
      applyParsedMusicXml(
        parsed,
        file.name,
        setBpm,
        handleReset,
        setRhythms,
        runtimeRef,
        setCurrentRhythmIndex,
        setImportStatus,
        setImportError,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load MusicXML file.'
      setImportError(message)
      setImportStatus('')
    } finally {
      event.target.value = ''
    }
  }

  const handleLoadSample = useCallback(async () => {
    try {
      const response = await fetch('./stick-control-page-5.musicxml')
      if (!response.ok) {
        throw new Error('Could not load the bundled default MusicXML file.')
      }
      const text = await response.text()
      const parsed = parseMusicXmlRhythms(text)
      applyParsedMusicXml(
        parsed,
        'stick-control-page-5.musicxml',
        setBpm,
        handleReset,
        setRhythms,
        runtimeRef,
        setCurrentRhythmIndex,
        setImportStatus,
        setImportError,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load default MusicXML file.'
      setImportError(message)
      setImportStatus('')
    }
  }, [handleReset])

  useEffect(() => {
    if (hasAutoLoadedSampleRef.current) {
      return
    }
    hasAutoLoadedSampleRef.current = true
    handleLoadSample()
  }, [handleLoadSample])

  function handleOpenFilePicker() {
    fileInputRef.current?.click()
  }

  function adjustBpm(delta) {
    setBpm((previous) => Math.max(30, Math.min(260, previous + delta)))
  }

  function commitTempoInput() {
    const parsed = Number(tempoInput)
    if (!Number.isFinite(parsed)) {
      setTempoInput(String(bpm))
      return
    }
    const clamped = Math.max(30, Math.min(260, Math.round(parsed)))
    setBpm(clamped)
    setTempoInput(String(clamped))
  }

  useEffect(
    () => () => {
      stopScheduler()
      clearScheduledUiUpdates()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    },
    [],
  )

  const controlsDisabled = phase === 'playing' || phase === 'countIn'
  const isTransportRunning = phase === 'playing' || phase === 'countIn'
  const hasRhythms = rhythms.length > 0
  const playPauseLabel = isTransportRunning ? 'Pause' : phase === 'paused' ? 'Resume' : 'Play'
  const currentExerciseLabel = hasRhythms ? currentRhythm?.name ?? `Exercise ${currentRhythmIndex + 1}` : 'No exercises loaded'
  const statusLabel = transportState || (hasRhythms ? 'Ready' : 'Load MusicXML')

  return (
    <main className="app">
      <header className="top-bar">
        <p className="top-kicker">Practice Studio</p>
        <h1>Stick Control Practice</h1>
        <p className="subtitle">Mobile-friendly rhythm trainer for focused daily reps.</p>
      </header>

      <input
        ref={fileInputRef}
        className="file-input-hidden"
        type="file"
        accept=".xml,.musicxml,text/xml,application/xml"
        onChange={handleRhythmFileChange}
      />

      <section className="panel notation">
        <VexflowStaff rhythm={currentRhythm} activeNoteIndex={activeNoteIndex} />
      </section>

      <section className="panel transport-panel transport-under-staff">
        <div className="status-compact transport-status" aria-live="polite">
          <div className="exercise-dropdown status-exercise-selector" ref={exerciseDropdownRef}>
            <button
              type="button"
              className="exercise-trigger status-exercise-trigger"
              disabled={controlsDisabled || !hasRhythms}
              onClick={() => setShowExerciseDropdown((open) => !open)}
              aria-expanded={showExerciseDropdown}
              aria-haspopup="listbox"
              aria-label="Select exercise"
            >
              <span className="exercise-trigger-label">{currentExerciseLabel}</span>
              <ChevronDown size={16} className="transport-icon" aria-hidden="true" />
            </button>
            {showExerciseDropdown && hasRhythms && (
              <div className="exercise-dropdown-menu" role="listbox" aria-label="Exercises">
                {rhythms.map((rhythm, index) => (
                  <button
                    key={`${rhythm.name}-${index}`}
                    type="button"
                    className={`exercise-option ${index === currentRhythmIndex ? 'active' : ''}`}
                    role="option"
                    aria-selected={index === currentRhythmIndex}
                    onClick={() => handleRhythmSelect(index)}
                  >
                    <span className="exercise-option-index">{index + 1}.</span>
                    <span>{rhythm.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="meta-row">
            <span className="meta-pill">Rhythm {hasRhythms ? `${currentRhythmIndex + 1}/${rhythms.length}` : '0/0'}</span>
            <span className="meta-pill">Rep {currentRep}/{repetitions}</span>
            <span className="meta-pill">Beat {currentBeat}</span>
            <span className="meta-pill meta-pill-strong">{statusLabel}</span>
          </div>
          {importError && <p className="import-error">{importError}</p>}
        </div>
      </section>

      <section className="transport-dock" aria-label="Playback controls">
        <div className="transport-row transport-row-primary">
          <button
            type="button"
            className="transport-icon-button"
            disabled={!hasRhythms}
            onClick={handlePreviousRhythm}
            aria-label="Previous rhythm"
          >
            <SkipBack size={18} className="transport-icon" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="play-button"
            disabled={!hasRhythms}
            onClick={isTransportRunning ? handlePause : handlePlay}
            aria-label={playPauseLabel}
          >
            {isTransportRunning ? (
              <Pause size={24} className="transport-icon" aria-hidden="true" />
            ) : (
              <Play size={24} className="transport-icon" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            className="transport-icon-button"
            disabled={!hasRhythms}
            onClick={handleNextRhythm}
            aria-label="Next rhythm"
          >
            <SkipForward size={18} className="transport-icon" aria-hidden="true" />
          </button>
          <div className="tempo-control" aria-label="Tempo control">
            <button type="button" onClick={() => adjustBpm(-1)} aria-label="Decrease tempo">
              -
            </button>
            <input
              type="text"
              className="tempo-input"
              inputMode="numeric"
              aria-label="Tempo BPM"
              value={tempoInput}
              onChange={(event) => setTempoInput(event.target.value)}
              onBlur={commitTempoInput}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  commitTempoInput()
                }
              }}
            />
            <span>BPM</span>
            <button type="button" onClick={() => adjustBpm(1)} aria-label="Increase tempo">
              +
            </button>
          </div>
        </div>
        <div className="transport-row transport-row-secondary" aria-label="Practice options">
          <button
            type="button"
            className="transport-option-button"
            onClick={() => setShowUploadModal(true)}
            aria-label="Open upload options"
          >
            <Upload size={18} className="transport-icon" aria-hidden="true" />
            <span>Library</span>
          </button>
          <button
            type="button"
            className="transport-option-button"
            onClick={() => setShowMetronomeModal(true)}
            aria-label="Open settings"
          >
            <Settings size={18} className="transport-icon" aria-hidden="true" />
            <span>Settings</span>
          </button>
        </div>
      </section>

      {showUploadModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card upload-modal" role="dialog" aria-modal="true" aria-label="Upload options">
            <h3 className="modal-title">Load MusicXML</h3>
            <p className="modal-note">Choose a MusicXML file or load the bundled default rhythm.</p>
            <div className="button-row">
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false)
                  handleOpenFilePicker()
                }}
              >
                Upload file
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUploadModal(false)
                  handleLoadSample()
                }}
              >
                Load default
              </button>
            </div>
            <div className="button-row">
              <button type="button" onClick={() => setShowUploadModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showMetronomeModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card metronome-modal" role="dialog" aria-modal="true" aria-label="Practice settings">
            <h3 className="modal-title">Practice settings</h3>
            <div className="modal-grid">
              <div className="control-row">
                <label htmlFor="repetitions">Repetitions per rhythm</label>
                <input
                  id="repetitions"
                  type="number"
                  min="1"
                  max="200"
                  value={repetitions}
                  disabled={controlsDisabled}
                  onChange={(event) => setRepetitions(Math.max(1, Math.min(200, Number(event.target.value) || 20)))}
                />
              </div>
              <div className="control-row">
                <label htmlFor="metronomeMode">Click pattern</label>
                <select
                  id="metronomeMode"
                  value={metronomeMode}
                  onChange={(event) => setMetronomeMode(event.target.value)}
                >
                  <option value="off">Off</option>
                  <option value="beats">Beats only</option>
                  <option value="subdivision">Beats + subdivision</option>
                </select>
              </div>
              {metronomeMode === 'subdivision' && (
                <div className="control-row">
                  <label htmlFor="metSubdivision">Subdivision note value</label>
                  <select
                    id="metSubdivision"
                    value={metSubdivision}
                    onChange={(event) => setMetSubdivision(Number(event.target.value))}
                  >
                    {SUBDIVISIONS.map((subdivision) => (
                      <option key={subdivision.value} value={subdivision.value}>
                        {subdivision.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="control-row">
                <label className="toggle-row" htmlFor="countInEnabled">
                  <input
                    id="countInEnabled"
                    type="checkbox"
                    checked={countInEnabled}
                    onChange={(event) => setCountInEnabled(event.target.checked)}
                  />
                  Enable count-in
                </label>
              </div>
              {countInEnabled && (
                <div className="control-row">
                  <label htmlFor="countInBars">Count-in bars</label>
                  <input
                    id="countInBars"
                    type="number"
                    min="1"
                    max="4"
                    value={countInBars}
                    onChange={(event) => setCountInBars(Math.max(1, Math.min(4, Number(event.target.value) || 1)))}
                  />
                </div>
              )}
            </div>
            <div className="button-row">
              <button type="button" onClick={handleReset}>
                Reset
              </button>
              <button type="button" onClick={() => setShowMetronomeModal(false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {showNextModal && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-card" role="dialog" aria-modal="true" aria-label="Next rhythm prompt">
            <p>{modalText}</p>
            <div className="button-row">
              <button type="button" onClick={handlePlay}>
                Start next rhythm
              </button>
              <button type="button" onClick={() => setShowNextModal(false)}>
                Later
              </button>
            </div>
          </div>
        </div>
      )}
      {importStatus && (
        <div className="toast toast-success" role="status" aria-live="polite">
          {importStatus}
        </div>
      )}
    </main>
  )
}

export default App
