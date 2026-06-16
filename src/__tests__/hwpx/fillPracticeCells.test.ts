// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import {
  countTextNodes,
  extractCellFormatSnapshot,
  fillPracticeCells,
} from '../../hwpx/fillPracticeCells';
import { parseSection } from '../../hwpx/parseSection';
import { parseFixtureSection0 } from './testHelpers';

describe('fillPracticeCells', () => {
  it('첫 번째 셀에 "가"를 삽입한다', () => {
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);

    fillPracticeCells(doc, cells, ['가']);

    const firstRun = cells[0]!.element.getElementsByTagNameNS(
      'http://www.hancom.co.kr/hwpml/2011/paragraph',
      'run',
    )[0];
    const textNode = firstRun?.getElementsByTagNameNS(
      'http://www.hancom.co.kr/hwpml/2011/paragraph',
      't',
    )[0];

    expect(textNode?.textContent).toBe('가');
  });

  it('첫 줄 20자를 row 0의 col 0~19에 매핑한다', () => {
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);
    const chars = '가'.repeat(20).split('');

    fillPracticeCells(doc, cells, chars);

    for (let col = 0; col < 20; col += 1) {
      const run = cells[col]!.element.getElementsByTagNameNS(
        'http://www.hancom.co.kr/hwpml/2011/paragraph',
        'run',
      )[0];
      const textNode = run?.getElementsByTagNameNS(
        'http://www.hancom.co.kr/hwpml/2011/paragraph',
        't',
      )[0];
      expect(textNode?.textContent).toBe('가');
    }

    const row1FirstCell = cells[20]!.element.getElementsByTagNameNS(
      'http://www.hancom.co.kr/hwpml/2011/paragraph',
      't',
    );
    expect(row1FirstCell.length).toBe(0);
  });

  it('21번째 글자를 두 번째 줄 첫 칸에 매핑한다', () => {
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);
    const chars = '가'.repeat(21).split('');

    fillPracticeCells(doc, cells, chars);

    const secondRowFirstRun = cells[20]!.element.getElementsByTagNameNS(
      'http://www.hancom.co.kr/hwpml/2011/paragraph',
      'run',
    )[0];
    const textNode = secondRowFirstRun?.getElementsByTagNameNS(
      'http://www.hancom.co.kr/hwpml/2011/paragraph',
      't',
    )[0];

    expect(textNode?.textContent).toBe('가');
  });

  it('XML 직렬화 후 입력 글자 수만큼 hp:t를 생성한다', () => {
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);
    const chars = ['안', '녕', null, '하', '세', '요'];

    fillPracticeCells(doc, cells, chars);
    const xml = new XMLSerializer().serializeToString(doc);

    expect(countTextNodes(xml)).toBe(5);
  });

  it('주요 서식 속성이 변경되지 않는다', () => {
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);
    const before = extractCellFormatSnapshot(cells);

    fillPracticeCells(doc, cells, '가나다라'.split(''));
    const after = extractCellFormatSnapshot(parseSection(doc));

    expect(after).toEqual(before);
  });

  it('& < > 같은 XML 특수문자를 이스케이프한다', () => {
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);

    fillPracticeCells(doc, cells, ['&', '<', '>']);
    const xml = new XMLSerializer().serializeToString(doc);

    expect(xml).toContain('&amp;');
    expect(xml).toContain('&lt;');
    expect(xml).toContain('&gt;');
    expect(xml).not.toMatch(/<hp:t>&<\/hp:t>/);
  });
});
