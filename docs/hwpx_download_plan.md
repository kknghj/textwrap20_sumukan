# HWPX 연습장 다운로드 기능 설계

> **상태:** MVP 구현 완료 (단일 페이지 580칸) · **다중 페이지 PoC 구현** (fixture 기반 단일 표 행 확장) · 한글 수동 검증 대기  
> **템플릿:** `assets/templates/practice_diagonal_20x29/` (MVP), 후속: 방안선·십자선  
> **최종 수정:** 2026-06-16

## 제품 결정 사항 (확정)

| 항목 | 결정 |
| --- | --- |
| **출력 모드 최종 방향** | **HWPX 전용**. Excel 다운로드는 최종 제거 예정. MVP 안정화 전까지만 레거시로 유지 가능. |
| **MVP 용량** | 단일 페이지 **20×29 = 580칸** 기본. **581칸 이상**은 580칸 단위 다중 페이지 PoC (최대 20페이지). |
| **HWPX 모드 글자 수** | **20자/줄 고정**. 사용자 설정과 무관하게 20×29 템플릿 기준으로 생성. |
| **다중 페이지** | **PoC 구현 완료** — fixture 기반 단일 `hp:tbl` 행 확장 (`rowCnt = 29 × 페이지수`). 한글 수동 검증 필요. |
| **다중 템플릿** | MVP 범위 밖. 후속 버전(로드맵 8단계)에서 **20×29 고정 + 가이드 선 3종**(대각선/방안선/십자선) 지원. 16·19·20칸 방향은 **폐기**. |
| **템플릿 출처 표기** | 정식 릴리즈 전 README/앱 화면에 반영 (TODO). |

### 580칸 초과 시 권장 안내 문구

```text
현재 HWPX 다운로드 MVP는 한 페이지(580칸)까지만 지원합니다.
변환 결과가 580칸을 초과했습니다.
다중 페이지 지원은 다음 버전에서 추가할 예정입니다.
```

Excel 방식 안내 등 대체 수단 언급은 **사용하지 않음**.

---

## A. 기능 목표

### 목표

Excel을 거치지 않고, 브라우저에서 `.hwpx` 한글 연습장 파일을 직접 생성해 다운로드한다.
**최종 제품 방향은 HWPX 전용**이며, Excel 경유 방식은 제거 대상이다.

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
| MVP 용량 | 한 페이지 580칸(20×29) 이하 |
| 출력 모드 | 최종적으로 HWPX 전용 (Excel 레거시는 안정화 전까지만) |

### 검증 완료 사항 (수동)

- `Contents/section0.xml`의 `<hp:tbl>` 1개, `rowCnt="29"`, `colCnt="20"`, 총 580칸
- 빈 셀의 `<hp:run charPrIDRef="13"/>`에 `<hp:t>가</hp:t>`를 추가하면 한글에서 정상 표시
- `linesegarray`, `hasTextRef`, `textWidth`, `textHeight` 등은 수정하지 않아도 동작
- 대각선, 셀 크기, 여백, 페이지 설정은 템플릿 그대로 유지됨

---

## B. 현재 템플릿 구조

```text
assets/templates/
├── practice_diagonal_20x29/   # 대각선 (MVP, public/templates/에도 배포)
├── practice_grid_20x29/       # 방안선
└── practice_cross_20x29/      # 십자선

각 템플릿 공통 내부 구조 (practice_diagonal_20x29 예시):
practice_diagonal_20x29/
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

## 템플릿 출처 및 사용 범위

현재 사용하는 연습장 HWPX 템플릿은 **디시인사이드 문방구 마이너 갤러리**의 **BANOLIM**님이 무료 배포한 필사 연습장 양식을 기반으로 합니다.

| 항목 | 내용 |
| --- | --- |
| 출처 | 디시인사이드 문방구 마이너 갤러리 — BANOLIM님 무료 배포 양식 |
| 상업적 이용 | **하지 않음** |
| 배포 범위 | 무료 배포 가능 범위 내에서 사용 |
| 원본 메타 | `Contents/content.hpf`에 상업적 이용 금지 명시 |
| 표기 TODO | 정식 릴리즈 전 README 하단 또는 앱 화면에 출처 표기 문구 추가 |

구현 시 앱 UI·README에 아래와 유사한 문구를 남길 예정이다.

```text
연습장 양식: 디시인사이드 문방구 마이너 갤러리 BANOLIM님 무료 배포 필사 연습장 기반
(상업적 이용 없음, 무료 배포 범위 내 사용)
```

---

## C. section0.xml 분석 계획

### 대상 구조 (실제 템플릿, 2026-06-16)

표는 `hs:sec` 직속 `hp:p` 안의 `hp:run` 자식으로 존재한다.

```xml
<hs:sec>
  <hp:p id="2757524817" pageBreak="0">
    <hp:run charPrIDRef="6"><hp:secPr>...</hp:secPr><hp:ctrl>...</hp:ctrl></hp:run>
    <hp:run charPrIDRef="6">
      <hp:ctrl>...</hp:ctrl>
      <hp:tbl id="1881213987" rowCnt="29" colCnt="20" pageBreak="TABLE">
        <hp:tr>
          <hp:tc>
            <hp:subList>
              <hp:p id="2147483648">
                <hp:run charPrIDRef="13"/>
                <hp:linesegarray>...</hp:linesegarray>
              </hp:p>
            </hp:subList>
            <hp:cellAddr colAddr="0" rowAddr="0"/>
            ...
          </hp:tc>
        </hp:tr>
      </hp:tbl>
      <hp:t/>
    </hp:run>
    <hp:linesegarray>...</hp:linesegarray>
  </hp:p>
