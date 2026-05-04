import { Route, Routes } from 'react-router-dom'

import { SessionProvider } from '@/app/providers/SessionProvider'
import { Toaster } from '@/shared/components/ui/toaster'

import { AppHeader } from './components/AppHeader'
import { HomePage } from './pages/HomePage'
import { SharedSessionPage } from './pages/SharedSessionPage'

function App() {
  return (
    <SessionProvider>
      <Toaster>
        <div className="flex min-h-full flex-col bg-(--color-background)">
          <AppHeader />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/session/:id" element={<SharedSessionPage />} />
            </Routes>
          </main>
        </div>
      </Toaster>
    </SessionProvider>
  )
}

export default App
