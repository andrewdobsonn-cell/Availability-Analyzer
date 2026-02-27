import React, { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';

export default function AvailabilityAnalyzer() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');
  const [fileLoaded, setFileLoaded] = useState(false);
  const [teamSize, setTeamSize] = useState(2);
  
  // Original Filters
  const [filterState, setFilterState] = useState('All');
  const [filterWorkPref, setFilterWorkPref] = useState('All');
  const [filterNotes, setFilterNotes] = useState('');

  const getStateFromOfficeAndTags = (office, tags) => {
    const searchText = `${office} ${tags}`.toLowerCase();
    
    if (searchText.includes('annapolis') || searchText.includes('baltimore') || 
        searchText.includes('bethesda') || searchText.includes('bel-air')) {
      return 'Maryland';
    }
    if (searchText.includes('boston') || searchText.includes('mwb') || 
        searchText.includes('north of boston') || searchText.includes('nob') || 
        searchText.includes('sob') || searchText.includes('south of boston') || 
        searchText.includes('bos')) {
      return 'Massachusetts';
    }
    if (searchText.includes('chi') || searchText.includes('chicago')) {
      return 'Illinois';
    }
    if (searchText.includes('northern virginia') || searchText.includes('nva') || 
        searchText.includes('northern-va')) {
      return 'Virginia';
    }
    return 'Unknown';
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
      
      let headerRowIndex = -1;
      for (let i = 0; i < Math.min(10, arrayData.length); i++) {
        const row = arrayData[i];
        if (row[1] === 'Caregiver Name') {
          headerRowIndex = i
