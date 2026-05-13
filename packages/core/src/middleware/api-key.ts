import { Request, Response, NextFunction } from 'express';
import { ApiKeyService } from '../services/api-key';
import { createErrorResponse } from '../api/utils';

export const apiKeyMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  
  if (!apiKey) {
    return next(); // Continue to check JWT if needed
  }

  try {
    const keyData = await ApiKeyService.validateKey(apiKey);
    if (!keyData) {
      return res.status(401).json(createErrorResponse(401, 'Invalid API Key'));
    }

    // Inject into request object
    (req as unknown).user = keyData;
    next();
  } catch (error) {
    next(error);
  }
};
