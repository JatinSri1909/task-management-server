import express, { Application } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { ErrorRequestHandler } from './types/express';
import authRoutes from './routes/authRoutes';
import taskRoutes from './routes/taskRoutes';
import { protect } from './middleware/authMiddleware';

// Load environment variables
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.log(process.env.MONGODB_URI)
    console.error(`Error: ${envVar} is not defined in environment variables`);
    process.exit(1);
  }
}

const app: Application = express();
const port = process.env.PORT || 8000;

// Add allowed origins array
const allowedOrigins = [
  process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : null,  // Local development
  process.env.FRONTEND_URL,                                                 // Production frontend
  process.env.BACKEND_URL                                                  // Backend URL
].filter(Boolean); // Remove null/undefined values

// Debug log origins
console.log('Environment:', process.env.NODE_ENV);
console.log('Allowed Origins:', allowedOrigins);

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Enable pre-flight
app.options('*', cors());

app.use(express.json());

// Add a test route to verify CORS
app.get('/api/test', (req, res) => {
  res.json({ message: 'CORS is working' });
});

// Database connection with retry logic
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    // Retry connection after 5 seconds
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', protect, taskRoutes);

// Error handling
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
};

app.use(errorHandler);

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
