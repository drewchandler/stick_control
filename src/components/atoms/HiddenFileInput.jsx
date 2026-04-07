import { forwardRef } from 'react'

const HiddenFileInput = forwardRef(function HiddenFileInput(props, ref) {
  return <input ref={ref} className="sr-only" {...props} />
})

export default HiddenFileInput
