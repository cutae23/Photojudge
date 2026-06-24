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

- 브라우저(`index.html`)는 Gemini API 키를 전혀 알지 못합니다.
- 사진을 업로드하면 브라우저는 자기 자신의 `/api/judge` 엔드포인트로
  이미지(base64)와 심사 기준만 전송합니다.
- `api/judge.js`(서버리스 함수)가 `process.env.GEMINI_API_KEY`를 읽어
  Gemini에 요청을 보내고, 결과만 JSON으로 브라우저에 돌려줍니다.
- 따라서 키는 서버 환경에만 존재하고 클라이언트 소스코드나 네트워크 탭에
  절대 노출되지 않습니다.

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
