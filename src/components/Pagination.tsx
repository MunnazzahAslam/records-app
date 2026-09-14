import type { ChangeEvent } from 'react';
import './Pagination.css';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPrevPage,
  onNextPage,
  onGoToPage
}: PaginationProps) {
  const rangeStart = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, totalItems);

  function handleJumpChange(event: ChangeEvent<HTMLInputElement>) {
    const value = Number(event.target.value);
    if (!Number.isNaN(value)) {
      onGoToPage(value);
    }
  }

  return (
    <div className="pagination">
      <p className="pagination-summary">
        Showing {rangeStart}–{rangeEnd} of {totalItems}
      </p>
      <div className="pagination-controls">
        <button type="button" className="pagination-button" onClick={onPrevPage} disabled={currentPage <= 1}>
          Previous
        </button>
        <label className="pagination-jump">
          Page
          <input
            type="number"
            className="pagination-jump-input"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={handleJumpChange}
            aria-label="Jump to page"
          />
          of {totalPages}
        </label>
        <button
          type="button"
          className="pagination-button"
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
        >
          Next
        </button>
      </div>
    </div>
  );
}
