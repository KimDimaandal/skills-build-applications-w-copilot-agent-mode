import { getJson } from '../api/client.js';
import type { Team } from '../api/types.js';
import { useApiData } from '../hooks/useApiData.js';
import { AsyncContent } from './AsyncContent.js';
import { CapabilityCard } from './CapabilityCard.js';

export default function Teams() {
  const state = useApiData(() => getJson<{ teams: Team[] }>('/api/teams').then((body) => body.teams), []);
  return (
    <CapabilityCard title="Teams" description="Manage teams and members.">
      <AsyncContent state={state} resource="teams" isEmpty={(teams) => teams.length === 0} emptyMessage="No teams yet.">
        {(teams) => (
          <ul className="list-group">
            {teams.map((team, index) => (
              <li key={team._id ?? index} className="list-group-item">
                <h3 className="h5 mb-1">{team.name}</h3>
                {team.mascot && <p className="mb-1 text-muted">Mascot: {team.mascot}</p>}
                <p className="mb-0">
                  {team.members.length} {team.members.length === 1 ? 'member' : 'members'}
                  {team.memberNames && team.memberNames.length > 0 && `: ${team.memberNames.join(', ')}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </CapabilityCard>
  );
}
