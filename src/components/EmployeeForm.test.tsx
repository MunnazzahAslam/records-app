import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EmployeeForm } from './EmployeeForm';
import type { Employee } from '../types/employee';

const DEPARTMENTS = ['Engineering', 'Sales'];

describe('EmployeeForm', () => {
  it('shows inline validation errors and does not submit when the form is empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<EmployeeForm departments={DEPARTMENTS} onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /add employee/i }));

    expect(await screen.findByText('First name is required.')).toBeInTheDocument();
    expect(screen.getByText('Last name is required.')).toBeInTheDocument();
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByText('Department is required.')).toBeInTheDocument();
    expect(screen.getByText('Role is required.')).toBeInTheDocument();
    expect(screen.getByText('Status is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with the expected shape once the form is filled in validly', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);

    render(<EmployeeForm departments={DEPARTMENTS} onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText('First Name'), 'Ada');
    await user.type(screen.getByLabelText('Last Name'), 'Lovelace');
    await user.type(screen.getByLabelText('Email'), 'ada.lovelace@example.com');
    await user.selectOptions(screen.getByLabelText('Department'), 'Engineering');
    await user.type(screen.getByLabelText('Role'), 'Software Engineer');
    await user.selectOptions(screen.getByLabelText('Status'), 'active');

    await user.click(screen.getByRole('button', { name: /add employee/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada.lovelace@example.com',
      department: 'Engineering',
      role: 'Software Engineer',
      status: 'active'
    });
    expect(screen.queryByText('First name is required.')).not.toBeInTheDocument();
  });

  it('prefills fields from the employee prop and submits updated values in edit mode', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const existingEmployee: Employee = {
      id: 7,
      name: 'Grace Hopper',
      email: 'grace@example.com',
      department: 'Engineering',
      role: 'Admiral',
      status: 'active'
    };

    render(<EmployeeForm departments={DEPARTMENTS} employee={existingEmployee} onSubmit={onSubmit} />);

    expect(screen.getByLabelText('First Name')).toHaveValue('Grace');
    expect(screen.getByLabelText('Last Name')).toHaveValue('Hopper');
    expect(screen.getByLabelText('Email')).toHaveValue('grace@example.com');
    expect(screen.getByLabelText('Department')).toHaveValue('Engineering');
    expect(screen.getByLabelText('Role')).toHaveValue('Admiral');
    expect(screen.getByLabelText('Status')).toHaveValue('active');
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();

    await user.clear(screen.getByLabelText('Role'));
    await user.type(screen.getByLabelText('Role'), 'Rear Admiral');
    await user.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      name: 'Grace Hopper',
      email: 'grace@example.com',
      department: 'Engineering',
      role: 'Rear Admiral',
      status: 'active'
    });
  });
});
