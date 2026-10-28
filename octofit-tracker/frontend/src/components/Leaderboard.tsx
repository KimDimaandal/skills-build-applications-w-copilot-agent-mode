import { getJson } from '../api/client.js';
import type { LeaderboardEntry } from '../api/types.js';
import { useApiData } from '../hooks/useApiData.js';
import { AsyncContent } from './AsyncContent.js';
import { CapabilityCard } from './CapabilityCard.js';

export default function Leaderboard() {
  const state = useApiData(() => getJson<{ leaderboard: LeaderboardEntry[] }>('/api/leaderboard').then((body) => body.leaderboard), []);
  return (
    <CapabilityCard title="Leaderboard" description="Compare team point totals.">
      <AsyncContent state={state} resource="leaderboard" isEmpty={(entries) => entries.length === 0} emptyMessage="No leaderboard scores yet.">
        {(entries) => (
          <table className="table align-middle mb-0">
            <thead><tr><th scope="col">Rank</th><th scope="col">Team</th><th scope="col">Total points</th></tr></thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.teamId ?? entry.teamName}>
                  <td>#{entry.rank}</td>
                  <td>{entry.teamName}</td>
                  <td>{entry.totalPoints}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </AsyncContent>
    </CapabilityCard>
  );
}
