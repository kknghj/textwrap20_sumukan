interface HwpTableProps {
  rows: string[][];
}

export function HwpTable({ rows }: HwpTableProps) {
  if (rows.length === 0) {
    return null;
  }

  return (
    <table className="hwp-table">
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex}>{cell || '\u00a0'}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
