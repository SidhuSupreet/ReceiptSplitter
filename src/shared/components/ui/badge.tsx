import { cva, type VariantProps } from 'class-variance-authority'
import { type HTMLAttributes } from 'react'

import { cn } from '@/shared/utils/cn'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-(--color-primary) text-(--color-primary-foreground)',
        secondary: 'bg-(--color-secondary) text-(--color-secondary-foreground)',
        outline: 'border border-(--color-border) text-(--color-foreground)',
        destructive: 'bg-(--color-destructive) text-(--color-destructive-foreground)',
        warning: 'bg-amber-100 text-amber-900 dark:bg-amber-900/30 dark:text-amber-200',
        success:
          'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-200',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export type BadgeProps = HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
