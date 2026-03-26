import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getOrCreateFolder, uploadFile } from "@/lib/google-drive";

export const maxDuration = 60;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; step: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { id: projectId, step } = await params;
  const stepNum = parseInt(step, 10);
  if (isNaN(stepNum) || stepNum < 1 || stepNum > 10) {
    return NextResponse.json(
      { error: "잘못된 단계 번호입니다." },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID!;

  // _tmp/[projectId]/ 에 임시 업로드
  const tmpFolderId = await getOrCreateFolder("_tmp", rootFolderId);
  const projectTmpFolderId = await getOrCreateFolder(projectId, tmpFolderId);

  const fileName = `step${stepNum}_${file.name}`;
  const { fileId, webViewLink } = await uploadFile(
    buffer,
    fileName,
    file.type || "application/octet-stream",
    projectTmpFolderId
  );

  return NextResponse.json({
    success: true,
    driveFileId: fileId,
    webViewLink,
    originalName: file.name,
    step: stepNum,
  });
}
