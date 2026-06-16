import { HP_NS, PRACTICE_COLS, PRACTICE_ROWS } from './constants';
import { fillPracticeCells } from './fillPracticeCells';
import { parseSection } from './parseSection';
import {
  flattenPagedChars,
  getPageCount,
  splitCharsIntoPages,
} from './splitCharsIntoPages';

function getPracticeTable(doc: Document): Element {
  const tables = doc.getElementsByTagNameNS(HP_NS, 'tbl');

  if (tables.length !== 1) {
    throw new Error(`Expected exactly 1 hp:tbl, found ${tables.length}`);
  }

  return tables[0]!;
}

function getTableRows(table: Element): Element[] {
  return Array.from(table.getElementsByTagNameNS(HP_NS, 'tr'));
}

function updateCellRowAddr(tc: Element, rowOffset: number): void {
  const cellAddr = tc.getElementsByTagNameNS(HP_NS, 'cellAddr')[0];

  if (!cellAddr) {
    throw new Error('hp:cellAddr not found in hp:tc');
  }

  const rowAddr = Number.parseInt(cellAddr.getAttribute('rowAddr') ?? '', 10);

  if (Number.isNaN(rowAddr)) {
    throw new Error('Invalid hp:cellAddr rowAddr');
  }

  cellAddr.setAttribute('rowAddr', String(rowAddr + rowOffset));
}

/** 단일 페이지 표에 추가 연습장 페이지 행을 복제한다. */
export function extendPracticeTableRows(
  doc: Document,
  pageCount: number,
): Document {
  if (pageCount <= 1) {
    return doc;
  }

  const table = getPracticeTable(doc);
  const baseRows = getTableRows(table);

  if (baseRows.length !== PRACTICE_ROWS) {
    throw new Error(
      `Expected ${PRACTICE_ROWS} hp:tr elements, found ${baseRows.length}`,
    );
  }

  for (let pageIndex = 1; pageIndex < pageCount; pageIndex += 1) {
    const rowOffset = pageIndex * PRACTICE_ROWS;

    for (const baseRow of baseRows) {
      const clonedRow = baseRow.cloneNode(true) as Element;
      const cells = Array.from(clonedRow.getElementsByTagNameNS(HP_NS, 'tc'));

      for (const cell of cells) {
        updateCellRowAddr(cell, rowOffset);
      }

      table.appendChild(clonedRow);
    }
  }

  table.setAttribute('rowCnt', String(PRACTICE_ROWS * pageCount));

  return doc;
}

/** 다중 페이지 연습장 section0.xml DOM을 생성한다. */
export function buildMultiPageSection(
  doc: Document,
  chars: (string | null)[],
): Document {
  const pageCount = getPageCount(chars.length);

  if (pageCount <= 1) {
    const cells = parseSection(doc);
    return fillPracticeCells(doc, cells, chars);
  }

  const pages = splitCharsIntoPages(chars);
  const fillChars = flattenPagedChars(pages);
  extendPracticeTableRows(doc, pageCount);
  const cells = parseSection(doc);

  return fillPracticeCells(doc, cells, fillChars);
}

export function countTables(doc: Document): number {
  return doc.getElementsByTagNameNS(HP_NS, 'tbl').length;
}

export function getTableDimensions(doc: Document): {
  rowCnt: number;
  colCnt: number;
  tcCount: number;
} {
  const table = getPracticeTable(doc);
  const rowCnt = Number.parseInt(table.getAttribute('rowCnt') ?? '', 10);
  const colCnt = Number.parseInt(table.getAttribute('colCnt') ?? '', 10);
  const tcCount = table.getElementsByTagNameNS(HP_NS, 'tc').length;

  return { rowCnt, colCnt, tcCount };
}

export function getTableParagraphIds(doc: Document): string[] {
  const HP_NS_LOCAL = HP_NS;
  const paragraphs = Array.from(doc.getElementsByTagNameNS(HP_NS_LOCAL, 'p'));
  const tableParagraphs = paragraphs.filter(
    (paragraph) => paragraph.getElementsByTagNameNS(HP_NS_LOCAL, 'tbl').length > 0,
  );

  return tableParagraphs.map((paragraph) => paragraph.getAttribute('id') ?? '');
}

export function getTableIds(doc: Document): string[] {
  return Array.from(doc.getElementsByTagNameNS(HP_NS, 'tbl')).map(
    (table) => table.getAttribute('id') ?? '',
  );
}

export function getCellCharAt(
  doc: Document,
  rowAddr: number,
  colAddr: number,
): string | null {
  const table = getPracticeTable(doc);
  const cells = Array.from(table.getElementsByTagNameNS(HP_NS, 'tc'));

  for (const cell of cells) {
    const cellAddr = cell.getElementsByTagNameNS(HP_NS, 'cellAddr')[0];

    if (!cellAddr) {
      continue;
    }

    if (
      cellAddr.getAttribute('rowAddr') === String(rowAddr) &&
      cellAddr.getAttribute('colAddr') === String(colAddr)
    ) {
      const textNode = cell.getElementsByTagNameNS(HP_NS, 't')[0];
      return textNode?.textContent ?? null;
    }
  }

  return null;
}
