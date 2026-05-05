import { ExternalLink, History, Loader2, LogOut, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'
import { buildShortShareUrl } from '@/features/sharing/shareEncoding'
import { listMySplits, type SavedSplitMeta } from '@/features/sharing/splitsApi'
import { Button } from '@/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'

export function UserMenu() {
  const { user, signOut, idToken } = useAuth()
  const [historyOpen, setHistoryOpen] = useState(false)

  if (!user) return null

  const label = user.name ?? user.email

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2 px-2">
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="size-7 rounded-full"
              />
            ) : (
              <span className="grid size-7 place-items-center rounded-full bg-(--color-muted) text-(--color-muted-foreground)">
                <User className="size-4" />
              </span>
            )}
            <span className="hidden max-w-[10rem] truncate text-sm sm:inline">{label}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-(--color-muted-foreground)">{user.email}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setHistoryOpen(true)}>
            <History className="size-4" />
            Past splits
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PastSplitsDialog open={historyOpen} onOpenChange={setHistoryOpen} idToken={idToken} />
    </>
  )
}

function PastSplitsDialog({
  open,
  onOpenChange,
  idToken,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  idToken: string | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="size-4" />
            Past splits
          </DialogTitle>
          <DialogDescription>
            Cloud-stored splits you published with a short link (same Google account).
          </DialogDescription>
        </DialogHeader>

        {open && idToken ? (
          <PastSplitsList idToken={idToken} />
        ) : (
          <p className="text-sm text-(--color-muted-foreground)">Sign in to load your list.</p>
        )}

        <Button variant="outline" className="w-full" asChild>
          <Link to="/" onClick={() => onOpenChange(false)}>
            Back to editor
          </Link>
        </Button>
      </DialogContent>
    </Dialog>
  )
}

function PastSplitsList({ idToken }: { idToken: string }) {
  const [state, setState] = useState<
    | { status: 'loading' }
    | { status: 'ok'; splits: SavedSplitMeta[] }
    | { status: 'error'; message: string }
  >({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    listMySplits(idToken).then((result) => {
      if (cancelled) return
      if (result.ok) setState({ status: 'ok', splits: result.splits })
      else setState({ status: 'error', message: result.error })
    })
    return () => {
      cancelled = true
    }
  }, [idToken])

  if (state.status === 'loading') {
    return (
      <div className="flex items-center gap-2 text-sm text-(--color-muted-foreground)">
        <Loader2 className="size-4 animate-spin" />
        Loading…
      </div>
    )
  }

  if (state.status === 'error') {
    return <p className="text-sm text-destructive">{state.message}</p>
  }

  if (state.splits.length === 0) {
    return (
      <p className="text-sm text-(--color-muted-foreground)">
        No saved splits yet. Share a session and choose “Create short link”.
      </p>
    )
  }

  return (
    <ul className="flex max-h-64 flex-col gap-1 overflow-y-auto pr-1">
      {state.splits.map((s) => (
        <li
          key={`${s.shareId}-${s.createdAt}`}
          className="flex items-center justify-between gap-2 rounded-md border border-(--color-border) px-2 py-2 text-sm"
        >
          <div className="min-w-0 flex-1">
            <div className="truncate font-mono text-xs text-(--color-muted-foreground)">
              {s.shareId}
            </div>
            <div className="text-xs text-(--color-muted-foreground)">
              {new Date(s.createdAt).toLocaleString()}
            </div>
          </div>
          <Button variant="ghost" size="icon" className="shrink-0" asChild>
            <a
              href={buildShortShareUrl(s.shareId)}
              target="_blank"
              rel="noreferrer"
              title="Open in new tab"
            >
              <ExternalLink className="size-4" />
            </a>
          </Button>
        </li>
      ))}
    </ul>
  )
}
