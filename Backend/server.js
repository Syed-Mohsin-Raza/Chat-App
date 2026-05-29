import 'dotenv/config';
import http from 'http';
import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import redis from './src/config/redis.js'; // The Redis instance connects automatically

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const start = async () => {
    try {
        await connectDB();
        
        // Remove 'await connectRedis()' entirely.
        // If you want to log success here, use the redis client itself:
        console.log('Redis client initialized');

        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT} [${process.env.NODE_ENV}]`);
        });
    } catch (err) {
        console.error('Failed to start server:', err.message);
        process.exit(1);
    }
};


start();

process.on('SIGTERM', () => server.close(() => process.exit(0)));