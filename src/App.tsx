import { useMemo, useState } from 'react';
import { HwpTable } from './components/HwpTable';
import {
  HWPX_EXCEEDS_LIMIT_MESSAGE,
  MAX_HWPX_PAGES,
} from './hwpx/constants';
import { downloadHwpx } from './hwpx/downloadHwpx';
import { prepareHwpxFromSource } from './hwpx/textToCells';
import {
  DEFAULT_REMOVAL_OPTIONS,
  DEFAULT_TRANSFORM_OPTIONS,
  transformText,
  type OutputMode,
  type RemovalOptions,
  type SpaceCountMode,
  type LineBreakMode,
  type TransformResult,
} from './utils/transformText';
import { downloadXlsx, padRows } from './utils/tableUtils';
import './App.css';

type RemovalOptionKey = keyof RemovalOptions;

/**
 * @deprecated Excel 기반 「한글 연습장 붙여넣기」 출력 — 메인 UI에서 비노출.
 * 레거시 코드 유지용. 필요 시 `true`로 되돌려 숨김 UI를 다시 켤 수 있음.
 */
const ENABLE_LEGACY_HWP_TABLE = false;

const EMPTY_RESULT: TransformResult = { plainText: '', rows: [] };

const REMOVAL_LABELS: Record<RemovalOptionKey, string> = {
  removePeriod: '마침표 제거',
  removeComma: '쉼표 제거',
  removeExclamationQuestion: '느낌표/물음표 제거',
  removeEllipsis: '말줄임표 제거',
  removeParentheses: '괄호 제거 (소괄호·중괄호·대괄호)',
  removeQuotes: '따옴표류 제거',
  removeHanja: '한자 제거',
  removeNonKorean: '한글 외 다른 문자(영어 등) 제거 (영어 제거)',
  removeOtherSymbols: '기타 기호 제거',
};

