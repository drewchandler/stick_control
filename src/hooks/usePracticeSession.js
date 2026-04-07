import { useMemo, useReducer } from 'react'

const INITIAL_STATE = {
  bpm: 90,
  repetitions: 20,
  countInBars: 1,
  countInEnabled: true,
  metSubdivision: 8,
  metronomeMode: 'subdivision',
  rhythms: [],
  currentRhythmIndex: 0,
  currentRep: 0,
  activeNoteIndex: null,
  currentBeat: '-',
  phase: 'stopped',
  transportState: '',
  showNextModal: false,
  modalText: '',
  importStatus: 'Loading bundled default MusicXML...',
  importError: '',
}

function resolveNextValue(previous, nextOrUpdater) {
  return typeof nextOrUpdater === 'function' ? nextOrUpdater(previous) : nextOrUpdater
}

function clampNumber(value, minimum, maximum, fallback) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(minimum, Math.min(maximum, parsed))
}

function clampIndex(index, listLength) {
  if (!listLength) {
    return 0
  }
  if (!Number.isInteger(index)) {
    return 0
  }
  return Math.max(0, Math.min(listLength - 1, index))
}

export function practiceSessionReducer(state, action) {
  switch (action.type) {
    case 'settings/setBpm': {
      const next = Math.round(clampNumber(resolveNextValue(state.bpm, action.value), 30, 260, state.bpm))
      if (next === state.bpm) {
        return state
      }
      return { ...state, bpm: next }
    }
    case 'settings/setRepetitions': {
      const next = Math.round(clampNumber(resolveNextValue(state.repetitions, action.value), 1, 200, state.repetitions))
      if (next === state.repetitions) {
        return state
      }
      return { ...state, repetitions: next }
    }
    case 'settings/setCountInBars': {
      const next = Math.round(clampNumber(resolveNextValue(state.countInBars, action.value), 1, 4, state.countInBars))
      if (next === state.countInBars) {
        return state
      }
      return { ...state, countInBars: next }
    }
    case 'settings/setCountInEnabled': {
      const next = Boolean(resolveNextValue(state.countInEnabled, action.value))
      if (next === state.countInEnabled) {
        return state
      }
      return { ...state, countInEnabled: next }
    }
    case 'settings/setMetronomeMode': {
      const requested = resolveNextValue(state.metronomeMode, action.value)
      const next =
        requested === 'off' || requested === 'beats' || requested === 'subdivision' ? requested : state.metronomeMode
      if (next === state.metronomeMode) {
        return state
      }
      return { ...state, metronomeMode: next }
    }
    case 'settings/setMetSubdivision': {
      const allowed = new Set([4, 8, 12, 16, 32])
      const requested = Number(resolveNextValue(state.metSubdivision, action.value))
      const next = allowed.has(requested) ? requested : state.metSubdivision
      if (next === state.metSubdivision) {
        return state
      }
      return { ...state, metSubdivision: next }
    }
    case 'library/setRhythms': {
      const nextRhythms = Array.isArray(action.rhythms) ? action.rhythms : []
      const nextIndex = clampIndex(state.currentRhythmIndex, nextRhythms.length)
      return {
        ...state,
        rhythms: nextRhythms,
        currentRhythmIndex: nextIndex,
      }
    }
    case 'library/setCurrentRhythmIndex': {
      const rawNext = resolveNextValue(state.currentRhythmIndex, action.value)
      const nextIndex = clampIndex(rawNext, state.rhythms.length)
      if (nextIndex === state.currentRhythmIndex) {
        return state
      }
      return { ...state, currentRhythmIndex: nextIndex }
    }
    case 'transport/resetDisplay': {
      return {
        ...state,
        currentRep: 0,
        activeNoteIndex: null,
        currentBeat: '-',
        transportState: '',
        showNextModal: false,
      }
    }
    case 'transport/setPhase': {
      const requested = resolveNextValue(state.phase, action.value)
      const allowed = new Set(['stopped', 'countIn', 'playing', 'paused'])
      const next = allowed.has(requested) ? requested : state.phase
      if (next === state.phase) {
        return state
      }
      return { ...state, phase: next }
    }
    case 'transport/setBeat': {
      const next = String(resolveNextValue(state.currentBeat, action.value))
      if (next === state.currentBeat) {
        return state
      }
      return { ...state, currentBeat: next }
    }
    case 'transport/setRep': {
      const next = Math.max(0, Math.round(Number(resolveNextValue(state.currentRep, action.value)) || 0))
      if (next === state.currentRep) {
        return state
      }
      return { ...state, currentRep: next }
    }
    case 'transport/setActiveNoteIndex': {
      const resolved = resolveNextValue(state.activeNoteIndex, action.value)
      const next = Number.isInteger(resolved) && resolved >= 0 ? resolved : null
      if (next === state.activeNoteIndex) {
        return state
      }
      return { ...state, activeNoteIndex: next }
    }
    case 'transport/setStatus': {
      const next = String(resolveNextValue(state.transportState, action.value))
      if (next === state.transportState) {
        return state
      }
      return { ...state, transportState: next }
    }
    case 'transport/setNextModal': {
      const nextShow = Boolean(action.show)
      const nextText = action.text == null ? state.modalText : String(action.text)
      if (nextShow === state.showNextModal && nextText === state.modalText) {
        return state
      }
      return { ...state, showNextModal: nextShow, modalText: nextText }
    }
    case 'import/setStatus': {
      const next = String(resolveNextValue(state.importStatus, action.value))
      if (next === state.importStatus) {
        return state
      }
      return { ...state, importStatus: next }
    }
    case 'import/setError': {
      const next = String(resolveNextValue(state.importError, action.value))
      if (next === state.importError) {
        return state
      }
      return { ...state, importError: next }
    }
    case 'session/applyPatch': {
      const next = { ...state, ...(action.patch ?? {}) }
      if (next.currentRhythmIndex !== state.currentRhythmIndex || next.rhythms !== state.rhythms) {
        next.currentRhythmIndex = clampIndex(next.currentRhythmIndex, next.rhythms?.length ?? 0)
      }
      return next
    }
    default:
      return state
  }
}

