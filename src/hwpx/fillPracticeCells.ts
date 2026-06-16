import { HP_NS } from './constants';
import { findTargetRun } from './parseSection';
import type { PracticeCell } from './types';

/** 연습장 셀에 글자를 삽입한다. 빈 칸(null/빈 문자열)은 기존 빈 hp:run을 유지한다. */
export function fillPracticeCells(
  doc: Document,
  cells: PracticeCell[],
  chars: (string | null)[],
): Document {
  const limit = Math.min(cells.length, chars.length);

  for (let index = 0; index < limit; index += 1) {
    const char = chars[index];

    if (!char) {
      continue;
    }

    const run = findTargetRun(cells[index]!.element);

    if (!run) {
      throw new Error(`hp:run not found in cell at index ${index}`);
    }

    const textNode = doc.createElementNS(HP_NS, 'hp:t');
    textNode.textContent = char;
    run.appendChild(textNode);
  }

  return doc;
}

/** 직렬화된 XML에서 연습장 표(hp:tbl) 안의 hp:t 노드 개수를 센다. */
export function countTextNodes(xml: string): number {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const tables = doc.getElementsByTagNameNS(HP_NS, 'tbl');

  if (tables.length === 0) {
    return 0;
  }

  return tables[0]!.getElementsByTagNameNS(HP_NS, 't').length;
}

/** 셀 서식 속성 스냅샷을 추출한다. */
export function extractCellFormatSnapshot(cells: PracticeCell[]): string[] {
  return cells.map((cell) => {
    const tc = cell.element;
    const cellSz = tc.getElementsByTagNameNS(HP_NS, 'cellSz')[0];
    const cellSpan = tc.getElementsByTagNameNS(HP_NS, 'cellSpan')[0];

    return [
      tc.getAttribute('borderFillIDRef') ?? '',
      cellSz?.getAttribute('width') ?? '',
      cellSz?.getAttribute('height') ?? '',
      cellSpan?.getAttribute('colSpan') ?? '',
      cellSpan?.getAttribute('rowSpan') ?? '',
    ].join('|');
  });
}
