import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Employee, EmployeeCreateInput, EmployeeStatus } from '../types/employee';
import { sanitizeEmployeeFormValues, validateEmployee, type EmployeeFormValues } from '../utils/validation';
import './EmployeeForm.css';

export interface EmployeeFormProps {
  departments: string[];
  employee?: Employee;
  onSubmit: (employee: EmployeeCreateInput) => Promise<void>;
}

const EMPTY_VALUES: EmployeeFormValues = {
  firstName: '',
  lastName: '',
  email: '',
  department: '',
  role: '',
  status: ''
};

const STATUS_OPTIONS: EmployeeStatus[] = ['active', 'inactive'];

function employeeToFormValues(employee: Employee): EmployeeFormValues {
  const [firstName, ...rest] = employee.name.trim().split(/\s+/);
  return {
    firstName: firstName ?? '',
    lastName: rest.join(' '),
    email: employee.email,
    department: employee.department,
    role: employee.role,
    status: employee.status
  };
}

export function EmployeeForm({ departments, employee, onSubmit }: EmployeeFormProps) {
  const isEditMode = employee !== undefined;
  const [values, setValues] = useState<EmployeeFormValues>(() =>
    employee ? employeeToFormValues(employee) : EMPTY_VALUES
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Reset on mount (not just declare via useRef's initial value) because
    // StrictMode double-invokes effects in development — mount, cleanup,
    // mount again — which would otherwise leave this stuck at `false` after
    // the simulated cleanup, even though the component is genuinely mounted.
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  function updateField<K extends keyof EmployeeFormValues>(field: K, value: EmployeeFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const sanitized = sanitizeEmployeeFormValues(values);
    const result = validateEmployee(sanitized);

    if (!result.valid) {
      setErrors(result.errors);
      return;
    }

    const employeeInput: EmployeeCreateInput = {
      name: `${sanitized.firstName} ${sanitized.lastName}`.trim(),
      email: sanitized.email,
      department: sanitized.department,
      role: sanitized.role,
      status: sanitized.status as EmployeeStatus
    };

    setIsSubmitting(true);
    // On success the parent closes (unmounts) this form; on failure it stays
    // open with whatever the user typed still in place, so only clear the
    // submitting flag here — never reset values/errors unconditionally.
    await onSubmit(employeeInput);
    if (isMountedRef.current) {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="employee-form" onSubmit={handleSubmit} noValidate>
      <h2 className="employee-form-title">{isEditMode ? 'Edit Employee' : 'Add Employee'}</h2>

      <div className="employee-form-field">
        <label htmlFor="employee-first-name">First Name</label>
        <input
          id="employee-first-name"
          type="text"
          value={values.firstName}
          onChange={(event) => updateField('firstName', event.target.value)}
          aria-invalid={Boolean(errors.firstName)}
          aria-describedby={errors.firstName ? 'employee-first-name-error' : undefined}
        />
        {errors.firstName && (
          <p id="employee-first-name-error" className="employee-form-error">
            {errors.firstName}
          </p>
        )}
      </div>

      <div className="employee-form-field">
        <label htmlFor="employee-last-name">Last Name</label>
        <input
          id="employee-last-name"
          type="text"
          value={values.lastName}
          onChange={(event) => updateField('lastName', event.target.value)}
          aria-invalid={Boolean(errors.lastName)}
          aria-describedby={errors.lastName ? 'employee-last-name-error' : undefined}
        />
        {errors.lastName && (
          <p id="employee-last-name-error" className="employee-form-error">
            {errors.lastName}
          </p>
        )}
      </div>

      <div className="employee-form-field">
        <label htmlFor="employee-email">Email</label>
        <input
          id="employee-email"
          type="email"
          value={values.email}
          onChange={(event) => updateField('email', event.target.value)}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'employee-email-error' : undefined}
        />
        {errors.email && (
          <p id="employee-email-error" className="employee-form-error">
            {errors.email}
          </p>
        )}
      </div>

      <div className="employee-form-field">
        <label htmlFor="employee-department">Department</label>
        <select
          id="employee-department"
          value={values.department}
          onChange={(event) => updateField('department', event.target.value)}
          aria-invalid={Boolean(errors.department)}
          aria-describedby={errors.department ? 'employee-department-error' : undefined}
        >
          <option value="">Select a department</option>
          {departments.map((department) => (
            <option key={department} value={department}>
              {department}
            </option>
          ))}
        </select>
        {errors.department && (
          <p id="employee-department-error" className="employee-form-error">
            {errors.department}
          </p>
        )}
      </div>

      <div className="employee-form-field">
        <label htmlFor="employee-role">Role</label>
        <input
          id="employee-role"
          type="text"
          value={values.role}
          onChange={(event) => updateField('role', event.target.value)}
          aria-invalid={Boolean(errors.role)}
          aria-describedby={errors.role ? 'employee-role-error' : undefined}
        />
        {errors.role && (
          <p id="employee-role-error" className="employee-form-error">
            {errors.role}
          </p>
        )}
      </div>

      <div className="employee-form-field">
        <label htmlFor="employee-status">Status</label>
        <select
          id="employee-status"
          value={values.status}
          onChange={(event) => updateField('status', event.target.value as EmployeeStatus)}
          aria-invalid={Boolean(errors.status)}
          aria-describedby={errors.status ? 'employee-status-error' : undefined}
        >
          <option value="">Select a status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
        {errors.status && (
          <p id="employee-status-error" className="employee-form-error">
            {errors.status}
          </p>
        )}
      </div>

      <div className="employee-form-actions">
        <button type="submit" className="employee-form-submit" disabled={isSubmitting}>
          {isSubmitting && <span className="button-spinner" aria-hidden="true" />}
          {isSubmitting ? (isEditMode ? 'Saving…' : 'Adding…') : isEditMode ? 'Save Changes' : 'Add Employee'}
        </button>
      </div>
    </form>
  );
}
