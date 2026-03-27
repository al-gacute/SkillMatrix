import { Response } from 'express';
import mongoose from 'mongoose';
import { UserSkill, Endorsement, isValidProficiencyLevel, calculateYearsOfExperience } from '../models';
import { AuthRequest } from '../middleware/auth';
import { createNotificationForUser } from './notificationController';
import { addCreateAuditFields, buildAuditSetUpdate, buildSoftDeleteSetUpdate, softDeleteDocument } from '../utils/audit';

const hasInvalidExperienceRanges = (
    experienceEntries?: Array<{ startPeriod?: string | Date; endPeriod?: string | Date }>
): boolean =>
    Boolean(
        experienceEntries?.some((entry) => entry.startPeriod && entry.endPeriod && new Date(entry.startPeriod) > new Date(entry.endPeriod))
    );

const attachActualEndorsements = async (userSkills: Array<Record<string, unknown> & { _id: mongoose.Types.ObjectId }>) => {
    if (userSkills.length === 0) {
        return [];
    }

    const userSkillIds = userSkills.map((userSkill) => userSkill._id);
    const endorsements = await Endorsement.find({ userSkill: { $in: userSkillIds }, deletedAt: null })
        .populate('endorser', 'firstName lastName avatar')
        .sort({ createdAt: -1 })
        .lean();

    const endorsementsBySkillId = endorsements.reduce<Record<string, typeof endorsements>>((acc, endorsement) => {
        const skillId = endorsement.userSkill.toString();
        if (!acc[skillId]) {
            acc[skillId] = [];
        }

        acc[skillId].push(endorsement);
        return acc;
    }, {});

    return userSkills.map((userSkill) => {
        const actualEndorsements = endorsementsBySkillId[userSkill._id.toString()] || [];

        return {
            ...userSkill,
            endorsements: actualEndorsements
                .map((endorsement) => endorsement.endorser)
                .filter(Boolean),
            endorsementCount: actualEndorsements.length,
        };
    });
};

