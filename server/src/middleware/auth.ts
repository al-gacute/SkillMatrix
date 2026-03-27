import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { User, IUser } from '../models';

export interface AuthRequest extends Request {
    user?: IUser;
}

interface JwtPayload {
    id: string;
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    let token: string | undefined;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
        return;
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
        const user = await User.findById(decoded.id);

        if (!user) {
            res.status(401).json({ success: false, message: 'User not found' });
            return;
        }

        req.user = user;
        next();
    } catch {
        res.status(401).json({ success: false, message: 'Not authorized, token invalid' });
    }
};

export const authorize = (...roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction): void => {
        if (!req.user || !roles.includes(req.user.role)) {
            res.status(403).json({ success: false, message: 'Not authorized for this action' });
            return;
        }
        next();
    };
};

export const adminOnly = (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== 'admin') {
        res.status(403).json({ success: false, message: 'Admin access required' });
        return;
    }
    next();
};
