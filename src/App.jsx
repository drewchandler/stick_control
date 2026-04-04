import { useEffect, useMemo, useRef, useState } from 'react'
import './App.css'

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

function staffYForOffset(staffOffset) {
  const middleLineY = 74
  const halfStepY = 8
  return middleLineY - staffOffset * halfStepY
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

function isCutTimeSignature(beats, beatType, timeSymbol) {
  const normalized = String(timeSymbol || '').toLowerCase()
  return normalized === 'cut' || normalized === 'cut-time' || (beats === 2 && beatType === 2)
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

function buildBeamSegments(notes, pulsesPerBeat) {
  const segments = []
  if (!notes.length) {
    return segments
  }

  function flushRun(level, run) {
    if (run.length < 2) {
      return
    }
    segments.push({
      level,
      startPulse: run[0].startPulse,
      endPulse: run[run.length - 1].startPulse,
    })
  }

  for (let level = 1; level <= 3; level += 1) {
    let run = []
    for (const note of notes) {
      if (note.beamCount < level) {
        flushRun(level, run)
        run = []
        continue
      }

      if (!run.length) {
        run = [note]
        continue
      }

      const previous = run[run.length - 1]
      const sameBeat = Math.floor(previous.startPulse / pulsesPerBeat) === Math.floor(note.startPulse / pulsesPerBeat)
      const contiguous = note.startPulse <= previous.startPulse + Math.max(1, previous.durationPulses) + 1
      if (sameBeat && contiguous) {
        run.push(note)
      } else {
        flushRun(level, run)
        run = [note]
      }
    }
    flushRun(level, run)
  }

  return segments
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
  const rhythms = []
  let currentBeats = 4
  let currentBeatType = 4
  let currentTimeSymbol = ''
  let currentDivisions = 1

  for (const measure of Array.from(part.querySelectorAll('measure'))) {
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

    if (!events.length) {
      continue
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

    rhythms.push({
      name: `${title} - Measure ${measure.getAttribute('number') || rhythms.length + 1}`,
      beats: currentBeats,
      beatType: currentBeatType,
      timeSymbol: currentTimeSymbol,
      pulsesPerBar,
      notes,
    })
  }

  if (!rhythms.length) {
    throw new Error('No playable notes were found in this MusicXML file.')
  }

  return { rhythms: rhythms.slice(0, 256), tempo }
}

function applyParsedMusicXml(parsed, sourceLabel, setBpm, handleReset, setRhythms, runtimeRef, setCurrentRhythmIndex, setImportStatus, setImportError) {
  handleReset()
  setRhythms(parsed.rhythms)
  setCurrentRhythmIndex(0)
  runtimeRef.current.rhythmIndex = 0
  if (parsed.tempo) {
    setBpm(Math.max(30, Math.min(260, Math.round(parsed.tempo))))
  }
  setImportStatus(
    `Loaded ${parsed.rhythms.length} measure(s) from "${sourceLabel}"${parsed.tempo ? ` (tempo ${Math.round(parsed.tempo)} BPM).` : '.'}`,
  )
  setImportError('')
}

function App() {
  const [bpm, setBpm] = useState(90)
  const [repetitions, setRepetitions] = useState(20)
  const [countInBars, setCountInBars] = useState(1)
  const [metSubdivision, setMetSubdivision] = useState(16)
  const [rhythms, setRhythms] = useState([])
  const [currentRhythmIndex, setCurrentRhythmIndex] = useState(0)
  const [currentRep, setCurrentRep] = useState(0)
  const [activeNoteIndex, setActiveNoteIndex] = useState(null)
  const [currentBeat, setCurrentBeat] = useState('-')
  const [phase, setPhase] = useState('stopped')
  const [transportState, setTransportState] = useState('Stopped')
  const [showNextModal, setShowNextModal] = useState(false)
  const [modalText, setModalText] = useState('')
  const [importStatus, setImportStatus] = useState('Load a MusicXML file to begin.')
  const [importError, setImportError] = useState('')

  const fileInputRef = useRef(null)
  const audioContextRef = useRef(null)
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
    metSubdivision,
  })

  useEffect(() => {
    settingsRef.current = { bpm, repetitions, countInBars, metSubdivision }
  }, [bpm, repetitions, countInBars, metSubdivision])

  useEffect(() => {
    runtimeRef.current.rhythmIndex = currentRhythmIndex
  }, [currentRhythmIndex])

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

  function ensureAudioContext() {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
    return audioContextRef.current
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

  function secondsPerPulse() {
    return 60 / settingsRef.current.bpm / PULSES_PER_QUARTER
  }

  function getRhythmTiming(rhythm) {
    return timingFromSignature(rhythm.beats, rhythm.beatType)
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

  function schedulePulse(pulseTime, pulseInBar, rhythm) {
    const runtime = runtimeRef.current
    const timing = getRhythmTiming(rhythm)
    const subdivisionStep = subdivisionPulseStep(settingsRef.current.metSubdivision)

    if (pulseInBar % subdivisionStep === 0) {
      const isBeatBoundary = pulseInBar % timing.pulsesPerBeat === 0
      if (isBeatBoundary) {
        const beat = Math.floor(pulseInBar / timing.pulsesPerBeat) + 1
        const tone = clickToneForBeat(beat, timing.beatsPerBar)
        playClick(pulseTime, tone.frequency, tone.gain, tone.duration)
        scheduleUiAtAudioTime(pulseTime, () => {
          setCurrentBeat(String(beat))
        })
      } else {
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

    if (pulseInBar === rhythm.pulsesPerBar - 1) {
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

      schedulePulse(clockRef.current.nextPulseTime, clockRef.current.pulseInBar, rhythm)
      clockRef.current.nextPulseTime += secondsPerPulse()
      clockRef.current.pulseInBar = (clockRef.current.pulseInBar + 1) % rhythm.pulsesPerBar

      if (runtimeRef.current.phase === 'stopped') {
        break
      }
    }
  }

  function startScheduler() {
    const context = ensureAudioContext()
    if (schedulerIdRef.current) {
      return
    }
    clockRef.current.nextPulseTime = context.currentTime + 0.05
    schedulerIdRef.current = window.setInterval(schedulerTick, SCHEDULER_INTERVAL_MS)
    schedulerTick()
  }

  function handleReset() {
    setRuntimePhase('stopped')
    runtimeRef.current.completedReps = 0
    runtimeRef.current.noteCursor = 0
    stopScheduler()
    clearScheduledUiUpdates()
    clockRef.current.pulseInBar = 0
    setCurrentRep(0)
    setActiveNoteIndex(null)
    setCurrentBeat('-')
    setTransportState('Stopped')
    setShowNextModal(false)
  }

  function startPracticeFromBeginning() {
    if (!currentRhythm) {
      setImportError('Load a MusicXML file before pressing Play.')
      return
    }

    clearScheduledUiUpdates()
    setRuntimePhase('countIn')
    runtimeRef.current.countInPulsesRemaining = settingsRef.current.countInBars * currentRhythm.pulsesPerBar
    runtimeRef.current.completedReps = 0
    runtimeRef.current.rhythmIndex = currentRhythmIndex
    runtimeRef.current.noteCursor = 0

    clockRef.current.pulseInBar = 0
    setCurrentRep(0)
    setActiveNoteIndex(null)
    setCurrentBeat('-')
    setTransportState('Count-in')
    setImportError('')
    startScheduler()
  }

  function handlePlay() {
    setShowNextModal(false)
    const currentPhase = runtimeRef.current.phase
    if (currentPhase === 'paused') {
      setRuntimePhase('playing')
      setTransportState('Playing')
      startScheduler()
      return
    }
    if (currentPhase === 'playing' || currentPhase === 'countIn') {
      return
    }
    startPracticeFromBeginning()
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

  function handleRhythmSelect(event) {
    const newIndex = Number(event.target.value)
    if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= rhythms.length) {
      return
    }
    handleReset()
    setCurrentRhythmIndex(newIndex)
    runtimeRef.current.rhythmIndex = newIndex
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

  async function handleLoadSample() {
    try {
      const response = await fetch('./sample-stick-control.musicxml')
      if (!response.ok) {
        throw new Error('Could not load the bundled sample MusicXML file.')
      }
      const text = await response.text()
      const parsed = parseMusicXmlRhythms(text)
      applyParsedMusicXml(
        parsed,
        'sample-stick-control.musicxml',
        setBpm,
        handleReset,
        setRhythms,
        runtimeRef,
        setCurrentRhythmIndex,
        setImportStatus,
        setImportError,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load sample MusicXML file.'
      setImportError(message)
      setImportStatus('')
    }
  }

  function handleOpenFilePicker() {
    fileInputRef.current?.click()
  }

  function adjustBpm(delta) {
    if (controlsDisabled) {
      return
    }
    setBpm((previous) => Math.max(30, Math.min(260, previous + delta)))
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
  const lineYs = [42, 58, 74, 90, 106]
  const staffXStart = 40
  const staffXEnd = 1110
  const noteAreaStart = staffXStart + 110
  const noteAreaWidth = staffXEnd - noteAreaStart
  const staffPrefixCenterX = staffXStart + 52
  const showCutTime =
    currentRhythm != null &&
    isCutTimeSignature(currentRhythm.beats, currentRhythm.beatType, currentRhythm.timeSymbol)
  const beatSeparators =
    currentRhythm == null
      ? []
      : Array.from({ length: Math.max(0, currentRhythm.beats - 1) }, (_, idx) => {
          const pulse = (idx + 1) * getRhythmTiming(currentRhythm).pulsesPerBeat
          return noteAreaStart + (pulse / currentRhythm.pulsesPerBar) * noteAreaWidth
        })
  const beamSegments =
    currentRhythm == null
      ? []
      : buildBeamSegments(currentRhythm.notes, getRhythmTiming(currentRhythm).pulsesPerBeat)
  const playPauseLabel = isTransportRunning ? 'Pause' : phase === 'paused' ? 'Resume' : 'Play'
  const timeSignatureLabel = currentRhythm
    ? showCutTime
      ? 'Cut Time'
      : `${currentRhythm.beats}/${currentRhythm.beatType}`
    : '-'

  return (
    <main className="app">
      <header className="top-bar">
        <h1>Stick Control Practice</h1>
        <p className="subtitle">Notation-first practice for clean, focused reps.</p>
      </header>

      <section className="panel transport-panel">
        <input
          ref={fileInputRef}
          className="file-input-hidden"
          type="file"
          accept=".xml,.musicxml,text/xml,application/xml"
          onChange={handleRhythmFileChange}
        />
        <div className="source-row">
          <button type="button" onClick={handleOpenFilePicker}>
            Load exercise
          </button>
          <button type="button" onClick={handleLoadSample}>
            Load sample
          </button>
        </div>

        <div className="transport-row">
          <button type="button" disabled={!hasRhythms} onClick={handlePreviousRhythm}>
            Previous
          </button>
          <button type="button" className="play-button" disabled={!hasRhythms} onClick={isTransportRunning ? handlePause : handlePlay}>
            {playPauseLabel}
          </button>
          <button type="button" disabled={!hasRhythms} onClick={handleNextRhythm}>
            Next
          </button>
          <button type="button" onClick={handleReset}>
            Reset
          </button>
          <div className="tempo-control" aria-label="Tempo control">
            <button type="button" disabled={controlsDisabled} onClick={() => adjustBpm(-1)}>
              -
            </button>
            <span>{bpm} BPM</span>
            <button type="button" disabled={controlsDisabled} onClick={() => adjustBpm(1)}>
              +
            </button>
          </div>
        </div>
      </section>

      <section className="panel status-compact" aria-live="polite">
        <p className="current-rhythm-name">{currentRhythm?.name ?? 'No MusicXML loaded'}</p>
        <div className="meta-row">
          <span>Rhythm {hasRhythms ? `${currentRhythmIndex + 1}/${rhythms.length}` : '0/0'}</span>
          <span>Rep {currentRep}/{repetitions}</span>
          <span>Beat {currentBeat}</span>
          <span>{timeSignatureLabel}</span>
          <span>{transportState}</span>
        </div>
        {importStatus && <p className="import-success">{importStatus}</p>}
        {importError && <p className="import-error">{importError}</p>}
      </section>

      <section className="panel notation">
        <h2>Drum Staff</h2>
        <svg className="staff-svg" viewBox="0 0 1150 180" role="img" aria-label="Snare drum sticking staff">
          {lineYs.map((y) => (
            <line key={y} x1={staffXStart} y1={y} x2={staffXEnd} y2={y} className="staff-line" />
          ))}

          {beatSeparators.map((x) => (
            <line key={x} x1={x} y1="24" x2={x} y2="145" className="beat-separator" />
          ))}

          <line x1={staffXStart} y1="24" x2={staffXStart} y2="145" className="bar-line" />
          <line x1={staffXEnd} y1="24" x2={staffXEnd} y2="145" className="bar-line" />

          {currentRhythm ? (
            <>
              <g className="staff-prefix" aria-hidden="true">
                <rect x={staffXStart + 12} y="53" width="6" height="42" className="percussion-clef-bar" />
                <rect x={staffXStart + 24} y="53" width="6" height="42" className="percussion-clef-bar" />
                {showCutTime ? (
                  <>
                    <text x={staffPrefixCenterX} y="74" className="cut-time-glyph">
                      C
                    </text>
                    <line
                      x1={staffPrefixCenterX + 6}
                      y1="50"
                      x2={staffPrefixCenterX + 6}
                      y2="98"
                      className="cut-time-slasher"
                    />
                  </>
                ) : (
                  <>
                    <text x={staffPrefixCenterX + 7} y="64" className="time-signature-top">
                      {currentRhythm.beats}
                    </text>
                    <text x={staffPrefixCenterX + 7} y="98" className="time-signature-bottom">
                      {currentRhythm.beatType}
                    </text>
                  </>
                )}
              </g>
              {beamSegments.map((segment) => {
                const startX =
                  noteAreaStart + (segment.startPulse / currentRhythm.pulsesPerBar) * noteAreaWidth + 10
                const endX = noteAreaStart + (segment.endPulse / currentRhythm.pulsesPerBar) * noteAreaWidth + 10
                const y = 28 + (segment.level - 1) * 6
                return (
                  <line
                    key={`beam-${segment.level}-${segment.startPulse}-${segment.endPulse}`}
                    x1={startX}
                    y1={y}
                    x2={endX}
                    y2={y}
                    className="note-beam"
                  />
                )
              })}
              {currentRhythm.notes.map((note, index) => {
                const x = noteAreaStart + (note.startPulse / currentRhythm.pulsesPerBar) * noteAreaWidth
                const y = staffYForOffset(note.staffOffset ?? DEFAULT_SNARE_STAFF_OFFSET)
                const isActive = index === activeNoteIndex
                return (
                  <g key={note.id}>
                    <line x1={x + 10} y1={y} x2={x + 10} y2="28" className="note-stem" />
                    <ellipse
                      cx={x}
                      cy={y}
                      rx="10"
                      ry="7"
                      className={`note-head ${isActive ? 'active' : ''}`}
                    />
                    <text x={x} y="162" className="sticking-mark">
                      {note.stick}
                    </text>
                  </g>
                )
              })}
            </>
          ) : (
            <text x="575" y="85" className="staff-empty">
              Load a MusicXML file to display notation.
            </text>
          )}
        </svg>
      </section>

      <section className="panel advanced-panel">
        <details>
          <summary>Practice settings</summary>
          <div className="advanced-grid">
            <div className="control-row">
              <label htmlFor="bpm">BPM (exact)</label>
              <input
                id="bpm"
                type="number"
                min="30"
                max="260"
                value={bpm}
                disabled={controlsDisabled}
                onChange={(event) => setBpm(Math.max(30, Math.min(260, Number(event.target.value) || 90)))}
              />
            </div>
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
              <label htmlFor="countInBars">Count-in bars</label>
              <input
                id="countInBars"
                type="number"
                min="1"
                max="4"
                value={countInBars}
                disabled={controlsDisabled}
                onChange={(event) => setCountInBars(Math.max(1, Math.min(4, Number(event.target.value) || 1)))}
              />
            </div>
            <div className="control-row">
              <label htmlFor="metSubdivision">Metronome subdivision</label>
              <select
                id="metSubdivision"
                value={metSubdivision}
                disabled={controlsDisabled}
                onChange={(event) => setMetSubdivision(Number(event.target.value))}
              >
                {SUBDIVISIONS.map((subdivision) => (
                  <option key={subdivision.value} value={subdivision.value}>
                    {subdivision.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="control-row">
              <label htmlFor="rhythm">Rhythm (measure)</label>
              <select
                id="rhythm"
                value={currentRhythmIndex}
                disabled={controlsDisabled || !hasRhythms}
                onChange={handleRhythmSelect}
              >
                {rhythms.map((rhythm, index) => (
                  <option key={`${rhythm.name}-${index}`} value={index}>
                    {rhythm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className="hint">Use settings when stopped; quick transport controls stay visible above.</p>
        </details>
      </section>

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
    </main>
  )
}

export default App
