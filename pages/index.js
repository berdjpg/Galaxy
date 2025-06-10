import { useEffect, useState, useMemo, useRef } from 'react';

// Format a date from timestamp or string
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Unicode triangles for rank change indicators
const upTriangle = '▲';
const downTriangle = '▼';

// Map of ranks with order for comparison
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
};

export default function Home() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterText, setFilterText] = useState('');

  // Track hovered member name and ref of hovered row for popup positioning
  const [hoveredMember, setHoveredMember] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const hoveredRowRef = useRef(null);

  // Popup position state
  const [popupStyle, setPopupStyle] = useState({ top: 0, left: 0, opacity: 0 });

  useEffect(() => {
    async function fetchData() {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
      setLoading(false);
    }
    fetchData();
  }, []);

  // Fetch rank change history on hover
  useEffect(() => {
    if (!hoveredMember) {
      setHistoryData([]);
      setPopupStyle(style => ({ ...style, opacity: 0 }));
      return;
    }

    async function fetchHistory() {
      setHistoryLoading(true);
      try {
        const res = await fetch(`/api/rank_history?member=${encodeURIComponent(hoveredMember)}`);
        if (!res.ok) throw new Error('Failed to fetch history');
        const data = await res.json();
        setHistoryData(data);
      } catch (e) {
        console.error(e);
        setHistoryData([]);
      }
      setHistoryLoading(false);
    }

    fetchHistory();

    // Position popup near hovered row
    if (hoveredRowRef.current) {
      const rowRect = hoveredRowRef.current.getBoundingClientRect();
      const popupWidth = 320;
      const popupHeight = 300;
      const margin = 8;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Try to position popup below the row
      let top = rowRect.bottom + window.scrollY + margin;
      if (top + popupHeight > window.scrollY + viewportHeight) {
        // Not enough space below, place above
        top = rowRect.top + window.scrollY - popupHeight - margin;
      }

      // Align left with row but keep in viewport horizontally
      let left = rowRect.left + window.scrollX;
      if (left + popupWidth > window.scrollX + viewportWidth) {
        left = window.scrollX + viewportWidth - popupWidth - margin;
      }
      if (left < window.scrollX + margin) {
        left = window.scrollX + margin;
      }

      setPopupStyle({
        top,
        left,
        opacity: 1,
      });
    }
  }, [hoveredMember]);

  const filteredSortedMembers = useMemo(() => {
    let filtered = [...members];

    if (filterText.trim()) {
      filtered = filtered.filter(m =>
        m.name.toLowerCase().includes(filterText.toLowerCase())
      );
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
  }, [members, filterText, sortKey, sortAsc]);

  const getMembershipDuration = (joined) => {
    const joinDate = new Date(joined);
    if (isNaN(joinDate)) return 'Unknown';

    const now = new Date();
    const days = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));

    return days > 365
      ? `${Math.floor(days / 365)} yr${days >= 730 ? 's' : ''}`
      : `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Find rank difference indicator based on historyData (latest change)
  function getRankIndicator(currentRank) {
    if (!historyData.length) return null;

    const latestChange = historyData[0]; // assuming history is sorted descending by changed_at
    if (!latestChange) return null;

    const oldRankVal = rankOrder[(latestChange.old_rank || '').toLowerCase().trim()] || 0;
    const newRankVal = rankOrder[(latestChange.new_rank || '').toLowerCase().trim()] || 0;

    if (newRankVal > oldRankVal) return <span style={{ color: 'green', marginLeft: 6 }}>{upTriangle}</span>;
    if (newRankVal < oldRankVal) return <span style={{ color: 'red', marginLeft: 6 }}>{downTriangle}</span>;
    return null;
  }

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
    <div
      style={{
        maxWidth: 900,
        margin: '40px auto',
        padding: 20,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#222',
        position: 'relative',
      }}
      onMouseLeave={() => setHoveredMember(null)}
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
      </div>

      {/* Table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          boxShadow: '0 0 10px rgba(0,0,0,0.05)',
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: '3px solid #444',
              backgroundColor: '#f9f9f9',
              color: '#333',
              textAlign: 'left',
            }}
          >
            {['name', 'rank', 'joined', 'membershipDuration'].map(key => {
              const labels = {
                name: 'Name',
                rank: 'Rank',
                joined: 'Joined',
                membershipDuration: 'Membership Duration',
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
          {filteredSortedMembers.map(({ name, rank, joined }) => {
            const duration = getMembershipDuration(joined);

            // Show rank indicator only if hovered member matches this name
            const showIndicator = hoveredMember === name;
            const rankIndicator = showIndicator ? getRankIndicator(rank) : null;

            return (
              <tr
                key={name}
                style={{
                  borderBottom: '1px solid #eee',
                  cursor: 'pointer',
                }}
                onMouseEnter={e => {
                  setHoveredMember(name);
                  hoveredRowRef.current = e.currentTarget;
                }}
                onMouseLeave={() => {
                  setHoveredMember(null);
                  hoveredRowRef.current = null;
                }}
              >
                <td style={{ padding: '8px 12px' }}>{name}</td>
                <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                  {rank}
                  {rankIndicator}
                </td>
                <td style={{ padding: '8px 12px' }}>{formatDate(joined)}</td>
                <td style={{ padding: '8px 12px' }}>{duration}</td>
              </tr>
            );
          })}
          {filteredSortedMembers.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#666' }}>
                No members match the filter criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Popup for rank change history */}
      {hoveredMember && (
        <div
          style={{
            position: 'absolute',
            top: popupStyle.top,
            left: popupStyle.left,
            maxWidth: 320,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: 6,
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            padding: 12,
            fontSize: 14,
            zIndex: 100,
            overflowY: 'auto',
            maxHeight: 300,
            opacity: popupStyle.opacity,
            transition: 'opacity 0.2s ease',
            pointerEvents: 'none', // so popup doesn't interfere with hover
          }}
        >
          <strong>Rank Change History for {hoveredMember}</strong>
          {historyLoading ? (
            <p>Loading history...</p>
          ) : historyData.length === 0 ? (
            <p>No rank changes found.</p>
          ) : (
            <ul style={{ paddingLeft: 20, marginTop: 8 }}>
              {historyData.map(({ old_rank, new_rank, changed_at }, i) => (
                <li key={i}>
                  <strong>{old_rank || '–'}</strong> → <strong>{new_rank || '–'}</strong> <br />
                  <small>{formatDate(changed_at)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
