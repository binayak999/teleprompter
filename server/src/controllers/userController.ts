import { Request, Response } from 'express';
import { User } from '../models/User';
import { getUserId } from '../utils/userUtils';

export class UserController {
  /**
   * Get or create user
   */
  static async getOrCreateUser(req: Request, res: Response): Promise<void> {
    try {
      const userId = getUserId(req);
      
      // Find or create user
      let user = await User.findOne({ userId });
      if (!user) {
        user = new User({ userId });
        await user.save();
      }

      // Set user ID in cookie for future requests
      res.cookie('userId', userId, { 
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      });

      res.json({ 
        userId: user.userId,
        username: user.username,
        email: user.email,
        createdAt: user.createdAt
      });
    } catch (error) {
      console.error('User creation error:', error);
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
} 