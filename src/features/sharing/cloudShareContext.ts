import { createContext } from 'react'

export type CloudShareContextValue = {
  cloudShareId: string | null
  setCloudShareId: (id: string | null) => void
  clearCloudShare: () => void
}

export const CloudShareContext = createContext<CloudShareContextValue | null>(null)
