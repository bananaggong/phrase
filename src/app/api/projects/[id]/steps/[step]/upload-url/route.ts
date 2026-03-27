import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateFolder, createResumableUploadSession, getRootFolderId } from "@/lib/google-drive";

export const maxDuration = 30;

function sanitizeFilename(name: string): string {
  return name.replace(/[/\\:*?"<>|]/g, "_").trim() || "untitled";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; step: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;
  const user = authResult;

  const { id: projectId, step } = await params;

  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
  }
  if (project.userId !== user.id) {
    return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
  }

  const stepNum = parseInt(step, 10);
  if (isNaN(stepNum) || stepNum < 1 || stepNum > 20) {
    return NextResponse.json({ error: "잘못된 단계 번호입니다." }, { status: 400 });
  }

  let fileName: string;
  let mimeType: string;

  if (stepNum === 1) {
    fileName = "step1_photo.jpg";
    mimeType = "image/jpeg";
  } else {
    const body = await request.json() as { songName?: string };
    const songName = body.songName?.trim() || `song${stepNum - 1}`;
    const safeName = sanitizeFilename(songName);
    const songIndex = stepNum - 1;
    fileName = `${songIndex}.${safeName}.wav`;
    mimeType = "audio/wav";
  }

  try {
    const rootFolderId = getRootFolderId();
    const tmpFolderId = await getOrCreateFolder("_tmp", rootFolderId);
    const projectTmpFolderId = await getOrCreateFolder(projectId, tmpFolderId);

    const uploadUrl = await createResumableUploadSession(fileName, mimeType, projectTmpFolderId);

    return NextResponse.json({ uploadUrl, fileName });
  } catch (err) {
    console.error("[upload-url] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 URL 생성 실패" },
      { status: 500 }
    );
  }
}
