import { Request, Response } from 'express'
import { createResponse } from '../utils'
import { logger } from '../../services/logger'
import { AdapterFactory } from '../../database/adapters/AdapterFactory'

export const getHealth = async (req: Request, res: Response) => {
  const adapter = (req as import('express').Request & { user?: Record<string, any>, zenith?: Record<string, any> }).zenith?.adapter || AdapterFactory.getActiveAdapter()
  const dbHealth = adapter.getHealth()
  const health = {
    status: 'ok',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    db: dbHealth === 'ok' ? 'connected' : dbHealth,
    timestamp: new Date(),
    nodeVersion: process.version,
  }
  res.json(createResponse(health))
}

export const getSystemInfo = async (req: Request, res: Response) => {
  res.json(
    createResponse({
      version: '1.0.0-prime',
      engine: 'Zenith Recursive Hook Engine',
      features: ['Audit Logs', 'Delta Tracking', 'GraphQL', 'Swagger'],
    })
  )
}
