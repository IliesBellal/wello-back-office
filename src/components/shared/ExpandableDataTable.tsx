import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface ColumnConfig<T> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

/**
 * Sélection de lignes par cases à cocher. L'état est tenu par le parent (les
 * identifiants survivent à un changement de page) ; la case de l'en-tête
 * coche / décoche les lignes sélectionnables des données affichées.
 */
export interface RowSelection<T> {
  /** Champ de la ligne qui l'identifie dans `selected`. */
  rowKey: keyof T;
  selected: ReadonlySet<string>;
  onChange: (next: Set<string>) => void;
  /** Lignes qui peuvent être cochées ; toutes par défaut. */
  isSelectable?: (row: T) => boolean;
  /** Info-bulle d'une ligne qui ne peut pas être cochée. */
  unselectableReason?: string;
  /** Libellé accessible de la case de l'en-tête. */
  headerLabel?: string;
}

export interface ExpandableDataTableProps<T> {
  columns: ColumnConfig<T>[];
  data: T[];
  expandableRowKey?: keyof T;
  renderExpandedRow?: (row: T) => React.ReactNode;
  onRowClick?: (row: T) => void;
  initialSortBy?: keyof T;
  initialSortDir?: 'asc' | 'desc';
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  headerClassName?: string;
  selection?: RowSelection<T>;
}

export function ExpandableDataTable<T extends Record<string, any>>({
  columns,
  data,
  expandableRowKey,
  renderExpandedRow,
  onRowClick,
  initialSortBy,
  initialSortDir = 'desc',
  emptyMessage = 'Aucune donnée',
  emptyIcon,
  headerClassName,
  selection,
}: ExpandableDataTableProps<T>) {
  const isExpandable = Boolean(renderExpandedRow && expandableRowKey);
  const leadingColumns = (isExpandable ? 1 : 0) + (selection ? 1 : 0);
  const [expandedRows, setExpandedRows] = useState<Set<string | number>>(new Set());
  const [sortColumn, setSortColumn] = useState<keyof T | undefined>(initialSortBy);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialSortDir);

  const handleSort = (column: keyof T) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const toggleRowExpand = (rowId: string | number | undefined) => {
    if (!isExpandable || rowId === undefined || rowId === null) {
      return;
    }

    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(rowId)) {
      newExpanded.delete(rowId);
    } else {
      newExpanded.add(rowId);
    }
    setExpandedRows(newExpanded);
  };

  const sortedData = useMemo(() => {
    if (!sortColumn) return data;

    const sorted = [...data].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      // Handle string comparison
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      // Handle number comparison
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      // Handle date comparison
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === 'asc' 
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      // Default comparison
      const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortColumn, sortDirection]);

  const isRowSelectable = (row: T) => (selection?.isSelectable ? selection.isSelectable(row) : true);
  const selectableIds = selection
    ? data.filter(isRowSelectable).map((row) => String(row[selection.rowKey]))
    : [];
  const selectedCount = selection ? selectableIds.filter((id) => selection.selected.has(id)).length : 0;
  const allSelected = selectableIds.length > 0 && selectedCount === selectableIds.length;
  const headerChecked: boolean | 'indeterminate' = allSelected ? true : selectedCount > 0 ? 'indeterminate' : false;

  const toggleAll = () => {
    if (!selection) return;
    const next = new Set(selection.selected);
    selectableIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
    selection.onChange(next);
  };

  const toggleOne = (id: string) => {
    if (!selection) return;
    const next = new Set(selection.selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    selection.onChange(next);
  };

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        {emptyIcon && <div className="mb-4">{emptyIcon}</div>}
        <p>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table>
        <TableHeader className={headerClassName}>
          <TableRow>
            {selection && (
              <TableHead className="w-10">
                <Checkbox
                  checked={headerChecked}
                  disabled={selectableIds.length === 0}
                  onCheckedChange={toggleAll}
                  aria-label={selection.headerLabel ?? 'Tout sélectionner'}
                />
              </TableHead>
            )}
            {isExpandable && <TableHead className="w-10"></TableHead>}
            {columns.map((col) => (
              <TableHead
                key={String(col.key)}
                className={`${col.width ? col.width : ''} ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''
                } ${col.sortable ? 'cursor-pointer hover:bg-muted/50 select-none' : ''}`}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <div className="flex items-center gap-2">
                  {col.label}
                  {col.sortable && sortColumn === col.key && (
                    sortDirection === 'asc' ? (
                      <ChevronUp className="w-4 h-4 text-primary" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-primary" />
                    )
                  )}
                </div>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((row, idx) => {
            const rowId = isExpandable ? row[expandableRowKey as keyof T] : undefined;
            const isExpanded = isExpandable && rowId !== undefined && expandedRows.has(rowId);

            return (
              <React.Fragment key={rowId ?? idx}>
                <TableRow 
                  className={isExpandable || onRowClick ? 'hover:bg-muted/50 cursor-pointer transition-colors' : 'hover:bg-muted/50 transition-colors'}
                  onClick={() => {
                    if (isExpandable) toggleRowExpand(rowId);
                    onRowClick?.(row);
                  }}
                >
                  {selection && (
                    <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selection.selected.has(String(row[selection.rowKey]))}
                        disabled={!isRowSelectable(row)}
                        onCheckedChange={() => toggleOne(String(row[selection.rowKey]))}
                        title={!isRowSelectable(row) ? selection.unselectableReason : undefined}
                        aria-label="Sélectionner la ligne"
                      />
                    </TableCell>
                  )}
                  {isExpandable && (
                    <TableCell className="w-10">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </TableCell>
                  )}
                  {columns.map((col) => (
                    <TableCell
                      key={String(col.key)}
                      className={col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
                {isExpanded && renderExpandedRow && (
                  <TableRow className="bg-muted/30">
                    <TableCell colSpan={columns.length + leadingColumns} className="p-4">
                      {renderExpandedRow(row)}
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