export default function usePracticeSession() {
  const [state, dispatch] = useReducer(practiceSessionReducer, INITIAL_STATE)
  const actions = useMemo(
    () => ({
      setBpm: (value) => dispatch({ type: 'settings/setBpm', value }),
      setRepetitions: (value) => dispatch({ type: 'settings/setRepetitions', value }),
      setCountInBars: (value) => dispatch({ type: 'settings/setCountInBars', value }),
      setCountInEnabled: (value) => dispatch({ type: 'settings/setCountInEnabled', value }),
      setMetSubdivision: (value) => dispatch({ type: 'settings/setMetSubdivision', value }),
      setMetronomeMode: (value) => dispatch({ type: 'settings/setMetronomeMode', value }),
      setRhythms: (rhythms) => dispatch({ type: 'library/setRhythms', rhythms }),
      setCurrentRhythmIndex: (value) => dispatch({ type: 'library/setCurrentRhythmIndex', value }),
      setPhase: (value) => dispatch({ type: 'transport/setPhase', value }),
      setCurrentRep: (value) => dispatch({ type: 'transport/setRep', value }),
      setCurrentBeat: (value) => dispatch({ type: 'transport/setBeat', value }),
      setActiveNoteIndex: (value) => dispatch({ type: 'transport/setActiveNoteIndex', value }),
      setTransportState: (value) => dispatch({ type: 'transport/setStatus', value }),
      setShowNextModal: (show, text) => dispatch({ type: 'transport/setNextModal', show, text }),
      resetTransportDisplay: () => dispatch({ type: 'transport/resetDisplay' }),
      setImportStatus: (value) => dispatch({ type: 'import/setStatus', value }),
      setImportError: (value) => dispatch({ type: 'import/setError', value }),
      applySessionPatch: (patch) => dispatch({ type: 'session/applyPatch', patch }),
    }),
    [],
  )

  return { state, actions, dispatch }
}
