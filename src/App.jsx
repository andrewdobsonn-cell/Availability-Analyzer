import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function AvailabilityAnalyzer() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileLoaded, setFileLoaded] = useState(false);
  
  // High-Efficiency Filters
  const [filterState, setFilterState] = useState('All');
  const [filterMarket, setFilterMarket] = useState('All');
  const [filterWorkPref, setFilterWorkPref] = useState('All');

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
      if (headerRowIndex === -1) throw new Error('Column "Caregiver Name" not found.');
      
      const processedData = [];
      let currentState = ""; 

      for (let i = headerRowIndex + 1; i < arrayData.length; i++) {
        const row = arrayData[i];
        if (row[1] && row[1].trim() !== '') {
          // Carry-forward state logic
          const rowOffice = row[0] || '';
          const identifiedState = getStateFromOffice(rowOffice);
          if (identifiedState) currentState = identifiedState;

          // Extract Market (First Tag)
          const tagString = row[3] || '';
          const market = tagString.split(',')[0].trim() || 'Unknown';

          processedData.push({
            name: row[1],
            state: currentState || 'Unknown',
            market: market,
            workPreference: row[4] || 'Unknown',
            days: [row[6], row[7], row[8], row[9], row[10], row[11], row[12]].map(val => (val === 1 || val === '1' ? 1 : 0))
          });
        }
      }
      setCaregivers(processedData);
      setFileLoaded(true);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Memoized Filter Options
  const uniqueStates = useMemo(() => ['All', ...new Set(caregivers.map(c => c.state))].sort(), [caregivers]);
  
  const uniqueMarkets = useMemo(() => {
    const subset = filterState === 'All' ? caregivers : caregivers.filter(c => c.state === filterState);
    return ['All', ...new Set(subset.map(c => c.market))].sort();
  }, [caregivers, filterState]);

  const filteredData = useMemo(() => {
    return caregivers.filter(cg => 
      (filterState === 'All' || cg.state === filterState) &&
      (filterMarket === 'All' || cg.market === filterMarket) &&
      (filterWorkPref === 'All' || cg.workPreference === filterWorkPref)
    );
  }, [caregivers, filterState, filterMarket, filterWorkPref]);

  if (!fileLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 font-sans">
        <div className="bg-white p-12 rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full text-center">
          <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          </div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">Availability Analyzer</h1>
          <p className="text-slate-500 mb-8 font-medium">Upload "Ongoing Availability.xlsx" to map coverage.</p>
          <label className="cursor-pointer">
            <div className="py-4 px-8 bg-slate-900 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-xl">
              Select File
            </div>
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Filters Header */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Region / State</label>
            <select value={filterState} onChange={(e) => {setFilterState(e.target.value); setFilterMarket('All');}} className="w-full bg-slate-50 border-none rounded-xl text-sm font-bold p-3">
              {uniqueStates.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Market (Market Area)</label>
            <select value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)} className="w-full bg-slate-50 border-none rounded-xl text-sm font-bold p-3">
              {uniqueMarkets.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex flex-col justify-center">
             <div className="text-sm font-black text-slate-900">{filteredData.length} Staff Available</div>
             <div className="text-[10px] font-bold text-blue-600 uppercase tracking-tighter">Current Filter: {filterMarket}</div>
          </div>
          <div className="flex justify-end">
            <button onClick={() => setFileLoaded(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600">Change Data Source</button>
          </div>
        </div>

        {/* Results Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Caregiver</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Market</th>
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => <th key={i} className="px-2 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{d}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredData.map((cg, i) => (
                <tr key={i} className="hover:bg-blue-50/30 transition-all group">
                  <td className="px-8 py-5 font-bold text-slate-900">{cg.name}</td>
                  <td className="px-8 py-5 text-slate-400 text-xs font-bold uppercase">{cg.market}</td>
                  {cg.days.map((active, dIdx) => (
                    <td key={dIdx} className="text-center py-5">
                      <div className={`w-2.5 h-2.5 rounded-full mx-auto ${active ? 'bg-blue-600 shadow-sm' : 'bg-slate-100'}`}></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
