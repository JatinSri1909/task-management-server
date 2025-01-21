import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { RequestHandler } from '../types/express';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export const protect: RequestHandler = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ message: 'Not authorized' });
      return;
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!);
    
    // Get user
    const user = await User.findById((decoded as any).id).select('-password');
    if (!user) {
      res.status(401).json({ message: 'User not found' });
      return;
    }

    // Add user to request object
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Not authorized' });
  }
};
