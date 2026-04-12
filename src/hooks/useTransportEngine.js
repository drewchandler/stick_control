import { useCallback, useEffect, useRef } from 'react'

const PULSES_PER_QUARTER = 24
const SCHEDULE_AHEAD_SECONDS = 0.12
const SCHEDULER_INTERVAL_MS = 25

function totalPulsesForExercise(exercise) {
  return Math.max(1, exercise?.pulsesPerExercise ?? exercise?.pulsesPerBar ?? 1)
}

function timingFromSignature(beats, beatType) {
  const pulsesPerBeat = Math.max(1, Math.round((PULSES_PER_QUARTER * 4) / beatType))
  return {
    beatsPerBar: beats,
    pulsesPerBeat,
    pulsesPerBar: Math.max(1, beats * pulsesPerBeat),
  }
}

function measureForPulse(exercise, pulseInExercise) {
  const measures = exercise?.measures ?? []
  if (!measures.length) {
    return {
      startPulse: 0,
      pulsesPerBar: totalPulsesForExercise(exercise),
      beats: exercise?.beats ?? 4,
      beatType: exercise?.beatType ?? 4,
      timeSymbol: exercise?.timeSymbol ?? '',
    }
  }
  for (const measure of measures) {
    if (pulseInExercise >= measure.startPulse && pulseInExercise < measure.startPulse + measure.pulsesPerBar) {
      return measure
    }
  }
  return measures[measures.length - 1]
}

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

const SUBDIVISIONS = [
  { value: 4, pulses: 24 },
  { value: 8, pulses: 12 },
  { value: 12, pulses: 8 },
  { value: 16, pulses: 6 },
  { value: 32, pulses: 3 },
]

function subdivisionPulseStep(subdivisionValue) {
  return SUBDIVISIONS.find((entry) => entry.value === Number(subdivisionValue))?.pulses ?? 6
}

