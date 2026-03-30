import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import { User } from '../models';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { createAdminNotifications } from './notificationController';
import { checkForDuplicateUser } from '../utils/userDuplicateChecks';
import { addUpdateAuditFields } from '../utils/audit';

const HIGH_LEVEL_ACCOUNT_EMAILS = new Set(config.highLevelAccountEmails);

const generateToken = (id: string): string => {
    const options: SignOptions = { expiresIn: config.jwtExpire as jwt.SignOptions['expiresIn'] };
    return jwt.sign({ id }, config.jwtSecret, options);
};

const authUserPopulate = [
    { path: 'department', select: 'name' },
    { path: 'projectPosition', select: 'name' },
    {
        path: 'team',
        select: 'name section department',
        populate: [
            {
                path: 'section',
                select: 'name department',
                populate: { path: 'department', select: 'name' },
            },
            { path: 'department', select: 'name' },
        ],
    },
];

const getHydratedAuthUser = async (userId?: string) => {
    if (!userId) {
        return null;
    }

    return User.findById(userId).populate(authUserPopulate);
};

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password, firstName, lastName, title } = req.body;

        const { duplicateEmail, duplicateName } = await checkForDuplicateUser({
            email,
            firstName,
            lastName,
        });

        if (duplicateEmail) {
            res.status(400).json({ success: false, message: 'Email already exists.' });
            return;
        }

        if (duplicateName) {
            res.status(400).json({ success: false, message: 'A user with the same first and last name already exists.' });
            return;
        }

        // Create user
        const user = new User({
            email,
            password,
            firstName,
            lastName,
            title,
            isApproved: false, // New users need admin approval
        });
        user.createdBy = user._id;
        user.updatedBy = user._id;
        await user.save();

        // Notify all admins about new registration
        await createAdminNotifications(
            'new_user_registration',
            'New User Registration',
            `${firstName} ${lastName} (${email}) has registered and needs approval.`,
            user._id.toString()
        );

        res.status(201).json({
            success: true,
            message: 'Registration submitted successfully. An admin must approve your account before you can sign in.',
            data: {
                user: {
                    id: user._id,
                    email: user.email,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    role: user.role,
                    title: user.title,
                    isApproved: user.isApproved,
                },
                pendingApproval: true,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req: Request, res: Response): Promise<void> => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

        // Check for user
        const user = await User.findOne({ email: normalizedEmail }).select('+password');
        if (!user) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
            return;
        }

        // Check if user is deactivated
        if (user.isActive === false) {
            res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact an administrator.' });
            return;
        }

        const isHighLevelExemptAccount = HIGH_LEVEL_ACCOUNT_EMAILS.has(user.email.toLowerCase());

        if (user.isApproved !== true && !isHighLevelExemptAccount) {
            res.status(403).json({
                success: false,
                message: 'Your account is pending admin approval. Please wait for approval before signing in.',
            });
            return;
        }

        const token = generateToken(user._id.toString());
        const hydratedUser = await getHydratedAuthUser(user._id.toString());

        if (!hydratedUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        res.status(200).json({
            success: true,
            data: {
                user: hydratedUser,
                token,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const user = await getHydratedAuthUser(req.user?._id?.toString());

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { firstName, lastName, title, bio, avatar } = req.body;

        const { duplicateName } = await checkForDuplicateUser({
            firstName,
            lastName,
            excludeUserId: req.user?._id,
        });

        if (duplicateName) {
            res.status(400).json({ success: false, message: 'A user with the same first and last name already exists.' });
            return;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user?._id,
            addUpdateAuditFields({ firstName, lastName, title, bio, avatar }, req),
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        const user = await getHydratedAuthUser(updatedUser?._id?.toString());

        res.status(200).json({
            success: true,
            data: user,
        });
    } catch (error) {
        console.error('UpdateProfile error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user?._id).select('+password');
        if (!user) {
            res.status(404).json({ success: false, message: 'User not found' });
            return;
        }

        // Check current password
        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            res.status(401).json({ success: false, message: 'Current password is incorrect' });
            return;
        }

        user.password = newPassword;
        user.updatedBy = req.user?._id;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        console.error('ChangePassword error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
