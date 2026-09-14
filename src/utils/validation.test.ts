import { describe, expect, it } from 'vitest';
import { validateEmployee, type EmployeeFormValues } from './validation';

const VALID_INPUT: EmployeeFormValues = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada.lovelace@example.com',
  department: 'Engineering',
  role: 'Software Engineer',
  status: 'active'
};

describe('validateEmployee', () => {
  it('accepts fully valid input', () => {
    const result = validateEmployee(VALID_INPUT);

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });

  it('flags every missing required field', () => {
    const result = validateEmployee({
      firstName: '',
      lastName: '',
      email: '',
      department: '',
      role: '',
      status: ''
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      firstName: 'First name is required.',
      lastName: 'Last name is required.',
      email: 'Email is required.',
      department: 'Department is required.',
      role: 'Role is required.',
      status: 'Status is required.'
    });
  });

  it('rejects an invalid email format', () => {
    const result = validateEmployee({ ...VALID_INPUT, email: 'not-an-email' });

    expect(result.valid).toBe(false);
    expect(result.errors.email).toBe('Enter a valid email address.');
    // Only the email field should fail — everything else in VALID_INPUT is fine.
    expect(Object.keys(result.errors)).toEqual(['email']);
  });
});
