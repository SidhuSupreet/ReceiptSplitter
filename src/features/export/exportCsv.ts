import Papa from 'papaparse'

import type { Session } from '@/features/session/types'

import { buildExportData } from './buildExportRows'
import { downloadFile } from './downloadFile'

export function exportCsv(session: Session): void {
  const { itemRows, personRows, settlementRows } = buildExportData(session)

  const itemsCsv = Papa.unparse(itemRows, { skipEmptyLines: true })
  const peopleCsv = Papa.unparse(personRows)
  const settlementsCsv =
    settlementRows.length > 0 ? Papa.unparse(settlementRows) : 'No settlements'

  const csv = [
    '# Items',
    itemsCsv || 'No items',
    '',
    '# Per-person totals',
    peopleCsv || 'No people',
    '',
    '# Settlements',
    settlementsCsv,
  ].join('\n')

  downloadFile(`split-${session.id}.csv`, 'text/csv;charset=utf-8', csv)
}
