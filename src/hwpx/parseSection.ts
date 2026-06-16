import {
  CHAR_PR_ID_REF,
  HP_NS,
  PRACTICE_COLS,
  PRACTICE_ROWS,
} from './constants';
import type { PracticeCell } from './types';

function getCellAddr(tc: Element): { rowAddr: number; colAddr: number } {
  const cellAddr = tc.getElementsByTagNameNS(HP_NS, 'cellAddr')[0];

  if (!cellAddr) {
    throw new Error('hp:cellAddr not found in hp:tc');
  }

  const rowAddr = Number.parseInt(cellAddr.getAttribute('rowAddr') ?? '', 10);
  const colAddr = Number.parseInt(cellAddr.getAttribute('colAddr') ?? '', 10);

  if (Number.isNaN(rowAddr) || Number.isNaN(colAddr)) {
    throw new Error('Invalid hp:cellAddr coordinates');
  }

  return { rowAddr, colAddr };
}

function sortCells(cells: PracticeCell[]): PracticeCell[] {
  return [...cells].sort((a, b) => {
    const rowDiff = a.rowAddr - b.rowAddr;
    return rowDiff !== 0 ? rowDiff : a.colAddr - b.colAddr;
  });
}

/** section0.xml 문서에서 연습장 표 셀을 파싱·검증한다. */
export function parseSection(doc: Document): PracticeCell[] {
  const tables = doc.getElementsByTagNameNS(HP_NS, 'tbl');

  if (tables.length !== 1) {
    throw new Error(`Expected exactly 1 hp:tbl, found ${tables.length}`);
  }

  const table = tables[0]!;
  const rowCnt = Number.parseInt(table.getAttribute('rowCnt') ?? '', 10);
  const colCnt = Number.parseInt(table.getAttribute('colCnt') ?? '', 10);

  if (colCnt !== PRACTICE_COLS) {
    throw new Error(`Unexpected table colCnt: ${colCnt}`);
  }

  if (rowCnt < PRACTICE_ROWS || rowCnt % PRACTICE_ROWS !== 0) {
    throw new Error(
      `Unexpected table rowCnt: ${rowCnt} (must be a positive multiple of ${PRACTICE_ROWS})`,
    );
  }

  const tcElements = Array.from(table.getElementsByTagNameNS(HP_NS, 'tc'));
  const expectedCells = rowCnt * colCnt;

  if (tcElements.length !== expectedCells) {
    throw new Error(
      `Expected ${expectedCells} hp:tc elements, found ${tcElements.length}`,
    );
  }

  const cells: PracticeCell[] = tcElements.map((element, domIndex) => {
    const { rowAddr, colAddr } = getCellAddr(element);
    return { element, rowAddr, colAddr, domIndex };
  });

  const sorted = sortCells(cells);

  for (let index = 0; index < sorted.length; index += 1) {
    const cell = sorted[index]!;
    const expectedRow = Math.floor(index / PRACTICE_COLS);
    const expectedCol = index % PRACTICE_COLS;

    if (cell.rowAddr !== expectedRow || cell.colAddr !== expectedCol) {
      throw new Error(
        `cellAddr order mismatch at index ${index}: expected (${expectedRow}, ${expectedCol}), got (${cell.rowAddr}, ${cell.colAddr})`,
      );
    }

    if (cell.domIndex !== index) {
      console.warn(
        `DOM order differs from cellAddr order at index ${index}: domIndex=${cell.domIndex}`,
      );
    }
  }

  return sorted;
}

export function findTargetRun(tc: Element): Element | null {
  const runs = Array.from(tc.getElementsByTagNameNS(HP_NS, 'run'));

  const preferred = runs.find(
    (run) => run.getAttribute('charPrIDRef') === CHAR_PR_ID_REF,
  );

  return preferred ?? runs[0] ?? null;
}
