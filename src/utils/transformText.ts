export type SpaceCountMode = 'exclude' | 'include';
export type LineBreakMode = 'word' | 'char';

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

const MIN_CHARS_PER_LINE = 20;

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
    return [''];
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

export function transformText(text: string, options: TransformOptions): string {
  const cleanedText = removeCharacters(text, options.removal);
  const paragraphs = cleanedText.replace(/\r/g, '').split('\n');

  const wrappedParagraphs = paragraphs.map((paragraph) => {
    const lines = wrapParagraph(paragraph, options);
    return lines.join('\n');
  });

  return wrappedParagraphs.join('\n');
}
