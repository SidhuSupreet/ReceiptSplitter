import { ReceiptText } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthProvider'
import { SignInButton } from '@/features/auth/SignInButton'
import { UserMenu } from '@/features/auth/UserMenu'
import { ThemeToggle } from '@/features/theme/ThemeToggle'

export function AppHeader() {
  const location = useLocation()
  const isShared = location.pathname.startsWith('/session/')
  const { configured, user } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-(--color-border) bg-(--color-background)/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          to="/"
          className="flex items-center gap-2 text-base font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-lg bg-(--color-primary) text-(--color-primary-foreground) shadow-sm">
            <ReceiptText className="size-4" />
          </span>
          <span>Split</span>
          {isShared ? (
            <span className="ml-2 rounded-full border border-(--color-border) px-2 py-0.5 text-xs font-medium text-(--color-muted-foreground)">
              shared view
            </span>
          ) : null}
        </Link>
        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-(--color-muted-foreground) sm:block">
            Settle group bills with no math
          </p>
          <ThemeToggle />
          {configured ? user ? <UserMenu /> : <SignInButton size="medium" /> : null}
        </div>
      </div>
    </header>
  )
}
