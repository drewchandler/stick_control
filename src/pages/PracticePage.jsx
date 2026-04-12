import { useEffect, useMemo, useRef, useState } from 'react'
import VexflowStaff from '../VexflowStaff'
import usePracticeSession from '../hooks/usePracticeSession'
import useTransportEngine from '../hooks/useTransportEngine'
import useRhythmLibrary from '../hooks/useRhythmLibrary'
import PracticeTemplate from '../components/templates/PracticeTemplate'
import TransportDock from '../components/organisms/TransportDock'
import SettingsModal from '../components/organisms/SettingsModal'
import UploadModal from '../components/organisms/UploadModal'
import Card from '../components/atoms/Card'
import Button from '../components/atoms/Button'
import Toast from '../components/atoms/Toast'
import Modal from '../components/molecules/Modal'
import HiddenFileInput from '../components/atoms/HiddenFileInput'
import { BodyText } from '../components/atoms/Typography'
import ExerciseDropdown from '../components/atoms/ExerciseDropdown'
import Container from '../components/atoms/Container'
import { VStack } from '../components/layout/Stack'

export default function PracticePage() {
  const {
    state: practiceSession,
    actions: {
      setBpm,
      setRepetitions,
      setCountInBars,
      setCountInEnabled,
      setMetSubdivision,
      setMetronomeMode,
      setCurrentRhythmIndex,
      setPhase,
      setCurrentRep,
      setCurrentBeat,
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
    metSubdivision,
    metronomeMode,
    rhythms,
    currentRhythmIndex,
    currentRep,
    activeNoteIndex,
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
    setActiveNoteIndex,
    setTransportState,
    setShowNextModal,
    setModalText,
    setImportError,
    setCurrentRhythmIndex,
    resetTransportDisplay,
  })

  const { loadFromFile, loadSample } = useRhythmLibrary({
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

  const currentRhythm = useMemo(() => rhythms[currentRhythmIndex] ?? null, [rhythms, currentRhythmIndex])

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

  function handleNextRhythm() {
    if (!rhythms.length) {
      return
    }
    handleReset()
    const nextIndex = (currentRhythmIndex + 1) % rhythms.length
    setCurrentRhythmIndex(nextIndex)
  }

  function handlePreviousRhythm() {
    if (!rhythms.length) {
      return
    }
    handleReset()
    const previousIndex = (currentRhythmIndex - 1 + rhythms.length) % rhythms.length
    setCurrentRhythmIndex(previousIndex)
  }

  function handleRhythmSelect(newIndex) {
    if (!Number.isInteger(newIndex) || newIndex < 0 || newIndex >= rhythms.length) {
      return
    }
    handleReset()
    setCurrentRhythmIndex(newIndex)
    setShowExerciseDropdown(false)
  }

  async function handleRhythmFileChange(event) {
    const file = event.target.files?.[0]
    try {
      await loadFromFile(file)
    } finally {
      event.target.value = ''
    }
  }

  const controlsDisabled = phase === 'playing' || phase === 'countIn'
  const isTransportRunning = phase === 'playing' || phase === 'countIn'
  const hasRhythms = rhythms.length > 0
  const playPauseLabel = isTransportRunning ? 'Pause' : phase === 'paused' ? 'Resume' : 'Play'
  const currentExerciseLabel = hasRhythms ? currentRhythm?.name ?? `Exercise ${currentRhythmIndex + 1}` : 'No exercises loaded'
  const remainingReps = Math.max(0, repetitions - currentRep)
  const metSubdivisionOptions = [
    { value: 4, label: 'Quarter notes' },
    { value: 8, label: 'Eighth notes' },
    { value: 12, label: 'Eighth-note triplets' },
    { value: 16, label: 'Sixteenth notes' },
    { value: 32, label: 'Thirty-second notes' },
  ]

  return (
    <PracticeTemplate
      title="Stick Control Practice"
      notation={
        <VStack gap={10}>
          <Container ref={exerciseDropdownRef} minWidth="zero" width="max" flex="grow">
            <ExerciseDropdown
              label={currentExerciseLabel}
              options={rhythms}
              selectedIndex={currentRhythmIndex}
              open={showExerciseDropdown}
              disabled={!hasRhythms || controlsDisabled}
              onToggle={() => setShowExerciseDropdown((previous) => !previous)}
              onSelect={handleRhythmSelect}
            />
          </Container>
          {importError ? <BodyText tone="danger">{importError}</BodyText> : null}
          <VexflowStaff rhythm={currentRhythm} activeNoteIndex={activeNoteIndex} remainingReps={remainingReps} />
        </VStack>
      }
      transportDock={
        <TransportDock
          hasRhythms={hasRhythms}
          isTransportRunning={isTransportRunning}
          playPauseLabel={playPauseLabel}
          tempoInput={tempoInput}
          onTempoInputChange={setTempoInput}
          onTempoInputCommit={commitTempoInput}
          onTempoAdjust={adjustBpm}
          onPrevious={handlePreviousRhythm}
          onNext={handleNextRhythm}
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
        onChange={handleRhythmFileChange}
      />

      <Modal open={showUploadModal}>
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

      <Modal open={showMetronomeModal} cardWidth="wide">
        <SettingsModal
          controlsDisabled={controlsDisabled}
          repetitions={repetitions}
          onRepetitionsChange={(value) => setRepetitions(Math.max(1, Math.min(200, Number(value) || 20)))}
          metronomeMode={metronomeMode}
          onMetronomeModeChange={setMetronomeMode}
          metSubdivision={metSubdivision}
          subdivisions={metSubdivisionOptions}
          onMetSubdivisionChange={(value) => setMetSubdivision(Number(value))}
          countInEnabled={countInEnabled}
          onCountInEnabledChange={setCountInEnabled}
          countInBars={countInBars}
          onCountInBarsChange={(value) => setCountInBars(Math.max(1, Math.min(4, Number(value) || 1)))}
          onReset={handleReset}
          onDone={() => setShowMetronomeModal(false)}
        />
      </Modal>

      <Modal open={showNextModal} cardWidth="lg">
        <Card variant="surface">
          <VStack spacing={4}>
            <BodyText>{modalText}</BodyText>
            <HStack spacing={2}>
              <Button onClick={handlePlay}>Start next rhythm</Button>
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
