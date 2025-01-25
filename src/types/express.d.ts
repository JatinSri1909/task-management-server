import { Request, Response, NextFunction, RequestHandler as ExpressRequestHandler } from 'express';

export interface AuthRequest extends Request {
  user?: {
    _id: string;
    email: string;
  };
}

export type RequestHandler = ExpressRequestHandler;

export type ErrorRequestHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void> | void;
