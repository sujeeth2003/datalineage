// src/utils/csvDiff.js
// Computes structural and data differences between two parsed CSV datasets

/**
 * Compare two CSV datasets (arrays of objects from PapaParse)
 * Returns a rich diff object used for display and visualization
 */
export function computeCSVDiff(oldData, newData, oldColumns, newColumns) {
  const diff = {
    summary: {},
    columnChanges: {},
    rowChanges: {},
    statsChanges: {},
    addedColumns: [],
    removedColumns: [],
    commonColumns: [],
  };

  // ── Column diff ────────────────────────────────────────────────────────────
  const oldCols = new Set(oldColumns);
  const newCols = new Set(newColumns);
  diff.addedColumns = newColumns.filter((c) => !oldCols.has(c));
  diff.removedColumns = oldColumns.filter((c) => !newCols.has(c));
  diff.commonColumns = newColumns.filter((c) => oldCols.has(c));

  // ── Row count diff ─────────────────────────────────────────────────────────
  diff.summary.oldRowCount = oldData.length;
  diff.summary.newRowCount = newData.length;
  diff.summary.rowDelta = newData.length - oldData.length;
  diff.summary.columnDelta = newColumns.length - oldColumns.length;

  // ── Per-column stats diff ─────────────────────────────────────────────────
  for (const col of diff.commonColumns) {
    const oldVals = oldData.map((r) => r[col]).filter((v) => v !== "" && v !== null && v !== undefined);
    const newVals = newData.map((r) => r[col]).filter((v) => v !== "" && v !== null && v !== undefined);

    const oldNumeric = oldVals.map(Number).filter((v) => !isNaN(v));
    const newNumeric = newVals.map(Number).filter((v) => !isNaN(v));

    const isNumeric = oldNumeric.length > oldVals.length * 0.7 || newNumeric.length > newVals.length * 0.7;

    if (isNumeric && (oldNumeric.length > 0 || newNumeric.length > 0)) {
      const oldStats = computeStats(oldNumeric);
      const newStats = computeStats(newNumeric);
      diff.statsChanges[col] = {
        isNumeric: true,
        old: oldStats,
        new: newStats,
        delta: {
          mean: newStats.mean - oldStats.mean,
          min: newStats.min - oldStats.min,
          max: newStats.max - oldStats.max,
          std: newStats.std - oldStats.std,
        },
      };
    } else {
      // Categorical
      const oldFreq = frequency(oldVals);
      const newFreq = frequency(newVals);
      const allKeys = new Set([...Object.keys(oldFreq), ...Object.keys(newFreq)]);
      const freqDiff = {};
      for (const k of allKeys) {
        const od = oldFreq[k] || 0;
        const nd = newFreq[k] || 0;
        if (od !== nd) freqDiff[k] = { old: od, new: nd, delta: nd - od };
      }
      diff.statsChanges[col] = { isNumeric: false, freqDiff, oldUnique: Object.keys(oldFreq).length, newUnique: Object.keys(newFreq).length };
    }
  }

  // ── Row-level diff (first 500 rows for performance) ────────────────────────
  const limit = Math.min(Math.max(oldData.length, newData.length), 500);
  const rowDiffs = [];
  for (let i = 0; i < limit; i++) {
    const oldRow = oldData[i];
    const newRow = newData[i];
    if (!oldRow && newRow) {
      rowDiffs.push({ index: i, type: "added", row: newRow });
    } else if (oldRow && !newRow) {
      rowDiffs.push({ index: i, type: "removed", row: oldRow });
    } else if (oldRow && newRow) {
      const changedCols = [];
      for (const col of diff.commonColumns) {
        if (String(oldRow[col] ?? "") !== String(newRow[col] ?? "")) {
          changedCols.push({ col, old: oldRow[col], new: newRow[col] });
        }
      }
      if (changedCols.length > 0) {
        rowDiffs.push({ index: i, type: "modified", changes: changedCols });
      }
    }
  }
  diff.rowChanges.diffs = rowDiffs;
  diff.rowChanges.added = rowDiffs.filter((r) => r.type === "added").length;
  diff.rowChanges.removed = rowDiffs.filter((r) => r.type === "removed").length;
  diff.rowChanges.modified = rowDiffs.filter((r) => r.type === "modified").length;

  return diff;
}

function computeStats(nums) {
  if (nums.length === 0) return { mean: 0, min: 0, max: 0, std: 0, count: 0 };
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const variance = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / nums.length;
  return { mean, min, max, std: Math.sqrt(variance), count: nums.length };
}

function frequency(vals) {
  const freq = {};
  for (const v of vals) {
    const key = String(v);
    freq[key] = (freq[key] || 0) + 1;
  }
  return freq;
}

/**
 * Build chart data comparing old vs new numeric columns
 * Returns array suitable for Recharts
 */
export function buildComparisonChartData(diff) {
  const charts = [];
  for (const [col, stats] of Object.entries(diff.statsChanges)) {
    if (!stats.isNumeric) continue;
    charts.push({
      column: col,
      data: [
        { name: "Min", before: round(stats.old.min), after: round(stats.new.min) },
        { name: "Mean", before: round(stats.old.mean), after: round(stats.new.mean) },
        { name: "Max", before: round(stats.old.max), after: round(stats.new.max) },
        { name: "Std Dev", before: round(stats.old.std), after: round(stats.new.std) },
      ],
    });
  }
  return charts;
}

/**
 * Build distribution data for a single column (for histogram-like charts)
 */
export function buildDistributionData(data, column, bins = 20) {
  const vals = data.map((r) => Number(r[column])).filter((v) => !isNaN(v));
  if (vals.length === 0) return [];
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const binSize = (max - min) / bins || 1;
  const buckets = Array.from({ length: bins }, (_, i) => ({
    range: `${round(min + i * binSize)}`,
    count: 0,
  }));
  for (const v of vals) {
    const idx = Math.min(Math.floor((v - min) / binSize), bins - 1);
    buckets[idx].count++;
  }
  return buckets;
}

function round(n, decimals = 3) {
  return Math.round(n * 10 ** decimals) / 10 ** decimals;
}