function App() {
  const [sourceText, setSourceText] = useState('');
  const [result, setResult] = useState<TransformResult>(EMPTY_RESULT);
  const [maxCharsPerLine, setMaxCharsPerLine] = useState(
    DEFAULT_TRANSFORM_OPTIONS.maxCharsPerLine,
  );
  const [spaceCountMode, setSpaceCountMode] = useState<SpaceCountMode>(
    DEFAULT_TRANSFORM_OPTIONS.spaceCountMode,
  );
  const [lineBreakMode, setLineBreakMode] = useState<LineBreakMode>(
    DEFAULT_TRANSFORM_OPTIONS.lineBreakMode,
  );
  /** @deprecated ENABLE_LEGACY_HWP_TABLE 전용 — 메인 UI에서는 plain 고정 */
  const [outputMode, setOutputMode] = useState<OutputMode>('plain');
  const [removal, setRemoval] = useState<RemovalOptions>({
    ...DEFAULT_REMOVAL_OPTIONS,
  });
  const [copyMessage, setCopyMessage] = useState('');
  const [hwpxMessage, setHwpxMessage] = useState('');

  const activeOutputMode: OutputMode = ENABLE_LEGACY_HWP_TABLE
    ? outputMode
    : 'plain';

  const hwpxPrepared = useMemo(() => {
    if (result.rows.length === 0) {
      return null;
    }

    return prepareHwpxFromSource(sourceText, {
      spaceCountMode,
      lineBreakMode,
      removal,
    });
  }, [result.rows.length, sourceText, spaceCountMode, lineBreakMode, removal]);

  const hasTransformResult = result.rows.length > 0;
  const hwpxExceedsLimit =
    hasTransformResult && hwpxPrepared !== null && !hwpxPrepared.ok;
  const canDownloadHwpx =
    hasTransformResult &&
    hwpxPrepared !== null &&
    hwpxPrepared.ok &&
    hwpxPrepared.chars.some(Boolean);
  const hwpxPageCount =
    hwpxPrepared !== null && hwpxPrepared.ok ? hwpxPrepared.pageCount : 0;

  const gridRows =
    activeOutputMode === 'hwpTable' && result.rows.length > 0
      ? padRows(result.rows, maxCharsPerLine)
      : result.rows;

  const hasResult =
    activeOutputMode === 'hwpTable'
      ? result.rows.length > 0
      : result.plainText.length > 0;

  const handleTransform = () => {
    const converted = transformText(sourceText, {
      maxCharsPerLine,
      spaceCountMode,
      lineBreakMode,
      removal,
    });
    setResult(converted);
    setCopyMessage('');
    setHwpxMessage('');
  };

  const lineCount = result.rows.length;

  const handleCopy = async () => {
    if (!hasResult) {
      return;
    }

    try {
      await navigator.clipboard.writeText(result.plainText);
      setCopyMessage('결과가 클립보드에 복사되었습니다.');
    } catch {
      setCopyMessage('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  const handleDownloadHwpx = async () => {
    if (!canDownloadHwpx) {
      if (hwpxExceedsLimit) {
        setHwpxMessage(HWPX_EXCEEDS_LIMIT_MESSAGE);
      }
      return;
    }

    const downloadResult = await downloadHwpx(sourceText, {
      spaceCountMode,
      lineBreakMode,
      removal,
    });

    if (downloadResult.success) {
      setHwpxMessage(
        'HWPX 연습장 파일을 다운로드했습니다. 한글에서 열어 필사해 주세요.',
      );
      setCopyMessage('');
      return;
    }

    if (downloadResult.reason === 'exceeds_limit') {
      setHwpxMessage(HWPX_EXCEEDS_LIMIT_MESSAGE);
      return;
    }

    setHwpxMessage(downloadResult.message ?? 'HWPX 다운로드에 실패했습니다.');
  };

  /** @deprecated ENABLE_LEGACY_HWP_TABLE 전용 — Excel 기반 한글 연습장 붙여넣기 */
  const handleDownloadXlsx = () => {
    if (result.rows.length === 0) {
      return;
    }

    downloadXlsx(result.rows, 'pilsa-practice.xlsx', maxCharsPerLine);
    setCopyMessage(
      'Excel 파일을 다운로드했습니다. 엑셀에서 표를 복사한 뒤 한글 연습장 표를 선택하고 붙여넣으세요.',
    );
  };

  const handleReset = () => {
    setSourceText('');
    setResult(EMPTY_RESULT);
    setMaxCharsPerLine(DEFAULT_TRANSFORM_OPTIONS.maxCharsPerLine);
    setSpaceCountMode(DEFAULT_TRANSFORM_OPTIONS.spaceCountMode);
    setLineBreakMode(DEFAULT_TRANSFORM_OPTIONS.lineBreakMode);
    setOutputMode('plain');
    setRemoval({ ...DEFAULT_REMOVAL_OPTIONS });
    setCopyMessage('');
    setHwpxMessage('');
  };

  const handleRemovalChange = (key: RemovalOptionKey, checked: boolean) => {
    setRemoval((prev) => ({ ...prev, [key]: checked }));
  };

  const handleMaxCharsChange = (value: string) => {
    const parsed = Number.parseInt(value, 10);
    setMaxCharsPerLine(Number.isNaN(parsed) ? 20 : parsed);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>한글 연습장 생성기</h1>
        <p className="app-tagline">
          텍스트를 바로 한글 연습장(.hwpx)으로 만들어 보세요.
        </p>
        <p className="app-description">
          원문을 붙여넣으면 20×29칸 한글 연습장을 자동으로 생성합니다.
          <br />
          긴 글은 580칸마다 새 페이지로 나누어 저장됩니다.
        </p>
        <p className="privacy-note">
          입력한 텍스트는 서버로 전송되지 않으며, 모든 처리는 브라우저 안에서만
          이루어집니다.
        </p>
      </header>

      <section className="settings" aria-label="연습장 생성 설정">
        <div className="setting-group">
          <label htmlFor="max-chars">한 줄당 최대 글자 수</label>
          <input
            id="max-chars"
            type="number"
            min={10}
            value={maxCharsPerLine}
            onChange={(event) => handleMaxCharsChange(event.target.value)}
          />
          <p className="setting-hint">HWPX 연습장 다운로드는 20칸 기준으로 생성됩니다.</p>
        </div>

        {ENABLE_LEGACY_HWP_TABLE ? (
          <fieldset className="setting-group">
            <legend>출력 형식</legend>
            <label>
              <input
                type="radio"
                name="output-mode"
                value="plain"
                checked={outputMode === 'plain'}
                onChange={() => setOutputMode('plain')}
              />
              기본 텍스트
            </label>
            <label>
              <input
                type="radio"
                name="output-mode"
                value="hwpTable"
                checked={outputMode === 'hwpTable'}
                onChange={() => setOutputMode('hwpTable')}
              />
              한글 연습장 붙여넣기
            </label>
            {outputMode === 'hwpTable' ? (
              <p className="setting-hint">
                한글 연습장에는{' '}
                <strong>
                  Excel 다운로드 → 엑셀에서 복사 → 한글 표의 첫 칸을 선택 후 붙여넣기
                </strong>
                를 사용하세요.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <fieldset className="setting-group">
          <legend>글자 수 계산 방식</legend>
          <label>
            <input
              type="radio"
              name="space-count-mode"
              value="exclude"
              checked={spaceCountMode === 'exclude'}
              onChange={() => setSpaceCountMode('exclude')}
            />
            띄어쓰기 제외
          </label>
          <label>
            <input
              type="radio"
              name="space-count-mode"
              value="include"
              checked={spaceCountMode === 'include'}
              onChange={() => setSpaceCountMode('include')}
            />
            띄어쓰기 포함
          </label>
        </fieldset>

        <fieldset className="setting-group">
          <legend>줄넘김 기준</legend>
          <label>
            <input
              type="radio"
              name="line-break-mode"
              value="word"
              checked={lineBreakMode === 'word'}
              onChange={() => setLineBreakMode('word')}
            />
            어절 단위
          </label>
          <label>
            <input
              type="radio"
              name="line-break-mode"
              value="char"
              checked={lineBreakMode === 'char'}
              onChange={() => setLineBreakMode('char')}
            />
            글자 단위
          </label>
        </fieldset>

        <fieldset className="setting-group removal-options">
          <legend>제거 옵션</legend>
          <div className="checkbox-grid">
            {(Object.keys(REMOVAL_LABELS) as RemovalOptionKey[]).map((key) => (
              <label key={key}>
                <input
                  type="checkbox"
                  checked={removal[key]}
                  onChange={(event) =>
                    handleRemovalChange(key, event.target.checked)
                  }
                />
                {REMOVAL_LABELS[key]}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="editor-area" aria-label="연습장 생성 영역">
        <div className="editor-panel">
          <label htmlFor="source-text">원문 입력</label>
          <textarea
            id="source-text"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="시, 편지, 산문 등 원문을 붙여넣어 주세요."
          />
        </div>

        <div className="editor-panel">
          <div className="panel-heading">
            <label htmlFor="result-text">줄바꿈 미리보기</label>
            {lineCount > 0 ? (
              <span className="line-count">{lineCount}줄</span>
            ) : null}
          </div>
          {activeOutputMode === 'hwpTable' ? (
            <>
              <p className="result-hint">
                Excel 다운로드 후 엑셀에서 표를 복사한 뒤, 한글 연습장 표 첫 칸에
                '내용만 덮어쓰기' 선택하고 붙어넣으세요.
              </p>
              <div className="result-table-wrap">
                {gridRows.length > 0 ? (
                  <HwpTable rows={gridRows} />
                ) : (
                  <p className="result-empty">변환 버튼을 누르면 표가 표시됩니다.</p>
                )}
              </div>
            </>
          ) : (
            <textarea
              id="result-text"
              value={result.plainText}
              readOnly
              placeholder="변환 버튼을 누르면 줄바꿈 미리보기가 표시됩니다."
            />
          )}
        </div>
      </section>

      <section className="actions">
        <div className="actions-main">
          <div className="actions-buttons">
            <button type="button" onClick={handleTransform}>
              변환
            </button>
            <button type="button" onClick={handleCopy} disabled={!hasResult}>
              결과 복사
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={handleDownloadHwpx}
              disabled={!canDownloadHwpx}
            >
              .hwpx 연습장 다운로드
            </button>
            {ENABLE_LEGACY_HWP_TABLE && activeOutputMode === 'hwpTable' ? (
              <button
                type="button"
                onClick={handleDownloadXlsx}
                disabled={result.rows.length === 0}
              >
                Excel 다운로드 (임시)
              </button>
            ) : null}
          </div>
          <div className="actions-hwpx-info" aria-live="polite">
            {hasTransformResult &&
            hwpxPrepared !== null &&
            hwpxPrepared.ok &&
            hwpxPageCount > 0 ? (
              <p>예상 HWPX 페이지: {hwpxPageCount}</p>
            ) : null}
            <p>최대 {MAX_HWPX_PAGES}페이지까지 생성 가능</p>
            <p>현재 템플릿: 대각선 20×29</p>
          </div>
        </div>
        <button type="button" className="reset-action" onClick={handleReset}>
          초기화
        </button>
      </section>

      {hwpxExceedsLimit ? (
        <p className="hwpx-limit-message" role="alert">
          {HWPX_EXCEEDS_LIMIT_MESSAGE}
        </p>
      ) : null}
      {hwpxMessage ? <p className="copy-message">{hwpxMessage}</p> : null}
      {copyMessage ? <p className="copy-message">{copyMessage}</p> : null}
    </div>
  );
}

export default App;
