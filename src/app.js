const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// Trust proxy
app.set('trust proxy', 1);

// ============================================
// Middleware
// ============================================

// Security middleware
app.use(helmet());

// CORS middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Request logging
app.use(morgan('combined'));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================
// Routes
// ============================================

// Health check route
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date(),
    environment: process.env.NODE_ENV
  });
});

// Import routes
const insightsRoutes = require('./routes/insights.routes');
const partnerRoutes = require('./routes/partner.routes');
const pageRoutes = require('./routes/page.routes');
const postRoutes = require('./routes/post.routes');

// API Prefix
const API_PREFIX = process.env.API_PREFIX || '/api/v1';

// Register routes
app.use(`${API_PREFIX}/insights`, insightsRoutes);
app.use(`${API_PREFIX}/partners`, partnerRoutes);
app.use(`${API_PREFIX}/pages`, pageRoutes);
app.use(`${API_PREFIX}/posts`, postRoutes);

// ============================================
// 404 Handler
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// ============================================
// Error Handling Middleware
// ============================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { error: err.stack })
  });
});

module.exports = app;
