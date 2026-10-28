import cors from 'cors';
import express from 'express';
import mongoose from 'mongoose';
import { apiRouter } from './routes/api.js';

type AppError = Error & { status?: number; code?: number };

function errorStatus(error: AppError) {
  if (error.status) return error.status;
  if (error.code === 11000) return 409;
  if (error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError) return 400;
  return 500;
}

function errorMessage(error: AppError, status: number) {
  if (status >= 500) return 'Internal server error';
  if (error.code === 11000) return 'That record already exists';
  return error.message;
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get('/health', (_request, response) => response.json({ ok: true }));
  app.use('/api', apiRouter);
  app.use((error: AppError, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    const status = errorStatus(error);
    if (status >= 500) console.error(error);
    response.status(status).json({ error: errorMessage(error, status) });
  });
  return app;
}
