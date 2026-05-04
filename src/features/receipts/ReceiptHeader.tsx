import { MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import type { Receipt } from '@/features/session/types'
import { useSession } from '@/features/session/useSession'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'

type ReceiptHeaderProps = {
  receipt: Receipt
  readOnly?: boolean
}

export function ReceiptHeader({ receipt, readOnly = false }: ReceiptHeaderProps) {
  const { dispatch } = useSession()
  const [renaming, setRenaming] = useState(false)
  const [draft, setDraft] = useState(receipt.label)
  const [confirmRemove, setConfirmRemove] = useState(false)

  function handleRename(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!draft.trim()) return
    dispatch({ type: 'RENAME_RECEIPT', receiptId: receipt.id, label: draft })
    setRenaming(false)
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="truncate text-base font-semibold tracking-tight">
          {receipt.label}
        </h3>
        <p className="text-xs text-(--color-muted-foreground)">
          {receipt.items.length} {receipt.items.length === 1 ? 'item' : 'items'}
        </p>
      </div>
      {!readOnly ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Receipt actions">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => {
                setDraft(receipt.label)
                setRenaming(true)
              }}
            >
              <Pencil />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-(--color-destructive) focus:bg-(--color-destructive) focus:text-(--color-destructive-foreground)"
              onClick={() => setConfirmRemove(true)}
            >
              <Trash2 />
              Delete receipt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <Dialog open={renaming} onOpenChange={setRenaming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename receipt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRename} className="space-y-4">
            <Input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              aria-label="Receipt label"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRenaming(false)}>
                Cancel
              </Button>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmRemove} onOpenChange={setConfirmRemove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this receipt?</DialogTitle>
            <DialogDescription>
              All of its items, tax/tip, and payment records will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmRemove(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                dispatch({ type: 'REMOVE_RECEIPT', receiptId: receipt.id })
                setConfirmRemove(false)
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
