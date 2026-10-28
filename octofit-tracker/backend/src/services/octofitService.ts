import { Types } from 'mongoose';
import { Activity, Team, User, Workout } from '../models/index.js';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const MAX_ACTIVITY_MINUTES = 600;
const RECENT_ACTIVITY_LIMIT = 10;
const SUGGESTION_LIMIT = 3;

// Maps logged activity types to the workout focus they build.
const activityFocus: Record<string, string> = {
  run: 'endurance',
  walk: 'endurance',
  cycle: 'endurance',
  swim: 'endurance',
  hike: 'endurance',
  strength: 'strength',
  weights: 'strength',
  pushups: 'strength',
  yoga: 'mobility',
  stretch: 'mobility',
  pilates: 'mobility',
};

type Input = Record<string, unknown>;

function asInput(input: unknown): Input {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new HttpError(400, 'Request body must be a JSON object');
  return input as Input;
}

function requireText(input: Input, field: string) {
  const value = input[field];
  if (typeof value !== 'string' || value.trim() === '') throw new HttpError(400, `${field} is required`);
  return value.trim();
}

function requireObjectId(value: unknown, field: string) {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value) || new Types.ObjectId(value).toString() !== value) {
    throw new HttpError(400, `${field} must be a valid id`);
  }
  return new Types.ObjectId(value);
}

function nameMap(records: { _id: Types.ObjectId; name: string }[]) {
  return new Map(records.map((record) => [record._id.toString(), record.name]));
}

async function userNames(ids: Types.ObjectId[]) {
  return nameMap(await User.find({ _id: { $in: ids } }).select('name').lean());
}

async function teamNames(ids: Types.ObjectId[]) {
  return nameMap(await Team.find({ _id: { $in: ids } }).select('name').lean());
}

/** One point per active minute keeps scoring transparent for students. */
export function calculatePoints(minutes: number) {
  return Math.round(minutes);
}

export async function listActivities() {
  const activities = await Activity.find().sort({ occurredAt: -1 }).lean();
  const [users, teams] = await Promise.all([
    userNames(activities.map((activity) => activity.user)),
    teamNames(activities.map((activity) => activity.team)),
  ]);
  return activities.map((activity) => ({
    ...activity,
    userName: users.get(activity.user.toString()),
    teamName: teams.get(activity.team.toString()),
  }));
}

export async function createActivity(rawInput: unknown) {
  const input = asInput(rawInput);
  const userId = requireObjectId(input.userId, 'userId');
  const teamId = requireObjectId(input.teamId, 'teamId');
  const type = requireText(input, 'type').toLowerCase();
  const minutes = input.minutes;
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0 || minutes > MAX_ACTIVITY_MINUTES) {
    throw new HttpError(400, `minutes must be a number between 1 and ${MAX_ACTIVITY_MINUTES}`);
  }

  const [user, team] = await Promise.all([User.findById(userId).lean(), Team.findById(teamId).lean()]);
  if (!user) throw new HttpError(404, 'User not found');
  if (!team) throw new HttpError(404, 'Team not found');
  // User.team is the source of truth for which team a student's points count toward.
  if (user.team?.toString() !== teamId.toString()) throw new HttpError(400, 'User is not a member of that team');

  const activity = await Activity.create({ user: userId, team: teamId, type, minutes, points: calculatePoints(minutes), occurredAt: new Date() });
  return activity.toObject();
}

export async function listTeams() {
  const teams = await Team.find().sort({ name: 1 }).lean();
  const users = await userNames(teams.flatMap((team) => team.members));
  return teams.map((team) => ({
    ...team,
    memberNames: team.members.map((member) => users.get(member.toString())).filter((name): name is string => Boolean(name)),
  }));
}

export async function createTeam(rawInput: unknown) {
  const input = asInput(rawInput);
  const name = requireText(input, 'name');
  const mascot = requireText(input, 'mascot');
  const rawMembers = input.members ?? [];
  if (!Array.isArray(rawMembers)) throw new HttpError(400, 'members must be an array of user ids');
  const members = [...new Set(rawMembers.map((member) => requireObjectId(member, 'members').toString()))].map((id) => new Types.ObjectId(id));
  if (await User.countDocuments({ _id: { $in: members } }) !== members.length) throw new HttpError(400, 'Every member must be an existing user');
  if (await Team.exists({ name })) throw new HttpError(409, 'A team with that name already exists');

  const team = await Team.create({ name, mascot, members });
  // A student belongs to one team at a time, so move members out of their previous teams.
  if (members.length > 0) {
    await User.updateMany({ _id: { $in: members } }, { $set: { team: team._id } });
    await Team.updateMany({ _id: { $ne: team._id }, members: { $in: members } }, { $pull: { members: { $in: members } } });
  }
  return team.toObject();
}

export async function getLeaderboard() {
  const [teams, totals] = await Promise.all([
    Team.find().lean(),
    Activity.aggregate<{ _id: Types.ObjectId; totalPoints: number; activityCount: number }>([
      { $group: { _id: '$team', totalPoints: { $sum: '$points' }, activityCount: { $sum: 1 } } },
    ]),
  ]);
  const totalsByTeam = new Map(totals.map((total) => [total._id.toString(), total]));
  const entries = teams
    .map((team) => ({
      teamId: team._id.toString(),
      teamName: team.name,
      mascot: team.mascot,
      totalPoints: totalsByTeam.get(team._id.toString())?.totalPoints ?? 0,
      activityCount: totalsByTeam.get(team._id.toString())?.activityCount ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints || a.teamName.localeCompare(b.teamName));
  // Teams with equal points share a rank (1, 1, 3).
  return entries.map((entry) => ({
    ...entry,
    rank: entries.findIndex((other) => other.totalPoints === entry.totalPoints) + 1,
  }));
}

export async function suggestWorkouts(userEmail: string) {
  const email = userEmail.trim().toLowerCase();
  const user = await User.findOne({ email }).lean();
  if (!user) throw new HttpError(404, `No user found with email ${email}`);

  const recent = await Activity.find({ user: user._id }).sort({ occurredAt: -1 }).limit(RECENT_ACTIVITY_LIMIT).lean();
  const minutesByFocus = new Map<string, { minutes: number; types: Set<string> }>();
  for (const activity of recent) {
    const focus = activityFocus[activity.type] ?? activity.type;
    const entry = minutesByFocus.get(focus) ?? { minutes: 0, types: new Set<string>() };
    entry.minutes += activity.minutes;
    entry.types.add(activity.type);
    minutesByFocus.set(focus, entry);
  }
  const [recentFocus, recentPattern] = [...minutesByFocus.entries()].sort((a, b) => b[1].minutes - a[1].minutes)[0] ?? [];

  const workouts = await Workout.find().sort({ title: 1 }).lean();
  return workouts
    .map((workout) => {
      const matchesRecent = workout.focus === recentFocus;
      const matchesGoal = workout.focus === user.fitnessGoal;
      const reasons = [
        matchesRecent && recentPattern ? `builds on your recent ${[...recentPattern.types].join('/')} activity (${recentPattern.minutes} minutes of ${recentFocus} work)` : '',
        matchesGoal ? `supports your ${user.fitnessGoal} goal` : '',
      ].filter(Boolean);
      const reason = reasons.length > 0
        ? `This workout ${reasons.join(' and ')}.`
        : `Adds ${workout.focus} variety to your recent activity.`;
      return { ...workout, reason, score: (matchesRecent ? 2 : 0) + (matchesGoal ? 1 : 0) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, SUGGESTION_LIMIT)
    .map(({ score: _score, ...suggestion }) => suggestion);
}