// @desc    Get current user's skills
// @route   GET /api/user-skills/me
// @access  Private
export const getMySkills = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userSkills = await UserSkill.find({ user: req.user?._id, deletedAt: null })
            .populate({
                path: 'skill',
                populate: { path: 'category', select: 'name color icon' },
            })
            .populate('endorsements', 'firstName lastName avatar')
            .sort({ endorsementCount: -1 })
            .lean();

        const hydratedUserSkills = await attachActualEndorsements(userSkills);

        res.status(200).json({
            success: true,
            count: hydratedUserSkills.length,
            data: hydratedUserSkills,
        });
    } catch (error) {
        console.error('GetMySkills error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get user's skills by user ID
// @route   GET /api/user-skills/user/:userId
// @access  Private
export const getUserSkills = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.params;

        const userSkills = await UserSkill.find({ user: userId, isPublic: true, deletedAt: null })
            .populate({
                path: 'skill',
                populate: { path: 'category', select: 'name color icon' },
            })
            .populate('endorsements', 'firstName lastName avatar')
            .sort({ endorsementCount: -1 })
            .lean();

        const hydratedUserSkills = await attachActualEndorsements(userSkills);

        res.status(200).json({
            success: true,
            count: hydratedUserSkills.length,
            data: hydratedUserSkills,
        });
    } catch (error) {
        console.error('GetUserSkills error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Add skill to current user
// @route   POST /api/user-skills
// @access  Private
export const addUserSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { skill, proficiencyLevel, experienceEntries, notes, isPublic } = req.body;

        if (!isValidProficiencyLevel(proficiencyLevel)) {
            res.status(400).json({ success: false, message: 'Proficiency level must be an integer between 1 and 9' });
            return;
        }

        if (hasInvalidExperienceRanges(experienceEntries)) {
            res.status(400).json({ success: false, message: 'Each experience end period must be on or after its start period' });
            return;
        }

        // Check if user already has this skill
        const existingUserSkill = await UserSkill.findOne({
            user: req.user?._id,
            skill,
            deletedAt: null,
        });

        if (existingUserSkill) {
            res.status(400).json({ success: false, message: 'You already have this skill' });
            return;
        }

        const userSkill = await UserSkill.create(addCreateAuditFields({
            user: req.user?._id,
            skill,
            proficiencyLevel,
            experienceEntries: experienceEntries?.map((entry: { type: string; startPeriod?: string; endPeriod?: string }) => ({
                type: entry.type,
                startPeriod: entry.startPeriod || undefined,
                endPeriod: entry.endPeriod || undefined,
            })) || [],
            yearsOfExperience: calculateYearsOfExperience(
                experienceEntries?.map((entry: { startPeriod?: string; endPeriod?: string }) => ({
                    startPeriod: entry.startPeriod ? new Date(entry.startPeriod) : undefined,
                    endPeriod: entry.endPeriod ? new Date(entry.endPeriod) : undefined,
                }))
            ),
            notes,
            isPublic: isPublic !== false,
        }, req));

        await userSkill.populate({
            path: 'skill',
            populate: { path: 'category', select: 'name color icon' },
        });

        res.status(201).json({
            success: true,
            data: userSkill,
        });
    } catch (error) {
        console.error('AddUserSkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Update user skill
// @route   PUT /api/user-skills/:id
// @access  Private
export const updateUserSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { proficiencyLevel, experienceEntries, notes, isPublic } = req.body;

        const userSkill = await UserSkill.findOne({
            _id: req.params.id,
            user: req.user?._id,
            deletedAt: null,
        });

        if (!userSkill) {
            res.status(404).json({ success: false, message: 'User skill not found' });
            return;
        }

        if (proficiencyLevel !== undefined && !isValidProficiencyLevel(proficiencyLevel)) {
            res.status(400).json({ success: false, message: 'Proficiency level must be an integer between 1 and 9' });
            return;
        }

        if (experienceEntries !== undefined && hasInvalidExperienceRanges(experienceEntries)) {
            res.status(400).json({ success: false, message: 'Each experience end period must be on or after its start period' });
            return;
        }

        userSkill.proficiencyLevel = proficiencyLevel || userSkill.proficiencyLevel;
        if (experienceEntries !== undefined) {
            userSkill.experienceEntries = experienceEntries.map((entry: { type: string; startPeriod?: string; endPeriod?: string }) => ({
                type: entry.type,
                startPeriod: entry.startPeriod || undefined,
                endPeriod: entry.endPeriod || undefined,
            }));
        }
        userSkill.yearsOfExperience = calculateYearsOfExperience(
            userSkill.experienceEntries,
            userSkill.startPeriod,
            userSkill.endPeriod
        ) ?? userSkill.yearsOfExperience;
        userSkill.notes = notes ?? userSkill.notes;
        userSkill.isPublic = isPublic ?? userSkill.isPublic;
        userSkill.updatedBy = req.user?._id;

        await userSkill.save();
        await userSkill.populate({
            path: 'skill',
            populate: { path: 'category', select: 'name color icon' },
        });

        res.status(200).json({
            success: true,
            data: userSkill,
        });
    } catch (error) {
        console.error('UpdateUserSkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Delete user skill
// @route   DELETE /api/user-skills/:id
// @access  Private
export const deleteUserSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userSkill = await UserSkill.findOne({
            _id: req.params.id,
            user: req.user?._id,
            deletedAt: null,
        });

        if (!userSkill) {
            res.status(404).json({ success: false, message: 'User skill not found' });
            return;
        }

        // Remove related endorsements
        await Endorsement.updateMany(
            { userSkill: req.params.id, deletedAt: null },
            buildSoftDeleteSetUpdate(req)
        );

        await softDeleteDocument(userSkill, req);

        res.status(200).json({
            success: true,
            message: 'Skill removed successfully',
        });
    } catch (error) {
        console.error('DeleteUserSkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Endorse a user's skill
// @route   POST /api/user-skills/:id/endorse
// @access  Private
export const endorseSkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { comment } = req.body;
        const userSkillId = req.params.id;

        const userSkill = await UserSkill.findOne({ _id: userSkillId, deletedAt: null }).populate('skill');

        if (!userSkill) {
            res.status(404).json({ success: false, message: 'User skill not found' });
            return;
        }

        // Check if user is trying to endorse their own skill
        if (userSkill.user.toString() === req.user?._id.toString()) {
            res.status(400).json({ success: false, message: 'You cannot endorse your own skill' });
            return;
        }

        // Check if already endorsed
        const existingEndorsement = await Endorsement.findOne({
            endorser: req.user?._id,
            userSkill: userSkillId,
            deletedAt: null,
        });

        if (existingEndorsement) {
            res.status(400).json({ success: false, message: 'You have already endorsed this skill' });
            return;
        }

        // Create endorsement
        const endorsement = await Endorsement.create(addCreateAuditFields({
            endorser: req.user?._id,
            endorsee: userSkill.user,
            userSkill: userSkillId,
            skill: userSkill.skill,
            comment,
        }, req));

        // Add endorser to userSkill endorsements array
        userSkill.endorsements.push(req.user?._id as mongoose.Types.ObjectId);
        userSkill.updatedBy = req.user?._id;
        await userSkill.save();

        await endorsement.populate('endorser', 'firstName lastName avatar');

        if (req.user) {
            const endorserName = `${req.user.firstName} ${req.user.lastName}`;
            const skillName = typeof userSkill.skill === 'object' && 'name' in userSkill.skill ? userSkill.skill.name : 'your skill';

            await createNotificationForUser(
                userSkill.user.toString(),
                'Skill endorsed',
                `${endorserName} endorsed ${skillName}${comment ? `: ${comment}` : '.'}`,
                'general',
                req.user._id.toString()
            );
        }

        res.status(201).json({
            success: true,
            data: endorsement,
        });
    } catch (error) {
        console.error('EndorseSkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Remove endorsement
// @route   DELETE /api/user-skills/:id/endorse
// @access  Private
export const removeEndorsement = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userSkillId = req.params.id;

        const endorsement = await Endorsement.findOne({
            endorser: req.user?._id,
            userSkill: userSkillId,
            deletedAt: null,
        });

        if (!endorsement) {
            res.status(404).json({ success: false, message: 'Endorsement not found' });
            return;
        }

        // Remove endorser from userSkill endorsements array
        await UserSkill.findByIdAndUpdate(userSkillId, {
            $pull: { endorsements: req.user?._id },
            ...buildAuditSetUpdate({}, req),
        });

        await softDeleteDocument(endorsement, req);

        res.status(200).json({
            success: true,
            message: 'Endorsement removed successfully',
        });
    } catch (error) {
        console.error('RemoveEndorsement error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Search users by skill
// @route   GET /api/user-skills/search
// @access  Private
export const searchBySkill = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { skillId, proficiencyLevel, minEndorsements } = req.query;

        const query: Record<string, unknown> = { isPublic: true, deletedAt: null };

        if (skillId) {
            query.skill = skillId;
        }

        if (proficiencyLevel) {
            query.proficiencyLevel = proficiencyLevel;
        }

        if (minEndorsements) {
            query.endorsementCount = { $gte: parseInt(minEndorsements as string) };
        }

        const userSkills = await UserSkill.find(query)
            .populate('user', 'firstName lastName email avatar title department team')
            .populate({
                path: 'skill',
                populate: { path: 'category', select: 'name color icon' },
            })
            .sort({ endorsementCount: -1, proficiencyLevel: -1 });

        res.status(200).json({
            success: true,
            count: userSkills.length,
            data: userSkills,
        });
    } catch (error) {
        console.error('SearchBySkill error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
