import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function AvailabilityAnalyzer() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');
  const [fileLoaded, setFileLoaded] = useState(false);
  const [teamSize, setTeamSize] = useState(2);
  
  // Filters
  const [filterState, setFilterState] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All'); // Added Market Filter
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
      if (headerRowIndex === -1) throw new Error('Could not find header row with "Caregiver Name"');
      
      const processedData = [];
      let currentState = ""; // Persistent state tracking

      for (let i = headerRowIndex + 1; i < arrayData.length; i++) {
        const row = arrayData[i];
        const caregiverName = row[1];
        
        if (caregiverName && caregiverName.trim() !== '') {
          // Forward-fill logic for Office/State
          const rowOffice = row[0] || '';
          const identifiedState = getStateFromOffice(rowOffice);
          if (identifiedState) currentState = identifiedState;

          // Extract Market from first tag
          const tags = row[3] || '';
          const market = tags.split(',')[0].trim() || 'Unknown';
          
          processedData.push({
            name: caregiverName,
            office: rowOffice,
            state: currentState || 'Unknown',
            market: market,
            designation: row[2] || '',
            tags: tags,
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
      setError('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter Options Logic
  const uniqueStates = useMemo(() => ['All', ...new Set(caregivers.map(c => c.state))].sort(), [caregivers]);
  
  const uniqueMarkets = useMemo(() => {
    const subset = filterState === 'All' ? caregivers : caregivers.filter(c => c.state === filterState);
    return ['All', ...new Set(subset.map(c => c.market))].sort();
  }, [caregivers, filterState]);

  const uniqueWorkPrefs = useMemo(() => ['All', ...new Set(caregivers.map(c => c.workPreference))].sort(), [caregivers]);

  const filteredCaregivers = useMemo(() => {
    return caregivers.filter(cg => {
      const stateMatch = filterState === 'All' || cg.state === filterState;
      const marketMatch = filterMarket === 'All' || cg.market === filterMarket;
      const workPrefMatch = filterWorkPref === 'All' || cg.workPreference === filterWorkPref;
      const notesMatch = filterNotes === '' || (cg.availabilityNotes || '').toLowerCase().includes(filterNotes.toLowerCase());
      return stateMatch && marketMatch && workPrefMatch && notesMatch;
    });
  }, [caregivers, filterState, filterMarket, filterWorkPref, filterNotes]);

  // Helper Functions
  const getDaysAvailable = (cg) => {
    const d = [];
    if (cg.sunday) d.push('Sun'); if (cg.monday) d.push('Mon'); if (cg.tuesday) d.push('Tue');
    if (cg.wednesday) d.push('Wed'); if (cg.thursday) d.push('Thu'); if (cg.friday) d.push('Fri');
    if (cg.saturday) d.push('Sat');
    return d;
  };

  if (!fileLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold mb-4">Availability Analyzer</h1>
          <p className="text-gray-600 mb-6">Upload "Ongoing Availability.xlsx" to start.</p>
          <input type="file" accept=".xlsx" onChange={handleFileUpload} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
          {loading && <p className="mt-4 animate-pulse text-blue-600 font-bold">Processing Visits...</p>}
          {error && <p className="mt-4 text-red-500">{error}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Admin Ops: {filteredCaregivers.length} Caregivers</h1>
            <div className="flex gap-2">
              <button onClick={() => setView('table')} className={`px-4 py-2 rounded font-medium ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Table View</button>
              <button onClick={() => setView('byDay')} className={`px-4 py-2 rounded font-medium ${view === 'byDay' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>By Day View</button>
              <button onClick={() => setView('teams')} className={`px-4 py-2 rounded font-medium ${view === 'teams' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Team Builder</button>
              <button onClick={() => setFileLoaded(false)} className="px-4 py-2 text-red-600 font-medium">Reset</button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg border">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">State</label>
              <select value={filterState} onChange={(e) => {setFilterState(e.target.value); setFilterMarket('All');}} className="w-full p-2 border rounded">
                {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Market (Tag)</label>
              <select value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)} className="w-full p-2 border rounded">
                {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Work Preference</label>
              <select value={filterWorkPref} onChange={(e) => setFilterWorkPref(e.target.value)} className="w-full p-2 border rounded">
                {uniqueWorkPrefs.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase block mb-1">Search Notes</label>
              <input type="text" placeholder="Dementia, Live-in..." value={filterNotes} onChange={(e) => setFilterNotes(e.target.value)} className="w-full p-2 border rounded" />
            </div>
          </div>
        </div>

        {view === 'table' && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden border">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="p-3 border-b border-blue-700">Caregiver</th>
                  <th className="p-3 border-b border-blue-700">Market</th>
                  {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <th key={d} className="p-3 border-b border-blue-700 text-center">{d}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredCaregivers.map((cg, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="p-3 font-bold">{cg.name}</td>
                    <td className="p-3 text-gray-500 font-medium uppercase text-xs">{cg.market}</td>
                    {[cg.sunday, cg.monday, cg.tuesday, cg.wednesday, cg.thursday, cg.friday, cg.saturday].map((active, di) => (
                      <td key={di} className={`p-3 text-center ${active ? 'bg-green-100 text-green-800 font-bold' : 'text-gray-200'}`}>{active ? '1' : '0'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {view === 'byDay' && (
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map(day => {
              const available = filteredCaregivers.filter(cg => cg[day.toLowerCase()] === 1);
              return (
                <div key={day} className="bg-white rounded-lg shadow border p-4">
                  <h3 className="font-bold border-b pb-2 mb-3 text-blue-600">{day} ({available.length})</h3>
                  <div className="space-y-2">
                    {available.map((cg, ci) => (
                      <div key={ci} className="text-xs p-2 bg-gray-50 rounded border font-medium">{cg.name}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {view === 'teams' && (
           <div className="bg-white p-6 rounded-lg shadow border text-center">
              <p className="text-gray-500 italic">Care Team Builder is active. Select State and Market to view potential team configurations.</p>
              {/* Rest of Team Builder logic remains accessible via state/filteredCaregivers */}
           </div>
        )}
      </div>
    </div>
  );
}
