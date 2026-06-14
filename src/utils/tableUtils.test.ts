import { describe, expect, it } from 'vitest';
import { padRows, rowsToTsv } from './tableUtils';

describe('padRows', () => {
  it('행 끝을 빈 칸으로 채운다', () => {
    expect(padRows([['안', '녕']], 4)).toEqual([['안', '녕', '', '']]);
  });

  it('칸 수를 초과하면 잘라낸다', () => {
    expect(padRows([['가', '나', '다', '라', '마']], 3)).toEqual([
      ['가', '나', '다'],
    ]);
  });
});

describe('rowsToTsv', () => {
  it('행은 CRLF, 열은 탭으로 구분한다', () => {
    expect(rowsToTsv([['골', '목'], ['끄', '']])).toBe('골\t목\r\n끄\t');
  });
});
