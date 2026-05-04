import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useMemo,
  useReducer,
} from 'react'

import {
  createEmptySession,
  type SessionAction,
  sessionReducer,
} from '@/features/session/sessionReducer'
import { readSession, writeSession } from '@/features/session/sessionStorage'
import type { Session } from '@/features/session/types'
import { useDebouncedEffect } from '@/shared/hooks/useDebouncedEffect'

type SessionContextValue = {
  session: Session
  dispatch: Dispatch<SessionAction>
}

const SessionContext = createContext<SessionContextValue | null>(null)

const PERSIST_DELAY_MS = 300

function initSession(): Session {
  return readSession() ?? createEmptySession()
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, dispatch] = useReducer(sessionReducer, undefined, initSession)

  useDebouncedEffect(
    () => {
      writeSession(session)
    },
    [session],
    PERSIST_DELAY_MS,
  )

  const value = useMemo(() => ({ session, dispatch }), [session])

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSessionContext(): SessionContextValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>')
  return ctx
}
