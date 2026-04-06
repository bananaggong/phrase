import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateFolder, uploadFile, getRootFolderId } from "@/lib/google-drive";

export const maxDuration = 60;

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
  if (isNaN(stepNum) || stepNum < 2 || stepNum > 20) {
    return NextResponse.json(
      { error: "잘못된 단계 번호입니다." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  try {
    const rootFolderId = getRootFolderId();
    const tmpFolderId = await getOrCreateFolder("_tmp", rootFolderId);
    const projectTmpFolderId = await getOrCreateFolder(projectId, tmpFolderId);

    // ── 2단계 이상: 가사 파일 ──
    const fileType = formData.get("fileType") as string | null;
    const songName = (formData.get("songName") as string | null) || `song${stepNum - 1}`;
    const lyricsText = formData.get("lyricsText") as string | null;
    const songIndex = stepNum - 1;
    const safeName = sanitizeFilename(songName);

    if (fileType === "lyrics" || fileType === "prompt") {
      const suffix = fileType === "prompt" ? "prompt.txt" : "txt";
      let textBuffer: Buffer;
      let originalName: string;

      if (lyricsText !== null && lyricsText.trim() !== "") {
        textBuffer = Buffer.from(lyricsText, "utf-8");
        originalName = `${songIndex}.${safeName}.${suffix}`;
      } else if (file) {
        textBuffer = Buffer.from(await file.arrayBuffer());
        originalName = `${songIndex}.${safeName}.${suffix}`;
      } else {
        const label = fileType === "prompt" ? "프롬프트" : "가사";
        return NextResponse.json({ error: `${label} 내용이 없습니다.` }, { status: 400 });
      }

      const fileName = `${songIndex}.${safeName}.${suffix}`;
      const { fileId, webViewLink } = await uploadFile(
        textBuffer,
        fileName,
        "text/plain",
        projectTmpFolderId
      );

      return NextResponse.json({
        success: true,
        driveFileId: fileId,
        webViewLink,
        originalName,
        step: stepNum,
      });
    }

    return NextResponse.json({ error: "fileType이 필요합니다." }, { status: 400 });
  } catch (err) {
    console.error("[upload] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "업로드 실패" },
      { status: 500 }
    );
  }
}
