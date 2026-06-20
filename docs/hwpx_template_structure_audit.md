# HWPX Template Structure Audit

분석 일자: 2026-06-20  
분석 대상: `assets/templates/practice_{diagonal,grid,cross}_20x29`

## 결론

**세 템플릿 모두 기존 다중페이지 로직(단일 `hp:tbl` 행 복제 + `cellAddr` row 오프셋)을 공유할 수 있다.**

판단: **공유 가능**

- diagonal / grid / cross 모두 `1개 hp:tbl`, `20열 × 29행`, `580개 hp:tc`, 연속 `cellAddr` 구조를 가진다.
- 가이드선은 셀 `borderFillIDRef` + `header.xml`의 `borderFill` 정의로 표현되며, 페이지 단위 도형/그림/컨트롤이 아니다.
- 행 복제(`cloneNode`) 시 셀 borderFill 및 내부 `hp:run` 구조가 함께 복제되므로, 다중페이지에서도 가이드선이 유지될 것으로 예상된다.
- `CHAR_PR_ID_REF = '13'`은 템플릿마다 다르거나 혼재한다(대각선=13, 방안선=14, 십자선=13/9). `hp:run` 탐색은 `charPrIDRef` 상수 대신 **텍스트가 없는 `hp:run` 우선** 방식으로 일반화하는 것이 안전하다.

한글 수동 열기 검증: 대각선만 완료. 방안선·십자선은 자동 테스트 통과 후에도 **한글 수동 열기 검증 필요**.

---

## 템플릿별 비교표

| 항목 | diagonal | grid | cross |
| --- | --- | --- | --- |
| **table count** | 1 | 1 | 1 |
| **rowCnt** | 29 | 29 | 29 |
| **colCnt** | 20 | 20 | 20 |
| **hp:tr count** | 29 | 29 | 29 |
| **hp:tc count** | 580 | 580 | 580 |
| **cellAddr 연속성** | (0,0)~(28,19) 연속 | 동일 | 동일 |
| **hp:cellSz** | 2834×2834 | 2834×2834 | 2834×2834 |
| **hp:cellSpan** | colSpan=1, rowSpan=1 | 동일 | 동일 |
| **borderFillIDRef (셀)** | 9 (580칸 동일) | 6 (580칸 동일) | 6 (580칸 동일) |
| **셀당 hp:run 수** | 1 | 1 | 1 |
| **charPrIDRef (셀 run)** | 13 | 14 | 13 또는 9 |
| **target run 탐색** | charPr 13 또는 첫 run | charPr 14 → 첫 run fallback | charPr 13/9 혼재 → 일반화 필요 |
| **guide line 표현** | borderFill (id=9, header.xml) | borderFill (id=6) | borderFill (id=6) |
| **hp:pic / hp:line / hp:rect (section0)** | 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 |
| **hp:ctrl (section0)** | 2 | 3 | 2 |
| **위험 요소** | 없음 (기준 템플릿) | charPrIDRef≠13 | charPrIDRef 혼재 |

### 부속 파일 비교

| 파일 | diagonal | grid | cross |
| --- | --- | --- | --- |
| **파일 목록 (12개)** | 동일 구조 | 동일 구조 | 동일 구조 |
| **META-INF/manifest.xml** | 빈 manifest, 3템플릿 동일 | 동일 | 동일 |
| **Contents/content.hpf** | spine/manifest 동일, ModifiedDate만 상이 | 동일 | 동일 |
| **Contents/header.xml** | borderFill id=9 (대각선 패턴) | borderFill id=6 (격자 패턴) | borderFill id=6 (십자 패턴) |
| **Preview/** | PrvImage.png + PrvText.txt | 동일 | 동일 |

Preview 파일은 HWPX 생성·다운로드에 **필수는 아니다**. ZIP에 포함되면 한글 미리보기 품질에 도움이 되지만, `section0.xml` 수정 로직과 무관하며 **템플릿 폴더 전체 복사**로 충분하다.

---

## 구현 판단

### 바로 구현 가능

다음 기존 로직을 그대로 재사용한다.

- `parseSection` — 표/셀 파싱 및 cellAddr 검증
- `extendPracticeTableRows` / `buildMultiPageSection` — 행 복제 다중페이지
- `fillPracticeCells` — 셀 글자 삽입
- `buildHwpx` / `loadTemplate` — ZIP 패키징 및 fetch

### 보완 후 구현 (이번 작업에 포함)

| 보완 | 내용 |
| --- | --- |
| `findTargetRun` | `CHAR_PR_ID_REF` 상수 의존 제거 → `hp:t`가 없는 run 우선, 없으면 첫 run |
| `constants.ts` | `PracticeTemplateId` 메타데이터, `getTemplateBasePath(id)` |
| `loadTemplate` | 선택된 templateId/basePath로 fetch |
| `downloadHwpx` | templateId를 생성 함수까지 전달 |
| UI | 연습장 종류 선택 (대각선/방안선/십자선) |
| `public/templates/` | grid/cross 템플릿 배포 복사 |

### 보류 불필요

페이지 단위 도형/그림 기반 가이드선이 아니므로 별도 다중페이지 로직은 필요하지 않다.

---

## 다중페이지 호환성 근거

1. **표 구조 동일**: 3템플릿 모두 단일 `hp:tbl`에 29×20 격자.
2. **가이드선 = borderFill**: `section0.xml`에 `hp:pic`/`hp:line` 없음. 셀 `borderFillIDRef`가 템플릿별로 일관되게 580칸에 동일 값.
3. **행 복제 안전**: `cloneNode(true)` 시 `borderFillIDRef`, `cellSz`, `cellSpan`, `hp:run` 구조가 그대로 복제됨.
4. **fixtures**: `fixtures/hwpx_2page_{grid,cross,diagonal}_manual/`에 2페이지 수동 제작본이 존재하여, 행 확장 방식과 구조적으로 호환됨을 간접 확인.

---

## 테스트 계획

각 템플릿에 대해:

- `parseSection`: 580칸 파싱
- `buildMultiPageSection`: 1페이지(580), 2페이지(1160), 3페이지(1740) tc/rowCnt
- 페이지 경계 글자 매핑
- `borderFillIDRef` 스냅샷 유지 (복제 후)

자동 테스트 통과 ≠ 한글 수동 검증 완료. README에 방안선·십자선 **수동 검증 필요** 명시.
