import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function AvailabilityAnalyzer() {
  const [caregivers, setCaregivers] = useState([]);
  const [prefsMap, setPrefsMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');
  const [xlsxLoaded, setXlsxLoaded] = useState(false);
  const [csvLoaded, setCsvLoaded] = useState(false);

  const [filterState, setFilterState] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All');
  const [filterWorkPref, setFilterWorkPref] = useState('All');
  const [filterNotes, setFilterNotes] = useState('');
  const [filterDogs, setFilterDogs] = useState('All');
  const [filterCats, setFilterCats] = useState('All');
  const [filterDrives, setFilterDrives] = useState('All');
  const [filterSmoke, setFilterSmoke] = useState('All');

  const fileLoaded = xlsxLoaded && csvLoaded;

  const getStateFromOffice = (officeText) => {
    const text = officeText.toLowerCase();
    if (text.includes('maryland')) return 'Maryland';
    if (text.includes('massachusetts')) return 'Massachusetts';
    if (text.includes('illinois')) return 'Illinois';
    if (text.includes('virginia')) return 'Virginia';
    return '';
  };

  const handleXlsxUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const arrayData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
      let headerRowIndex = arrayData.findIndex(row => row[1] === 'Caregiver Name');
      if (headerRowIndex === -1) throw new Error('Header row not found in .xlsx');
      const processedData = [];
      let currentState = '';
      for (let i = headerRowIndex + 1; i < arrayData.length; i++) {
        const row = arrayData[i];
        if (row[1] && row[1].trim() !== '') {
          const rowOffice = row[0] || '';
          const identifiedState = getStateFromOffice(rowOffice);
          if (identifiedState) currentState = identifiedState;
          const tags = row[3] || '';
          const market = tags.split(',')[0].trim() || 'Unknown';
          processedData.push({
            name: row[1], office: rowOffice, state: currentState || 'Unknown',
            market, designation: row[2] || '', tags, workPreference: row[4] || 'Unknown',
            availabilityNotes: row[5] || '',
            sunday: (row[6] === 1 || row[6] === '1') ? 1 : 0,
            monday: (row[7] === 1 || row[7] === '1') ? 1 : 0,
            tuesday: (row[8] === 1 || row[8] === '1') ? 1 : 0,
            wednesday: (row[9] === 1 || row[9] === '1') ? 1 : 0,
            thursday: (row[10] === 1 || row[10] === '1') ? 1 : 0,
            friday: (row[11] === 1 || row[11] === '1') ? 1 : 0,
            saturday: (row[12] === 1 || row[12] === '1') ? 1 : 0,
          });
        }
      }
      setCaregivers(processedData);
      setXlsxLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCsvUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      setLoading(true);
      setError(null);
      const text = await file.text();
      const lines = text.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const map = {};
      for (let i = 1; i < lines.length; i++) {
        const vals = lines[i].split(',').map(v => v.trim());
        const row = {};
        headers.forEach((h, idx) => { row[h] = vals[idx] || ''; });
        const fullName = ((row['First Name'] || '') + ' ' + (row['Last Name'] || '')).trim();
        if (fullName) {
          map[fullName.toLowerCase()] = {
            transport: row['Mode of Transportation'] || '',
            drivesClients: row['Able To Drive Clients'] || '',
            worksPets: row['Working with pets'] || '',
            worksDogs: row['Working with dogs'] || '',
            worksCats: row['Working with cats'] || '',
            smokingClient: row['Willing to work with client who smokes'] || '',
            smokingHome: row['Willing to work with smoking inside the home'] || '',
          };
        }
      }
      setPrefsMap(map);
      setCsvLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const enriched = useMemo(() => {
    return caregivers.map(cg => {
      const prefs = prefsMap[cg.name.toLowerCase()] || {};
      return { ...cg, ...prefs };
    });
  }, [caregivers, prefsMap]);

  const uniqueStates = useMemo(() => ['All', ...new Set(enriched.map(c => c.state))].sort(), [enriched]);
  const uniqueMarkets = useMemo(() => {
    const subset = filterState === 'All' ? enriched : enriched.filter(c => c.state === filterState);
    return ['All', ...new Set(subset.map(c => c.market))].sort();
  }, [enriched, filterState]);
  const uniqueWorkPrefs = useMemo(() => ['All', ...new Set(enriched.map(c => c.workPreference))].sort(), [enriched]);

  const normalize = (val) => (val || '').toLowerCase().trim();
  const isYes = (val) => ['yes', 'y'].includes(normalize(val));
  const isNo = (val) => ['no', 'n'].includes(normalize(val));

  const filteredCaregivers = useMemo(() => {
    return enriched.filter(cg => {
      if (filterState !== 'All' && cg.state !== filterState) return false;
      if (filterMarket !== 'All' && cg.market !== filterMarket) return false;
      if (filterWorkPref !== 'All' && cg.workPreference !== filterWorkPref) return false;
      if (filterNotes && !(cg.availabilityNotes || '').toLowerCase().includes(filterNotes.toLowerCase())) return false;
      if (filterDogs === 'Yes' && !isYes(cg.worksDogs)) return false;
      if (filterDogs === 'No' && !isNo(cg.worksDogs)) return false;
      if (filterCats === 'Yes' && !isYes(cg.worksCats)) return false;
      if (filterCats === 'No' && !isNo(cg.worksCats)) return false;
      if (filterDrives === 'Yes' && !isYes(cg.drivesClients)) return false;
      if (filterDrives === 'No' && !isNo(cg.drivesClients)) return false;
      if (filterSmoke === 'Yes' && !isYes(cg.smokingClient)) return false;
      if (filterSmoke === 'No' && !isNo(cg.smokingClient)) return false;
      return true;
    });
  }, [enriched, filterState, filterMarket, filterWorkPref, filterNotes, filterDogs, filterCats, filterDrives, filterSmoke]);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  const prefBadge = (val) => {
    const v = normalize(val);
    if (v === 'yes' || v === 'y') return { label: '✓', color: '#16a34a', bg: '#dcfce7' };
    if (v === 'no' || v === 'n') return { label: '✗', color: '#dc2626', bg: '#fee2e2' };
    if (v === 'pending') return { label: '?', color: '#d97706', bg: '#fef3c7' };
    return { label: '—', color: '#bbb', bg: 'transparent' };
  };

  const Badge = ({ val }) => {
    const b = prefBadge(val);
    return (
      <span style={{ display: 'inline-block', padding: '2px 7px', borderRadius: '3px', fontSize: '11px', fontWeight: '700', background: b.bg, color: b.color, fontFamily: 'IBM Plex Mono, monospace' }}>
        {b.label}
      </span>
    );
  };

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'IBM Plex Sans', sans-serif; }
    .app { min-height: 100vh; background: #f5f5f3; color: #1a1a1a; }
    .upload-screen { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f5f5f3; position: relative; overflow: hidden; }
    .upload-screen::before { content: ''; position: absolute; inset: 0; background: repeating-linear-gradient(0deg, transparent, transparent 39px, rgba(0,0,0,0.04) 39px, rgba(0,0,0,0.04) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, rgba(0,0,0,0.04) 39px, rgba(0,0,0,0.04) 40px); }
    .upload-card { position: relative; background: #fff; border: 1px solid #e0e0e0; padding: 48px; width: 520px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .upload-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #16a34a, #0891b2, #16a34a); }
    .upload-title { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; color: #16a34a; margin-bottom: 12px; }
    .upload-subtitle { font-size: 24px; font-weight: 300; color: #1a1a1a; margin-bottom: 32px; letter-spacing: -0.5px; }
    .upload-steps { display: flex; flex-direction: column; gap: 12px; }
    .upload-step-label { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #aaa; text-align: left; margin-bottom: 6px; }
    .file-label { display: block; border: 1px dashed #ccc; padding: 20px; cursor: pointer; transition: all 0.2s; color: #999; font-family: 'IBM Plex Mono', monospace; font-size: 12px; text-align: center; }
    .file-label:hover { border-color: #16a34a; color: #16a34a; background: rgba(22,163,74,0.04); }
    .file-label.done { border-color: #16a34a; border-style: solid; color: #16a34a; background: rgba(22,163,74,0.04); }
    .file-input { display: none; }
    .status-msg { margin-top: 16px; font-family: 'IBM Plex Mono', monospace; font-size: 11px; }
    .status-loading { color: #16a34a; animation: pulse 1s infinite; }
    .status-error { color: #dc2626; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .topbar { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 0 24px; display: flex; align-items: center; justify-content: space-between; height: 52px; position: sticky; top: 0; z-index: 100; box-shadow: 0 1px 4px rgba(0,0,0,0.05); }
    .topbar-brand { font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #15803d; font-weight: 700; }
    .topbar-right { display: flex; align-items: center; gap: 4px; }
    .tab-btn { background: none; border: 1px solid transparent; color: #999; font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 600; letter-spacing: 1.5px; text-transform: uppercase; padding: 6px 14px; cursor: pointer; transition: all 0.15s; }
    .tab-btn:hover { color: #1a1a1a; border-color: #ccc; }
    .tab-btn.active { color: #16a34a; border-color: #16a34a; background: rgba(22,163,74,0.06); }
    .reset-btn { background: none; border: 1px solid #e5e5e5; color: #aaa; font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 1px; padding: 6px 14px; cursor: pointer; margin-left: 8px; transition: all 0.15s; }
    .reset-btn:hover { border-color: #dc2626; color: #dc2626; }
    .filter-bar { background: #fff; border-bottom: 1px solid #e5e5e5; padding: 12px 24px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
    .filter-section-label { grid-column: 1 / -1; font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #777; padding-top: 8px; font-weight: 700; border-top: 1px solid #f0f0f0; margin-top: 4px; }
    .filter-group label { display: block; font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; color: #555; margin-bottom: 5px; font-weight: 700; }
    .filter-group select, .filter-group input { width: 100%; background: #f9f9f9; border: 1px solid #e0e0e0; color: #1a1a1a; font-family: 'IBM Plex Mono', monospace; font-size: 11px; padding: 7px 10px; outline: none; transition: border-color 0.15s; -webkit-appearance: none; }
    .filter-group select:focus, .filter-group input:focus { border-color: #16a34a; }
    .filter-group select option { background: #fff; }
    .content { padding: 20px 24px; }
    .stats-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .stat-chip { font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: #444; letter-spacing: 1px; font-weight: 600; }
    .stat-chip span { color: #16a34a; font-weight: 600; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 12px; background: #fff; border: 1px solid #e5e5e5; }
    .data-table thead tr { background: #f5f5f3; border-bottom: 1px solid #e5e5e5; }
    .data-table th { padding: 10px 12px; font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #555; text-align: left; }
    .data-table th.center { text-align: center; }
    .data-table tbody tr { border-bottom: 1px solid #e5e5e5; transition: background 0.1s; }
    .data-table tbody tr:hover { background: #fafafa; }
    .data-table td { padding: 8px 12px; }
    .td-name { font-weight: 700; color: #111; white-space: nowrap; font-size: 13px; }
    .td-market { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; color: #555; font-weight: 600; }
    .td-day { text-align: center; font-size: 14px; }
    .td-day.active { color: #16a34a; }
    .td-day.inactive { color: #bbb; }
    .td-pref { text-align: center; }
    .day-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; }
    .day-col { background: #fff; border: 1px solid #e5e5e5; }
    .day-col-header { padding: 10px 12px; border-bottom: 1px solid #e5e5e5; display: flex; align-items: baseline; justify-content: space-between; }
    .day-name { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #16a34a; }
    .day-count { font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 600; color: #888; }
    .day-col-body { padding: 8px; display: flex; flex-direction: column; gap: 4px; }
    .name-chip { padding: 6px 8px; font-size: 11px; color: #222; font-weight: 600; background: #f9f9f9; border: 1px solid #e5e5e5; border-left: 2px solid #16a34a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pref-filter-card { background: #f9f9f9; border: 1px solid #e0e0e0; padding: 10px 12px; display: flex; align-items: center; gap: 10px; }
    .pref-filter-icon { font-size: 22px; line-height: 1; flex-shrink: 0; }
    .pref-filter-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #333; flex: 1; }
    .pref-select { background: #fff; border: 1px solid #ddd; color: #111; font-family: 'IBM Plex Mono', monospace; font-size: 11px; font-weight: 600; padding: 5px 8px; outline: none; cursor: pointer; width: 70px; -webkit-appearance: none; flex-shrink: 0; }
    .pref-select:focus { border-color: #16a34a; }
  `;

  if (!fileLoaded) {
    return (
      <>
        <style>{styles}</style>
        <div className="upload-screen">
          <div className="upload-card">
            <div className="upload-title">Caregiver Ops</div>
            <div className="upload-subtitle">Availability Analyzer</div>
            <div className="upload-steps">
              <div>
                <div className="upload-step-label">Step 1 — Availability (.xlsx)</div>
                <label className={`file-label ${xlsxLoaded ? 'done' : ''}`}>
                  {xlsxLoaded ? '✓ Availability file loaded' : '↑ Upload availability .xlsx'}
                  <input type="file" accept=".xlsx" onChange={handleXlsxUpload} className="file-input" />
                </label>
              </div>
              <div>
                <div className="upload-step-label">Step 2 — Preferences (.csv)</div>
                <label className={`file-label ${csvLoaded ? 'done' : ''}`}>
                  {csvLoaded ? '✓ Preferences file loaded' : '↑ Upload preferences .csv'}
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="file-input" />
                </label>
              </div>
            </div>
            {loading && <div className="status-msg status-loading">// Processing...</div>}
            {error && <div className="status-msg status-error">// Error: {error}</div>}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="topbar">
          <div className="topbar-brand">Admin Ops — Availability</div>
          <div className="topbar-right">
            <button onClick={() => setView('table')} className={`tab-btn ${view === 'table' ? 'active' : ''}`}>Table</button>
            <button onClick={() => setView('byDay')} className={`tab-btn ${view === 'byDay' ? 'active' : ''}`}>By Day</button>
            <button onClick={() => { setXlsxLoaded(false); setCsvLoaded(false); setCaregivers([]); setPrefsMap({}); }} className="reset-btn">Reset</button>
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-group">
            <label>State</label>
            <select value={filterState} onChange={(e) => { setFilterState(e.target.value); setFilterMarket('All'); }}>
              {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Market</label>
            <select value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)}>
              {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Work Pref</label>
            <select value={filterWorkPref} onChange={(e) => setFilterWorkPref(e.target.value)}>
              {uniqueWorkPrefs.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label>Notes Search</label>
            <input type="text" value={filterNotes} onChange={(e) => setFilterNotes(e.target.value)} placeholder="Search notes..." />
          </div>

          <div className="filter-section-label">Preference Filters (from CSV)</div>

          <div className="pref-filter-card">
            <div className="pref-filter-icon">🚗</div>
            <div className="pref-filter-label">Drives Clients</div>
            <select className="pref-select" value={filterDrives} onChange={(e) => setFilterDrives(e.target.value)}>
              <option>All</option><option>Yes</option><option>No</option>
            </select>
          </div>
          <div className="pref-filter-card">
            <div className="pref-filter-icon">🐕</div>
            <div className="pref-filter-label">Works w/ Dogs</div>
            <select className="pref-select" value={filterDogs} onChange={(e) => setFilterDogs(e.target.value)}>
              <option>All</option><option>Yes</option><option>No</option>
            </select>
          </div>
          <div className="pref-filter-card">
            <div className="pref-filter-icon">🐈</div>
            <div className="pref-filter-label">Works w/ Cats</div>
            <select className="pref-select" value={filterCats} onChange={(e) => setFilterCats(e.target.value)}>
              <option>All</option><option>Yes</option><option>No</option>
            </select>
          </div>
          <div className="pref-filter-card">
            <div className="pref-filter-icon">🚬</div>
            <div className="pref-filter-label">Smoking OK</div>
            <select className="pref-select" value={filterSmoke} onChange={(e) => setFilterSmoke(e.target.value)}>
              <option>All</option><option>Yes</option><option>No</option>
            </select>
          </div>
        </div>

        <div className="content">
          <div className="stats-row">
            <div className="stat-chip">Showing <span>{filteredCaregivers.length}</span> of <span>{enriched.length}</span> caregivers</div>
          </div>

          {view === 'table' && (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Caregiver</th>
                  <th>Market</th>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <th key={d} className="center">{d}</th>)}
                  <th className="center" style={{fontSize:"16px"}}>🚗</th>
                  <th className="center" style={{fontSize:"16px"}}>🐕</th>
                  <th className="center" style={{fontSize:"16px"}}>🐈</th>
                  <th className="center" style={{fontSize:"16px"}}>🚬</th>
                </tr>
              </thead>
              <tbody>
                {filteredCaregivers.map((cg, i) => (
                  <tr key={i}>
                    <td className="td-name">{cg.name}</td>
                    <td className="td-market">{cg.market}</td>
                    {dayKeys.map((dk, di) => (
                      <td key={di} className={`td-day ${cg[dk] ? 'active' : 'inactive'}`}>{cg[dk] ? '●' : '·'}</td>
                    ))}
                    <td className="td-pref"><Badge val={cg.drivesClients} /></td>
                    <td className="td-pref"><Badge val={cg.worksDogs} /></td>
                    <td className="td-pref"><Badge val={cg.worksCats} /></td>
                    <td className="td-pref"><Badge val={cg.smokingClient} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {view === 'byDay' && (
            <div className="day-grid">
              {days.map(day => {
                const available = filteredCaregivers.filter(cg => cg[day.toLowerCase()] === 1);
                return (
                  <div key={day} className="day-col">
                    <div className="day-col-header">
                      <div className="day-name">{day.slice(0, 3)}</div>
                      <div className="day-count">{available.length}</div>
                    </div>
                    <div className="day-col-body">
                      {available.map((cg, ci) => (
                        <div key={ci} className="name-chip" title={`Drive: ${cg.drivesClients || '?'} | Dogs: ${cg.worksDogs || '?'} | Cats: ${cg.worksCats || '?'}`}>
                          {cg.name}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
