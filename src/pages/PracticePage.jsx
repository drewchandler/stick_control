import { useEffect, useMemo, useRef, useState } from 'react'
import VexflowStaff from '../VexflowStaff'
import usePracticeSession from '../hooks/usePracticeSession'
import useTransportEngine from '../hooks/useTransportEngine'
import useExerciseLibrary from '../hooks/useExerciseLibrary'
import PracticeTemplate from '../components/templates/PracticeTemplate'
import TransportDock from '../components/organisms/TransportDock'
import SettingsModal from '../components/organisms/SettingsModal'
import UploadModal from '../components/organisms/UploadModal'
import Card from '../components/atoms/Card'
import Button from '../components/atoms/Button'
import Toast from '../components/atoms/Toast'
import ThemeToggleButton from '../components/atoms/ThemeToggleButton'
import UpNextPreview from '../components/atoms/UpNextPreview'
import Modal from '../components/molecules/Modal'
import HiddenFileInput from '../components/atoms/HiddenFileInput'
import { BodyText } from '../components/atoms/Typography'
import ExerciseDropdown from '../components/atoms/ExerciseDropdown'
import Container from '../components/atoms/Container'
import { VStack, HStack } from '../components/layout/Stack'
import useTheme from '../hooks/useTheme'

export default function PracticePage() {
  const { theme, toggleTheme } = useTheme()
  const {
    state: practiceSession,
    actions: {
      setBpm,
      setRepetitions,
      setCountInBars,
      setCountInEnabled,
      setAutoplayNext: setAutoPlayNext,
      setMetronomeSubdivision,
      setMetronomeMode,
      setCurrentExerciseIndex,
      setPhase,
      setCurrentRep,
      setCurrentBeat,
      setCountInBlinkTick,
      setActiveNoteIndex,
      setTransportState,
      setShowNextModal,
      setModalText,
      setImportStatus,
      setImportError,
      applySessionPatch,
      resetTransportDisplay,
    },
  } = usePracticeSession()
  const {
    bpm,
    repetitions,
    countInBars,
    countInEnabled,
    autoplayNext: autoPlayNext,
    metronomeSubdivision,
    metronomeMode,
    exercises,
    currentExerciseIndex,
    currentRep,
    activeNoteIndex,
    currentBeat,
    countInBlinkTick,
    phase,
    showNextModal,
    modalText,
    importStatus,
    importError,
  } = practiceSession

  const [tempoInput, setTempoInput] = useState('90')
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showMetronomeModal, setShowMetronomeModal] = useState(false)
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false)

  const fileInputRef = useRef(null)
  const exerciseDropdownRef = useRef(null)
  const hasAutoLoadedSampleRef = useRef(false)
  const latestSessionRef = useRef(practiceSession)

  useEffect(() => {
    latestSessionRef.current = practiceSession
  }, [practiceSession])

  const getSessionSnapshot = useMemo(() => () => latestSessionRef.current, [])

  const { play, pause, resetTransport } = useTransportEngine({
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
  })

  const { loadFromFile, loadSample } = useExerciseLibrary({
    applySessionPatch,
    resetTransport,
    setImportError,
    setImportStatus,
  })

  useEffect(() => {
    setTempoInput(String(bpm))
  }, [bpm])

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
  }, [importStatus, setImportStatus])

  useEffect(() => {
    if (hasAutoLoadedSampleRef.current) {
      return
    }
    hasAutoLoadedSampleRef.current = true
    loadSample()
  }, [loadSample])

  const currentExercise = useMemo(
    () => exercises[currentExerciseIndex] ?? null,
    [exercises, currentExerciseIndex],
  )

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

  function handlePause() {
    pause()
  }

  function handlePlay() {
    play()
  }

  function handleReset() {
    resetTransport()
  }

  function handleNextExercise() {
    if (!exercises.length) {
      return
    }
    handleReset()
    const nextIndex = (currentExerciseIndex + 1) % exercises.length
    setCurrentExerciseIndex(nextIndex)
  }

  function handlePreviousExercise() {
    if (!exercises.length) {
      return
    }
    handleReset()
    const previousIndex = (currentExerciseIndex - 1 + exercises.length) % exercises.length
    setCurrentExerciseIndex(previousIndex)
  }

  function handleExerciseSelect(newIndex) {
    if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= exercises.length) {
      return
    }
    handleReset()
    setCurrentExerciseIndex(newIndex)
    setShowExerciseDropdown(false)
  }

  async function handleExerciseFileChange(event) {
    const file = event.target.files?.[0]
    try {
      await loadFromFile(file)
    } finally {
      event.target.value = ''
    }
  }

  const controlsDisabled = phase === 'playing' || phase === 'countIn'
  const isTransportRunning = phase === 'playing' || phase === 'countIn'
  const hasExercises = exercises.length > 0
  const playPauseLabel = isTransportRunning ? 'Pause' : phase === 'paused' ? 'Resume' : 'Play'
  const currentExerciseLabel = hasExercises
    ? currentExercise?.name ?? `Exercise ${currentExerciseIndex + 1}`
    : 'No exercises loaded'
  const nextExercise = hasExercises ? exercises[(currentExerciseIndex + 1) % exercises.length] ?? null : null
  const shouldShowUpNextPreview =
    Boolean(autoPlayNext) &&
    phase === 'playing' &&
    hasExercises &&
    currentRep === Math.max(0, repetitions - 1)
  const remainingReps = Math.max(0, repetitions - currentRep)
  const metronomeSubdivisionOptions = [
    { value: 4, label: 'Quarter notes' },
    { value: 8, label: 'Eighth notes' },
    { value: 12, label: 'Eighth-note triplets' },
    { value: 16, label: 'Sixteenth notes' },
    { value: 32, label: 'Thirty-second notes' },
  ]

  return (
    <PracticeTemplate
      title="Stick Control Practice"
      headerAccessory={<ThemeToggleButton theme={theme} onToggle={toggleTheme} />}
      notation={
        <VStack gap={10}>
          <Container ref={exerciseDropdownRef} minWidth="zero" width="max" flex="grow">
            <ExerciseDropdown
              label={currentExerciseLabel}
              options={exercises}
              selectedIndex={currentExerciseIndex}
              open={showExerciseDropdown}
              disabled={!hasExercises || controlsDisabled}
              onToggle={() => setShowExerciseDropdown((previous) => !previous)}
              onSelect={handleExerciseSelect}
            />
          </Container>
          {shouldShowUpNextPreview ? <UpNextPreview exercise={nextExercise} /> : null}
          {importError ? <BodyText tone="danger">{importError}</BodyText> : null}
          <VexflowStaff
            exercise={currentExercise}
            activeNoteIndex={activeNoteIndex}
            currentBeat={currentBeat}
            phase={phase}
            countInBlinkTick={countInBlinkTick}
            remainingReps={remainingReps}
          />
        </VStack>
      }
      transportDock={
        <TransportDock
          hasExercises={hasExercises}
          isTransportRunning={isTransportRunning}
          playPauseLabel={playPauseLabel}
          tempoInput={tempoInput}
          onTempoInputChange={setTempoInput}
          onTempoInputCommit={commitTempoInput}
          onTempoAdjust={adjustBpm}
          onPrevious={handlePreviousExercise}
          onNext={handleNextExercise}
          onPlay={handlePlay}
          onPause={handlePause}
          onOpenLibrary={() => setShowUploadModal(true)}
          onOpenSettings={() => setShowMetronomeModal(true)}
        />
      }
    >
      <HiddenFileInput
        ref={fileInputRef}
        type="file"
        accept=".xml,.musicxml,text/xml,application/xml"
        onChange={handleExerciseFileChange}
      />

      <Modal open={showUploadModal} onClose={() => setShowUploadModal(false)}>
        <UploadModal
          onUploadFile={() => {
            setShowUploadModal(false)
            handleOpenFilePicker()
          }}
          onLoadDefault={() => {
            setShowUploadModal(false)
            loadSample()
          }}
          onClose={() => setShowUploadModal(false)}
        />
      </Modal>

      <Modal open={showMetronomeModal} cardWidth="wide" onClose={() => setShowMetronomeModal(false)}>
        <SettingsModal
          controlsDisabled={controlsDisabled}
          repetitions={repetitions}
          onRepetitionsChange={(value) => setRepetitions(Math.max(1, Math.min(200, Number(value) || 20)))}
          autoPlayNext={autoPlayNext}
          onAutoPlayNextChange={setAutoPlayNext}
          metronomeMode={metronomeMode}
          onMetronomeModeChange={setMetronomeMode}
          metronomeSubdivision={metronomeSubdivision}
          subdivisions={metronomeSubdivisionOptions}
          onMetronomeSubdivisionChange={(value) => setMetronomeSubdivision(Number(value))}
          countInEnabled={countInEnabled}
          onCountInEnabledChange={setCountInEnabled}
          countInBars={countInBars}
          onCountInBarsChange={(value) => setCountInBars(Math.max(1, Math.min(4, Number(value) || 1)))}
          onReset={handleReset}
        />
      </Modal>

      <Modal open={showNextModal} cardWidth="lg" onClose={() => setShowNextModal(false)}>
        <Card variant="surface">
          <VStack spacing={4}>
            <BodyText>{modalText}</BodyText>
            <HStack spacing={2}>
              <Button onClick={handlePlay}>Start next exercise</Button>
              <Button variant="ghost" onClick={() => setShowNextModal(false)}>
                Later
              </Button>
            </HStack>
          </VStack>
        </Card>
      </Modal>

      {importStatus && <Toast>{importStatus}</Toast>}
    </PracticeTemplate>
  )
}
