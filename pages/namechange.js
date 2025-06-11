// pages/rsn-change.js
import { useState } from 'react';

export default function RSNChangePage() {
  const [memberId, setMemberId] = useState('');
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const res = await fetch('/api/update-rsn', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId, newName }),
    });

    const result = await res.json();
    setLoading(false);

    if (res.ok) {
      setStatus({ type: 'success', message: result.message });
    } else {
      setStatus({ type: 'error', message: result.error });
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div className="header-title">
          <h1 className="main-title">Update RSN</h1>
        </div>
        <p className="subtitle">Change a clan member’s display name</p>
      </div>

      <form onSubmit={handleSubmit} style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="memberId">Member ID</label>
          <input
            className="search-input"
            id="memberId"
            type="text"
            value={memberId}
            onChange={(e) => setMemberId(e.target.value)}
            required
            placeholder="Enter member ID"
          />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label htmlFor="newName">New RSN</label>
          <input
            className="search-input"
            id="newName"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
            placeholder="Enter new RSN"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            background: '#06b6d4',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '1rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'background 0.3s ease',
          }}
        >
          {loading ? 'Updating...' : 'Update RSN'}
        </button>
      </form>

      {status && (
        <div
          style={{
            marginTop: '2rem',
            textAlign: 'center',
            color: status.type === 'success' ? '#10b981' : '#f87171',
            fontWeight: 'bold',
          }}
        >
          {status.message}
        </div>
      )}

      <style>{`
* {
  box-sizing: border-box;
}

html, body, #__next {
  margin: 0;
  padding: 0;
  min-height: 100%;
  height: auto;
  background: linear-gradient(135deg, #000000 0%, #0f172a 50%, #0a0f1c 100%);
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
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
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

/* Table */
.table-container {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(148, 163, 184, 0.1);
  border-radius: 1rem;
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table-header {
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(148, 163, 184, 0.15);
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
}

.table-header th:hover {
  background: rgba(148, 163, 184, 0.05);
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
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  transition: background-color 0.3s ease;
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

/* Responsive */
@media (max-width: 768px) {
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

    </div>
  );
}
