import { PersonAvatar } from '@/features/people/PersonPill'
import type { Person, PersonBalance } from '@/features/session/types'
import { cn } from '@/shared/utils/cn'
import { formatCents } from '@/shared/utils/money'

type BalanceRowProps = {
  person: Person
  balance: PersonBalance
}

export function BalanceRow({ person, balance }: BalanceRowProps) {
  const positive = balance.netCents > 0
  const negative = balance.netCents < 0
  return (
    <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-3 rounded-lg px-2 py-2 text-sm">
      <PersonAvatar person={person} size="sm" />
      <span className="truncate font-medium">{person.name}</span>
      <span className="tabular-nums text-(--color-muted-foreground)">
        paid {formatCents(balance.paidCents)}
      </span>
      <span className="tabular-nums text-(--color-muted-foreground)">
        owes {formatCents(balance.owedCents)}
      </span>
      <span
        className={cn(
          'min-w-16 text-right font-semibold tabular-nums',
          positive && 'text-emerald-700 dark:text-emerald-300',
          negative && 'text-rose-700 dark:text-rose-300',
        )}
      >
        {formatCents(balance.netCents, { signed: true })}
      </span>
    </div>
  )
}
