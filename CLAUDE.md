# Phrase — 10단계 프로젝트 위자드 + Google Drive 연동

## 프로젝트 개요

사용자가 회원가입 → 로그인 후 10단계 위자드를 통해 프로젝트를 생성하고,
각 단계에서 파일을 업로드할 수 있다.
"시작하기" 완료 시 Google Drive(서비스 계정)에 사용자 폴더 → 프로젝트 폴더를 생성하고
업로드된 파일을 저장한다.

---

## 기술 스택

| 항목 | 선택 |
|------|------|
| Framework | Next.js 16 App Router |
| Language | TypeScript (strict) |
| Style | Tailwind CSS v4 |
| Auth / DB | Supabase (Auth + PostgreSQL) |
| ORM | Prisma 7 (`@prisma/adapter-pg` + PgBouncer) |
| Package Manager | pnpm |
| Google Drive | googleapis (서비스 계정) |
| Deploy | Vercel |

---

## 팀 구성

이 프로젝트는 1인 개발자(GGONG)가 Claude Code를 주력 도구로 사용한다.

### Agent Team

| Agent | Model | 역할 | 도구 |
|-------|-------|------|------|
| main | opus | 오케스트레이터: 작업 분배, 코드 리뷰, 아키텍처 판단 | 전체 |
| fe-engineer | sonnet | 프론트엔드: React 컴포넌트, 페이지, UI/UX | Read, Write, Edit, Glob, Grep |
| be-engineer | sonnet | 백엔드: API Route, Prisma, 서비스 로직 | Read, Write, Edit, Bash, Glob, Grep |
| explorer | haiku | 코드베이스 탐색 (read-only) | Read, Glob, Grep |

---

## 프로젝트 구조

```
phrase/
├── prisma/
│   └── schema.prisma          # DB 스키마 (SOT)
├── src/
│   ├── app/
│   │   ├── (auth)/            # 인증 라우트
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/       # 인증 필요 페이지
│   │   │   ├── board/page.tsx           # 프로젝트 목록 보드
│   │   │   └── projects/new/page.tsx    # 10단계 위자드
│   │   ├── auth/confirm/route.ts        # 이메일 인증 콜백
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── signout/route.ts
│   │       │   └── me/route.ts
│   │       └── projects/
│   │           ├── route.ts             # GET 목록 / POST 생성
│   │           └── [id]/
│   │               ├── route.ts         # GET 상세
│   │               ├── complete/route.ts # POST 위자드 완료 → Drive
│   │               └── steps/[step]/
│   │                   └── upload/route.ts # POST 파일 업로드
│   ├── components/
│   │   ├── ui/                # 공통 UI (Button, Input, Card 등)
│   │   ├── wizard/            # 위자드 전용 컴포넌트
│   │   └── board/             # 보드 전용 컴포넌트
│   └── lib/
│       ├── supabase.ts        # Supabase client (server + browser)
│       ├── auth.ts            # requireAuth() 헬퍼
│       ├── prisma.ts          # Prisma singleton
│       └── google-drive.ts   # Drive API 래퍼
├── .claude/
│   └── agents/                # Subagent 정의
├── .env.local                 # 환경변수 (gitignore됨)
├── CLAUDE.md                  # 이 파일
└── package.json
```

---

## 핵심 도메인 규칙

### 위자드 흐름
- 1~10단계 순서대로 진행 (이전/다음 버튼)
- 각 단계 파일 업로드는 **선택 사항** — 업로드 없이도 다음 단계 진행 가능
- 10단계까지 완료해야 "시작하기" 버튼 활성화
- "시작하기" 클릭 시 `/api/projects/[id]/complete` 호출 → Drive 작업 일괄 처리

### Google Drive 폴더 구조
```
[루트 공유 폴더] (GOOGLE_DRIVE_ROOT_FOLDER_ID)
  └── [사용자 이름/이메일]     ← 없으면 생성
       └── [프로젝트 이름]     ← 새로 생성
            ├── step1_파일명
            └── step7_파일명
```

### 파일 업로드 흐름
1. 각 단계에서 업로드 → `/api/projects/[id]/steps/[step]/upload`
2. Drive `_tmp/[projectId]/` 에 임시 저장 + DB에 StepFile 기록
3. "시작하기" 시 `complete` API가 파일을 최종 폴더로 이동

### 데이터 모델 (SOT: `prisma/schema.prisma`)
- `Project`: userId, name, description, status(DRAFT/ACTIVE), driveUserFolderId, driveProjectFolderId
- `StepFile`: projectId, step(1~10), originalName, driveFileId, driveWebViewLink

---

## 환경변수 (`.env.local`)

```
DATABASE_URL          # Supabase PgBouncer pooler (포트 6543, pgbouncer=true)
DIRECT_URL            # Supabase direct (포트 5432)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL   # http://localhost:3000 (개발) / 배포 URL
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
GOOGLE_DRIVE_ROOT_FOLDER_ID
```

---

## 코드 작성 원칙

### 공통
- **TypeScript strict** — `any` 사용 금지
- **명확한 네이밍** — 변수/함수명만 읽어도 의도를 알 수 있게
- **에러 핸들링** — 모든 API call에 try/catch, 한국어 에러 메시지
- **컴포넌트 분리** — 200줄 초과 시 분리 검토

### 프론트엔드
- **Tailwind CSS만 사용** (별도 CSS 파일 생성 금지)
- **서버 컴포넌트 기본**, 상호작용 필요 시에만 `"use client"`
- **반응형 필수**: mobile-first (sm → md → lg)
- **로딩/에러 상태**: 모든 비동기 UI에 skeleton/error 처리

### 백엔드
- **API Route는 얇게**: 유효성 검증 → 서비스 호출 → 응답
- **Zod**로 request body 유효성 검증
- **Prisma `$transaction`**: 여러 DB 작업은 트랜잭션으로 묶기
- **Supabase RLS** 의존 — 서버에서 중복 권한 체크 최소화
- Drive 연동 API는 `maxDuration = 60` (Vercel timeout)

### Git 컨벤션
- **Branch**: `feat/`, `fix/`, `refactor/`, `docs/`
- **Commit**: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)

---

## Sub-Agent 라우팅

### 병렬 dispatch (모두 충족 시)
- 3개 이상 독립적 작업
- 작업 간 공유 상태 없음
- 파일 경계 명확하고 겹치지 않음

### 순차 dispatch (하나라도 해당 시)
- 작업 간 의존성 있음
- 같은 파일 수정 필요
- 범위 불명확 (탐색 먼저)

---

## 초기 설정 체크리스트 (새 환경에서)

1. `.env.local`에 실제 값 채우기
2. `pnpm prisma generate` — Prisma client 생성
3. `pnpm prisma db push` — DB 스키마 반영
4. Supabase Dashboard → Authentication → URL Configuration → Site URL 설정
5. `pnpm dev` — 개발 서버 시작
