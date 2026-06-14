import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HwpTable } from './HwpTable';

describe('HwpTable HTML rendering', () => {
  it('rows를 HTML table로 렌더링한다', () => {
    const html = renderToStaticMarkup(
      <HwpTable
        rows={[
          ['골', '목', '길', '머', '뭇'],
          ['끄', '덕', '임', '을', '난'],
        ]}
      />,
    );

    expect(html).toContain('<table');
    expect(html).toContain('<td>골</td>');
    expect(html).toContain('<td>목</td>');
    expect(html).toContain('<td>난</td>');
    expect(html.match(/<tr/g)?.length).toBe(2);
  });

  it('빈 rows면 null을 렌더링한다', () => {
    expect(renderToStaticMarkup(<HwpTable rows={[]} />)).toBe('');
  });
});
