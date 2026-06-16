import { MAX_CELLS } from './constants';

/** HWPX 연습장용 글자 배열을 페이지(580칸) 단위로 분할한다. */
export function splitCharsIntoPages(
  chars: (string | null)[],
  pageSize = MAX_CELLS,
): (string | null)[][] {
  if (pageSize <= 0) {
    throw new Error('pageSize must be greater than 0');
  }

  if (chars.length === 0) {
    return [];
  }

  const pages: (string | null)[][] = [];

  for (let index = 0; index < chars.length; index += pageSize) {
    pages.push(chars.slice(index, index + pageSize));
  }

  return pages;
}

/** 페이지 수를 계산한다. */
export function getPageCount(
  charCount: number,
  pageSize = MAX_CELLS,
): number {
  if (charCount <= 0) {
    return 0;
  }

  return Math.ceil(charCount / pageSize);
}

/** 각 페이지를 580칸으로 패딩한 뒤 하나의 배열로 평탄화한다. */
export function flattenPagedChars(
  pages: (string | null)[][],
  pageSize = MAX_CELLS,
): (string | null)[] {
  const flattened: (string | null)[] = [];

  for (const page of pages) {
    const padded = [...page];

    while (padded.length < pageSize) {
      padded.push(null);
    }

    flattened.push(...padded);
  }

  return flattened;
}
