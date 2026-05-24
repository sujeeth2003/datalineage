// api/drive.js — Vercel Serverless Function
//
// Uses YOUR Google account via a stored refresh token.
// Files are saved in YOUR Drive — no service account, no quota issues.
// Run get_refresh_token.py once locally to generate GOOGLE_REFRESH_TOKEN.

const { google } = require("googleapis");
const { Readable } = require("stream");

const FOLDER_NAME  = "DataLineage";
const MANIFEST_FILE = "manifest.json";

// ── Auth: your account via refresh token ─────────────────────────────────────

function getOAuthClient() {
  const clientId     = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      "Missing env vars. Need: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN"
    );
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return oauth2;
}

function getDrive() {
  return google.drive({ version: "v3", auth: getOAuthClient() });
}

// ── Folder: find or create DataLineage folder in your Drive ──────────────────

async function getOrCreateFolder(drive) {
  // Check if we already have the folder ID cached in env
  if (process.env.GOOGLE_DRIVE_FOLDER_ID) {
    return process.env.GOOGLE_DRIVE_FOLDER_ID;
  }

  // Search for existing folder
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });

  if (res.data.files.length > 0) return res.data.files[0].id;

  // Create it in YOUR Drive (no parents = root of your Drive)
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: "application/vnd.google-apps.folder",
    },
    fields: "id",
  });

  return folder.data.id;
}

// ── File helpers ──────────────────────────────────────────────────────────────

async function findFile(drive, folderId, filename) {
  const res = await drive.files.list({
    q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });
  return res.data.files[0] || null;
}

async function readJson(drive, fileId) {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "json" }
  );
  return res.data;
}

async function createFile(drive, folderId, filename, data) {
  const res = await drive.files.create({
    fields: "id",
    requestBody: {
      name: filename,
      parents: [folderId],
      mimeType: "application/json",
    },
    media: {
      mimeType: "application/json",
      body: Readable.from([JSON.stringify(data)]),
    },
  });

  // Make publicly readable so frontend can fetch without auth
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: "reader", type: "anyone" },
  });

  return { id: res.data.id };
}

async function updateFile(drive, fileId, data) {
  await drive.files.update({
    fileId,
    media: {
      mimeType: "application/json",
      body: Readable.from([JSON.stringify(data)]),
    },
  });
  return { id: fileId };
}

// ── Manifest ──────────────────────────────────────────────────────────────────

async function loadManifestInternal(drive, folderId) {
  const file = await findFile(drive, folderId, MANIFEST_FILE);
  if (!file) return { repos: [] };
  return readJson(drive, file.id);
}

async function saveManifest(drive, folderId, manifest) {
  const file = await findFile(drive, folderId, MANIFEST_FILE);
  if (file) return updateFile(drive, file.id, manifest);
  return createFile(drive, folderId, MANIFEST_FILE, manifest);
}

// ── Action handlers ───────────────────────────────────────────────────────────

async function handleLoadManifest(drive) {
  const folderId = await getOrCreateFolder(drive);
  return loadManifestInternal(drive, folderId);
}

async function handleCreateRepo(drive, { name, description, author }) {
  const { v4: uuidv4 } = require("uuid");
  const folderId = await getOrCreateFolder(drive);

  const id  = uuidv4();
  const now = new Date().toISOString();
  const repo = { id, name, description, createdAt: now, createdBy: author, nodes: [] };

  const file = await createFile(drive, folderId, `${id}.json`, repo);

  const manifest = await loadManifestInternal(drive, folderId);
  manifest.repos.push({ id, name, description, createdAt: now, createdBy: author, fileId: file.id });
  await saveManifest(drive, folderId, manifest);

  return { repo, fileId: file.id };
}

async function handleAddCommit(drive, { fileId, node }) {
  const repo = await readJson(drive, fileId);
  repo.nodes.push(node);
  await updateFile(drive, fileId, repo);
  return repo;
}

async function handleGetRepo(drive, { fileId }) {
  return readJson(drive, fileId);
}

// ── Main handler ──────────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
  const { action, ...payload } = body;

  try {
    const drive = getDrive();
    let result;
    switch (action) {
      case "loadManifest": result = await handleLoadManifest(drive); break;
      case "createRepo":   result = await handleCreateRepo(drive, payload); break;
      case "addCommit":    result = await handleAddCommit(drive, payload); break;
      case "getRepo":      result = await handleGetRepo(drive, payload); break;
      default: return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error("[drive api]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
