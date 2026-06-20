import { useMemo, useState } from 'react';
import { HWPX_EXCEEDS_LIMIT_MESSAGE } from './hwpx/constants';
import { downloadHwpx } from './hwpx/downloadHwpx';
import {
  DEFAULT_PRACTICE_TEMPLATE_ID,
  PRACTICE_TEMPLATES,
  getPracticeTemplateMeta,
  type PracticeTemplateId,
} from './hwpx/templates';
import { prepareHwpxFromSource } from './hwpx/textToCells';
import {
  DEFAULT_REMOVAL_OPTIONS,
  DEFAULT_TRANSFORM_OPTIONS,
  transformText,
  type RemovalOptions,
  type SpaceCountMode,
  type LineBreakMode,
  type TransformResult,
} from './utils/transformText';
import './App.css';

type RemovalOptionKey = keyof RemovalOptions;

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
  const [removal, setRemoval] = useState<RemovalOptions>({
    ...DEFAULT_REMOVAL_OPTIONS,
  });
  const [copyMessage, setCopyMessage] = useState('');
  const [hwpxMessage, setHwpxMessage] = useState('');
  const [practiceTemplateId, setPracticeTemplateId] = useState<PracticeTemplateId>(
    DEFAULT_PRACTICE_TEMPLATE_ID,
  );

  const selectedTemplate = getPracticeTemplateMeta(practiceTemplateId);

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
  const hasResult = result.plainText.length > 0;

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
      templateId: practiceTemplateId,
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

  const handleReset = () => {
    setSourceText('');
    setResult(EMPTY_RESULT);
    setMaxCharsPerLine(DEFAULT_TRANSFORM_OPTIONS.maxCharsPerLine);
    setSpaceCountMode(DEFAULT_TRANSFORM_OPTIONS.spaceCountMode);
    setLineBreakMode(DEFAULT_TRANSFORM_OPTIONS.lineBreakMode);
    setRemoval({ ...DEFAULT_REMOVAL_OPTIONS });
    setCopyMessage('');
    setHwpxMessage('');
    setPracticeTemplateId(DEFAULT_PRACTICE_TEMPLATE_ID);
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
          <label htmlFor="max-chars">한 줄당 최대 글자 수 (미리보기 전용)</label>
          <input
            id="max-chars"
            type="number"
            min={10}
            value={maxCharsPerLine}
            onChange={(event) => handleMaxCharsChange(event.target.value)}
          />
          <p className="setting-hint">HWPX 연습장 다운로드는 20칸 기준으로 생성됩니다.</p>
        </div>

        <fieldset className="setting-group">
          <legend>연습장 종류</legend>
          {PRACTICE_TEMPLATES.map((template) => (
            <label key={template.id}>
              <input
                type="radio"
                name="practice-template"
                value={template.id}
                checked={practiceTemplateId === template.id}
                onChange={() => setPracticeTemplateId(template.id)}
              />
              {template.label}
            </label>
          ))}
          <p className="setting-hint">{selectedTemplate.description}</p>
        </fieldset>

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
          <textarea
            id="result-text"
            value={result.plainText}
            readOnly
            placeholder="변환 버튼을 누르면 줄바꿈 미리보기가 표시됩니다."
          />
        </div>
      </section>

      <section className="actions">
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

      <footer className="app-footer">
        <p>
          연습장 HWPX 템플릿: 디시인사이드 문방구 마이너 갤러리 BANOLIM님 무료 배포
          양식 기반 (상업적 이용 없음)
        </p>
      </footer>
    </div>
  );
}

export default App;
