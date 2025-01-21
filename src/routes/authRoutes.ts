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
router.post('/signup', validate(signupValidation), authController.signup);

export default router;
