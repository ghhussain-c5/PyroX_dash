/* Shared, dependency-free data helpers. Also embedded in the standalone HTML. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Pyrox = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const finite = v => v !== null && v !== undefined && !(typeof v === 'string' && !v.trim()) && typeof v !== 'boolean' && Number.isFinite(Number(v));
  const stop = new Set('a an the and or of to in for is are was were how what which does do with this that from on as it can be my we our at by about have has'.split(' '));
  function tokens(s) { return [...new Set(String(s).toLowerCase().match(/[a-z0-9]+(?:-[a-z0-9]+)*/g) || [])].filter(t => t.length > 1 && !stop.has(t)); }
  function index(data) {
    const out = [];
    for (const source of data.sources) {
      for (const p of source.data.pages || []) {
        if (!p.text.trim()) continue;
        // Overlapping passages retain page locations without flooding the model with a whole report.
        for (let i = 0; i < p.text.length; i += 1450) {
          const text = p.text.slice(i, i + 1750);
          out.push({ sourceId: source.id, label: source.label, kind: source.kind, page: p.page, location: 'PDF page ' + p.page, text });
        }
      }
      for (const sheet of source.data.sheets || []) {
        const header = JSON.stringify(sheet.rows[0]?.cells || {});
        for (let i = 1; i < sheet.rows.length; i += 8) {
          const rows = sheet.rows.slice(i, i + 8);
          out.push({ sourceId: source.id, label: source.label, kind: source.kind, sheet: sheet.sheet_name,
            row: rows[0].source_row, location: sheet.sheet_name + ', rows ' + rows[0].source_row + '–' + rows.at(-1).source_row,
            text: 'Initial worksheet headings (may not apply after a later heading or table break): ' + header + '\nMixed table blocks and notes are preserved. Do not assume the initial headings describe later blocks; inspect local headings before interpreting numeric values.\n' + rows.map(r => 'Row ' + r.source_row + ': ' + JSON.stringify(r.cells)).join('\n') });
        }
      }
    }
    return out.map(p => ({ ...p, haystack: (p.label + ' ' + p.text).toLowerCase() }));
  }
  function search(passages, query, limit = 8, sourceId = '') {
    const terms = tokens(query); if (!terms.length) return [];
    const eligible = sourceId ? passages.filter(p => p.sourceId === sourceId) : passages;
    const idf = new Map(terms.map(t => [t, Math.log(1 + eligible.length / (1 + eligible.filter(p => p.haystack.includes(t)).length))]));
    const ranked = eligible.map(p => ({ ...p, score: terms.reduce((n, t) => n + (p.haystack.includes(t) ? idf.get(t) * (p.label.toLowerCase().includes(t) ? 1.5 : 1) : 0), 0) }))
      .filter(p => p.score > 0).sort((a, b) => b.score - a.score);
    const used = new Set();
    return ranked.filter(p => { const key = p.sourceId + ':' + p.location; if (used.has(key)) return false; used.add(key); return true; }).slice(0, limit);
  }
  function rank(data, study, scenario) {
    const ref = data.REF[study.id] || {}, goal = data.GOALS.find(g => g.id === scenario.goal) || data.GOALS[0];
    const reasons = [], gaps = []; let points = 0, possible = 80;
    if (goal.focus.some(f => study.focus.includes(f))) { points += 35; reasons.push('Research objective matches'); }
    else gaps.push('Research objective is an indirect match.');
    if (scenario.fuel && scenario.fuel !== 'Any') { possible += 20; if (study.fuel === scenario.fuel) { points += 20; reasons.push('Fuel phase matches'); } else gaps.push('Fuel phase differs from your selection.'); }
    if (ref.o2) {
      const within = scenario.oxygen >= ref.o2[0] && scenario.oxygen <= ref.o2[1];
      if (within) { points += ref.o2Kind === 'planned' ? 8 : 20; reasons.push(ref.o2Kind === 'planned' ? 'Oxygen is within a planned range' : 'Oxygen is within reported initial readings'); }
      else gaps.push('Your oxygen fraction is outside this documented range.');
      if (ref.o2Kind === 'planned') gaps.push('Oxygen and pressure ranges describe a plan, not confirmed results.');
    } else gaps.push('No verified oxygen interval is indexed for this investigation.');
    if (ref.psi) { if (scenario.pressure >= ref.psi[0] && scenario.pressure <= ref.psi[1]) points += ref.pressureKind === 'planned' ? 4 : 10; }
    else gaps.push('Run-level pressure is not indexed.');
    if (ref.type === 'report') { points += 15; reasons.push('Report text is available'); }
    else if (ref.type === 'overview') { points += 7; reasons.push('Overview text is available'); }
    else gaps.push('Catalog metadata only; no linked report is bundled.');
    if (scenario.gravity !== 'Microgravity') gaps.unshift('The bundled microgravity findings do not validate ' + scenario.gravity.toLowerCase() + ' conditions.');
    if (finite(scenario.flow)) gaps.push('Airflow can be compared with BASS-II table points; a joint scenario match is not established.');
    return { study, ref, score: Math.round(points / possible * 100), reasons, gaps };
  }
  function number(value) { return finite(value) ? Number(value) : null; }
  function numericColumns(sheet) {
    const cols = Object.keys(sheet.rows[0]?.cells || {});
    return cols.filter(c => sheet.rows.slice(1).filter(r => typeof r.cells[c] === 'number' && Number.isFinite(r.cells[c])).length >= 2);
  }
  function calibrationRows(sheet) {
    if (sheet.rows[0]?.cells.A !== 'Test Point') return sheet.rows.slice(1);
    const rows = []; let expectedPoint = 1;
    for (const row of sheet.rows.slice(1)) {
      if (row.cells.A !== expectedPoint) break;
      rows.push(row); expectedPoint++;
    }
    return rows;
  }
  return { finite, number, tokens, index, search, rank, numericColumns, calibrationRows };
});
