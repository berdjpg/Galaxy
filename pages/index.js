import { useEffect, useState, useMemo } from 'react';
import Head from 'next/head';

function formatDate(timestamp, full = false) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (isNaN(date)) return 'Invalid Date';

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  if (full) {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } else {
    return `${day}/${month}/${year}`;
  }
}

const promotionTimes = {
  recruit: 7,
  corporal: 7,
  sergeant: 7,
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

const rankColors = {
  owner: 'linear-gradient(135deg, rgba(245, 215, 110, 0.85), rgba(242, 201, 76, 0.85))',
  'deputy owner': 'linear-gradient(135deg, rgba(220, 220, 220, 0.85), rgba(192, 192, 192, 0.85))',
  overseer: 'linear-gradient(135deg, rgba(205, 127, 50, 0.85), rgba(184, 115, 51, 0.85))',
  coordinator: 'linear-gradient(135deg, rgba(226, 194, 144, 0.85), rgba(209, 160, 95, 0.85))',
  organiser: 'linear-gradient(135deg, rgba(179, 212, 252, 0.85), rgba(121, 184, 243, 0.85))',
  admin: 'linear-gradient(135deg, rgba(248, 113, 113, 0.85), rgba(239, 68, 68, 0.85))',
  general: 'linear-gradient(135deg, rgba(255, 215, 0, 0.85), rgba(250, 204, 21, 0.85))',
  captain: 'linear-gradient(135deg, rgba(220, 220, 220, 0.85), rgba(161, 161, 170, 0.85))',
  lieutenant: 'linear-gradient(135deg, rgba(205, 127, 50, 0.85), rgba(169, 113, 66, 0.85))',
  sergeant: 'linear-gradient(135deg, rgba(251, 191, 36, 0.85), rgba(245, 158, 11, 0.85))',
  corporal: 'linear-gradient(135deg, rgba(156, 163, 175, 0.85), rgba(107, 114, 128, 0.85))',
  recruit: 'linear-gradient(135deg, rgba(229, 231, 235, 0.85), rgba(209, 213, 219, 0.85))',
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

const [lastUpdate, setLastUpdate] = useState(null);

useEffect(() => {
  const fetchData = async () => {
    const res = await fetch('/api/metadata');
    const json = await res.json();
    if (json?.last_clan_update) {
      setLastUpdate(new Date(json.last_clan_update));
    }
  };
  fetchData();
}, []);


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
      if (m.ignore) return false;
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

  const validPromotions = {
  recruit: 'lieutenant',
  corporal: 'lieutenant', 
  sergeant: 'lieutenant', 
  lieutenant: 'captain',
  };

  // Filter only those with valid promotions
  const filteredPromotions = readyForPromotion.filter(member => {
    const current = member.rank.toLowerCase();
    const expectedNext = validPromotions[current];
    return expectedNext !== undefined;
  });

  function formatRank(rank) {
    if (rank === "Deputy Owner") {
      return "Deputy_owner"; // special case
    }
    return rank.replace(/\s+/g, "_"); // default
  }

const [nextUpdateCountdown, setNextUpdateCountdown] = useState('');

function getNextScheduledUpdate() {
  const now = new Date();
  const utcNow = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
    now.getUTCHours(),
    now.getUTCMinutes(),
    now.getUTCSeconds()
  ));

  const nextMidday = new Date(Date.UTC(
    utcNow.getUTCFullYear(),
    utcNow.getUTCMonth(),
    utcNow.getUTCDate(),
    12
  ));

  const nextMidnight = new Date(Date.UTC(
    utcNow.getUTCFullYear(),
    utcNow.getUTCMonth(),
    utcNow.getUTCDate() + 1,
    0
  ));

  // If it's before midday, midday is next. Otherwise, it's midnight.
  return utcNow < nextMidday ? nextMidday : nextMidnight;
}

