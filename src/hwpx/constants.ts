import {
  DEFAULT_PRACTICE_TEMPLATE_ID,
  getTemplateBasePath,
  type PracticeTemplateId,
} from './templates';

export const HP_NS = 'http://www.hancom.co.kr/hwpml/2011/paragraph';

export type { PracticeTemplateId };

export const DEFAULT_TEMPLATE_ID = DEFAULT_PRACTICE_TEMPLATE_ID;

/** @deprecated Use DEFAULT_TEMPLATE_ID or PracticeTemplateId instead */
export const TEMPLATE_ID = DEFAULT_PRACTICE_TEMPLATE_ID;

export const PRACTICE_ROWS = 29;
export const PRACTICE_COLS = 20;
export const MAX_CELLS = PRACTICE_ROWS * PRACTICE_COLS;
export const MAX_HWPX_PAGES = 20;
export const MAX_HWPX_CELLS = MAX_CELLS * MAX_HWPX_PAGES;
export const HWPX_CHARS_PER_LINE = PRACTICE_COLS;

/** @deprecated Prefer findTargetRun empty-run detection over charPrIDRef matching */
export const CHAR_PR_ID_REF = '13';

export const HWPX_FILENAME = 'pilsa-practice.hwpx';

export function getHwpxFilename(templateId: PracticeTemplateId): string {
  const suffix = templateId
    .replace(/^practice_/, '')
    .replace(/_20x29$/, '');

  return `pilsa-practice_${suffix}.hwpx`;
}

/** @deprecated Use getTemplateBasePath(templateId) instead */
export const TEMPLATE_BASE_PATH = getTemplateBasePath(DEFAULT_PRACTICE_TEMPLATE_ID);
export const TEMPLATE_FILE_PATHS = [
  'mimetype',
  'settings.xml',
  'version.xml',
  'Contents/content.hpf',
  'Contents/header.xml',
  'Contents/masterpage0.xml',
  'Contents/section0.xml',
  'META-INF/container.xml',
  'META-INF/container.rdf',
  'META-INF/manifest.xml',
  'Preview/PrvImage.png',
  'Preview/PrvText.txt',
] as const;

export const HWPX_EXCEEDS_LIMIT_MESSAGE = `HWPX 다운로드는 최대 ${MAX_HWPX_PAGES}페이지(${MAX_HWPX_CELLS.toLocaleString()}칸)까지 지원합니다.
변환 결과가 이 한도를 초과했습니다.`;

export const HWPX_TEMPLATE_HINT =
  'HWPX 다운로드는 20칸 × 29줄 연습장 기준입니다. 대각선·방안선·십자선 중 선택할 수 있으며, 580칸마다 새 페이지로 나눕니다. (실험적 다중 페이지 PoC)';

export const HWPX_MULTI_PAGE_HINT =
  '580칸마다 새 페이지로 나누어 HWPX를 생성합니다. (실험적 기능 — 한글에서 열어 확인해 주세요)';
