import Button from '../atoms/Button'
import TextInput from '../atoms/TextInput'
import Checkbox from '../atoms/Checkbox'
import NativeSelect from '../atoms/NativeSelect'
import { BodyText, LabelText, SectionTitle } from '../atoms/Typography'
import { HStack, VStack } from '../layout/Stack'

export default function SettingsModal({
  controlsDisabled,
  repetitions,
  metronomeMode,
  metronomeSubdivision,
  subdivisions,
  countInEnabled,
  countInBars,
  autoPlayNext,
  onRepetitionsChange,
  onMetronomeModeChange,
  onMetronomeSubdivisionChange,
  onCountInEnabledChange,
  onCountInBarsChange,
  onAutoPlayNextChange,
  onReset,
  onDone,
}) {
  return (
    <VStack gap={16}>
      <SectionTitle>Practice settings</SectionTitle>

      <HStack wrap gap={12} align="start">
        <VStack gap={6} flexBasis={220} minWidth={220} flexGrow>
          <LabelText htmlFor="repetitions">Repetitions per exercise</LabelText>
          <TextInput
            id="repetitions"
            type="number"
            min="1"
            max="200"
            value={repetitions}
            disabled={controlsDisabled}
            onChange={(event) => onRepetitionsChange(event.target.value)}
          />
        </VStack>

        <VStack gap={6} flexBasis={220} minWidth={220} flexGrow>
          <LabelText htmlFor="metronomeMode">Click pattern</LabelText>
          <NativeSelect
            id="metronomeMode"
            value={metronomeMode}
            onChange={(event) => onMetronomeModeChange(event.target.value)}
          >
            <option value="off">Off</option>
            <option value="beats">Beats only</option>
            <option value="subdivision">Beats + subdivision</option>
          </NativeSelect>
        </VStack>

        {metronomeMode === 'subdivision' && (
          <VStack gap={6} flexBasis={220} minWidth={220} flexGrow>
            <LabelText htmlFor="metronomeSubdivision">Subdivision note value</LabelText>
            <NativeSelect
              id="metronomeSubdivision"
              value={metronomeSubdivision}
              onChange={(event) => onMetronomeSubdivisionChange(event.target.value)}
            >
              {subdivisions.map((subdivision) => (
                <option key={subdivision.value} value={subdivision.value}>
                  {subdivision.label}
                </option>
              ))}
            </NativeSelect>
          </VStack>
        )}

        <VStack gap={6} flexBasis={220} minWidth={220} flexGrow>
          <LabelText htmlFor="countInEnabled">Count-in</LabelText>
          <HStack gap={8} align="center">
            <Checkbox
              id="countInEnabled"
              checked={countInEnabled}
              onChange={(event) => onCountInEnabledChange(event.target.checked)}
            />
            <BodyText tone="muted">Enable count-in</BodyText>
          </HStack>
        </VStack>

        {countInEnabled && (
          <VStack gap={6} flexBasis={220} minWidth={220} flexGrow>
            <LabelText htmlFor="countInBars">Count-in bars</LabelText>
            <TextInput
              id="countInBars"
              type="number"
              min="1"
              max="4"
              value={countInBars}
              onChange={(event) => onCountInBarsChange(event.target.value)}
            />
          </VStack>
        )}

        <VStack gap={6} flexBasis={220} minWidth={220} flexGrow>
          <LabelText htmlFor="autoPlayNext">Exercise flow</LabelText>
          <HStack gap={8} align="center">
            <Checkbox
              id="autoPlayNext"
              checked={autoPlayNext}
              onChange={(event) => onAutoPlayNextChange(event.target.checked)}
            />
            <BodyText tone="muted">Autoplay next exercise</BodyText>
          </HStack>
        </VStack>
      </HStack>

      <HStack gap={8} wrap>
        <Button variant="ghost" onClick={onReset}>
          Reset
        </Button>
        <Button variant="secondary" onClick={onDone}>
          Done
        </Button>
      </HStack>
    </VStack>
  )
}
