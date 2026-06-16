// @vitest-environment jsdom

import { strFromU8, unzipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { assertRequiredZipEntries, buildHwpx } from '../../hwpx/buildHwpx';
import { TEMPLATE_FILE_PATHS } from '../../hwpx/constants';
import { fillPracticeCells } from '../../hwpx/fillPracticeCells';
import { parseSection } from '../../hwpx/parseSection';
import { loadFixtureSection0Xml, loadFixtureTemplateFiles, parseFixtureSection0 } from './testHelpers';

function getZipEntryNames(zipBytes: Uint8Array): string[] {
  const entries = unzipSync(zipBytes);
  return Object.keys(entries);
}

function getFirstZipEntryName(zipBytes: Uint8Array): string {
  const zipString = Array.from(zipBytes)
    .map((byte) => String.fromCharCode(byte))
    .join('');

  const localHeaderIndex = zipString.indexOf('PK\u0003\u0004');
  const nameLength =
    zipBytes[localHeaderIndex + 26]! + (zipBytes[localHeaderIndex + 27]! << 8);
  const nameStart = localHeaderIndex + 30;

  return zipString.slice(nameStart, nameStart + nameLength);
}

describe('buildHwpx', () => {
  it('ZIP 결과에 필수 HWPX 파일들이 포함된다', () => {
    const templateFiles = loadFixtureTemplateFiles();
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);
    fillPracticeCells(doc, cells, ['가']);
    const section0Xml = new XMLSerializer().serializeToString(doc);

    const zipBytes = buildHwpx(templateFiles, section0Xml);
    const entries = unzipSync(zipBytes);
    const entryNames = Object.keys(entries);

    for (const path of TEMPLATE_FILE_PATHS) {
      expect(entryNames).toContain(path);
    }

    assertRequiredZipEntries(entries);
    expect(getZipEntryNames(zipBytes)).toEqual(
      expect.arrayContaining([...TEMPLATE_FILE_PATHS]),
    );
  });

  it('mimetype이 ZIP 첫 항목이며 내용이 application/hwp+zip이다', () => {
    const templateFiles = loadFixtureTemplateFiles();
    const section0Xml = loadFixtureSection0Xml();
    const zipBytes = buildHwpx(templateFiles, section0Xml);

    expect(getFirstZipEntryName(zipBytes)).toBe('mimetype');

    const entries = unzipSync(zipBytes);
    expect(strFromU8(entries.mimetype!)).toBe('application/hwp+zip');
  });

  it('수정된 section0.xml이 ZIP에 반영된다', () => {
    const templateFiles = loadFixtureTemplateFiles();
    const doc = parseFixtureSection0();
    const cells = parseSection(doc);
    fillPracticeCells(doc, cells, ['필', '사']);
    const section0Xml = new XMLSerializer().serializeToString(doc);

    const zipBytes = buildHwpx(templateFiles, section0Xml);
    const entries = unzipSync(zipBytes);
    const packedSection0 = strFromU8(entries['Contents/section0.xml']!);

    expect(packedSection0).toContain('필');
    expect(packedSection0).toContain('사');
  });
});
