import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validateMiddleware';
import * as authController from '../controllers/authController';

const router = express.Router();

const loginValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

const signupValidation = [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

router.post('/login', validate(loginValidation), authController.login);
router.post('/signup', validate(signupValidation), async (req, res) => {
  try {
    console.log('Signup request:', req.body);
    const { email, password } = req.body;
    
    // Call the controller
    const result = await authController.signup(req, res);
    return result;

  } catch (error) {
    console.error('Signup error:', error);
    
    // Check if it's a validation error
    if (error.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: error.errors 
      });
    }
    
    // Check if user already exists
    if (error.code === 11000) {
      return res.status(400).json({ 
        message: 'Email already exists' 
      });
    }

    res.status(500).json({ 
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

export default router;
