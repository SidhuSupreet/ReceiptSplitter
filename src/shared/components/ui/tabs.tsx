import * as TabsPrimitive from '@radix-ui/react-tabs'
import { type ComponentPropsWithoutRef, forwardRef } from 'react'

import { cn } from '@/shared/utils/cn'

export const Tabs = TabsPrimitive.Root

export const TabsList = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-lg bg-(--color-muted) p-1 text-(--color-muted-foreground)',
        className,
      )}
      {...props}
    />
  )
})

export const TabsTrigger = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-(--color-background) transition-all',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-ring) focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        'data-[state=active]:bg-(--color-card) data-[state=active]:text-(--color-foreground) data-[state=active]:shadow-sm',
        className,
      )}
      {...props}
    />
  )
})

export const TabsContent = forwardRef<
  React.ComponentRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn(
        'mt-4 ring-offset-(--color-background) focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-ring) focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    />
  )
})
