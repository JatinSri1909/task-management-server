import express from 'express';
import { body } from 'express-validator';
import { validate } from '../middleware/validateMiddleware';
import {
  getTasks,
  createTask,
  updateTask,
  deleteTask,
  getTaskStats
} from '../controllers/taskController';

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

router.get('/', getTasks);
router.post('/', validate(taskValidation), createTask);
router.patch('/:id', validate(updateTaskValidation), updateTask);
router.delete('/:id', deleteTask);
router.get('/stats', getTaskStats);

export default router;
