// Generate a styled Excel workbook (OTHER_App_Features.xlsx) from the canonical
// docs/feature-tracker.csv. Two sheets: a filterable feature list (colour-coded
// by status) and a summary of counts by status and category.
//   node scripts/build-feature-xlsx.mjs [outPath]
import ExcelJS from 'exceljs';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2] || resolve(root, 'docs/OTHER_App_Features.xlsx');

// --- tiny RFC-4180 CSV parser (quotes, embedded commas, doubled quotes) ----
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c === '\r') { /* skip */ }
    else field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.length > 1 || (r[0] && r[0].trim()));
}

const csv = readFileSync(resolve(root, 'docs/feature-tracker.csv'), 'utf8');
const [header, ...data] = parseCsv(csv);

const STATUS_FILL = {
  Built: 'FF1E7F4F',   // green
  Partial: 'FFB8860B', // amber
  Future: 'FF6A5ACD',  // slate purple
};
const PURPLE = 'FF7C5BF5';

const wb = new ExcelJS.Workbook();
wb.creator = 'OTHER — Extratac LLC';
wb.created = new Date('2026-06-28T00:00:00Z');

// ---- Sheet 1: Features --------------------------------------------------
const ws = wb.addWorksheet('Features', {
  views: [{ state: 'frozen', ySplit: 1 }],
});
ws.columns = [
  { header: 'Category', key: 'cat', width: 20 },
  { header: 'Feature', key: 'feat', width: 34 },
  { header: 'Description', key: 'desc', width: 56 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Priority', key: 'prio', width: 10 },
  { header: 'Notes', key: 'notes', width: 50 },
];

const head = ws.getRow(1);
head.height = 22;
head.eachCell((cell) => {
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } };
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
  cell.alignment = { vertical: 'middle', horizontal: 'left' };
});

data.forEach((r) => {
  const [cat, feat, desc, status, prio, notes] = r;
  const row = ws.addRow({ cat, feat, desc, status, prio, notes });
  row.alignment = { vertical: 'top', wrapText: true };
  const sc = row.getCell('status');
  const fill = STATUS_FILL[(status || '').trim()];
  if (fill) {
    sc.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fill } };
    sc.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sc.alignment = { vertical: 'middle', horizontal: 'center' };
  }
});
ws.autoFilter = { from: 'A1', to: `F${data.length + 1}` };

// ---- Sheet 2: Summary ---------------------------------------------------
const sum = wb.addWorksheet('Summary');
sum.columns = [{ width: 26 }, { width: 12 }, { width: 12 }, { width: 12 }, { width: 12 }];

const tally = (key) => {
  const m = new Map();
  for (const r of data) {
    const k = (r[key] || '').trim() || '(none)';
    const st = (r[3] || '').trim();
    if (!m.has(k)) m.set(k, { Built: 0, Partial: 0, Future: 0, total: 0 });
    const e = m.get(k); if (e[st] !== undefined) e[st]++; e.total++;
  }
  return m;
};

const title = sum.addRow(['OTHER — Feature Summary']);
title.getCell(1).font = { bold: true, size: 16, color: { argb: PURPLE } };
sum.addRow([`Generated 2026-06-28 · Extratac LLC · ${data.length} features tracked`]).getCell(1).font = { italic: true, color: { argb: 'FF888888' } };
sum.addRow([]);

const byStatus = { Built: 0, Partial: 0, Future: 0 };
for (const r of data) { const s = (r[3] || '').trim(); if (byStatus[s] !== undefined) byStatus[s]++; }
sum.addRow(['By status']).getCell(1).font = { bold: true, size: 12 };
const sh = sum.addRow(['Status', 'Count', '% of total']);
sh.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } }; });
for (const k of ['Built', 'Partial', 'Future']) {
  const row = sum.addRow([k, byStatus[k], `${Math.round((byStatus[k] / data.length) * 100)}%`]);
  const c = row.getCell(1);
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: STATUS_FILL[k] } };
  c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
}
sum.addRow(['Total', data.length, '100%']).eachCell((c) => { c.font = { bold: true }; });
sum.addRow([]);

sum.addRow(['By category']).getCell(1).font = { bold: true, size: 12 };
const ch = sum.addRow(['Category', 'Built', 'Partial', 'Future', 'Total']);
ch.eachCell((c) => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PURPLE } }; });
for (const [cat, e] of tally(0)) sum.addRow([cat, e.Built, e.Partial, e.Future, e.total]);

await wb.xlsx.writeFile(out);
console.log(`Wrote ${out} — ${data.length} features, ${byStatus.Built} Built / ${byStatus.Partial} Partial / ${byStatus.Future} Future`);
