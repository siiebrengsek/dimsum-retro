import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startAutoSync } from './utils/offlineQueue'

startAutoSync()

createRoot(document.getElementById('root')!).render(<App />)