</hs:sec>
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
4. 템플릿 ID·버전을 `types.ts` 상수로 관리 (`TemplateId`: `practice_diagonal_20x29` | `practice_grid_20x29` | `practice_cross_20x29`).

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

HWPX 다운로드 시 `transformText` 호출 옵션에서 **`maxCharsPerLine`은 항상 20**으로 고정한다.
사용자가 UI에서 다른 값을 설정했더라도 HWPX 생성 파이프라인은 20×29 템플릿 기준만 사용한다.

```text
transformText(source, { ...options, maxCharsPerLine: 20 })
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

### 옵션 연결 (확정)

| 옵션 | HWPX 모드 적용 |
| --- | --- |
| `maxCharsPerLine` | **20으로 고정** (MVP). UI에서 HWPX 모드 선택 시 입력 잠금 또는 「20칸 템플릿 기준」 안내 표시 |
| `spaceCountMode` | 줄바꿈 계산에만 영향. 셀 매핑 시 공백은 `lineToCells`에 의해 빈 칸(`''`)으로 이미 처리됨 |
| `lineBreakMode` | 줄바꿈 위치 결정에 그대로 사용 |
| `removal` | 기존과 동일하게 `transformText` 전처리에 사용 |
| `outputMode` | 최종 **`'plain' \| 'hwpx'`** (HWPX 전용). MVP 구현 중 `'hwpTable'`+Excel은 레거시로 잠시 병행 가능 |

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
- MVP: 채워야 할 칸 수(행×열 합)가 580을 초과하면 다운로드 차단 + §제품 결정 사항의 안내 문구 표시.

### 문단 경계

- 현재 `transformText`는 여러 문단의 줄을 `rows`에 **연속으로 이어 붙임** (문단 사이 빈 줄 없음).
- HWPX MVP도 동일하게 처리. 문단 사이 빈 행 삽입은 후속 검토 항목.

---

## F. 다중 페이지 전략

### MVP (1단계) — 구현 완료

- **580칸(20×29) 이하만 지원.**
- 초과 시 다운로드 차단 + 안내 메시지:

```text
현재 HWPX 다운로드 MVP는 한 페이지(580칸)까지만 지원합니다.
변환 결과가 580칸을 초과했습니다.
다중 페이지 지원은 다음 버전에서 추가할 예정입니다.
```

- `section0.xml`의 기존 `hp:tbl` 1개만 수정 (`parseSection`이 `hp:tbl` 1개를 assert).

### 후속 버전 (2단계) — PoC 선행 필요

- `<hp:tbl>`이 들어 있는 **표 문단(`hp:p`)** 을 페이지 수만큼 복제.
- 표 사이에 페이지 나누기 삽입.
- 하나의 `.hwpx`에 여러 연습장 페이지 포함.

### 구현 판단 (2026-06-16)

**B안: 바로 구현하지 않음.** 페이지 나누기 XML 구조가 불확실하고, 수동으로 만든 2페이지 HWPX 샘플이 필요함. §M·§N 참고.

### section0.xml 실제 구조 (저장소 분석, 2026-06-16)

단일 페이지 템플릿에서 표는 `hs:sec` 직속 `hp:p` 안에 중첩되어 있다.

```text
hs:sec
└── hp:p (id=2757524817)          ← 표를 담는 문단
    ├── hp:run (charPrIDRef=6)
    │   ├── hp:secPr              ← 페이지 설정
    │   └── hp:ctrl
    ├── hp:run
    │   ├── hp:ctrl
    │   ├── hp:tbl (id=1881213987, rowCnt=29, colCnt=20, pageBreak=TABLE)
    │   │   └── hp:tr × 29 → hp:tc × 20 = 580칸
    │   └── hp:t (빈 텍스트)
    └── hp:linesegarray
