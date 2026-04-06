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

function practiceSessionReducer(state, action) {
  switch (action.type) {
    case 'setField': {
      const previous = state[action.field]
      const next = resolveNextValue(previous, action.value)
      if (Object.is(previous, next)) {
        return state
      }
      return {
        ...state,
        [action.field]: next,
      }
    }
    case 'setRhythms': {
      const nextRhythms = Array.isArray(action.rhythms) ? action.rhythms : []
      let nextIndex = state.currentRhythmIndex
      if (!nextRhythms.length || nextIndex >= nextRhythms.length) {
        nextIndex = 0
      }
      return {
        ...state,
        rhythms: nextRhythms,
        currentRhythmIndex: nextIndex,
      }
    }
    case 'setCurrentRhythmIndex': {
      if (!state.rhythms.length) {
        if (state.currentRhythmIndex === 0) {
          return state
        }
        return {
          ...state,
          currentRhythmIndex: 0,
        }
      }
      const rawNext = resolveNextValue(state.currentRhythmIndex, action.value)
      if (!Number.isInteger(rawNext)) {
        return state
      }
      const nextIndex = Math.max(0, Math.min(state.rhythms.length - 1, rawNext))
      if (nextIndex === state.currentRhythmIndex) {
        return state
      }
      return {
        ...state,
        currentRhythmIndex: nextIndex,
      }
    }
    default:
      return state
  }
}

export default function usePracticeSession() {
  const [state, dispatch] = useReducer(practiceSessionReducer, INITIAL_STATE)
  const actions = useMemo(
    () => ({
      setBpm: (value) => dispatch({ type: 'setField', field: 'bpm', value }),
      setRepetitions: (value) => dispatch({ type: 'setField', field: 'repetitions', value }),
      setCountInBars: (value) => dispatch({ type: 'setField', field: 'countInBars', value }),
      setCountInEnabled: (value) => dispatch({ type: 'setField', field: 'countInEnabled', value }),
      setMetSubdivision: (value) => dispatch({ type: 'setField', field: 'metSubdivision', value }),
      setMetronomeMode: (value) => dispatch({ type: 'setField', field: 'metronomeMode', value }),
      setCurrentRep: (value) => dispatch({ type: 'setField', field: 'currentRep', value }),
      setActiveNoteIndex: (value) => dispatch({ type: 'setField', field: 'activeNoteIndex', value }),
      setCurrentBeat: (value) => dispatch({ type: 'setField', field: 'currentBeat', value }),
      setPhase: (value) => dispatch({ type: 'setField', field: 'phase', value }),
      setTransportState: (value) => dispatch({ type: 'setField', field: 'transportState', value }),
      setShowNextModal: (value) => dispatch({ type: 'setField', field: 'showNextModal', value }),
      setModalText: (value) => dispatch({ type: 'setField', field: 'modalText', value }),
      setImportStatus: (value) => dispatch({ type: 'setField', field: 'importStatus', value }),
      setImportError: (value) => dispatch({ type: 'setField', field: 'importError', value }),
      setRhythms: (rhythms) => dispatch({ type: 'setRhythms', rhythms }),
      setCurrentRhythmIndex: (value) => dispatch({ type: 'setCurrentRhythmIndex', value }),
    }),
    [],
  )

  return { state, actions }
}
