import './index.css'

import { GoogleOAuthProvider } from '@react-oauth/google'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'

import App from '@/app/App'
import { AuthProvider } from '@/features/auth/AuthProvider'

const rootEl = document.getElementById('root')
if (!rootEl) throw new Error('Root element not found')

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
const authConfigured = Boolean(googleClientId)

const tree = (
  <StrictMode>
    <HashRouter>
      <AuthProvider configured={authConfigured}>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>
)

// GoogleOAuthProvider requires a client ID; only mount it when one is set.
createRoot(rootEl).render(
  authConfigured ? (
    <GoogleOAuthProvider clientId={googleClientId as string}>{tree}</GoogleOAuthProvider>
  ) : (
    tree
  ),
)
