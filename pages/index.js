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

const rankImportance = {
  owner: 10,
  'deputy owner': 9,
  overseer: 8,
  coordinator: 7,
  organiser: 6,
  admin: 5,
  general: 4,
  captain: 3,
  lieutenant: 2,
  sergeant: 1,
  corporal: 0,
  recruit: -1,
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

  // Default sorting: by importance DESC
  const [sortKey, setSortKey] = useState('importance');
  const [sortAsc, setSortAsc] = useState(false);
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
      let valA, valB;

      if (sortKey === 'importance') {
        valA = rankImportance[a.rank.toLowerCase()] ?? -999;
        valB = rankImportance[b.rank.toLowerCase()] ?? -999;
      } else if (sortKey === 'joined') {
        valA = new Date(a.joined);
        valB = new Date(b.joined);
      } else {
        valA = a[sortKey];
        valB = b[sortKey];
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
      // Default sort direction: descending for importance, ascending for others
      setSortAsc(key === 'importance' ? false : true);
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
        * {
          box-sizing: border-box;
        }
        body, html, #__next {
          margin: 0;
          padding: 0;
          height: 100%;
          background: #0C0D0D;
          color: #E0E0E0;
          font-family: 'Inter', sans-serif;
        }

        .container {
          max-width: 900px;
          margin: 40px auto;
          padding: 20px;
          background: #121212;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        h1 {
          font-weight: 600;
          font-size: 2rem;
          margin-bottom: 24px;
          color: #FC6F53;
        }

        /* Controls */
        .controls {
          display: flex;
          gap: 12px;
          margin-bottom: 20px;
          flex-wrap: wrap;
          align-items: center;
        }

        .controls label {
          font-weight: 500;
          font-size: 0.9rem;
        }

        .controls input[type="text"] {
          flex-grow: 1;
          max-width: 220px;
          padding: 8px 12px;
          font-size: 1rem;
          border-radius: 6px;
          border: 1px solid #2A2A2A;
          background: #1A1A1A;
          color: #FFF;
        }

        .controls input[type="text"]:focus {
          outline: 1px solid #FC6F53;
          background: #1E1E1E;
        }

        .controls button {
          padding: 8px 14px;
          border-radius: 6px;
          border: none;
          font-weight: 500;
          font-size: 0.9rem;
          cursor: pointer;
          background: #1A1A1A;
          color: #CCCCCC;
        }
        .controls button:hover {
          background: #2A2A2A;
          color: #FC6F53;
        }
        .controls button.active {
          background: #FC6F53;
          color: #0C0D0D;
        }

        /* Promo Cards */
        .promo-cards-container {
          display: flex;
          gap: 12px;
          overflow-x: auto;
          margin-bottom: 24px;
          padding-bottom: 4px;
        }

        .promo-card {
          min-width: 150px;
          min-height: 140px;
          background: #1A1A1A;
          border-radius: 8px;
          padding: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
        }

        .promo-card .name {
          font-weight: 600;
          font-size: 1.2rem;
          margin-bottom: 4px;
          color: #FC6F53;
        }

        .promo-card .rank,
        .promo-card .days-in-rank {
          font-size: 0.9rem;
          color: #AAAAAA;
          margin-bottom: 4px;
        }

        .promo-card .promo-label {
          background: #FC6F53;
          color: #0C0D0D;
          padding: 4px 10px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 0.8rem;
        }

        /* Table */
        table {
          width: 100%;
          border-collapse: collapse;
          background: #121212;
          color: #E0E0E0;
        }

        thead tr {
          background: #1A1A1A;
          color: #FC6F53;
        }

        thead th {
          padding: 12px 10px;
          text-align: left;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
        }

        thead th:hover {
          background: #222;
        }

        tbody tr {
          border-top: 1px solid #2A2A2A;
        }

        tbody tr:hover {
          background: #1E1E1E;
        }

        tbody td {
          padding: 10px 12px;
          font-size: 0.9rem;
        }

        /* Loading container */
        .loading-container {
          display: flex;
          height: 100vh;
          justify-content: center;
          align-items: center;
          font-size: 1.2rem;
          color: #999;
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
          {/* <button
            onClick={() => handleSort('importance')}
            className={sortKey === 'importance' ? 'active' : ''}
            aria-pressed={sortKey === 'importance'}
            title="Sort by importance"
          >
            Rank {sortKey === 'importance' ? (sortAsc ? '▲' : '▼') : ''}
          </button>
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
          </button> */}
        </div>

        <table role="table" aria-label="Clan members table">
          <thead>
            <tr>
              <th
                scope="col"
                onClick={() => handleSort('name')}
                tabIndex={0}
                role="button"
                aria-sort={
                  sortKey === 'name' ? (sortAsc ? 'ascending' : 'descending') : 'none'
                }
              >
                Name {sortKey === 'name' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                scope="col"
                onClick={() => handleSort('importance')}
                tabIndex={0}
                role="button"
                aria-sort={
                  sortKey === 'importance' ? (sortAsc ? 'ascending' : 'descending') : 'none'
                }
              >
                Rank {sortKey === 'importance' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th
                scope="col"
                onClick={() => handleSort('joined')}
                tabIndex={0}
                role="button"
                aria-sort={
                  sortKey === 'joined' ? (sortAsc ? 'ascending' : 'descending') : 'none'
                }
              >
                Joined {sortKey === 'joined' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th scope="col">Membership Duration</th>
              <th scope="col">Promotion Eligibility</th>
            </tr>
          </thead>
          <tbody>
            {filteredSortedMembers.map((member) => (
              <tr key={member.name}>
                <td>{member.name}</td>
                <td>{member.rank}</td>
                <td>{formatDate(member.joined)}</td>
                <td>{getMembershipDuration(member.joined)}</td>
                <td>
                  {(() => {
                    const days = getDaysInCurrentRank(member.name, member.rank, member.joined);
                    return days !== null && isEligibleForPromotion(member.rank, days)
                      ? 'Eligible'
                      : '-';
                  })()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
