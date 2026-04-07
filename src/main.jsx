import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PracticePage from './pages/PracticePage'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PracticePage />
  </StrictMode>,
)
