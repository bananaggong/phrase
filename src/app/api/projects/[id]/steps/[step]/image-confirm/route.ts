import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateFolder, findFileInFolder, getRootFolderId } from "@/lib/google-drive";

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; step: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  const { id: projectId } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }
  if (project.status === "ACTIVE") {
    return NextResponse.json({ error: "이미 완료된 프로젝트입니다." }, { status: 409 });
  }

  try {
    const rootFolderId = getRootFolderId();
    const tmpFolderId = await getOrCreateFolder("_tmp", rootFolderId);
    const projectTmpFolderId = await getOrCreateFolder(projectId, tmpFolderId);

    const file = await findFileInFolder("step1_photo.jpg", projectTmpFolderId);
    if (!file) {
      return NextResponse.json(
        { error: "Drive에서 이미지를 찾을 수 없습니다. 업로드를 다시 시도해주세요." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      driveFileId: file.fileId,
      webViewLink: file.webViewLink,
      originalName: "step1_photo.jpg",
    });
  } catch (err) {
    console.error("[image-confirm] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "이미지 확인 실패" },
      { status: 500 }
    );
  }
}
