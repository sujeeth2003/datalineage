// src/components/CommitUpload.js
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { v4 as uuidv4 } from "uuid";
import { computeCSVDiff } from "../utils/csvDiff";

export default function CommitUpload({ parentNode, allNodes, onCommit, onCancel, author: authorProp }) {
  const [step, setStep] = useState("upload"); // upload | meta | preview
  const [csvFile, setCsvFile] = useState(null);
  const [parsedData, setParsedData] = useState(null);
  const [columns, setColumns] = useState([]);
  const [branchName, setBranchName] = useState(parentNode?.branchName || "main");
  const [author, setAuthor] = useState(authorProp || "");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [diff, setDiff] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;
    setCsvFile(file);
    setError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          setError("Could not parse CSV file. Please check the format.");
          return;
        }
        const cols = results.meta.fields || [];
        setParsedData(results.data);
        setColumns(cols);

        // Compute diff if there's a parent
        if (parentNode && parentNode.csvData) {
          const parentCols = parentNode.columns || [];
          const d = computeCSVDiff(parentNode.csvData, results.data, parentCols, cols);
          setDiff(d);
        }

        setStep("meta");
      },
      error: (err) => setError(err.message),
    });
  }, [parentNode]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "text/csv": [".csv"], "text/plain": [".csv"] },
    maxFiles: 1,
  });

  const handleSubmit = () => {
    if (!branchName.trim()) { setError("Branch name is required"); return; }
    if (!author.trim()) { setError("Author name is required"); return; }
    if (!description.trim()) { setError("Description is required"); return; }

    setLoading(true);
    const node = {
      id: uuidv4(),
      parentId: parentNode?.id || null,
      branchName: branchName.trim(),
      author: author.trim(),
      description: description.trim(),
      code: code.trim(),
      timestamp: new Date().toISOString(),
      csvData: parsedData,
      columns,
      rowCount: parsedData.length,
      filename: csvFile.name,
      diff: diff ? {
        summary: diff.summary,
        rowChanges: { added: diff.rowChanges.added, removed: diff.rowChanges.removed, modified: diff.rowChanges.modified },
        addedColumns: diff.addedColumns,
        removedColumns: diff.removedColumns,
      } : null,
    };
    onCommit(node);
    setLoading(false);
  };

  if (step === "upload") {
    return (
      <div>
        <div
          {...getRootProps()}
          style={{
            border: `2px dashed ${isDragActive ? "#00d4aa" : "#2a2f3e"}`,
            borderRadius: "12px",
            padding: "3rem",
            textAlign: "center",
            cursor: "pointer",
            background: isDragActive ? "rgba(0,212,170,0.05)" : "#0d1117",
            transition: "all 0.2s",
          }}
        >
          <input {...getInputProps()} />
          <div style={{ fontSize: "48px", marginBottom: "1rem" }}>📊</div>
          <div style={{ color: isDragActive ? "#00d4aa" : "#666", fontFamily: "'Space Mono', monospace" }}>
            {isDragActive ? "Drop the CSV here..." : "Drag & drop a CSV file, or click to browse"}
          </div>
          <div style={{ fontSize: "11px", color: "#444", marginTop: "0.5rem" }}>Supports .csv files of any size</div>
        </div>
        {error && <div style={{ color: "#ff6b6b", marginTop: "1rem", fontSize: "12px", fontFamily: "'Space Mono', monospace" }}>{error}</div>}
        <button onClick={onCancel} style={cancelBtnStyle}>Cancel</button>
      </div>
    );
  }

  if (step === "meta") {
    return (
      <div style={{ fontFamily: "'Space Mono', monospace" }}>
        {/* File preview */}
        <div style={{ background: "#0d1117", border: "1px solid #2a2f3e", borderRadius: "8px", padding: "1rem", marginBottom: "1.5rem" }}>
          <div style={{ color: "#00d4aa", fontSize: "12px", marginBottom: "4px" }}>📁 {csvFile.name}</div>
          <div style={{ color: "#666", fontSize: "11px" }}>
            {parsedData.length.toLocaleString()} rows · {columns.length} columns · {(csvFile.size / 1024).toFixed(1)} KB
          </div>
          {diff && (
            <div style={{ marginTop: "8px", display: "flex", gap: "12px", flexWrap: "wrap" }}>
              {diff.summary.rowDelta !== 0 && <DiffChip val={diff.summary.rowDelta} label="rows" />}
              {diff.addedColumns.length > 0 && <DiffChip val={`+${diff.addedColumns.length}`} label="cols added" positive />}
              {diff.removedColumns.length > 0 && <DiffChip val={`-${diff.removedColumns.length}`} label="cols removed" negative />}
              {diff.rowChanges.modified > 0 && <DiffChip val={diff.rowChanges.modified} label="rows modified" neutral />}
            </div>
          )}
        </div>

        {/* Metadata form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <FormField label="Branch Name *" value={branchName} onChange={setBranchName} placeholder="e.g. main, cleaned-data, feature/normalize" />
            <FormField label="Your Name *" value={author} onChange={setAuthor} placeholder="Full name" />
          </div>

          <div>
            <label style={labelStyle}>Description * <span style={{ color: "#444" }}>(what did you do to this data?)</span></label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Removed duplicate rows, normalized temperature column from F to C, filled missing values with column mean..."
              style={{ ...inputStyle, height: "80px", resize: "vertical" }}
            />
          </div>

          <div>
            <label style={labelStyle}>Code Used <span style={{ color: "#444" }}>(optional – paste your Python/R/SQL)</span></label>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="# e.g.&#10;import pandas as pd&#10;df = pd.read_csv('data.csv')&#10;df.drop_duplicates(inplace=True)&#10;df.to_csv('cleaned.csv', index=False)"
              style={{ ...inputStyle, height: "120px", resize: "vertical", background: "#080c12", fontFamily: "'Space Mono', monospace", fontSize: "12px" }}
            />
          </div>
        </div>

        {error && <div style={{ color: "#ff6b6b", marginTop: "1rem", fontSize: "12px" }}>{error}</div>}

        <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
          <button onClick={() => setStep("upload")} style={cancelBtnStyle}>← Back</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              background: loading ? "#1a1f2e" : "linear-gradient(135deg, #00d4aa, #00b894)",
              border: "none",
              borderRadius: "8px",
              color: "#000",
              padding: "10px 24px",
              cursor: loading ? "default" : "pointer",
              fontFamily: "'Space Mono', monospace",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            {loading ? "Saving..." : "💾 Commit to Repository"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function DiffChip({ val, label, positive, negative, neutral }) {
  const numVal = typeof val === "number" ? val : null;
  const color = positive ? "#00d4aa" : negative ? "#ff6b6b" : neutral ? "#ffd93d" :
    numVal !== null ? (numVal > 0 ? "#00d4aa" : numVal < 0 ? "#ff6b6b" : "#666") : "#666";
  return (
    <span style={{ fontSize: "10px", color, background: "rgba(0,0,0,0.3)", border: `1px solid ${color}`, borderRadius: "10px", padding: "2px 8px" }}>
      {numVal !== null && numVal > 0 ? "+" : ""}{val} {label}
    </span>
  );
}

function FormField({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

const labelStyle = { display: "block", fontSize: "10px", color: "#666", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" };
const inputStyle = {
  width: "100%",
  background: "#0d1117",
  border: "1px solid #2a2f3e",
  borderRadius: "6px",
  color: "#e0e0e0",
  padding: "8px 12px",
  fontFamily: "'Space Mono', monospace",
  fontSize: "12px",
  boxSizing: "border-box",
  outline: "none",
};
const cancelBtnStyle = {
  background: "none",
  border: "1px solid #2a2f3e",
  borderRadius: "8px",
  color: "#666",
  padding: "10px 20px",
  cursor: "pointer",
  fontFamily: "'Space Mono', monospace",
  fontSize: "12px",
};
