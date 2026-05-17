import type { ReactNode } from 'react'

export interface DataTableColumn<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
  className?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  rowKey: (row: T) => string
  emptyMessage?: string
  compact?: boolean
  onRowClick?: (row: T) => void
}

export default function DataTable<T>({
  columns,
  data,
  rowKey,
  emptyMessage = 'No records',
  compact = false,
  onRowClick,
}: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="font-mono text-sm text-text-tertiary py-6">{emptyMessage}</p>
  }

  return (
    <div className="overflow-x-auto -mx-6 px-6">
      <table className="w-full text-left text-sm border-collapse">
        <thead>
          <tr className="font-mono text-[11px] uppercase tracking-label text-text-tertiary border-b border-border-medium">
            {columns.map((col) => (
              <th key={col.key} className={`py-2.5 pr-4 font-medium ${col.className ?? ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={rowKey(row)}
              className={`border-b border-border-subtle hover:bg-bg-elevated/40 transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className={`py-3 pr-4 ${compact ? 'py-2' : ''} ${col.className ?? ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
