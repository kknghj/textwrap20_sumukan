# HWPX 연습장 다운로드 기능 설계

> **상태:** 설계 단계 (미구현)  
> **템플릿:** `assets/templates/practice_diagonal_20x29/`  
> **최종 수정:** 2026-06-16

## A. 기능 목표

### 목표

Excel을 거치지 않고, 브라우저에서 `.hwpx` 한글 연습장 파일을 직접 생성해 다운로드한다.

### 사용자 흐름

```text
원문 입력
→ 줄바꿈 변환 (기존 transformText 로직)
→ .hwpx 다운로드
→ 한글에서 바로 열어 필사
```

### 제약

| 항목 | 방침 |
| --- | --- |
| 실행 환경 | 브라우저만 (클라이언트 사이드) |
| 서버 | 사용하지 않음 |
| pyhwpx / 한글 자동화 | 사용하지 않음 |
| 템플릿 | `practice_diagonal_20x29` (20열 × 29행, 대각선 양식) |
| MVP 용량 | 한 페이지 580자 이하 |

### 검증 완료 사항 (수동)

- `Contents/section0.xml`의 `<hp:tbl>` 1개, `rowCnt="29"`, `colCnt="20"`, 총 580칸
- 빈 셀의 `<hp:run charPrIDRef="13"/>`에 `<hp:t>가</hp:t>`를 추가하면 한글에서 정상 표시
- `linesegarray`, `hasTextRef`, `textWidth`, `textHeight` 등은 수정하지 않아도 동작
- 대각선, 셀 크기, 여백, 페이지 설정은 템플릿 그대로 유지됨

---

## B. 현재 템플릿 구조

```text
assets/templates/practice_diagonal_20x29/
├── Contents/
│   ├── content.hpf      # 패키지 매니페스트 (OPF)
│   ├── header.xml       # 문서 공통 스타일·글꼴·문단 속성
│   ├── masterpage0.xml  # 머리말/꼬리말·배경 등 마스터 페이지
│   └── section0.xml     # 본문 (연습장 표 포함)
├── META-INF/
│   ├── container.xml    # OCF 루트 파일 목록
│   ├── container.rdf    # RDF 메타데이터
│   └── manifest.xml     # ODF 매니페스트 (현재 비어 있음)
├── Preview/
│   ├── PrvImage.png     # 미리보기 썸네일
│   └── PrvText.txt      # 미리보기용 평문 텍스트
├── mimetype             # `application/hwp+zip` (ZIP 첫 항목)
├── settings.xml         # 앱 설정 (커서 위치, 인쇄 옵션 등)
└── version.xml          # 한글 버전·포맷 버전 정보
```

### 파일별 역할 (추정)

| 파일 | 역할 |
| --- | --- |
| `mimetype` | OCF/HWPX 규격상 ZIP 아카이브의 **첫 번째 항목**. 값은 `application/hwp+zip`. 무압축(STORE)으로 넣는 것이 권장됨. |
| `META-INF/container.xml` | 패키지 진입점. `Contents/content.hpf`를 루트 문서로 가리킴. |
| `META-INF/container.rdf` | 문서 메타데이터(RDF). MVP에서는 수정 불필요로 추정. |
| `META-INF/manifest.xml` | ODF 매니페스트. 현재 빈 상태. MVP에서는 그대로 유지. |
| `Contents/content.hpf` | OPF 패키지 정의. `header.xml`, `section0.xml` 등 파트 목록과 spine(읽기 순서) 정의. |
| `Contents/header.xml` | 글꼴(`hh:font`), 글자 속성(`hh:charPr` id=13 등), 문단 속성, 테두리/대각선(`hh:borderFill`) 정의. **셀 서식의 근원.** |
| `Contents/masterpage0.xml` | 페이지 레이아웃·머리말/꼬리말·배경 객체. 연습장 페이지 틀. MVP에서는 수정 불필요로 추정. |
| `Contents/section0.xml` | **본문 편집 대상.** 20×29 연습장 `<hp:tbl>` 1개 포함. 텍스트 삽입은 이 파일만 수정. |
| `settings.xml` | 한글 앱 설정(커서, 인쇄). MVP에서는 수정 불필요. |
| `version.xml` | 생성 앱·포맷 버전. MVP에서는 수정 불필요. |
| `Preview/` | 파일 탐색기/한글 미리보기용. MVP 단일 페이지에서는 수정 생략 가능. 다중 페이지 후속 버전에서 검토. |

