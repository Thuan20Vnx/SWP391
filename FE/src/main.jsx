import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tailwind.css'
import './index.css'
import './styles/premium-ui.css'
import './styles/dark-theme.css'
import './styles/announce-dark-theme.css'
import './styles/dark-theme-force.css'
import './styles/admin-dashboard-dark.css'
import { I18nProvider } from './i18n/I18nContext'
import { initThemeFromStorage } from './hooks/useSettingsPreferences'
import App from './App.jsx'

initThemeFromStorage();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
)
