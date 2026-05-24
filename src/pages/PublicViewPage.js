// src/pages/PublicViewPage.js
// This page is accessible without login via a share link
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import LineageTree from "../components/LineageTree";
import DataViewer from "../components/DataViewer";
import DiffViewer from "../components/DiffViewer";
import { computeCSVDiff } from "../utils/csvDiff";

export default function PublicViewPage() {
  const { fileId } = useParams();
  const [repo, setRepo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [compareNode, setCompareNode] = useState(null);
  const [diff, setDiff] = useState(null);
  const [panel, setPanel] = useState("data");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.REACT_APP_GOOGLE_API_KEY}`
        );
        if (!res.ok) throw new Error("Could not load repository. The link may be invalid or the file is not public.");
        const data = await res.json();
        setRepo(data);
        if (data.nodes.length > 0) setSelectedNode(data.nodes[data.nodes.length - 1]);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fileId]);

  useEffect(() => {
    if (!selectedNode || !compareNode) { setDiff(null); return; }
    if (!selectedNode.csvData || !compareNode.csvData) { setDiff(null); return; }
    const d = computeCSVDiff(
      compareNode.csvData, selectedNode.csvData,
      compareNode.columns || [], selectedNode.columns || []
    );
    setDiff(d);
  }, [selectedNode, compareNode]);

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    if (repo && node.parentId) {
      const parent = repo.nodes.find(n => n.id === node.parentId);
      if (parent) setCompareNode(parent);
    }
    setPanel("data");
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#080c12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace", color: "#555" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "48px", marginBottom: "1rem" }}>📊</div>
        <div>Loading shared repository...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight: "100vh", background: "#080c12", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Mono', monospace" }}>
      <div style={{ textAlign: "center", maxWidth: "400px" }}>
        <div style={{ fontSize: "48px", marginBottom: "1rem" }}>⚠</div>
        <div style={{ color: "#ff6b6b", marginBottom: "1rem" }}>{error}</div>
        <div style={{ color: "#555", fontSize: "12px" }}>Make sure the repository owner has shared this link with you.</div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#080c12", color: "#e0e0e0", fontFamily: "'Space Mono', monospace" }}>
      {/* Banner */}
      <div style={{ background: "linear-gradient(135deg, #0d1117, #1a2a1a)", borderBottom: "1px solid #1a2f1a", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "20px" }}>📊</span>
          <div>
            <div style={{ fontSize: "14px", fontWeight: "bold" }}>{repo?.name}</div>
            <div style={{ fontSize: "11px", color: "#555" }}>Read-only · {repo?.nodes?.length || 0} commits · by {repo?.createdBy}</div>
          </div>
        </div>
        <div style={{ fontSize: "10px", background: "rgba(0,212,170,0.1)", border: "1px solid rgba(0,212,170,0.3)", borderRadius: "12px", padding: "3px 12px", color: "#00d4aa" }}>
          👁 View Only
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", height: "calc(100vh - 53px)", overflow: "hidden" }}>
        {/* Left panel */}
        <div style={{ borderRight: "1px solid #1a1f2e", padding: "1rem", overflowY: "auto", background: "#0a0e18" }}>
          <div style={{ fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.75rem" }}>Lineage Tree</div>
          <LineageTree nodes={repo?.nodes || []} selectedNodeId={selectedNode?.id} onSelectNode={handleNodeSelect} />

          {repo?.nodes?.length > 1 && selectedNode && (
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
                <option value="">— Select —</option>
                {repo.nodes.filter(n => n.id !== selectedNode?.id).map((n) => (
                  <option key={n.id} value={n.id}>{n.branchName} · {n.author?.split(" ")[0]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div style={{ overflowY: "auto", padding: "1.5rem" }}>
          <div style={{ display: "flex", gap: "4px", marginBottom: "1.5rem", borderBottom: "1px solid #1a1f2e", paddingBottom: "0" }}>
            {[{ key: "data", label: "📋 Data" }, { key: "diff", label: "↔ Diff", disabled: !compareNode }].map(({ key, label, disabled }) => (
              <button key={key} disabled={disabled} onClick={() => setPanel(key)} style={{ background: "none", border: "none", color: disabled ? "#333" : panel === key ? "#00d4aa" : "#666", borderBottom: panel === key ? "2px solid #00d4aa" : "2px solid transparent", padding: "8px 16px", cursor: disabled ? "default" : "pointer", fontFamily: "'Space Mono', monospace", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "-1px" }}>
                {label}
              </button>
            ))}
          </div>

          {panel === "data" && <DataViewer node={selectedNode} />}
          {panel === "diff" && diff && <DiffViewer diff={diff} oldData={compareNode?.csvData} newData={selectedNode?.csvData} oldNode={compareNode} newNode={selectedNode} />}
          {panel === "diff" && !diff && <div style={{ color: "#555", textAlign: "center", padding: "3rem" }}>Select two nodes to compare.</div>}
        </div>
      </div>
    </div>
  );
}
