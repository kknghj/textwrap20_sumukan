import { buildMultiPageSection } from './buildMultiPageSection';
import { buildHwpx } from './buildHwpx';
import {
  DEFAULT_TEMPLATE_ID,
  HWPX_FILENAME,
  MAX_HWPX_CELLS,
  getHwpxFilename,
} from './constants';
import { loadTemplate } from './loadTemplate';
import { prepareHwpxFromSource } from './textToCells';
import type { PracticeTemplateId } from './templates';
import type { HwpxDownloadResult } from './types';
import type { TransformOptions } from '../utils/transformText';

export type HwpxTransformOptions = Omit<TransformOptions, 'maxCharsPerLine'>;

export interface CreateHwpxBlobOptions extends HwpxTransformOptions {
  templateId?: PracticeTemplateId;
}

/** 원문과 옵션으로 HWPX Blob을 생성한다. */
export async function createHwpxBlob(
  sourceText: string,
  options: CreateHwpxBlobOptions,
  loadTemplateFn: typeof loadTemplate = loadTemplate,
): Promise<HwpxDownloadResult> {
  const { templateId = DEFAULT_TEMPLATE_ID, ...transformOptions } = options;
  const prepared = prepareHwpxFromSource(sourceText, transformOptions);

  if (!prepared.ok) {
    return {
      success: false,
      reason: 'exceeds_limit',
      message: `변환 결과가 ${prepared.cellCount}칸으로 최대 ${MAX_HWPX_CELLS.toLocaleString()}칸을 초과했습니다.`,
    };
  }

  if (prepared.chars.length === 0) {
    return {
      success: false,
      reason: 'build_error',
      message: '변환 결과가 비어 있습니다.',
    };
  }

  try {
    const templateFiles = await loadTemplateFn(templateId);
    const section0Bytes = templateFiles.get('Contents/section0.xml');

    if (!section0Bytes) {
      throw new Error('Template is missing Contents/section0.xml');
    }

    const section0Xml = new TextDecoder().decode(section0Bytes);
    const doc = new DOMParser().parseFromString(section0Xml, 'application/xml');
    buildMultiPageSection(doc, prepared.chars);

    const serialized = new XMLSerializer().serializeToString(doc);
    const zipBytes = buildHwpx(templateFiles, serialized);
    const blob = new Blob([zipBytes], { type: 'application/hwp+zip' });

    return { success: true, blob };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'HWPX 생성 중 오류가 발생했습니다.';

    return {
      success: false,
      reason: 'template_error',
      message,
    };
  }
}

/** Blob을 브라우저에서 .hwpx 파일로 다운로드한다. */
export function downloadHwpxBlob(
  blob: Blob,
  filename = HWPX_FILENAME,
): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** 원문과 옵션으로 HWPX 파일을 생성·다운로드한다. */
export async function downloadHwpx(
  sourceText: string,
  options: CreateHwpxBlobOptions,
  filename?: string,
): Promise<HwpxDownloadResult> {
  const templateId = options.templateId ?? DEFAULT_TEMPLATE_ID;
  const resolvedFilename = filename ?? getHwpxFilename(templateId);
  const result = await createHwpxBlob(sourceText, options);

  if (result.success) {
    downloadHwpxBlob(result.blob, resolvedFilename);
  }

  return result;
}
