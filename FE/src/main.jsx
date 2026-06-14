import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import './index.css'
import './styles/premium-ui.css'
import './styles/dark-theme.css'
import './styles/student-mobile.css'
import './styles/ctsv-partner.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
