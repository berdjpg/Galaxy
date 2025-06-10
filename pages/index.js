import { useEffect, useState, useMemo } from 'react';

// Format a date from timestamp or string
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString();
}

// Unicode triangles for rank change indicators
const upTriangle = '▲';
const downTriangle = '▼';

// Map of ranks with order for comparison
const rankOrder = {
  'recruit': 1,
  'corporal': 2,
  'sergeant': 3,
  'lieutenant': 4,
  'captain': 5,
  'general': 6,
  'admin': 7,
  'organiser': 8,
  'coordinator': 9,
  'overseer': 10,
  'deputy owner': 11,
  'owner': 12,
};

export default function Home() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);

  const [filterText, setFilterText] = useState('');
  const [filterRankChanged, setFilterRankChanged] = useState('all');

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Sort and filter logic
  const filteredSortedMembers = useMemo(() => {
    let filtered = [...members];

    if (filterText.trim()) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(filterText.toLowerCase())
      );
    }

    if (filterRankChanged === 'yes') {
      filtered = filtered.filter(m => m.rank_changed);
    } else if (filterRankChanged === 'no') {
      filtered = filtered.filter(m => !m.rank_changed);
    }

    filtered.sort((a, b) => {
      let valA = a[sortKey];
      let valB = b[sortKey];

      if (sortKey === 'joined') {
        valA = new Date(valA);
        valB = new Date(valB);
      }

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

    return filtered;
  }, [members, filterText, filterRankChanged, sortKey, sortAsc]);

  const getMembershipDuration = (joined) => {
    const joinDate = new Date(joined);
    if (isNaN(joinDate)) return 'Unknown';

    const now = new Date();
    const days = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));

    return days > 365
      ? `${Math.floor(days / 365)} yr${days >= 730 ? 's' : ''}`
      : `${days} day${days !== 1 ? 's' : ''}`;
  };

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  if (loading) return <p>Loading clan members...</p>;
  if (!members.length) return <p>No clan members found.</p>;

  return (
    <div style={{
      maxWidth: 900,
      margin: '40px auto',
      padding: 20,
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      color: '#222',
    }}>
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

      {/* Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        boxShadow: '0 0 10px rgba(0,0,0,0.05)',
      }}>
        <thead>
          <tr style={{
            borderBottom: '3px solid #444',
            backgroundColor: '#f9f9f9',
            color: '#333',
            textAlign: 'left',
          }}>
            {['name', 'rank', 'previous_rank', 'joined', 'membershipDuration', 'rank_changed'].map(key => {
              const labels = {
                name: 'Name',
                rank: 'Rank',
                previous_rank: 'Previous Rank',
                joined: 'Joined',
                membershipDuration: 'Membership Duration',
                rank_changed: 'Rank Changed?',
              };
              return (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{
                    padding: '10px 12px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    cursor: 'pointer',
                  }}
                  title={`Sort by ${labels[key]}`}
                >
                  {labels[key]} {sortKey === key ? (sortAsc ? upTriangle : downTriangle) : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredSortedMembers.map(({ name, rank, previous_rank, joined, rank_changed }) => {
            const duration = getMembershipDuration(joined);

            const prevVal = rankOrder[previous_rank?.trim().toLowerCase()] || 0;
            const currVal = rankOrder[rank?.trim().toLowerCase()] || 0;

            let rankIndicator = null;
            if (rank_changed) {
              if (currVal > prevVal) {
                rankIndicator = <span style={{ color: 'green', fontWeight: 'bold', marginLeft: 4 }}>{upTriangle}</span>;
              } else if (currVal < prevVal) {
                rankIndicator = <span style={{ color: 'red', fontWeight: 'bold', marginLeft: 4 }}>{downTriangle}</span>;
              } else {
                rankIndicator = <span style={{ color: 'blue', fontWeight: 'bold', marginLeft: 4 }}>=</span>;
              }
            }

            return (
              <tr key={name} style={{
                borderBottom: '1px solid #eee',
                backgroundColor: rank_changed ? '#e6ffed' : 'white',
              }}>
                <td style={{ padding: '8px 12px' }}>{name}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  {rank} {rankIndicator}
                </td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  {previous_rank || '-'}
                </td>
                <td style={{ padding: '8px 12px' }}>{formatDate(joined)}</td>
                <td style={{ padding: '8px 12px' }}>{duration}</td>
                <td style={{
                  padding: '8px 12px',
                  color: rank_changed ? 'green' : 'gray',
                  fontWeight: rank_changed ? 'bold' : 'normal',
                  textTransform: 'capitalize',
                }}>
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
