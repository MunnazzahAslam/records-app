import { useEffect, useRef, useState } from 'react';
import './FilterPanel.css';

export interface FilterPanelProps {
  departments: string[];
  selectedDepartments: string[];
  onChange: (departments: string[]) => void;
}

export function FilterPanel({ departments, selectedDepartments, onChange }: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (departments.length === 0) {
    return null;
  }

  function toggleDepartment(department: string) {
    if (selectedDepartments.includes(department)) {
      onChange(selectedDepartments.filter((selected) => selected !== department));
    } else {
      onChange([...selectedDepartments, department]);
    }
  }

  function removeDepartment(department: string) {
    onChange(selectedDepartments.filter((selected) => selected !== department));
  }

  const triggerLabel = selectedDepartments.length === 0 ? 'Filter' : 'Department';

  return (
    <div className="filter-panel" ref={containerRef}>
      <button
        type="button"
        className="filter-panel-trigger"
        onClick={() => setIsOpen((open) => !open)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {triggerLabel}
        <span className="filter-panel-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      {selectedDepartments.length > 0 && (
        <div className="filter-panel-chips">
          {selectedDepartments.map((department) => (
            <span className="filter-panel-chip" key={department}>
              {department}
              <button
                type="button"
                className="filter-panel-chip-remove"
                onClick={() => removeDepartment(department)}
                aria-label={`Remove ${department} filter`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {isOpen && (
        <div className="filter-panel-dropdown" role="listbox" aria-multiselectable="true">
          {departments.map((department) => {
            const isSelected = selectedDepartments.includes(department);
            return (
              <button
                type="button"
                key={department}
                className="filter-panel-option"
                role="option"
                aria-selected={isSelected}
                onClick={() => toggleDepartment(department)}
              >
                <span className="filter-panel-option-check" aria-hidden="true">
                  {isSelected ? '✓' : ''}
                </span>
                <span className="filter-panel-option-label">{department}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
