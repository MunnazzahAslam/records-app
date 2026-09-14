export type EmployeeStatus = 'active' | 'inactive';

export interface Employee {
  id: number;
  name: string;
  email: string;
  department: string;
  role: string;
  status: EmployeeStatus;
}

export interface EmployeeCreateInput {
  name: string;
  email: string;
  department: string;
  role: string;
  status?: EmployeeStatus;
}
