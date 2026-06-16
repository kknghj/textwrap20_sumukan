import { padRows } from '../utils/tableUtils';
import {
  transformText,
  type TransformOptions,
  type TransformResult,
} from '../utils/transformText';
import {
  HWPX_CHARS_PER_LINE,
  MAX_CELLS,
  PRACTICE_COLS,
} from './constants';
import type { HwpxCharsResult } from './types';

/** padRows된 2차원 배열을 행 우선 1차원 배열로 평탄화한다. */
export function rowsToCharArray(rows: string[][]): (string | null)[] {
  const chars: (string | null)[] = [];

  for (const row of rows) {
    for (const cell of row) {
      chars.push(cell === '' ? null : cell);
    }
  }

  return chars;
}

/** HWPX용 변환 결과가 한 페이지(580칸)를 초과하는지 계산한다. */
export function countHwpxCells(rows: string[][]): number {
  const padded = padRows(rows, HWPX_CHARS_PER_LINE);
  return padded.length * PRACTICE_COLS;
}

/** 변환된 rows를 HWPX 셀 배열로 준비한다. 580칸 초과 시 차단한다. */
export function prepareHwpxChars(rows: string[][]): HwpxCharsResult {
  const padded = padRows(rows, HWPX_CHARS_PER_LINE);
  const cellCount = padded.length * PRACTICE_COLS;

  if (cellCount > MAX_CELLS) {
    return { ok: false, reason: 'exceeds_limit', cellCount };
  }

  return {
    ok: true,
    chars: rowsToCharArray(padded),
    cellCount,
  };
}

/** HWPX 다운로드용 transformText — maxCharsPerLine은 항상 20으로 고정한다. */
export function transformForHwpx(
  text: string,
  options: Omit<TransformOptions, 'maxCharsPerLine'>,
): TransformResult {
  return transformText(text, {
    ...options,
    maxCharsPerLine: HWPX_CHARS_PER_LINE,
  });
}

/** 원문과 옵션으로 HWPX 셀 배열을 준비한다. */
export function prepareHwpxFromSource(
  text: string,
  options: Omit<TransformOptions, 'maxCharsPerLine'>,
): HwpxCharsResult & { transform: TransformResult } {
  const transform = transformForHwpx(text, options);
  const prepared = prepareHwpxChars(transform.rows);

  return { ...prepared, transform };
}
