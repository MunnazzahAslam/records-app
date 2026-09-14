import type { Employee } from '../types/employee';

const RISKY_CSV_PREFIXES = ['=', '+', '-', '@'];
const CSV_HEADERS = ['ID', 'Name', 'Email', 'Department', 'Role', 'Status'];

export function neutralizeCsvCell(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length > 0 && RISKY_CSV_PREFIXES.some((prefix) => trimmed.startsWith(prefix))) {
    return `'${value}`;
  }

  return value;
}

function escapeCsvField(value: string): string {
  const neutralized = neutralizeCsvCell(value);

  if (/["\n,]/.test(neutralized)) {
    return `"${neutralized.replace(/"/g, '""')}"`;
  }

  return neutralized;
}

function toCsvRow(fields: string[]): string {
  return fields.map(escapeCsvField).join(',');
}

export function toCSV(employees: Employee[]): string {
  const rows = employees.map((employee) =>
    toCsvRow([
      String(employee.id),
      employee.name,
      employee.email,
      employee.department,
      employee.role,
      employee.status
    ])
  );

  return [toCsvRow(CSV_HEADERS), ...rows].join('\r\n');
}

export function toJSON(employees: Employee[]): string {
  return JSON.stringify(employees, null, 2);
}

export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  URL.revokeObjectURL(url);
}
