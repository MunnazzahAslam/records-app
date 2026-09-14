import { useCallback, useEffect, useState } from 'react';
import { createEmployee, deleteEmployeeApi, fetchEmployees, updateEmployee } from '../services/employeeApi';
import type { Employee, EmployeeCreateInput } from '../types/employee';

export interface UseEmployeesResult {
  data: Employee[];
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  addEmployee: (employee: EmployeeCreateInput) => Promise<boolean>;
  editEmployee: (id: number, updates: Partial<Employee>) => Promise<boolean>;
  deleteEmployee: (id: number) => Promise<boolean>;
}

export function useEmployees(): UseEmployeesResult {
  const [data, setData] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);

    fetchEmployees()
      .then((employees) => {
        if (cancelled) {
          return;
        }

        setData(employees);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setError('Unable to load employee records.');
        setData([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const addEmployee = useCallback(async (input: EmployeeCreateInput) => {
    try {
      const created = await createEmployee(input);
      setData((currentEmployees) => [created, ...currentEmployees]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const editEmployee = useCallback(async (id: number, updates: Partial<Employee>) => {
    try {
      const updated = await updateEmployee(String(id), updates);
      setData((currentEmployees) => currentEmployees.map((employee) => (employee.id === id ? updated : employee)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteEmployee = useCallback(async (id: number) => {
    try {
      await deleteEmployeeApi(String(id));
      setData((currentEmployees) => currentEmployees.filter((employee) => employee.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  return {
    data,
    loading,
    error,
    isEmpty: data.length === 0,
    addEmployee,
    editEmployee,
    deleteEmployee
  };
}
