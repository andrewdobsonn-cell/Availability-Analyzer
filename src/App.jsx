import React, { useState } from 'react';
import * as XLSX from 'xlsx';

export default function AvailabilityAnalyzer() {
  const [caregivers, setCaregivers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('table');
  const [fileLoaded, setFileLoaded] = useState(false);
  const [teamSize, setTeamSize] = useState(2);

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
      const headerRowIndex = 4;
      
      const processedData = [];
      for (let i = headerRowIndex + 1; i < arrayData.length; i++) {
        const row = arrayData[i];
        const caregiverName = row[1];
        
        if (caregiverName && caregiverName.trim() !== '') {
          processedData.push({
            name: caregiverName,
            sunday: row[5] === 1 ? 1 : 0,
            monday: row[6] === 1 ? 1 : 0,
            tuesday: row[7] === 1 ? 1 : 0,
            wednesday: row[8] === 1 ? 1 : 0,
            thursday: row[9] === 1 ? 1 : 0,
            friday: row[10] === 1 ? 1 : 0,
            saturday: row[11] === 1 ? 1 : 0
          });
        }
      }

      setCaregivers(processedData);
      setFileLoaded(true);
      setLoading(false);
    } catch (err) {
      setError('Error loading file: ' + err.message);
      setLoading(false);
    }
  };

  const getAvailableByDay = () => {
    const days = {
      Sunday: [],
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
      Saturday: []
    };

    caregivers.forEach(caregiver => {
      if (caregiver.sunday === 1) days.Sunday.push(caregiver.name);
      if (caregiver.monday === 1) days.Monday.push(caregiver.name);
      if (caregiver.tuesday === 1) days.Tuesday.push(caregiver.name);
      if (caregiver.wednesday === 1) days.Wednesday.push(caregiver.name);
      if (caregiver.thursday === 1) days.Thursday.push(caregiver.name);
      if (caregiver.friday === 1) days.Friday.push(caregiver.name);
      if (caregiver.saturday === 1) days.Saturday.push(caregiver.name);
    });

    return days;
  };

  const getDaysAvailable = (caregiver) => {
    const days = [];
    if (caregiver.sunday === 1) days.push('Sun');
    if (caregiver.monday === 1) days.push('Mon');
    if (caregiver.tuesday === 1) days.push('Tue');
    if (caregiver.wednesday === 1) days.push('Wed');
    if (caregiver.thursday === 1) days.push('Thu');
    if (caregiver.friday === 1) days.push('Fri');
    if (caregiver.saturday === 1) days.push('Sat');
    return days;
  };

  const getTeamCoverage = (team) => {
    const coverage = {
      sunday: false,
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false
    };

    team.forEach(caregiver => {
      if (caregiver.sunday === 1) coverage.sunday = true;
      if (caregiver.monday === 1) coverage.monday = true;
      if (caregiver.tuesday === 1) coverage.tuesday = true;
      if (caregiver.wednesday === 1) coverage.wednesday = true;
      if (caregiver.thursday === 1) coverage.thursday = true;
      if (caregiver.friday === 1) coverage.friday = true;
      if (caregiver.saturday === 1) coverage.saturday = true;
    });

    return coverage;
  };

  const getCoverageCount = (coverage) => {
    return Object.values(coverage).filter(v => v).length;
  };

  const generateTeamSuggestions = () => {
    const suggestions = [];
    const used = new Set();

    // Filter caregivers with at least one day available
    const availableCaregivers = caregivers.filter(cg => 
      getDaysAvailable(cg).length > 0
    );

    // Generate teams
    const maxTeams = 10;
    let attempts = 0;
    const maxAttempts = 1000;

    while (suggestions.length < maxTeams && attempts < maxAttempts) {
      attempts++;
      
      // Start with a random caregiver
      const availablePool = availableCaregivers.filter(cg => !used.has(cg.name));
      if (availablePool.length < teamSize) break;

      const team = [];
      const teamNames = new Set();
      
      // Pick first member
      const firstIndex = Math.floor(Math.random() * availablePool.length);
      const firstMember = availablePool[firstIndex];
      team.push(firstMember);
      teamNames.add(firstMember.name);

      // Add remaining members trying to maximize coverage
      for (let i = 1; i < teamSize; i++) {
        let bestCandidate = null;
        let bestCoverage = 0;

        // Try to find the best complementary caregiver
        availablePool.forEach(candidate => {
          if (!teamNames.has(candidate.name)) {
            const testTeam = [...team, candidate];
            const coverage = getTeamCoverage(testTeam);
            const coverageCount = getCoverageCount(coverage);
            
            if (coverageCount > bestCoverage) {
              bestCoverage = coverageCount;
              bestCandidate = candidate;
            }
          }
        });

        if (bestCandidate) {
          team.push(bestCandidate);
          teamNames.add(bestCandidate.name);
        }
      }

      if (team.length === teamSize) {
        const coverage = getTeamCoverage(team);
        const coverageCount = getCoverageCount(coverage);
        
        suggestions.push({
          team,
          coverage,
          coverageCount
        });

        // Mark these caregivers as used
        team.forEach(member => used.add(member.name));
      }
    }

    // Sort by coverage (best coverage first)
    suggestions.sort((a, b) => b.coverageCount - a.coverageCount);

    return suggestions;
  };

  if (!fileLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Caregiver Availability Analyzer</h1>
          <p className="text-gray-600 mb-6">Upload your "Ongoing Availability.xlsx" file to get started.</p>
          
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-blue-300 border-dashed rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <svg className="w-10 h-10 mb-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="mb-2 text-sm text-blue-600 font-semibold">Click to upload Excel file</p>
              <p className="text-xs text-gray-500">XLSX files only</p>
            </div>
            <input 
              type="file" 
              className="hidden" 
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
            />
          </label>
          
          {loading && (
            <div className="mt-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading...</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const availableByDay = getAvailableByDay();
  const teamSuggestions = view === 'teams' ? generateTeamSuggestions() : [];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Caregiver Availability Analyzer</h1>
              <p className="text-gray-600">Total Caregivers: {caregivers.length}</p>
            </div>
            <button
              onClick={() => setFileLoaded(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
            >
              Upload New File
            </button>
          </div>

          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setView('table')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'table'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setView('byDay')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'byDay'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              By Day View
            </button>
            <button
              onClick={() => setView('teams')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                view === 'teams'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Care Team Builder
            </button>
          </div>

          {view === 'table' && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="border border-blue-700 px-4 py-3 text-left font-semibold sticky left-0 bg-blue-600 z-10">
                      Caregiver Name
                    </th>
                    <th className="border border-blue-700 px-4 py-3 text-center font-semibold">Sun</th>
                    <th className="border border-blue-700 px-4 py-3 text-center font-semibold">Mon</th>
                    <th className="border border-blue-700 px-4 py-3 text-center font-semibold">Tue</th>
                    <th className="border border-blue-700 px-4 py-3 text-center font-semibold">Wed</th>
                    <th className="border border-blue-700 px-4 py-3 text-center font-semibold">Thu</th>
                    <th className="border border-blue-700 px-4 py-3 text-center font-semibold">Fri</th>
                    <th className="border border-blue-700 px-4 py-3 text-center font-semibold">Sat</th>
                  </tr>
                </thead>
                <tbody>
                  {caregivers.map((caregiver, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      <td className="border border-gray-300 px-4 py-2 font-medium text-gray-800 sticky left-0 z-10 bg-inherit">
                        {caregiver.name}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center ${
                        caregiver.sunday === 1 ? 'bg-green-100 text-green-800 font-bold' : 'bg-red-50 text-red-600'
                      }`}>
                        {caregiver.sunday}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center ${
                        caregiver.monday === 1 ? 'bg-green-100 text-green-800 font-bold' : 'bg-red-50 text-red-600'
                      }`}>
                        {caregiver.monday}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center ${
                        caregiver.tuesday === 1 ? 'bg-green-100 text-green-800 font-bold' : 'bg-red-50 text-red-600'
                      }`}>
                        {caregiver.tuesday}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center ${
                        caregiver.wednesday === 1 ? 'bg-green-100 text-green-800 font-bold' : 'bg-red-50 text-red-600'
                      }`}>
                        {caregiver.wednesday}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center ${
                        caregiver.thursday === 1 ? 'bg-green-100 text-green-800 font-bold' : 'bg-red-50 text-red-600'
                      }`}>
                        {caregiver.thursday}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center ${
                        caregiver.friday === 1 ? 'bg-green-100 text-green-800 font-bold' : 'bg-red-50 text-red-600'
                      }`}>
                        {caregiver.friday}
                      </td>
                      <td className={`border border-gray-300 px-4 py-2 text-center ${
                        caregiver.saturday === 1 ? 'bg-green-100 text-green-800 font-bold' : 'bg-red-50 text-red-600'
                      }`}>
                        {caregiver.saturday}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {view === 'byDay' && (
            <div className="space-y-6">
              {Object.entries(availableByDay).map(([day, names]) => (
                <div key={day} className="bg-gray-50 rounded-lg p-5 border border-gray-200">
                  <h3 className="text-xl font-bold text-gray-800 mb-3 flex items-center justify-between">
                    <span>{day}</span>
                    <span className="text-sm font-semibold bg-blue-600 text-white px-3 py-1 rounded-full">
                      {names.length} available
                    </span>
                  </h3>
                  {names.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {names.map((name, idx) => (
                        <div key={idx} className="bg-white px-3 py-2 rounded border border-gray-300 text-gray-700">
                          {name}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 italic">No caregivers available</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {view === 'teams' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Care Team Size:
                </label>
                <input
                  type="number"
                  min="2"
                  max="10"
                  value={teamSize}
                  onChange={(e) => setTeamSize(parseInt(e.target.value) || 2)}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-sm text-gray-600 mt-2">
                  Build care teams with {teamSize} caregiver{teamSize !== 1 ? 's' : ''} whose schedules complement each other for maximum weekly coverage
                </p>
              </div>

              {teamSuggestions.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4">
                  <p className="text-yellow-800">Not enough available caregivers to create teams of {teamSize}.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {teamSuggestions.map((suggestion, idx) => {
                    const { team, coverage, coverageCount } = suggestion;
                    const isFullCoverage = coverageCount === 7;
                    
                    return (
                      <div key={idx} className={`rounded-lg p-5 border-2 ${
                        isFullCoverage 
                          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-400' 
                          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300'
                      }`}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold text-gray-800">Care Team {idx + 1}</h3>
                          <span className={`text-sm font-bold px-4 py-2 rounded-full ${
                            isFullCoverage 
                              ? 'bg-green-600 text-white' 
                              : 'bg-blue-600 text-white'
                          }`}>
                            {coverageCount}/7 Days Covered {isFullCoverage ? '✓' : ''}
                          </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4 mb-4">
                          {team.map((member, memberIdx) => {
                            const days = getDaysAvailable(member);
                            return (
                              <div key={memberIdx} className="bg-white rounded-lg p-4 border border-gray-300 shadow-sm">
                                <div className="font-semibold text-gray-800 mb-2">{member.name}</div>
                                <div className="text-sm text-gray-600">
                                  Available: <span className="font-medium text-blue-700">{days.join(', ')}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-300">
                          <div className="text-sm font-semibold text-gray-700 mb-2">Weekly Coverage:</div>
                          <div className="flex flex-wrap gap-2">
                            {['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(day => (
                              <div key={day} className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                coverage[day] 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-gray-300 text-gray-600'
                              }`}>
                                {day.substring(0, 3).toUpperCase()}
                              </div>
                            ))}
                          </div>
                          {!isFullCoverage && (
                            <div className="mt-3 text-sm text-orange-700">
                              ⚠ Missing coverage on: {
                                ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
                                  .filter(day => !coverage[day])
                                  .map(day => day.substring(0, 3).toUpperCase())
                                  .join(', ')
                              }
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}