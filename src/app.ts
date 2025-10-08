import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
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
    auth: process.env.AUTH0_DOMAIN ? 'configured' : 'not configured'
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
      users: '/api/users'
    },
    authentication: 'Auth0 (JWT Bearer token required for protected routes)'
  });
});

// API routes
app.use('/api', userRoutes);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('join-user', (userId) => {
    socket.join(`user-${userId}`);
    console.log(`User ${userId} joined their room`);
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
});

export { app, io };
