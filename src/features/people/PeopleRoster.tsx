import { Plus, Trash2, Users } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import type { Person } from '@/features/session/types'
import { useSession } from '@/features/session/useSession'
import { Button } from '@/shared/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import { Input } from '@/shared/components/ui/input'
import { useToast } from '@/shared/components/ui/toaster'

import { PersonAvatar } from './PersonPill'

const SPLIT_REGEX = /[\n,]+/

function splitNames(input: string): string[] {
  return input
    .split(SPLIT_REGEX)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function PeopleRoster() {
  const { session, dispatch } = useSession()
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<Person | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<Person | null>(null)
  const { toast } = useToast()

  function handleAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const names = splitNames(draft)
    if (names.length === 0) return
    dispatch({ type: 'ADD_PEOPLE', names })
    setDraft('')
  }

  function handleRename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    dispatch({ type: 'RENAME_PERSON', personId: editing.id, name: editing.name })
    setEditing(null)
  }

  function handleRemove(person: Person) {
    dispatch({ type: 'REMOVE_PERSON', personId: person.id })
    setConfirmRemove(null)
    toast({
      title: `Removed ${person.name}`,
      description: 'Their assignments and payments were cleared.',
    })
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4 text-(--color-muted-foreground)" />
          People
        </CardTitle>
        <span className="text-xs text-(--color-muted-foreground)">
          {session.people.length} {session.people.length === 1 ? 'person' : 'people'}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add names — comma or newline separated"
            aria-label="Add people"
          />
          <Button type="submit" disabled={splitNames(draft).length === 0}>
            <Plus className="size-4" />
            Add
          </Button>
        </form>

        {session.people.length === 0 ? (
          <p className="rounded-lg border border-dashed border-(--color-border) p-4 text-center text-sm text-(--color-muted-foreground)">
            Add at least two people to start splitting.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-(--color-border) overflow-hidden rounded-lg border border-(--color-border)">
            {session.people.map((person) => (
              <li
                key={person.id}
                className="flex items-center gap-3 bg-(--color-background) px-3 py-2"
              >
                <PersonAvatar person={person} />
                <button
                  type="button"
                  className="flex-1 truncate text-left text-sm font-medium hover:underline"
                  onClick={() => setEditing(person)}
                >
                  {person.name}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove ${person.name}`}
                  onClick={() => setConfirmRemove(person)}
                >
                  <Trash2 className="size-4 text-(--color-muted-foreground)" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename person</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <Input
              autoFocus
              value={editing?.name ?? ''}
              onChange={(e) =>
                setEditing((prev) => (prev ? { ...prev, name: e.target.value } : null))
              }
              aria-label="Person name"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={confirmRemove !== null}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove {confirmRemove?.name}?</DialogTitle>
            <DialogDescription>
              All of their item assignments and payments will be cleared. This can&apos;t
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => confirmRemove && handleRemove(confirmRemove)}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
