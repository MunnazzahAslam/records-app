import type { Employee, EmployeeCreateInput, EmployeeStatus } from '../types/employee';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class EmployeeApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'EmployeeApiError';
    this.status = status;
  }
}

interface MockApiEmployee {
  id: string;
  createdAt?: string;
  name?: string;
  email?: string;
  department?: string;
  role?: string;
  status?: string;
}

function normalizeStatus(status?: string): EmployeeStatus {
  return status?.trim().toLowerCase() === 'inactive' ? 'inactive' : 'active';
}

function mapToEmployee(record: MockApiEmployee): Employee {
  return {
    id: Number(record.id),
    name: record.name ?? 'Unknown',
    email: record.email ?? '',
    department: record.department ?? 'Unassigned',
    role: record.role ?? 'Unassigned',
    status: normalizeStatus(record.status)
  };
}

export async function fetchEmployees(): Promise<Employee[]> {
  const response = await fetch(API_BASE_URL);

  if (!response.ok) {
    throw new EmployeeApiError('Unable to load employee records.', response.status);
  }

  const records = (await response.json()) as MockApiEmployee[];
  return records.map(mapToEmployee);
}

export async function createEmployee(input: EmployeeCreateInput): Promise<Employee> {
  const response = await fetch(API_BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: input.name,
      email: input.email,
      department: input.department,
      role: input.role,
      status: input.status ?? 'active'
    })
  });

  if (!response.ok) {
    throw new EmployeeApiError('Unable to create employee record.', response.status);
  }

  const record = (await response.json()) as MockApiEmployee;
  return mapToEmployee(record);
}

export async function updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });

  if (!response.ok) {
    throw new EmployeeApiError('Unable to update employee record.', response.status);
  }

  const record = (await response.json()) as MockApiEmployee;
  return mapToEmployee(record);
}

export async function deleteEmployeeApi(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/${id}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new EmployeeApiError('Unable to delete employee record.', response.status);
  }
}
