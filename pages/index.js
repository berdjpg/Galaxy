import { useEffect, useState, useMemo } from 'react';

// Format a date from timestamp or string
function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

// Promotion time requirements (can be kept if you want promotion cards without history)
const promotionTimes = {
  recruit: 7,
  corporal: 0,
  sergeant: 0,
  lieutenant: 91,
  captain: 0,
  general: 0,
  admin: 0,
  organiser: 0,
  coordinator: 0,
  overseer: 0,
  'deputy owner': 0,
  owner: 0,
};

// Get days member has been in current rank using only join date
function getDaysInCurrentRank(memberName, currentRank, joinedAt) {
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

  useEffect(() => {
    async function fetchMembers() {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        setMembers(data);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching members:', err);
        setLoading(false);
      }
    }
    fetchMembers();
  }, []);

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

  // Optional: Remove promotion cards or keep, using only joined date
  const readyForPromotion = useMemo(() => {
    return members.filter(m => {
      const days = getDaysInCurrentRank(m.name, m.rank, m.joined);
      return days !== null && isEligibleForPromotion(m.rank, days);
    });
  }, [members]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  if (loading) return <p style={{ color: '#ddd', textAlign: 'center', marginTop: 40 }}>Loading clan members...</p>;
  if (!members.length) return <p style={{ color: '#ddd', textAlign: 'center', marginTop: 40 }}>No clan members found.</p>;

  return (
    <div
      style={{
        maxWidth: 900,
        margin: '40px auto',
        padding: 20,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#ddd',
        backgroundColor: '#121212',
        borderRadius: 12,
        boxShadow: '0 0 40px #0b0b0b',
        position: 'relative',
        userSelect: 'none',
        minHeight: '100vh',
      }}
    >
      <h1 style={{
        marginBottom: 24,
        color: '#9cd0ff',
        textShadow: '0 0 6px #2a65ff',
        userSelect: 'text',
      }}>Clan Members - Remenant</h1>

      {/* Promotion cards row */}
      {readyForPromotion.length > 0 && (
        <div
          style={{
            marginBottom: 24,
            display: 'flex',
            gap: 16,
            overflowX: 'auto',
            paddingBottom: 4,
            scrollbarWidth: 'thin',
            scrollbarColor: '#4a90e2 transparent',
          }}
          className="promo-cards-container"
        >
          {readyForPromotion.map(m => {
            const days = getDaysInCurrentRank(m.name, m.rank, m.joined);
            return (
              <div
                key={m.name}
                title={`${m.name} — ${m.rank} (${days} days in rank)`}
                style={{
                  minWidth: 140,
                  minHeight: 140,
                  backgroundColor: '#1a1a2e',
                  borderRadius: 12,
                  padding: 16,
                  boxShadow: '0 0 8px #2a65ff',
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  color: '#a8caff',
                  cursor: 'default',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  userSelect: 'none',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 0 15px #4791ff';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 0 8px #2a65ff';
                }}
              >
                <div style={{ fontWeight: '700', fontSize: 20, marginBottom: 8, textShadow: '0 0 8px #3f7fff' }}>{m.name}</div>
                <div style={{ fontSize: 16, fontStyle: 'italic', color: '#8ab4f8' }}>{m.rank}</div>
                <div style={{ fontSize: 14, marginTop: 12, color: '#aac8ff' }}>
                  {days} day{days !== 1 ? 's' : ''} in rank
                </div>
                <div
                  style={{
                    marginTop: 10,
                    fontSize: 13,
                    color: '#6fb6ff',
                    fontWeight: '600',
                    backgroundColor: '#224488',
                    padding: '4px 8px',
                    borderRadius: 6,
                    textShadow: '0 0 6px #1155bb',
                    userSelect: 'none',
                  }}
                >
                  Ready for Promotion
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Search and sorting controls */}
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          gap: 12,
          alignItems: 'center',
          flexWrap: 'wrap',
          color: '#9ec1ff',
        }}
      >
        <label htmlFor="filter" style={{ userSelect: 'none' }}>Filter by name:</label>
        <input
          id="filter"
          type="text"
          placeholder="Search members..."
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
          style={{
            padding: '6px 10px',
            borderRadius: 6,
            border: 'none',
            outline: 'none',
            fontSize: 14,
            backgroundColor: '#22263b',
            color: '#cbd6ff',
            flexGrow: 1,
            maxWidth: 220,
            userSelect: 'text',
          }}
        />
        <button
          onClick={() => handleSort('name')}
          style={{
            cursor: 'pointer',
            backgroundColor: sortKey === 'name' ? '#4a90e2' : '#22263b',
            color: sortKey === 'name' ? '#e0eaff' : '#a0a9bf',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontWeight: sortKey === 'name' ? '700' : '500',
            userSelect: 'none',
            userDrag: 'none',
          }}
          title="Sort by name"
        >
          Name {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
        </button>
        <button
          onClick={() => handleSort('joined')}
          style={{
            cursor: 'pointer',
            backgroundColor: sortKey === 'joined' ? '#4a90e2' : '#22263b',
            color: sortKey === 'joined' ? '#e0eaff' : '#a0a9bf',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            fontWeight: sortKey === 'joined' ? '700' : '500',
            userSelect: 'none',
            userDrag: 'none',
          }}
          title="Sort by join date"
        >
          Joined {sortKey === 'joined' ? (sortAsc ? '▲' : '▼') : ''}
        </button>
      </div>

      {/* Members table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 14,
          userSelect: 'none',
          boxShadow: '0 0 10px #1a1a2e',
          borderRadius: 8,
          overflow: 'hidden',
          color: '#cbd6ff',
          backgroundColor: '#1a1a2e',
        }}
      >
        <thead>
          <tr>
            <th style={{ padding: '12px 8px', borderBottom: '2px solid #444a66', textAlign: 'left' }}>Name</th>
            <th style={{ padding: '12px 8px', borderBottom: '2px solid #444a66', textAlign: 'left' }}>Rank</th>
            <th style={{ padding: '12px 8px', borderBottom: '2px solid #444a66', textAlign: 'left' }}>Joined</th>
            <th style={{ padding: '12px 8px', borderBottom: '2px solid #444a66', textAlign: 'left' }}>Membership Duration</th>
          </tr>
        </thead>
        <tbody>
          {filteredSortedMembers.map(member => (
            <tr
              key={member.name}
              style={{ cursor: 'default', userSelect: 'none' }}
            >
              <td style={{ padding: '10px 8px', borderBottom: '1px solid #444a66' }}>{member.name}</td>
              <td style={{ padding: '10px 8px', borderBottom: '1px solid #444a66' }}>{member.rank}</td>
              <td style={{ padding: '10px 8px', borderBottom: '1px solid #444a66' }}>
                {formatDate(member.joined)}
              </td>
              <td style={{ padding: '10px 8px', borderBottom: '1px solid #444a66' }}>
                {getMembershipDuration(member.joined)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
