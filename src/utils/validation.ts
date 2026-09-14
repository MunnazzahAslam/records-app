import type { EmployeeStatus } from '../types/employee';

export interface EmployeeFormValues {
  firstName: string;
  lastName: string;
  email: string;
  department: string;
  role: string;
  status: EmployeeStatus | '';
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeText(value: string): string {
  return value.trim().replace(/[<>]/g, '');
}

export function sanitizeEmployeeFormValues(input: EmployeeFormValues): EmployeeFormValues {
  return {
    firstName: sanitizeText(input.firstName),
    lastName: sanitizeText(input.lastName),
    email: sanitizeText(input.email),
    department: sanitizeText(input.department),
    role: sanitizeText(input.role),
    status: input.status
  };
}

export function validateEmployee(input: EmployeeFormValues): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.firstName.trim()) {
    errors.firstName = 'First name is required.';
  }

  if (!input.lastName.trim()) {
    errors.lastName = 'Last name is required.';
  }

  if (!input.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!EMAIL_REGEX.test(input.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }

  if (!input.department.trim()) {
    errors.department = 'Department is required.';
  }

  if (!input.role.trim()) {
    errors.role = 'Role is required.';
  }

  if (!input.status) {
    errors.status = 'Status is required.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}
