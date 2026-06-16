import { Request, Response, NextFunction } from 'express'

export const cookieConsentMiddleware = (req: Request, res: Response, next: NextFunction) => {
  next()
}
