import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { SessionProvider } from '@/app/providers/SessionProvider'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { CloudShareProvider } from '@/features/sharing/cloudShare'
import { Toaster } from '@/shared/components/ui/toaster'

import { HomePage } from './HomePage'

function renderHome() {
  return render(
    <MemoryRouter>
      <AuthProvider configured={false}>
        <SessionProvider>
          <CloudShareProvider>
            <Toaster>
              <HomePage />
            </Toaster>
          </CloudShareProvider>
        </SessionProvider>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('HomePage — manual entry happy path', () => {
  it('walks from empty state to a complete settlement', async () => {
    const user = userEvent.setup()
    renderHome()

    // Add two people in one shot
    await user.type(screen.getByLabelText(/add people/i), 'Alex, Jordan')
    await user.click(screen.getByRole('button', { name: /^add$/i }))

    // Open the add-receipt dialog and switch to the manual tab
    await user.click(screen.getByRole('button', { name: /add receipt/i }))
    await user.click(screen.getByRole('tab', { name: /enter manually/i }))

    // Fill in the receipt label
    await user.type(screen.getByLabelText(/receipt label/i), 'Lunch')

    // Fill the first item row: Alex's salad $10
    const itemNameInputs = screen.getAllByLabelText(/item name/i)
    const priceInputs = screen.getAllByLabelText(/unit price/i)
    await user.type(itemNameInputs[0], 'Salad')
    await user.clear(priceInputs[0])
    await user.type(priceInputs[0], '10')

    // Add a second row for Jordan's burger $20
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: /^add item$/i }),
    )
    const itemNameInputsAfter = screen.getAllByLabelText(/item name/i)
    const priceInputsAfter = screen.getAllByLabelText(/unit price/i)
    await user.type(itemNameInputsAfter[1], 'Burger')
    await user.clear(priceInputsAfter[1])
    await user.type(priceInputsAfter[1], '20')

    // Submit the manual entry form
    await user.click(screen.getByRole('button', { name: /^add receipt$/i }))

    // The settlement panel should warn about unassigned items
    expect(screen.getByText(/some items are unassigned/i)).toBeInTheDocument()

    // Share both items across all people via the "All" shortcut on each row
    const allButtons = screen.getAllByRole('button', { name: /^all$/i })
    expect(allButtons).toHaveLength(2)
    for (const btn of allButtons) await user.click(btn)

    // Log Alex paid $30 (covers the full $30 receipt)
    const alexPayInput = screen.getByLabelText(/alex payment amount/i)
    await user.clear(alexPayInput)
    await user.type(alexPayInput, '30')

    // Each owes $15, Alex paid $30, Jordan paid $0 ⇒ Jordan pays Alex $15
    const settlementHeader = screen.getByText(/settlement summary/i)
    const settlementCard = settlementHeader.closest(
      'div[class*="rounded-2xl"]',
    ) as HTMLElement
    const settlementsList = await within(settlementCard).findByRole('list')
    const settlementItems = within(settlementsList).getAllByRole('listitem')
    expect(settlementItems).toHaveLength(1)
    expect(settlementItems[0]).toHaveTextContent(/jordan/i)
    expect(settlementItems[0]).toHaveTextContent(/alex/i)
    expect(settlementItems[0]).toHaveTextContent('$15.00')
  })
})
