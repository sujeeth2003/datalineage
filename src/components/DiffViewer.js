// src/components/DiffViewer.js
import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import { buildComparisonChartData, buildDistributionData } from "../utils/csvDiff";

const BEFORE_COLOR = "#ff6b6b";
const AFTER_COLOR = "#00d4aa";

export default function DiffViewer({ diff, oldData, newData, oldNode, newNode }) {
  const [activeTab, setActiveTab] = useState("summary");
  const [selectedColumn, setSelectedColumn] = useState(null);

  const chartData = useMemo(() => buildComparisonChartData(diff), [diff]);
  const numericCols = useMemo(() => Object.entries(diff.statsChanges).filter(([, s]) => s.isNumeric).map(([c]) => c), [diff]);
  const catCols = useMemo(() => Object.entries(diff.statsChanges).filter(([, s]) => !s.isNumeric).map(([c]) => c), [diff]);

  const distData = useMemo(() => {
    if (!selectedColumn || !oldData || !newData) return null;
    return {
      old: buildDistributionData(oldData, selectedColumn),
      new: buildDistributionData(newData, selectedColumn),
    };
  }, [selectedColumn, oldData, newData]);

  const tabs = ["summary", "columns", "charts", "rows"];

  return (
    <div style={{ fontFamily: "'Space Mono', monospace", color: "#e0e0e0" }}>
      {/* Diff header */}
      <div style={{
        background: "linear-gradient(135deg, #1a1f2e 0%, #0d1117 100%)",
        border: "1px solid #2a2f3e",
        borderRadius: "12px",
        padding: "1.5rem",
        marginBottom: "1rem",
      }}>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <CommitBadge node={oldNode} color={BEFORE_COLOR} label="BEFORE" />
          <div style={{ fontSize: "20px", color: "#555" }}>→</div>
          <CommitBadge node={newNode} color={AFTER_COLOR} label="AFTER" />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "1rem", borderBottom: "1px solid #2a2f3e", paddingBottom: "0" }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              background: "none",
              border: "none",
              color: activeTab === t ? "#00d4aa" : "#666",
              borderBottom: activeTab === t ? "2px solid #00d4aa" : "2px solid transparent",
              padding: "8px 16px",
              cursor: "pointer",
              fontFamily: "'Space Mono', monospace",
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "-1px",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Summary tab */}
      {activeTab === "summary" && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
            <StatCard label="Rows Before" value={diff.summary.oldRowCount} color="#aaa" />
            <StatCard label="Rows After" value={diff.summary.newRowCount} color={AFTER_COLOR} />
            <StatCard label="Row Delta" value={diff.summary.rowDelta >= 0 ? `+${diff.summary.rowDelta}` : diff.summary.rowDelta} color={diff.summary.rowDelta >= 0 ? AFTER_COLOR : BEFORE_COLOR} />
            <StatCard label="Added Rows" value={diff.rowChanges.added} color={AFTER_COLOR} />
            <StatCard label="Removed Rows" value={diff.rowChanges.removed} color={BEFORE_COLOR} />
            <StatCard label="Modified Rows" value={diff.rowChanges.modified} color="#ffd93d" />
            <StatCard label="New Columns" value={diff.addedColumns.length} color={AFTER_COLOR} />
            <StatCard label="Dropped Columns" value={diff.removedColumns.length} color={BEFORE_COLOR} />
          </div>

          {diff.addedColumns.length > 0 && (
            <ChipList label="New Columns" items={diff.addedColumns} color={AFTER_COLOR} />
          )}
          {diff.removedColumns.length > 0 && (
            <ChipList label="Dropped Columns" items={diff.removedColumns} color={BEFORE_COLOR} />
          )}
        </div>
      )}

      {/* Columns tab */}
      {activeTab === "columns" && (
        <div>
          {numericCols.map((col) => {
            const s = diff.statsChanges[col];
            return (
              <div key={col} style={{ marginBottom: "1rem", background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ color: "#00d4aa", fontWeight: "bold" }}>{col}</span>
                  <span style={{ color: "#555", fontSize: "11px" }}>NUMERIC</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
                  {["mean", "min", "max", "std"].map((stat) => (
                    <div key={stat} style={{ background: "#1a1f2e", borderRadius: "6px", padding: "0.5rem", textAlign: "center" }}>
                      <div style={{ fontSize: "10px", color: "#666", marginBottom: "4px" }}>{stat.toUpperCase()}</div>
                      <div style={{ fontSize: "12px", color: "#ccc" }}>{fmt(s.old[stat])} → {fmt(s.new[stat])}</div>
                      <div style={{ fontSize: "11px", color: s.delta[stat] >= 0 ? AFTER_COLOR : BEFORE_COLOR }}>
                        {s.delta[stat] >= 0 ? "+" : ""}{fmt(s.delta[stat])}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setSelectedColumn(selectedColumn === col ? null : col)}
                  style={{ marginTop: "0.75rem", background: "none", border: "1px solid #2a2f3e", borderRadius: "6px", color: "#666", padding: "4px 12px", cursor: "pointer", fontSize: "11px", fontFamily: "'Space Mono', monospace" }}
                >
                  {selectedColumn === col ? "Hide Distribution" : "Show Distribution"}
                </button>
                {selectedColumn === col && distData && (
                  <div style={{ marginTop: "1rem" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <MiniHistogram data={distData.old} color={BEFORE_COLOR} label="Before" />
                      <MiniHistogram data={distData.new} color={AFTER_COLOR} label="After" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {catCols.map((col) => {
            const s = diff.statsChanges[col];
            const topChanges = Object.entries(s.freqDiff).sort((a, b) => Math.abs(b[1].delta) - Math.abs(a[1].delta)).slice(0, 8);
            return (
              <div key={col} style={{ marginBottom: "1rem", background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                  <span style={{ color: "#ffd93d", fontWeight: "bold" }}>{col}</span>
                  <span style={{ color: "#555", fontSize: "11px" }}>CATEGORICAL · {s.oldUnique} → {s.newUnique} unique</span>
                </div>
                {topChanges.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {topChanges.map(([k, v]) => (
                      <div key={k} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px" }}>
                        <span style={{ color: "#aaa", width: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k}</span>
                        <span style={{ color: "#555" }}>{v.old} → {v.new}</span>
                        <span style={{ color: v.delta >= 0 ? AFTER_COLOR : BEFORE_COLOR }}>{v.delta >= 0 ? "+" : ""}{v.delta}</span>
                      </div>
                    ))}
                  </div>
                ) : <span style={{ color: "#555", fontSize: "11px" }}>No category changes detected</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Charts tab */}
      {activeTab === "charts" && (
        <div>
          {chartData.length === 0 ? (
            <div style={{ color: "#555", textAlign: "center", padding: "2rem" }}>No numeric columns to compare</div>
          ) : chartData.map((c) => (
            <div key={c.column} style={{ marginBottom: "2rem" }}>
              <div style={{ color: "#00d4aa", marginBottom: "0.5rem", fontSize: "13px" }}>{c.column}</div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={c.data} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
                  <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 11, fontFamily: "'Space Mono'" }} />
                  <YAxis tick={{ fill: "#666", fontSize: 10, fontFamily: "'Space Mono'" }} />
                  <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", fontFamily: "'Space Mono', monospace", fontSize: "11px" }} />
                  <Legend wrapperStyle={{ fontFamily: "'Space Mono', monospace", fontSize: "11px" }} />
                  <Bar dataKey="before" name="Before" fill={BEFORE_COLOR} radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                  <Bar dataKey="after" name="After" fill={AFTER_COLOR} radius={[4, 4, 0, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ))}
        </div>
      )}

      {/* Rows tab */}
      {activeTab === "rows" && (
        <div>
          <div style={{ fontSize: "12px", color: "#666", marginBottom: "1rem" }}>
            Showing first 500 rows. {diff.rowChanges.added} added · {diff.rowChanges.removed} removed · {diff.rowChanges.modified} modified
          </div>
          <div style={{ maxHeight: "400px", overflowY: "auto" }}>
            {diff.rowChanges.diffs.slice(0, 200).map((rd, i) => (
              <div key={i} style={{
                marginBottom: "4px",
                padding: "6px 10px",
                borderRadius: "4px",
                fontSize: "11px",
                background: rd.type === "added" ? "rgba(0,212,170,0.08)" : rd.type === "removed" ? "rgba(255,107,107,0.08)" : "rgba(255,217,61,0.08)",
                borderLeft: `3px solid ${rd.type === "added" ? AFTER_COLOR : rd.type === "removed" ? BEFORE_COLOR : "#ffd93d"}`,
              }}>
                <span style={{ color: "#555", marginRight: "8px" }}>row {rd.index}</span>
                {rd.type === "added" && <span style={{ color: AFTER_COLOR }}>+ added</span>}
                {rd.type === "removed" && <span style={{ color: BEFORE_COLOR }}>- removed</span>}
                {rd.type === "modified" && rd.changes.map((ch, j) => (
                  <span key={j} style={{ marginRight: "8px" }}>
                    <span style={{ color: "#ffd93d" }}>{ch.col}</span>
                    <span style={{ color: "#555" }}> {String(ch.old).slice(0, 20)} → {String(ch.new).slice(0, 20)}</span>
                  </span>
                ))}
              </div>
            ))}
            {diff.rowChanges.diffs.length === 0 && (
              <div style={{ color: "#555", textAlign: "center", padding: "2rem" }}>No row-level changes detected</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CommitBadge({ node, color, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
      <div>
        <div style={{ fontSize: "10px", color: "#555", marginBottom: "2px" }}>{label}</div>
        <div style={{ fontSize: "12px", color: "#ccc" }}>{node?.branchName || "—"}</div>
        <div style={{ fontSize: "10px", color: "#555" }}>{node?.author || "—"}</div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", padding: "1rem", textAlign: "center" }}>
      <div style={{ fontSize: "10px", color: "#555", marginBottom: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: "bold", color }}>{value}</div>
    </div>
  );
}

function ChipList({ label, items, color }) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <div style={{ fontSize: "11px", color: "#555", marginBottom: "6px", textTransform: "uppercase" }}>{label}</div>
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
        {items.map((item) => (
          <span key={item} style={{ background: "rgba(0,0,0,0.3)", border: `1px solid ${color}`, borderRadius: "12px", padding: "2px 10px", fontSize: "11px", color }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniHistogram({ data, color, label }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color, marginBottom: "4px" }}>{label}</div>
      <ResponsiveContainer width="100%" height={120}>
        <AreaChart data={data}>
          <XAxis dataKey="range" hide />
          <YAxis hide />
          <Tooltip contentStyle={{ background: "#0d1117", border: "none", fontSize: "10px", fontFamily: "'Space Mono'" }} />
          <Area type="monotone" dataKey="count" stroke={color} fill={color} fillOpacity={0.2} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function fmt(n) {
  if (typeof n !== "number") return "—";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return n.toFixed(3);
}
