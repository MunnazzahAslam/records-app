import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useEmployees } from './useEmployees';
import * as employeeApi from '../services/employeeApi';
import type { Employee } from '../types/employee';

const SEED_EMPLOYEES: Employee[] = [
  { id: 1, name: 'Ada Lovelace', email: 'ada@example.com', department: 'Engineering', role: 'Engineer', status: 'active' },
  { id: 3, name: 'Grace Hopper', email: 'grace@example.com', department: 'Engineering', role: 'Admiral', status: 'active' }
];

async function setUpLoadedHook() {
  vi.spyOn(employeeApi, 'fetchEmployees').mockResolvedValue(SEED_EMPLOYEES);
  const { result } = renderHook(() => useEmployees());
  await waitFor(() => expect(result.current.loading).toBe(false));
  return result;
}

describe('useEmployees', () => {
  it('addEmployee posts to the API and prepends the server-returned record (with its real id)', async () => {
    const serverRecord: Employee = {
      id: 42,
      name: 'New Hire',
      email: 'new.hire@example.com',
      department: 'Sales',
      role: 'Rep',
      status: 'active'
    };
    vi.spyOn(employeeApi, 'createEmployee').mockResolvedValue(serverRecord);
    const result = await setUpLoadedHook();

    let success = false;
    await act(async () => {
      success = await result.current.addEmployee({
        name: 'New Hire',
        email: 'new.hire@example.com',
        department: 'Sales',
        role: 'Rep',
        status: 'active'
      });
    });

    expect(employeeApi.createEmployee).toHaveBeenCalledTimes(1);
    expect(success).toBe(true);
    expect(result.current.data).toHaveLength(3);
    // The id comes from the API response, not a client-computed max+1.
    expect(result.current.data[0]).toEqual(serverRecord);
  });

  it('addEmployee leaves state unchanged and returns false when the API call fails', async () => {
    vi.spyOn(employeeApi, 'createEmployee').mockRejectedValue(new Error('network error'));
    const result = await setUpLoadedHook();

    let success = true;
    await act(async () => {
      success = await result.current.addEmployee({
        name: 'New Hire',
        email: 'new.hire@example.com',
        department: 'Sales',
        role: 'Rep',
        status: 'active'
      });
    });

    expect(success).toBe(false);
    expect(result.current.data).toEqual(SEED_EMPLOYEES);
  });

  it('editEmployee PUTs to the API and replaces the matching record with the server response', async () => {
    const updatedRecord: Employee = { ...SEED_EMPLOYEES[0], role: 'Principal Engineer' };
    vi.spyOn(employeeApi, 'updateEmployee').mockResolvedValue(updatedRecord);
    const result = await setUpLoadedHook();

    let success = false;
    await act(async () => {
      success = await result.current.editEmployee(1, { role: 'Principal Engineer' });
    });

    expect(employeeApi.updateEmployee).toHaveBeenCalledWith('1', { role: 'Principal Engineer' });
    expect(success).toBe(true);
    expect(result.current.data.find((employee) => employee.id === 1)).toEqual(updatedRecord);
    expect(result.current.data.find((employee) => employee.id === 3)).toEqual(SEED_EMPLOYEES[1]);
  });

  it('deleteEmployee calls the API and removes the record by id, immutably, on success', async () => {
    vi.spyOn(employeeApi, 'deleteEmployeeApi').mockResolvedValue(undefined);
    const result = await setUpLoadedHook();
    const dataBeforeDelete = result.current.data;

    let success = false;
    await act(async () => {
      success = await result.current.deleteEmployee(1);
    });

    expect(employeeApi.deleteEmployeeApi).toHaveBeenCalledWith('1');
    expect(success).toBe(true);
    expect(dataBeforeDelete).toEqual(SEED_EMPLOYEES);
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]).toMatchObject({ id: 3, name: 'Grace Hopper' });
  });

  it('deleteEmployee keeps the record and returns false when the API call fails', async () => {
    vi.spyOn(employeeApi, 'deleteEmployeeApi').mockRejectedValue(new Error('network error'));
    const result = await setUpLoadedHook();

    let success = true;
    await act(async () => {
      success = await result.current.deleteEmployee(1);
    });

    expect(success).toBe(false);
    expect(result.current.data).toEqual(SEED_EMPLOYEES);
  });
});