---

## C. section0.xml 분석 계획

### 대상 구조

```xml
<hp:tbl rowCnt="29" colCnt="20">
  <hp:tr>
    <hp:tc>
      <hp:subList>
        <hp:p>
          <hp:run charPrIDRef="13"/>
          <hp:linesegarray>...</hp:linesegarray>
        </hp:p>
      </hp:subList>
      <hp:cellAddr colAddr="0" rowAddr="0"/>
      <hp:cellSpan colSpan="1" rowSpan="1"/>
      <hp:cellSz width="2834" height="2834"/>
    </hp:tc>
  </hp:tr>
</hp:tbl>
```

### 템플릿 검증 결과 (저장소 기준)

| 항목 | 값 |
| --- | --- |
| `hp:tbl` 개수 | 1 |
| `rowCnt` | 29 |
| `colCnt` | 20 |
| `hp:tc` 개수 | 580 |
| DOM 순서 vs `cellAddr` | 일치 (`rowAddr * 20 + colAddr` 순) |
| 빈 셀 `hp:run` | `charPrIDRef="13"`, 자식 `hp:t` 없음 |

### 분석 항목별 방안

#### 1. `hp:tbl` 1개 찾기

```ts
const HP_NS = 'http://www.hancom.co.kr/hwpml/2011/paragraph';
const tables = doc.getElementsByTagNameNS(HP_NS, 'tbl');
```

- `tables.length === 1`을 assert.
- 0개 또는 2개 이상이면 템플릿 오류로 처리.
- `rowCnt`, `colCnt` 속성으로 기대 칸 수(`rowCnt * colCnt`)를 계산해 `hp:tc` 개수와 교차 검증.

#### 2. `rowCnt`, `colCnt` 읽기

- `parseInt(tbl.getAttribute('rowCnt'), 10)` 등으로 읽고, 상수 `PRACTICE_ROWS=29`, `PRACTICE_COLS=20`과 비교.
- 템플릿이 바뀌어도 속성 기반으로 동작하도록 하되, 현재 앱은 20×29 전용.

#### 3. 580개 `hp:tc` 순회

- `tbl.getElementsByTagNameNS(HP_NS, 'tc')`로 수집.
- 개수가 `rowCnt * colCnt`와 다르면 오류.

#### 4. 정렬: `cellAddr` vs DOM 순서

| 방식 | 장점 | 단점 |
| --- | --- | --- |
| DOM 순서 | 단순, 현재 템플릿과 일치 | 템플릿 편집 시 순서가 어긋나면 버그 |
| `cellAddr` 정렬 | 행/열 좌표 기준으로 안전 | 파싱·정렬 코드 필요 |

**권장:** `cellAddr`의 `rowAddr`, `colAddr`로 정렬한 배열을 **정본(canonical)**으로 사용하고, DOM 순서와 불일치 시 경고 또는 오류. 현재 템플릿에서는 두 방식 결과가 동일함이 확인됨.

```ts
cells.sort((a, b) => {
  const rowDiff = a.rowAddr - b.rowAddr;
  return rowDiff !== 0 ? rowDiff : a.colAddr - b.colAddr;
});
```

#### 5. 템플릿 변경에 강한 방법

1. `rowCnt`/`colCnt` 속성과 실제 `hp:tc` 수를 항상 검증.
2. 셀 좌표는 `cellAddr` 정렬을 기본으로 사용.
3. 텍스트 삽입 대상 `hp:run`은 `charPrIDRef` 값(현재 `"13"`)으로 찾되, 없으면 각 `hp:tc`의 첫 `hp:run`을 fallback.
4. 템플릿 ID·버전을 `types.ts` 상수로 관리 (`practice_diagonal_20x29`).

---

## D. 텍스트 삽입 전략

### 검증된 방식

```xml
<!-- 변경 전 -->
<hp:run charPrIDRef="13"/>

<!-- 변경 후 -->
<hp:run charPrIDRef="13">
  <hp:t>가</hp:t>
</hp:run>
```

