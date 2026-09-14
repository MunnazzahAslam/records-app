import { useRef } from 'react';
import { createColumnHelper, tableFeatures, useTable } from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Employee } from '../types/employee';
import { EmployeeRow } from './EmployeeRow';
import './EmployeeTable.css';

export interface EmployeeTableProps {
  employees: Employee[];
  onEditEmployee: (id: number) => void;
  onDeleteEmployee: (id: number) => void;
}

const features = tableFeatures({});
const columnHelper = createColumnHelper<typeof features, Employee>();

const columns = columnHelper.columns([
  columnHelper.accessor('id', { header: 'ID' }),
  columnHelper.accessor('name', { header: 'Name' }),
  columnHelper.accessor('email', { header: 'Email' }),
  columnHelper.accessor('department', { header: 'Department' }),
  columnHelper.accessor('role', { header: 'Role' }),
  columnHelper.accessor('status', { header: 'Status' }),
  columnHelper.display({ id: 'actions', header: 'Actions' })
]);

const ROW_HEIGHT = 48;
const OVERSCAN = 8;

function getRowId(employee: Employee): string {
  return String(employee.id);
}

export function EmployeeTable({ employees, onEditEmployee, onDeleteEmployee }: EmployeeTableProps) {
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const table = useTable({
    features,
    columns,
    data: employees,
    getRowId
  });

  const rows = table.getRowModel().rows;

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => ROW_HEIGHT,
    getItemKey: (index) => rows[index].id,
    overscan: OVERSCAN
  });

  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="employee-table" role="table" aria-label="Employees" aria-rowcount={rows.length}>
      <div className="employee-table-scroll-x">
        <div className="employee-table-row employee-table-header-row" role="row">
          {table.getHeaderGroups().map((headerGroup) =>
            headerGroup.headers.map((header) => (
              <div className="employee-cell employee-cell-header" role="columnheader" key={header.id}>
                {header.isPlaceholder ? null : <table.FlexRender header={header} />}
              </div>
            ))
          )}
        </div>
        <div ref={scrollElementRef} className="employee-table-scroll">
          <div
            className="employee-table-sizer"
            style={{ height: rowVirtualizer.getTotalSize() }}
          >
            {virtualItems.map((virtualItem) => {
              const row = rows[virtualItem.index];
              return (
                <div
                  key={row.id}
                  data-index={virtualItem.index}
                  ref={rowVirtualizer.measureElement}
                  role="row"
                  className="employee-table-row employee-row"
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <EmployeeRow employee={row.original} onEdit={onEditEmployee} onDelete={onDeleteEmployee} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
