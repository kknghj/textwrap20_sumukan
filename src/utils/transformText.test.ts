import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMOVAL_OPTIONS,
  lineToCells,
  linesToRows,
  normalizeMaxCharsPerLine,
  transformText,
  type RemovalOptions,
  type TransformOptions,
} from './transformText';
import { rowsToTsv } from './tableUtils';

const noRemoval: RemovalOptions = {
  removePeriod: false,
  removeComma: false,
  removeExclamationQuestion: false,
  removeEllipsis: false,
  removeParentheses: false,
  removeQuotes: false,
  removeHanja: false,
  removeNonKorean: false,
  removeOtherSymbols: false,
};

function createOptions(
  overrides: Partial<TransformOptions> = {},
): TransformOptions {
  return {
    maxCharsPerLine: 20,
    spaceCountMode: 'exclude',
    lineBreakMode: 'word',
    removal: noRemoval,
    ...overrides,
  };
}

describe('transformText', () => {
  it('띄어쓰기 제외 + 어절 단위 + 20자', () => {
    const input = '안녕하세요 반갑습니다 오늘 날씨가 정말 좋습니다';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe(
      '안녕하세요반갑습니다오늘날씨가정말\n좋습니다',
    );
  });

  it('띄어쓰기 포함 + 어절 단위 + 20자', () => {
    const input = '안녕하세요 반갑습니다 오늘 날씨가 정말 좋습니다';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'include',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe(
      '안녕하세요 반갑습니다 오늘 날씨가\n정말 좋습니다',
    );
  });

  it('띄어쓰기 제외 + 글자 단위 + 20자', () => {
    const input = '가나다라마바사아자차카타파하거너더러머버서';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'char',
      }),
    );

    expect(result.plainText).toBe(
      '가나다라마바사아자차카타파하거너더러머버\n서',
    );
  });

  it('마침표, 쉼표, 느낌표, 물음표, 말줄임표 제거', () => {
    const input = '안녕, 세상! 정말… 좋나?.';
    const result = transformText(
      input,
      createOptions({
        removal: {
          ...noRemoval,
          removePeriod: true,
          removeComma: true,
          removeExclamationQuestion: true,
          removeEllipsis: true,
        },
        spaceCountMode: 'include',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe('안녕 세상 정말 좋나');
  });

  it('괄호와 따옴표 제거', () => {
    const input = '(안녕) {반가워} [하세요] "좋아" 「하세요」';
    const result = transformText(
      input,
      createOptions({
        removal: {
          ...noRemoval,
          removeParentheses: true,
          removeQuotes: true,
        },
        spaceCountMode: 'include',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe('안녕 반가워 하세요 좋아 하세요');
  });

  it('한글 외 문자 제거 (영어·한자 포함)', () => {
    const input = '안녕 hello 世界';
    const result = transformText(
      input,
      createOptions({
        removal: {
          ...noRemoval,
          removeHanja: true,
          removeNonKorean: true,
        },
        spaceCountMode: 'include',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe('안녕');
  });

  it('문단 구분을 유지한다', () => {
    const input = '첫 번째 문단입니다.\n\n두 번째 문단입니다.';
    const result = transformText(
      input,
      createOptions({
        removal: {
          ...noRemoval,
          removePeriod: true,
        },
        spaceCountMode: 'include',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe('첫 번째 문단입니다\n\n두 번째 문단입니다');
  });

  it('마침표 제거를 해제하면 기타 기호 제거가 켜져 있어도 마침표를 유지한다', () => {
    const input = '안녕. 세상.';
    const result = transformText(
      input,
      createOptions({
        removal: {
          ...DEFAULT_REMOVAL_OPTIONS,
          removePeriod: false,
        },
        spaceCountMode: 'include',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe('안녕. 세상.');
  });

  it('유지된 마침표는 글자 수 계산에 포함된다', () => {
    const input = '가나다라마바사아자차카. 타파하거너더러머버';
    const result = transformText(
      input,
      createOptions({
        removal: {
          ...DEFAULT_REMOVAL_OPTIONS,
          removePeriod: false,
        },
        maxCharsPerLine: 20,
        spaceCountMode: 'exclude',
        lineBreakMode: 'char',
      }),
    );

    expect(result.plainText).toBe('가나다라마바사아자차카.타파하거너더러머\n버');
  });

  it('원문 줄이 짧아도 문단 내부에서는 이어 붙여 최대 글자 수를 채운다', () => {
    const input = '나는 오늘\n좋은 밤에\n수선화를 보았다\n정말 아름다웠다';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe('나는오늘좋은밤에수선화를보았다정말\n아름다웠다');
    expect(result.plainText.split('\n').every((line) => line.length <= 20)).toBe(true);
    expect(result.plainText).not.toBe('나는오늘\n좋은밤에\n수선화를보았다\n정말아름다웠다');
  });

  it('빈 줄로 구분된 문단은 유지한다', () => {
    const input =
      '첫 번째 문단입니다\n아직 같은 문단입니다\n\n두 번째 문단입니다\n이 문단도 이어집니다';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe(
      '첫번째문단입니다아직같은문단입니다\n\n두번째문단입니다이문단도이어집니다',
    );
  });

  it('띄어쓰기 제외 모드에서는 결과에 공백이 없다', () => {
    const input = '나는 오늘\n좋은 밤에\n수선화를 보았다';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).not.toMatch(/\s/);
  });

  it('띄어쓰기 포함 모드에서는 문단 내부 줄바꿈이 공백으로 바뀐다', () => {
    const input = '나는 오늘\n좋은 밤에\n수선화를 보았다';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'include',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe('나는 오늘 좋은 밤에 수선화를 보았다');
    expect(result.plainText).not.toContain('나는 오늘\n좋은 밤에');
  });

  it('어절 단위 줄넘김에서는 단어 중간이 끊기지 않는다', () => {
    const input = '안녕하세요 반갑습니다 오늘 날씨가 정말 좋습니다';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'word',
      }),
    );

    const lines = result.plainText.split('\n');
    expect(lines[0]).toBe('안녕하세요반갑습니다오늘날씨가정말');
    expect(lines[1]).toBe('좋습니다');
    expect(lines.every((line) => line.length <= 20)).toBe(true);
  });

  it('글자 단위 줄넘김에서는 최대 글자 수마다 끊긴다', () => {
    const input = '가나다라마바사아자차카타파하거너더러머버서';
    const result = transformText(
      input,
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'char',
      }),
    );

    const lines = result.plainText.split('\n');
    expect(lines[0]).toHaveLength(20);
    expect(lines[1]).toHaveLength(1);
  });

  it('어절 단위 설정에서도 최대 글자 수를 넘는 어절만 글자 단위로 나눈다', () => {
    const longWord = '가'.repeat(15);
    const input = `짧은 ${longWord} 끝`;
    const result = transformText(
      input,
      createOptions({
        maxCharsPerLine: 10,
        spaceCountMode: 'exclude',
        lineBreakMode: 'word',
      }),
    );

    expect(result.plainText).toBe(`짧은\n${'가'.repeat(10)}\n${'가'.repeat(5)}끝`);
  });

  it('단일 어절이 최대 글자 수보다 길어도 무한 루프 없이 처리한다', () => {
    const longWord = '가'.repeat(45);
    const result = transformText(
      longWord,
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'word',
      }),
    );

    const lines = result.plainText.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('가'.repeat(20));
    expect(lines[1]).toBe('가'.repeat(20));
    expect(lines[2]).toBe('가'.repeat(5));
    expect(lines.every((line) => line.length <= 20)).toBe(true);
  });
});


describe('transformText rows', () => {
  it('"안녕하세요"를 한 글자씩 셀 배열로 생성한다', () => {
    const result = transformText(
      '안녕하세요',
      createOptions({ spaceCountMode: 'exclude', lineBreakMode: 'char' }),
    );
    expect(result.rows).toEqual([['안', '녕', '하', '세', '요']]);
  });

  it('띄어쓰기 제외: "나는 좋습니다"', () => {
    const result = transformText(
      '나는 좋습니다',
      createOptions({ spaceCountMode: 'exclude', lineBreakMode: 'char' }),
    );
    expect(result.rows).toEqual([['나', '는', '좋', '습', '니', '다']]);
  });

  it('띄어쓰기 포함: "나는 좋습니다"에서 공백은 빈 칸', () => {
    const result = transformText(
      '나는 좋습니다',
      createOptions({ spaceCountMode: 'include', lineBreakMode: 'char' }),
    );
    expect(result.rows).toEqual([['나', '는', '', '좋', '습', '니', '다']]);
  });

  it('20자 기준으로 행이 분리된다', () => {
    const result = transformText(
      '가'.repeat(25),
      createOptions({
        spaceCountMode: 'exclude',
        lineBreakMode: 'char',
        maxCharsPerLine: 20,
      }),
    );
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toHaveLength(20);
    expect(result.rows[1]).toHaveLength(5);
  });

  it('linesToRows로 2차원 배열 예시를 생성한다', () => {
    expect(linesToRows(['골목길머뭇', '끄덕임을난'])).toEqual([
      ['골', '목', '길', '머', '뭇'],
      ['끄', '덕', '임', '을', '난'],
    ]);
  });
});

describe('lineToCells / linesToRows', () => {
  it('공백을 빈 칸으로 변환한다', () => {
    expect(lineToCells('나는 좋')).toEqual(['나', '는', '', '좋']);
  });
});

describe('rowsToTsv', () => {
  it('행은 줄바꿈, 열은 탭으로 구분한다', () => {
    expect(rowsToTsv([['골', '목', '길'], ['끄', '덕', '']])).toBe(
      '골\t목\t길\r\n끄\t덕\t',
    );
  });
});

describe('normalizeMaxCharsPerLine', () => {
  it('최소 글자 수가 10 미만이면 10으로 보정', () => {
    expect(normalizeMaxCharsPerLine(5)).toBe(10);
    expect(normalizeMaxCharsPerLine(9)).toBe(10);
    expect(normalizeMaxCharsPerLine(10)).toBe(10);
    expect(normalizeMaxCharsPerLine(20)).toBe(20);
    expect(normalizeMaxCharsPerLine(25)).toBe(25);
  });
});

describe('DEFAULT_REMOVAL_OPTIONS', () => {
  it('기본 제거 옵션은 모두 활성화되어 있다', () => {
    expect(Object.values(DEFAULT_REMOVAL_OPTIONS).every(Boolean)).toBe(true);
  });
});
