export type Activity = { _id?: string; userName?: string; teamName?: string; type: string; minutes: number; points: number; occurredAt?: string };
export type Team = { _id?: string; name: string; mascot?: string; members: string[]; memberNames?: string[] };
export type LeaderboardEntry = { teamId?: string; teamName: string; mascot?: string; totalPoints: number; activityCount?: number; rank: number };
export type WorkoutSuggestion = { _id?: string; title: string; focus?: string; minutes?: number; difficulty?: string; reason: string };
