export type SpaceCountMode = 'exclude' | 'include';
export type LineBreakMode = 'word' | 'char';
/** @deprecated Excel 기반 한글 연습장 붙여넣기 — `hwpTable`은 레거시 전용 */
export type OutputMode = 'plain' | 'hwpTable';

export interface RemovalOptions {
  removePeriod: boolean;
  removeComma: boolean;
  removeExclamationQuestion: boolean;
  removeEllipsis: boolean;
  removeParentheses: boolean;
  removeQuotes: boolean;
  removeHanja: boolean;
  removeNonKorean: boolean;
  removeOtherSymbols: boolean;
}

export interface TransformOptions {
  maxCharsPerLine: number;
  spaceCountMode: SpaceCountMode;
  lineBreakMode: LineBreakMode;
  removal: RemovalOptions;
}

export interface TransformResult {
  plainText: string;
  rows: string[][];
}

export const DEFAULT_REMOVAL_OPTIONS: RemovalOptions = {
  removePeriod: true,
  removeComma: true,
  removeExclamationQuestion: true,
  removeEllipsis: true,
  removeParentheses: true,
  removeQuotes: true,
  removeHanja: true,
  removeNonKorean: true,
  removeOtherSymbols: true,
};

export const DEFAULT_TRANSFORM_OPTIONS: TransformOptions = {
  maxCharsPerLine: 20,
  spaceCountMode: 'exclude',
  lineBreakMode: 'word',
  removal: DEFAULT_REMOVAL_OPTIONS,
};

const MIN_CHARS_PER_LINE = 10;

