import { strToU8, zipSync } from 'fflate';
import { TEMPLATE_FILE_PATHS } from './constants';
import type { TemplateFiles } from './types';

const SECTION0_PATH = 'Contents/section0.xml';

/** 수정된 section0.xml을 반영해 HWPX ZIP 바이트를 생성한다. */
export function buildHwpx(
  templateFiles: TemplateFiles,
  section0Xml: string,
): Uint8Array {
  const zipEntries: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> =
    {};

  for (const path of TEMPLATE_FILE_PATHS) {
    if (path === 'mimetype') {
      const mimetype =
        templateFiles.get('mimetype') ?? strToU8('application/hwp+zip');
      zipEntries[path] = [mimetype, { level: 0 }];
      continue;
    }

    if (path === SECTION0_PATH) {
      zipEntries[path] = strToU8(section0Xml);
      continue;
    }

    const file = templateFiles.get(path);

    if (!file) {
      throw new Error(`Missing template file in build: ${path}`);
    }

    zipEntries[path] = file;
  }

  return zipSync(zipEntries);
}

/** ZIP에 필수 HWPX 파일이 모두 포함되어 있는지 검증한다. */
export function assertRequiredZipEntries(
  entries: Record<string, Uint8Array>,
): void {
  for (const path of TEMPLATE_FILE_PATHS) {
    if (!entries[path]) {
      throw new Error(`ZIP missing required entry: ${path}`);
    }
  }
}
