import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDB } from './config/database';
import routes from './routes';

const app: Express = express();

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoints
app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);

// 404 handler
app.use((req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
    console.error('Error:', err);
    res.status(500).json({
        success: false,
        message: config.nodeEnv === 'development' ? err.message : 'Server error',
    });
});

const PORT = config.port;

app.listen(PORT, () => {
    console.log(`Server running in ${config.nodeEnv} mode on port ${PORT}`);
});

export default app;
