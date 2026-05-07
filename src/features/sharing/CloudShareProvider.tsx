import { type ReactNode, useCallback, useMemo, useState } from 'react'

import { CloudShareContext } from './cloudShareContext'

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
