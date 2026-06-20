import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEMPLATE_FILE_PATHS } from '../../hwpx/constants';
import { createTemplateFiles } from '../../hwpx/loadTemplate';
import {
  DEFAULT_PRACTICE_TEMPLATE_ID,
  type PracticeTemplateId,
} from '../../hwpx/templates';
import type { TemplateFiles } from '../../hwpx/types';

const ASSETS_TEMPLATE_ROOT = join(process.cwd(), 'assets/templates');

function getTemplateRoot(templateId: PracticeTemplateId): string {
  return join(ASSETS_TEMPLATE_ROOT, templateId);
}

export function loadFixtureTemplateFiles(
  templateId: PracticeTemplateId = DEFAULT_PRACTICE_TEMPLATE_ID,
): TemplateFiles {
  const templateRoot = getTemplateRoot(templateId);
  const entries: Record<string, Uint8Array> = {};

  for (const path of TEMPLATE_FILE_PATHS) {
    entries[path] = new Uint8Array(readFileSync(join(templateRoot, path)));
  }

  return createTemplateFiles(entries);
}

export function loadFixtureSection0Xml(
  templateId: PracticeTemplateId = DEFAULT_PRACTICE_TEMPLATE_ID,
): string {
  return readFileSync(
    join(getTemplateRoot(templateId), 'Contents/section0.xml'),
    'utf8',
  );
}

export function parseFixtureSection0(
  templateId: PracticeTemplateId = DEFAULT_PRACTICE_TEMPLATE_ID,
): Document {
  const xml = loadFixtureSection0Xml(templateId);
  return new DOMParser().parseFromString(xml, 'application/xml');
}

export const ALL_PRACTICE_TEMPLATE_IDS: PracticeTemplateId[] = [
  'practice_diagonal_20x29',
  'practice_grid_20x29',
  'practice_cross_20x29',
];
