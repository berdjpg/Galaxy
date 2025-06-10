import { useEffect, useState, useMemo, useRef } from 'react';

// Format a date from timestamp or string
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Promotion time requirements in days per rank to get promoted
const promotionTimes = {
  recruit: 7,         // days to promote from recruit
  corporal: 14,
  sergeant: 30,
  lieutenant: 60,
  captain: 90,
  general: 120,
  admin: 180,
  organiser: 240,
  coordinator: 300,
  overseer: 365,
  'deputy owner': 0,
  owner: 0,
};

// Get days member has been in current rank, using rank history or join date fallback
function getDaysInCurrentRank(memberName, rankHistories, currentRank, joinedAt) {
  if (!rankHistories || !rankHistories[memberName] || rankHistories[memberName].length === 0) {
    // No history, fallback to joined date
    const joinDate = new Date(joinedAt);
    const now = new Date();
    if (isNaN(joinDate)) return null;
    return Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
  }

  const history = rankHistories[memberName];
  // History sorted descending by changed_at, find last time member got this rank
  for (let entry of history) {
    if ((entry.new_rank || '').toLowerCase() === currentRank.toLowerCase()) {
      const changedAt = new Date(entry.changed_at);
      const now = new Date();
      if (isNaN(changedAt)) return null;
      return Math.floor((now - changedAt) / (1000 * 60 * 60 * 24));
    }
  }

  // If no promotion to current rank found, fallback to joined date
  const joinDate = new Date(joinedAt);
  const now = new Date();
  if (isNaN(joinDate)) return null;
  return Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
}

// Check if member is eligible for promotion based on days in current rank
function isEligibleForPromotion(currentRank, daysInRank) {
  if (!promotionTimes[currentRank.toLowerCase()]) return false;
  return daysInRank >= promotionTimes[currentRank.toLowerCase()];
}

