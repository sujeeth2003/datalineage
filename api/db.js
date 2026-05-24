// api/db.js — Vercel Serverless Function
// Uses Supabase (free Postgres) instead of Google Drive
// No service account needed, no quota issues

const { createClient } = require("@supabase/supabase-js");

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set");
  return createClient(url, key);
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function handleLoadManifest(sb) {
  const { data, error } = await sb
    .from("repos")
    .select("id, name, description, created_at, created_by, file_id")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return {
    repos: data.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      createdAt: r.created_at,
      createdBy: r.created_by,
      fileId: r.file_id,
    })),
  };
}

async function handleCreateRepo(sb, { name, description, author }) {
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const repo = { id, name, description, createdAt: now, createdBy: author, nodes: [] };

  // Insert into repos table
  const { error: repoErr } = await sb.from("repos").insert({
    id,
    name,
    description,
    created_at: now,
    created_by: author,
    file_id: id,   // file_id == id for Supabase (no separate Drive file)
    data: repo,
  });
  if (repoErr) throw new Error(repoErr.message);

  return { repo, fileId: id };
}

async function handleAddCommit(sb, { fileId, node }) {
  // Read current repo
  const { data, error } = await sb
    .from("repos")
    .select("data")
    .eq("id", fileId)
    .single();
  if (error) throw new Error(error.message);

  const repo = data.data;
  repo.nodes.push(node);

  const { error: upErr } = await sb
    .from("repos")
    .update({ data: repo })
    .eq("id", fileId);
  if (upErr) throw new Error(upErr.message);

  return repo;
}

async function handleGetRepo(sb, { fileId }) {
  const { data, error } = await sb
    .from("repos")
    .select("data")
    .eq("id", fileId)
    .single();
  if (error) throw new Error(error.message);
  return data.data;
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
    const sb = getSupabase();
    let result;
    switch (action) {
      case "loadManifest": result = await handleLoadManifest(sb); break;
      case "createRepo":   result = await handleCreateRepo(sb, payload); break;
      case "addCommit":    result = await handleAddCommit(sb, payload); break;
      case "getRepo":      result = await handleGetRepo(sb, payload); break;
      default: return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    return res.status(200).json(result);
  } catch (err) {
    console.error("[db api]", err.message);
    return res.status(500).json({ error: err.message });
  }
};
