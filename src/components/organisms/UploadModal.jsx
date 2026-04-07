import Backdrop from '../atoms/Backdrop'
import ModalCard from '../atoms/ModalCard'
import Button from '../atoms/Button'
import { BodyText } from '../atoms/Typography'
import { HStack, VStack } from '../layout/Stack'

export default function UploadModal({ open, onClose, onUploadFile, onLoadDefault }) {
  if (!open) {
    return null
  }

  return (
    <Backdrop>
      <ModalCard title="Load MusicXML">
        <VStack spacing={4}>
          <BodyText>Choose a MusicXML file or load the bundled default rhythm.</BodyText>
          <HStack spacing={2} wrap>
            <Button
              onClick={() => {
                onClose()
                onUploadFile()
              }}
            >
              Upload file
            </Button>
            <Button
              onClick={() => {
                onClose()
                onLoadDefault()
              }}
            >
              Load default
            </Button>
          </HStack>
          <HStack spacing={2}>
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </HStack>
        </VStack>
      </ModalCard>
    </Backdrop>
  )
}
