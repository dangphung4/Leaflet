import '../globals.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { AuthProvider } from './Core/Auth/AuthContext'
import { GoogleAuthProvider } from './Core/Auth/GoogleAuthProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleAuthProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GoogleAuthProvider>
  </StrictMode>,
)
