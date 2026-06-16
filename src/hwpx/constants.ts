export const HP_NS = 'http://www.hancom.co.kr/hwpml/2011/paragraph';

export const TEMPLATE_ID = 'practice_diagonal_20x29';

export const PRACTICE_ROWS = 29;
export const PRACTICE_COLS = 20;
export const MAX_CELLS = PRACTICE_ROWS * PRACTICE_COLS;
export const HWPX_CHARS_PER_LINE = PRACTICE_COLS;
export const CHAR_PR_ID_REF = '13';

export const HWPX_FILENAME = 'pilsa-practice.hwpx';

export const TEMPLATE_BASE_PATH = '/templates/practice_diagonal_20x29';
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

export const HWPX_EXCEEDS_LIMIT_MESSAGE = `현재 HWPX 다운로드 MVP는 한 페이지(580칸)까지만 지원합니다.
변환 결과가 580칸을 초과했습니다.
다중 페이지 지원은 다음 버전에서 추가할 예정입니다.`;

export const HWPX_TEMPLATE_HINT =
  'HWPX 다운로드는 20칸 × 29줄 대각선 템플릿 기준입니다.';
