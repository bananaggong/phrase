import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getOrCreateFolder, getRootFolderId, getDriveClient } from "@/lib/google-drive";

export const maxDuration = 60;

const completeSchema = z.object({
  projectName: z.string(),
  userLabel: z.string(), // 사용자 이름 또는 이메일 (폴더명)
  stepFiles: z.array(
    z.object({
      step: z.number(),
      driveFileId: z.string(),
      originalName: z.string(),
      webViewLink: z.string(),
    })
  ),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;
  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json(
      { error: "프로젝트를 찾을 수 없습니다." },
      { status: 404 }
    );
  }
  if (project.userId !== user.id) {
    return NextResponse.json(
      { error: "접근 권한이 없습니다." },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const parsed = completeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "입력값 오류" }, { status: 400 });
  }

  const { projectName, userLabel, stepFiles } = parsed.data;
  const rootFolderId = getRootFolderId();

  // 사용자 폴더 → 프로젝트 폴더 생성
  const userFolderId = await getOrCreateFolder(userLabel, rootFolderId);
  const projectFolderId = await getOrCreateFolder(projectName, userFolderId);

  // _tmp에 있는 파일들을 프로젝트 폴더로 이동
  const drive = getDriveClient();
  const savedFiles: typeof stepFiles = [];

  for (const sf of stepFiles) {
    try {
      const file = await drive.files.get({
        fileId: sf.driveFileId,
        fields: "parents",
      });
      const previousParents = (file.data.parents ?? []).join(",");
      await drive.files.update({
        fileId: sf.driveFileId,
        addParents: projectFolderId,
        removeParents: previousParents,
        fields: "id, parents",
      });
      savedFiles.push(sf);
    } catch {
      // 이동 실패 시 skip (파일이 없거나 권한 문제)
    }
  }

  // DB 저장 (원자적)
  await prisma.$transaction(async (tx) => {
    await tx.stepFile.createMany({
      data: savedFiles.map((sf) => ({
        projectId,
        step: sf.step,
        originalName: sf.originalName,
        driveFileId: sf.driveFileId,
        driveWebViewLink: sf.webViewLink,
      })),
    });
    await tx.project.update({
      where: { id: projectId },
      data: {
        status: "ACTIVE",
        driveUserFolderId: userFolderId,
        driveProjectFolderId: projectFolderId,
        name: projectName,
      },
    });
  });

  // _tmp/[projectId] 폴더 삭제 시도 (선택적)
  try {
    const tmpFolderRes = await drive.files.list({
      q: `name='${projectId}' and trashed=false`,
      fields: "files(id)",
    });
    if (tmpFolderRes.data.files?.[0]?.id) {
      await drive.files.delete({ fileId: tmpFolderRes.data.files[0].id });
    }
  } catch {
    // 삭제 실패는 무시
  }

  const projectFolderLink = `https://drive.google.com/drive/folders/${projectFolderId}`;
  return NextResponse.json({ success: true, driveProjectFolderLink: projectFolderLink });
}
