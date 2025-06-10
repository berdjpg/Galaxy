import { useEffect, useState } from 'react';

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp); // ISO strings handled correctly
  return isNaN(date) ? 'Invalid Date' : date.toLocaleDateString();
}

export default function Home() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMembers() {
      const res = await fetch('/api/members');
      const data = await res.json();
      setMembers(data);
      setLoading(false);
    }
    fetchMembers();
  }, []);

  if (loading) return <p>Loading clan members...</p>;
  if (!members.length) return <p>No clan members found.</p>;

  return (
    <div
      style={{
        maxWidth: 700,
        margin: '40px auto',
        padding: 20,
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: '#222',
      }}
    >
      <h1 style={{ marginBottom: 24 }}>Clan Members - Remenant</h1>
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
              textAlign: 'left',
              backgroundColor: '#f9f9f9',
              color: '#333',
            }}
          >
            <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Name</th>
            <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Rank</th>
            <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Joined</th>
            <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Membership Duration</th>
            <th style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>Rank Changed?</th>
          </tr>
        </thead>
        <tbody>
          {members.map(({ name, rank, joined, rank_changed }) => {
            const joinDate = new Date(joined);
            const now = new Date();

            let membershipDuration = 'Unknown';
            if (!isNaN(joinDate)) {
              const diffMs = now - joinDate;
              const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
              membershipDuration =
                diffDays > 365
                  ? `${Math.floor(diffDays / 365)} yr${Math.floor(diffDays / 365) > 1 ? 's' : ''}`
                  : `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
            }

            return (
              <tr
                key={name}
                style={{
                  borderBottom: '1px solid #eee',
                  backgroundColor: rank_changed ? '#e6ffed' : 'white',
                }}
              >
                <td style={{ padding: '8px 12px' }}>{name}</td>
                <td style={{ padding: '8px 12px' }}>{rank}</td>
                <td style={{ padding: '8px 12px' }}>{formatDate(joined)}</td>
                <td style={{ padding: '8px 12px' }}>{membershipDuration}</td>
                <td
                  style={{
                    padding: '8px 12px',
                    color: rank_changed ? 'green' : 'gray',
                    fontWeight: rank_changed ? 'bold' : 'normal',
                    textTransform: 'capitalize',
                  }}
                >
                  {rank_changed ? 'Yes' : 'No'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
