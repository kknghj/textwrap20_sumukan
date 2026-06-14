import { describe, expect, it } from 'vitest';
import {
  DEFAULT_REMOVAL_OPTIONS,
  normalizeMaxCharsPerLine,
  transformText,
  type RemovalOptions,
  type TransformOptions,
} from './transformText';

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

    expect(result).toBe(
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

    expect(result).toBe(
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

    expect(result).toBe(
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

    expect(result).toBe('안녕 세상 정말 좋나');
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

    expect(result).toBe('안녕 반가워 하세요 좋아 하세요');
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

    expect(result).toBe('안녕');
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

    expect(result).toBe('첫 번째 문단입니다\n\n두 번째 문단입니다');
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

    expect(result).toBe('안녕. 세상.');
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

    expect(result).toBe('가나다라마바사아자차카.타파하거너더러머\n버');
  });
});

describe('normalizeMaxCharsPerLine', () => {
  it('최소 글자 수가 20 미만이면 20으로 보정', () => {
    expect(normalizeMaxCharsPerLine(10)).toBe(20);
    expect(normalizeMaxCharsPerLine(19)).toBe(20);
    expect(normalizeMaxCharsPerLine(20)).toBe(20);
    expect(normalizeMaxCharsPerLine(25)).toBe(25);
  });
});

describe('DEFAULT_REMOVAL_OPTIONS', () => {
  it('기본 제거 옵션은 모두 활성화되어 있다', () => {
    expect(Object.values(DEFAULT_REMOVAL_OPTIONS).every(Boolean)).toBe(true);
  });
});
