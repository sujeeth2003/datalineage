// src/pages/HomePage.js
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useDrive } from "../contexts/DriveContext";

export default function HomePage() {
  const navigate = useNavigate();
  const { author, setAuthor, clearAuthor, isIdentified } = useAuth();
  const { repos, loadingDrive, createNewRepo } = useDrive();

  const [nameInput, setNameInput] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRepoName, setNewRepoName] = useState("");
  const [newRepoDesc, setNewRepoDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSetName = () => {
    if (!nameInput.trim()) return;
    setAuthor(nameInput.trim());
  };

  const handleCreate = async () => {
    if (!newRepoName.trim()) { setError("Repository name required"); return; }
    setSaving(true);
    setError(null);
    try {
      const { fileId } = await createNewRepo({ name: newRepoName.trim(), description: newRepoDesc.trim(), author });
      navigate(`/repo/${fileId}`);
    } catch (e) {
      setError("Failed to create: " + e.message);
      setSaving(false);
    }
  };

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ fontSize: "22px" }}>🌿</div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#00d4aa", fontFamily: "'Space Mono', monospace" }}>DataLineage</div>
            <div style={{ fontSize: "10px", color: "#555", fontFamily: "'Space Mono', monospace" }}>CSV Version Control</div>
          </div>
        </div>
        {isIdentified && (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg,#00d4aa,#6bcb77)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold", color: "#000" }}>
              {author[0].toUpperCase()}
            </div>
            <span style={{ color: "#aaa", fontSize: "12px", fontFamily: "'Space Mono', monospace" }}>{author}</span>
            <button onClick={clearAuthor} style={ghostBtnStyle}>Change name</button>
          </div>
        )}
      </div>

      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "2rem 1rem" }}>
        {/* Name prompt if not identified */}
        {!isIdentified && (
          <NamePrompt nameInput={nameInput} setNameInput={setNameInput} onSubmit={handleSetName} />
        )}

        {isIdentified && (
          <div>
            {/* Create repo */}
            <div style={{ marginBottom: "2rem" }}>
              {!creating ? (
                <button onClick={() => setCreating(true)} style={primaryBtnStyle}>
                  + New Repository
                </button>
              ) : (
                <div style={cardStyle}>
                  <div style={{ fontSize: "13px", color: "#00d4aa", marginBottom: "1rem", fontFamily: "'Space Mono', monospace" }}>Create New Repository</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div>
                      <label style={labelStyle}>Repository Name *</label>
                      <input value={newRepoName} onChange={e => setNewRepoName(e.target.value)} placeholder="e.g. sustainability-emissions-2024" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Description</label>
                      <input value={newRepoDesc} onChange={e => setNewRepoDesc(e.target.value)} placeholder="What data does this track?" style={inputStyle} />
                    </div>
                    {error && <div style={{ color: "#ff6b6b", fontSize: "12px", fontFamily: "'Space Mono', monospace" }}>{error}</div>}
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button onClick={handleCreate} disabled={saving} style={primaryBtnStyle}>
                        {saving ? "Creating..." : "Create Repository"}
                      </button>
                      <button onClick={() => { setCreating(false); setError(null); }} style={ghostBtnStyle}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Repos list */}
            <div>
              <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", fontFamily: "'Space Mono', monospace" }}>
                All Repositories ({repos.length})
              </div>
              {loadingDrive ? (
                <div style={{ color: "#555", fontFamily: "'Space Mono', monospace", fontSize: "12px" }}>Loading...</div>
              ) : repos.length === 0 ? (
                <div style={{ color: "#555", fontFamily: "'Space Mono', monospace", fontSize: "12px", textAlign: "center", padding: "3rem 0" }}>
                  No repositories yet. Create one to get started.
                </div>
              ) : (
                <div style={{ display: "grid", gap: "1rem" }}>
                  {repos.map((repo) => (
                    <RepoCard key={repo.id} repo={repo} onClick={() => navigate(`/repo/${repo.fileId}`)} />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NamePrompt({ nameInput, setNameInput, onSubmit }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <div style={{ fontSize: "64px", marginBottom: "1.5rem" }}>🌿</div>
      <h1 style={{ fontFamily: "'Space Mono', monospace", fontSize: "clamp(22px, 4vw, 32px)", fontWeight: "bold", background: "linear-gradient(135deg, #00d4aa, #6bcb77)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: "0.75rem" }}>
        DataLineage
      </h1>
      <p style={{ color: "#666", fontFamily: "'Space Mono', monospace", fontSize: "12px", maxWidth: "440px", margin: "0 auto 2.5rem", lineHeight: "1.8" }}>
        Git-style version control for CSV data files. No account needed — just enter your name to start contributing.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", maxWidth: "660px", margin: "0 auto 3rem", textAlign: "left" }}>
        {[
          { icon: "🌿", title: "Branching Lineage", desc: "Fork from any commit, track multiple pipelines" },
          { icon: "↔", title: "Auto Diffs", desc: "See exactly what changed between versions" },
          { icon: "📈", title: "Visual Charts", desc: "Visualize distributions and stat shifts" },
          { icon: "🔗", title: "Shareable Links", desc: "Share any repo — no account required" },
        ].map((f) => (
          <div key={f.title} style={{ background: "#0d1117", border: "1px solid #1a1f2e", borderRadius: "10px", padding: "1rem" }}>
            <div style={{ fontSize: "22px", marginBottom: "8px" }}>{f.icon}</div>
            <div style={{ color: "#ccc", fontSize: "12px", fontFamily: "'Space Mono', monospace", fontWeight: "bold", marginBottom: "4px" }}>{f.title}</div>
            <div style={{ color: "#555", fontSize: "11px", fontFamily: "'Space Mono', monospace", lineHeight: "1.5" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: "360px", margin: "0 auto" }}>
        <label style={{ ...labelStyle, textAlign: "left", display: "block", marginBottom: "8px" }}>Your name (shows on commits)</label>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            value={nameInput}
            onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && onSubmit()}
            placeholder="e.g. Sujeeth"
            style={{ ...inputStyle, flex: 1 }}
            autoFocus
          />
          <button onClick={onSubmit} disabled={!nameInput.trim()} style={primaryBtnStyle}>
            Enter →
          </button>
        </div>
      </div>
    </div>
  );
}

function RepoCard({ repo, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{ background: "#0d1117", border: "1px solid #1a1f2e", borderRadius: "10px", padding: "1.25rem 1.5rem", cursor: "pointer", fontFamily: "'Space Mono', monospace", transition: "border-color 0.2s" }}
      onMouseEnter={e => e.currentTarget.style.borderColor = "#00d4aa"}
      onMouseLeave={e => e.currentTarget.style.borderColor = "#1a1f2e"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ color: "#00d4aa", fontSize: "13px", marginBottom: "4px" }}>📊 {repo.name}</div>
          <div style={{ color: "#555", fontSize: "11px", marginBottom: "8px" }}>{repo.description || "No description"}</div>
          <div style={{ color: "#444", fontSize: "10px" }}>
            Created by {repo.createdBy} · {new Date(repo.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div style={{ color: "#2a2f3e", fontSize: "18px" }}>→</div>
      </div>
    </div>
  );
}

const pageStyle = { minHeight: "100vh", background: "#080c12", color: "#e0e0e0" };
const headerStyle = { background: "#0d1117", borderBottom: "1px solid #1a1f2e", padding: "0.75rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between" };
const cardStyle = { background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "12px", padding: "1.5rem" };
const labelStyle = { display: "block", fontSize: "10px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px", fontFamily: "'Space Mono', monospace" };
const inputStyle = { width: "100%", background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: "6px", color: "#e0e0e0", padding: "8px 12px", fontFamily: "'Space Mono', monospace", fontSize: "12px", boxSizing: "border-box", outline: "none" };
const primaryBtnStyle = { background: "linear-gradient(135deg, #00d4aa, #00b894)", border: "none", borderRadius: "8px", color: "#000", padding: "10px 22px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontWeight: "bold", fontSize: "12px" };
const ghostBtnStyle = { background: "none", border: "1px solid #2a2f3e", borderRadius: "6px", color: "#666", padding: "6px 14px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "11px" };