### 결론

| 항목 | 방침 |
| --- | --- |
| 기존 `<hp:t>` 탐색 | **사용하지 않음** (빈 셀에는 원래 없음) |
| 순회 단위 | `hp:tc` 기준 |
| 텍스트 삽입 | 각 셀의 대상 `hp:run`에 `hp:t`를 **새로 생성** |
| 빈 칸 | 기존 빈 `hp:run` 유지 (`hp:t` 추가 안 함) |
| `linesegarray` | MVP에서 **수정하지 않음** |
| XML 특수문자 | `&`, `<`, `>`, `"`, `'` 이스케이프 필요 (`textContent` 설정 권장) |

### 셀당 삽입 알고리즘 (의사코드)

```ts
function fillCell(tc: Element, char: string | null, hpNs: string): void {
  if (!char) return; // 빈 칸 유지

  const run =
    findRunByCharPrId(tc, '13') ?? tc.getElementsByTagNameNS(hpNs, 'run')[0];
  if (!run) throw new Error('hp:run not found in cell');

  const t = doc.createElementNS(hpNs, 'hp:t');
  t.textContent = char; // escaping handled by DOM
  run.appendChild(t);
}
```

### 주의사항

- `XMLSerializer` 출력 시 네임스페이스 접두사(`hp:`)가 유지되는지 확인. 한글은 접두사 변경에 관대한 편이나, 가능하면 원본 직렬화 형태를 최대한 보존.
- 한 셀에 여러 `hp:run`이 있는 경우 MVP에서는 `charPrIDRef="13"`만 대상.

---

## E. 텍스트 전처리와 셀 매핑

### 기존 변환 파이프라인

현재 `src/utils/transformText.ts`의 `transformText()`는 다음을 수행한다.

1. 문단 분리 (`\n\n`)
2. 제거 옵션 적용 (`removeCharacters`)
3. 줄바꿈 (`wrapByWords` / `wrapByChars`, `maxCharsPerLine` 기준)
4. `rows: string[][]` 생성 (`linesToRows` → `lineToCells`: 공백은 `''`)

### HWPX 모드 연결

```text
transformText(source, options)
  → TransformResult { plainText, rows }
  → padRows(rows, 20)           // 한 줄 20칸 고정
  → rowsToCharArray(padded)     // 1차원 글자 배열
  → fillPracticeCells(cells)    // section0.xml 셀에 매핑
```

### 기본 규칙

| 규칙 | 값 |
| --- | --- |
| 열 수 | 20 (템플릿 `colCnt`) |
| 행 수 | 29 (템플릿 `rowCnt`) |
| 페이지 최대 글자 수 | 580 |
| 매핑 | 행 우선(row-major) |

```ts
// chars[i] → row = floor(i / 20), col = i % 20
chars[0]  → (row 0, col 0)
chars[19] → (row 0, col 19)
chars[20] → (row 1, col 0)
```

### 옵션 연결 검토

| 옵션 | HWPX 모드 적용 |
| --- | --- |
| `maxCharsPerLine` | 템플릿이 20열 고정이므로 **20으로 고정**하거나, 20이 아니면 경고 후 20으로 강제 |
| `spaceCountMode` | 줄바꿈 계산에만 영향. 셀 매핑 시 공백은 `lineToCells`에 의해 빈 칸(`''`)으로 이미 처리됨 |
| `lineBreakMode` | 줄바꿈 위치 결정에 그대로 사용 |
| `removal` | 기존과 동일하게 `transformText` 전처리에 사용 |
| `outputMode` | `'hwpx'` 또는 기존 `'hwpTable'`을 HWPX 전용 모드로 확장 검토 |

### `rowsToCharArray` 제안

```ts
/** padRows된 2차원 배열을 행 우선 1차원 배열로 평탄화한다. */
export function rowsToCharArray(rows: string[][]): (string | null)[] {
  const chars: (string | null)[] = [];
  for (const row of rows) {
    for (const cell of row) {
      chars.push(cell === '' ? null : cell);
    }
  }
  return chars;
}
```

- `null` 또는 `''` → 빈 셀 유지.
- MVP: `chars.length > 580`이면 에러 또는 UI 안내.

