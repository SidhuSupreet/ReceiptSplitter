import * as CheckboxPrimitive from '@radix-ui/react-checkbox'
import { Check } from 'lucide-react'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'

import { cn } from '@/shared/utils/cn'

export const Checkbox = forwardRef<
  React.ComponentRef<typeof CheckboxPrimitive.Root>,
  ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <CheckboxPrimitive.Root
      ref={ref}
      className={cn(
        'peer size-4 shrink-0 rounded-sm border border-(--color-input) shadow-sm transition-colors',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-background)',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-(--color-primary) data-[state=checked]:text-(--color-primary-foreground) data-[state=checked]:border-(--color-primary)',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
        <Check className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
})
