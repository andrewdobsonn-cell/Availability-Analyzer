import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function AvailabilityAnalyzer() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');
  const [fileLoaded, setFileLoaded] = useState(false);
  
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
          const rowOffice = row[0] || '';
          const identifiedState = getStateFromOffice(rowOffice);
          if (identifiedState) currentState = identifiedState;

          const tags = row[3] || '';
          const market = tags.split(',')[0].trim() || 'Unknown';
          
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
  const uniqueWorkPrefs = useMemo(() => ['All', ...new Set(caregivers.map(c => c.workPreference))].sort(), [caregivers]);

  const filteredCaregivers = useMemo(() => {
    return caregivers.filter(cg => {
      return (filterState === 'All' || cg.state === filterState) &&
             (filterMarket === 'All' || cg.market === filterMarket) &&
             (filterWorkPref === 'All' || cg.workPreference === filterWorkPref) &&
             ((cg.availabilityNotes || '').toLowerCase().includes(filterNotes.toLowerCase()));
    });
  }, [caregivers, filterState, filterMarket, filterWorkPref, filterNotes]);

  if (!fileLoaded) {
    return (
      <div style={{padding: '50px', textAlign: 'center', fontFamily: 'sans-serif'}}>
        <h2>Availability Analyzer</h2>
        <input type="file" onChange={handleFileUpload} style={{marginTop: '20px'}} />
        {loading && <p>Processing...</p>}
        {error && <p style={{color: 'red'}}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{fontFamily: 'sans-serif', padding: '20px'}}>
      <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '20px'}}>
        <h3>Staff: {filteredCaregivers.length}</h3>
        <div>
          <button onClick={() => setView('table')}>Table</button>
          <button onClick={() => setView('byDay')}>By Day</button>
          <button onClick={() => setFileLoaded(false)}>Reset</button>
        </div>
      </div>

      <div style={{display: 'flex', gap: '10px', marginBottom: '20px', background: '#eee', padding: '10px'}}>
        <select value={filterState} onChange={(e) => setFilterState(e.target.value)}>
          {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)}>
          {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <input type="text" placeholder="Search..." value={filterNotes} onChange={(e) => setFilterNotes(e.target.value)} />
      </div>

      {view === 'table' ? (
        <table border="1" cellPadding="10" style={{width: '100%', borderCollapse: 'collapse'}}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Market</th>
              {['S','M','T','W','T','F','S'].map(d => <th key={d}>{d}</th>)}
            </tr>
          </thead>
          <tbody>
            {filteredCaregivers.map((cg, i) => (
              <tr key={i}>
                <td>{cg.name}</td>
                <td>{cg.market}</td>
                {[cg.sunday, cg.monday, cg.tuesday, cg.wednesday, cg.thursday, cg.friday, cg.saturday].map((a, di) => (
                  <td key={di} style={{textAlign: 'center', background: a ? '#dcfce7' : 'transparent'}}>{a ? '1' : '0'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div style={{display: 'flex', gap: '10px'}}>
          {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => {
            const list = filteredCaregivers.filter(cg => cg[day.toLowerCase()] === 1);
            return (
              <div key={day} style={{flex: 1, border: '1px solid #ccc', padding: '10px'}}>
                <small><b>{day} ({list.length})</b></small>
                {list.map((cg, ci) => <div key={ci} style={{fontSize: '10px'}}>{cg.name}</div>)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
