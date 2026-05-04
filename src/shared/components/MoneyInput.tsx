import { type ChangeEvent, type FocusEvent, forwardRef, useEffect, useState } from 'react'

import { Input, type InputProps } from '@/shared/components/ui/input'
import { centsToDollars, dollarsToCents } from '@/shared/utils/money'

type MoneyInputProps = Omit<
  InputProps,
  'onChange' | 'value' | 'defaultValue' | 'type'
> & {
  cents: number
  onCentsChange: (cents: number) => void
}

export const MoneyInput = forwardRef<HTMLInputElement, MoneyInputProps>(
  function MoneyInput({ cents, onCentsChange, onBlur, onFocus, ...rest }, ref) {
    const [draft, setDraft] = useState<string>(centsToDollars(cents))
    const [focused, setFocused] = useState(false)

    useEffect(() => {
      if (!focused) setDraft(centsToDollars(cents))
    }, [cents, focused])

    function handleChange(e: ChangeEvent<HTMLInputElement>) {
      const next = e.target.value
      setDraft(next)
      onCentsChange(dollarsToCents(next))
    }

    function handleFocus(e: FocusEvent<HTMLInputElement>) {
      setFocused(true)
      onFocus?.(e)
    }

    function handleBlur(e: FocusEvent<HTMLInputElement>) {
      setFocused(false)
      setDraft(centsToDollars(cents))
      onBlur?.(e)
    }

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        {...rest}
      />
    )
  },
)
