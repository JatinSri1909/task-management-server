import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { RequestHandler } from '../types/express';
import { AuthRequest } from '../types/express';

export const getTasks: RequestHandler = async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: any = { userId: req.user._id };
    if (req.query.priority) filter.priority = req.query.priority;
    if (req.query.status) filter.status = req.query.status;

    const sort: any = {};
    if (req.query.field && req.query.order) {
      sort[req.query.field as string] = req.query.order === 'desc' ? -1 : 1;
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sort).skip(skip).limit(limit),
      Task.countDocuments(filter)
    ]);

    res.json({
      tasks,
      total,
      page,
      limit
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

const validateTaskTimes = (startTime: Date, endTime: Date) => {
  if (startTime >= endTime) {
    throw new Error('End time must be after start time');
  }
};

const calculateTaskTimes = (task: ITask) => {
  const now = new Date();
  const startTime = new Date(task.startTime);
  const endTime = new Date(task.endTime);
  
  // For completed tasks, use actual completion time
  if (task.status === 'finished') {
    const totalTime = Math.max(0, endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    return { totalTime, timeElapsed: totalTime, timeLeft: 0 };
  }
  
  // For pending tasks
  const timeElapsed = Math.max(0, now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  const timeLeft = Math.max(0, endTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  const totalTime = Math.max(0, endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
  
  return { totalTime, timeElapsed, timeLeft };
};

export const createTask: RequestHandler = async (req, res) => {
  try {
    validateTaskTimes(new Date(req.body.startTime), new Date(req.body.endTime));
    const task = await Task.create({
      ...req.body,
      userId: req.user._id
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateTask: RequestHandler = async (req, res) => {
  try {
    if (req.body.startTime && req.body.endTime) {
      validateTaskTimes(new Date(req.body.startTime), new Date(req.body.endTime));
    }
    
    // If marking as finished, set endTime to now
    if (req.body.status === 'finished') {
      req.body.endTime = new Date().toISOString();
    }
    
    console.log('Update Task Request:', {
      id: req.params.id,
      userId: req.user._id,
      body: req.body,
      headers: req.headers,
      method: req.method
    });

    // Create update object with only provided fields
    const updateFields: any = {};
    
    if (req.body.title !== undefined) updateFields.title = req.body.title;
    if (req.body.priority !== undefined) updateFields.priority = req.body.priority;
    if (req.body.status !== undefined) updateFields.status = req.body.status;
    if (req.body.startTime !== undefined) updateFields.startTime = new Date(req.body.startTime);
    if (req.body.endTime !== undefined) updateFields.endTime = new Date(req.body.endTime);

    // Validate that at least one field is being updated
    if (Object.keys(updateFields).length === 0) {
      res.status(400).json({ message: 'No fields to update' });
      return;
    }

    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: updateFields },
      { new: true, runValidators: true }
    );

    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }

    console.log('Updated Task:', task);
    res.json(task);
  } catch (error: any) {
    console.error('Update Task Error:', {
      error: error.message,
      stack: error.stack,
      body: req.body
    });
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      details: error.stack 
    });
  }
};

export const deleteTask: RequestHandler = async (req, res) => {
  try {
    const task = await Task.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

export const getTaskStats: RequestHandler = async (req: AuthRequest, res) => {
  try {
    const userId = req.user?._id;

    // Get basic task counts
    const totalTasks = await Task.countDocuments({ userId });
    const completedTasks = await Task.countDocuments({ userId, status: 'finished' });
    const pendingTasks = await Task.countDocuments({ userId, status: 'pending' });

    // Calculate percentages
    const completedPercentage = totalTasks > 0 
      ? Math.round((completedTasks / totalTasks) * 100) 
      : 0;
    const pendingPercentage = totalTasks > 0 
      ? Math.round((pendingTasks / totalTasks) * 100) 
      : 0;

    // Calculate average time for completed tasks
    const completedTasksStats = await Task.aggregate([
      {
        $match: {
          userId: userId,
          status: 'finished'
        }
      },
      {
        $project: {
          completionTime: {
            $divide: [
              { $subtract: ['$endTime', '$startTime'] },
              3600000 // Convert to hours
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          totalTime: { $sum: '$completionTime' },
          count: { $sum: 1 }
        }
      }
    ]);

    const averageTime = completedTasksStats.length > 0 
      ? Math.round((completedTasksStats[0].totalTime / completedTasksStats[0].count) * 10) / 10 
      : 0;

    // Get pending tasks analysis with time calculations
    const pendingTasksByPriority = await Task.aggregate([
      { 
        $match: { 
          userId: userId,
          status: 'pending' 
        } 
      },
      {
        $group: {
          _id: '$priority',
          count: { $sum: 1 },
          timeElapsed: {
            $sum: {
              $cond: [
                { 
                  $gt: [
                    { $subtract: ['$$NOW', '$startTime'] },
                    0
                  ]
                },
                {
                  $divide: [
                    { $subtract: ['$$NOW', '$startTime'] },
                    3600000
                  ]
                },
                0
              ]
            }
          },
          estimatedTimeLeft: {
            $sum: {
              $cond: [
                { $gt: ['$endTime', '$$NOW'] },
                {
                  $divide: [
                    { $subtract: ['$endTime', '$$NOW'] },
                    3600000
                  ]
                },
                {
                  $divide: [
                    { $subtract: ['$endTime', '$startTime'] },
                    3600000
                  ]
                }
              ]
            }
          }
        }
      },
      {
        $project: {
          priority: '$_id',
          count: 1,
          timeElapsed: { $round: ['$timeElapsed', 1] },
          estimatedTimeLeft: { $round: ['$estimatedTimeLeft', 1] },
          _id: 0
        }
      },
      { $sort: { priority: -1 } }
    ]);

    // Calculate total time metrics
    const totalTimeMetrics = pendingTasksByPriority.reduce(
      (acc, curr) => ({
        totalTimeElapsed: acc.totalTimeElapsed + (curr.timeElapsed || 0),
        totalTimeToFinish: acc.totalTimeToFinish + (curr.estimatedTimeLeft || 0)
      }),
      { totalTimeElapsed: 0, totalTimeToFinish: 0 }
    );

    res.json({
      overview: {
        totalTasks,
        completedTasks,
        pendingTasks,
        completedPercentage,
        pendingPercentage,
        averageTime,
      },
      timeMetrics: {
        averageCompletionTime: averageTime,
        totalTimeElapsed: Math.round(totalTimeMetrics.totalTimeElapsed * 10) / 10,
        totalTimeToFinish: Math.round(totalTimeMetrics.totalTimeToFinish * 10) / 10,
        pendingTasksByPriority
      }
    });

  } catch (error) {
    console.error('Error getting task stats:', error);
    res.status(500).json({ message: 'Error fetching task statistics' });
  }
};
