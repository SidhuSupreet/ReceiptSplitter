import { useContext } from 'react'

import { CloudShareContext, type CloudShareContextValue } from './cloudShareContext'

export function useCloudShare(): CloudShareContextValue {
  const ctx = useContext(CloudShareContext)
  if (!ctx) throw new Error('useCloudShare must be used inside <CloudShareProvider>')
  return ctx
}
