export type PracticeTemplateId =
  | 'practice_diagonal_20x29'
  | 'practice_grid_20x29'
  | 'practice_cross_20x29';

export interface PracticeTemplateMeta {
  id: PracticeTemplateId;
  label: string;
  description: string;
  basePath: string;
}

export const DEFAULT_PRACTICE_TEMPLATE_ID: PracticeTemplateId =
  'practice_diagonal_20x29';

export const PRACTICE_TEMPLATES: PracticeTemplateMeta[] = [
  {
    id: 'practice_diagonal_20x29',
    label: '대각선',
    description: '대각선 가이드가 있는 필사 연습장',
    basePath: '/templates/practice_diagonal_20x29',
  },
  {
    id: 'practice_grid_20x29',
    label: '방안선',
    description: '정사각 격자/방안선 중심의 필사 연습장',
    basePath: '/templates/practice_grid_20x29',
  },
  {
    id: 'practice_cross_20x29',
    label: '십자선',
    description: '각 칸 중앙 십자선 가이드가 있는 필사 연습장',
    basePath: '/templates/practice_cross_20x29',
  },
];

export function getPracticeTemplateMeta(
  templateId: PracticeTemplateId,
): PracticeTemplateMeta {
  const meta = PRACTICE_TEMPLATES.find((item) => item.id === templateId);

  if (!meta) {
    throw new Error(`Unknown practice template: ${templateId}`);
  }

  return meta;
}

export function getTemplateBasePath(templateId: PracticeTemplateId): string {
  return getPracticeTemplateMeta(templateId).basePath;
}
