// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  buildMultiPageSection,
  countTables,
  getCellCharAt,
  getTableDimensions,
  getTableIds,
  getTableParagraphIds,
} from '../../hwpx/buildMultiPageSection';
import { MAX_CELLS, PRACTICE_COLS, PRACTICE_ROWS } from '../../hwpx/constants';
import { parseFixtureSection0 } from './testHelpers';

function makeChars(count: number, fillChar = '가'): (string | null)[] {
  return Array.from({ length: count }, () => fillChar);
}

function makeIndexedChars(count: number): (string | null)[] {
  return Array.from({ length: count }, (_, index) => String(index % 10));
}

describe('buildMultiPageSection', () => {
  it('580칸 이하에서는 hp:tbl 1개와 rowCnt=29를 유지한다', () => {
    const doc = parseFixtureSection0();
    buildMultiPageSection(doc, makeChars(580));

    expect(countTables(doc)).toBe(1);
    expect(getTableDimensions(doc)).toEqual({
      rowCnt: PRACTICE_ROWS,
      colCnt: PRACTICE_COLS,
      tcCount: MAX_CELLS,
    });
  });

  it('581칸에서는 rowCnt=58, hp:tc 1160개로 확장한다', () => {
    const doc = parseFixtureSection0();
    buildMultiPageSection(doc, makeIndexedChars(581));

    expect(countTables(doc)).toBe(1);
    expect(getTableDimensions(doc)).toEqual({
      rowCnt: PRACTICE_ROWS * 2,
      colCnt: PRACTICE_COLS,
      tcCount: MAX_CELLS * 2,
    });
  });

    it('1161칸에서는 rowCnt=87, hp:tc 1740개로 확장한다', () => {
      const doc = parseFixtureSection0();
      buildMultiPageSection(doc, makeIndexedChars(1161));

      expect(countTables(doc)).toBe(1);
      expect(getTableDimensions(doc)).toEqual({
        rowCnt: PRACTICE_ROWS * 3,
        colCnt: PRACTICE_COLS,
        tcCount: MAX_CELLS * 3,
      });
    }, 30_000);

    it('hp:tbl@id와 표 문단 hp:p@id는 단일 표 확장 시 중복되지 않는다', () => {
      const doc = parseFixtureSection0();
      buildMultiPageSection(doc, makeIndexedChars(1161));

      const tableIds = getTableIds(doc);
      const paragraphIds = getTableParagraphIds(doc);

      expect(new Set(tableIds).size).toBe(tableIds.length);
      expect(new Set(paragraphIds).size).toBe(paragraphIds.length);
      expect(tableIds).toHaveLength(1);
      expect(paragraphIds).toHaveLength(1);
    }, 30_000);

  it('페이지 경계의 글자를 올바른 셀에 매핑한다', () => {
    const doc = parseFixtureSection0();
    buildMultiPageSection(doc, makeIndexedChars(581));

    expect(getCellCharAt(doc, 0, 0)).toBe('0');
    expect(getCellCharAt(doc, 28, 19)).toBe('9');
    expect(getCellCharAt(doc, 29, 0)).toBe('0');
  });

  it('1160칸 2페이지에서 두 번째 페이지 첫 셀에 글자가 매핑된다', () => {
    const doc = parseFixtureSection0();
    buildMultiPageSection(doc, makeIndexedChars(1160));

    expect(getCellCharAt(doc, 29, 0)).toBe('0');
    expect(getCellCharAt(doc, 57, 19)).toBe('9');
  });
});

describe('buildMultiPageSection regression', () => {
  it('580칸 이하 단일 페이지 구조가 기존과 동일하게 유지된다', () => {
    const doc = parseFixtureSection0();
    const before = new XMLSerializer().serializeToString(doc);

    buildMultiPageSection(doc, makeChars(1, '필'));
    const after = new XMLSerializer().serializeToString(doc);

    expect(countTables(doc)).toBe(1);
    expect(getTableDimensions(doc).rowCnt).toBe(PRACTICE_ROWS);
    expect(getCellCharAt(doc, 0, 0)).toBe('필');
    expect(before).toContain('rowCnt="29"');
    expect(after).toContain('rowCnt="29"');
  });
});