```

**템플릿별 `hs:sec` 직속 `hp:p` 개수 차이:**

| 템플릿 | sec 직속 `hp:p` 수 | 비고 |
| --- | --- | --- |
| `practice_diagonal_20x29` | 46 | 표 문단 1개 + 빈 문단 45개 (`id=0`, `linesegarray` 포함) |
| `practice_grid_20x29` | 46 | 대각선과 동일 패턴 |
| `practice_cross_20x29` | 1 | 표 문단만 존재 (구조가 더 단순) |

`hp:tbl`만 복제하는 것이 아니라 **표를 포함한 `hp:p` 전체**를 복제 대상으로 삼아야 한다. 대각선/방안선 템플릿의 45개 빈 문단 역할은 아직 불명확하며, 다중 페이지 시 레이아웃에 영향을 줄 수 있다.

### 검토 사항

| 항목 | 분석 결과 |
| --- | --- |
| 페이지 나누기 XML | 현재 템플릿에 `pageBreak="1"` 사례 없음. `hp:p@pageBreak="0"`, `hp:tbl@pageBreak="TABLE"`만 존재. **한글에서 수동 생성한 2페이지 샘플 fixture 필요.** |
| `hp:tbl` id 중복 | 복제 시 `id`를 페이지마다 고유값으로 바꿔야 할 가능성 **높음** (현재 `1881213987`). |
| `hp:p@id` | 셀 내 `hp:p`는 `2147483648`, sec 직속 빈 문단은 `0` 사용. 표 문단만 `2757524817`. 복제 시 표 문단 id 갱신 권장, 빈 문단은 `0` 유지 가능성. |
| `cellAddr` | 페이지마다 0~19, 0~28 **동일 유지 가능** (표 단위 독립). |
| `linesegarray` | MVP와 동일하게 **수정하지 않아도 됨** (한글이 열 때 재계산). |
| `Preview/` | MVP처럼 **생략 가능**. 다중 페이지 후속에서 첫 페이지만 유지 검토. |
| 한글 자동 복구 | `linesegarray`, 일부 텍스트 메트릭은 한글이 열 때 재계산. **서식·가이드 선**은 `header.xml`/`hp:tc@borderFillIDRef` 보존 필요. |

### 자동 복구 vs 직접 수정 구분

| 한글이 처리할 가능성 | 직접 유지/수정 필요 |
| --- | --- |
| `linesegarray` | 셀 테두리·가이드 선(`borderFillIDRef`) |
| 일부 텍스트 메트릭 | `hp:cellSz`, `hp:cellAddr`, `hp:cellSpan` |
| — | `header.xml`의 `hh:borderFill` (대각선·방안선·십자선 정의) |
| — | `hp:run@charPrIDRef` (글꼴·크기) |

---

## F-2. 다중 템플릿 타입 설계

### TemplateId

```ts
export type TemplateId =
  | 'practice_diagonal_20x29'
  | 'practice_grid_20x29'
  | 'practice_cross_20x29';