### 문단 경계

- 현재 `transformText`는 여러 문단의 줄을 `rows`에 **연속으로 이어 붙임** (문단 사이 빈 줄 없음).
- HWPX MVP도 동일하게 처리. 문단 사이 빈 행 삽입은 후속 검토 항목.

---

## F. 다중 페이지 전략

### MVP (1단계)

- **580자 이하만 지원.**
- 초과 시 다운로드 차단 + 안내 메시지  
  예: *「한 페이지 연습장(580자)을 초과합니다. 원문을 줄이거나, 다중 페이지 지원 전까지 Excel 방식을 이용해 주세요.」*
- `section0.xml`의 기존 `hp:tbl` 1개만 수정.

### 후속 버전 (2단계)

- `<hp:tbl>` 노드를 복제해 여러 페이지 생성.
- 표 사이에 페이지 나누기 삽입.
- 하나의 `.hwpx`에 여러 페이지 포함.

### 검토 사항

| 항목 | 초기 가설 |
| --- | --- |
| 페이지 나누기 XML | `hp:p`의 `pageBreak="1"` 또는 단락 앞 `pageBreakBefore` 속성. 템플릿에서 실제 구조를 추출해 fixture로 보관 필요. |
| `hp:tbl` id 중복 | 복제 시 `id` 등 고유 속성을 새 값으로 변경해야 할 가능성 높음. 한글 열기 테스트로 검증. |
| `cellAddr` | 페이지마다 0~19, 0~28로 **동일하게 유지**해도 될 것으로 추정 (표 단위로 독립). |
| `Preview/` 업데이트 | 파일 탐색기 썸네일용. 필수는 아니나, 장문 문서에서는 첫 페이지 미리보기만 남거나 자동 재생성 검토. |
| 한글 자동 복구 | `linesegarray`, 레이아웃 일부는 한글이 열 때 재계산할 수 있음. **서식·대각선·테두리**는 `header.xml`/`hp:tc` 속성을 직접 보존해야 함. |

### 자동 복구 vs 직접 수정 구분

| 한글이 처리할 가능성 | 직접 유지/수정 필요 |
| --- | --- |
| `linesegarray` | 셀 테두리·대각선(`borderFillIDRef`) |
| 일부 텍스트 메트릭 | `hp:cellSz`, `hp:cellAddr`, `hp:cellSpan` |
| — | `header.xml`의 `hh:borderFill` (대각선 정의) |
| — | `hp:run@charPrIDRef` (글꼴·크기) |

---

## G. 브라우저 구현 방식

### 처리 흐름

```text
1. fetch('/assets/templates/...') 또는 import.meta.glob으로 템플릿 파일 로드
2. section0.xml → DOMParser
3. 셀 채우기 → XMLSerializer
4. 전체 파일을 ZIP으로 패키징
5. Blob → URL.createObjectURL → <a download>
```

### ZIP 라이브러리 비교

| 라이브러리 | 번들 크기 | API | HWPX 적합성 |
| --- | --- | --- | --- |
| **fflate** | ~8KB (gzip) | 저수준, `zipSync`/`strToU8` | 가볍고 브라우저에 적합. `mimetype` STORE·첫 항목 직접 제어 가능 |
| **jszip** | ~30KB+ | 고수준, 익숙한 API | 구현 단순. `generateAsync({ compression: 'STORE' })`로 mimetype 처리 가능 |

**권장:** **`fflate`** — 정적 사이트에 추가할 의존성을 최소화하고, OCF `mimetype` 첫 항목·무압축 요구를 명시적으로 제어하기 쉬움.

대안: 템플릿 수정만 필요하고 ZIP 재조립이 단순하면 `jszip`도 무방. MVP PoC에서 둘 다 시험 후 선택.

### mimetype 처리

HWPX/OCF 관례 및 `hwpx-ts` 등 기존 구현 참고:

1. ZIP **첫 번째 엔트리**가 `mimetype`이어야 함.
2. `mimetype`은 **무압축(STORE)** 권장.
3. 내용: `application/hwp+zip` (개행 없음, 19바이트).

나머지 XML·PNG 등은 DEFLATE 압축 가능.

