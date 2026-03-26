import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOrCreateFolder, findFileInFolder, getRootFolderId } from "@/lib/google-drive";

export const maxDuration = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; step: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: projectId, step } = await params;
  const stepNum = parseInt(step, 10);
  if (isNaN(stepNum) || stepNum < 2 || stepNum > 20) {
    return NextResponse.json({ error: "잘못된 단계 번호입니다." }, { status: 400 });
  }

  const body = await request.json() as { fileName?: string };
  const fileName = body.fileName?.trim();
  if (!fileName) {
    return NextResponse.json({ error: "fileName이 필요합니다." }, { status: 400 });
  }

  try {
    const rootFolderId = getRootFolderId();
    const tmpFolderId = await getOrCreateFolder("_tmp", rootFolderId);
    const projectTmpFolderId = await getOrCreateFolder(projectId, tmpFolderId);

    const file = await findFileInFolder(fileName, projectTmpFolderId);
    if (!file) {
      return NextResponse.json({ error: "Drive에서 파일을 찾을 수 없습니다. 업로드를 다시 시도해주세요." }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      driveFileId: file.fileId,
      webViewLink: file.webViewLink,
      originalName: fileName,
    });
  } catch (err) {
    console.error("[audio-confirm] error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "파일 확인 실패" },
      { status: 500 }
    );
  }
}
