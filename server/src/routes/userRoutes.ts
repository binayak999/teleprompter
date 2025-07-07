import express from 'express';
import { User } from '../models/User';
import { getUserId } from '../utils/userUtils';

const router = express.Router();

// Get or create user
router.get('/', async (req, res) => {
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
});

export default router; 