### XML 처리

| 단계 | API |
| --- | --- |
| 파싱 | `DOMParser` (`application/xml`) |
| 직렬화 | `XMLSerializer` |
| 다운로드 | `Blob` + `URL.createObjectURL` + `<a download="pilsa-practice.hwpx">` |

### 템플릿 로딩 (Vite)

- `public/`에 템플릿을 두고 `fetch('/templates/practice_diagonal_20x29/...')`  
  또는
- `import.meta.glob('/assets/templates/**/*', { as: 'raw', eager: true })`  
  빌드 시 번들/복사 설정 필요 (`vite.config.ts`에 `assetsInclude` 또는 `publicDir` 조정).

PoC에서 `public/templates/...` 방식이 단순할 가능성이 높음.

### 서드파티 HWPX 라이브러리 검토

| 라이브러리 | 평가 |
| --- | --- |
| `hwpx-ts` / `@handoc/hwpx-writer` | 범용 HWPX 생성에 유리하나, **기존 템플릿의 대각선 서식을 그대로 쓰는** 요구와는 맞지 않을 수 있음. 템플릿 패치 방식이 더 적합. |
| 자체 구현 (권장) | 템플릿 ZIP 로드 → `section0.xml`만 수정 → 재패키징. 범위가 명확하고 의존성 최소. |

---

## H. 예상 파일 구조

```text
src/
├── hwpx/
│   ├── constants.ts         # PRACTICE_ROWS, COLS, CHAR_PR_ID, HP_NS
│   ├── loadTemplate.ts      # 템플릿 파일 맵 로드
│   ├── parseSection.ts      # section0.xml 파싱, tbl/tc 추출·검증
│   ├── fillPracticeCells.ts # hp:run에 hp:t 삽입
│   ├── textToCells.ts       # rows → 1차원 글자 배열, 580자 검증
│   ├── buildHwpx.ts         # ZIP 조립, Blob 생성
│   ├── downloadHwpx.ts      # 브라우저 다운로드 트리거
│   └── types.ts
├── utils/
│   └── transformText.ts     # 기존 (공유)
└── __tests__/
    └── hwpx/
        ├── parseSection.test.ts
        ├── fillPracticeCells.test.ts
        ├── textToCells.test.ts
        └── buildHwpx.test.ts

public/templates/practice_diagonal_20x29/   # 또는 assets/를 빌드 시 복사
```

### 모듈 책임

| 모듈 | 책임 |
| --- | --- |
| `loadTemplate.ts` | 모든 템플릿 파일을 `Map<path, Uint8Array \| string>`으로 로드 |
| `parseSection.ts` | `hp:tbl` 검증, `cellAddr` 정렬된 `hp:tc[]` 반환 |
| `textToCells.ts` | `TransformResult` → 글자 배열, 길이 검증 |
| `fillPracticeCells.ts` | XML DOM 수정 |
| `buildHwpx.ts` | 수정된 `section0.xml`을 반영해 ZIP 생성 |
| `downloadHwpx.ts` | UI에서 호출하는 진입점 |

---

## I. 테스트 계획

### 단위 테스트

| 테스트 | 검증 내용 |
| --- | --- |
| `parseSection` — 580셀 탐색 | `hp:tc` 580개, `rowCnt=29`, `colCnt=20` |
| `fillPracticeCells` — 첫 셀 | `chars=['가']` → 첫 `hp:tc`의 `hp:run`에 `<hp:t>가</hp:t>` |
| `fillPracticeCells` — 첫 줄 20자 | `chars[0..19]`가 row 0의 col 0~19에 매핑 |
| `fillPracticeCells` — 21번째 글자 | `chars[20]`이 row 1, col 0 |
| `textToCells` — 580자 초과 | 에러 또는 `Result` 타입의 `err` 반환 |
| `fillPracticeCells` — XML 직렬화 후 | `hp:t` 개수 === 입력 글자 수 |
| 스냅샷 — 서식 보존 | 채우기 전후 `hp:cellSz`, `hp:cellSpan`, `borderFillIDRef` 등 변경 없음 |
| `buildHwpx` — ZIP 구조 | 첫 엔트리 `mimetype`, STORE, 내용 `application/hwp+zip` |

