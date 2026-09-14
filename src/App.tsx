import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useEmployees } from './hooks/useEmployees';
import { useDebouncedValue } from './hooks/useDebouncedValue';
import { useEmployeeFilters } from './hooks/useEmployeeFilters';
import { usePagination } from './hooks/usePagination';
import { useSnackbar } from './hooks/useSnackbar';
import { EmployeeTable } from './components/EmployeeTable';
import { SearchBar } from './components/SearchBar';
import { FilterPanel } from './components/FilterPanel';
import { Pagination } from './components/Pagination';
import { Loading } from './components/Loading';
import { TableSkeleton } from './components/TableSkeleton';
import { ErrorState } from './components/ErrorState';
import { EmptyState } from './components/EmptyState';
import { Snackbar } from './components/Snackbar';
import { downloadFile, toCSV, toJSON } from './utils/exportUtils';
import type { Employee, EmployeeCreateInput } from './types/employee';
import './App.css';

// Modal, EmployeeForm, and ConfirmDialog (which itself renders Modal) are only
// needed once the user opens the Add/Edit-Employee form or requests a delete,
// so they're split out of the initial bundle rather than loaded up front.
const Modal = lazy(() => import('./components/Modal').then((module) => ({ default: module.Modal })));
const EmployeeForm = lazy(() =>
  import('./components/EmployeeForm').then((module) => ({ default: module.EmployeeForm }))
);
const ConfirmDialog = lazy(() =>
  import('./components/ConfirmDialog').then((module) => ({ default: module.ConfirmDialog }))
);

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;

