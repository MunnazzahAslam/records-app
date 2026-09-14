import type { ChangeEvent } from 'react';
import './SearchBar.css';

export interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

export function SearchBar({ value, onChange }: SearchBarProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value);
  }

  return (
    <div className="search-bar">
      <label htmlFor="employee-search" className="search-bar-label">
        Search
      </label>
      <input
        id="employee-search"
        type="search"
        className="search-bar-input"
        placeholder="Search by name, email, or role"
        value={value}
        onChange={handleChange}
        autoComplete="off"
      />
    </div>
  );
}
