import { google } from "googleapis";

function getPrivateKey(): string {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ?? "";
  // Vercel 환경에 따라 literal \n 또는 실제 줄바꿈 둘 다 처리
  return raw.includes("\\n") ? raw.replace(/\\n/g, "\n") : raw;
}

function getEmail(): string {
  return (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "").trim();
}

export function getRootFolderId(): string {
  return (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? "").trim();
}

export function getDriveClient() {
  const auth = new google.auth.JWT({
    email: getEmail(),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

// 이름으로 폴더 찾기, 없으면 생성 → 폴더 ID 반환
export async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDriveClient();

  const res = await drive.files.list({
    q: `name='${name}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  const folder = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
    supportsAllDrives: true,
  });

  return folder.data.id!;
}

// 파일 업로드 → { fileId, webViewLink }
export async function uploadFile(
  buffer: Buffer,
  fileName: string,
  mimeType: string,
  parentFolderId: string
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient();
  const { Readable } = await import("stream");
  const stream = Readable.from(buffer);

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [parentFolderId],
    },
    media: {
      mimeType,
      body: stream,
    },
    fields: "id, webViewLink",
    supportsAllDrives: true,
  });

  return {
    fileId: res.data.id!,
    webViewLink: res.data.webViewLink ?? "",
  };
}

// Drive 폴더에서 파일 이름으로 검색 → { fileId, webViewLink } 또는 null
export async function findFileInFolder(
  fileName: string,
  folderId: string
): Promise<{ fileId: string; webViewLink: string } | null> {
  const drive = getDriveClient();
  const res = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id, webViewLink)",
    spaces: "drive",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
  });
  if (!res.data.files || res.data.files.length === 0) return null;
  return {
    fileId: res.data.files[0].id!,
    webViewLink: res.data.files[0].webViewLink ?? `https://drive.google.com/file/d/${res.data.files[0].id}/view`,
  };
}

// Resumable upload session URL 생성 → 클라이언트가 직접 Drive에 업로드할 수 있도록
export async function createResumableUploadSession(
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<string> {
  const jwtClient = new google.auth.JWT({
    email: getEmail(),
    key: getPrivateKey(),
    scopes: ["https://www.googleapis.com/auth/drive"],
  });

  await jwtClient.authorize();
  const token = jwtClient.credentials.access_token;
  if (!token) throw new Error("액세스 토큰을 가져올 수 없습니다.");

  const authHeaders = { Authorization: `Bearer ${token}` };

  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        ...authHeaders,
        "Content-Type": "application/json",
        "X-Upload-Content-Type": mimeType,
      },
      body: JSON.stringify({
        name: fileName,
        parents: [folderId],
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resumable upload session 생성 실패: ${err}`);
  }

  const uploadUrl = res.headers.get("Location");
  if (!uploadUrl) throw new Error("Location 헤더가 없습니다.");
  return uploadUrl;
}
