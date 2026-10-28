# OctoFit Tracker architecture

OctoFit Tracker is a three-tier application for a school fitness program. The starter code includes API contracts and intentionally incomplete implementation points so you can use GitHub Copilot agent mode in a test-driven loop.

![Three-tier OctoFit architecture](../.github/images/octofit-architecture.svg)

## Tier boundaries

- **Presentation tier**: React 19, Vite, React Router, Bootstrap, and a shared API client in `octofit-tracker/frontend/src`.
- **Logic tier**: Express and TypeScript routes/services in `octofit-tracker/backend/src` expose `/api/*` behavior on port `8000`.
- **Data tier**: Mongoose models and seed data in `octofit-tracker/backend/src/models` and `src/scripts/seed.ts` persist to MongoDB on port `27017`.

## Ports and environment rules

- MongoDB: `27017`
- Express API: `8000`
- Vite frontend: `5173`
- The browser calls relative `/api` paths. Vite proxies them to `http://localhost:8000`, so the unauthenticated API port stays private in Codespaces. `VITE_API_BASE_URL` can override the base URL.

## API contract

| Capability | Method and path | Expected behavior |
| --- | --- | --- |
| Activity tracking | `GET /api/activities`, `POST /api/activities` | List and create valid activity records. POST accepts `userId`, `teamId`, `type`, and `minutes`; `userId` and `teamId` must be well-formed IDs for an existing user and team; otherwise respond with a deliberate 4xx (never a 500 from a cast error). A created activity stores the submitted `user`, `team`, `type`, and `minutes` plus computed `points` and `occurredAt`. |
| Teams | `GET /api/teams`, `POST /api/teams` | List and create teams with members. Created and listed teams keep the submitted `name` and `mascot`. Reject a team without a name with `400`. |
| Leaderboard | `GET /api/leaderboard` | Return teams ordered by the sum of their activity points, highest first. Each entry has `teamName`, `totalPoints`, and a 1-based `rank`. |
| Workout suggestions | `GET /api/workouts/suggestions/:userEmail` | Recommend workouts from recent activity patterns for the matching seeded user's email address. The first suggestion's `focus` matches that user's goal or recent activity, with a `reason` explaining why. An email with no matching user returns a deliberate 4xx (for example, `404`). |

## Implementation decisions

Record your plan here before editing code.

- Presentation tier decision: React 19 + React Router pages render each capability inside a Bootstrap card. Components only render; a shared `useApiData` hook owns request state and `src/api/client.ts` owns URL construction and fetch, so every page shows the same accessible loading (`role="status"`), error (`role="alert"`), empty, and success states.
- Logic tier decision: Express routes in `src/routes/api.ts` stay thin and delegate to explicit functions in `src/services/octofitService.ts`. Services throw an `HttpError` with a deliberate 4xx status for invalid input; the app error handler also maps Mongoose validation/cast errors to `400` and hides internal details on `500`.
- Data tier decision: Mongoose schemas enforce required fields (users need name, email, and goal; teams need name and mascot with a default empty members array; activities need user, team, type, minutes, points, and date; workouts need focus, minutes, and difficulty). The seed upserts three teams, students, workouts, and four activities, never clears collections, and moves a demo student out of a previous team.
- Activity tracking approach: `POST /api/activities` validates well-formed `userId`/`teamId`, a non-empty `type`, and `minutes` between 1 and 600, confirms the user and team exist and that the user's `team` (the source of truth for membership) is that team, then stores computed `points` (one point per active minute) and `occurredAt`. `GET` lists newest first with student and team names.
- Team management approach: `POST /api/teams` requires a name and mascot, rejects duplicate names (`409`, backed by a unique index) and unknown or malformed member ids (`400`), and moves listed members out of their previous team so each student belongs to one team. `GET` returns member ids plus readable `memberNames`.
- Leaderboard approach: A MongoDB `$group` aggregation sums activity points per team; every team appears (zero points if inactive), sorted by `totalPoints` descending then name, with a 1-based `rank` where tied teams share a rank.
- Workout suggestions approach: Look up the student by email (`404` if missing), map their 10 most recent activities to a focus (run/cycle → endurance, strength → strength, yoga → mobility), and score workouts +2 for matching the dominant recent focus and +1 for matching the fitness goal. The top three are returned with a `reason` explaining the match.

## Test plan

Record the commands you run and what each failure means.

- Data-tier command: `npm run test:data --prefix octofit-tracker/backend`
- API command: `npm run test:api --prefix octofit-tracker/backend`
- Frontend command: `npm test --prefix octofit-tracker/frontend`
- Backend build command: `npm run build --prefix octofit-tracker/backend`
- Frontend build command: `npm run build --prefix octofit-tracker/frontend`
