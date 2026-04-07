import { useCallback, useRef } from 'react'
import { parseMusicXmlRhythms } from '../domain/musicXml'

function buildSessionPatchFromParsed(parsed, sourceLabel) {
  const patch = {
    rhythms: parsed.rhythms,
    currentRhythmIndex: 0,
    importError: '',
    importStatus: `Loaded ${parsed.rhythms.length} exercise(s) from "${sourceLabel}"${
      parsed.tempo ? ` (tempo ${Math.round(parsed.tempo)} BPM).` : '.'
    }`,
  }
  if (parsed.tempo) {
    patch.bpm = Math.max(30, Math.min(260, Math.round(parsed.tempo)))
  }
  return patch
}

export default function useRhythmLibrary({
  applySessionPatch,
  resetTransport,
  setImportError,
  setImportStatus,
}) {
  const importRequestIdRef = useRef(0)

  const beginImport = useCallback(() => {
    importRequestIdRef.current += 1
    return importRequestIdRef.current
  }, [])

  const applyIfLatest = useCallback(
    (requestId, patchBuilder) => {
      if (requestId !== importRequestIdRef.current) {
        return false
      }
      resetTransport()
      applySessionPatch(patchBuilder())
      return true
    },
    [applySessionPatch, resetTransport],
  )

  const loadFromText = useCallback(
    async (fileText, sourceLabel) => {
      const requestId = beginImport()
      try {
        const parsed = parseMusicXmlRhythms(fileText)
        applyIfLatest(requestId, () => buildSessionPatchFromParsed(parsed, sourceLabel))
      } catch (error) {
        if (requestId !== importRequestIdRef.current) {
          return
        }
        const message = error instanceof Error ? error.message : 'Failed to load MusicXML file.'
        setImportError(message)
        setImportStatus('')
      }
    },
    [applyIfLatest, beginImport, setImportError, setImportStatus],
  )

  const loadFromFile = useCallback(
    async (file) => {
      if (!file) {
        return
      }
      const lower = file.name.toLowerCase()
      if (!lower.endsWith('.xml') && !lower.endsWith('.musicxml')) {
        setImportError('Please select a MusicXML file (.xml or .musicxml).')
        setImportStatus('')
        return
      }
      const text = await file.text()
      await loadFromText(text, file.name)
    },
    [loadFromText, setImportError, setImportStatus],
  )

  const loadSample = useCallback(async () => {
    const requestId = beginImport()
    try {
      const response = await fetch('./stick-control-page-5.musicxml')
      if (!response.ok) {
        throw new Error('Could not load the bundled default MusicXML file.')
      }
      const text = await response.text()
      const parsed = parseMusicXmlRhythms(text)
      applyIfLatest(requestId, () => buildSessionPatchFromParsed(parsed, 'stick-control-page-5.musicxml'))
    } catch (error) {
      if (requestId !== importRequestIdRef.current) {
        return
      }
      const message = error instanceof Error ? error.message : 'Failed to load default MusicXML file.'
      setImportError(message)
      setImportStatus('')
    }
  }, [applyIfLatest, beginImport, setImportError, setImportStatus])

  return {
    loadFromText,
    loadFromFile,
    loadSample,
  }
}
