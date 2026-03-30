import { Role, User } from '../models';
import { config } from '../config';

const defaultRoles = [
    {
        name: 'Member',
        key: 'member',
        level: 1,
        organizationScopes: [],
        description: 'Regular team member (default for all users)',
        isSystem: true,
        isActive: true,
    },
    {
        name: 'Team Leader',
        key: 'team_leader',
        level: 2,
        organizationScopes: ['team'],
        description: 'Leads a team',
        isSystem: false,
        isActive: true,
    },
    {
        name: 'Group Leader',
        key: 'group_leader',
        level: 3,
        organizationScopes: ['section'],
        description: 'Leads multiple teams',
        isSystem: false,
        isActive: true,
    },
    {
        name: 'Department Manager',
        key: 'department_manager',
        level: 4,
        organizationScopes: ['department'],
        description: 'Manages a department',
        isSystem: false,
        isActive: true,
    },
    {
        name: 'Division Manager',
        key: 'division_manager',
        level: 5,
        organizationScopes: [],
        description: 'Manages a division',
        isSystem: false,
        isActive: true,
    },
    {
        name: 'Admin',
        key: 'admin',
        level: 100,
        organizationScopes: [],
        description: 'System administrator',
        isSystem: true,
        isActive: true,
    },
];

const ensureDefaultRoles = async (): Promise<number> => {
    let createdCount = 0;

    for (const roleData of defaultRoles) {
        const existingRole = await Role.findOne({ key: roleData.key }).lean();

        if (existingRole) {
            continue;
        }

        await Role.create({
            ...roleData,
            deletedAt: null,
        });
        createdCount += 1;
    }

    return createdCount;
};

const ensureDefaultAdminUsers = async (): Promise<number> => {
    let updatedCount = 0;
    const adminRole = await Role.findOne({ key: 'admin' }).lean();
    const adminRoleLevel = adminRole?.level || 100;

    for (const account of config.defaultAdminAccounts) {
        const normalizedEmail = account.email.toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail }).select('+password');

        if (existingUser) {
            let shouldSave = false;

            if (existingUser.firstName !== account.firstName) {
                existingUser.firstName = account.firstName;
                shouldSave = true;
            }

            if (existingUser.lastName !== account.lastName) {
                existingUser.lastName = account.lastName;
                shouldSave = true;
            }

            if (existingUser.role !== 'admin') {
                existingUser.role = 'admin';
                shouldSave = true;
            }

            if (existingUser.roleLevel !== adminRoleLevel) {
                existingUser.roleLevel = adminRoleLevel;
                shouldSave = true;
            }

            if (existingUser.isApproved !== true) {
                existingUser.isApproved = true;
                shouldSave = true;
            }

            if (existingUser.isActive !== true) {
                existingUser.isActive = true;
                existingUser.deactivatedAt = undefined;
                shouldSave = true;
            }

            if (existingUser.avatar !== '') {
                existingUser.avatar = '';
                shouldSave = true;
            }

            if (existingUser.deletedAt !== null) {
                existingUser.deletedAt = null;
                existingUser.deletedBy = undefined;
                shouldSave = true;
            }

            if (config.syncDefaultAdminPasswords) {
                const passwordMatches = await existingUser.comparePassword(account.password);

                if (!passwordMatches) {
                    existingUser.password = account.password;
                    shouldSave = true;
                }
            }

            if (shouldSave) {
                existingUser.updatedBy = existingUser._id;
                await existingUser.save();
                updatedCount += 1;
            }

            continue;
        }

        const user = new User({
            email: normalizedEmail,
            password: account.password,
            firstName: account.firstName,
            lastName: account.lastName,
            role: 'admin',
            roleLevel: adminRoleLevel,
            avatar: '',
            isApproved: true,
            isActive: true,
            deletedAt: null,
        });

        user.createdBy = user._id;
        user.updatedBy = user._id;

        await user.save();
        updatedCount += 1;
    }

    return updatedCount;
};

export const bootstrapSystemData = async (): Promise<void> => {
    const rolesCreated = await ensureDefaultRoles();
    const adminUsersSynced = await ensureDefaultAdminUsers();

    if (rolesCreated > 0 || adminUsersSynced > 0) {
        console.log(
            `System bootstrap completed: created ${rolesCreated} role(s) and synced ${adminUsersSynced} default admin account(s).`
        );
        return;
    }

    console.log('System bootstrap completed: no missing default roles or admin accounts were found.');
};
