import { useEffect, useState, useMemo } from 'react';

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString();
}

// Unicode triangles for arrows
const upTriangle = '▲';
const downTriangle = '▼';

// Rank order with lowercase keys for safe lookup
const rankOrder = {
  recruit: 1,
  corporal: 2,
  sergeant: 3,
  lieutenant: 4,
  captain: 5,
  general: 6,
  admin: 7,
  organiser: 8,
  coordinator: 9,
  overseer: 10,
  'deputy owner': 11,
  owner: 12,
  // Add all ranks you have here, lowercase and exact spelling
};

export default function Home() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sorting state
  const [sortKey, setSortKey] = useState('name'); // default sort by name
  const [sortAsc, setSortAsc] = useState(true);

  // Filtering state
  const [filterText, setFilterText] = useState('');
  const [filterRankChanged, setFilterRankChanged] = useState('all'); // 'all', 'yes', 'no'

  useEffect(() => {
    async function fetchMembers() {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
      setLoading(false);
    }
    fetchMembers();
  }, []);

  // Sort and filter members memoized to avoid unnecessary recalculations
  const filteredSortedMembers = useMemo(() => {
    let filtered = members;

    // Filter by name (case insensitive)
    if (filterText.trim() !== '') {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    // Filter by rank_changed flag
    if (filterRankChanged === 'yes') {
      filtered = filtered.filter(m => m.rank_changed);
    } else if (filterRankChanged === 'no') {
      filtered = filtered.filter(m => !m.rank_changed);
    }

    // Sorting
    const sorted = [...filtered].sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      // Special handling for joined (date)
      if (sortKey === 'joined') {
        valA = new Date(valA);
        valB = new Date(valB);
      }

      // For membershipDuration, compute diff days to sort by duration
      if (sortKey === 'membershipDuration') {
        const now = new Date();
        const diffA = !valA ? -Infinity : now - new Date(valA);
        const diffB = !valB ? -Infinity : now - new Date(valB);
        return sortAsc ? diffA - diffB : diffB - diffA;
      }

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA > valB) return sortAsc ? 1 : -1;
      if (valA < valB) return sortAsc ? -1 : 1;
      return 0;
    });

    return sorted;
  }, [members, filterText, filterRankChanged, sortKey, sortAsc]);

  // Calculate membership duration helper
  function getMembershipDuration(joined) {
    const joinDate = new Date(joined);
    const now = new Date();

    if (isNaN(joinDate)) return 'Unknown';

    const diffMs = now - joinDate;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    return diffDays > 365
      ? `${Math.floor(diffDays / 365)} yr${Math.floor(diffDays / 365) > 1 ? 's' : ''}`
      : `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }

  // Handle column header click for sorting
  function handleSort(key) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  if (loading) return <p>Loading clan members...</p>;
  if (!members.length) return <p>No clan members found.</p>;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '40px auto',
        padding: 20,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#222',
      }}
    >
      <h1 style={{ marginBottom: 24 }}>Clan Members - Remenant</h1>

      {/* Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Filter by name..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{ padding: '6px 10px', fontSize: 16, flexGrow: 1, minWidth: 180 }}
        />

        <select
          value={filterRankChanged}
          onChange={e => setFilterRankChanged(e.target.value)}
          style={{ padding: '6px 10px', fontSize: 16 }}
        >
          <option value="all">All Members</option>
          <option value="yes">Rank Changed: Yes</option>
          <option value="no">Rank Changed: No</option>
        </select>
      </div>

      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          boxShadow: '0 0 10px rgba(0,0,0,0.05)',
          cursor: 'default',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '3px solid #444',
              textAlign: 'left',
              backgroundColor: '#f9f9f9',
              color: '#333',
            }}
          >
            {['name', 'rank', 'previous_rank', 'joined', 'membershipDuration', 'rank_changed'].map(key => {
              let label = '';
              switch (key) {
                case 'name':
                  label = 'Name';
                  break;
                case 'rank':
                  label = 'Rank';
                  break;
                case 'previous_rank':
                  label = 'Previous Rank';
                  break;
                case 'joined':
                  label = 'Joined';
                  break;
                case 'membershipDuration':
                  label = 'Membership Duration';
                  break;
                case 'rank_changed':
                  label = 'Rank Changed?';
                  break;
              }
              return (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{
                    padding: '10px 12px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    cursor: 'pointer',
                    userDrag: 'none',
                  }}
                  title={`Sort by ${label}`}
                >
                  {label}
                  {sortKey === key ? (sortAsc ? ' ▲' : ' ▼') : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredSortedMembers.map(({ name, rank, previous_rank, joined, rank_changed }) => {
            const membershipDuration = getMembershipDuration(joined);

            // Normalize rank strings for comparison
            const prevRankKey = previous_rank?.trim().toLowerCase() || '';
            const currRankKey = rank?.trim().toLowerCase() || '';
            const prevRankValue = rankOrder[prevRankKey] || 0;
            const currRankValue = rankOrder[currRankKey] || 0;
            const promoted = currRankValue > prevRankValue;
            const demoted = currRankValue < prevRankValue;

            let rankChangeIndicator = null;
            if (rank_changed) {
              if (promoted) {
                rankChangeIndicator = (
                  <span style={{ color: 'green', fontWeight: 'bold', marginLeft: 4 }}>{upTriangle}</span>
                );
              } else if (demoted) {
                rankChangeIndicator = (
                  <span style={{ color: 'red', fontWeight: 'bold', marginLeft: 4 }}>{downTriangle}</span>
                );
              } else {
                rankChangeIndicator = (
                  <span style={{ color: 'blue', fontWeight: 'bold', marginLeft: 4 }}>{downTriangle}</span>
                );
              }
            }

            return (
              <tr
                key={name}
                style={{
                  borderBottom: '1px solid #eee',
                  backgroundColor: rank_changed ? '#e6ffed' : 'white',
                }}
              >
                <td style={{ padding: '8px 12px' }}>{name}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  {rank}
                  {rankChangeIndicator}
                </td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{previous_rank || '-'}</td>
                <td style={{ padding: '8px 12px' }}>{formatDate(joined)}</td>
                <td style={{ padding: '8px 12px' }}>{membershipDuration}</td>
                <td
                  style={{
                    padding: '8px 12px',
                    color: rank_changed ? 'green' : 'gray',
                    fontWeight: rank_changed ? 'bold' : 'normal',
                    textTransform: 'capitalize',
                  }}
                >
                  {rank_changed ? 'Yes' : 'No'}
                </td>
              </tr>
            );
          })}
          {filteredSortedMembers.length === 0 && (
            <tr>
              <td colSpan={6} style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                No members match the filter criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
