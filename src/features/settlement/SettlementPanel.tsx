import { ArrowRight, CheckCircle2, Receipt as ReceiptIcon, Scale } from 'lucide-react'
import { type ReactNode, useMemo } from 'react'

import { PersonAvatar } from '@/features/people/PersonPill'
import type { Session } from '@/features/session/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import { Separator } from '@/shared/components/ui/separator'
import { formatCents } from '@/shared/utils/money'

import { BalanceRow } from './BalanceRow'
import { computeBalances } from './computeBalances'
import { computeSettlements } from './computeSettlements'

type SettlementPanelProps = {
  session: Session
  /** Slot rendered in the header for actions like share/export. */
  actions?: ReactNode
}

function hasUnassignedItems(session: Session): boolean {
  return session.receipts.some((r) => r.items.some((i) => i.assignedTo.length === 0))
}

export function SettlementPanel({ session, actions }: SettlementPanelProps) {
  const balances = useMemo(() => computeBalances(session), [session])
  const settlements = useMemo(() => computeSettlements(balances), [balances])
  const peopleById = useMemo(
    () => new Map(session.people.map((p) => [p.id, p])),
    [session.people],
  )
  const blocked = hasUnassignedItems(session)

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Scale className="size-4 text-(--color-muted-foreground)" />
            Settlement summary
          </CardTitle>
          <p className="text-xs text-(--color-muted-foreground)">
            Minimal payments to settle every receipt.
          </p>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </CardHeader>
      <CardContent className="space-y-4">
        {session.people.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon />}
            title="Add people to get started"
            description="Once you’ve added at least two people and one receipt, the settlement breakdown shows up here."
          />
        ) : (
          <>
            <div className="space-y-1">
              {session.people.map((person) => {
                const balance = balances.find((b) => b.personId === person.id)
                if (!balance) return null
                return <BalanceRow key={person.id} person={person} balance={balance} />
              })}
            </div>

            <Separator />

            {blocked ? (
              <div className="rounded-md border border-amber-300/50 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-950/40 dark:text-amber-100">
                Some items are unassigned. Assign every item to see the final settlement.
              </div>
            ) : settlements.length === 0 ? (
              <div className="flex items-center gap-2 rounded-md border border-emerald-300/50 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-100">
                <CheckCircle2 className="size-4" />
                Everyone is settled up.
              </div>
            ) : (
              <ul className="space-y-2">
                {settlements.map((s, idx) => {
                  const from = peopleById.get(s.fromPersonId)
                  const to = peopleById.get(s.toPersonId)
                  if (!from || !to) return null
                  return (
                    <li
                      key={`${s.fromPersonId}-${s.toPersonId}-${idx}`}
                      className="flex items-center gap-3 rounded-lg border border-(--color-border) bg-(--color-muted)/30 px-3 py-2 text-sm"
                    >
                      <PersonAvatar person={from} size="sm" />
                      <span className="font-medium">{from.name}</span>
                      <span className="text-(--color-muted-foreground)">pays</span>
                      <PersonAvatar person={to} size="sm" />
                      <span className="font-medium">{to.name}</span>
                      <ArrowRight className="size-3.5 text-(--color-muted-foreground)" />
                      <span className="ml-auto font-semibold tabular-nums">
                        {formatCents(s.amountCents)}
                      </span>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-(--color-border) p-8 text-center">
      <div className="text-(--color-muted-foreground) [&_svg]:size-6">{icon}</div>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-sm text-xs text-(--color-muted-foreground)">{description}</p>
    </div>
  )
}
