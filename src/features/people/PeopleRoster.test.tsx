import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { SessionProvider } from '@/app/providers/SessionProvider'
import { Toaster } from '@/shared/components/ui/toaster'

import { PeopleRoster } from './PeopleRoster'

function renderWithProviders() {
  return render(
    <SessionProvider>
      <Toaster>
        <PeopleRoster />
      </Toaster>
    </SessionProvider>,
  )
}

describe('PeopleRoster', () => {
  it('adds a single person and clears the input', async () => {
    const user = userEvent.setup()
    renderWithProviders()

    await user.type(screen.getByLabelText(/add people/i), 'Alex')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByLabelText(/add people/i)).toHaveValue('')
  })

  it('adds multiple comma-separated people in one shot', async () => {
    const user = userEvent.setup()
    renderWithProviders()

    await user.type(screen.getByLabelText(/add people/i), 'Alex, Jordan, Sam')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    expect(screen.getByText('Alex')).toBeInTheDocument()
    expect(screen.getByText('Jordan')).toBeInTheDocument()
    expect(screen.getByText('Sam')).toBeInTheDocument()
  })

  it('removes a person after confirmation', async () => {
    const user = userEvent.setup()
    renderWithProviders()

    await user.type(screen.getByLabelText(/add people/i), 'Alex')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    await user.click(screen.getByRole('button', { name: /remove alex/i }))
    await user.click(screen.getByRole('button', { name: /^remove$/i }))

    expect(screen.queryByText('Alex')).not.toBeInTheDocument()
  })
})
