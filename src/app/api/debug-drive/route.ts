import { NextResponse } from "next/server";
import { google } from "googleapis";

export const maxDuration = 30;

export async function GET() {
  const email = (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "(없음)").trim();
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
  const key = rawKey.includes("\\n") ? rawKey.replace(/\\n/g, "\n") : rawKey;

  const keyInfo = {
    rawLength: rawKey.length,
    processedLength: key.length,
    hasLiteralBackslashN: rawKey.includes("\\n"),
    hasActualNewline: rawKey.includes("\n"),
    startsWithBegin: key.startsWith("-----BEGIN"),
    endsWithEnd: key.trimEnd().endsWith("-----"),
    lineCount: key.split("\n").length,
    firstLine: key.split("\n")[0],
    lastLine: key.split("\n").filter((l) => l.trim()).slice(-1)[0],
  };

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "(없음)";

  try {
    const jwtClient = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const tokens = await jwtClient.authorize();

    const drive = google.drive({ version: "v3", auth: jwtClient });

    // 루트 폴더 접근 테스트
    let folderTest: { ok: boolean; name?: string; error?: string } = { ok: false };
    try {
      const folderRes = await drive.files.get({
        fileId: rootFolderId,
        fields: "id, name",
        supportsAllDrives: true,
      });
      folderTest = { ok: true, name: folderRes.data.name ?? "" };
    } catch (folderErr) {
      folderTest = {
        ok: false,
        error: folderErr instanceof Error ? folderErr.message : String(folderErr),
      };
    }

    return NextResponse.json({
      ok: true,
      email,
      keyInfo,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date,
      rootFolderId,
      folderTest,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        email,
        keyInfo,
        rootFolderId,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
