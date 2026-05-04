import { type ButtonHTMLAttributes, forwardRef } from 'react'

import type { Person } from '@/features/session/types'
import { cn } from '@/shared/utils/cn'

import { colorFor, initialsFor } from './personColors'

type PersonPillProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  person: Person
  selected?: boolean
  size?: 'sm' | 'md'
}

export const PersonPill = forwardRef<HTMLButtonElement, PersonPillProps>(
  function PersonPill({ person, selected, className, size = 'md', ...props }, ref) {
    const color = colorFor(person.id)
    const sizes = size === 'sm' ? 'h-7 px-2 text-xs gap-1.5' : 'h-8 px-3 text-sm gap-2'
    const initialsSize = size === 'sm' ? 'size-4 text-[10px]' : 'size-5 text-[11px]'
    return (
      <button
        ref={ref}
        type="button"
        aria-pressed={selected}
        className={cn(
          'inline-flex items-center rounded-full border font-medium transition-all',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-background)',
          sizes,
          color.bg,
          color.text,
          color.dark,
          selected
            ? 'border-current shadow-sm ring-1 ring-current/20'
            : 'border-transparent opacity-60 hover:opacity-100',
          props.disabled && 'cursor-not-allowed opacity-40',
          className,
        )}
        {...props}
      >
        <span
          className={cn(
            'flex items-center justify-center rounded-full font-bold text-white',
            color.dot,
            initialsSize,
          )}
          aria-hidden
        >
          {initialsFor(person.name)}
        </span>
        <span className="truncate max-w-32">{person.name}</span>
      </button>
    )
  },
)

type PersonAvatarProps = {
  person: Person
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function PersonAvatar({ person, size = 'md', className }: PersonAvatarProps) {
  const color = colorFor(person.id)
  const sizes = {
    sm: 'size-5 text-[10px]',
    md: 'size-7 text-xs',
    lg: 'size-9 text-sm',
  }[size]
  return (
    <span
      className={cn(
        'flex items-center justify-center rounded-full font-semibold text-white',
        color.dot,
        sizes,
        className,
      )}
      aria-label={person.name}
    >
      {initialsFor(person.name)}
    </span>
  )
}
