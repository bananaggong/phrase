# Phrase

10단계 프로젝트 위자드와 Google Drive 자동 연동을 제공하는 웹 애플리케이션입니다.
사용자가 회원가입 후 단계별로 프로젝트 정보를 입력하고 파일을 업로드하면, 완료 시 Google Drive에 자동으로 폴더 구조를 생성하고 파일을 저장합니다.

**Production:** [https://phrase-nine.vercel.app](https://phrase-nine.vercel.app)

---

## 주요 기능

- **이메일 인증 기반 회원가입 / 로그인** (Supabase Auth)
- **10단계 프로젝트 위자드** — 각 단계에서 파일 업로드 가능 (선택 사항)
- **Google Drive 자동 연동** — 완료 시 사용자 폴더 → 프로젝트 폴더 생성 후 파일 이동
- **프로젝트 보드** — 생성한 프로젝트 목록 및 상태 확인

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
| Google Drive | googleapis (서비스 계정) |
| Deploy | Vercel |

---

## 프로젝트 구조

```
phrase/
├── prisma/
│   └── schema.prisma              # DB 스키마 (SOT)
├── prisma.config.ts               # Prisma 7 설정 (adapter, datasource)
├── src/
│   ├── app/
│   │   ├── (auth)/                # 인증 라우트 그룹
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/           # 인증 필요 페이지 그룹
│   │   │   ├── board/page.tsx     # 프로젝트 목록 보드
│   │   │   └── projects/new/page.tsx  # 10단계 위자드
│   │   ├── auth/confirm/route.ts  # 이메일 인증 콜백
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── me/route.ts        # GET 현재 유저 정보
│   │       │   └── signout/route.ts   # POST 로그아웃
│   │       └── projects/
│   │           ├── route.ts           # GET 목록 / POST 생성
│   │           └── [id]/
│   │               ├── route.ts                      # GET 상세
│   │               ├── complete/route.ts             # POST 위자드 완료 → Drive
│   │               └── steps/[step]/upload/route.ts  # POST 파일 업로드
│   ├── generated/
│   │   └── prisma/                # Prisma Client 자동 생성 (gitignore)
│   └── lib/
│       ├── supabase.ts            # Supabase client (server / browser)
│       ├── auth.ts                # requireAuth() 헬퍼
│       ├── prisma.ts              # Prisma singleton (PrismaPg adapter)
│       └── google-drive.ts        # Drive API 래퍼
└── .env.local                     # 환경변수 (gitignore)
```

---

## 로컬 개발 환경 설정

### 1. 저장소 클론 및 의존성 설치

```bash
git clone https://github.com/bananaggong/phrase.git
cd phrase
pnpm install
```

### 2. 환경변수 설정

`.env.local` 파일을 생성하고 아래 값을 채웁니다.

```env
# Supabase — PgBouncer pooler (포트 6543, 런타임용)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Supabase — Session mode (포트 5432, 마이그레이션용)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres"

# Supabase Auth
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_..."
SUPABASE_SERVICE_ROLE_KEY="sb_secret_..."

# App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Google Drive (서비스 계정)
GOOGLE_SERVICE_ACCOUNT_EMAIL="xxx@xxx.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_DRIVE_ROOT_FOLDER_ID="Google Drive 공유 폴더 ID"
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

> **Google Drive 주의사항:** 루트 폴더를 서비스 계정 이메일에 **편집자** 권한으로 공유해야 합니다.

### 3. DB 스키마 반영

```bash
pnpm prisma db push
```

### 4. Prisma Client 생성

```bash
pnpm prisma generate
```

### 5. 개발 서버 시작

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다.

### 6. Supabase 이메일 인증 설정

Supabase Dashboard → **Authentication → URL Configuration**
- **Site URL**: `http://localhost:3000`
- **Redirect URLs**: `http://localhost:3000/**`

---

## 데이터 모델

### Project

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `userId` | String | Supabase Auth UID |
| `name` | String | 프로젝트 이름 |
| `description` | String? | 프로젝트 설명 |
| `status` | Enum | `DRAFT` (위자드 진행 중) / `ACTIVE` (완료) |
| `driveUserFolderId` | String? | Drive 사용자 폴더 ID |
| `driveProjectFolderId` | String? | Drive 프로젝트 폴더 ID |

### StepFile

| 필드 | 타입 | 설명 |
|------|------|------|
| `id` | UUID | PK |
| `projectId` | UUID | FK → Project |
| `step` | Int | 단계 번호 (1~10) |
| `originalName` | String | 원본 파일명 |
| `driveFileId` | String | Google Drive 파일 ID |
| `driveWebViewLink` | String? | Drive 파일 링크 |

---

## 핵심 흐름

### 위자드 흐름

```
회원가입 → 이메일 인증 → 로그인
→ 새 프로젝트 생성
→ 1~10단계 순서대로 진행 (각 단계 파일 업로드 선택)
→ 10단계 완료 후 "시작하기" 클릭
→ Google Drive에 폴더 생성 + 파일 이동
→ 프로젝트 보드로 이동
```

### Google Drive 폴더 구조

```
[루트 공유 폴더] (GOOGLE_DRIVE_ROOT_FOLDER_ID)
  └── [사용자 이름/이메일]
       └── [프로젝트 이름]
            ├── step1_파일명
            └── step7_파일명
```

파일은 위자드 진행 중 `_tmp/[projectId]/` 에 임시 저장되고, "시작하기" 완료 시 최종 폴더로 이동됩니다.

---

## 배포 (Vercel)

```bash
# Vercel CLI 로그인
vercel login

# 프로젝트 연결 및 배포
vercel link --scope <team-name>
vercel --prod
```

배포 후 Vercel Dashboard → Settings → Environment Variables 에 `.env.local`의 모든 값을 추가하고, `NEXT_PUBLIC_APP_URL`은 실제 배포 URL로 변경합니다.

Supabase Dashboard → Authentication → URL Configuration 에서 Site URL과 Redirect URLs도 배포 URL로 업데이트합니다.

---

## 개발 명령어

```bash
pnpm dev              # 개발 서버 시작
pnpm build            # 프로덕션 빌드
pnpm prisma generate  # Prisma Client 재생성
pnpm prisma db push   # DB 스키마 반영 (마이그레이션 없이)
pnpm prisma studio    # Prisma Studio (DB GUI)
```
