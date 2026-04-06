# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# Phrase — 10단계 프로젝트 위자드 + Google Drive 연동

## 개발 명령어

```bash
pnpm dev              # 개발 서버 시작 (http://localhost:3000)
pnpm build            # 프로덕션 빌드
pnpm lint             # ESLint 실행
pnpm prisma generate  # Prisma client 재생성 (스키마 변경 후)
pnpm prisma db push   # DB 스키마 반영
pnpm prisma studio    # DB GUI 열기
```

> 테스트 프레임워크 없음.

---

## 프로젝트 개요

사용자가 회원가입 → 로그인 후 10단계 위자드를 통해 앨범을 등록한다.
각 단계에서 파일(앨범 커버 JPEG, WAV)을 업로드할 수 있으며,
"시작하기" 완료 시 Google Drive에 사용자 폴더 → 앨범 폴더를 생성하고,
임시 폴더의 파일을 이동한 뒤 Google Sheets에 곡 목록을 기록하고 Slack으로 알림을 보낸다.

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
| Google Drive | googleapis (서비스 계정 JWT 인증) |
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

## 핵심 도메인 규칙

### 위자드 흐름
- 1~10단계 순서대로 진행 (이전/다음 버튼)
- 각 단계 파일 업로드는 **선택 사항** — 업로드 없이도 다음 단계 진행 가능
- 10단계까지 완료해야 "시작하기" 버튼 활성화
- "시작하기" 클릭 시 `/api/projects/[id]/complete` 호출 → Drive 작업 일괄 처리

### 파일 업로드 흐름 (Resumable Upload)

Vercel의 4.5MB 요청 제한을 우회하기 위해 클라이언트가 Google Drive에 직접 업로드한다.

**앨범 커버 (step 1 / `ImageUploadStep.tsx`)**
1. 클라이언트에서 Canvas로 3000×3000 JPEG 리사이즈
2. `POST /api/projects/[id]/steps/1/upload-url` → Drive resumable upload 세션 URL 획득
3. 클라이언트가 Drive URL에 직접 `PUT`
4. `POST /api/projects/[id]/steps/1/image-confirm` → 업로드 확인 + DB 기록

**WAV 파일 (steps 2~10 / `SongStep.tsx`)**
1. `POST /api/projects/[id]/steps/[step]/upload-url` → resumable 세션 URL
2. 클라이언트가 Drive URL에 직접 `PUT`
3. `POST /api/projects/[id]/steps/[step]/audio-confirm` → 확인 + DB 기록

**가사 파일** — `/api/projects/[id]/steps/[step]/upload`로 서버를 통해 직접 업로드

### Google Drive 폴더 구조
```
[루트 공유 폴더] (GOOGLE_DRIVE_ROOT_FOLDER_ID)
  └── _tmp/
  │    └── [projectId]/    ← 위자드 중 임시 저장
  └── [사용자 이름]        ← 없으면 생성
       └── [앨범 이름]     ← 완료 시 생성
            ├── step1_파일명
            └── step7_파일명
```

파일은 `complete` API 호출 시 `_tmp/[projectId]/` → 최종 폴더로 **이동**된다.

### 위자드 완료 시 (`/api/projects/[id]/complete`)
1. Prisma `$transaction`으로 StepFile 레코드 갱신
2. Drive: 사용자 폴더 → 앨범 폴더 생성, 파일 이동
3. Google Sheets: 곡별 1행씩 기록 (신청자, 앨범명, 곡제목, 신청일시, Drive 링크)
4. Slack Webhook 알림 전송
5. `Project.status` → `ACTIVE`로 업데이트

`maxDuration = 60` (Vercel 타임아웃 설정 필수)

### 데이터 모델 (SOT: `prisma/schema.prisma`)
- `Project`: userId, name, description, status(DRAFT/ACTIVE), driveUserFolderId, driveProjectFolderId
- `StepFile`: projectId, step(1~10), originalName, driveFileId, driveWebViewLink

---

## 환경변수 (`.env.local`)

```
DATABASE_URL                    # Supabase PgBouncer pooler (포트 6543, pgbouncer=true)
DIRECT_URL                      # Supabase direct (포트 5432, 마이그레이션용)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL             # http://localhost:3000 (개발) / 배포 URL
GOOGLE_SERVICE_ACCOUNT_EMAIL
GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
GOOGLE_DRIVE_ROOT_FOLDER_ID
GOOGLE_SHEETS_SPREADSHEET_ID
SLACK_WEBHOOK_URL
```

---

## 코드 작성 원칙

### 공통
- **TypeScript strict** — `any` 사용 금지
- **명확한 네이밍** — 변수/함수명만 읽어도 의도를 알 수 있게
- **에러 핸들링** — 모든 API call에 try/catch, 한국어 에러 메시지

### 프론트엔드
- **Tailwind CSS만 사용** (별도 CSS 파일 생성 금지)
- **서버 컴포넌트 기본**, 상호작용 필요 시에만 `"use client"`
- **반응형 필수**: mobile-first (sm → md → lg)
- **로딩/에러 상태**: 모든 비동기 UI에 skeleton/error 처리

### 백엔드
- **API Route는 얇게**: 유효성 검증 → 서비스 호출 → 응답
- **Zod**로 request body 유효성 검증
- **Prisma `$transaction`**: 여러 DB 작업은 트랜잭션으로 묶기
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
