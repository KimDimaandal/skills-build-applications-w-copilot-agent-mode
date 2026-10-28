import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { Activity, Team, User, Workout } from '../models/index.js';
import { calculatePoints } from '../services/octofitService.js';

const demoTeams = [
  { name: 'Octocats', mascot: 'Mona' },
  { name: 'Robocats', mascot: 'Hubot' },
  { name: 'Codecats', mascot: 'Copilot' },
];
const demoUsers = [
  { name: 'Mona', email: 'mona@example.com', teamName: 'Octocats', fitnessGoal: 'endurance' },
  { name: 'Hubot', email: 'hubot@example.com', teamName: 'Robocats', fitnessGoal: 'strength' },
  { name: 'Copilot', email: 'copilot@example.com', teamName: 'Codecats', fitnessGoal: 'mobility' },
];
const demoActivities = [
  { email: 'mona@example.com', type: 'run', minutes: 40, occurredAt: new Date('2026-01-10T12:00:00.000Z') },
  { email: 'hubot@example.com', type: 'cycle', minutes: 25, occurredAt: new Date('2026-01-11T12:00:00.000Z') },
  { email: 'hubot@example.com', type: 'strength', minutes: 30, occurredAt: new Date('2026-01-12T12:00:00.000Z') },
  { email: 'copilot@example.com', type: 'yoga', minutes: 20, occurredAt: new Date('2026-01-12T15:00:00.000Z') },
];
const demoWorkouts = [
  { title: 'Intervals', focus: 'endurance', minutes: 30, difficulty: 'moderate' },
  { title: 'Strength Circuit', focus: 'strength', minutes: 30, difficulty: 'moderate' },
  { title: 'Mobility Flow', focus: 'mobility', minutes: 20, difficulty: 'easy' },
];

// Seed stable demo records without clearing data owned by the application.
async function upsertDemoUser(name: string, email: string, teamId: InstanceType<typeof Team>['_id'], fitnessGoal: string) {
  const previousUser = await User.findOne({ email }).select('_id team');
  if (previousUser?.team && previousUser.team.toString() !== teamId.toString()) {
    await Team.updateOne({ _id: previousUser.team }, { $pull: { members: previousUser._id } });
  }
  const user = await User.findOneAndUpdate(
    { email },
    { $set: { name, email, team: teamId, fitnessGoal } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );
  await Team.updateOne({ _id: teamId }, { $addToSet: { members: user._id } });
  return user;
}

export async function seed() {
  await connectDatabase();
  try {
    const teams = new Map<string, InstanceType<typeof Team>>();
    for (const { name, mascot } of demoTeams) {
      teams.set(name, await Team.findOneAndUpdate(
        { name },
        { $set: { name, mascot } },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      ));
    }

    const users = new Map<string, InstanceType<typeof User>>();
    for (const { name, email, teamName, fitnessGoal } of demoUsers) {
      users.set(email, await upsertDemoUser(name, email, teams.get(teamName)!._id, fitnessGoal));
    }

    for (const { email, type, minutes, occurredAt } of demoActivities) {
      const user = users.get(email)!;
      const filter = { user: user._id, team: user.team, type, occurredAt };
      await Activity.updateOne(filter, { $set: { ...filter, minutes, points: calculatePoints(minutes) } }, { upsert: true });
    }

    for (const workout of demoWorkouts) {
      await Workout.updateOne({ title: workout.title }, { $set: workout }, { upsert: true });
    }
  } finally {
    await disconnectDatabase();
  }
}

if (process.argv[1]?.endsWith('seed.ts')) {
  await seed();
}
