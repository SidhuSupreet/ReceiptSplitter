import { ImagePlus, Loader2 } from 'lucide-react'
import { type ChangeEvent, type DragEvent, useRef, useState } from 'react'

import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

type UploadZoneProps = {
  onFile: (file: File) => void
  busy?: boolean
  busyMessage?: string
  accept?: string
}

const DEFAULT_ACCEPT = 'image/png,image/jpeg,image/heic,image/heif,image/webp'

export function UploadZone({
  onFile,
  busy = false,
  busyMessage,
  accept = DEFAULT_ACCEPT,
}: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) onFile(file)
    e.target.value = ''
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) onFile(file)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !busy && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (!busy) inputRef.current?.click()
        }
      }}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors',
        'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-(--color-ring)',
        dragOver
          ? 'border-(--color-primary) bg-(--color-accent)'
          : 'border-(--color-border) bg-(--color-background) hover:border-(--color-primary)/50 hover:bg-(--color-muted)',
        busy && 'pointer-events-none opacity-70',
      )}
    >
      {busy ? (
        <>
          <Loader2 className="size-8 animate-spin text-(--color-primary)" />
          <p className="text-sm font-medium">{busyMessage ?? 'Reading receipt…'}</p>
        </>
      ) : (
        <>
          <ImagePlus className="size-8 text-(--color-muted-foreground)" />
          <div>
            <p className="text-sm font-medium">Drop a receipt photo here</p>
            <p className="text-xs text-(--color-muted-foreground)">
              or tap to choose from your device
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" tabIndex={-1}>
            Choose image
          </Button>
        </>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  )
}
