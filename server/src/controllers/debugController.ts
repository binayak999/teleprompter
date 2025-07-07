import { Request, Response } from 'express';

export class DebugController {
  /**
   * Debug endpoint to check session
   */
  static getSession(req: Request, res: Response): void {
    res.json({
      session: req.session,
      cookies: req.cookies,
      headers: req.headers
    });
  }

  /**
   * Health check endpoint
   */
  static healthCheck(req: Request, res: Response): void {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  }
} 