import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateFolder, uploadFile, getRootFolderId } from "@/lib/google-drive";

export const maxDuration = 60;

const STEP1_ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
];

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

    // ── 1단계: 앨범 커버 ──
    if (stepNum === 1) {
      if (!file) {
        return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
      }
      if (!STEP1_ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "이미지 파일만 업로드 가능합니다. (JPG, PNG, WEBP, GIF)" },
          { status: 400 }
        );
      }
      if (file.size > 4 * 1024 * 1024) {
        return NextResponse.json(
          { error: "파일 크기는 4MB 이하여야 합니다." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const { fileId, webViewLink } = await uploadFile(
        buffer,
        "step1_photo.jpg",
        "image/jpeg",
        projectTmpFolderId
      );

      return NextResponse.json({
        success: true,
        driveFileId: fileId,
        webViewLink,
        originalName: file.name,
        step: 1,
        thumbnailBase64: `data:image/jpeg;base64,${buffer.toString("base64")}`,
      });
    }

    // ── 2단계 이상: 가사 파일 ──
    const fileType = formData.get("fileType") as string | null;
    const songName = (formData.get("songName") as string | null) || `song${stepNum - 1}`;
    const lyricsText = formData.get("lyricsText") as string | null;
    const songIndex = stepNum - 1;
    const safeName = sanitizeFilename(songName);

    if (fileType === "lyrics") {
      let lyricsBuffer: Buffer;
      let originalName: string;

      if (lyricsText !== null && lyricsText.trim() !== "") {
        lyricsBuffer = Buffer.from(lyricsText, "utf-8");
        originalName = `${songIndex}.${safeName}.txt`;
      } else if (file) {
        lyricsBuffer = Buffer.from(await file.arrayBuffer());
        originalName = `${songIndex}.${safeName}.txt`;
      } else {
        return NextResponse.json({ error: "가사 내용이 없습니다." }, { status: 400 });
      }

      const { fileId, webViewLink } = await uploadFile(
        lyricsBuffer,
        `${songIndex}.${safeName}.txt`,
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
