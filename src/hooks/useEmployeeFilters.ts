import { useMemo } from 'react';
import type { Employee } from '../types/employee';

export interface UseEmployeeFiltersResult {
  departments: string[];
  filteredEmployees: Employee[];
}

export function useEmployeeFilters(
  data: Employee[],
  debouncedSearch: string,
  selectedDepartments: string[]
): UseEmployeeFiltersResult {
  const departments = useMemo(() => {
    const unique = new Set(data.map((employee) => employee.department));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = debouncedSearch.trim().toLowerCase();

    return data.filter((employee) => {
      const matchesSearch =
        normalizedSearch === '' ||
        employee.name.toLowerCase().includes(normalizedSearch) ||
        employee.email.toLowerCase().includes(normalizedSearch) ||
        employee.role.toLowerCase().includes(normalizedSearch);

      const matchesDepartment =
        selectedDepartments.length === 0 || selectedDepartments.includes(employee.department);

      return matchesSearch && matchesDepartment;
    });
  }, [data, debouncedSearch, selectedDepartments]);

  return { departments, filteredEmployees };
}
