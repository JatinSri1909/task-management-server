# task-management-server

- Task filtering, sorting, and pagination
- Task priority levels (1-5)
- Task status tracking (pending/finished)
- Task statistics and analytics
- Type safety with TypeScript
- Input validation
- Error handling

## Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

## Getting Started

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Environment Setup
   Create a `.env` file in the root directory:
```
PORT=8000
MONGODB_URI=mongodb://localhost:27017/task-management-app
JWT_SECRET=your_jwt_secret
```

## Development

```bash
# Start development server with hot reload
npm run dev

# Build production version
npm run build

# Start production server
npm start
```

## API Documentation

### Authentication Routes

#### Sign Up
```http
POST /api/auth/signup
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "password123",
    "confirmPassword": "password123"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
    "email": "user@example.com",
    "password": "password123"
}
```

### Task Routes

All task routes require Authentication: `Bearer <token>`

#### Get Tasks
```http
GET /api/tasks?page=1&limit=10&priority=1&status=pending&field=createdAt&order=desc
```

#### Create Task
```http
POST /api/tasks
Content-Type: application/json

{
    "title": "Complete project",
    "startTime": "2024-03-15T10:00:00Z",
    "endTime": "2024-03-15T18:00:00Z",
    "priority": 1
}
```

#### Update Task
```http
PATCH /api/tasks/:id
Content-Type: application/json

{
    "status": "finished",
    "priority": 2
}
```

#### Delete Task
```http
DELETE /api/tasks/:id
```

#### Get Task Statistics
```http
GET /api/tasks/stats
```

## Project Structure
```
src/
├── controllers/     # Request handlers
├── middleware/      # Express middleware
├── models/         # Database models
├── routes/         # Route definitions
├── types/         # TypeScript type definitions
└── index.ts       # Application entry point
```

## Error Responses

```json
// 400 Bad Request
{
    "errors": [
        {
            "msg": "Please enter a valid email",
            "param": "email",
            "location": "body"
        }
    ]
}

// 401 Unauthorized
{
    "message": "Not authorized"
}

// 404 Not Found
{
    "message": "Task not found"
}

// 500 Server Error
{
    "message": "Server error"
}
```

## Security Features

- Password hashing with bcrypt
- JWT based authentication
- Input validation and sanitization
- Protected routes
- Environment variables for sensitive data
- Request validation middleware
