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
