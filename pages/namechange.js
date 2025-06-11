import { useEffect, useState } from 'react';

export default function RSNChangePage() {
  const [members, setMembers] = useState([]);
  const [oldName, setOldName] = useState('');
  const [newName, setNewName] = useState('');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingMembers, setFetchingMembers] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch('/api/members');
        const data = await res.json();
        setMembers(data);
      } catch (error) {
        console.error('Failed to fetch members:', error);
      } finally {
        setFetchingMembers(false);
      }
    };

    fetchMembers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setLoading(true);

    const res = await fetch('/api/update-rsn', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ oldName, newName }),
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
          <label htmlFor="oldName">Select Member</label>
          {fetchingMembers ? (
            <p>Loading members...</p>
          ) : (
            <select
              id="oldName"
              value={oldName}
              onChange={(e) => setOldName(e.target.value)}
              required
              className="search-input"
            >
              <option value="">-- Choose a member --</option>
              {members.map((member) => (
                <option key={member.id} value={member.name}>
                  {member.name}
                </option>
              ))}
            </select>
          )}
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
    </div>
  );
}
