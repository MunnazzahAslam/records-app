import { describe, expect, it } from 'vitest';
import { neutralizeCsvCell } from './exportUtils';

describe('neutralizeCsvCell', () => {
  it.each([
    ['=SUM(A1)', "'=SUM(A1)"],
    ['+1234567890', "'+1234567890"],
    ['-1234567890', "'-1234567890"],
    ['@mention', "'@mention"],
    ['  =leading-whitespace-formula', "'  =leading-whitespace-formula"]
  ])('prefixes a cell starting with a risky character: %s', (input, expected) => {
    expect(neutralizeCsvCell(input)).toBe(expected);
  });

  it.each([['Jane Doe'], ['jane.doe@example.com'], ['Engineering'], ['']])(
    'leaves a normal cell unchanged: %s',
    (input) => {
      expect(neutralizeCsvCell(input)).toBe(input);
    }
  );
});
