import { useState } from 'react';
import {
  DEFAULT_REMOVAL_OPTIONS,
  DEFAULT_TRANSFORM_OPTIONS,
  transformText,
  type RemovalOptions,
  type SpaceCountMode,
  type LineBreakMode,
} from './utils/transformText';
import './App.css';

type RemovalOptionKey = keyof RemovalOptions;

const REMOVAL_LABELS: Record<RemovalOptionKey, string> = {
  removePeriod: '마침표 제거',
  removeComma: '쉼표 제거',
  removeExclamationQuestion: '느낌표/물음표 제거',
  removeEllipsis: '말줄임표 제거',
  removeParentheses: '괄호 제거 (소괄호·중괄호·대괄호)',
  removeQuotes: '따옴표류 제거',
  removeHanja: '한자 제거',
  removeNonKorean: '한글 외 다른 나라 문자 제거 (영어 포함)',
  removeOtherSymbols: '기타 기호 제거',
};

function App() {
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('');
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

  const handleTransform = () => {
    const converted = transformText(sourceText, {
      maxCharsPerLine,
      spaceCountMode,
      lineBreakMode,
      removal,
    });
    setResultText(converted);
    setCopyMessage('');
  };

  const handleCopy = async () => {
    if (!resultText) {
      return;
    }

    try {
      await navigator.clipboard.writeText(resultText);
      setCopyMessage('결과가 클립보드에 복사되었습니다.');
    } catch {
      setCopyMessage('복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
    }
  };

  const handleReset = () => {
    setSourceText('');
    setResultText('');
    setMaxCharsPerLine(DEFAULT_TRANSFORM_OPTIONS.maxCharsPerLine);
    setSpaceCountMode(DEFAULT_TRANSFORM_OPTIONS.spaceCountMode);
    setLineBreakMode(DEFAULT_TRANSFORM_OPTIONS.lineBreakMode);
    setRemoval({ ...DEFAULT_REMOVAL_OPTIONS });
    setCopyMessage('');
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
        <h1>필사 연습장 줄바꿈 변환기</h1>
        <p className="privacy-note">
          입력한 텍스트는 브라우저 안에서만 처리되며 외부 서버로 전송되지 않습니다.
        </p>
      </header>

      <section className="settings" aria-label="변환 설정">
        <div className="setting-group">
          <label htmlFor="max-chars">한 줄당 최대 글자 수</label>
          <input
            id="max-chars"
            type="number"
            min={10}
            value={maxCharsPerLine}
            onChange={(event) => handleMaxCharsChange(event.target.value)}
          />
        </div>

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

      <section className="editor-area" aria-label="원문과 변환 결과">
        <div className="editor-panel">
          <label htmlFor="source-text">원문 입력</label>
          <textarea
            id="source-text"
            value={sourceText}
            onChange={(event) => setSourceText(event.target.value)}
            placeholder="시, 편지, 산문 등 원문을 붙여넣으세요."
          />
        </div>

        <div className="editor-panel">
          <label htmlFor="result-text">변환 결과</label>
          <textarea
            id="result-text"
            value={resultText}
            readOnly
            placeholder="변환 버튼을 누르면 결과가 표시됩니다."
          />
        </div>
      </section>

      <section className="actions">
        <button type="button" onClick={handleTransform}>
          변환
        </button>
        <button type="button" onClick={handleCopy} disabled={!resultText}>
          결과 복사
        </button>
        <button type="button" onClick={handleReset}>
          초기화
        </button>
      </section>

      {copyMessage ? <p className="copy-message">{copyMessage}</p> : null}
    </div>
  );
}

export default App;
