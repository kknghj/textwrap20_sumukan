# 필사 연습장 줄바꿈 변환기

시, 편지, 산문 등의 원문을 필사 연습장에 맞게 줄바꿈해 주는 브라우저 전용 웹앱입니다.
입력한 텍스트는 서버로 전송되지 않으며, 모든 변환은 사용자의 브라우저 안에서만 처리됩니다.

## 주요 기능

- 한 줄당 최대 글자 수 설정 (최소 20자)
- 글자 수 계산 방식: 띄어쓰기 제외 / 포함
- 줄넘김 기준: 어절 단위 / 글자 단위
- 문장 부호, 괄호, 따옴표, 한자, 영어 등 제거 옵션
- 원문과 변환 결과를 나란히 확인
- 변환 결과 복사 및 초기화

## 로컬 실행 방법

```bash
pnpm install
pnpm dev
```

브라우저에서 Vite가 안내하는 로컬 주소(예: `http://localhost:5173`)로 접속합니다.

## 테스트 실행 방법

```bash
pnpm test
```

watch 모드로 실행하려면:

```bash
pnpm test:watch
```

## 빌드 방법

```bash
pnpm build
```

빌드 결과는 `dist` 폴더에 생성됩니다. 로컬에서 빌드 결과를 확인하려면:

```bash
pnpm preview
```

## 향후 배포 방법

Vercel 정적 사이트 배포를 기준으로 아래 순서를 사용할 수 있습니다.

1. GitHub 저장소에 프로젝트를 푸시합니다.
2. [Vercel](https://vercel.com)에서 새 프로젝트를 생성하고 저장소를 연결합니다.
3. Framework Preset은 `Vite`를 선택합니다.
4. Build Command: `pnpm build`
5. Output Directory: `dist`
6. Install Command: `pnpm install`

배포 후에도 앱은 정적 파일만 제공하므로 별도 서버 없이 동작합니다.

## 개인정보 안내

- 입력한 원문과 변환 결과는 브라우저 메모리에서만 사용됩니다.
- 외부 API 호출이나 서버 전송 로직은 포함되어 있지 않습니다.
- 페이지를 새로고침하거나 초기화하면 입력 내용이 사라집니다.

## 기술 스택

- React
- Vite
- TypeScript
- Vitest
- CSS
