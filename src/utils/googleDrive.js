// src/utils/googleDrive.js
// All writes go through /api/drive (your OAuth token on the server).
// Reads use the public Drive URL since all repo files are made public.

const API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

async function api(action, payload = {}) {
  const res = await fetch("/api/drive", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
}

export async function loadManifest() {
  return api("loadManifest");
}

export async function createRepo({ name, description, author }) {
  return api("createRepo", { name, description, author });
}

export async function addCommitToRepo(fileId, node) {
  return api("addCommit", { fileId, node });
}

// Public read — file was made public on creation, no auth needed
export async function readPublicJsonFile(fileId) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${API_KEY}`
  );
  if (!res.ok) throw new Error("Failed to read repo");
  return res.json();
}