```

| TemplateId | 표시 이름 | 설명 |
| --- | --- | --- |
| `practice_diagonal_20x29` | 대각선 | 대각선 가이드 필사 연습장 (MVP 기본) |
| `practice_grid_20x29` | 방안선 | 정사각 격자/방안선 필사 연습장 |
| `practice_cross_20x29` | 십자선 | 칸 중앙 십자선 가이드 필사 연습장 |

### 공통 규격

| 항목 | 값 |
| --- | --- |
| 열 수 (`colCnt`) | 20 |
| 행 수 (`rowCnt`) | 29 |
| 페이지 최대 칸 수 | 580 |
| `maxCharsPerLine` | 20 고정 |
| 차이점 | `header.xml`의 `borderFill` / 셀 `borderFillIDRef` (가이드 선 종류) |

### 템플릿 검증 (저장소 기준, 2026-06-16)

세 템플릿 모두 아래 공통 검증을 통과한다.

| 항목 | 값 |
| --- | --- |
| `hp:tbl` 개수 | 1 |
| `rowCnt` | 29 |
| `colCnt` | 20 |
| `hp:tc` 개수 | 580 |

`parseSection`의 기존 검증 로직(`rowCnt`, `colCnt`, `hp:tc` 수)을 **모든 템플릿에 공통 적용**하면 된다.

### 템플릿 로딩 설계

```text
public/templates/
├── practice_diagonal_20x29/   ← MVP 배포됨
├── practice_grid_20x29/         ← 후속 배포 예정 (assets에 원본 있음)
└── practice_cross_20x29/        ← 후속 배포 예정 (assets에 원본 있음)
```

- `loadTemplate(templateId)` — `TEMPLATE_BASE_PATH`를 TemplateId별로 분기
- 로드 후 `parseSection`으로 `hp:tbl` 1개, `rowCnt=29`, `colCnt=20`, `hp:tc=580` 검증 (공통)
- MVP: `TEMPLATE_ID = 'practice_diagonal_20x29'` 고정

### 향후 UI 방향

- 템플릿 선택: 드롭다운 또는 라디오 버튼
- **기본값:** `practice_diagonal_20x29` (대각선)
- `public/templates/`에 파일이 없는 템플릿은 UI에 노출하지 않거나 **disabled** 처리
- HWPX 모드에서 `maxCharsPerLine`은 계속 **20 고정** (칸 수는 모든 템플릿 동일)

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
| `textToCells` — 580칸 초과 | 에러 또는 `Result` 타입의 `err` 반환 |
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
| **5** | UI에 HWPX 전용 출력 모드 및 `.hwpx 다운로드` 버튼 추가 | `App.tsx`, 20칸 고정·580칸 검증·안내 문구 |
| **6** | Excel 다운로드 제거 (HWPX 안정화 후) | UI·README에서 레거시 제거, HWPX 전용 완료 |
| **7** | 다중 페이지 지원 | tbl 복제, page break, 580칸 초과 허용 (PoC 선행 필요 — §F·§M 참고) |
| **8** | 다중 템플릿 지원 | **대각선/방안선/십자선** 20×29 템플릿 선택 UI, 기본값 대각선 |

#### 8단계 다중 템플릿 (20×29 고정, 가이드 선 종류별)

| 템플릿 ID | 표시 이름 | 설명 | 에셋 위치 |
| --- | --- | --- | --- |
| `practice_diagonal_20x29` | 대각선 | 대각선 가이드 필사 연습장 | `assets/templates/`, `public/templates/` (MVP) |
| `practice_grid_20x29` | 방안선 | 정사각 격자/방안선 필사 연습장 | `assets/templates/` |
| `practice_cross_20x29` | 십자선 | 칸 중앙 십자선 가이드 필사 연습장 | `assets/templates/` |

- 모든 템플릿: **20열 × 29행 = 580칸**, `maxCharsPerLine` **20 고정**
- 칸 수 차이가 아니라 **선 종류(`header.xml`의 `borderFill` 등)** 차이로 구분
- MVP에서는 대각선만 사용. 방안선·십자선은 `public/templates/` 미배포 시 UI에 노출하지 않거나 disabled

---

## K. 구현 전 확인 질문 목록

### 확정됨 ✅

| # | 항목 | 결정 |
| --- | --- | --- |
| 1 | 출력 모드 | **최종 HWPX 전용**. Excel은 안정화 전 레거시, 이후 제거 |
| 2 | 580칸 초과 UX | 다운로드 차단 + §제품 결정 사항 안내 문구 (Excel 안내 없음) |
| 4 | `maxCharsPerLine` | HWPX 모드 **20 고정**, UI 잠금 또는 「20칸 템플릿 기준」 안내 |
| 13–14 | 템플릿 출처 | BANOLIM / 문방구 갤러리. 상업적 이용 없음. 정식 릴리즈 전 표기 TODO |

### 미결정 (구현 시 기본값 적용 가능)

| # | 항목 | MVP 기본값 |
| --- | --- | --- |
| 3 | 파일명 | `pilsa-practice.hwpx` |
| 5 | Excel 버튼 | MVP 중 HWPX와 병행 가능, 안정화 후 제거 (단계 6) |
| 6 | 문단 사이 빈 줄 | 넣지 않음 (`transformText`와 동일) |
| 7 | 띄어쓰기 포함 모드 | `lineToCells` 동작 그대로 (공백 → 빈 칸) |
| 8 | 제거 옵션 | 기존 기본값 그대로 |
| 9 | 템플릿 배치 | `public/templates/practice_diagonal_20x29/` |
| 10 | ZIP 라이브러리 | `fflate` 권장, PoC 후 확정 |
| 11 | `XMLSerializer` | 원본 XML 선언·인코딩 유지 목표 |
| 12 | CI 검증 | ZIP/XML 구조 테스트 + 수동 한글 검증 체크리스트 |
| 15 | Preview 갱신 | 다중 페이지 후속에서 검토 |
| 16 | 다중 템플릿 UX | 8단계에서 대각선/방안선/십자선 20×29 선택, 기본값 대각선 |

---

## L. 다음 구현 프롬프트 초안

아래 프롬프트를 다음 작업 세션에 그대로 사용할 수 있다.

---

### 작업 요청: HWPX 연습장 다운로드 MVP 구현

#### 참고 문서

- README (기능 상태·앱 방향·템플릿 출처)
- `docs/hwpx_download_plan.md` (본 설계 문서 — **§제품 결정 사항** 우선 참고)

#### 목표

브라우저에서 **20×29 대각선 템플릿** (`practice_diagonal_20x29`)을 기반으로, 변환된 텍스트가 채워진 `.hwpx` 파일을 다운로드한다.

- **MVP:** 단일 페이지 **580칸** 이하만 지원
- **최종 방향:** HWPX 전용 (Excel은 이번 MVP 이후 안정화되면 제거 예정)

#### 구현 범위

1. **의존성:** `fflate` 추가 (`pnpm add fflate`). npm 사용 금지.
2. **템플릿 로딩:** `public/templates/practice_diagonal_20x29/`에 템플릿 복사 또는 Vite로 정적 서빙. PoC로 로드 검증.
3. **`src/hwpx/` 모듈:**
   - `constants.ts` — `HP_NS`, `ROWS=29`, `COLS=20`, `MAX_CELLS=580`, `CHAR_PR_ID_REF='13'`
   - `parseSection.ts` — `hp:tbl` 1개 검증, `cellAddr` 정렬된 580 `hp:tc`
   - `textToCells.ts` — `transformText` 결과 `rows` → `padRows(rows, 20)` → 1차원 배열, **580칸 초과 시 에러**
   - `fillPracticeCells.ts` — 빈 셀은 유지, 글자 있는 셀만 `hp:run`에 `hp:t` 생성 (`textContent` 사용)
   - `buildHwpx.ts` — `mimetype`을 ZIP 첫 항목·STORE로 넣고 나머지 파일과 함께 패키징
   - `downloadHwpx.ts` — Blob 다운로드
4. **기존 로직 연동:**
   - `transformText()` 호출 시 **`maxCharsPerLine: 20` 고정** (사용자 설정 무시)
   - `removal`, `lineBreakMode`, `spaceCountMode`는 기존 옵션 그대로 사용
5. **UI (`App.tsx`):**
   - 출력 형식에 **HWPX 다운로드 모드** 추가 (최종 `'plain' | 'hwpx'` 방향)
   - HWPX 모드 선택 시 `maxCharsPerLine` 입력 **20으로 고정**(disabled) 또는 다운로드 버튼 옆 **「20칸 템플릿 기준」** 안내
   - **580칸 초과** 시 HWPX 다운로드 버튼 비활성 + 아래 안내 문구 표시:

     ```text
     현재 HWPX 다운로드 MVP는 한 페이지(580칸)까지만 지원합니다.
     변환 결과가 580칸을 초과했습니다.
     다중 페이지 지원은 다음 버전에서 추가할 예정입니다.
     ```

   - Excel 다운로드: MVP 안정화 전까지 **레거시로 유지 가능** (별도 모드 또는 접힌 영역). HWPX가 주 기능.
   - 서버 실행은 사용자에게 맡기고, `pnpm dev`는 에이전트가 직접 실행하지 말 것
6. **테스트 (Vitest):** `docs/hwpx_download_plan.md` §I 항목 구현
7. **README:** HWPX가 「현재 지원」으로 올라가도록 상태 표 갱신 (구현 완료 시)
8. **템플릿 출처 표기:** 정식 릴리즈 전 TODO — README/앱 하단에 BANOLIM·문방구 갤러리 출처 문구 (이번 MVP에서는 TODO 주석 또는 이슈로 남겨도 됨)

#### 하지 말 것 (MVP)

- **다중 페이지** (`hp:tbl` 복제, page break) — 후속 로드맵 7단계
- **다중 템플릿** (대각선/방안선/십자선 선택) — 후속 로드맵 8단계에만 기록
- `linesegarray` 수정
- pyhwpx, 서버 API, 한글 자동화
- Excel 다운로드 **제거** (HWPX 안정화 후 단계 6에서 처리. MVP에서는 레거시 유지 가능)

#### 완료 기준

- [ ] `pnpm test` 통과
- [ ] 1~580칸 입력 시 `.hwpx` 다운로드 가능 (20×29 템플릿)
- [ ] 581칸 이상 시 다운로드 차단 및 §안내 문구 표시
- [ ] HWPX 모드에서 `maxCharsPerLine`이 20으로 고정됨
- [ ] 한글에서 수동 검증: 글자 표시, 대각선·셀 서식 유지
- [ ] 생성 ZIP의 첫 항목이 무압축 `mimetype`

#### 확정된 기본값

| 항목 | 값 |
| --- | --- |
| 출력 모드 최종 방향 | HWPX 전용 (Excel 레거시는 MVP 중 선택적 유지) |
| 템플릿 | `practice_diagonal_20x29` (20×29) only |
| `maxCharsPerLine` | 20 고정 |
| 580칸 초과 | 버튼 `disabled` + §안내 문구 (Excel 안내 없음) |
| 파일명 | `pilsa-practice.hwpx` |
| 템플릿 경로 | `public/templates/practice_diagonal_20x29/` |
| 문단 빈 줄 | 넣지 않음 |
| 템플릿 출처 표기 | 정식 릴리즈 전 TODO |

---

## M. 다중 페이지 구현 가능성 검증 (2026-06-16)

MVP 코드(`src/hwpx/`)와 `section0.xml` 템플릿을 분석한 결과이다.

### 검증 질문 답변

| # | 질문 | 답변 |
| --- | --- | --- |
| 1 | `section0.xml`에서 기존 `<hp:tbl>` 노드를 복제해 같은 문서 안에 여러 개 배치할 수 있는가? | **부분 가능.** 표는 `hp:p > hp:run > hp:tbl` 구조이므로 `hp:tbl`만이 아니라 **표를 포함한 `hp:p`(및 내부 `hp:run`)** 를 복제해야 한다. `hs:sec`에 여러 표 문단을 형제로 추가하는 방식이 자연스럽다. 다만 대각선/방안선 템플릿의 45개 빈 `hp:p`와의 관계, 복제 시 `secPr` 중복 여부는 **미검증**. |
| 2 | 복제한 `hp:tbl` 사이에 어떤 방식으로 페이지 나누기를 넣어야 하는가? | **불확실.** 후보: (a) 페이지 사이에 `hp:p pageBreak="1"` 빈 문단 삽입, (b) 두 번째 표 문단의 `hp:p@pageBreak` 변경, (c) `hp:ctrl` 내 페이지 나누기 요소. 현재 템플릿에는 `pageBreak="1"` 사례가 없어 **한글에서 수동 생성한 2페이지 샘플**로 구조를 확정해야 한다. |
| 3 | 한글에서 만든 페이지 나누기 XML 구조가 필요한가? | **예, 필요.** 자동 추측만으로 구현하면 한글에서 열리지 않거나 표가 같은 페이지에 겹칠 위험이 있다. 한글 2020/2022에서 연습장 2페이지 문서를 저장해 `section0.xml` fixture로 보관할 것. |
| 4 | `hp:tbl@id`는 복제 시 고유값으로 바꿔야 하는가? | **권장(가능성 높음).** 현재 `id="1881213987"`. 복제 시 페이지마다 다른 id 할당이 안전하다. 중복 id는 한글 내부 참조 오류 가능성. |
| 5 | `hp:p@id`도 고유값으로 바꿔야 하는가? | **표 문단은 권장.** 표를 담는 `hp:p`(`2757524817`)는 복제 시 갱신 권장. 셀 내 `hp:p`(`2147483648`)·빈 문단(`0`)은 템플릿 관례상 고정값일 수 있어, **표 문단 수준만** 우선 갱신하고 셀 내부는 복제 그대로 유지하는 전략이 합리적. |
| 6 | `hp:cellAddr`는 페이지별 표 안에서 0~19, 0~28을 그대로 유지해도 되는가? | **예.** 각 `hp:tbl`이 독립 표이므로 페이지마다 동일 좌표 체계를 유지해도 된다. MVP `parseSection` 검증 로직도 페이지 단위로 재사용 가능. |
| 7 | `linesegarray`는 여전히 수정하지 않아도 되는가? | **예 (MVP 경험 기준).** 단일 페이지에서 수정 없이 동작 확인됨. 다중 페이지에서도 표 문단·셀 내부 `linesegarray`는 한글이 열 때 재계산할 가능성이 높다. 단, **페이지 나누기용 새 `hp:p`의 `linesegarray`** 필요 여부는 2페이지 샘플로 확인. |
| 8 | `Preview/PrvText.txt`는 여러 페이지 텍스트를 반영해야 하는가? | **아니오, 생략 가능.** MVP와 동일하게 수정하지 않아도 한글 열기에 필수는 아님. 파일 탐색기 미리보기만 영향. |
| 9 | 다중 페이지 생성 후 한글에서 열릴 가능성이 높은 최소 구현은 무엇인가? | (1) 원문 → 580칸 단위 분할, (2) 표 문단 `hp:p` deep clone, (3) 페이지마다 해당 580칸 `fillPracticeCells`, (4) **검증된 page break XML** 삽입, (5) `hp:tbl@id`·표 `hp:p@id` 갱신, (6) 기존 ZIP 재패키징. **(4)가 없으면 최소 구현 완성 불가.** |
| 10 | 자동화 테스트 vs 수동 검증 | **자동:** 칸 분할 수학(581→2페이지 등), 생성 XML의 `hp:tbl` 개수, `hp:tbl@id` 중복 없음, 페이지별 첫/마지막 칸 매핑, ZIP 구조. **수동(필수):** 한글에서 파일 열기, 페이지 경계·가이드 선·글자 위치 육안 확인, 2페이지 이상 레이아웃. |

### 구현 리스크 목록

1. **페이지 나누기 XML 미확정** — 가장 큰 블로커.
2. **템플릿별 `section0.xml` 구조 차이** — 대각선/방안선(46문단) vs 십자선(1문단). 다중 페이지 PoC 템플릿을 하나로 고정해야 함.
3. **45개 빈 `hp:p` 역할 불명** — 복제·삭제 시 레이아웃 깨질 수 있음.
4. **`parseSection`이 `hp:tbl` 1개만 허용** — 다중 페이지용 파서/빌더 분리 필요.
5. **`prepareHwpxChars` 580칸 상한** — 분할 로직·상한(예: 20페이지) 설계 필요.
6. **파일 크기** — 페이지당 ~465KB `section0.xml` 수준. 20페이지면 XML만 ~9MB+. 브라우저 메모리·다운로드 크기 안내 필요.

### 필요한 수동 실험 목록

1. 한글에서 `practice_diagonal_20x29` 템플릿을 열고 **페이지 나누기 삽입 → 연습장 표 복사/붙여넣기**로 2페이지 문서를 만든 뒤 `.hwpx` 저장.
2. 저장된 `Contents/section0.xml`에서 페이지 나누기에 해당하는 XML 조각을 추출해 `src/__tests__/hwpx/fixtures/section0_two_pages.xml` 등으로 보관.
3. 한글 2020·2022(가능하면 한컴오피스)에서 PoC 생성 파일 열기 테스트.
4. 표 문단만 복제(id 미갱신) vs id 갱신 — 어느 쪽이 안전한지 비교.
5. `practice_cross_20x29`(sec `hp:p` 1개)를 기준으로 다중 페이지 PoC할지, 대각선(46문단)을 기준으로 할지 결정.

---

## N. 다중 페이지 PoC 설계

### 알고리즘 초안

```text
1. 원문을 20칸 기준으로 transformText (maxCharsPerLine: 20 고정)
2. padRows 후 1차원 글자 배열로 평탄화
3. 580칸 단위로 chunks 분할 (마지막 청크는 580 이하, 부족분은 null 패딩)
4. section0.xml 파싱 → 표를 포함한 hp:p 템플릿 노드 확보
5. 페이지 수만큼 hp:p deep clone
6. 각 clone의 hp:tbl에 해당 페이지 580칸 fillPracticeCells
7. clone 사이(또는 앞)에 page break용 hp:p 삽입 (구조는 §M 수동 실험 결과 반영)
8. hp:tbl@id, 표 hp:p@id 갱신 (순차 증가 또는 랜덤 유니크)
9. XMLSerializer → buildHwpx → Blob 다운로드
```

### 제안 모듈

| 모듈 | 책임 |
| --- | --- |
| `splitCharsIntoPages.ts` | 580칸 단위 분할, 페이지 수·상한 검증 |
| `cloneTableParagraph.ts` | 표 `hp:p` deep clone, id 갱신 |
| `insertPageBreaks.ts` | 검증된 page break XML 삽입 |
| `buildMultiPageSection.ts` | 위 모듈 조합, `section0.xml` 문자열 반환 |
| `parseSection.ts` (확장) | `parseAllTables` 또는 다중 tbl 허용 모드 |

### 다중 페이지 제한 (MVP2 제안)

| 항목 | 제안값 |
| --- | --- |
| 최대 페이지 수 | **20페이지** (11,600칸) |
| 초과 시 UX | 다운로드 차단 + 「최대 20페이지(11,600칸)까지 지원」 안내 |
| 성능 안내 | 10페이지 이상 시 「파일 크기가 커질 수 있습니다」 경고 (선택) |

보수적 대안: MVP2는 **최대 10페이지(5,800칸)** 로 시작 후 확장.

### 다중 페이지 테스트 계획

| 케이스 | 기대 결과 |
| --- | --- |
| 580칸 | 1페이지, `hp:tbl` 1개 |
| 581칸 | 2페이지, `hp:tbl` 2개 |
| 1160칸 | 2페이지 |
| 1161칸 | 3페이지 |
| 페이지 1 첫 칸 | `chars[0]` |
| 페이지 1 마지막 칸 | `chars[579]` |
| 페이지 2 첫 칸 | `chars[580]` |
| `hp:tbl@id` | 페이지 수만큼 고유값, 중복 없음 |

#### 한글 수동 열기 테스트 절차

1. `pnpm test` 통과 확인.
2. 앱에서 581자·1161자 샘플 텍스트로 `.hwpx` 다운로드.
3. 한글에서 파일 열기 — 오류 대화상자 없이 열리는지 확인.
4. 페이지 1·2(·3) 각각 20×29 표가 **별도 페이지**에 있는지 확인.
5. 각 페이지 첫 칸·마지막 칸 글자가 변환 결과와 일치하는지 확인.
6. 대각선(또는 선택 템플릿) 가이드 선이 페이지마다 유지되는지 확인.

---

## O. 구현 여부 결론

### 다중 페이지 PoC 구현 (2026-06-16)

`fixtures/hwpx_2page_diagonal_manual` 수동 fixture 분석 결과, 한글은 **별도 `hp:tbl` 복제 + page break XML**이 아니라 **단일 `hp:tbl`의 `rowCnt`를 29×페이지수로 확장**하는 방식을 사용한다.

| 분석 항목 | 1페이지 템플릿 | 2페이지 수동 fixture |
| --- | --- | --- |
| `hp:tbl` 개수 | 1 | **1** (2개 아님) |
| `rowCnt` | 29 | **58** (29×2) |
| `colCnt` | 20 | 20 |
| `hp:tc` 개수 | 580 | **1160** |
| `pageBreak="1"` | 0 | **0** |
| page break XML | 없음 | **없음** — `hp:tbl@pageBreak="TABLE"`만 유지 |
| 표 문단 `hp:p` 반복 | 1개 | **1개** (복제 없음) |
| `hp:tbl@id` | 1881213987 | **동일** |
| 표 `hp:p@id` | 2757524817 | **동일** |
| 셀 `hp:p@id` | 2147483648 / 0 | **재사용** |
| `cellAddr` | 0~28, 0~19 | 0~**57**, 0~19 (연속 증가) |
| `settings.xml` | — | CaretPosition만 차이 (필수 아님) |
| `PrvText.txt` | — | 변경 없음 |

**구현 방향:** `extendPracticeTableRows`로 29행 블록을 복제·append, `rowCnt` 갱신, `cellAddr.rowAddr` 오프셋 적용. page break XML은 fixture에 없으므로 삽입하지 않음.

### B안 (이전): 바로 구현하지 않음 — **해소됨**

| 조건 | 해당 여부 |
| --- | --- |
| 페이지 나누기 XML 구조 불확실 | **해당** — 템플릿에 사례 없음 |
| `hp:tbl` 복제 후 한글 열림 확신 낮음 | **해당** — 2페이지 수동 샘플 미보유 |
| 기존 로직 크게 깨뜨릴 위험 | **해당** — `parseSection` 단일 tbl 전제, `textToCells` 580 상한 |
| 수동 2페이지 HWPX 샘플 필요 | **해당** |

**이번 단계 산출물:** README·설계 문서 수정, 다중 페이지 리스크·수동 실험 목록, PoC 설계(§N), 다음 프롬프트(§P).

**구현하지 않은 항목:** 다중 페이지 지원, 580칸 제한 제거, 템플릿 선택 UI, 방안선/십자선 실제 적용.

---

## P. 다음 PoC 프롬프트 초안

아래 프롬프트를 다중 페이지 PoC 작업 세션에 사용한다.

---

### 작업 요청: HWPX 다중 페이지 PoC

#### 전제

- `docs/hwpx_download_plan.md` §M·§N·§O를 먼저 읽을 것.
- MVP 단일 페이지 기능은 유지할 것.
- **한글에서 수동 생성한 2페이지 `.hwpx` 샘플**(`section0.xml` fixture)이 있어야 page break 구현을 시작할 것. 없으면 문서화된 수동 실험(§M)을 먼저 수행.

#### 목표

581칸 이상 입력 시 580칸 단위로 분할하여 **하나의 `.hwpx`에 여러 20×29 연습장 페이지**를 생성한다.

#### 구현 범위

1. `splitCharsIntoPages` — 580칸 청크 분할, 최대 20페이지 상한.
2. `cloneTableParagraph` + `insertPageBreaks` — fixture 기반 page break XML.
3. `buildMultiPageSection` — 다중 `hp:tbl` section0 생성.
4. `downloadHwpx` / `prepareHwpxChars` — 580 상한 제거, 다중 페이지 경로 연결.
5. `parseSection` — 다중 tbl 테스트 헬퍼 또는 별도 검증 함수.
6. Vitest: §N 테스트 계획 케이스.
7. UI: 580 초과 차단 제거, 페이지 수·상한 안내 문구.
8. README·설계 문서 상태 갱신.

#### 하지 말 것

- 방안선/십자선 템플릿 선택 UI (로드맵 8단계).
- Excel 제거.
- `linesegarray` 수동 수정.

#### 완료 기준

- [ ] `pnpm test` 통과
- [ ] 581·1160·1161칸 자동 테스트 통과
- [ ] 한글에서 2~3페이지 샘플 수동 열기 성공
- [ ] 단일 페이지(≤580칸) 기존 동작 회귀 없음

---

## 참고: 현재 코드베이스 연결점

| 파일 | 관련 기능 |
| --- | --- |
| `src/utils/transformText.ts` | `transformText`, `linesToRows`, `lineToCells` |
| `src/utils/tableUtils.ts` | `padRows` (20열 패딩 재사용) |
| `src/App.tsx` | 출력 모드, Excel 다운로드 UI |
| `assets/templates/practice_diagonal_20x29/` | HWPX 템플릿 원본 |
