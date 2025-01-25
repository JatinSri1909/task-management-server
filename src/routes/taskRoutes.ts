import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validateMiddleware';
import * as taskController from '../controllers/taskController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

const taskValidation = [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime')
    .isISO8601()
    .withMessage('Valid end time is required')
    .custom((value, { req }) => {
      if (new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('priority')
    .isInt({ min: 1, max: 5 })
    .withMessage('Priority must be between 1 and 5')
];

const updateTaskValidation = [
  body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
  body('startTime').optional().isISO8601().withMessage('Valid start time is required'),
  body('endTime')
    .optional()
    .isISO8601()
    .withMessage('Valid end time is required')
    .custom((value, { req }) => {
      if (req.body.startTime && new Date(value) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  body('priority')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Priority must be between 1 and 5'),
  body('status')
    .optional()
    .isIn(['pending', 'finished'])
    .withMessage('Status must be either pending or finished')
];

router.get('/', taskController.getTasks);
router.post('/', validate(taskValidation), taskController.createTask);
router.patch('/:id', validate(updateTaskValidation), taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.get('/stats', protect, taskController.getTaskStats);

export default router;
