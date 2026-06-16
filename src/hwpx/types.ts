export type TemplateFilePath = string;

export type TemplateFiles = Map<TemplateFilePath, Uint8Array>;

export interface PracticeCell {
  element: Element;
  rowAddr: number;
  colAddr: number;
  domIndex: number;
}

export interface HwpxExceedsLimitResult {
  ok: false;
  reason: 'exceeds_limit';
  cellCount: number;
}

export interface HwpxCharsReadyResult {
  ok: true;
  chars: (string | null)[];
  cellCount: number;
  pageCount: number;
}

export type HwpxCharsResult = HwpxExceedsLimitResult | HwpxCharsReadyResult;

export interface HwpxDownloadSuccess {
  success: true;
  blob: Blob;
}

export interface HwpxDownloadFailure {
  success: false;
  reason: 'exceeds_limit' | 'template_error' | 'build_error';
  message?: string;
}

export type HwpxDownloadResult = HwpxDownloadSuccess | HwpxDownloadFailure;
