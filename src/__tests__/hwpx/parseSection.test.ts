// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';
import { PRACTICE_COLS, PRACTICE_ROWS } from '../../hwpx/constants';
import { parseSection } from '../../hwpx/parseSection';
import { parseFixtureSection0 } from './testHelpers';

describe('parseSection', () => {
  it('section0.xml에서 580개 셀을 탐색한다', () => {
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);

    expect(cells).toHaveLength(PRACTICE_ROWS * PRACTICE_COLS);
    expect(cells[0]).toMatchObject({ rowAddr: 0, colAddr: 0 });
    expect(cells[19]).toMatchObject({ rowAddr: 0, colAddr: 19 });
    expect(cells[20]).toMatchObject({ rowAddr: 1, colAddr: 0 });
    expect(cells[579]).toMatchObject({ rowAddr: 28, colAddr: 19 });
  });
});