### 통합 / 수동 테스트

1. 생성된 `.hwpx`를 한글 2020/2022/한컴오피스에서 열기.
2. 대각선·셀 크기·여백이 템플릿과 동일한지 육안 확인.
3. 1자, 20자, 21자, 580자, 581자 케이스.
4. `&`, `<` 등 특수문자 포함 텍스트.
5. 공백 포함 모드(`spaceCountMode: 'include'`)에서 빈 칸 처리.

---

## J. 단계별 구현 로드맵

| 단계 | 내용 | 산출물 |
| --- | --- | --- |
| **1** | 문서 정리 및 현재 기능 상태 반영 | README, 본 문서 |
| **2** | 템플릿 로딩 PoC | `loadTemplate.ts`, fetch/glob 동작 확인 |
| **3** | `section0.xml` 파싱 및 580셀 탐색 | `parseSection.ts` + 테스트 |
| **4** | 단일 페이지 580자 이하 HWPX 생성 | `fillPracticeCells`, `buildHwpx`, `textToCells` |
| **5** | UI에 `.hwpx 다운로드` 버튼 추가 | `App.tsx`, 다운로드 핸들러 |
| **6** | Excel 다운로드 제거 또는 레거시 처리 | UI 정리, README 최종 반영 |
| **7** | 다중 페이지 지원 | tbl 복제, page break, 580자 초과 허용 |
| **8** | 다중 템플릿 지원 | 템플릿 선택 UI, 상수/generalization |

---

## K. 구현 전 확인 질문 목록

구현 착수 전에 아래 항목을 결정해야 한다.

### 제품 / UX

1. **출력 모드 구조:** `'hwpTable'`을 HWPX 다운로드 모드로 대체할지, `'plain' | 'hwpx' | 'hwpTable(legacy)'`처럼 세 분기로 둘지?
2. **580자 초과 시 UX:** 다운로드 버튼 비활성화만 할지, 토스트/인라인 경고 문구는?
3. **파일명:** `pilsa-practice.hwpx` 고정인지, 날짜·제목 포함 여부?
4. **`maxCharsPerLine`:** HWPX 모드에서 입력 UI를 20으로 잠글지, 자동 보정만 할지?
5. **Excel 버튼:** 단계 5에서 HWPX와 병행 노출할지, 단계 6까지 숨길지?

### 텍스트 / 매핑

6. **문단 사이 빈 줄:** 연습장에 빈 행을 넣을지, 현재처럼 연속 매핑할지?
7. **띄어쓰기 포함 모드:** 공백을 빈 칸으로 두는 현재 `lineToCells` 동작을 HWPX에서도 그대로 쓸지?
8. **제거 옵션 기본값:** HWPX 다운로드 시에도 동일한 기본 제거 옵션을 적용할지?

### 기술

9. **템플릿 배치:** `public/templates/` vs `assets/` + Vite 플러그인 — 빌드 산출물 크기·캐싱 기준?
10. **ZIP 라이브러리:** `fflate` vs `jszip` — PoC 후 최종 선택.
11. **`XMLSerializer` 출력:** 한글 호환을 위해 원본 XML 선언·인코딩 문자열을 그대로 유지할지?
12. **생성 파일 검증:** CI에서 한글 없이 할 수 있는 ZIP/XML 구조 테스트만으로 충분한지, 수동 한글 검증 체크리스트를 문서화할지?

### 법적 / 출처

13. **템플릿 라이선스:** `content.hpf` 메타에 *「상업적 이용 금지」* 명시. 배포·README에 출처(BANOLIM, 문방구 갤러리) 표기할지?
14. **저작권 표기:** 앱 About/푸터에 템플릿 크레딧을 넣을지?

### 후속 (MVP 범위 밖)

15. 다중 페이지 시 `Preview/PrvImage.png` 갱신 전략?
16. 다른 연습장 양식(격자만, 25×30 등) 확장 시 템플릿 선택 UX?

---

## L. 다음 구현 프롬프트 초안

아래 프롬프트를 다음 작업 세션에 그대로 사용할 수 있다.

---

### 작업 요청: HWPX 연습장 다운로드 MVP 구현

#### 참고 문서

