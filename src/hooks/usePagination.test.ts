import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { usePagination } from './usePagination';

function makeItems(count: number): number[] {
  return Array.from({ length: count }, (_, index) => index + 1);
}

describe('usePagination', () => {
  it('falls back to the previous page when deleting the only item on the last page', () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10), {
      initialProps: { items: makeItems(11) }
    });

    expect(result.current.totalPages).toBe(2);

    act(() => {
      result.current.goToPage(2);
    });

    expect(result.current.currentPage).toBe(2);
    expect(result.current.pageItems).toEqual([11]);

    // Simulate deleting that single item on page 2 — the source array shrinks
    // to 10 items, so there's now only one page.
    rerender({ items: makeItems(10) });

    expect(result.current.totalPages).toBe(1);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.pageItems).toEqual(makeItems(10));
    expect(result.current.pageItems).not.toHaveLength(0);
  });
});
