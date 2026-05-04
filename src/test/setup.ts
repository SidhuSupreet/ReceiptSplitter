import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

function resetStorage() {
  if (typeof window === 'undefined') return
  try {
    const storage = window.localStorage as Storage | undefined
    if (!storage) return
    if (typeof storage.clear === 'function') {
      storage.clear()
      return
    }
    for (let i = storage.length - 1; i >= 0; i--) {
      const key = storage.key(i)
      if (key !== null) storage.removeItem(key)
    }
  } catch {
    // jsdom may throw in unusual environments; ignore.
  }
}

beforeEach(resetStorage)

afterEach(() => {
  cleanup()
  resetStorage()
})