export default function useTransportEngine({
  getSessionSnapshot,
  setPhase,
  setCurrentRep,
  setCurrentBeat,
  setCountInBlinkTick,
  setActiveNoteIndex,
  setTransportState,
  setShowNextModal,
  setModalText,
  setImportError,
  setCurrentExerciseIndex,
  resetTransportDisplay,
}) {
  const audioContextRef = useRef(null)
  const audioUnlockedRef = useRef(false)
  const schedulerIdRef = useRef(null)
  const scheduledUiTimeoutsRef = useRef([])
  const clockRef = useRef({
    nextPulseTime: 0,
    pulseInBar: 0,
    countInPulse: 0,
  })
  const transportRef = useRef({
    countInPulsesRemaining: 0,
    completedReps: 0,
    noteCursor: 0,
  })
  const startPracticeFromBeginningRef = useRef(async () => {})

  const clearScheduledUiUpdates = useCallback(() => {
    for (const timeoutId of scheduledUiTimeoutsRef.current) {
      window.clearTimeout(timeoutId)
    }
    scheduledUiTimeoutsRef.current = []
  }, [])

  const scheduleUiAtAudioTime = useCallback((time, callback) => {
    const context = audioContextRef.current
    if (!context) {
      callback()
      return
    }
    const delayMs = Math.max(0, (time - context.currentTime) * 1000)
    const timeoutId = window.setTimeout(() => {
      callback()
      scheduledUiTimeoutsRef.current = scheduledUiTimeoutsRef.current.filter((id) => id !== timeoutId)
    }, delayMs)
    scheduledUiTimeoutsRef.current.push(timeoutId)
  }, [])

  const stopScheduler = useCallback(() => {
    if (schedulerIdRef.current) {
      window.clearInterval(schedulerIdRef.current)
      schedulerIdRef.current = null
    }
  }, [])

  const ensureAudioContext = useCallback(async () => {
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
  }, [])

  const playClick = useCallback((time, frequency, gainAmount, durationSeconds) => {
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
  }, [])

  const secondsPerPulse = useCallback(
    (beatType = 4) => {
      const normalizedBeatType = Number.isFinite(beatType) && beatType > 0 ? beatType : 4
      const pulsesPerBeat = Math.max(1, Math.round((PULSES_PER_QUARTER * 4) / normalizedBeatType))
      return 60 / getSessionSnapshot().bpm / pulsesPerBeat
    },
    [getSessionSnapshot],
  )

  const completeExercise = useCallback(
    (audioTime) => {
      const session = getSessionSnapshot()
      const exerciseCount = session.exercises.length
      if (!exerciseCount) {
        return
      }

      setPhase('stopped')
      stopScheduler()
      transportRef.current.completedReps = 0
      transportRef.current.noteCursor = 0
      transportRef.current.countInPulsesRemaining = 0

      const nextIndex = (session.currentExerciseIndex + 1) % exerciseCount
      scheduleUiAtAudioTime(audioTime, () => {
        setCurrentExerciseIndex(nextIndex)
        setCurrentRep(0)
        setActiveNoteIndex(null)
        setCurrentBeat('-')
        const nextExerciseName = session.exercises[nextIndex]?.name ?? 'Next exercise'
        if (session.autoplayNext) {
          setTransportState(`Autoplay: ${nextExerciseName}`)
          setShowNextModal(false)
          void startPracticeFromBeginningRef.current(nextIndex)
          return
        }
        setTransportState('Ready for next exercise')
        setModalText(`Completed ${session.repetitions} reps. Next: ${nextExerciseName}`)
        setShowNextModal(true)
      })
    },
    [
      getSessionSnapshot,
      scheduleUiAtAudioTime,
      setActiveNoteIndex,
      setCurrentBeat,
      setCurrentRep,
      setCurrentExerciseIndex,
      setModalText,
      setPhase,
      setShowNextModal,
      setTransportState,
      stopScheduler,
    ],
  )

  const schedulePulse = useCallback(
    (pulseTime, pulseInBar, exercise, knownMeasure = null) => {
      const transport = transportRef.current
      const session = getSessionSnapshot()
      const activeMeasure = knownMeasure ?? measureForPulse(exercise, pulseInBar)
      const timing = timingFromSignature(activeMeasure.beats, activeMeasure.beatType)
      const pulseInMeasure = pulseInBar - activeMeasure.startPulse
      const clickMode = session.metronomeMode
      const clickStep =
        clickMode === 'subdivision' ? subdivisionPulseStep(session.metronomeSubdivision) : timing.pulsesPerBeat

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

      if (session.phase === 'countIn') {
        transport.countInPulsesRemaining -= 1
        const beat = Math.floor(pulseInMeasure / timing.pulsesPerBeat) + 1
        if (transport.countInPulsesRemaining <= 0) {
          transport.noteCursor = 0
          const firstAtZero = exercise.notes.findIndex((note) => note.startPulse === 0)
          scheduleUiAtAudioTime(pulseTime, () => {
            setPhase('playing')
            setTransportState('Playing')
            setCurrentRep(0)
            setCountInBlinkTick(0)
            setActiveNoteIndex(firstAtZero >= 0 ? firstAtZero : null)
          })
        } else {
          scheduleUiAtAudioTime(pulseTime, () => {
            setCurrentBeat(String(beat))
            setCountInBlinkTick((previous) => previous + 1)
          })
        }
        return
      }

      if (session.phase !== 'playing') {
        return
      }

      while (
        transport.noteCursor < exercise.notes.length &&
        exercise.notes[transport.noteCursor].startPulse <= pulseInBar
      ) {
        if (exercise.notes[transport.noteCursor].startPulse === pulseInBar) {
          const noteIndex = transport.noteCursor
          scheduleUiAtAudioTime(pulseTime, () => {
            setActiveNoteIndex(noteIndex)
          })
        }
        transport.noteCursor += 1
      }

      if (pulseInBar === totalPulsesForExercise(exercise) - 1) {
        transport.completedReps += 1
        transport.noteCursor = 0
        const justCompleted = transport.completedReps
        scheduleUiAtAudioTime(pulseTime, () => {
          setCurrentRep(justCompleted)
        })

        if (justCompleted >= session.repetitions) {
          completeExercise(pulseTime + 0.02)
        }
      }
    },
    [
      completeExercise,
      getSessionSnapshot,
      playClick,
      scheduleUiAtAudioTime,
      setActiveNoteIndex,
      setCurrentBeat,
      setCurrentRep,
      setPhase,
      setCountInBlinkTick,
      setTransportState,
    ],
  )

  const schedulerTick = useCallback(() => {
    if (!audioContextRef.current) {
      return
    }
    const context = audioContextRef.current

    while (clockRef.current.nextPulseTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      const session = getSessionSnapshot()
      const exercise = session.exercises[session.currentExerciseIndex]
      if (!exercise) {
        setPhase('stopped')
        stopScheduler()
        setTransportState('Load MusicXML to start')
        break
      }

      let activeMeasure
      let scheduledPulse
      if (session.phase === 'countIn') {
        const firstMeasure = exercise.measures?.[0] ?? measureForPulse(exercise, 0)
        const countInPulse = clockRef.current.countInPulse
        activeMeasure = {
          ...firstMeasure,
          startPulse: 0,
        }
        scheduledPulse = countInPulse % Math.max(1, firstMeasure.pulsesPerBar)
        schedulePulse(clockRef.current.nextPulseTime, scheduledPulse, exercise, activeMeasure)
        clockRef.current.countInPulse = countInPulse + 1
      } else {
        scheduledPulse = clockRef.current.pulseInBar
        activeMeasure = measureForPulse(exercise, scheduledPulse)
        schedulePulse(clockRef.current.nextPulseTime, scheduledPulse, exercise, activeMeasure)
        clockRef.current.pulseInBar = (clockRef.current.pulseInBar + 1) % totalPulsesForExercise(exercise)
      }
      clockRef.current.nextPulseTime += secondsPerPulse(activeMeasure.beatType)

      if (getSessionSnapshot().phase === 'stopped') {
        break
      }
    }
  }, [getSessionSnapshot, schedulePulse, secondsPerPulse, setPhase, setTransportState, stopScheduler])

  const startScheduler = useCallback(async () => {
    let context
    try {
      context = await ensureAudioContext()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start audio.'
      setImportError(message)
      setPhase('stopped')
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
  }, [ensureAudioContext, schedulerTick, setImportError, setPhase, setTransportState])

  const resetTransport = useCallback(() => {
    setPhase('stopped')
    transportRef.current.completedReps = 0
    transportRef.current.noteCursor = 0
    transportRef.current.countInPulsesRemaining = 0
    stopScheduler()
    clearScheduledUiUpdates()
    clockRef.current.pulseInBar = 0
    clockRef.current.countInPulse = 0
    resetTransportDisplay()
  }, [clearScheduledUiUpdates, resetTransportDisplay, setPhase, stopScheduler])

  const startPracticeFromBeginning = useCallback(async (targetExerciseIndex = null) => {
    const session = getSessionSnapshot()
    const exerciseCount = session.exercises.length
    const resolvedExerciseIndex =
      Number.isInteger(targetExerciseIndex) && exerciseCount
        ? Math.max(0, Math.min(exerciseCount - 1, targetExerciseIndex))
        : session.currentExerciseIndex
    const currentExercise = session.exercises[resolvedExerciseIndex]
    if (!currentExercise) {
      setImportError('Load a MusicXML file before pressing Play.')
      return
    }
    if (resolvedExerciseIndex !== session.currentExerciseIndex) {
      setCurrentExerciseIndex(resolvedExerciseIndex)
    }

    clearScheduledUiUpdates()
    transportRef.current.completedReps = 0
    transportRef.current.noteCursor = 0
    clockRef.current.pulseInBar = 0
    clockRef.current.countInPulse = 0
    setCurrentRep(0)
    setCurrentBeat('-')
    setCountInBlinkTick(0)
    setImportError('')

    if (session.countInEnabled) {
      setPhase('countIn')
      const countInPulses = currentExercise.measures?.[0]?.pulsesPerBar ?? totalPulsesForExercise(currentExercise)
      transportRef.current.countInPulsesRemaining = session.countInBars * countInPulses
      setActiveNoteIndex(null)
      setTransportState('Count-in')
    } else {
      setPhase('playing')
      transportRef.current.countInPulsesRemaining = 0
      const firstAtZero = currentExercise.notes.findIndex((note) => note.startPulse === 0)
      setActiveNoteIndex(firstAtZero >= 0 ? firstAtZero : null)
      setTransportState('Playing')
    }
    await startScheduler()
  }, [
    clearScheduledUiUpdates,
    getSessionSnapshot,
    setActiveNoteIndex,
    setCurrentBeat,
    setCurrentRep,
    setCountInBlinkTick,
    setCurrentExerciseIndex,
    setImportError,
    setPhase,
    setTransportState,
    startScheduler,
  ])

  useEffect(() => {
    startPracticeFromBeginningRef.current = startPracticeFromBeginning
  }, [startPracticeFromBeginning])

  const play = useCallback(async () => {
    const session = getSessionSnapshot()
    setShowNextModal(false)
    if (session.phase === 'paused') {
      setPhase('playing')
      setTransportState('Playing')
      await startScheduler()
      return
    }
    if (session.phase === 'playing' || session.phase === 'countIn') {
      return
    }
    await startPracticeFromBeginning()
  }, [getSessionSnapshot, setPhase, setShowNextModal, setTransportState, startPracticeFromBeginning, startScheduler])

  const pause = useCallback(() => {
    const session = getSessionSnapshot()
    if (session.phase !== 'playing' && session.phase !== 'countIn') {
      return
    }
    setPhase('paused')
    stopScheduler()
    clearScheduledUiUpdates()
    setTransportState('Paused')
  }, [clearScheduledUiUpdates, getSessionSnapshot, setPhase, setTransportState, stopScheduler])

  useEffect(
    () => () => {
      stopScheduler()
      clearScheduledUiUpdates()
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    },
    [clearScheduledUiUpdates, stopScheduler],
  )

  return {
    play,
    pause,
    resetTransport,
    startPracticeFromBeginning,
  }
}
