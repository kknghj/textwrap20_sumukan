import * as XLSX from 'xlsx';

/** 연습장 칸 수에 맞게 행 끝을 빈 칸으로 채운다. */
export function padRows(rows: string[][], colsPerRow: number): string[][] {
  if (colsPerRow <= 0) {
    return rows.map((row) => [...row]);
  }

  return rows.map((row) => {
    const padded = [...row];
    while (padded.length < colsPerRow) {
      padded.push('');
    }
    return padded.slice(0, colsPerRow);
  });
}

/** 2차원 셀 배열을 TSV 문자열로 변환한다. */
export function rowsToTsv(rows: string[][]): string {
  return rows.map((row) => row.join('\t')).join('\r\n');
}

/**
 * Excel(.xlsx) 파일을 다운로드한다.
 * @deprecated Excel 기반 한글 연습장 붙여넣기 레거시 전용 — 메인 UI에서 비노출.
 */
export function downloadXlsx(
  rows: string[][],
  filename = 'pilsa-practice.xlsx',
  colsPerRow?: number,
): void {
  const grid = colsPerRow ? padRows(rows, colsPerRow) : rows;
  const worksheet = XLSX.utils.aoa_to_sheet(grid);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '연습장');
  XLSX.writeFile(workbook, filename);
}
