import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import router from './routes/index.js';

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

app.use('/api', router);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);
  res.status(err.statusCode || 500).json({ 
    success: false, 
    message: err.message || 'Internal Server Error', 
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) 
 });
});

export default app;