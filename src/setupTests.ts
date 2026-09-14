import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';

// Without `test.globals: true` in vitest.config.ts, Testing Library's
// auto-cleanup can't find a global `afterEach` to hook into, so each
// render() would otherwise leak into the next test's DOM.
afterEach(() => {
  cleanup();
});
