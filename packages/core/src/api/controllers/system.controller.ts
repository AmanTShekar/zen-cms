import { Request, Response } from 'express';
import { createResponse } from '../utils';
import { logger } from '../../services/logger';
import mongoose from 'mongoose';

export const getHealth = async (req: Request, res: Response) => {
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date(),
    nodeVersion: process.version,
  };
  res.json(createResponse(health));
};

export const getSystemInfo = async (req: Request, res: Response) => {
  res.json(createResponse({
    version: '1.0.0-prime',
    engine: 'Zenith Recursive Hook Engine',
    features: ['Audit Logs', 'Delta Tracking', 'GraphQL', 'Swagger'],
  }));
};
