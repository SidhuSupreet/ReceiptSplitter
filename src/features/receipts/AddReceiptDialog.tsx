import { Keyboard, ScanLine } from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { useSession } from '@/features/session/useSession'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

import { ManualEntryForm, type ManualEntryResult } from './ManualEntryForm'
import { ReceiptScanFlow } from './ReceiptScanFlow'

type AddReceiptDialogProps = {
  trigger: ReactNode
}

function buildReceiptFromManual(result: ManualEntryResult, fallbackIndex: number) {
  return {
    label: result.label || `Receipt ${fallbackIndex}`,
    items: result.items.map((i) => ({
      ...i,
      assignedTo: [] as string[],
      receiptId: '',
      id: '',
    })),
    taxCents: result.taxCents,
    tipCents: result.tipCents,
  }
}

export function AddReceiptDialog({ trigger }: AddReceiptDialogProps) {
  const { session, dispatch } = useSession()
  const [open, setOpen] = useState(false)

  function commitManual(result: ManualEntryResult) {
    dispatch({
      type: 'ADD_RECEIPT',
      receipt: buildReceiptFromManual(result, session.receipts.length + 1),
    })
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a receipt</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="upload">
          <TabsList>
            <TabsTrigger value="upload">
              <ScanLine className="size-4" />
              Scan image
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Keyboard className="size-4" />
              Enter manually
            </TabsTrigger>
          </TabsList>
          <TabsContent value="upload">
            <ReceiptScanFlow
              onCommit={() => setOpen(false)}
              onCancel={() => setOpen(false)}
            />
          </TabsContent>
          <TabsContent value="manual">
            <ManualEntryForm onSubmit={commitManual} onCancel={() => setOpen(false)} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