function App() {
  const { data, loading, error, isEmpty, addEmployee, editEmployee, deleteEmployee } = useEmployees();
  const { snackbar, showSuccess, showError, dismiss } = useSnackbar();
  const [searchInput, setSearchInput] = useState('');
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const debouncedSearch = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const { departments, filteredEmployees } = useEmployeeFilters(data, debouncedSearch, selectedDepartments);

  const { currentPage, totalPages, pageItems, goToPage, nextPage, prevPage, totalItems } = usePagination(
    filteredEmployees,
    PAGE_SIZE
  );

  useEffect(() => {
    // Deliberately excludes goToPage: only a search/filter change should snap back to page 1.
    goToPage(1);
  }, [debouncedSearch, selectedDepartments]);

  const isFormModalOpen = isAddModalOpen || editingEmployee !== null;

  const handleOpenAddModal = useCallback(() => setIsAddModalOpen(true), []);
  const handleCloseFormModal = useCallback(() => {
    setIsAddModalOpen(false);
    setEditingEmployee(null);
  }, []);

  const handleEditEmployee = useCallback(
    (id: number) => {
      const employeeToEdit = data.find((employee) => employee.id === id);
      if (employeeToEdit) {
        setEditingEmployee(employeeToEdit);
      }
    },
    [data]
  );

  const handleRequestDelete = useCallback((id: number) => setPendingDeleteId(id), []);
  const handleCancelDelete = useCallback(() => setPendingDeleteId(null), []);

  const handleConfirmDelete = useCallback(async () => {
    if (pendingDeleteId === null) {
      return;
    }

    const success = await deleteEmployee(pendingDeleteId);
    setPendingDeleteId(null);
    // The current page is derived from item count in usePagination, so it
    // clamps to the new last page automatically if this was the last item
    // on the last page — no separate page adjustment needed here.
    if (success) {
      showSuccess('Employee deleted');
    } else {
      showError('Failed to delete employee');
    }
  }, [pendingDeleteId, deleteEmployee, showSuccess, showError]);

  const handleExportCsv = useCallback(() => {
    downloadFile(toCSV(filteredEmployees), 'employees.csv', 'text/csv;charset=utf-8;');
    showSuccess(`Exported ${filteredEmployees.length} record${filteredEmployees.length === 1 ? '' : 's'} to CSV`);
  }, [filteredEmployees, showSuccess]);

  const handleExportJson = useCallback(() => {
    downloadFile(toJSON(filteredEmployees), 'employees.json', 'application/json;charset=utf-8;');
    showSuccess(`Exported ${filteredEmployees.length} record${filteredEmployees.length === 1 ? '' : 's'} to JSON`);
  }, [filteredEmployees, showSuccess]);

  const handleCreateEmployee = useCallback(
    async (input: EmployeeCreateInput) => {
      const success = await addEmployee(input);
      if (success) {
        setIsAddModalOpen(false);
        showSuccess('Employee added');
      } else {
        showError('Failed to add employee');
      }
    },
    [addEmployee, showSuccess, showError]
  );

  const handleUpdateEmployee = useCallback(
    async (input: EmployeeCreateInput) => {
      if (!editingEmployee) {
        return;
      }

      const success = await editEmployee(editingEmployee.id, input);
      if (success) {
        setEditingEmployee(null);
        showSuccess('Employee updated');
      } else {
        showError('Failed to update employee');
      }
    },
    [editingEmployee, editEmployee, showSuccess, showError]
  );

  const hasNoResults = !isEmpty && filteredEmployees.length === 0;
  const pendingDeleteEmployee = useMemo(
    () => data.find((employee) => employee.id === pendingDeleteId) ?? null,
    [data, pendingDeleteId]
  );

  return (
    <main className="app-shell">
      <div className="app-toolbar">
        <h1>Employees</h1>
        <div className="app-toolbar-actions">
          {!loading && !error && !isEmpty && (
            <FilterPanel
              departments={departments}
              selectedDepartments={selectedDepartments}
              onChange={setSelectedDepartments}
            />
          )}
          {!loading && !error && (
            <button type="button" className="add-employee-button" onClick={handleOpenAddModal}>
              <span className="add-employee-icon" aria-hidden="true">
                +
              </span>
              Add Employee
            </button>
          )}
        </div>
      </div>

      {loading && <TableSkeleton />}
      {!loading && error && <ErrorState message={error} />}
      {!loading && !error && isEmpty && <EmptyState />}
      {!loading && !error && !isEmpty && (
        <>
          <div className="employee-controls">
            <SearchBar value={searchInput} onChange={setSearchInput} />
            <div className="export-actions">
              <button
                type="button"
                className="export-button"
                onClick={handleExportCsv}
                disabled={filteredEmployees.length === 0}
              >
                Export CSV
              </button>
              <button
                type="button"
                className="export-button"
                onClick={handleExportJson}
                disabled={filteredEmployees.length === 0}
              >
                Export JSON
              </button>
            </div>
          </div>
          {hasNoResults ? (
            <EmptyState
              title="No matching records"
              message="No results match your search or filter. Try adjusting them."
            />
          ) : (
            <>
              <EmployeeTable
                employees={pageItems}
                onEditEmployee={handleEditEmployee}
                onDeleteEmployee={handleRequestDelete}
              />
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                pageSize={PAGE_SIZE}
                onPrevPage={prevPage}
                onNextPage={nextPage}
                onGoToPage={goToPage}
              />
            </>
          )}
        </>
      )}

      {!loading && !error && isFormModalOpen && (
        <Suspense fallback={<Loading />}>
          <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal}>
            <EmployeeForm
              departments={departments}
              employee={editingEmployee ?? undefined}
              onSubmit={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}
            />
          </Modal>
        </Suspense>
      )}

      {pendingDeleteId !== null && (
        <Suspense fallback={<Loading />}>
          <ConfirmDialog
            isOpen={pendingDeleteId !== null}
            message={
              pendingDeleteEmployee
                ? `Delete ${pendingDeleteEmployee.name}? This cannot be undone.`
                : 'Delete this employee? This cannot be undone.'
            }
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />
        </Suspense>
      )}

      {snackbar && (
        <Snackbar key={snackbar.key} message={snackbar.message} type={snackbar.type} onClose={dismiss} />
      )}
    </main>
  );
}

export default App;