- README (기능 상태·앱 방향)
- `docs/hwpx_download_plan.md` (본 설계 문서 전체)

#### 목표

브라우저에서 `assets/templates/practice_diagonal_20x29` 템플릿을 기반으로, 변환된 텍스트가 채워진 `.hwpx` 파일을 다운로드한다. **MVP는 580자(20×29) 이하 단일 페이지만** 지원한다.

#### 구현 범위

1. **의존성:** `fflate` 추가 (`pnpm add fflate`). npm 사용 금지.
2. **템플릿 로딩:** `public/templates/practice_diagonal_20x29/`에 템플릿 복사 또는 Vite로 정적 서빙. PoC로 로드 검증.
3. **`src/hwpx/` 모듈:**
   - `constants.ts` — `HP_NS`, `ROWS=29`, `COLS=20`, `MAX_CHARS=580`, `CHAR_PR_ID_REF='13'`
   - `parseSection.ts` — `hp:tbl` 1개 검증, `cellAddr` 정렬된 580 `hp:tc`
   - `textToCells.ts` — `transformText` 결과 `rows` → `padRows(rows, 20)` → 1차원 배열, 580 초과 시 에러
   - `fillPracticeCells.ts` — 빈 셀은 유지, 글자 있는 셀만 `hp:run`에 `hp:t` 생성 (`textContent` 사용)
   - `buildHwpx.ts` — `mimetype`을 ZIP 첫 항목·STORE로 넣고 나머지 파일과 함께 패키징
   - `downloadHwpx.ts` — Blob 다운로드
4. **기존 로직 연동:** `transformText()` + 기존 옵션(removal, lineBreakMode, spaceCountMode). HWPX 모드에서 `maxCharsPerLine`은 20으로 고정 또는 강제.
5. **UI (`App.tsx`):**
   - 출력 형식에 **「한글 연습장 (.hwpx) 다운로드」** 추가 (또는 `hwpTable` 모드에 HWPX 버튼 추가 — 제품 결정 전까지는 `hwpTable` 모드에 **「HWPX 다운로드」** 주 버튼, Excel은 보조/접기)
   - 580자 초과 시 버튼 비활성 + 안내 문구
   - 서버 실행은 사용자에게 맡기고, `pnpm dev`는 에이전트가 직접 실행하지 말 것
6. **테스트 (Vitest):** `docs/hwpx_download_plan.md` §I 항목 구현
7. **README:** HWPX가 「현재 지원」으로 올라가도록 상태 표 갱신 (구현 완료 시)

#### 하지 말 것 (MVP)

- 다중 페이지 (`hp:tbl` 복제, page break)
- `linesegarray` 수정
- pyhwpx, 서버 API, 한글 자동화
- Excel 다운로드 제거 (별도 단계 6에서 처리)

#### 완료 기준

- [ ] `pnpm test` 통과
- [ ] 1~580자 입력 시 `.hwpx` 다운로드 가능
- [ ] 581자 이상 시 다운로드 차단 및 안내
- [ ] 한글에서 수동 검증: 글자 표시, 대각선·셀 서식 유지
- [ ] 생성 ZIP의 첫 항목이 무압축 `mimetype`

#### 구현 전 미결정 시 기본값

| 항목 | 기본값 |
| --- | --- |
| 출력 모드 | `hwpTable` 모드에 HWPX 다운로드 버튼 추가 (Excel은 「더 보기」 또는 하단 유지) |
| 580자 초과 | 버튼 `disabled` + 결과 영역 안내 문구 |
| 파일명 | `pilsa-practice.hwpx` |
| 템플릿 경로 | `public/templates/practice_diagonal_20x29/` |
| 문단 빈 줄 | 넣지 않음 (기존 `transformText`와 동일) |

---

## 참고: 현재 코드베이스 연결점

| 파일 | 관련 기능 |
| --- | --- |
| `src/utils/transformText.ts` | `transformText`, `linesToRows`, `lineToCells` |
| `src/utils/tableUtils.ts` | `padRows` (20열 패딩 재사용) |
| `src/App.tsx` | 출력 모드, Excel 다운로드 UI |
| `assets/templates/practice_diagonal_20x29/` | HWPX 템플릿 원본 |
