import Button from '../atoms/Button'
import { BodyText } from '../atoms/Typography'
import { HStack, VStack } from '../layout/Stack'

export default function UploadModal({ onClose, onUploadFile, onLoadDefault }) {
  return (
    <VStack spacing={4}>
      <BodyText>Choose a MusicXML file or load the bundled default exercise.</BodyText>
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
    </VStack>
  )
}