useEffect(() => {
  function updateCountdown() {
    const now = new Date();
    const nextUpdate = getNextScheduledUpdate();
    const diff = nextUpdate - now;

    if (diff <= 0) {
      setNextUpdateCountdown('happening shortly!');
      return;
    }

    const totalMinutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    let formatted;
    if (hours >= 11) {
      formatted = `imminent`;
    } else if (hours >= 3) {
      formatted = `in ${hours} hour${hours !== 1 ? 's' : ''}`;
    } else if (hours >= 1) {
      formatted = `in ${hours} hour${hours !== 1 ? 's' : ''} and ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      formatted = `in ${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }

    setNextUpdateCountdown(formatted);
  }

  updateCountdown(); // Initial call
  const interval = setInterval(updateCountdown, 1000);
  return () => clearInterval(interval);
}, []);


const [rankHistory, setRankHistory] = useState([]);

useEffect(() => {
  async function fetchRankHistory() {
    try {
      const res = await fetch('/api/rank_history');
      const data = await res.json();
      setRankHistory(data);
    } catch (err) {
      console.error('Error fetching rank history:', err);
    }
  }
  fetchRankHistory();
}, []);






  if (loading)
  return (
    <div className="loading-container">
      <div className="enhanced-loading">
        <div className="glow-spinner" />
        <p className="loading-text">Loading Remenant data...</p>
      </div>

      <style jsx>{`
      * {
          box-sizing: border-box;
        }

        html, body {
          margin: 0;
          padding: 0;
          min-height: 100%;
          height: auto;
          background-color: #071b25;
          background-image: url('/images/background-main.jpg');
          background-repeat: repeat;
          color:rgb(0, 0, 0);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
          
        .enhanced-loading {
          text-align: center;
          animation: fadeIn 0.8s ease-in-out;
        }

        .glow-spinner {
          width: 4rem;
          height: 4rem;
          border: 4px solid rgba(255, 255, 255, 0.1);
          border-top: 4px solid rgb(78, 56, 248);
          border-radius: 50%;
          animation: spin 1s linear infinite, pulse-glow 1.5s ease-in-out infinite;
          margin: 0 auto 1rem;
          box-shadow: 0 0 8px rgba(56, 189, 248, 0.6);
        }

        .loading-text {
          color:rgb(0, 0, 0);
          font-size: 1.1rem;
          letter-spacing: 0.05em;
          font-family: 'Segoe UI', Roboto, sans-serif;
          animation: pulseText 1.6s ease-in-out infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(56, 189, 248, 0.6); }
          50% { box-shadow: 0 0 16px rgba(56, 189, 248, 0.8); }
        }

        @keyframes pulseText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );

  if (!members.length)
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="empty-icon">👥</div>
          <p>No clan members found.</p>
        </div>
      </div>
    );

  return (
    <>
      <style>{`
* {
  box-sizing: border-box;
}

html, body, #__next {
  margin: 0;
  padding: 0;
  min-height: 100%;
  height: auto;
  background: #071b25 url('/images/background-main.jpg') repeat 0 0;
  color: #d1d5db;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* Animated background blobs */
body::before {
  content: '';
  position: fixed;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 25% 25%, rgba(139, 92, 246, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 75% 75%, rgba(6, 182, 212, 0.05) 0%, transparent 50%),
              radial-gradient(circle at 50% 50%, rgba(236, 72, 153, 0.03) 0%, transparent 50%);
  animation: blob 20s ease-in-out infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes blob {
  0%, 100% { transform: translate(0, 0) rotate(0deg); }
  33% { transform: translate(30px, -30px) rotate(120deg); }
  66% { transform: translate(-20px, 20px) rotate(240deg); }
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem;
  min-height: 100vh;
}

/* Header */
.header {
  text-align: center;
  margin-bottom: 3rem;
}

.header-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.main-title {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #06b6d4, #8b5cf6);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
}

.subtitle {
  color: #94a3b8;
  font-size: 1.1rem;
  font-weight: 400;
}

/* Promotion Cards */
.promotion-section {
  margin-bottom: 3rem;
}

.promotion-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.promotion-header h2 {
  font-size: 1.75rem;
  font-weight: 600;
  color: #f8fafc;
  margin: 0;
}

.trend-icon {
  color: #10b981;
  font-size: 1.5rem;
}

.promo-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, .5fr));
  gap: 1.5rem;
}

.promo-card {
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.15);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.promo-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #10b981, #059669);
}

.promo-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  border-color: rgba(16, 185, 129, 0.3);
}

.promo-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.rank-avatar {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 600;
  color: white;
}

.rank-avatar img {
  height: 166%;
}

.eligible-badge {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.member-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: #f1f5f9;
  margin-bottom: 0.5rem;
  transition: color 0.3s ease;
}

.promo-card:hover .member-name {
  color: #06b6d4;
}

.member-rank {
  color: #94a3b8;
  margin-bottom: 0.75rem;
  text-transform: capitalize;
}

.days-in-rank {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #64748b;
  font-size: 0.875rem;
}

.clock-icon {
  font-size: 1rem;
}

/* Search */
.search-section {
  margin-bottom: 2rem;
}

.search-container {
  position: relative;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #64748b;
  font-size: 1.25rem;
  z-index: 1;
  width: 20px;
  height: 20px;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 3rem;
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.75rem;
  color: #f8fafc;
  font-size: 1rem;
  transition: all 0.3s ease;
}

.search-input::placeholder {
  color: #64748b;
}

