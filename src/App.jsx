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
  const uniqueWorkPrefs = useMemo(() => ['All', ...
