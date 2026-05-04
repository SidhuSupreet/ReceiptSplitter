import { Download, FileSpreadsheet, FileText } from 'lucide-react'
import { useState } from 'react'

import type { Session } from '@/features/session/types'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { useToast } from '@/shared/components/ui/toaster'

import { exportCsv } from './exportCsv'
import { exportPdf } from './exportPdf'

type ExportMenuProps = {
  session: Session
}

export function ExportMenu({ session }: ExportMenuProps) {
  const { toast } = useToast()
  const [busy, setBusy] = useState<'csv' | 'pdf' | null>(null)

  async function runExport(kind: 'csv' | 'pdf') {
    setBusy(kind)
    try {
      if (kind === 'csv') exportCsv(session)
      else await exportPdf(session)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed'
      toast({ title: 'Export failed', description: message, variant: 'destructive' })
    } finally {
      setBusy(null)
    }
  }

  const empty = session.people.length === 0 || session.receipts.length === 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={empty || busy !== null}>
          <Download className="size-4" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={busy !== null} onClick={() => runExport('csv')}>
          <FileSpreadsheet />
          Download CSV
        </DropdownMenuItem>
        <DropdownMenuItem disabled={busy !== null} onClick={() => runExport('pdf')}>
          <FileText />
          Download PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
