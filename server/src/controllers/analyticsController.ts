import { Request, Response } from 'express';
import { User, Skill, SkillCategory, UserSkill, Team, Department, Endorsement, Section } from '../models';
import { excludeSystemUserAccounts, getSystemUserEmails } from '../utils/systemUserFilter';

// @desc    Get dashboard statistics
// @route   GET /api/analytics/dashboard
// @access  Private
export const getDashboardStats = async (req: Request, res: Response): Promise<void> => {
    try {
        const systemUserEmails = getSystemUserEmails();

        const [
            totalUsers,
            totalSkills,
            totalCategories,
            totalTeams,
            totalDepartments,
            totalEndorsements,
        ] = await Promise.all([
            User.countDocuments(excludeSystemUserAccounts()),
            Skill.countDocuments(),
            SkillCategory.countDocuments(),
            Team.countDocuments(),
            Department.countDocuments(),
            Endorsement.countDocuments(),
        ]);

        // Skills by proficiency level
        const skillsByProficiency = await UserSkill.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            { $unwind: '$userInfo' },
            {
                $match: {
                    'userInfo.email': { $nin: systemUserEmails },
                },
            },
            {
                $group: {
                    _id: '$proficiencyLevel',
                    count: { $sum: 1 },
                },
            },
        ]);

        // Top skills by user count
        const topSkills = await UserSkill.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            { $unwind: '$userInfo' },
            {
                $match: {
                    'userInfo.email': { $nin: systemUserEmails },
                },
            },
            {
                $group: {
                    _id: '$skill',
                    userCount: { $sum: 1 },
                    totalEndorsements: { $sum: '$endorsementCount' },
                },
            },
            { $sort: { userCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'skills',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'skillInfo',
                },
            },
            { $unwind: '$skillInfo' },
            {
                $lookup: {
                    from: 'skillcategories',
                    localField: 'skillInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: '$categoryInfo' },
            {
                $project: {
                    skillName: '$skillInfo.name',
                    categoryName: '$categoryInfo.name',
                    categoryColor: '$categoryInfo.color',
                    userCount: 1,
                    totalEndorsements: 1,
                },
            },
        ]);

        // Skills by category
        const skillsByCategory = await UserSkill.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'user',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            { $unwind: '$userInfo' },
            {
                $match: {
                    'userInfo.email': { $nin: systemUserEmails },
                },
            },
            {
                $lookup: {
                    from: 'skills',
                    localField: 'skill',
                    foreignField: '_id',
                    as: 'skillInfo',
                },
            },
            { $unwind: '$skillInfo' },
            {
                $lookup: {
                    from: 'skillcategories',
                    localField: 'skillInfo.category',
                    foreignField: '_id',
                    as: 'categoryInfo',
                },
            },
            { $unwind: '$categoryInfo' },
            {
                $group: {
                    _id: {
                        categoryId: '$categoryInfo._id',
                        categoryName: '$categoryInfo.name',
                        categoryColor: '$categoryInfo.color',
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { count: -1 } },
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    totalUsers,
                    totalSkills,
                    totalCategories,
                    totalTeams,
                    totalDepartments,
                    totalEndorsements,
                },
                skillsByProficiency,
                topSkills,
                skillsByCategory,
            },
        });
    } catch (error) {
        console.error('GetDashboardStats error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get skill gap analysis
// @route   GET /api/analytics/skill-gaps
// @access  Private
export const getSkillGaps = async (req: Request, res: Response): Promise<void> => {
    try {
        const { teamId, departmentId } = req.query;

        let userFilter: Record<string, unknown> = {};

        if (teamId) {
            userFilter.team = teamId;
        } else if (departmentId) {
            userFilter.department = departmentId;
        }

        const users = await User.find(excludeSystemUserAccounts(userFilter)).select('_id');
        const userIds = users.map((u) => u._id);

        // Get all skills
        const allSkills = await Skill.find().populate('category', 'name color');

        // Get skills that users have
        const userSkills = await UserSkill.find({ user: { $in: userIds } })
            .select('skill proficiencyLevel');

        // Calculate skill coverage
        const skillCoverage = allSkills.map((skill) => {
            const usersWithSkill = userSkills.filter(
                (us) => us.skill.toString() === skill._id.toString()
            );

            const coverage = userIds.length > 0
                ? (usersWithSkill.length / userIds.length) * 100
                : 0;

            const proficiencyBreakdown = {
                level1: usersWithSkill.filter((us) => us.proficiencyLevel === 1).length, // Novice / Entry
                level2: usersWithSkill.filter((us) => us.proficiencyLevel === 2).length, // Advanced Beginner
                level3: usersWithSkill.filter((us) => us.proficiencyLevel === 3).length, // Competent
                level4: usersWithSkill.filter((us) => us.proficiencyLevel === 4).length, // Proficient
                level5: usersWithSkill.filter((us) => us.proficiencyLevel === 5).length, // Skilled / Experienced
                level6: usersWithSkill.filter((us) => us.proficiencyLevel === 6).length, // Advanced
                level7: usersWithSkill.filter((us) => us.proficiencyLevel === 7).length, // Expert
                level8: usersWithSkill.filter((us) => us.proficiencyLevel === 8).length, // Master / Lead
                level9: usersWithSkill.filter((us) => us.proficiencyLevel === 9).length, // Authority / Mentor
            };

            return {
                skill: {
                    id: skill._id,
                    name: skill.name,
                    category: skill.category,
                },
                usersWithSkill: usersWithSkill.length,
                totalUsers: userIds.length,
                coverage: Math.round(coverage * 10) / 10,
                proficiencyBreakdown,
            };
        });

        // Sort by coverage (ascending to show gaps first)
        skillCoverage.sort((a, b) => a.coverage - b.coverage);

        res.status(200).json({
            success: true,
            data: skillCoverage,
        });
    } catch (error) {
        console.error('GetSkillGaps error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get top endorsers
// @route   GET /api/analytics/top-endorsers
// @access  Private
export const getTopEndorsers = async (req: Request, res: Response): Promise<void> => {
    try {
        const systemUserEmails = getSystemUserEmails();

        const topEndorsers = await Endorsement.aggregate([
            {
                $group: {
                    _id: '$endorser',
                    endorsementCount: { $sum: 1 },
                },
            },
            { $sort: { endorsementCount: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'userInfo',
                },
            },
            { $unwind: '$userInfo' },
            {
                $match: {
                    'userInfo.email': { $nin: systemUserEmails },
                },
            },
            {
                $project: {
                    firstName: '$userInfo.firstName',
                    lastName: '$userInfo.lastName',
                    avatar: '$userInfo.avatar',
                    title: '$userInfo.title',
                    endorsementCount: 1,
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: topEndorsers,
        });
    } catch (error) {
        console.error('GetTopEndorsers error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get skill trends
// @route   GET /api/analytics/trends
// @access  Private
export const getSkillTrends = async (req: Request, res: Response): Promise<void> => {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        // New skills added in last 30 days
        const recentSkills = await UserSkill.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.date': 1 } },
        ]);

        // Recent endorsements
        const recentEndorsements = await Endorsement.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    },
                    count: { $sum: 1 },
                },
            },
            { $sort: { '_id.date': 1 } },
        ]);

        // Most endorsed skills recently
        const trendingSkills = await Endorsement.aggregate([
            {
                $match: {
                    createdAt: { $gte: thirtyDaysAgo },
                },
            },
            {
                $group: {
                    _id: '$skill',
                    endorsementCount: { $sum: 1 },
                },
            },
            { $sort: { endorsementCount: -1 } },
            { $limit: 5 },
            {
                $lookup: {
                    from: 'skills',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'skillInfo',
                },
            },
            { $unwind: '$skillInfo' },
            {
                $project: {
                    skillName: '$skillInfo.name',
                    endorsementCount: 1,
                },
            },
        ]);

        res.status(200).json({
            success: true,
            data: {
                skillsAdded: recentSkills,
                endorsements: recentEndorsements,
                trendingSkills,
            },
        });
    } catch (error) {
        console.error('GetSkillTrends error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

// @desc    Get organization structure alerts
// @route   GET /api/analytics/organization-alerts
// @access  Private
export const getOrganizationAlerts = async (req: Request, res: Response): Promise<void> => {
    try {
        const excludedAdminRoles = [
            'super_admin',
            'system_admin',
            'super admin',
            'system admin',
        ];

        const [usersWithoutTeam, usersWithoutProjectPosition, teamsWithoutSection, rawSections] = await Promise.all([
            User.find(excludeSystemUserAccounts({
                isApproved: true,
                role: { $nin: excludedAdminRoles },
                $or: [
                    { team: { $exists: false } },
                    { team: null },
                ],
            }))
                .select('firstName lastName email department')
                .populate('department', 'name')
                .sort({ firstName: 1, lastName: 1 }),
            User.find(excludeSystemUserAccounts({
                isApproved: true,
                role: { $nin: excludedAdminRoles },
                $or: [
                    { projectPosition: { $exists: false } },
                    { projectPosition: null },
                ],
            }))
                .select('firstName lastName email department')
                .populate('department', 'name')
                .sort({ firstName: 1, lastName: 1 }),
            Team.find({
                $or: [
                    { section: { $exists: false } },
                    { section: null },
                ],
            })
                .select('name department')
                .populate('department', 'name')
                .sort({ name: 1 }),
            Section.find()
                .select('name department')
                .populate('department', 'name')
                .sort({ name: 1 }),
        ]);

        const sectionsWithoutDepartment = rawSections.filter(
            (section) => !section.department || typeof section.department === 'string'
        );

        res.status(200).json({
            success: true,
            data: {
                usersWithoutTeam,
                usersWithoutProjectPosition,
                teamsWithoutSection,
                sectionsWithoutDepartment,
                summary: {
                    usersWithoutTeam: usersWithoutTeam.length,
                    usersWithoutProjectPosition: usersWithoutProjectPosition.length,
                    teamsWithoutSection: teamsWithoutSection.length,
                    sectionsWithoutDepartment: sectionsWithoutDepartment.length,
                },
            },
        });
    } catch (error) {
        console.error('GetOrganizationAlerts error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};
