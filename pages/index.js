import { useEffect, useState, useMemo } from 'react';

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

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

function getDaysInCurrentRank(memberName, currentRank, joinedAt) {
  const joinDate = new Date(joinedAt);
  const now = new Date();
  if (isNaN(joinDate)) return null;
  return Math.floor((now - joinDate) / (1000 * 60 * 60 * 24));
}

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

  if (loading)
    return (
      <div className="loading-container">
        <p>Loading clan members...</p>
      </div>
    );

  if (!members.length)
    return (
      <div className="loading-container">
        <p>No clan members found.</p>
      </div>
    );

  return (
    <>
      <style>{`
        /* Reset & base */
        * {
          box-sizing: border-box;
        }
        body, html, #__next {
          margin: 0; padding: 0; height: 100%;
          background: #0b0e14;
          color: #d0d7de;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
            Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Container */
        .container {
          max-width: 900px;
          margin: 40px auto;
          padding: 20px 24px;
          background: #11151f;
          border-radius: 12px;
          box-shadow:
            0 4px 10px rgba(0,0,0,0.75),
            inset 0 0 40px #1a73e8;
          user-select: none;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }

        h1 {
          font-weight: 700;
          font-size: 2.4rem;
          margin-bottom: 24px;
          color: #58a6ff;
          text-shadow: 0 0 12px #58a6ff;
          user-select: text;
        }

        /* Search and sort controls */
        .controls {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
          color: #8b98b8;
        }

        .controls label {
          user-select: none;
          font-weight: 600;
          font-size: 0.9rem;
        }

        .controls input[type="text"] {
          flex-grow: 1;
          max-width: 220px;
          padding: 8px 12px;
          font-size: 1rem;
          border-radius: 8px;
          border: none;
          outline: none;
          background: #1c2533;
          color: #cdd9e5;
          box-shadow: inset 0 0 6px #2f81f7;
          transition: background-color 0.2s ease;
        }
        .controls input[type="text"]:focus {
          background: #22324a;
        }

        .controls button {
          padding: 8px 16px;
          border-radius: 8px;
          border: none;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          user-select: none;
          user-drag: none;
          background: #222c40;
          color: #8b98b8;
          box-shadow: 0 0 4px transparent;
          transition:
            background-color 0.2s ease,
            color 0.2s ease,
            box-shadow 0.2s ease;
        }
        .controls button:hover {
          background: #2c3a6a;
          color: #58a6ff;
          box-shadow: 0 0 8px #58a6ff;
        }
        .controls button.active {
          background: #3d56a6;
          color: #cdd9e5;
          box-shadow: 0 0 12px #58a6ff;
        }

        /* Promotion cards */
        .promo-cards-container {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          margin-bottom: 24px;
          padding-bottom: 6px;
          scrollbar-width: thin;
          scrollbar-color: #4a90e2 transparent;
        }
        .promo-cards-container::-webkit-scrollbar {
          height: 6px;
        }
        .promo-cards-container::-webkit-scrollbar-thumb {
          background: #3b63c3;
          border-radius: 3px;
        }
        .promo-card {
          min-width: 150px;
          min-height: 150px;
          background: linear-gradient(145deg, #1f2937, #16202a);
          border-radius: 16px;
          padding: 20px;
          box-shadow: 0 4px 14px rgba(88, 166, 255, 0.5);
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          color: #a8caff;
          cursor: default;
          user-select: none;
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .promo-card:hover {
          transform: scale(1.06);
          box-shadow: 0 6px 20px rgba(88, 166, 255, 0.9);
        }
        .promo-card .name {
          font-weight: 700;
          font-size: 1.25rem;
          margin-bottom: 6px;
          text-shadow: 0 0 10px #3f7fff;
        }
        .promo-card .rank {
          font-size: 1rem;
          font-style: italic;
          color: #8ab4f8;
          margin-bottom: 12px;
        }
        .promo-card .days-in-rank {
          font-size: 0.9rem;
          color: #aac8ff;
          margin-bottom: 8px;
        }
        .promo-card .promo-label {
          background-color: #2563eb;
          color: #dbeafe;
          padding: 6px 12px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.85rem;
          text-shadow: 0 0 6px #1155bb;
          user-select: none;
        }

        /* Table styles */
        table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          border-radius: 12px;
          overflow: hidden;
          box-shadow:
            0 0 12px rgba(30, 58, 138, 0.7);
          background: #1e2a47;
          color: #cdd9e5;
          user-select: none;
        }

        thead tr {
          background: linear-gradient(90deg, #234e91 0%, #1a365e 100%);
          color: #a3c4f3;
          text-shadow: 0 0 8px #2a5fff;
        }

        thead th {
          padding: 14px 12px;
          font-weight: 700;
          font-size: 0.95rem;
          text-align: left;
          cursor: pointer;
          user-select: none;
          user-drag: none;
          transition: background-color 0.3s ease;
        }
        thead th:hover {
          background-color: #2f5ab7;
        }

        tbody tr {
          border-bottom: 1px solid #2e4269;
          transition: background-color 0.2s ease;
        }
        tbody tr:hover {
          background-color: #2a3e6d;
        }

        tbody td {
          padding: 12px 14px;
          font-size: 0.9rem;
        }

        .loading-container {
          display: flex;
          height: 100vh;
          justify-content: center;
          align-items: center;
          font-size: 1.3rem;
          color: #7a8db0;
          font-weight: 600;
          background: #0b0e14;
          user-select: none;
        }
      `}</style>

      <div className="container" role="main" aria-label="Clan Members List">
        <h1>Clan Members - Remenant</h1>

        {readyForPromotion.length > 0 && (
          <div className="promo-cards-container" aria-label="Members Ready for Promotion">
            {readyForPromotion.map((m) => {
              const days = getDaysInCurrentRank(m.name, m.rank, m.joined);
              return (
                <div
                  key={m.name}
                  className="promo-card"
                  title={`${m.name} — ${m.rank} (${days} days in rank)`}
                >
                  <div className="name">{m.name}</div>
                  <div className="rank">{m.rank}</div>
                  <div className="days-in-rank">{days} day{days !== 1 ? 's' : ''} in rank</div>
                  <div className="promo-label">Ready for Promotion</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="controls">
          <label htmlFor="filter">Filter by name:</label>
          <input
            id="filter"
            type="text"
            placeholder="Search members..."
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            aria-label="Filter clan members by name"
          />
          <button
            onClick={() => handleSort('name')}
            className={sortKey === 'name' ? 'active' : ''}
            aria-pressed={sortKey === 'name'}
            title="Sort by name"
          >
            Name {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
          </button>
          <button
            onClick={() => handleSort('joined')}
            className={sortKey === 'joined' ? 'active' : ''}
            aria-pressed={sortKey === 'joined'}
            title="Sort by join date"
          >
            Joined {sortKey === 'joined' ? (sortAsc ? '▲' : '▼') : ''}
          </button>
        </div>

        <table role="table" aria-label="Clan members table">
          <thead>
            <tr>
              <th scope="col" onClick={() => handleSort('name')} tabIndex={0} role="button" aria-sort={sortKey === 'name' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                Name {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th scope="col">Rank</th>
              <th scope="col" onClick={() => handleSort('joined')} tabIndex={0} role="button" aria-sort={sortKey === 'joined' ? (sortAsc ? 'ascending' : 'descending') : 'none'}>
                Joined {sortKey === 'joined' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th scope="col">Membership Duration</th>
            </tr>
          </thead>
          <tbody>
            {filteredSortedMembers.map((member) => (
              <tr key={member.name}>
                <td>{member.name}</td>
                <td>{member.rank}</td>
                <td>{formatDate(member.joined)}</td>
                <td>{getMembershipDuration(member.joined)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
