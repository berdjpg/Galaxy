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
        if (!res.ok) throw new Error('Failed to fetch members');
        const data = await res.json();
        setMembers(data);
      } catch (error) {
        console.error('Failed to fetch members:', error);
        setStatus({ type: 'error', message: 'Failed to load members' });
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

    try {
      const res = await fetch('/api/update-rsn', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldName, newName }),
      });

      const result = await res.json();

      if (res.ok) {
        setStatus({ type: 'success', message: result.message });
        // Reset form inputs after success
        setOldName('');
        setNewName('');
        // Optionally, refresh members list after update
        setFetchingMembers(true);
        const membersRes = await fetch('/api/members');
        const membersData = await membersRes.json();
        setMembers(membersData);
        setFetchingMembers(false);
      } else {
        setStatus({ type: 'error', message: result.error || 'Update failed' });
      }
    } catch (error) {
      console.error('Update failed:', error);
      setStatus({ type: 'error', message: 'Update failed due to network error' });
    } finally {
      setLoading(false);
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
              disabled={loading}
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
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !oldName || !newName}
          style={{
            background: '#06b6d4',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '0.5rem',
            fontWeight: 600,
            fontSize: '1rem',
            border: 'none',
            cursor: loading || !oldName || !newName ? 'not-allowed' : 'pointer',
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
