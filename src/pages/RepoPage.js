// src/pages/RepoPage.js
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useDrive } from "../contexts/DriveContext";
import { useAuth } from "../contexts/AuthContext";
import LineageTree from "../components/LineageTree";
import DataViewer from "../components/DataViewer";
import DiffViewer from "../components/DiffViewer";
import CommitUpload from "../components/CommitUpload";
import { computeCSVDiff } from "../utils/csvDiff";

export default function RepoPage() {
  const { fileId } = useParams();
  const navigate = useNavigate();
  const { getRepo, addCommit } = useDrive();
  const { author, setAuthor, isIdentified } = useAuth();

  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [compareNode, setCompareNode] = useState(null);
  const [diff, setDiff] = useState(null);
  const [panel, setPanel] = useState("data");
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [commitParent, setCommitParent] = useState(null);
  const [error, setError] = useState(null);
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const r = await getRepo(fileId);
        setRepo(r);
        if (r.nodes.length > 0) setSelectedNode(r.nodes[r.nodes.length - 1]);
        setShareUrl(`${window.location.origin}/repo/${fileId}`);
      } catch (e) {
        setError("Could not load repository.");
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId, getRepo]);

  useEffect(() => {
    if (!selectedNode || !compareNode) { setDiff(null); return; }
    if (!selectedNode.csvData || !compareNode.csvData) { setDiff(null); return; }
    const d = computeCSVDiff(
      compareNode.csvData, selectedNode.csvData,
      compareNode.columns || [], selectedNode.columns || []
    );
    setDiff(d);
  }, [selectedNode, compareNode]);

  const handleNodeSelect = useCallback((node) => {
    setSelectedNode(node);
    if (repo && node.parentId) {
      const parent = repo.nodes.find(n => n.id === node.parentId);
      if (parent) setCompareNode(parent);
    } else {
      setCompareNode(null);
    }
    setPanel("data");
  }, [repo]);

  const handleCommit = useCallback(async (node) => {
    try {
      const updatedRepo = await addCommit(fileId, node);
      setRepo(updatedRepo);
      setSelectedNode(node);
      if (node.parentId) {
        const parent = updatedRepo.nodes.find(n => n.id === node.parentId);
        if (parent) setCompareNode(parent);
      }
      setPanel("data");
      setCommitParent(null);
    } catch (e) {
      setError("Failed to save commit: " + e.message);
    }
  }, [fileId, addCommit]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <LoadingScreen msg="Loading repository..." />;
  if (error) return <ErrorScreen msg={error} onBack={() => navigate("/")} />;
  if (!repo) return null;

  // If user hasn't set a name yet, show inline prompt
  if (!isIdentified) {
    return (
      <div style={{ minHeight: "100vh", background: "#080c12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace" }}>
        <div style={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "12px", padding: "2rem", maxWidth: "380px", width: "90%", textAlign: "center" }}>
          <div style={{ fontSize: "40px", marginBottom: "1rem" }}>👤</div>
          <div style={{ color: "#e0e0e0", fontSize: "14px", marginBottom: "0.5rem" }}>Enter your name to contribute</div>
          <div style={{ color: "#555", fontSize: "11px", marginBottom: "1.5rem" }}>Your name will appear on commits you make to <span style={{ color: "#00d4aa" }}>{repo.name}</span></div>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && nameInput.trim() && setAuthor(nameInput)}
              placeholder="Your name"
              style={{ flex: 1, background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: "6px", color: "#e0e0e0", padding: "8px 12px", fontFamily: "'Space Mono', monospace", fontSize: "12px", outline: "none" }}
              autoFocus
            />
            <button
              onClick={() => nameInput.trim() && setAuthor(nameInput)}
              style={{ background: "linear-gradient(135deg,#00d4aa,#00b894)", border: "none", borderRadius: "6px", color: "#000", padding: "8px 16px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontWeight: "bold", fontSize: "12px" }}
            >
              Go →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#080c12", color: "#e0e0e0", fontFamily: "'Space Mono', monospace" }}>
      {/* Top bar */}
      <div style={{ background: "#0d1117", borderBottom: "1px solid #1a1f2e", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <button onClick={() => navigate("/")} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: "20px", padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: "14px", fontWeight: "bold", color: "#e0e0e0" }}>📊 {repo.name}</div>
          <div style={{ fontSize: "11px", color: "#555" }}>{repo.description} · {repo.nodes.length} commits · by {repo.createdBy}</div>
        </div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px", alignItems: "center" }}>
          {/* Author badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "#1a1f2e", borderRadius: "20px", padding: "4px 12px" }}>
            <div style={{ width: 18, height: 18, borderRadius: "50%", background: "linear-gradient(135deg,#00d4aa,#6bcb77)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "bold", color: "#000" }}>
              {author[0].toUpperCase()}
            </div>
            <span style={{ color: "#aaa", fontSize: "11px" }}>{author}</span>
          </div>
          <button onClick={copyShareLink} style={{ background: "none", border: "1px solid #2a2f3e", borderRadius: "6px", color: copied ? "#00d4aa" : "#666", padding: "6px 12px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "11px" }}>
            {copied ? "✓ Copied!" : "🔗 Share"}
          </button>
          <button
            onClick={() => { setCommitParent(selectedNode); setPanel("commit"); }}
            style={{ background: "linear-gradient(135deg, #00d4aa, #00b894)", border: "none", borderRadius: "6px", color: "#000", padding: "6px 14px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "11px", fontWeight: "bold" }}
          >
            + New Commit
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "calc(100vh - 57px)", overflow: "hidden" }}>
        {/* Left: lineage tree */}
        <div style={{ borderRight: "1px solid #1a1f2e", padding: "1rem", overflowY: "auto", background: "#0a0e18" }}>
          <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.75rem" }}>Lineage Tree</div>
          <LineageTree nodes={repo.nodes} selectedNodeId={selectedNode?.id} onSelectNode={handleNodeSelect} />

          {repo.nodes.length > 1 && selectedNode && (
            <div style={{ marginTop: "1.5rem" }}>
              <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.5rem" }}>Compare With</div>
              <select
                value={compareNode?.id || ""}
                onChange={(e) => {
                  const node = repo.nodes.find(n => n.id === e.target.value);
                  setCompareNode(node || null);
                  if (node) setPanel("diff");
                }}
                style={{ width: "100%", background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "6px", color: "#aaa", padding: "6px 8px", fontFamily: "'Space Mono', monospace", fontSize: "11px" }}
              >
                <option value="">— Select a node —</option>
                {repo.nodes.filter(n => n.id !== selectedNode?.id).map((n) => (
                  <option key={n.id} value={n.id}>{n.branchName} · {n.author?.split(" ")[0]} · {new Date(n.timestamp).toLocaleDateString()}</option>
                ))}
              </select>
              {compareNode && (
                <button onClick={() => setPanel("diff")} style={{ marginTop: "8px", width: "100%", background: "rgba(255,107,107,0.1)", border: "1px solid #ff6b6b", borderRadius: "6px", color: "#ff6b6b", padding: "6px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "11px" }}>
                  View Diff
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right: content panels */}
        <div style={{ overflowY: "auto", padding: "1.5rem" }}>
          {panel !== "commit" && (
            <div style={{ display: "flex", gap: "4px", marginBottom: "1.5rem", borderBottom: "1px solid #1a1f2e" }}>
              {[
                { key: "data", label: "📋 Data" },
                { key: "diff", label: "↔ Diff", disabled: !compareNode },
              ].map(({ key, label, disabled }) => (
                <button key={key} disabled={disabled} onClick={() => setPanel(key)} style={{ background: "none", border: "none", color: disabled ? "#333" : panel === key ? "#00d4aa" : "#666", borderBottom: panel === key ? "2px solid #00d4aa" : "2px solid transparent", padding: "8px 16px", cursor: disabled ? "default" : "pointer", fontFamily: "'Space Mono', monospace", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "-1px" }}>
                  {label}
                </button>
              ))}
            </div>
          )}

          {panel === "commit" && (
            <div>
              <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem" }}>
                New Commit {commitParent && `· branching from: ${commitParent.branchName}`}
              </div>
              <CommitUpload parentNode={commitParent} allNodes={repo.nodes} onCommit={handleCommit} onCancel={() => setPanel("data")} author={author} />
            </div>
          )}

          {panel === "data" && selectedNode && <DataViewer node={selectedNode} />}

          {panel === "data" && !selectedNode && (
            <EmptyState onCommit={() => { setCommitParent(null); setPanel("commit"); }} />
          )}

          {panel === "diff" && diff && selectedNode && compareNode && (
            <DiffViewer diff={diff} oldData={compareNode.csvData} newData={selectedNode.csvData} oldNode={compareNode} newNode={selectedNode} />
          )}

          {panel === "diff" && !diff && (
            <div style={{ color: "#555", textAlign: "center", padding: "3rem" }}>
              {!compareNode ? "Select a node to compare." : "Computing diff..."}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ onCommit }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 2rem" }}>
      <div style={{ fontSize: "60px", marginBottom: "1.5rem" }}>🌱</div>
      <div style={{ color: "#ccc", fontSize: "16px", marginBottom: "0.5rem" }}>This repository is empty</div>
      <div style={{ color: "#555", fontSize: "12px", marginBottom: "2rem" }}>Upload the first CSV to start the lineage</div>
      <button onClick={onCommit} style={{ background: "linear-gradient(135deg, #00d4aa, #00b894)", border: "none", borderRadius: "8px", color: "#000", padding: "12px 28px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontWeight: "bold", fontSize: "13px" }}>
        Upload First CSV
      </button>
    </div>
  );
}

function LoadingScreen({ msg }) {
  return (
    <div style={{ minHeight: "100vh", background: "#080c12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace", color: "#555" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "1rem" }}>⟳</div>
        <div>{msg}</div>
      </div>
    </div>
  );
}

function ErrorScreen({ msg, onBack }) {
  return (
    <div style={{ minHeight: "100vh", background: "#080c12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "40px", marginBottom: "1rem" }}>⚠</div>
        <div style={{ color: "#ff6b6b", marginBottom: "1.5rem" }}>{msg}</div>
        <button onClick={onBack} style={{ background: "none", border: "1px solid #2a2f3e", borderRadius: "6px", color: "#666", padding: "8px 20px", cursor: "pointer", fontFamily: "'Space Mono', monospace" }}>← Back</button>
      </div>
    </div>
  );
}
