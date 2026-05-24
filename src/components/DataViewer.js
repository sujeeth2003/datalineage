// src/components/DataViewer.js
import React, { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, BarChart, Bar, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const COLORS = ["#00d4aa", "#ff6b6b", "#ffd93d", "#6bcb77", "#4d96ff", "#ff9f43", "#a29bfe"];

export default function DataViewer({ node }) {
  const [view, setView] = useState("table"); // table | chart
  const [chartType, setChartType] = useState("line");
  const [xAxis, setXAxis] = useState(null);
  const [yAxes, setYAxes] = useState([]);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data, columns } = useMemo(() => ({
    data: node?.csvData || [],
    columns: node?.columns || [],
  }), [node]);

  const numericCols = useMemo(() => {
    if (!data.length) return [];
    return columns.filter((col) => {
      const sample = data.slice(0, 20).map((r) => r[col]).filter((v) => v !== "" && v != null);
      const numSample = sample.map(Number).filter((v) => !isNaN(v));
      return numSample.length > sample.length * 0.7;
    });
  }, [data, columns]);

  // Init chart defaults
  useEffect(() => {
    if (columns.length > 0 && !xAxis) setXAxis(columns[0]);
    if (numericCols.length > 0 && yAxes.length === 0) setYAxes([numericCols[0]]);
  }, [columns, numericCols, xAxis, yAxes.length]);

  const chartData = useMemo(() => {
    if (!xAxis || yAxes.length === 0) return [];
    return data.slice(0, 500).map((row) => {
      const pt = { x: row[xAxis] };
      for (const y of yAxes) pt[y] = isNaN(Number(row[y])) ? null : Number(row[y]);
      return pt;
    });
  }, [data, xAxis, yAxes]);

  const pageData = useMemo(() => data.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [data, page]);
  const totalPages = Math.ceil(data.length / PAGE_SIZE);

  if (!node) return null;

  return (
    <div style={{ fontFamily: "'Space Mono', monospace" }}>
      {/* Header */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "1rem", alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ color: "#00d4aa", fontSize: "13px", fontWeight: "bold" }}>{node.filename || "data.csv"}</div>
        <div style={{ color: "#555", fontSize: "11px" }}>{data.length.toLocaleString()} rows · {columns.length} cols</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: "4px" }}>
          {["table", "chart"].map((v) => (
            <button key={v} onClick={() => setView(v)} style={{ ...tabBtnStyle, color: view === v ? "#00d4aa" : "#555", borderColor: view === v ? "#00d4aa" : "#2a2f3e" }}>
              {v === "table" ? "📋 Table" : "📈 Chart"}
            </button>
          ))}
        </div>
      </div>

      {/* Commit metadata */}
      <div style={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <div>
          <div style={metaLabelStyle}>Branch</div>
          <div style={metaValueStyle}>{node.branchName}</div>
        </div>
        <div>
          <div style={metaLabelStyle}>Author</div>
          <div style={metaValueStyle}>{node.author}</div>
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <div style={metaLabelStyle}>Description</div>
          <div style={{ ...metaValueStyle, color: "#ccc", lineHeight: "1.5" }}>{node.description}</div>
        </div>
        {node.code && (
          <div style={{ gridColumn: "1 / -1" }}>
            <div style={metaLabelStyle}>Code Used</div>
            <pre style={{ background: "#080c12", border: "1px solid #1a1f2e", borderRadius: "6px", padding: "0.75rem", fontSize: "11px", color: "#a0e0c8", overflow: "auto", margin: 0, fontFamily: "'Space Mono', monospace", whiteSpace: "pre-wrap" }}>
              {node.code}
            </pre>
          </div>
        )}
        <div>
          <div style={metaLabelStyle}>Committed</div>
          <div style={metaValueStyle}>{new Date(node.timestamp).toLocaleString()}</div>
        </div>
      </div>

      {/* Table View */}
      {view === "table" && (
        <div>
          <div style={{ overflowX: "auto", borderRadius: "8px", border: "1px solid #2a2f3e" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px" }}>
              <thead>
                <tr style={{ background: "#1a1f2e" }}>
                  <th style={thStyle}>#</th>
                  {columns.map((col) => (
                    <th key={col} style={thStyle}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#0d1117" : "#111520" }}>
                    <td style={tdStyle}>{page * PAGE_SIZE + i + 1}</td>
                    {columns.map((col) => (
                      <td key={col} style={tdStyle}>{row[col] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "1rem", alignItems: "center" }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} style={paginBtnStyle}>←</button>
            <span style={{ color: "#555", fontSize: "11px" }}>Page {page + 1} of {totalPages}</span>
            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} style={paginBtnStyle}>→</button>
          </div>
        </div>
      )}

      {/* Chart View */}
      {view === "chart" && (
        <div>
          {/* Chart controls */}
          <div style={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", padding: "1rem", marginBottom: "1rem", display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "flex-end" }}>
            <SelectField label="Chart Type" value={chartType} onChange={setChartType} options={["line", "bar", "scatter"]} />
            <SelectField label="X Axis" value={xAxis || ""} onChange={setXAxis} options={columns} />
            <div>
              <label style={{ ...metaLabelStyle, marginBottom: "4px", display: "block" }}>Y Axes (multi-select)</label>
              <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                {numericCols.map((col) => (
                  <button
                    key={col}
                    onClick={() => setYAxes(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col])}
                    style={{
                      fontSize: "10px",
                      padding: "3px 8px",
                      borderRadius: "12px",
                      border: `1px solid ${yAxes.includes(col) ? "#00d4aa" : "#2a2f3e"}`,
                      background: yAxes.includes(col) ? "rgba(0,212,170,0.15)" : "none",
                      color: yAxes.includes(col) ? "#00d4aa" : "#555",
                      cursor: "pointer",
                      fontFamily: "'Space Mono', monospace",
                    }}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {chartData.length > 0 && yAxes.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              {chartType === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
                  <XAxis dataKey="x" tick={{ fill: "#555", fontSize: 10, fontFamily: "'Space Mono'" }} />
                  <YAxis tick={{ fill: "#555", fontSize: 10, fontFamily: "'Space Mono'" }} />
                  <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", fontFamily: "'Space Mono'", fontSize: "11px" }} />
                  <Legend wrapperStyle={{ fontFamily: "'Space Mono'", fontSize: "11px" }} />
                  {yAxes.map((y, i) => <Bar key={y} dataKey={y} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} fillOpacity={0.8} />)}
                </BarChart>
              ) : chartType === "scatter" ? (
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
                  <XAxis dataKey="x" name={xAxis} tick={{ fill: "#555", fontSize: 10, fontFamily: "'Space Mono'" }} />
                  <YAxis dataKey={yAxes[0]} name={yAxes[0]} tick={{ fill: "#555", fontSize: 10, fontFamily: "'Space Mono'" }} />
                  <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", fontFamily: "'Space Mono'", fontSize: "11px" }} />
                  <Scatter data={chartData} fill={COLORS[0]} fillOpacity={0.7} />
                </ScatterChart>
              ) : (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1f2e" />
                  <XAxis dataKey="x" tick={{ fill: "#555", fontSize: 10, fontFamily: "'Space Mono'" }} />
                  <YAxis tick={{ fill: "#555", fontSize: 10, fontFamily: "'Space Mono'" }} />
                  <Tooltip contentStyle={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", fontFamily: "'Space Mono'", fontSize: "11px" }} />
                  <Legend wrapperStyle={{ fontFamily: "'Space Mono'", fontSize: "11px" }} />
                  {yAxes.map((y, i) => <Line key={y} type="monotone" dataKey={y} stroke={COLORS[i % COLORS.length]} strokeWidth={2} dot={false} />)}
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div style={{ color: "#555", textAlign: "center", padding: "3rem" }}>
              {numericCols.length === 0 ? "No numeric columns detected for charting." : "Select X and Y axes to view chart."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div>
      <label style={{ ...metaLabelStyle, marginBottom: "4px", display: "block" }}>{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: "6px", color: "#ccc", padding: "6px 10px", fontFamily: "'Space Mono', monospace", fontSize: "11px", cursor: "pointer" }}
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

const thStyle = { padding: "8px 12px", textAlign: "left", color: "#666", fontWeight: "normal", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", borderBottom: "1px solid #2a2f3e", whiteSpace: "nowrap" };
const tdStyle = { padding: "6px 12px", color: "#ccc", borderBottom: "1px solid #111520", whiteSpace: "nowrap", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis" };
const tabBtnStyle = { background: "none", border: "1px solid", borderRadius: "6px", padding: "6px 14px", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: "11px" };
const paginBtnStyle = { background: "#1a1f2e", border: "1px solid #2a2f3e", borderRadius: "6px", color: "#ccc", padding: "4px 12px", cursor: "pointer", fontFamily: "'Space Mono', monospace" };
const metaLabelStyle = { fontSize: "10px", color: "#555", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "2px" };
const metaValueStyle = { fontSize: "12px", color: "#aaa" };
