import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function AvailabilityAnalyzer() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');
  const [fileLoaded, setFileLoaded] = useState(false);
  
  // Filters
  const [filterState, setFilterState] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All'); 
  const [filterWorkPref, setFilterWorkPref] = useState('All');
  const [filterNotes, setFilterNotes] = useState('');

  const getStateFromOffice = (officeText) => {
    const text = officeText.toLowerCase();
    if (text.includes('maryland')) return 'Maryland';
    if (text.includes('massachusetts')) return 'Massachusetts';
    if (text.includes('illinois')) return 'Illinois';
    if (text.includes('virginia')) return 'Virginia';
    return '';
  };

  const handleFileUpload = async (event) => {
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
      if (headerRowIndex === -1) throw new Error('Header row not found');
      
      const processedData = [];
      let currentState = "";

      for (let i = headerRowIndex + 1; i < arrayData.length; i++) {
        const row = arrayData[i];
        if (row[1] && row[1].trim() !== '') {
          // Logic: Carry-forward the State for blank rows
          const rowOffice = row[0] || '';
          const identifiedState = getStateFromOffice(rowOffice);
          if (identifiedState) currentState = identifiedState;

          // Logic: Extract Market from Tags
          const tagString = row[3] || '';
          const market = tagString.split(',')[0].trim() || 'Unknown';

          processedData.push({
            name: row[1],
            state: currentState || 'Unknown',
            market: market,
            workPreference: row[4] || 'Unknown',
            availabilityNotes: row[5] || '',
            sunday: (row[6] === 1 || row[6] === '1') ? 1 : 0,
            monday: (row[7] === 1 || row[7] === '1') ? 1 : 0,
            tuesday: (row[8] === 1 || row[8] === '1') ? 1 : 0,
            wednesday: (row[9] === 1 || row[9] === '1') ? 1 : 0,
            thursday: (row[10] === 1 || row[10] === '1') ? 1 : 0,
            friday: (row[11] === 1 || row[11] === '1') ? 1 : 0,
            saturday: (row[12] === 1 || row[12] === '1') ? 1 : 0
          });
        }
      }
      setCaregivers(processedData);
      setFileLoaded(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uniqueStates = useMemo(() => ['All', ...new Set(caregivers.map(c => c.state))].sort(), [caregivers]);
  
  const uniqueMarkets = useMemo(() => {
    const subset = filterState === 'All' ? caregivers : caregivers.filter(c => c.state === filterState);
    return ['All', ...new Set(subset.map(c => c.market))].sort();
  }, [caregivers, filterState]);

  const uniqueWorkPrefs = useMemo(() => {
    const subset = filterState === 'All' ? caregivers : caregivers.filter(c => c.state === filterState);
    return ['All', ...new Set(subset.map(c => c.workPreference))].sort();
  }, [caregivers, filterState]);

  const filteredCaregivers = useMemo(() => {
    return caregivers.filter(cg => {
      const stateMatch = filterState === 'All' || cg.state === filterState;
      const marketMatch = filterMarket === 'All' || cg.market === filterMarket;
      const prefMatch = filterWorkPref === 'All' || cg.workPreference === filterWorkPref;
      const notesMatch = (cg.availabilityNotes || '').toLowerCase().includes(filterNotes.toLowerCase());
      return stateMatch && marketMatch && prefMatch && notesMatch;
    });
  }, [caregivers, filterState, filterMarket, filterWorkPref, filterNotes]);

  if (!fileLoaded) {
    return (
      <div style={{padding: '50px', textAlign: 'center', fontFamily: 'sans-serif', backgroundColor: '#f9fafb', minHeight: '100vh'}}>
        <h1>Availability Analyzer</h1>
        <p>Operational Dashboard</p>
        <div style={{marginTop: '30px', padding: '20px', background: 'white', borderRadius: '8px', display: 'inline-block', border: '1px solid #e5e7eb'}}>
          <input type="file" onChange={handleFileUpload} />
        </div>
        {loading && <p style={{color: '#2563eb', marginTop: '20px', fontWeight: 'bold'}}>Processing Data...</p>}
        {error && <p style={{color: '#dc2626', marginTop: '20px'}}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{fontFamily: 'sans-serif', padding: '20px', backgroundColor: '#fff', minHeight: '100vh'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '2px solid #f3f4f6', paddingBottom: '10px'}}>
        <div>
          <h2 style={{margin: 0}}>Caregiver Availability</h2>
          <small>{filteredCaregivers.length} Results Found</small>
        </div>
        <div>
          <button onClick={() => setView('table')} style={{padding: '8px 16px', marginRight: '5px', cursor: 'pointer'}}>Table View</button>
          <button onClick={() => setView('byDay')} style={{padding: '8px 16px', marginRight: '5px', cursor: 'pointer'}}>By Day View</button>
          <button onClick={() => setFileLoaded(false)} style={{padding: '8px 16px', color: 'red', cursor: 'pointer'}}>Reset</button>
        </div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px', background: '#f9fafb', padding: '15px', borderRadius: '8px', border: '1px solid #e5e7eb'}}>
        <div>
          <label style={{fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#6b7280'}}>REGION</label>
          <select value={filterState} onChange={(e) => {setFilterState(e.target.value); setFilterMarket('All'); setFilterWorkPref('All');}} style={{width: '100%', padding: '5px'}}>
            {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#6b7280'}}>MARKET (TAG)</label>
          <select value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)} style={{width: '100%', padding: '5px'}}>
            {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#6b7280'}}>WORK PREF</label>
          <select value={filterWorkPref} onChange={(e) => setFilterWorkPref(e.target.value)} style={{width: '100%', padding: '5px'}}>
            {uniqueWorkPrefs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize: '11px', fontWeight: 'bold', display: 'block', marginBottom: '5px', color: '#6b7280'}}>NOTES SEARCH</label>
          <input type="text" value={filterNotes} onChange={(e) => setFilterNotes(e.target.value)} placeholder="Search..." style={{width: '100%', padding: '5px'}} />
        </div>
      </div>

      {view === 'table' ? (
        <table style={{width: '100%', borderCollapse: 'collapse', border: '1px solid #e5e7eb'}}>
          <thead style={{background: '#f3f4f6'}}>
            <tr>
              <th style={{padding: '10px', textAlign: 'left', border: '1px solid #e5e7eb'}}>Caregiver</th>
              <th style={{padding: '10px', textAlign: 'left', border: '1px solid #e5e7eb'}}>Market</th>
              <th style={{padding: '10px', textAlign: 'left', border: '1px solid #e5e7eb'}}>Pref</th>
              {['S','M','T','W','T','F','S'].map(d => <th key={d} style={{padding: '10px', border: '1px solid #e5e7eb', textAlign: 'center'}}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredCaregivers.map((cg, i) => (
              <tr key={i} style={{borderBottom: '1px solid #f3f4f6'}}>
                <td style={{padding: '10px', fontWeight: 'bold'}}>{cg.name}</td>
                <td style={{padding: '10px', color: '#6b7280', fontSize: '12px'}}>{cg.market}</td>
                <td style={{padding: '10px', fontSize: '12px'}}>{cg.workPreference}</td>
                {[cg.sunday, cg.monday, cg.tuesday, cg.wednesday, cg.thursday, cg.friday, cg.saturday].map((active, di) => (
                  <td key={di} style={{padding: '10px', textAlign: 'center', backgroundColor: active ? '#dcfce7' : 'transparent'}}>
                    <span style={{color: active ? '#16a34a' : '#e5e7eb'}}>{active ? '●' : '○'}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '10px'}}>
          {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => {
            const list = filteredCaregivers.filter(cg => cg[day.toLowerCase()] === 1);
            return (
              <div key={day} style={{border: '1px solid #e5e7eb', padding: '10px', background: '#f9fafb', borderRadius: '5px'}}>
                <h4 style={{margin: '0 0 10px 0', fontSize: '12px', color: '#2563eb'}}>{day} ({list.length})</h4>
                {list.map((cg, ci) => <div key={ci} style={{fontSize: '11px', background: 'white', padding: '3px', marginBottom: '2px', border: '1px solid #f3f4f6', fontWeight: 'bold'}}>{cg.name}</div>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
