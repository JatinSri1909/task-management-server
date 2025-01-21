import { Request, Response } from 'express';
import { Task } from '../models/Task';
import { RequestHandler } from '../types/express';

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

export const createTask: RequestHandler = async (req, res) => {
  try {
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
    const task = await Task.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      req.body,
      { new: true }
    );
    if (!task) {
      res.status(404).json({ message: 'Task not found' });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
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

export const getTaskStats: RequestHandler = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id });
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'finished').length;
    
    const stats = {
      totalTasks,
      completedPercentage: (completedTasks / totalTasks) * 100 || 0,
      pendingPercentage: ((totalTasks - completedTasks) / totalTasks) * 100 || 0,
      pendingTasksByPriority: await Task.aggregate([
        { $match: { userId: req.user._id, status: 'pending' } },
        { $group: { 
          _id: '$priority',
          timeElapsed: { $sum: { $subtract: [new Date(), '$startTime'] } },
          estimatedTimeLeft: { $sum: { $subtract: ['$endTime', new Date()] } }
        }},
        { $project: {
          priority: '$_id',
          timeElapsed: 1,
          estimatedTimeLeft: 1,
          _id: 0
        }}
      ]),
      averageCompletionTime: await Task.aggregate([
        { $match: { userId: req.user._id, status: 'finished' } },
        { $group: {
          _id: null,
          avgTime: { $avg: { $subtract: ['$updatedAt', '$startTime'] } }
        }}
      ]).then(result => result[0]?.avgTime || 0)
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};
