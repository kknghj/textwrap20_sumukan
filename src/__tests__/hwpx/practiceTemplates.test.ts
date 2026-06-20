// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  buildMultiPageSection,
  countTables,
  getCellCharAt,
  getTableDimensions,
} from '../../hwpx/buildMultiPageSection';
import { extractCellFormatSnapshot } from '../../hwpx/fillPracticeCells';
import { MAX_CELLS, PRACTICE_COLS, PRACTICE_ROWS } from '../../hwpx/constants';
import { parseSection } from '../../hwpx/parseSection';
import type { PracticeTemplateId } from '../../hwpx/templates';
import {
  ALL_PRACTICE_TEMPLATE_IDS,
  parseFixtureSection0,
} from './testHelpers';

function makeIndexedChars(count: number): (string | null)[] {
  return Array.from({ length: count }, (_, index) => String(index % 10));
}

describe.each(ALL_PRACTICE_TEMPLATE_IDS)(
  'parseSection (%s)',
  (templateId: PracticeTemplateId) => {
    it('section0.xml에서 580개 셀을 탐색한다', () => {
      const doc = parseFixtureSection0(templateId);
      const cells = parseSection(doc);

      expect(cells).toHaveLength(PRACTICE_ROWS * PRACTICE_COLS);
      expect(cells[0]).toMatchObject({ rowAddr: 0, colAddr: 0 });
      expect(cells[19]).toMatchObject({ rowAddr: 0, colAddr: 19 });
      expect(cells[20]).toMatchObject({ rowAddr: 1, colAddr: 0 });
      expect(cells[579]).toMatchObject({ rowAddr: 28, colAddr: 19 });
    });
  },
);

describe.each(ALL_PRACTICE_TEMPLATE_IDS)(
  'buildMultiPageSection (%s)',
  (templateId: PracticeTemplateId) => {
    it('580칸 이하에서는 hp:tbl 1개와 rowCnt=29를 유지한다', () => {
      const doc = parseFixtureSection0(templateId);
      buildMultiPageSection(doc, makeIndexedChars(580));

      expect(countTables(doc)).toBe(1);
      expect(getTableDimensions(doc)).toEqual({
        rowCnt: PRACTICE_ROWS,
        colCnt: PRACTICE_COLS,
        tcCount: MAX_CELLS,
      });
    });

    it('581칸에서는 rowCnt=58, hp:tc 1160개로 확장한다', () => {
      const doc = parseFixtureSection0(templateId);
      buildMultiPageSection(doc, makeIndexedChars(581));

      expect(countTables(doc)).toBe(1);
      expect(getTableDimensions(doc)).toEqual({
        rowCnt: PRACTICE_ROWS * 2,
        colCnt: PRACTICE_COLS,
        tcCount: MAX_CELLS * 2,
      });
    });

    it('1161칸에서는 rowCnt=87, hp:tc 1740개로 확장한다', () => {
      const doc = parseFixtureSection0(templateId);
      buildMultiPageSection(doc, makeIndexedChars(1161));

      expect(countTables(doc)).toBe(1);
      expect(getTableDimensions(doc)).toEqual({
        rowCnt: PRACTICE_ROWS * 3,
        colCnt: PRACTICE_COLS,
        tcCount: MAX_CELLS * 3,
      });
    }, 30_000);

    it('페이지 경계의 글자를 올바른 셀에 매핑한다', () => {
      const doc = parseFixtureSection0(templateId);
      buildMultiPageSection(doc, makeIndexedChars(581));

      expect(getCellCharAt(doc, 0, 0)).toBe('0');
      expect(getCellCharAt(doc, 28, 19)).toBe('9');
      expect(getCellCharAt(doc, 29, 0)).toBe('0');
    });

    it('1160칸 2페이지에서 두 번째 페이지 첫 셀에 글자가 매핑된다', () => {
      const doc = parseFixtureSection0(templateId);
      buildMultiPageSection(doc, makeIndexedChars(1160));

      expect(getCellCharAt(doc, 29, 0)).toBe('0');
      expect(getCellCharAt(doc, 57, 19)).toBe('9');
    });

    it('다중 페이지 확장 후 borderFillIDRef 스냅샷이 유지된다', () => {
      const doc = parseFixtureSection0(templateId);
      const before = extractCellFormatSnapshot(parseSection(doc));
      const sampleIndexes = [0, 19, 20, 579];

      buildMultiPageSection(doc, makeIndexedChars(1161));
      const cells = parseSection(doc);
      const afterFirstPage = extractCellFormatSnapshot(
        sampleIndexes.map((index) => cells[index]!),
      );
      const afterSecondPage = extractCellFormatSnapshot(
        sampleIndexes.map((index) => cells[index + MAX_CELLS]!),
      );
      const afterThirdPage = extractCellFormatSnapshot(
        sampleIndexes.map((index) => cells[index + MAX_CELLS * 2]!),
      );
      const beforeSample = sampleIndexes.map((index) => before[index]!);

      expect(afterFirstPage).toEqual(beforeSample);
      expect(afterSecondPage).toEqual(beforeSample);
      expect(afterThirdPage).toEqual(beforeSample);
    }, 30_000);
  },
);