export default function Home() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [filterText, setFilterText] = useState('');

  // Hover popup states
  const [hoveredMember, setHoveredMember] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const hoveredRowRef = useRef(null);
  const [popupStyle, setPopupStyle] = useState({ top: 0, left: 0, opacity: 0 });

  // Store all members' rank histories grouped by member name
  const [rankHistories, setRankHistories] = useState({});

  // Fetch members and their histories on mount
  useEffect(() => {
    async function fetchMembersAndHistories() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        setMembers(data);

        // Fetch histories for all members in parallel
        const histories = {};
        await Promise.all(
          data.map(async (m) => {
            try {
              const resHist = await fetch(`/api/rank_history?member=${encodeURIComponent(m.name)}`);
              if (!resHist.ok) throw new Error('Failed to fetch history');
              const histData = await resHist.json();
              histories[m.name] = histData;
            } catch {
              histories[m.name] = [];
            }
          })
        );
        setRankHistories(histories);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching members or histories:', err);
        setLoading(false);
      }
    }
    fetchMembersAndHistories();
  }, []);

  // Fetch rank history for hovered member for the popup
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

      let top = rowRect.bottom + window.scrollY + margin;
      if (top + popupHeight > window.scrollY + viewportHeight) {
        top = rowRect.top + window.scrollY - popupHeight - margin;
      }

      let left = rowRect.left + window.scrollX;
      if (left + popupWidth > window.scrollX + viewportWidth) {
        left = window.scrollX + viewportWidth - popupWidth - margin;
      }
      if (left < window.scrollX + margin) {
        left = window.scrollX + margin;
      }

      setPopupStyle({ top, left, opacity: 1 });
    }
  }, [hoveredMember]);

  // Filter, sort members
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

  // Format membership duration for display
  const getMembershipDuration = (joined) => {
    const joinDate = new Date(joined);
    if (isNaN(joinDate)) return 'Unknown';

    const now = new Date();
    const days = Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));

    return days > 365
      ? `${Math.floor(days / 365)} yr${days >= 730 ? 's' : ''}`
      : `${days} day${days !== 1 ? 's' : ''}`;
  };

  // Members ready for promotion
  const readyForPromotion = useMemo(() => {
    return members.filter(m => {
      const days = getDaysInCurrentRank(m.name, rankHistories, m.rank, m.joined);
      return days !== null && isEligibleForPromotion(m.rank, days);
    });
  }, [members, rankHistories]);

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

      {/* To-Do Card for leadership */}
      {readyForPromotion.length > 0 && (
        <div style={{
          marginBottom: 24,
          padding: 12,
          border: '2px solid green',
          borderRadius: 6,
          backgroundColor: '#e6ffe6',
          fontSize: 16,
          fontWeight: 'bold',
          color: 'green',
        }}>
          Members Ready for Promotion:
          <ul style={{ marginTop: 8, paddingLeft: 20, fontWeight: 'normal' }}>
            {readyForPromotion.map(m => (
              <li key={m.name}>
                {m.name} — {m.rank} ({getDaysInCurrentRank(m.name, rankHistories, m.rank, m.joined)} days)
              </li>
            ))}
          </ul>
        </div>
      )}

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
            {['name', 'rank', 'joined', 'membershipDuration', 'daysInRank', 'promotionStatus'].map(key => {
              const labels = {
                name: 'Name',
                rank: 'Rank',
                joined: 'Joined',
                membershipDuration: 'Membership Duration',
                daysInRank: 'Days in Rank',
                promotionStatus: 'Promotion Status',
              };
              return (
                <th
                  key={key}
                  onClick={() => handleSort(key)}
                  style={{
                    padding: '10px 12px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    cursor: key === 'daysInRank' || key === 'promotionStatus' ? 'default' : 'pointer',
                    color: key === 'daysInRank' || key === 'promotionStatus' ? '#666' : undefined,
                  }}
                  title={key === 'daysInRank' || key === 'promotionStatus' ? undefined : `Sort by ${labels[key]}`}
                >
                  {labels[key]} {sortKey === key ? (sortAsc ? '▲' : '▼') : ''}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {filteredSortedMembers.map(({ name, rank, joined }) => {
            const daysInRank = getDaysInCurrentRank(name, rankHistories, rank, joined);
            const promotionReady = daysInRank !== null && isEligibleForPromotion(rank, daysInRank);
            return (
              <tr
                key={name}
                style={{
                  borderBottom: '1px solid #eee',
                  backgroundColor: promotionReady ? '#f0fff0' : undefined,
                }}
                onMouseEnter={(e) => {
                  setHoveredMember(name);
                  hoveredRowRef.current = e.currentTarget;
                }}
                onMouseLeave={() => {
                  setHoveredMember(null);
                  hoveredRowRef.current = null;
                }}
              >
                <td style={{ padding: '10px 12px', fontWeight: '600' }}>{name}</td>
                <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{rank}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{formatDate(joined)}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{getMembershipDuration(joined)}</td>
                <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                  {daysInRank !== null ? daysInRank : 'N/A'}
                </td>
                <td
                  style={{
                    padding: '10px 12px',
                    fontWeight: 'bold',
                    color: promotionReady ? 'green' : '#888',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {promotionReady ? 'Eligible' : 'Not eligible'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Hover popup for rank history */}
      {hoveredMember && (
        <div
          style={{
            position: 'absolute',
            top: popupStyle.top,
            left: popupStyle.left,
            width: 320,
            maxHeight: 300,
            overflowY: 'auto',
            backgroundColor: 'white',
            border: '1px solid #aaa',
            borderRadius: 8,
            padding: 12,
            fontSize: 13,
            color: '#222',
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
            opacity: popupStyle.opacity,
            transition: 'opacity 0.15s ease-in-out',
            zIndex: 1000,
            pointerEvents: popupStyle.opacity === 0 ? 'none' : 'auto',
            userSelect: 'none',
          }}
          onMouseEnter={() => setHoveredMember(hoveredMember)}
          onMouseLeave={() => setHoveredMember(null)}
        >
          <h4 style={{ margin: '0 0 8px 0' }}>Rank History - {hoveredMember}</h4>
          {historyLoading && <p>Loading history...</p>}
          {!historyLoading && historyData.length === 0 && <p>No rank history available.</p>}
          {!historyLoading && historyData.length > 0 && (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {historyData.map((entry, idx) => (
                <li
                  key={idx}
                  style={{
                    borderBottom: '1px solid #eee',
                    padding: '4px 0',
                    fontFamily: 'monospace',
                    fontSize: 12,
                  }}
                >
                  <strong>{entry.old_rank || 'N/A'}</strong> → <strong>{entry.new_rank || 'N/A'}</strong><br />
                  <small>{formatDate(entry.changed_at)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
