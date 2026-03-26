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

  try {
    const jwtClient = new google.auth.JWT({
      email,
      key,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });
    const tokens = await jwtClient.authorize();

    return NextResponse.json({
      ok: true,
      email,
      keyInfo,
      tokenType: tokens.token_type,
      expiryDate: tokens.expiry_date,
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        email,
        keyInfo,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
