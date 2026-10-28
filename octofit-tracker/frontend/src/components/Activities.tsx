import { getJson } from '../api/client.js';
import type { Activity } from '../api/types.js';
import { useApiData } from '../hooks/useApiData.js';
import { AsyncContent } from './AsyncContent.js';
import { CapabilityCard } from './CapabilityCard.js';

export default function Activities() {
  const state = useApiData(() => getJson<{ activities: Activity[] }>('/api/activities').then((body) => body.activities), []);
  return (
    <CapabilityCard title="Activities" description="Track student activity minutes and points. Every active minute earns one point.">
      <AsyncContent state={state} resource="activities" isEmpty={(activities) => activities.length === 0} emptyMessage="No activities logged yet.">
        {(activities) => (
          <div className="table-responsive">
            <table className="table table-striped align-middle mb-0">
              <thead><tr><th scope="col">Student</th><th scope="col">Team</th><th scope="col">Type</th><th scope="col">Minutes</th><th scope="col">Points</th><th scope="col">Date</th></tr></thead>
              <tbody>
                {activities.map((activity, index) => (
                  <tr key={activity._id ?? index}>
                    <td>{activity.userName ?? '—'}</td>
                    <td>{activity.teamName ?? '—'}</td>
                    <td className="text-capitalize">{activity.type}</td>
                    <td>{activity.minutes}</td>
                    <td>{activity.points}</td>
                    <td>{activity.occurredAt ? new Date(activity.occurredAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AsyncContent>
    </CapabilityCard>
  );
}
