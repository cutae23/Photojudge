# 포토 저지 (Photo Judge) — Vercel 배포 가이드

AI(Gemini)가 업로드된 사진들을 심사 기준에 따라 비교 평가하고,
1위부터 순위와 이유, 닉네임을 매겨주는 웹앱입니다.

## 폴더 구조

```
.
├── index.html          ← 정적 프론트엔드 (그대로 루트에 둠)
├── api/
│   └── judge.js        ← 서버리스 함수 (Gemini API 호출, 키는 여기서만 사용)
└── vercel.json          ← 함수 타임아웃 설정
```

## 배포 방법

1. 이 폴더를 GitHub 저장소에 올리거나, Vercel CLI로 바로 배포합니다.

   ```bash
   npm i -g vercel
   vercel
   ```

   또는 GitHub에 push 후 Vercel 대시보드에서 "Import Project"로 연결.

2. **Vercel 프로젝트 설정 → Settings → Environment Variables** 에서
   다음 환경 변수를 추가합니다.

   | Key | Value |
   |---|---|
   | `GEMINI_API_KEY` | Google AI Studio(aistudio.google.com)에서 발급받은 키 |

   - Environment는 `Production`, `Preview`, `Development` 모두 체크해두면 편합니다.

3. 환경 변수 추가 후 **재배포(Redeploy)** 가 필요합니다.
   (Vercel은 새 배포 시점에 환경 변수를 주입하므로, 키를 나중에 추가했다면
   Deployments 탭에서 "Redeploy"를 한 번 눌러주세요.)

## 동작 원리 (보안 구조)

이 앱은 두 가지 방식으로 Gemini API 키를 쓸 수 있습니다.

1. **서버 키 (기본, 추천)**
   - Vercel 환경 변수 `GEMINI_API_KEY`를 서버 함수(`api/judge.js`)가 직접 읽어 사용합니다.
   - 브라우저는 이 키를 전혀 알 수 없습니다.

2. **개인 키 (화면 상단 입력칸, 선택사항)**
   - 화면 상단의 "개인 Gemini API 키" 입력칸에 자신의 키를 넣으면,
     그 키는 **브라우저의 localStorage에만 저장**되고,
     심사 요청을 보낼 때 함께 서버로 전달되어 **그 요청 한 번에만** 사용됩니다.
   - 입력칸을 비워두면 자동으로 서버 키(1번)를 사용합니다.
   - 개인 키가 입력되면 서버 키보다 **우선적으로** 사용됩니다.

어느 경우든 Gemini API 키가 클라이언트 JS 코드에 하드코딩되거나
직접 `generativelanguage.googleapis.com`으로 노출되는 일은 없습니다.
모든 호출은 항상 자신의 `/api/judge` 서버 함수를 경유합니다.

## 로컬에서 테스트하기

```bash
npm i -g vercel
vercel dev
```

`vercel dev`를 실행하면 `.env.local` 파일에 아래처럼 키를 넣고 테스트할 수 있습니다.

```
GEMINI_API_KEY=발급받은_키_여기에
```

(`.env.local`은 `.gitignore`에 추가해서 절대 커밋되지 않도록 하세요.)

## 제한사항 / 참고

- 한 번에 최대 12장까지 심사 가능 (서버리스 함수 페이로드/시간 제한 고려)
- 함수 타임아웃 60초로 설정됨 (`vercel.json`) — Vercel 플랜에 따라 최대 한도가 다를 수 있습니다
  (Hobby 플랜은 보통 60초가 상한이며, Pro 플랜은 더 길게 설정 가능)
