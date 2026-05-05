import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

type CloudShareContextValue = {
  cloudShareId: string | null
  setCloudShareId: (id: string | null) => void
  clearCloudShare: () => void
}

const CloudShareContext = createContext<CloudShareContextValue | null>(null)

export function CloudShareProvider({ children }: { children: ReactNode }) {
  const [cloudShareId, setCloudShareIdState] = useState<string | null>(null)

  const setCloudShareId = useCallback((id: string | null) => {
    setCloudShareIdState(id)
  }, [])

  const clearCloudShare = useCallback(() => {
    setCloudShareIdState(null)
  }, [])

  const value = useMemo(
    () => ({ cloudShareId, setCloudShareId, clearCloudShare }),
    [cloudShareId, setCloudShareId, clearCloudShare],
  )

  return <CloudShareContext.Provider value={value}>{children}</CloudShareContext.Provider>
}

export function useCloudShare(): CloudShareContextValue {
  const ctx = useContext(CloudShareContext)
  if (!ctx) throw new Error('useCloudShare must be used inside <CloudShareProvider>')
  return ctx
}
