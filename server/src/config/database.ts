import mongoose from 'mongoose';
import { config } from './index';
import { bootstrapSystemData } from '../bootstrap/system';

export const connectDB = async (): Promise<void> => {
    try {
        const conn = await mongoose.connect(config.mongoUri);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        await bootstrapSystemData();
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};
