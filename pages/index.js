import { useEffect, useState } from 'react';

function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp); // Handle ISO string directly
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
    <div style={{ maxWidth: 700, margin: 'auto', padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Clan Members - Remenant</h1>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #ccc', textAlign: 'left' }}>
            <th>Name</th>
            <th>Rank</th>
            <th>Joined</th>
            <th>Membership Duration</th>
            <th>Rank Changed?</th>
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
              membershipDuration = diffDays > 365
                ? `${Math.floor(diffDays / 365)} yr${Math.floor(diffDays / 365) > 1 ? 's' : ''}`
                : `${diffDays} day${diffDays !== 1 ? 's' : ''}`;
            }

            return (
              <tr key={name} style={{ borderBottom: '1px solid #eee' }}>
                <td>{name}</td>
                <td>{rank}</td>
                <td>{formatDate(joined)}</td>
                <td>{membershipDuration}</td>
                <td style={{ color: rank_changed ? 'green' : 'gray', fontWeight: rank_changed ? 'bold' : 'normal' }}>
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
