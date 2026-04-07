import { google } from "googleapis";

function getSheetsClient() {
  const auth = new google.auth.JWT({
    email: (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "").trim(),
    key: (() => {
      const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
      return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
    })(),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

// commonValues: [신청자, 앨범명, 신청일시, 진행현황, 드라이브링크]
// songs: 곡제목 배열 — 곡마다 한 행씩 추가, NO.는 순차 증가
export async function appendSheetRows(commonValues: string[], songs: string[]): Promise<void> {
  const sheets = getSheetsClient();
  const spreadsheetId = (process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "").trim();

  const existing = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "A:A",
  });
  const baseNo = existing.data.values?.length ?? 1;

  const rows = songs.map((song, i) => {
    const [userLabel, projectName, now, status, driveLink] = commonValues;
    return [String(baseNo + i), userLabel, projectName, song, now, status, driveLink];
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: "A1",
    valueInputOption: "RAW",
    requestBody: { values: rows },
  });
}
