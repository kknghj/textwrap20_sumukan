import { describe, expect, it } from 'vitest';
import { MAX_HWPX_CELLS } from '../../hwpx/constants';
import {
  countHwpxCells,
  prepareHwpxChars,
  rowsToCharArray,
  transformForHwpx,
} from '../../hwpx/textToCells';

describe('textToCells', () => {
  it('첫 줄 20자를 1차원 배열로 매핑한다', () => {
    const rows = ['가'.repeat(20).split('')];
    const prepared = prepareHwpxChars(rows);

    expect(prepared.ok).toBe(true);

    if (prepared.ok) {
      expect(prepared.chars).toHaveLength(20);
      expect(prepared.chars.filter(Boolean)).toHaveLength(20);
      expect(prepared.chars[0]).toBe('가');
      expect(prepared.chars[19]).toBe('가');
      expect(rowsToCharArray([rows[0]!])).toHaveLength(20);
    }
  });

  it('21번째 글자가 두 번째 줄 첫 칸에 매핑된다', () => {
    const result = transformForHwpx('가'.repeat(21), {
      spaceCountMode: 'exclude',
      lineBreakMode: 'char',
      removal: {
        removePeriod: true,
        removeComma: true,
        removeExclamationQuestion: true,
        removeEllipsis: true,
        removeParentheses: true,
        removeQuotes: true,
        removeHanja: true,
        removeNonKorean: true,
        removeOtherSymbols: true,
      },
    });

    const prepared = prepareHwpxChars(result.rows);
    expect(prepared.ok).toBe(true);

    if (prepared.ok) {
      expect(prepared.chars[20]).toBe('가');
      expect(prepared.chars[19]).toBe('가');
    }
  });

  it('최대 페이지 한도 초과 시 다운로드 불가 상태를 반환한다', () => {
    const rows = Array.from({ length: 30 * 20 + 1 }, () =>
      '가'.repeat(20).split(''),
    );
    const prepared = prepareHwpxChars(rows);

    expect(prepared.ok).toBe(false);
    if (!prepared.ok) {
      expect(prepared.reason).toBe('exceeds_limit');
      expect(prepared.cellCount).toBeGreaterThan(MAX_HWPX_CELLS);
    }
  });

  it('581칸은 다중 페이지로 허용한다', () => {
    const rows = [
      ...Array.from({ length: 29 }, () => '가'.repeat(20).split('')),
      ['가'],
    ];
    const prepared = prepareHwpxChars(rows);

    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.chars.filter(Boolean)).toHaveLength(581);
      expect(prepared.cellCount).toBe(600);
      expect(prepared.pageCount).toBe(2);
    }
  });

  it('공백 포함 모드에서 빈 셀을 null로 처리한다', () => {
    const result = transformForHwpx('나는 좋습니다', {
      spaceCountMode: 'include',
      lineBreakMode: 'char',
      removal: {
        removePeriod: true,
        removeComma: true,
        removeExclamationQuestion: true,
        removeEllipsis: true,
        removeParentheses: true,
        removeQuotes: true,
        removeHanja: true,
        removeNonKorean: true,
        removeOtherSymbols: true,
      },
    });

    const prepared = prepareHwpxChars(result.rows);
    expect(prepared.ok).toBe(true);

    if (prepared.ok) {
      expect(prepared.chars).toContain(null);
      expect(prepared.chars.filter((char) => char !== null)).toHaveLength(6);
    }
  });

  it('countHwpxCells는 패딩된 칸 수를 반환한다', () => {
    expect(countHwpxCells([['가나다']])).toBe(20);
    expect(countHwpxCells(Array.from({ length: 29 }, () => ['가']))).toBe(580);
    expect(countHwpxCells(Array.from({ length: 30 }, () => ['가']))).toBe(600);
  });
});
