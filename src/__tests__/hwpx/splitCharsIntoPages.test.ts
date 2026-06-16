// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { MAX_CELLS } from '../../hwpx/constants';
import {
  flattenPagedChars,
  getPageCount,
  splitCharsIntoPages,
} from '../../hwpx/splitCharsIntoPages';

describe('splitCharsIntoPages', () => {
  const makeChars = (count: number) =>
    Array.from({ length: count }, (_, index) => String(index % 10));

  it('580칸이면 1페이지로 분할한다', () => {
    const pages = splitCharsIntoPages(makeChars(580));
    expect(pages).toHaveLength(1);
    expect(pages[0]).toHaveLength(580);
    expect(getPageCount(580)).toBe(1);
  });

  it('581칸이면 2페이지로 분할한다', () => {
    const pages = splitCharsIntoPages(makeChars(581));
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(580);
    expect(pages[1]).toHaveLength(1);
    expect(getPageCount(581)).toBe(2);
  });

  it('1160칸이면 2페이지로 분할한다', () => {
    const pages = splitCharsIntoPages(makeChars(1160));
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(580);
    expect(pages[1]).toHaveLength(580);
    expect(getPageCount(1160)).toBe(2);
  });

  it('1161칸이면 3페이지로 분할한다', () => {
    const pages = splitCharsIntoPages(makeChars(1161));
    expect(pages).toHaveLength(3);
    expect(pages[0]).toHaveLength(580);
    expect(pages[1]).toHaveLength(580);
    expect(pages[2]).toHaveLength(1);
    expect(getPageCount(1161)).toBe(3);
  });

  it('페이지별 패딩 후 총 칸 수는 페이지 수 × 580이다', () => {
    const pages = splitCharsIntoPages(makeChars(1161));
    const flattened = flattenPagedChars(pages);
    expect(flattened).toHaveLength(3 * MAX_CELLS);
    expect(flattened[0]).toBe('0');
    expect(flattened[579]).toBe('9');
    expect(flattened[580]).toBe('0');
    expect(flattened[1160]).toBe('0');
    expect(flattened[1161]).toBeNull();
  });
});
