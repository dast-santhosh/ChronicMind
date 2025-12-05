import { google } from "googleapis";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? "repl " + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? "depl " + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error("X_REPLIT_TOKEN not found for repl/depl");
  }

  connectionSettings = await fetch(
    "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=google-drive",
    {
      headers: {
        "Accept": "application/json",
        "X_REPLIT_TOKEN": xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error("Google Drive not connected");
  }
  return accessToken;
}

export async function getUncachableGoogleDriveClient() {
  const accessToken = await getAccessToken();

  const oauth2Client = new google.auth.OAuth2();
  oauth2Client.setCredentials({
    access_token: accessToken
  });

  return google.drive({ version: "v3", auth: oauth2Client });
}

export async function ensureChronoMindFolder(): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();
  
  const searchResponse = await drive.files.list({
    q: "name='ChronoMindMemory' and mimeType='application/vnd.google-apps.folder' and trashed=false",
    fields: "files(id, name)",
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    return searchResponse.data.files[0].id!;
  }

  const createResponse = await drive.files.create({
    requestBody: {
      name: "ChronoMindMemory",
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return createResponse.data.id!;
}

export async function saveFileToDrive(folderId: string, fileName: string, content: string): Promise<string> {
  const drive = await getUncachableGoogleDriveClient();

  const searchResponse = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id, name)",
  });

  if (searchResponse.data.files && searchResponse.data.files.length > 0) {
    const fileId = searchResponse.data.files[0].id!;
    await drive.files.update({
      fileId,
      media: {
        mimeType: "application/json",
        body: content,
      },
    });
    return fileId;
  }

  const createResponse = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType: "application/json",
      body: content,
    },
    fields: "id",
  });

  return createResponse.data.id!;
}

export async function readFileFromDrive(folderId: string, fileName: string): Promise<string | null> {
  const drive = await getUncachableGoogleDriveClient();

  const searchResponse = await drive.files.list({
    q: `name='${fileName}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id, name)",
  });

  if (!searchResponse.data.files || searchResponse.data.files.length === 0) {
    return null;
  }

  const fileId = searchResponse.data.files[0].id!;
  const response = await drive.files.get({
    fileId,
    alt: "media",
  });

  return response.data as string;
}

export async function isDriveConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
