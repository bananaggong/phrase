# Phrase

음악 유통 신청 웹 서비스. 사용자가 회원가입 후 10단계 위자드를 통해 앨범 커버와 WAV 파일을 제출하면, Google Drive에 자동 저장되고 Google Sheets에 신청 내역이 기록된다.

**Production:** [https://phrase-nine.vercel.app](https://phrase-nine.vercel.app)

---

## 주요 기능

- **이메일 인증 기반 회원가입 / 로그인** (Supabase Auth)
- **10단계 프로젝트 위자드** — 앨범 커버(1단계) + WAV(2~10단계) 업로드
- **Google Drive Resumable Upload** — Vercel 4.5MB 제한 우회, 대용량 파일 지원
- **앨범 커버 자동 변환** — 클라이언트 Canvas로 3000×3000 JPEG 리사이즈 (최대 20MB)
- **Google Drive 자동 연동** — 완료 시 사용자 폴더 → 앨범 폴더로 파일 이동
- **Google Sheets 신청 기록** — 곡마다 한 행씩 자동 기록
- **Slack 알림** — 신청 완료 시 채널 알림 발송
- **프로젝트 보드** — 생성한 프로젝트 목록 확인 및 삭제

---

## 기술 스택

| 항목 | 선택 |
|------|------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 |
| Auth / DB | Supabase (Auth + PostgreSQL) |
| ORM | Prisma 7 (`@prisma/adapter-pg`) |
| Package Manager | pnpm |
| Storage | Google Drive (서비스 계정) |
| 신청 기록 | Google Sheets (서비스 계정) |
| 알림 | Slack Incoming Webhook |
| Deploy | Vercel |

---

## 위자드 흐름

```
회원가입 → 이메일 인증 → 로그인
→ 새 프로젝트 생성 (DRAFT)
→ 1단계: 앨범 커버 업로드 (3000×3000 JPEG 자동 변환)
→ 2~10단계: WAV 파일 업로드 (선택 사항)
→ "시작하기" 클릭 (ACTIVE)
  ├── Drive _tmp/ → 사용자/앨범 폴더로 파일 이동
  ├── Google Sheets에 신청 내역 기록 (곡마다 한 행)
  └── Slack 알림 발송
→ 프로젝트 보드
```

### 파일 업로드 방식 (Resumable Upload)

```
클라이언트 → /upload-url  (서버: Drive 세션 URL 발급)
           → Google Drive PUT (클라이언트 직접 업로드, CORS 에러 무시)
           → /image-confirm 또는 /audio-confirm (서버: Drive 파일 존재 확인)
```

### Drive 폴더 구조

```
[루트 공유 폴더] (GOOGLE_DRIVE_ROOT_FOLDER_ID)
  └── [사용자명 or 이메일]
       └── [앨범명]
            ├── step1_photo.jpg
            ├── 2.songname.wav
            └── ...
```

### Sheets 기록 컬럼

| NO. | 신청자 | 앨범명 | 곡제목 | 신청일시 | 진행현황 | 드라이브 링크 |
|-----|--------|--------|--------|----------|----------|---------------|

곡마다 한 행씩 추가되며 NO.는 순차 증가. 신청자·앨범명 등 공통 정보는 행마다 반복 기록.

---

## 프로젝트 구조

```
phrase/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (auth)/                    # 로그인, 회원가입
│   │   ├── (dashboard)/
│   │   │   ├── board/page.tsx         # 프로젝트 목록 보드
│   │   │   └── projects/new/page.tsx  # 10단계 위자드
│   │   └── api/
│   │       ├── auth/                  # signout, me
│   │       └── projects/
│   │           ├── route.ts           # GET 목록 / POST 생성
│   │           └── [id]/
│   │               ├── route.ts                          # GET / DELETE
│   │               ├── complete/route.ts                 # POST 완료 → Drive + Sheets
│   │               └── steps/[step]/
│   │                   ├── upload-url/route.ts           # Resumable 세션 발급
│   │                   ├── upload/route.ts               # 가사 파일 직접 업로드
│   │                   ├── image-confirm/route.ts        # 이미지 확인
│   │                   └── audio-confirm/route.ts        # WAV 확인
│   ├── components/
│   │   ├── ImageUploadStep.tsx        # 앨범 커버 업로드 + Canvas 리사이즈
│   │   └── DeleteProjectButton.tsx    # 프로젝트 삭제 (확인 단계 포함)
│   └── lib/
│       ├── supabase.ts
│       ├── auth.ts                    # requireAuth()
│       ├── prisma.ts
│       ├── google-drive.ts            # Drive API 래퍼 (JWT 인증)
│       └── google-sheets.ts          # Sheets append 헬퍼
└── .env.local
```

---

## 로컬 개발 환경 설정

```bash
pnpm install
pnpm prisma generate
pnpm prisma db push
pnpm dev
```

### 환경변수 (`.env.local`)

```env
# Supabase
DATABASE_URL="postgresql://...?pgbouncer=true"
DIRECT_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google (서비스 계정: sheets-writer@odo-openboard.iam.gserviceaccount.com)
GOOGLE_SERVICE_ACCOUNT_EMAIL="xxx@xxx.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID="Drive 루트 폴더 ID"
GOOGLE_SHEETS_SPREADSHEET_ID="Sheets 스프레드시트 ID"

# Slack
SLACK_WEBHOOK_URL="https://hooks.slack.com/services/..."
```

#### 환경변수 발급 위치

| 변수 | 위치 |
|------|------|
| `DATABASE_URL` / `DIRECT_URL` | Supabase Dashboard → Settings → Database → Connection string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → service_role secret |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google Cloud Console → IAM → Service Accounts |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | 서비스 계정 JSON 키 파일 → `private_key` 값 |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Google Drive 공유 폴더 URL → `/folders/` 뒤 ID |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Google Sheets URL → `/d/` 뒤 ID |
| `SLACK_WEBHOOK_URL` | Slack → 앱 관리 → Incoming Webhooks |

> **주의:** Drive 루트 폴더와 Sheets 스프레드시트 모두 서비스 계정 이메일을 **편집자**로 공유해야 합니다.

---

## 데이터 모델

### Project

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `userId` | String | Supabase Auth UID |
| `name` | String | 앨범명 |
| `status` | Enum | `DRAFT` (진행 중) / `ACTIVE` (완료) |
| `driveUserFolderId` | String? | Drive 사용자 폴더 ID |
| `driveProjectFolderId` | String? | Drive 앨범 폴더 ID |

### StepFile

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `projectId` | UUID | FK → Project (onDelete: Cascade) |
| `step` | Int | 단계 번호 (1~10) |
| `originalName` | String | 원본 파일명 |
| `driveFileId` | String | Google Drive 파일 ID |
| `driveWebViewLink` | String? | Drive 파일 링크 |

---

## 개발 명령어

```bash
pnpm dev              # 개발 서버 시작
pnpm build            # 프로덕션 빌드
pnpm prisma generate  # Prisma Client 재생성
pnpm prisma db push   # DB 스키마 반영
pnpm prisma studio    # Prisma Studio (DB GUI)
vercel --prod         # Vercel 수동 배포
```
