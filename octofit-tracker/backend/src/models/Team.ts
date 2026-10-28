import { Schema, model } from 'mongoose';

const teamSchema = new Schema({
  name: { type: String, required: true, trim: true, unique: true },
  mascot: { type: String, required: true, trim: true },
  members: { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], default: [] },
});

export const Team = model('Team', teamSchema);
