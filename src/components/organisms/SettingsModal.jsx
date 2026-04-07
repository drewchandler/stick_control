import ModalCard from '../atoms/ModalCard'
import Button from '../atoms/Button'
import TextInput from '../atoms/TextInput'
import Checkbox from '../atoms/Checkbox'
import NativeSelect from '../atoms/NativeSelect'
import { BodyText, LabelText, SectionTitle } from '../atoms/Typography'
import { HStack, VStack } from '../layout/Stack'
import Container from '../atoms/Container'

export default function SettingsModal({
  controlsDisabled,
  repetitions,
  metronomeMode,
  metSubdivision,
  subdivisions,
  countInEnabled,
  countInBars,
  onRepetitionsChange,
  onMetronomeModeChange,
  onMetSubdivisionChange,
  onCountInEnabledChange,
  onCountInBarsChange,
  onReset,
  onDone,
}) {
  return (
    <ModalCard container="modalWide">
      <VStack spacing={4}>
        <SectionTitle>Practice settings</SectionTitle>
        <Container variant="formGridTwoCol">
          <VStack spacing={1}>
            <LabelText htmlFor="repetitions">Repetitions per rhythm</LabelText>
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

          <VStack spacing={1}>
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
            <VStack spacing={1}>
              <LabelText htmlFor="metSubdivision">Subdivision note value</LabelText>
              <NativeSelect
                id="metSubdivision"
                value={metSubdivision}
                onChange={(event) => onMetSubdivisionChange(event.target.value)}
              >
                {subdivisions.map((subdivision) => (
                  <option key={subdivision.value} value={subdivision.value}>
                    {subdivision.label}
                  </option>
                ))}
              </NativeSelect>
            </VStack>
          )}

          <VStack spacing={1}>
            <Checkbox
              id="countInEnabled"
              checked={countInEnabled}
              onChange={(event) => onCountInEnabledChange(event.target.checked)}
              label="Enable count-in"
            />
          </VStack>

          {countInEnabled && (
            <VStack spacing={1}>
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
        </Container>
        <HStack spacing={2} wrap>
          <Button variant="ghost" onClick={onReset}>
            Reset
          </Button>
          <Button variant="secondary" onClick={onDone}>
            Done
          </Button>
        </HStack>
        <BodyText tone="subtleXs">
          Settings updates apply to the current and next transport starts.
        </BodyText>
      </VStack>
    </ModalCard>
  )
}
