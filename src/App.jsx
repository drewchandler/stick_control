import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Pause, Play, Settings, SkipBack, SkipForward, Upload } from 'lucide-react'
import './App.css'
import VexflowStaff from './VexflowStaff'
import usePracticeSession from './hooks/usePracticeSession'
import useTransportEngine from './hooks/useTransportEngine'
import useRhythmLibrary from './hooks/useRhythmLibrary'

const SUBDIVISIONS = [
  { label: 'Quarter notes', value: 4, pulses: 24 },
  { label: '8th notes', value: 8, pulses: 12 },
  { label: 'Triplets', value: 12, pulses: 8 },
  { label: '16th notes', value: 16, pulses: 6 },
  { label: '32nd notes', value: 32, pulses: 3 },
]

function App() {
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
    currentBeat,
    phase,
    transportState,
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
  const statusLabel = transportState || (hasRhythms ? 'Ready' : 'Load MusicXML')

  return (
    <main className="app">
      <header className="top-bar">
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
                  loadSample()
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
