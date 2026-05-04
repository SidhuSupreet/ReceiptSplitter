import type { Session } from '@/features/session/types'

import { buildExportData } from './buildExportRows'

type LastTable = { finalY?: number }
type DocWithLastTable = { lastAutoTable?: LastTable }

function lastFinalY(doc: unknown, fallback: number): number {
  return (doc as DocWithLastTable).lastAutoTable?.finalY ?? fallback
}

/**
 * Lazy-loads jsPDF (~250KB) and jspdf-autotable so they only ship when the
 * user actually downloads a PDF.
 */
export async function exportPdf(session: Session): Promise<void> {
  const [{ jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const autoTable = autoTableModule.default

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' })
  const { itemRows, personRows, settlementRows } = buildExportData(session)
  const date = new Date(session.createdAt)
  const dateLabel = Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString()

  doc.setFontSize(18)
  doc.text('Split summary', 40, 50)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`Created ${dateLabel}`, 40, 68)
  doc.text(`People: ${session.people.map((p) => p.name).join(', ') || '—'}`, 40, 82)

  let cursorY = 110

  if (itemRows.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [
        ['Receipt', 'Item', 'Person', 'Unit', 'Qty', 'Item $', 'Tax $', 'Tip $', 'Total'],
      ],
      body: itemRows.map((r) => [
        r.Receipt,
        r.Item,
        r.Person,
        r['Unit Price'],
        r.Qty || '',
        r['Item Share'],
        r['Tax Share'],
        r['Tip Share'],
        r.Total,
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] },
      columnStyles: {
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'right' },
      },
    })
    cursorY = lastFinalY(doc, cursorY) + 24
  }

  if (personRows.length > 0) {
    doc.setFontSize(14)
    doc.setTextColor(20)
    doc.text('Per-person totals', 40, cursorY)
    cursorY += 8
    autoTable(doc, {
      startY: cursorY,
      head: [['Person', 'Paid', 'Owed', 'Net']],
      body: personRows.map((r) => [r.Person, r.Paid, r.Owed, r.Net]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    })
    cursorY = lastFinalY(doc, cursorY) + 24
  }

  doc.setFontSize(14)
  doc.setTextColor(20)
  doc.text('Settlements', 40, cursorY)
  cursorY += 8
  if (settlementRows.length > 0) {
    autoTable(doc, {
      startY: cursorY,
      head: [['From', 'To', 'Amount']],
      body: settlementRows.map((r) => [r.From, r.To, r.Amount]),
      styles: { fontSize: 10 },
      headStyles: { fillColor: [16, 185, 129] },
      columnStyles: { 2: { halign: 'right' } },
    })
  } else {
    doc.setFontSize(10)
    doc.setTextColor(120)
    doc.text('Everyone is settled up.', 40, cursorY + 18)
  }

  doc.save(`split-${session.id}.pdf`)
}
