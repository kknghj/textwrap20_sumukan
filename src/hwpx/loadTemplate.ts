import {
  DEFAULT_TEMPLATE_ID,
  TEMPLATE_FILE_PATHS,
} from './constants';
import { getTemplateBasePath, type PracticeTemplateId } from './templates';
import type { TemplateFiles } from './types';

/** 브라우저에서 public/templates 경로의 HWPX 템플릿을 로드한다. */
export async function loadTemplate(
  templateId: PracticeTemplateId = DEFAULT_TEMPLATE_ID,
): Promise<TemplateFiles> {
  const basePath = getTemplateBasePath(templateId);
  const files: TemplateFiles = new Map();

  await Promise.all(
    TEMPLATE_FILE_PATHS.map(async (path) => {
      const response = await fetch(`${basePath}/${path}`);

      if (!response.ok) {
        throw new Error(`Failed to load template file: ${path} (${response.status})`);
      }

      const buffer = await response.arrayBuffer();
      files.set(path, new Uint8Array(buffer));
    }),
  );

  return files;
}

/** 테스트 또는 사전 로드된 바이트 맵에서 템플릿을 구성한다. */
export function createTemplateFiles(entries: Record<string, Uint8Array>): TemplateFiles {
  const files: TemplateFiles = new Map();

  for (const path of TEMPLATE_FILE_PATHS) {
    const data = entries[path];

    if (!data) {
      throw new Error(`Missing template file: ${path}`);
    }

    files.set(path, data);
  }

  return files;
}