const HANJA_REGEX = /[\u4E00-\u9FFF]/;
const KOREAN_REGEX = /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/;
const PARENTHESES_REGEX = /[()[\]{}（）［］｛｝]/;
const QUOTES_REGEX = /["'""''「」『』《》〈〉]/;
const NON_KOREAN_LETTER_REGEX = /\p{L}/u;

export function normalizeMaxCharsPerLine(value: number): number {
  return Math.max(MIN_CHARS_PER_LINE, Math.floor(value));
}

function countChars(text: string, spaceCountMode: SpaceCountMode): number {
  if (spaceCountMode === 'exclude') {
    return text.replace(/\s/g, '').length;
  }

  return text.length;
}

function isKorean(char: string): boolean {
  return KOREAN_REGEX.test(char);
}

function isHanja(char: string): boolean {
  return HANJA_REGEX.test(char);
}

function isNonKoreanLetter(char: string): boolean {
  if (isKorean(char) || isHanja(char)) {
    return false;
  }

  return NON_KOREAN_LETTER_REGEX.test(char);
}

function isProtectedCharacter(char: string, removal: RemovalOptions): boolean {
  if (!removal.removePeriod && char === '.') {
    return true;
  }
  if (!removal.removeComma && char === ',') {
    return true;
  }
  if (!removal.removeExclamationQuestion && (char === '!' || char === '?')) {
    return true;
  }
  if (!removal.removeEllipsis && char === '…') {
    return true;
  }
  if (!removal.removeParentheses && PARENTHESES_REGEX.test(char)) {
    return true;
  }
  if (!removal.removeQuotes && QUOTES_REGEX.test(char)) {
    return true;
  }
  if (!removal.removeHanja && isHanja(char)) {
    return true;
  }
  if (!removal.removeNonKorean && isNonKoreanLetter(char)) {
    return true;
  }

  return false;
}

function removeCharacters(text: string, removal: RemovalOptions): string {
  let result = text;

  if (removal.removePeriod) {
    result = result.replace(/\./g, '');
  }
  if (removal.removeComma) {
    result = result.replace(/,/g, '');
  }
  if (removal.removeExclamationQuestion) {
    result = result.replace(/[!?]/g, '');
  }
  if (removal.removeEllipsis) {
    result = result.replace(/…|\.\.\./g, '');
  }
  if (removal.removeParentheses) {
    result = result.replace(/[()[\]{}（）［］｛｝]/g, '');
  }
  if (removal.removeQuotes) {
    result = result.replace(/["'""''「」『』《》〈〉]/g, '');
  }
  if (removal.removeHanja) {
    result = result.replace(/[\u4E00-\u9FFF]/g, '');
  }
  if (removal.removeNonKorean) {
    result = [...result]
      .filter((char) => !isNonKoreanLetter(char))
      .join('');
  }
  if (removal.removeOtherSymbols) {
    result = [...result]
      .filter((char) => {
        if (/\s/.test(char) || isKorean(char)) {
          return true;
        }

        if (isProtectedCharacter(char, removal)) {
          return true;
        }

        if (isHanja(char)) {
          return !removal.removeHanja;
        }

        if (isNonKoreanLetter(char)) {
          return !removal.removeNonKorean;
        }

        return false;
      })
      .join('');
  }

  return result;
}

function splitWords(paragraph: string): string[] {
  return paragraph.trim().split(/\s+/).filter(Boolean);
}

function wrapByWords(
  words: string[],
  maxChars: number,
  spaceCountMode: SpaceCountMode,
): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if (countChars(word, spaceCountMode) > maxChars) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = '';
      }

      const wordLines = wrapByChars(word, maxChars, spaceCountMode);
      lines.push(...wordLines.slice(0, -1));
      currentLine = wordLines[wordLines.length - 1] ?? '';
      continue;
    }

    const separator = currentLine && spaceCountMode === 'include' ? ' ' : '';
    const candidate = `${currentLine}${separator}${word}`;

    if (currentLine && countChars(candidate, spaceCountMode) > maxChars) {
      lines.push(currentLine);
      currentLine = word;
      continue;
    }

    currentLine = candidate;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function wrapByChars(
  text: string,
  maxChars: number,
  spaceCountMode: SpaceCountMode,
): string[] {
  const lines: string[] = [];
  let currentLine = '';

  for (const char of text) {
    const candidate = `${currentLine}${char}`;

    if (currentLine && countChars(candidate, spaceCountMode) > maxChars) {
      lines.push(currentLine);
      currentLine = char;
      continue;
    }

    currentLine = candidate;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function wrapParagraph(
  paragraph: string,
  options: TransformOptions,
): string[] {
  const maxChars = normalizeMaxCharsPerLine(options.maxCharsPerLine);
  const trimmed = paragraph.trim();

  if (!trimmed) {
    return [];
  }

  if (options.lineBreakMode === 'word') {
    return wrapByWords(splitWords(trimmed), maxChars, options.spaceCountMode);
  }

  const normalizedText =
    options.spaceCountMode === 'exclude'
      ? trimmed.replace(/\s+/g, '')
      : trimmed.replace(/\s+/g, ' ');

  return wrapByChars(normalizedText, maxChars, options.spaceCountMode);
}

function splitParagraphs(text: string): string[] {
  return text.replace(/\r/g, '').split(/\n\s*\n/);
}

function normalizeParagraphNewlines(paragraph: string): string {
  return paragraph.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/** 한 줄 문자열을 표 셀 배열로 변환한다. 공백은 빈 칸('')으로 표현한다. */
export function lineToCells(line: string): string[] {
  return [...line].map((char) => (char === ' ' ? '' : char));
}

/** 줄 배열을 2차원 셀 배열로 변환한다. */
export function linesToRows(lines: string[]): string[][] {
  return lines.map(lineToCells);
}

export function transformText(
  text: string,
  options: TransformOptions,
): TransformResult {
  const paragraphs = splitParagraphs(text);
  const plainParts: string[] = [];
  const rows: string[][] = [];

  for (const rawParagraph of paragraphs) {
    const normalizedParagraph = normalizeParagraphNewlines(rawParagraph);
    if (!normalizedParagraph) {
      continue;
    }

    const cleanedText = removeCharacters(normalizedParagraph, options.removal);
    const lines = wrapParagraph(cleanedText, options);

    if (lines.length > 0) {
      plainParts.push(lines.join('\n'));
      rows.push(...linesToRows(lines));
    }
  }

  return {
    plainText: plainParts.join('\n\n'),
    rows,
  };
}
