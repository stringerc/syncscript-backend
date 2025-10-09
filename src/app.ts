import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';
import energyRoutes from './routes/energy.routes';
import taskRoutes from './routes/task.routes';
import projectRoutes from './routes/project.routes';
import migrationRoutes from './routes/migration.routes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://syncscript.app",
      "https://www.syncscript.app",
      /https:\/\/.*\.syncscript\.app$/,
      /https:\/\/.*\.vercel\.app$/
    ],
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://syncscript.app",
    "https://www.syncscript.app",
    /https:\/\/.*\.syncscript\.app$/,
    /https:\/\/.*\.vercel\.app$/
  ],
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint (public)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database: process.env.DATABASE_URL ? 'connected' : 'not configured',
    auth: process.env.AUTH0_DOMAIN ? 'configured' : 'not configured',
    cache: process.env.REDIS_URL ? 'connected' : 'not configured'
  });
});

// API info endpoint (public)
app.get('/api', (req, res) => {
  res.json({ 
    message: 'SyncScript API is running!',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      users: '/api/users',
      energy: '/api/energy',
      tasks: '/api/tasks',
      projects: '/api/projects'
    },
    authentication: 'Auth0 (JWT Bearer token required for protected routes)'
  });
});

// API routes
app.use('/api', userRoutes);
app.use('/api', energyRoutes);
app.use('/api', taskRoutes);
app.use('/api', projectRoutes);
app.use('/api/migrations', migrationRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
  });
  
  socket.on('energy-update', (data) => {
    // Broadcast energy update to user's room
    io.to(`user-${data.userId}`).emit('energy-updated', data);
  });
  
  socket.on('task-completed', (data) => {
    // Broadcast task completion to user's room
    io.to(`user-${data.userId}`).emit('task-completed', data);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Auth error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err.name === 'UnauthorizedError') {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing authentication token'
    });
    return;
  }
  
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

server.listen(PORT, () => {
  console.log(`🚀 SyncScript Backend running on port ${PORT}`);
  console.log(`📡 Socket.io server ready`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🔐 Auth0: ${process.env.AUTH0_DOMAIN ? 'Configured' : 'Not configured'}`);
  console.log(`💾 Redis: ${process.env.REDIS_URL ? 'Connected' : 'Not configured'}`);
});

export { app, io };
