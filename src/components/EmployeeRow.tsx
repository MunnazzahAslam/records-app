import { memo } from 'react';
import type { Employee } from '../types/employee';

export interface EmployeeRowProps {
  employee: Employee;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
}

const AVATAR_COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

function getInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase() || '?';
}

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function EditIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M13.5 3.5 16.5 6.5 7 16H4v-3L13.5 3.5Z" />
      <path d="M12 5 15 8" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h12" />
      <path d="M8 6V4.5A1.5 1.5 0 0 1 9.5 3h1A1.5 1.5 0 0 1 12 4.5V6" />
      <path d="M5.5 6 6.3 16 13.7 16 14.5 6" />
      <path d="M8.3 9v5" />
      <path d="M11.7 9v5" />
    </svg>
  );
}

function EmployeeRowComponent({ employee, onEdit, onDelete }: EmployeeRowProps) {
  return (
    <>
      <div className="employee-cell" role="cell">
        {employee.id}
      </div>
      <div className="employee-cell employee-cell-name" role="cell">
        <span className="employee-avatar" style={{ backgroundColor: getAvatarColor(employee.name) }} aria-hidden="true">
          {getInitial(employee.name)}
        </span>
        <span className="employee-name-text">{employee.name}</span>
      </div>
      <div className="employee-cell" role="cell">
        {employee.email}
      </div>
      <div className="employee-cell" role="cell">
        {employee.department}
      </div>
      <div className="employee-cell" role="cell">
        {employee.role}
      </div>
      <div className="employee-cell" role="cell">
        <span className={`employee-status employee-status-${employee.status}`}>
          <span className="employee-status-dot" aria-hidden="true" />
          {employee.status === 'active' ? 'Active' : 'Inactive'}
        </span>
      </div>
      <div className="employee-cell employee-cell-actions" role="cell">
        <button
          type="button"
          className="employee-icon-button"
          onClick={() => onEdit(employee.id)}
          aria-label={`Edit ${employee.name}`}
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className="employee-icon-button"
          onClick={() => onDelete(employee.id)}
          aria-label={`Delete ${employee.name}`}
        >
          <TrashIcon />
        </button>
      </div>
    </>
  );
}

export const EmployeeRow = memo(EmployeeRowComponent);
