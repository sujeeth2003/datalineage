// src/components/LineageTree.js
import React, { useMemo } from "react";

const BRANCH_COLORS = [
  "#00d4aa", "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff",
  "#ff9f43", "#a29bfe", "#fd79a8", "#55efc4", "#fdcb6e",
];

function getBranchColor(branchName, allBranches) {
  const idx = allBranches.indexOf(branchName);
  return BRANCH_COLORS[idx % BRANCH_COLORS.length];
}

export default function LineageTree({ nodes, selectedNodeId, onSelectNode }) {
  const { layout, allBranches } = useMemo(() => {
    if (!nodes || nodes.length === 0) return { layout: [], allBranches: [] };

    // Build adjacency
    const childrenMap = {};
    const parentMap = {};
    for (const node of nodes) {
      parentMap[node.id] = node.parentId;
      if (node.parentId) {
        childrenMap[node.parentId] = childrenMap[node.parentId] || [];
        childrenMap[node.parentId].push(node.id);
      }
    }

    // Assign branch lanes
    const branchLane = {};
    const allBranchNames = [...new Set(nodes.map((n) => n.branchName))];
    allBranchNames.forEach((b, i) => (branchLane[b] = i));

    // Layout: x = lane, y = time order
    const layout = nodes.map((node, index) => ({
      ...node,
      x: (branchLane[node.branchName] || 0) * 160 + 60,
      y: index * 90 + 40,
      color: getBranchColor(node.branchName, allBranchNames),
    }));

    return { layout, allBranches: allBranchNames };
  }, [nodes]);

  if (!nodes || nodes.length === 0) {
    return (
      <div style={{ color: "#666", padding: "2rem", textAlign: "center", fontFamily: "'Space Mono', monospace" }}>
        No commits yet. Upload the first CSV to get started.
      </div>
    );
  }

  const svgWidth = Math.max(...layout.map((n) => n.x)) + 120;
  const svgHeight = Math.max(...layout.map((n) => n.y)) + 60;

  // Build edges
  const edges = [];
  const nodeMap = {};
  for (const n of layout) nodeMap[n.id] = n;
  for (const n of layout) {
    if (n.parentId && nodeMap[n.parentId]) {
      const parent = nodeMap[n.parentId];
      edges.push({ x1: parent.x, y1: parent.y, x2: n.x, y2: n.y, color: n.color });
    }
  }

  return (
    <div style={{ overflowX: "auto", overflowY: "auto", maxHeight: "600px", background: "#0d1117", borderRadius: "12px", padding: "1rem" }}>
      {/* Branch labels */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem", paddingLeft: "20px", flexWrap: "wrap" }}>
        {allBranches.map((b) => (
          <div
            key={b}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "12px",
              fontFamily: "'Space Mono', monospace",
              color: "#ccc",
            }}
          >
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: getBranchColor(b, allBranches) }} />
            {b}
          </div>
        ))}
      </div>

      <svg width={svgWidth} height={svgHeight} style={{ minWidth: "300px" }}>
        {/* Edges */}
        {edges.map((e, i) => (
          <line
            key={i}
            x1={e.x1}
            y1={e.y1}
            x2={e.x2}
            y2={e.y2}
            stroke={e.color}
            strokeWidth={2}
            strokeOpacity={0.5}
            strokeDasharray={e.x1 !== e.x2 ? "4,3" : "none"}
          />
        ))}

        {/* Nodes */}
        {layout.map((node) => {
          const isSelected = node.id === selectedNodeId;
          return (
            <g key={node.id} onClick={() => onSelectNode(node)} style={{ cursor: "pointer" }}>
              <circle
                cx={node.x}
                cy={node.y}
                r={isSelected ? 16 : 12}
                fill={isSelected ? node.color : "#1a1f2e"}
                stroke={node.color}
                strokeWidth={isSelected ? 3 : 2}
                style={{ transition: "all 0.2s" }}
              />
              {isSelected && (
                <circle cx={node.x} cy={node.y} r={20} fill="none" stroke={node.color} strokeWidth={1} strokeOpacity={0.4} />
              )}
              {/* Branch name badge */}
              <rect
                x={node.x + 20}
                y={node.y - 10}
                width={Math.min(node.branchName.length * 7 + 8, 120)}
                height={20}
                rx={4}
                fill="#1a1f2e"
                stroke={node.color}
                strokeWidth={1}
                strokeOpacity={0.5}
              />
              <text
                x={node.x + 24}
                y={node.y + 4}
                fill={node.color}
                fontSize="10"
                fontFamily="'Space Mono', monospace"
                style={{ userSelect: "none" }}
              >
                {node.branchName.length > 14 ? node.branchName.slice(0, 13) + "…" : node.branchName}
              </text>
              {/* Author */}
              <text
                x={node.x + 20}
                y={node.y + 22}
                fill="#666"
                fontSize="9"
                fontFamily="'Space Mono', monospace"
                style={{ userSelect: "none" }}
              >
                {node.author?.split(" ")[0] || "anon"} · {node.rowCount}r
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
