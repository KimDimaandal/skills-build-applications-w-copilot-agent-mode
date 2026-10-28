import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { apiRouter } from './routes/api.js';

function errorStatus(error: Error & { status?: number }) {
  if (error.status) return error.status;
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) return 400;
  return 500;
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (_request, response) => response.json({ ok: true }));
  app.use('/api', apiRouter);
  app.use((error: Error & { status?: number }, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const status = errorStatus(error);
    if (status >= 500) console.error(error);
    response.status(status).json({ error: status < 500 ? error.message : 'Internal server error' });
  });
  return app;
}
