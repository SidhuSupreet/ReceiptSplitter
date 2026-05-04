const PALETTE = [
  {
    bg: 'bg-rose-100',
    text: 'text-rose-900',
    dot: 'bg-rose-500',
    dark: 'dark:bg-rose-900/30 dark:text-rose-100',
  },
  {
    bg: 'bg-orange-100',
    text: 'text-orange-900',
    dot: 'bg-orange-500',
    dark: 'dark:bg-orange-900/30 dark:text-orange-100',
  },
  {
    bg: 'bg-amber-100',
    text: 'text-amber-900',
    dot: 'bg-amber-500',
    dark: 'dark:bg-amber-900/30 dark:text-amber-100',
  },
  {
    bg: 'bg-emerald-100',
    text: 'text-emerald-900',
    dot: 'bg-emerald-500',
    dark: 'dark:bg-emerald-900/30 dark:text-emerald-100',
  },
  {
    bg: 'bg-teal-100',
    text: 'text-teal-900',
    dot: 'bg-teal-500',
    dark: 'dark:bg-teal-900/30 dark:text-teal-100',
  },
  {
    bg: 'bg-sky-100',
    text: 'text-sky-900',
    dot: 'bg-sky-500',
    dark: 'dark:bg-sky-900/30 dark:text-sky-100',
  },
  {
    bg: 'bg-indigo-100',
    text: 'text-indigo-900',
    dot: 'bg-indigo-500',
    dark: 'dark:bg-indigo-900/30 dark:text-indigo-100',
  },
  {
    bg: 'bg-fuchsia-100',
    text: 'text-fuchsia-900',
    dot: 'bg-fuchsia-500',
    dark: 'dark:bg-fuchsia-900/30 dark:text-fuchsia-100',
  },
] as const

export type PersonColor = (typeof PALETTE)[number]

function hashString(input: string): number {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function colorFor(personId: string): PersonColor {
  return PALETTE[hashString(personId) % PALETTE.length]
}

export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