.search-input:focus {
  outline: none;
  border-color: #06b6d4;
  box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
}

.member-count {
  margin-top: 0.5rem;
  font-size: 0.875rem;
  color: #94a3b8; /* muted slate tone */
  text-align: left;
  padding-left: 0.25rem;
}

/* Table */
.table-container {
  background: rgba(24, 37, 45, .5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.25);
  border-radius: 1rem;
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table-header {
  background: url('https://www.runescape.com/img/rs3/global/header_bg_set.png') no-repeat left top,url('https://www.runescape.com/img/rs3/global/header_bg_set.png') no-repeat right center,url('https://www.runescape.com/img/rs3/global/header_bg_set.png') repeat-x center bottom;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.table-header th {
  padding: 1rem 1.5rem;
  text-align: left;
  font-weight: 600;
  color: #f1f5f9;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
  user-select: none;
  border-left: 1px solid #39444b;
  box-shadow: inset 1px 0 0 #000;
}

.table-header th:hover {
  background: rgba(0,0,0,.33);
  color: #06b6d4;
}

.sort-indicator {
  margin-left: 0.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.table-header th:hover .sort-indicator,
.table-header th.active .sort-indicator {
  opacity: 1;
  color: #06b6d4;
}

.table-body tr {
  border-bottom: 1px solid #2a3339;
  box-shadow: inset 0 1px 0 #000;
  transition: background-color 0.3s ease;
}

.ignored-member {
  opacity: 0.5;
}

.table-body tr:hover {
  background: rgba(148, 163, 184, 0.05);
}

.table-body td {
  padding: 1rem 1.5rem;
  color: #e2e8f0;
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.member-avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  font-weight: 600;
  color: white;
  background
}

.member-avatar img {
  height: 166%;
}

.member-name-cell {
  font-weight: 500;
}

.rank-badge {
  padding: 0.25rem 0.75rem 0.25rem 0.5rem;
  gap: 6px;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  color: white;
  text-transform: capitalize;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.status-eligible {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.status-dot {
  width: 0.5rem;
  height: 0.5rem;
  background: #10b981;
  border-radius: 50%;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.status-inactive {
  color: #64748b;
}

/* Loading */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.loading-content {
  text-align: center;
}

.spinner {
  width: 3rem;
  height: 3rem;
  border: 3px solid rgba(6, 182, 212, 0.2);
  border-top: 3px solid #06b6d4;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.loading-content p {
  color: #94a3b8;
  font-size: 1.1rem;
}

/* Footer */
.footer {
  margin-top: 3rem;
  text-align: center;
  color: #64748b;
  font-size: 0.875rem;
}

.top-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
}

.update-info {
  font-size: 0.95rem;
  color: #94a3b8;
  text-align: right;
}


.rank-history-sidebar {
  background: rgba(24, 37, 45, .5);
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 1rem;
  max-height: 600px;
  overflow-y: auto;
}

.rank-history-sidebar h3 {
  color: #f8fafc;
  font-size: 1rem;
  font-weight: 500;
  margin-top: unset;
  margin-bottom: unset;
  min-height: 53.5px;
  padding: 1rem;
  background: url('https://www.runescape.com/img/rs3/global/header_bg_set.png') no-repeat left top,url('https://www.runescape.com/img/rs3/global/header_bg_set.png') no-repeat right center,url('https://www.runescape.com/img/rs3/global/header_bg_set.png') repeat-x center bottom;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
}

.rank-history-list {
  padding: 0.5rem 1rem;
}

.rank-history-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.rank-history-name {
  font-weight: 600;
  color: #f1f5f9;
  font-size: 0.9rem;
  margin-bottom: 0.15rem;
}

.rank-history-change {
  font-size: 0.85rem;
  color: #cbd5e1;
}

.old-rank, .new-rank {
  text-transform: capitalize;
}

.rank-history-date {
  font-size: 0.75rem;
  color: #606469;
}



/* Responsive */
@media (max-width: 768px) {

  .search-section {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .member-count {
    margin-top: 0;
    padding-left: 1rem;
  }
  .container {
    padding: 1rem;
  }

  .main-title {
    font-size: 2rem;
  }

  .promo-cards-grid {
    grid-template-columns: 1fr;
  }

  .table-container {
    overflow-x: auto;
  }

  .table {
    min-width: 600px;
  }
}

      `}</style>

      <>
        <Head>
          <title>Remenant homebase | Sani btw</title>
        </Head>
      </>

      <div className="container">
        {/* Header */}
        <div className="top-header">
          <h1 className="main-title">Remenant</h1>
          <div className="update-info">
            <div>Last update: {lastUpdate ? formatDate(lastUpdate, true) : '...'}</div>
            <div>Next update {nextUpdateCountdown}</div>
          </div>
        </div>

        {/* Promotion Cards */}
        {filteredPromotions.length > 0 && (
          <div className="promotion-section">
            <div className="promotion-header">
              <h2>Action needed</h2>
            </div>
            <div className="promo-cards-grid">
              {filteredPromotions.map(member => {
                const current = member.rank.toLowerCase();
                const nextRank = validPromotions[current];
                const days = getDaysInCurrentRank(member.name, member.rank, member.joined);

                return (
                  <div key={member.name} className="promo-card">
                    <div className="promo-card-header">
                      <div
                        className="rank-avatar"
                        style={{ background: rankColors[current] }}
                      >
                        <img src={`http://secure.runescape.com/m=avatar-rs/${member.name}/chat.png`} alt="Avatar" />
                      </div>
                      <span className="eligible-badge">Eligible</span>
                    </div>
                    <div className="member-name">{member.name}</div>
                    <div className="member-rank">{member.rank}</div>
                    <div className="days-in-rank">
                      <span className="clock-icon">🕒</span>
                      {days} days in rank
                    </div>
                    <div className="days-in-rank">
                      <span className="clock-icon">➡️</span>
                      Promote to <strong>{nextRank}</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}


        {/* Search */}
        <div className="search-section">
          <div className="search-container">
            <svg
              className="search-icon"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
              focusable="false"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-4.35-4.35m0 0a7.5 7.5 0 1 0-10.6-10.6 7.5 7.5 0 0 0 10.6 10.6z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search members..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="member-count">
            Showing {filteredSortedMembers.length} member{filteredSortedMembers.length !== 1 && 's'}
          </div>
        </div>

        {/* Table */}
        <div className="content-layout" style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start' }}>
          <div style={{ flex: 3 }}>
            <div className="table-container">
              <table className="table">
                <thead className="table-header">
                  <tr>
                    <th onClick={() => handleSort('name')} className={sortKey === 'name' ? 'active' : ''}>
                      Name
                      <span className="sort-indicator">
                        {sortKey === 'name' ? (sortAsc ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th onClick={() => handleSort('importance')} className={sortKey === 'importance' ? 'active' : ''}>
                      Rank
                      <span className="sort-indicator">
                        {sortKey === 'importance' ? (sortAsc ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th onClick={() => handleSort('joined')} className={sortKey === 'joined' ? 'active' : ''}>
                      📅 Joined
                      <span className="sort-indicator">
                        {sortKey === 'joined' ? (sortAsc ? '↑' : '↓') : '↕'}
                      </span>
                    </th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {filteredSortedMembers.map((member, index) => {
                    const days = getDaysInCurrentRank(member.name, member.rank, member.joined);
                    const isEligible = days !== null && isEligibleForPromotion(member.rank, days);
                    const rankColor = rankColors[member.rank.toLowerCase()] || rankColors.recruit;
                    
                    return (
                      <tr key={member.name} className={member.ignore ? 'ignored-member' : ''}>
                        <td>
                          <div className="member-cell">
                            <div className="member-avatar" style={{ background: rankColor }}>
                              {/* {member.name.charAt(0).toUpperCase()} */}
                              <img src={`http://secure.runescape.com/m=avatar-rs/${member.name}/chat.png`} alt="Avatar" />
                            </div>
                            <span className="member-name-cell">{member.name}</span>
                          </div>
                        </td>
                        <td>
                          <span className="rank-badge" style={{ background: rankColor }}>
                            <img src={`https://runescape.wiki/images/${formatRank(member.rank)}_clan_rank.png`} alt="Rank" />
                            {member.rank}
                          </span>
                        </td>
                        <td>{formatDate(member.joined)}</td>
                        <td>{getMembershipDuration(member.joined)}</td>
                        <td>
                          {isEligible ? (
                            <span className="status-eligible">
                              <span className="status-dot"></span>
                              Eligible
                            </span>
                          ) : (
                            <span className="status-inactive">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div className="rank-history-sidebar">
              <h3>Rank History</h3>
              <div className="rank-history-list">
                {rankHistory.slice(0, 20).map((entry) => (
                  <div key={entry.id} className="rank-history-item">
                    <div className="rank-history-name">{entry.member_name}</div>
                    <div className="rank-history-change">
                      <span className="old-rank">{entry.old_rank}</span> ➡️ <span className="new-rank">{entry.new_rank}</span>
                    </div>
                    <div className="rank-history-date">{formatDate(entry.changed_at, true)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>


        {/* Footer */}
        <div className="footer">
          <p>Milk men / Sani btw</p>
        </div>
      </div>
    </>
  );
}