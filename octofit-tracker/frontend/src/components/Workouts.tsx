import { type FormEvent, useState } from 'react';
import { ApiError, getJson } from '../api/client.js';
import type { WorkoutSuggestion } from '../api/types.js';
import { useApiData } from '../hooks/useApiData.js';
import { AsyncContent } from './AsyncContent.js';
import { CapabilityCard } from './CapabilityCard.js';

const defaultEmail = 'mona@example.com';

export default function Workouts() {
  const [email, setEmail] = useState(defaultEmail);
  const [draftEmail, setDraftEmail] = useState(defaultEmail);
  const state = useApiData(
    () => getJson<{ suggestions: WorkoutSuggestion[] }>(`/api/workouts/suggestions/${encodeURIComponent(email)}`).then((body) => body.suggestions),
    [email],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextEmail = draftEmail.trim();
    if (nextEmail) setEmail(nextEmail);
  }

  return (
    <CapabilityCard title="Workout suggestions" description="Recommend workouts from activity patterns.">
      <form className="row g-2 align-items-end mb-3" onSubmit={handleSubmit}>
        <div className="col-sm-8">
          <label htmlFor="student-email" className="form-label">Student email</label>
          <input id="student-email" type="email" className="form-control" value={draftEmail} onChange={(event) => setDraftEmail(event.target.value)} required />
        </div>
        <div className="col-sm-4"><button type="submit" className="btn btn-primary w-100">Get suggestions</button></div>
      </form>
      <AsyncContent
        state={state}
        resource="workout suggestions"
        isEmpty={(suggestions) => suggestions.length === 0}
        emptyMessage="No workout suggestions yet. Log an activity to get personalized ideas."
        errorMessage={(error) => (error instanceof ApiError && error.status === 404 ? `Unable to find a student with the email ${email}.` : undefined) ?? 'Unable to load workout suggestions. Please try again later.'}
      >
        {(suggestions) => (
          <ul className="list-group">
            {suggestions.map((suggestion, index) => (
              <li key={suggestion._id ?? index} className="list-group-item">
                <h3 className="h5 mb-1">{suggestion.title}</h3>
                {(suggestion.focus || suggestion.minutes || suggestion.difficulty) && (
                  <p className="mb-1 text-muted text-capitalize">{[suggestion.focus, suggestion.minutes && `${suggestion.minutes} min`, suggestion.difficulty].filter(Boolean).join(' · ')}</p>
                )}
                <p className="mb-0">{suggestion.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </CapabilityCard>
  );
}
