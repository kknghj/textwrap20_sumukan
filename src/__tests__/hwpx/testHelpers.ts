import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_FILE_PATHS } from '../../hwpx/constants';
import { createTemplateFiles } from '../../hwpx/loadTemplate';
import type { TemplateFiles } from '../../hwpx/types';

const TEMPLATE_ROOT = join(
  process.cwd(),
  'assets/templates/practice_diagonal_20x29',
);

export function loadFixtureTemplateFiles(): TemplateFiles {
  const entries: Record<string, Uint8Array> = {};

  for (const path of TEMPLATE_FILE_PATHS) {
    entries[path] = new Uint8Array(readFileSync(join(TEMPLATE_ROOT, path)));
  }

  return createTemplateFiles(entries);
}

export function loadFixtureSection0Xml(): string {
  return readFileSync(
    join(TEMPLATE_ROOT, 'Contents/section0.xml'),
    'utf8',
  );
}

export function parseFixtureSection0(): Document {
  const xml = loadFixtureSection0Xml();
  return new DOMParser().parseFromString(xml, 'application/xml');
}
